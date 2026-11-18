// Relatório do canal A2LO: totais do período, vídeo a vídeo (views, retenção, inscritos) e origem do tráfego.
//   node scripts/youtube/analisar.js            → últimos 28 dias
//   node scripts/youtube/analisar.js --dias 7 --salvar <pasta>
// A YouTube Analytics API tem atraso de 1 a 3 dias: o fim do período é anteontem.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { obterAccessToken } from "./oauth.js";
import { criarCliente } from "./api.js";
import { DIR_SECRETS, CANAL_ESPERADO } from "./config.js";

const dia = (d) => d.toISOString().slice(0, 10);
const tabela = (r) => (r.rows ?? []).map((row) => Object.fromEntries(r.columnHeaders.map((h, i) => [h.name, row[i]])));

export async function analisar({ dias = 28 } = {}, yt) {
  const fim = new Date(Date.now() - 2 * 864e5);
  const inicio = new Date(fim.getTime() - (dias - 1) * 864e5);
  const periodo = { startDate: dia(inicio), endDate: dia(fim) };
  const canal = await yt.canalAtual();
  if (canal.id !== CANAL_ESPERADO) throw new Error(`autorização é do canal ${canal.titulo}, não do A2LO`);

  const metricas = "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares";
  const [totais, porVideo, trafego] = await Promise.all([
    yt.relatorio({ ...periodo, metrics: metricas }),
    yt.relatorio({ ...periodo, metrics: metricas, dimensions: "video", sort: "-views", maxResults: "25" }),
    yt.relatorio({ ...periodo, metrics: "views,estimatedMinutesWatched", dimensions: "insightTrafficSourceType", sort: "-views" }),
  ]);
  const videos = tabela(porVideo);
  const titulos = videos.length ? Object.fromEntries((await yt.videos(videos.map((v) => v.video))).items.map((v) => [v.id, v.snippet.title])) : {};
  return {
    canal, periodo,
    totais: tabela(totais)[0] ?? {},
    videos: videos.map((v) => ({ ...v, titulo: titulos[v.video] ?? v.video })),
    trafego: tabela(trafego),
  };
}

function imprimir(r) {
  const t = r.totais;
  console.log(`${r.canal.titulo} · ${r.canal.inscritos} inscritos · ${r.periodo.startDate} a ${r.periodo.endDate}`);
  console.log(`Views ${t.views ?? 0} · ${Math.round(t.estimatedMinutesWatched ?? 0)} min assistidos · duração média ${Math.round(t.averageViewDuration ?? 0)}s · retenção ${Math.round(t.averageViewPercentage ?? 0)}% · inscritos +${t.subscribersGained ?? 0}/−${t.subscribersLost ?? 0}`);
  if (r.videos.length) {
    console.log("\nPor vídeo:");
    for (const v of r.videos) console.log(`  ${String(v.views).padStart(6)} views · ${String(Math.round(v.averageViewPercentage)).padStart(3)}% retido · +${v.subscribersGained} insc · ${v.titulo}`);
  }
  if (r.trafego.length) {
    console.log("\nOrigem do tráfego:");
    for (const o of r.trafego) console.log(`  ${String(o.views).padStart(6)} · ${o.insightTrafficSourceType}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const a = process.argv.slice(2);
    const dias = a.includes("--dias") ? Number(a[a.indexOf("--dias") + 1]) : 28;
    const salvar = a.includes("--salvar") ? a[a.indexOf("--salvar") + 1] : null;
    const r = await analisar({ dias }, criarCliente(await obterAccessToken(DIR_SECRETS)));
    imprimir(r);
    if (salvar) {
      await mkdir(salvar, { recursive: true });
      const arq = join(salvar, `youtube-${r.periodo.endDate}.json`);
      await writeFile(arq, JSON.stringify(r, null, 2) + "\n");
      console.log(`\nSalvo em ${arq}`);
    }
  } catch (e) {
    console.error(`Erro: ${e.message}`);
    process.exit(1);
  }
}
