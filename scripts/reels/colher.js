import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "../lib/cloudinary.js";
import { graphGet } from "../lib/graph.js";

// Este workspace opera vários negócios (negocios/<slug>/...), e não existe
// "negócio ativo" persistente. Por isso a raiz é obrigatória: adivinhar qual
// negócio colher seria pior que exigir o caminho.
const EXEMPLO_RAIZ = "negocios/ciencia-visual/marketing/reels";

export function lerRegistro(texto) {
  const pegar = (rotulo) => texto.match(new RegExp(`\\*\\*${rotulo}:\\*\\*\\s*(.+)`))?.[1]?.trim();
  const publicadoEm = pegar("Publicado em");
  return {
    mediaId: pegar("Media ID"),
    permalink: pegar("Permalink"),
    publicadoEm: publicadoEm ? new Date(publicadoEm) : null,
    graduou: pegar("Graduou"),
    tipo: pegar("Tipo"),
    colhidoEm: pegar("Colhido em"),
  };
}

// Reel normal já nasce no feed: não tem graduação pra verificar, só métricas.
// Cobre "reel normal" puro (padrão) e o antigo fallback do trial
// ("reel normal (conta ainda não atinge...)").
export function ehReelNormal(registro) {
  return /^reel normal\b/i.test(registro.tipo ?? "") && !registro.graduou;
}

export function anexarMetricas(texto, metricas = {}) {
  const linhas = [
    `- **Colhido em:** ${new Date().toISOString()}`,
    ...Object.entries(metricas).map(([k, v]) => `- **${k}:** ${v}`),
  ];
  return `${texto.replace(/\s*$/, "")}\n${linhas.join("\n")}\n`;
}

export function atualizarRegistro(texto, { graduou, metricas = {} }) {
  const rotulo = graduou ? "sim" : "não";
  const linhas = Object.entries(metricas).map(([k, v]) => `- **${k}:** ${v}`);
  const bloco = [
    `- **Graduou:** ${rotulo}`,
    `- **Colhido em:** ${new Date().toISOString()}`,
    ...linhas,
  ].join("\n");

  return texto.replace(/- \*\*Graduou:\*\*.*/, bloco);
}

// A janela de 72h é comportamento observado, não contrato de API:
// o estado real vem da consulta, este limiar só evita colher cedo demais.
const HORAS_MINIMAS = 72;

export async function colher(opcoes = {}) {
  const raiz = opcoes.raiz;
  if (!raiz) throw new Error(`Informe a pasta de reels do negócio. Ex.: ${EXEMPLO_RAIZ}`);
  const accessToken = opcoes.accessToken ?? env("META_PAGE_ACCESS_TOKEN");
  const get = opcoes.deps?.graphGet ?? graphGet;

  let pastas;
  try {
    pastas = await readdir(raiz, { withFileTypes: true });
  } catch (err) {
    // marketing/reels/ só nasce no primeiro reel produzido; a primeira colheita
    // não pode cuspir stack trace de ENOENT.
    if (err.code === "ENOENT") {
      console.log(`Nada pra colher: ${raiz} ainda não existe (a pasta nasce quando o primeiro reel é produzido).`);
      return [];
    }
    throw err;
  }

  const resultados = [];

  for (const entrada of pastas) {
    if (!entrada.isDirectory()) continue;
    const caminho = join(raiz, entrada.name, "publicado.md");

    let texto;
    try {
      texto = await readFile(caminho, "utf-8");
    } catch {
      continue;
    }

    const registro = lerRegistro(texto);
    const normal = ehReelNormal(registro);
    if (!registro.mediaId) continue;
    // Trial: colhe enquanto "Graduou: pendente". Normal: colhe uma vez só (até
    // gravar "Colhido em"). Qualquer outra coisa já foi resolvida.
    if (normal ? registro.colhidoEm : registro.graduou !== "pendente") continue;

    // publicado.md é editável à mão: data ausente ou ilegível não pode virar NaN silencioso.
    if (!registro.publicadoEm || Number.isNaN(registro.publicadoEm.getTime())) {
      console.warn(`  ${entrada.name}: "Publicado em" ausente ou ilegível no publicado.md — pulando. Corrija a data à mão pra colher.`);
      continue;
    }

    const horas = (Date.now() - registro.publicadoEm.getTime()) / 3_600_000;
    if (horas < HORAS_MINIMAS) {
      console.log(`  ${entrada.name}: só ${horas.toFixed(0)}h, esperando ${HORAS_MINIMAS}h`);
      continue;
    }

    if (normal) {
      const dados = await get(registro.mediaId, {
        fields: "media_product_type,like_count,comments_count",
        access_token: accessToken,
      });
      await writeFile(caminho, anexarMetricas(texto, {
        curtidas: dados.like_count ?? 0,
        comentarios: dados.comments_count ?? 0,
      }));
      console.log(`  ${entrada.name}: reel normal, métricas registradas`);
      resultados.push({ pasta: entrada.name, graduou: null, normal: true });
      continue;
    }

    const dados = await get(registro.mediaId, {
      fields: "media_product_type,is_shared_to_feed,like_count,comments_count",
      access_token: accessToken,
    });

    // Um trial que graduou passa a se comportar como reel normal do feed.
    // Só true e false são veredito. Ausente ou null é ambiguidade, e ambiguidade
    // vira "não graduou" gravado em disco — que o scan nunca mais reabre, e que
    // é justamente o insumo da decisão de estratégia de conteúdo. Melhor pendente.
    const bruto = dados.is_shared_to_feed;
    if (bruto !== true && bruto !== false) {
      console.warn(
        `  ${entrada.name}: a Graph API não retornou is_shared_to_feed utilizável ` +
        `(veio ${JSON.stringify(bruto)}; media_product_type=${JSON.stringify(dados.media_product_type)}, ` +
        `like_count=${JSON.stringify(dados.like_count)}, comments_count=${JSON.stringify(dados.comments_count)}). ` +
        `Registro fica pendente pra colher de novo — veredito nenhum é melhor que veredito errado.`
      );
      continue;
    }
    const graduou = bruto === true;

    await writeFile(caminho, atualizarRegistro(texto, {
      graduou,
      metricas: { curtidas: dados.like_count ?? 0, comentarios: dados.comments_count ?? 0 },
    }));

    console.log(`  ${entrada.name}: ${graduou ? "GRADUOU" : "não graduou"}`);
    resultados.push({ pasta: entrada.name, graduou });
  }

  const graduados = resultados.filter((r) => r.graduou === true).length;
  const normais = resultados.filter((r) => r.normal).length;
  const trials = resultados.length - normais;
  console.log(`\n✓ ${resultados.length} reel(s) colhido(s): ${trials} trial (${graduados} graduou/graduaram), ${normais} normal(is)`);
  return resultados;
}

if (import.meta.filename === process.argv[1]) {
  const raiz = process.argv[2];
  if (!raiz) {
    console.error(`Uso: node --env-file=.env scripts/reels/colher.js <pasta-de-reels-do-negocio>`);
    console.error(`Ex.:  node --env-file=.env scripts/reels/colher.js ${EXEMPLO_RAIZ}`);
    process.exit(1);
  }
  await colher({ raiz }).catch((err) => {
    console.error(`\n✗ ${err.message}`);
    process.exit(1);
  });
}
