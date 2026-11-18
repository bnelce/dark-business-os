// Dados do reel "Brasil em miniatura" (ciencia/BrasilMiniatura), a partir dos derivados
// da pasta dados/ do reel (resumo.json, historico_2t.csv, censo_municipios.csv,
// distancia2026.csv, feitos pelos scripts p1–p9 em Python) e da malha dos estados e dos
// centróides municipais do IBGE que o reel da apuração já baixou (br-uf.json e
// municipios.csv em apuracao-2turno-2026-10-28/dados/).
//
//   node scripts/gerar-miniatura.mjs <dados/ do reel> <pasta com br-uf.json e municipios.csv> src/ciencia/brasil-miniatura.json
//
// Nenhum número do vídeo é digitado à mão: sai tudo daqui, e o script confere contra o
// que a narração diz (52,6 a 47,4; 1,7 ponto; 1ª de 5.563; meio ponto em 2022; Mossoró
// quase 12 pontos fora; Pedreira 2002 em cheio e 23 pontos em 2026; Minas 7 de 7; 67 de
// 107; 27 miniaturas). Se um dado mudar e a fala ficar errada, o script para.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoMercator, geoPath, geoArea } from "d3-geo";

const [DADOS, MAPA, SAIDA] = process.argv.slice(2);
if (!DADOS || !MAPA || !SAIDA) throw new Error("uso: gerar-miniatura.mjs <dados/> <pasta do mapa> <saída.json>");

const confere = (ok, msg) => { if (!ok) throw new Error(`não confere: ${msg}`); };
const um = (n) => Math.round(n * 10) / 10;

/** CSV simples (os derivados não têm vírgula dentro de campo). */
const csv = (arq) => {
  const [cab, ...linhas] = readFileSync(arq, "utf-8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const cols = cab.split(",");
  return linhas.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])));
};

const R = JSON.parse(readFileSync(join(DADOS, "resumo.json"), "utf-8"));
const HIST = csv(join(DADOS, "historico_2t.csv"));
const CENSO = csv(join(DADOS, "censo_municipios.csv"));
const DIST = csv(join(DADOS, "distancia2026.csv"));
const MUN = csv(join(MAPA, "municipios.csv"));
const ANOS = ["2002", "2006", "2010", "2014", "2018", "2022", "2026"];

// --- mapa ------------------------------------------------------------------------------
// O GeoJSON do IBGE vem no sentido RFC 7946; o d3-geo usa o oposto (ver gerar-apuracao.mjs).
const ufs = JSON.parse(readFileSync(join(MAPA, "br-uf.json"), "utf-8"));
for (const ft of ufs.features) {
  if (geoArea(ft) > 2 * Math.PI) {
    const g = ft.geometry;
    for (const p of g.type === "Polygon" ? [g.coordinates] : g.coordinates) for (const anel of p) anel.reverse();
  }
}
const COD_UF = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO", 21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB",
  26: "PE", 27: "AL", 28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS", 50: "MS",
  51: "MT", 52: "GO", 53: "DF",
};
// Quadro do mapa no vídeo 1080x1920: o palco entre o status (y 330) e o texto de baixo (y 1170).
const proj = geoMercator().fitExtent([[170, 430], [910, 1150]], ufs);
const caminho = geoPath(proj);
caminho.digits?.(1);
const contornos = ufs.features.map((ft) => ({ uf: COD_UF[ft.properties.codarea], d: caminho(ft) }));
const centroUf = (uf) => caminho.centroid(ufs.features.find((ft) => COD_UF[ft.properties.codarea] === uf)).map((v) => +v.toFixed(1));
confere(contornos.length === 27 && contornos.every((c) => c.uf), "27 estados na malha");

const centro = Object.fromEntries(MUN.map((m) => [m.codigo_ibge, m]));
const xy = (cdIbge) => {
  const m = centro[cdIbge];
  if (!m) throw new Error(`sem centróide: ${cdIbge}`);
  return proj([+m.longitude, +m.latitude]).map((v) => +v.toFixed(1));
};
const ANA = "1500800", MOSSORO = "2408003", PEDREIRA = "3537107";
const A = xy(ANA);

// Todos os municípios, pro mapa que encolhe até Ananindeua no gancho e no fim. O 3º número
// é a distância até Ananindeua, de 0 a 1: os mais perto chegam primeiro.
const pontos = MUN.map((m) => proj([+m.longitude, +m.latitude]));
const dmax = Math.max(...pontos.map(([x, y]) => Math.hypot(x - A[0], y - A[1])));
const muns = pontos.map(([x, y]) => [+x.toFixed(1), +y.toFixed(1), +(Math.hypot(x - A[0], y - A[1]) / dmax).toFixed(3)]);
confere(muns.length === DIST.length, `um centróide por município de 2026 (${muns.length} × ${DIST.length})`);

// --- prova: o 2º turno de 2026 ---------------------------------------------------------------
const ana26 = R.ananindeua["2026"];
const prova = {
  ananindeua: { lula: ana26.lula_2t, flavio: ana26.flavio_2t },
  brasil: { lula: R.brasil_2026.lula_2t, flavio: R.brasil_2026.flavio_2t },
};
prova.dif = +(prova.ananindeua.lula - prova.brasil.lula).toFixed(2);
confere(um(prova.ananindeua.lula) === 52.6 && um(prova.ananindeua.flavio) === 47.4, "Ananindeua 52,6 a 47,4");
confere(um(prova.brasil.lula) === 51.8 && um(prova.brasil.flavio) === 48.2, "Brasil 51,8 a 48,2");

// --- histórico: % do candidato do PT no 2º turno ---------------------------------------------
const linha = (cd) => {
  const h = HIST.find((x) => x.cd_ibge === cd);
  if (!h) throw new Error(`sem histórico: ${cd}`);
  return h;
};
const hA = linha(ANA), hP = linha(PEDREIRA), hM = linha(MOSSORO);
const brasilPT = ANOS.map((a) => R.historico.brasil_2t_por_ano[a].pt_pct);
const venceuPT = brasilPT.map((p) => p > 50);
const anaPT = ANOS.map((a) => +hA[`pt_${a}`]);
const anaAcertos = anaPT.map((p, i) => (p > 50) === venceuPT[i]);
confere(HIST.length === 5563, `5.563 municípios com a série (veio ${HIST.length})`);
const ordem = [...HIST].sort((a, b) => +a.dist_media - +b.dist_media);
confere(ordem[0].cd_ibge === ANA, "Ananindeua é a 1ª na distância média");
confere(um(+hA.dist_media) === 1.7, "média de 1,7 ponto");
confere(anaAcertos.filter(Boolean).length === 6 && !anaAcertos[5], "errou o vencedor só em 2022");
const margem2022 = +Math.abs(2 * anaPT[5] - 100).toFixed(2); // 50,28 − 49,72
confere(margem2022 >= 0.4 && margem2022 <= 0.6, `2022 por meio ponto (${margem2022})`);

const pedPT = ANOS.map((a) => +hP[`pt_${a}`]);
confere(Math.abs(pedPT[0] - brasilPT[0]) < 0.01, "Pedreira cravou 2002");
const ped26 = Math.abs(pedPT[6] - brasilPT[6]);
confere(Math.round(ped26) === 23, `Pedreira a 23 pontos em 2026 (${ped26.toFixed(2)})`);

// Histograma da distância média dos 7 segundos turnos, de 1 em 1 ponto.
const BIN = 1;
const bins = Array.from({ length: Math.ceil(Math.max(...HIST.map((h) => +h.dist_media)) / BIN) }, () => 0);
for (const h of HIST) bins[Math.min(bins.length - 1, Math.floor(+h.dist_media / BIN))]++;

// --- Censo: Ananindeua não se parece, Mossoró se parece --------------------------------------
const cBr = CENSO.find((c) => c.nome === "BRASIL");
const cA = CENSO.find((c) => c.cd_ibge === ANA), cM = CENSO.find((c) => c.cd_ibge === MOSSORO);
const ordemCenso = CENSO.filter((c) => c.nome !== "BRASIL").sort((a, b) => +a.dist_censo - +b.dist_censo);
confere(ordemCenso[0].cd_ibge === MOSSORO, "Mossoró é a mais parecida com o Brasil no Censo");
const ind = (c) => ({ parda: um(+c.parda_pct), evangelica: um(+c.evangelica_pct) });
const mossoro2t = Math.abs(+hM.dev_2026);
confere(mossoro2t > 11.5 && mossoro2t < 12, `Mossoró quase 12 pontos fora no 2º turno (${mossoro2t})`);
const censo = {
  brasil: ind(cBr), ananindeua: ind(cA), mossoro: ind(cM), n: ordemCenso.length,
  voto2t: { ananindeua: +Math.abs(+hA.dev_2026).toFixed(2), mossoro: +mossoro2t.toFixed(2) },
};
confere(censo.ananindeua.parda > censo.brasil.parda + 10 && censo.ananindeua.evangelica > censo.brasil.evangelica + 5, "bem mais parda e mais evangélica");

// --- Minas: quem ganhou lá ganhou o Brasil ---------------------------------------------------
const mg = R.historico.minas_gerais;
const mgPT = ANOS.map((a) => mg[a]);
confere(mgPT.every((p, i) => (p > 50) === venceuPT[i]), "Minas acertou os 7");
const sete = HIST.filter((h) => h.acertos === "7");
confere(sete.length === 107 && sete.filter((h) => h.uf === "MG").length === 67, "67 das 107 são mineiras");
const cidades7 = sete.map((h) => [...xy(h.cd_ibge), h.uf === "MG" ? 1 : 0]);

// --- a miniatura de cada estado (2026) -------------------------------------------------------
const estados = R.miniatura_por_uf.map((m) => {
  const d = DIST.find((x) => x.uf === m.uf && x.nome === m.municipio);
  if (!d) throw new Error(`miniatura sem código: ${m.uf} ${m.municipio}`);
  return { uf: m.uf, nome: centro[d.cd_ibge].nome, xy: xy(d.cd_ibge), dist: m.dist };
});
confere(estados.length === 27 && new Set(estados.map((e) => e.uf)).size === 27, "27 miniaturas");
confere(estados.find((e) => e.uf === "PA").nome === "Ananindeua", "a miniatura do Pará é Ananindeua");

writeFileSync(SAIDA, `${JSON.stringify({
  fonte: "TSE, presidente por município 2002–2026; IBGE, Censo 2022",
  anos: ANOS.map(Number),
  contornos, muns, A, eleitoresA: ana26.eleitores, mossoro: xy(MOSSORO), pedreira: xy(PEDREIRA),
  prova,
  hist: { brasil: brasilPT, ananindeua: anaPT, pedreira: pedPT, distMedia: +hA.dist_media, acertos: anaAcertos, margem2022, ana2022: anaPT[5] },
  ranking: { n: HIST.length, bin: BIN, bins },
  censo,
  minas: { pt: mgPT, centro: centroUf("MG"), cidades7, n7: sete.length, n7mg: 67 },
  estados,
})}\n`);
console.log(`Ananindeua ${prova.ananindeua.lula}/${prova.ananindeua.flavio} × Brasil ${prova.brasil.lula}/${prova.brasil.flavio} (dif ${prova.dif})`);
console.log(`média ${hA.dist_media} · 1ª de ${HIST.length} · 2022 por ${margem2022} · Mossoró ${mossoro2t} · Pedreira 2026 ${ped26.toFixed(2)}`);
console.log(`Censo: pardos ${censo.ananindeua.parda} × ${censo.brasil.parda} (Mossoró ${censo.mossoro.parda}); evangélicos ${censo.ananindeua.evangelica} × ${censo.brasil.evangelica} (Mossoró ${censo.mossoro.evangelica})`);
console.log(`Minas 7/7 · ${sete.length} cidades 7/7, 67 em MG · 27 miniaturas · A = ${A}`);
