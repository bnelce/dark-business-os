#!/usr/bin/env node
/**
 * validar-nicho.js — Camada Zero
 *
 * Mede concorrência real de um nicho no YouTube: para cada consulta, busca
 * vídeos publicados nos últimos N dias, ordena por visualizações e cruza com
 * dados do canal (idade, inscritos, total de vídeos).
 *
 * O sinal que interessa: vídeo com muitas views em canal NOVO e PEQUENO.
 * Isso é demanda alta com concorrência fraca — a única combinação que importa.
 *
 * Uso:
 *   export YT_API_KEY="sua-chave"
 *   node validar-nicho.js
 *   node validar-nicho.js --dias 90 --min-views 5000
 *   node validar-nicho.js --consultas "why borders are weird,map explained"
 *
 * Chave: console.cloud.google.com → ativar "YouTube Data API v3" → criar
 * credencial do tipo chave de API. Cota gratuita diária cobre este uso com folga.
 */

const API = "https://www.googleapis.com/youtube/v3";
const KEY = process.env.YT_API_KEY;

const _ci = process.argv.indexOf("--consultas");
const CONSULTAS = _ci !== -1 ? process.argv[_ci + 1].split(",").map((c) => c.trim()) : [
  "outage postmortem explicado",
  "por que o github caiu",
  "falha de engenharia software",
  "crowdstrike o que aconteceu",
  "knight capital 440 milhões",
];

function args() {
  const a = process.argv.slice(2);
  const get = (flag, padrao) => {
    const i = a.indexOf(flag);
    return i === -1 ? padrao : Number(a[i + 1]);
  };
  return {
    dias: get("--dias", 30),
    minViews: get("--min-views", 3000),
    porConsulta: get("--por-consulta", 15),
  };
}

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) {
    const corpo = await r.text();
    throw new Error(`HTTP ${r.status} — ${corpo.slice(0, 300)}`);
  }
  return r.json();
}

async function buscar(q, dias, max) {
  const desde = new Date(Date.now() - dias * 864e5).toISOString();
  const u = new URL(`${API}/search`);
  u.searchParams.set("part", "snippet");
  u.searchParams.set("q", q);
  u.searchParams.set("type", "video");
  u.searchParams.set("order", "viewCount");
  u.searchParams.set("publishedAfter", desde);
  u.searchParams.set("relevanceLanguage", "pt");
  u.searchParams.set("regionCode", "BR");
  u.searchParams.set("maxResults", String(max));
  u.searchParams.set("key", KEY);
  const d = await json(u);
  return (d.items || []).map((i) => ({
    videoId: i.id.videoId,
    titulo: i.snippet.title,
    canalId: i.snippet.channelId,
    canal: i.snippet.channelTitle,
    publicado: i.snippet.publishedAt,
  }));
}

async function detalhes(endpoint, ids, parts) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const u = new URL(`${API}/${endpoint}`);
    u.searchParams.set("part", parts);
    u.searchParams.set("id", ids.slice(i, i + 50).join(","));
    u.searchParams.set("key", KEY);
    const d = await json(u);
    for (const item of d.items || []) out[item.id] = item;
  }
  return out;
}

const meses = (iso) =>
  Math.round((Date.now() - new Date(iso)) / 864e5 / 30.44);

const nf = (n) => Number(n || 0).toLocaleString("pt-BR");

// Canal novo e pequeno. Dado ausente nunca conta como oportunidade.
const ehOportunidade = (l) =>
  l.idadeCanal !== null &&
  l.idadeCanal < 12 &&
  l.inscritos !== null &&
  l.inscritos < 20000;

async function main() {
  if (!KEY) {
    console.error("Defina YT_API_KEY antes de rodar.");
    process.exit(1);
  }
  const { dias, minViews, porConsulta } = args();

  let achados = [];
  for (const q of CONSULTAS) {
    process.stderr.write(`buscando: ${q}\n`);
    try {
      achados.push(...(await buscar(q, dias, porConsulta)).map((v) => ({ ...v, q })));
    } catch (e) {
      console.error(`  falhou (${q}): ${e.message}`);
    }
  }

  // dedup por vídeo
  achados = [...new Map(achados.map((v) => [v.videoId, v])).values()];
  if (!achados.length) return console.log("Nada encontrado na janela.");

  const vids = await detalhes("videos", achados.map((v) => v.videoId), "statistics");
  const cans = await detalhes(
    "channels",
    [...new Set(achados.map((v) => v.canalId))],
    "statistics,snippet"
  );

  const linhas = achados
    .map((v) => {
      const st = vids[v.videoId]?.statistics || {};
      const c = cans[v.canalId];
      const cs = c?.statistics || {};
      const idade = c ? meses(c.snippet.publishedAt) : null;
      const views = Number(st.viewCount || 0);
      // canal que oculta a contagem vem sem subscriberCount — é desconhecido,
      // não zero. Tratar como zero marcaria canal grande como oportunidade.
      const ocultos = cs.hiddenSubscriberCount === true || cs.subscriberCount == null;
      const inscritos = ocultos ? null : Number(cs.subscriberCount);
      return {
        ...v,
        views,
        inscritos,
        idadeCanal: idade,
        videosCanal: Number(cs.videoCount || 0),
        // razão views/inscritos: alto = vídeo performou acima do tamanho do canal.
        // null quando não dá para calcular — não ordena junto com os medidos.
        razao: inscritos > 0 ? views / inscritos : null,
      };
    })
    .filter((l) => l.views >= minViews)
    .sort((a, b) => {
      if (a.razao === null && b.razao === null) return b.views - a.views;
      if (a.razao === null) return 1;
      if (b.razao === null) return -1;
      return b.razao - a.razao;
    });

  console.log(`\n=== ${linhas.length} vídeos, últimos ${dias} dias, +${nf(minViews)} views ===\n`);

  for (const l of linhas.slice(0, 30)) {
    const marca = ehOportunidade(l) ? "  ◀ OPORTUNIDADE" : "";
    console.log(`${nf(l.views).padStart(9)} views  ${l.titulo.slice(0, 66)}`);
    console.log(
      `${"".padStart(9)}         ${l.canal} · ` +
        `${l.inscritos === null ? "inscritos ocultos" : nf(l.inscritos) + " inscritos"} · ` +
        `${l.idadeCanal ?? "?"} meses · ` +
        `razão ${l.razao === null ? "?" : l.razao.toFixed(1)}${marca}`
    );
    console.log(`${"".padStart(9)}         https://youtu.be/${l.videoId}\n`);
  }

  const oport = linhas.filter(ehOportunidade);
  const semDados = linhas.filter(
    (l) => l.inscritos === null || l.idadeCanal === null
  ).length;
  console.log("─".repeat(70));
  console.log(`Oportunidades (canal < 12 meses e < 20k inscritos): ${oport.length}`);
  if (semDados) {
    console.log(
      `${semDados} vídeo(s) fora da conta: canal com inscritos ocultos ou sem dados.`
    );
  }
  console.log(
    oport.length >= 3
      ? "Nicho com demanda e concorrência fraca. Sinal bom — siga."
      : oport.length === 0
      ? "Nenhuma. Ou o nicho é dominado por canais grandes, ou não há busca. Investigue qual dos dois."
      : "Sinal fraco. Rode com --dias 90 antes de concluir."
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
