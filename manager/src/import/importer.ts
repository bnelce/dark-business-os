import { readFile } from "node:fs/promises";
import type { PrismaClient, Publication } from "@prisma/client";
import type { StorageProvider } from "../storage/types";
import { chaveDeMidia } from "../storage/keys";
import { registrarEvento } from "../queue/events";
import type { ConteudoEncontrado } from "./scan-conteudo";
import { logger } from "../lib/logger";

/**
 * Traz o conteúdo do sistema antigo pro banco.
 *
 * Regras que não se negociam:
 *  - nada é apagado nem movido na origem;
 *  - rodar duas vezes não duplica (sourcePath é único);
 *  - o que já está no banco não é sobrescrito — o operador pode ter editado;
 *  - nada entra agendado. Aprovado sim, agendado não: agendar é ato explícito.
 */

export type ResultadoDoItem = {
  sourcePath: string;
  acao: "criada" | "pulada" | "erro";
  status?: string;
  publicationId?: string;
  midias?: number;
  detalhe?: string;
  avisos: string[];
};

export type RelatorioDeImport = {
  itens: ResultadoDoItem[];
  criadas: number;
  puladas: number;
  erros: number;
  porStatus: Record<string, number>;
  dryRun: boolean;
};

export async function importar(
  prisma: PrismaClient,
  storage: StorageProvider,
  projectId: string,
  achados: ConteudoEncontrado[],
  { dryRun = true }: { dryRun?: boolean } = {},
): Promise<RelatorioDeImport> {
  const itens: ResultadoDoItem[] = [];

  for (const achado of achados) {
    itens.push(await importarUm(prisma, storage, projectId, achado, dryRun));
  }

  const porStatus: Record<string, number> = {};
  for (const item of itens) {
    if (item.status) porStatus[item.status] = (porStatus[item.status] ?? 0) + 1;
  }

  return {
    itens, porStatus, dryRun,
    criadas: itens.filter((i) => i.acao === "criada").length,
    puladas: itens.filter((i) => i.acao === "pulada").length,
    erros: itens.filter((i) => i.acao === "erro").length,
  };
}

async function importarUm(
  prisma: PrismaClient,
  storage: StorageProvider,
  projectId: string,
  achado: ConteudoEncontrado,
  dryRun: boolean,
): Promise<ResultadoDoItem> {
  const base = { sourcePath: achado.sourcePath, avisos: achado.avisos };

  const existente = await prisma.publication.findUnique({ where: { sourcePath: achado.sourcePath } });
  if (existente) {
    return { ...base, acao: "pulada", status: existente.status, publicationId: existente.id,
      detalhe: "já importada — mantida como está" };
  }

  if (dryRun) {
    return { ...base, acao: "criada", status: achado.estado, midias: achado.midias.length,
      detalhe: "[dry-run] nada foi gravado" };
  }

  let criada: Publication | undefined;
  try {
    criada = await criarPublicacao(prisma, projectId, achado);
    const publicacao = criada;
    await subirMidias(prisma, storage, projectId, publicacao, achado);

    await registrarEvento(prisma, publicacao.id, "IMPORTED",
      `Importada de ${achado.sourcePath} (sistema antigo)`,
      { sourcePath: achado.sourcePath, estado: achado.estado, midias: achado.midias.length, avisos: achado.avisos });

    if (achado.estado === "APPROVED") {
      await registrarEvento(prisma, publicacao.id, "APPROVED",
        "Aprovada na origem (pendente.md registra aprovação de texto e formato). Não agendada.");
    }
    if (achado.estado === "PUBLISHED") {
      await registrarEvento(prisma, publicacao.id, "PUBLISHED",
        `Já estava publicada no sistema antigo${achado.externalUrl ? ` — ${achado.externalUrl}` : ""}`,
        { externalUrl: achado.externalUrl });
    }

    return { ...base, acao: "criada", status: publicacao.status, publicationId: publicacao.id,
      midias: achado.midias.length };
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    // Desfaz o parcial: uma publicação sem todas as mídias, marcada como
    // aprovada, é pior do que nenhuma — o operador poderia agendá-la sem
    // perceber. Sem o registro, o import roda de novo e refaz do zero.
    if (criada) {
      await prisma.publication.delete({ where: { id: criada.id } }).catch(() => {});
    }
    logger.error("falha ao importar — parcial desfeito", { sourcePath: achado.sourcePath, error: detalhe });
    return { ...base, acao: "erro", detalhe };
  }
}

async function criarPublicacao(
  prisma: PrismaClient,
  projectId: string,
  achado: ConteudoEncontrado,
): Promise<Publication> {
  const publicada = achado.estado === "PUBLISHED";
  return prisma.publication.create({
    data: {
      projectId,
      title: achado.titulo,
      description: [achado.disciplina, `${achado.midias.length} slide(s)`].filter(Boolean).join(" · "),
      caption: achado.legenda,
      type: achado.tipo,
      channel: "INSTAGRAM",
      status: achado.estado,
      // Publicação antiga não tem id da plataforma: só o link ficou registrado.
      // externalId fica nulo de propósito, e a sincronização de metadados
      // preenche depois, se o operador quiser.
      externalUrl: achado.externalUrl,
      publishedAt: publicada ? achado.publicadoEm : null,
      metadataSyncedAt: publicada && achado.externalUrl ? achado.publicadoEm : null,
      scheduledAt: null,
      sourcePath: achado.sourcePath,
    },
  });
}

async function subirMidias(
  prisma: PrismaClient,
  storage: StorageProvider,
  projectId: string,
  publicacao: Publication,
  achado: ConteudoEncontrado,
): Promise<void> {
  for (const midia of achado.midias) {
    const dados = await readFile(midia.caminho);
    const objectKey = chaveDeMidia(projectId, publicacao.id, midia.posicao, midia.nome);
    await storage.upload(objectKey, dados, {
      mimeType: midia.mimeType,
      metadata: { projectId, publicationId: publicacao.id },
    });
    await prisma.media.create({
      data: {
        publicationId: publicacao.id,
        position: midia.posicao,
        objectKey,
        mimeType: midia.mimeType,
        size: midia.tamanho,
      },
    });
  }
}
