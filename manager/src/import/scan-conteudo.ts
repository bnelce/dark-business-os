import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { mimeDoArquivo, validarArquivo } from "../storage/keys";

/**
 * Leitor do sistema antigo (marketing/conteudo/).
 *
 * Só lê. Não move, não renomeia e não apaga nada — o conteúdo editorial
 * continua sendo a fonte, e o import é uma cópia pro banco.
 *
 * O estado vem do que está lá:
 *   publicado.md            → já foi ao ar
 *   pendente.md, sem o outro → aprovado, aguardando agendamento
 *   nenhum dos dois          → rascunho
 */

export type ArquivoDeMidia = { caminho: string; nome: string; posicao: number; tamanho: number; mimeType: string };

export type ConteudoEncontrado = {
  sourcePath: string;
  caminhoAbsoluto: string;
  titulo: string;
  disciplina: string | null;
  tema: string | null;
  legenda: string;
  midias: ArquivoDeMidia[];
  tipo: "IMAGE" | "CAROUSEL";
  estado: "PUBLISHED" | "APPROVED" | "DRAFT";
  publicadoEm: Date | null;
  externalUrl: string | null;
  /** Anotações pro relatório: nada aqui impede o import, mas tudo aqui merece olhada. */
  avisos: string[];
};

const RE_SLIDE = /^slide-(\d+)\.png$/i;

export async function varrerConteudo(raiz: string): Promise<ConteudoEncontrado[]> {
  const absoluta = resolve(raiz);
  const entradas = await readdir(absoluta, { withFileTypes: true });
  const achados: ConteudoEncontrado[] = [];

  for (const entrada of entradas.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entrada.isDirectory() || entrada.name.startsWith("_") || entrada.name.startsWith(".")) continue;
    const achado = await lerPasta(absoluta, entrada.name);
    if (achado) achados.push(achado);
  }
  return achados;
}

async function lerPasta(raiz: string, nome: string): Promise<ConteudoEncontrado | null> {
  const pasta = join(raiz, nome);
  const avisos: string[] = [];

  const midias = await lerMidias(join(pasta, "instagram"), avisos);
  if (midias.length === 0) {
    // Pasta sem imagem não é publicação: pode ser rascunho a meio caminho.
    return null;
  }

  const conteudo = await lerJson(join(pasta, "conteudo.json"));
  const legenda = (await lerTexto(join(pasta, "legenda.md")))?.trim() ?? "";
  if (!legenda) avisos.push("sem legenda.md — a legenda vai entrar vazia e precisa ser escrita antes de publicar");

  const publicado = await lerTexto(join(pasta, "publicado.md"));
  const pendente = await lerTexto(join(pasta, "pendente.md"));

  const disciplina = conteudo?.disciplina ?? nome.split("-")[0] ?? null;
  const tema = conteudo?.tema ?? null;

  let estado: ConteudoEncontrado["estado"] = "DRAFT";
  let publicadoEm: Date | null = null;
  let externalUrl: string | null = null;

  if (publicado) {
    estado = "PUBLISHED";
    ({ publicadoEm, externalUrl } = lerRegistroDePublicado(publicado, avisos));
  } else if (pendente) {
    // pendente.md registra "Aprovado (texto e formato): sim". É evidência de
    // aprovação, então entra como APPROVED — mas nunca agendado: agendar é um
    // ato explícito do operador, no dashboard.
    estado = "APPROVED";
  } else {
    avisos.push("sem pendente.md nem publicado.md — entra como rascunho");
  }

  return {
    sourcePath: nome,
    caminhoAbsoluto: pasta,
    titulo: titulo(tema, nome),
    disciplina,
    tema,
    legenda,
    midias,
    tipo: midias.length > 1 ? "CAROUSEL" : "IMAGE",
    estado,
    publicadoEm,
    externalUrl,
    avisos,
  };
}

async function lerMidias(pasta: string, avisos: string[]): Promise<ArquivoDeMidia[]> {
  let nomes: string[];
  try {
    nomes = await readdir(pasta);
  } catch {
    return [];
  }

  const midias: ArquivoDeMidia[] = [];
  for (const nome of nomes.sort()) {
    const casou = RE_SLIDE.exec(nome);
    if (!casou) continue;

    const caminho = join(pasta, nome);
    const { size } = await stat(caminho);
    const problemas = validarArquivo(nome, size);
    if (problemas.length > 0) {
      avisos.push(...problemas);
      continue;
    }
    midias.push({ caminho, nome, posicao: Number(casou[1]), tamanho: size, mimeType: mimeDoArquivo(nome)! });
  }
  return midias.sort((a, b) => a.posicao - b.posicao);
}

/**
 * Lê o registro de publicação. Tolerante de propósito: esses arquivos foram
 * escritos por script e à mão, e um deles registra dois links (o post duplicado
 * de 2026-09-05) num rótulo diferente do padrão.
 */
export function lerRegistroDePublicado(
  texto: string,
  avisos: string[] = [],
): { publicadoEm: Date | null; externalUrl: string | null } {
  const data = /\*\*Publicado em:\*\*\s*(.+)/.exec(texto)?.[1]?.trim();
  const publicadoEm = data ? interpretarData(data) : null;
  if (data && Number.isNaN(publicadoEm?.getTime())) {
    avisos.push(`data de publicação ilegível em publicado.md: "${data}"`);
  }

  const urls = texto.match(/https?:\/\/[^\s)]+/g) ?? [];
  if (urls.length > 1) {
    avisos.push(
      `publicado.md tem ${urls.length} links (${urls.join(" e ")}) — importando o primeiro. ` +
      `Confira qual está no ar antes de considerar o registro correto.`,
    );
  }
  if (urls.length === 0) avisos.push("publicado.md sem link — a publicação entra sem externalUrl");

  return {
    publicadoEm: publicadoEm && !Number.isNaN(publicadoEm.getTime()) ? publicadoEm : null,
    externalUrl: urls[0] ?? null,
  };
}

/**
 * "2026-09-05" sozinho é uma data, não um instante. new Date() a lê como
 * meia-noite UTC, que em America/Fortaleza (UTC-3) cai no dia 4 às 21h — a
 * publicação apareceria no dia errado. Sem hora registrada, ancora no meio-dia,
 * que preserva o dia certo em qualquer fuso do Brasil.
 */
export function interpretarData(bruta: string): Date {
  const soData = /^\d{4}-\d{2}-\d{2}$/.test(bruta);
  return new Date(soData ? `${bruta}T12:00:00` : bruta);
}

function titulo(tema: string | null, nomeDaPasta: string): string {
  const bruto = tema ?? nomeDaPasta.replace(/-\d{4}-\d{2}-\d{2}$/, "").split("-").slice(1).join("-");
  const limpo = bruto.replace(/-/g, " ").trim();
  return limpo ? limpo[0].toUpperCase() + limpo.slice(1) : nomeDaPasta;
}

async function lerTexto(caminho: string): Promise<string | null> {
  try { return await readFile(caminho, "utf-8"); } catch { return null; }
}

async function lerJson(caminho: string): Promise<any | null> {
  const texto = await lerTexto(caminho);
  if (!texto) return null;
  try { return JSON.parse(texto); } catch { return null; }
}
