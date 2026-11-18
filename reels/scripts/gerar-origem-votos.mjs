// Dados do reel "De onde vieram os votos do 2º turno" (ciencia/OrigemVotos), a partir de
// dados/derivados.json (feito por dados/derivar.py, das seções brutas dos dois turnos) e da
// malha dos estados do IBGE que o reel da apuração já baixou (br-uf.json).
//
//   node scripts/gerar-origem-votos.mjs <dados/ do reel> <pasta com br-uf.json> src/ciencia/origem-votos.json
//
// Nenhum número do vídeo é digitado à mão: sai tudo daqui, e o script confere cada número da
// fala. Se um dado mudar e a fala ficar errada, o script para.
//
// Totais: a tela e a fala usam os totais oficiais (a soma de todas as seções de cada turno).
// O pareamento 1º × 2º turno tem 499.205 seções porque uma seção do exterior (ZZ, 30686, zona
// 1, seção 443) só existe no 1º turno, com 2 votos pro Lula. Por isso a variação pareada do
// Lula e a do comparecimento dão 2 votos a mais que a oficial. A regressão, as regiões e as
// parcelas de seções usam o pareado; a diferença não muda nenhum arredondamento.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoMercator, geoPath, geoArea } from "d3-geo";

const [DADOS, MAPA, SAIDA] = process.argv.slice(2);
if (!DADOS || !MAPA || !SAIDA) throw new Error("uso: gerar-origem-votos.mjs <dados/> <pasta do mapa> <saída.json>");

const log = []; // vira dados/conferencia.txt: o que foi conferido e o valor achado
const confere = (ok, msg) => { if (!ok) throw new Error(`não confere: ${msg}`); log.push(`ok  ${msg}`); };
const igual = (a, b, msg) => confere(a === b, `${msg}: ${a}${a === b ? "" : ` × ${b}`}`);
const casas = (n, c) => Math.round(n * 10 ** c) / 10 ** c;

const R = JSON.parse(readFileSync(join(DADOS, "derivados.json"), "utf-8"));
const { t1, t2 } = R.oficial;

// --- a conta exata ---------------------------------------------------------------------------
igual(t1.lula, 53879538, "Lula no 1º turno");
igual(t2.lula, 64256232, "Lula no 2º turno");
igual(t1.flavio, 56104503, "Flávio no 1º turno");
igual(t2.flavio, 59826041, "Flávio no 2º turno");
igual(t1.comparecimento, 125275835, "comparecimento no 1º turno");
igual(t2.comparecimento, 128236074, "comparecimento no 2º turno");
igual(t1.bn, 5969801, "branco + nulo no 1º turno");
igual(t2.bn, 4153801, "branco + nulo no 2º turno");

const dLula = t2.lula - t1.lula, dFlavio = t2.flavio - t1.flavio;
const dComp = t2.comparecimento - t1.comparecimento, dBN = t1.bn - t2.bn;
const eliminados = Object.values(R.eliminados).reduce((a, b) => a + b, 0);
const total = dLula + dFlavio;
igual(dLula, 10376694, "Lula ganhou");
igual(dFlavio, 3721538, "Flávio ganhou");
igual(dComp, 2960239, "comparecimento a mais");
igual(dBN, 1816000, "branco e nulo a menos");
igual(eliminados, 9321993, "votos dos eliminados");
igual(total, 14098232, "votos que entraram na disputa");
igual(eliminados + dComp + dBN, total, "as três torneiras fecham voto a voto");

// A fala arredonda assim:
igual(casas(dLula / 1e6, 1), 10.4, "+10,4 mi");
igual(casas(dFlavio / 1e6, 1), 3.7, "+3,7 mi");
igual(Math.round(total / 1e6), 14, "14 milhões");
igual(Math.round((100 * dLula) / total), 74, "74% pro Lula");
igual(Math.round((100 * dFlavio) / total), 26, "26% pro Flávio");
igual(casas(eliminados / 1e6, 1), 9.3, "9,3 milhões dos eliminados");
igual(casas(dComp / 1e6, 1), 3, "3 milhões de comparecimento");
igual(casas(dBN / 1e6, 1), 1.8, "1,8 milhão de branco e nulo");

// --- pareamento -------------------------------------------------------------------------------
igual(R.pareado.secoes, 499205, "seções pareadas");
igual(R.pareado.so1t, 1, "uma seção só no 1º turno");
igual(R.pareado.so2t, 0, "nenhuma seção só no 2º turno");
igual(R.pareado.dLula - dLula, 2, "pareado × oficial, Lula");
igual(R.pareado.dComp - dComp, 2, "pareado × oficial, comparecimento");
igual(R.pareado.dFlavio, dFlavio, "pareado × oficial, Flávio");
igual(R.pareado.dBN, dBN, "pareado × oficial, branco e nulo");
igual(Math.round(R.pareado.secoes / 1000), 499, "499 mil seções");

// --- estimativa de saldo: as duas regressões dão a faixa --------------------------------------
const clip = (v) => Math.min(100, Math.max(0, v));
const faixa = (id) => {
  const r = R.regressao[id];
  const vals = [100 * r.todas.lula, 100 * r.municipio.lula];
  return { lo: Math.min(...vals), hi: Math.max(...vals) };
};
const cury = faixa("cury"), renan = faixa("renan"), caiado = faixa("caiado"), zema = faixa("zema"), comp = faixa("comp"), bn = faixa("bn");
const faixaInt = (f) => [Math.round(clip(f.lo)), Math.round(clip(f.hi))];
igual(faixaInt(cury).join(), "70,91", "Cury 70–91% pro Lula");
igual(faixaInt(renan).join(), "58,62", "Renan Santos 58–62% pro Lula");
igual(faixaInt(caiado).join(), "45,50", "Caiado 45–50% pro Lula (50–55% pro Flávio)");
confere(zema.hi <= 0 && zema.lo > -10, `Zema ~0% pro Lula, ~100% pro Flávio (${zema.lo} a ${zema.hi})`);
igual(faixaInt(bn).join(), "82,100", "branco e nulo 82–100% pro Lula");
confere(Math.abs(comp.lo - 63) <= 1 && Math.abs(comp.hi - 63) <= 1, `comparecimento ~63% pro Lula (${comp.lo} a ${comp.hi})`);
const r2 = (id) => casas(R.eliminados[id] / 1e6, 2);
igual(r2("cury"), 3.45, "Cury 3,45 mi");
igual(r2("renan"), 2.68, "Renan Santos 2,68 mi");
igual(r2("caiado"), 2.61, "Caiado 2,61 mi");
igual(r2("zema"), 0.33, "Zema 0,33 mi");

// Na ordem da fala: alterna os lados, pra ninguém parecer ganhar a lista.
const LINHAS = [
  { id: "cury", nome: "CURY", foto: "cury", votos: R.eliminados.cury, lo: 70, hi: 91, tL: "70–91%", tF: "9–30%", grande: "70–91%", rotulo: "DO SALDO DO CURY PRO LULA" },
  { id: "caiado", nome: "CAIADO", foto: "caiado", votos: R.eliminados.caiado, lo: 45, hi: 50, tL: "45–50%", tF: "50–55%", grande: "50–55%", rotulo: "DO SALDO DO CAIADO PRO FLÁVIO" },
  { id: "renan", nome: "RENAN SANTOS", foto: "renan", votos: R.eliminados.renan, lo: 58, hi: 62, tL: "58–62%", tF: "38–42%", grande: "58–62%", rotulo: "DO SALDO DO RENAN PRO LULA" },
  { id: "zema", nome: "ZEMA", foto: "zema", votos: R.eliminados.zema, lo: 0, hi: 0, tL: "~0%", tF: "~100%", grande: "~100%", rotulo: "DO SALDO DO ZEMA PRO FLÁVIO" },
];
const VOLTA = {
  comp: { lo: 63, hi: 63, tL: "63%", tF: "37%", votos: dComp },
  bn: { lo: 82, hi: 100, tL: "82–100%", tF: "0–18%", votos: dBN },
};

// --- onde a margem mudou ------------------------------------------------------------------------
const margem1 = t1.flavio - t1.lula, margem2 = t2.lula - t2.flavio, mudanca = margem1 + margem2;
igual(mudanca, 6655156, "a margem mudou 6.655.156 votos");
igual(casas(margem1 / 1e6, 2), 2.22, "Flávio +2,22 mi no 1º turno");
igual(casas(margem2 / 1e6, 2), 4.43, "Lula +4,43 mi no 2º turno");
igual(casas(mudanca / 1e6, 1), 6.7, "6,7 milhões na fala");
const somaReg = Object.values(R.regioes).reduce((s, r) => s + r.mudanca, 0);
igual(somaReg, R.pareado.dLula - R.pareado.dFlavio, "as regiões somam a mudança pareada");
const parte = (v) => (100 * v) / somaReg;
const pct = Object.fromEntries(Object.entries(R.regioes).map(([k, r]) => [k, Math.round(parte(r.mudanca))]));
pct.SP = Math.round(parte(R.ufs.SP));
igual(pct.SE, 43, "Sudeste 43%");
igual(pct.NE, 38, "Nordeste 38%");
igual(pct.S, 7, "Sul 7%");
igual(pct.N, 7, "Norte 7%");
igual(pct.CO, 5, "Centro-Oeste 5%");
igual(pct.SP, 21, "São Paulo 21%");
confere(pct.SE + pct.NE + pct.S + pct.N + pct.CO === 100, "as cinco regiões somam 100% depois de arredondar");
confere(R.regioes.SE.mudanca > R.regioes.NE.mudanca, "a maior mudança foi no Sudeste");

// --- os dois subiram -----------------------------------------------------------------------------
igual(casas(R.secoes.lula, 1), 97.6, "Lula ganhou votos em 97,6% das seções");
igual(casas(R.secoes.flavio, 1), 79.8, "Flávio ganhou votos em 79,8% das seções");
igual(casas(R.secoes.dois, 1), 78.8, "os dois em 78,8% das seções");

// --- mapa ------------------------------------------------------------------------------------
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
const REGIAO_UF = {
  N: "AC AM AP PA RO RR TO", NE: "AL BA CE MA PB PE PI RN SE", SE: "ES MG RJ SP", S: "PR RS SC", CO: "DF GO MS MT",
};
const regiaoDe = Object.fromEntries(Object.entries(REGIAO_UF).flatMap(([r, v]) => v.split(" ").map((u) => [u, r])));
// Quadro do mapa no vídeo: o palco entre o status (y 330) e o texto de baixo (y 1170).
const proj = geoMercator().fitExtent([[150, 410], [930, 1150]], ufs);
const caminho = geoPath(proj);
caminho.digits?.(1);
const contornos = ufs.features.map((ft) => {
  const uf = COD_UF[ft.properties.codarea];
  return { uf, r: regiaoDe[uf], d: caminho(ft), c: caminho.centroid(ft).map((v) => +v.toFixed(1)) };
});
confere(contornos.length === 27 && contornos.every((c) => c.uf && c.r), "27 estados na malha");

/** Centróide de uma região: a média dos centróides dos estados, ponderada pela área na tela. */
const centroRegiao = (r) => {
  const fs = ufs.features.filter((ft) => regiaoDe[COD_UF[ft.properties.codarea]] === r);
  const a = fs.map((ft) => caminho.area(ft));
  const soma = a.reduce((x, y) => x + y, 0);
  return [0, 1].map((k) => +(fs.reduce((s, ft, i) => s + caminho.centroid(ft)[k] * a[i], 0) / soma).toFixed(1));
};

// --- método: 499 grupos de seções em ordem de % do Cury ---------------------------------------
const G = R.metodo.grupos;
igual(G.length, 499, "499 grupos");
const xMax = 10; // % do Cury no eixo da tela
confere(G.every((g) => g[0] <= xMax), "todos os grupos cabem no eixo");
const metodo = G.map(([x, l, f]) => [casas(x, 2), casas(l, 1), casas(f, 1)]);
const saida = {
  conta: { dLula, dFlavio, dComp, dBN, eliminados, total },
  linhas: LINHAS, volta: VOLTA,
  margem: { de: margem1, ate: margem2, mudanca },
  pct, contornos,
  centros: Object.fromEntries(Object.keys(REGIAO_UF).map((r) => [r, centroRegiao(r)])),
  secoes: { lula: casas(R.secoes.lula, 1), flavio: casas(R.secoes.flavio, 1) },
  metodo: { pontos: metodo, xMax },
};
writeFileSync(SAIDA, `${JSON.stringify(saida)}\n`);
writeFileSync(join(DADOS, "conferencia.txt"), `${log.join("\n")}\n`);
console.log(`ok: ${total.toLocaleString("pt-BR")} votos, ${metodo.length} pontos no método, ${(JSON.stringify(saida).length / 1024).toFixed(0)} kB. Todos os números da fala conferem.`);
