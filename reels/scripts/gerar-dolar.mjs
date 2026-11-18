// Gera os dados do reel "o dia impossível do dólar" (ciencia/Dolar) a partir da série
// diária da PTAX de venda (Banco Central, SGS 1), baixada e conferida em
// negocios/ciencia-visual/marketing/reels/dolar-eleicao-2026-10-28/dados/.
//
//   node scripts/gerar-dolar.mjs <ptax-sgs1-1999-2026.json> <saída .json>
//
// A estatística usa a série desde março de 1999: janeiro e fevereiro de 1999 são a
// transição do câmbio fixo para o flutuante e não representam o regime atual. O
// ranking de maiores altas usa a série inteira (é o que a imprensa compara).
// Nenhum número do vídeo é digitado à mão.
import { readFileSync, writeFileSync } from "node:fs";

const [ENTRADA, SAIDA] = process.argv.slice(2);
if (!ENTRADA || !SAIDA) throw new Error("uso: gerar-dolar.mjs <ptax.json> <saída.json>");

const serie = JSON.parse(readFileSync(ENTRADA, "utf-8")).map((d) => ({ data: d.data, v: +d.valor }));
const var_ = serie.slice(1).map((d, i) => ({ data: d.data, de: serie[i].v, para: d.v, pct: (d.v / serie[i].v - 1) * 100 }));

const ALVO = "26/10/2026";
const alvo = var_.find((d) => d.data === ALVO);
const ranking = [...var_].sort((a, b) => b.pct - a.pct);
const posicao = ranking.findIndex((d) => d.data === ALVO) + 1;
if (!alvo || Math.abs(alvo.pct - 9.1907) > 1e-3 || posicao !== 3) {
  throw new Error(`26/10 não bate com o conferido: ${alvo?.pct} na posição ${posicao}`);
}

const regime = var_.filter((d) => !(d.data.endsWith("1999") && ["01", "02"].includes(d.data.slice(3, 5))));
const x = regime.map((d) => d.pct);
const media = x.reduce((s, v) => s + v, 0) / x.length;
const dp = Math.sqrt(x.reduce((s, v) => s + (v - media) ** 2, 0) / x.length);
const z = (alvo.pct - media) / dp;

// Cauda da normal: P(Z > z) = erfc(z/√2)/2. erfc por fração contínua (estável para z grande).
const erfc = (u) => {
  // Abramowitz-Stegun 7.1.26 perde precisão na cauda; fração contínua de Lentz serve de 9σ.
  const t = u;
  let f = t, C = t, D = 0;
  for (let k = 1; k < 200; k++) {
    const a = k / 2;
    D = t + a * D; D = 1 / D;
    C = t + a / C;
    const delta = C * D; f *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return Math.exp(-t * t) / Math.sqrt(Math.PI) / f;
};
const pCauda = (zz) => erfc(zz / Math.SQRT2) / 2;
const p = pCauda(z);
const DIAS_UTEIS_ANO = 252;
const anosEspera = 1 / p / DIAS_UTEIS_ANO;
const IDADE_UNIVERSO = 13.8e9;
const vezesUniverso = anosEspera / IDADE_UNIVERSO;
const LIMITE_Z = 5;
const extremos = x.filter((v) => Math.abs((v - media) / dp) > LIMITE_Z).length;
const esperadoNormal = x.length * 2 * pCauda(LIMITE_Z);

if (extremos !== 18 || Math.abs(anosEspera / 2.932e19 - 1) > 0.01) {
  throw new Error(`estatística não bate com o conferido: ${extremos} extremos, ${anosEspera} anos`);
}

// Histograma (bins de 0,25 ponto) da série do regime, e as variações dia a dia pro sismógrafo.
const BIN = 0.25;
const min = Math.floor(Math.min(...x) / BIN) * BIN, max = Math.ceil(Math.max(...x) / BIN) * BIN;
const bins = [];
for (let b = min; b < max - 1e-9; b += BIN) bins.push({ de: +b.toFixed(2), n: 0 });
for (const v of x) bins[Math.min(bins.length - 1, Math.floor((v - min) / BIN))].n++;

const nomes = {
  "15/01/1999": "REAL SAI DO CÂMBIO FIXO",
  "08/10/2008": "CRISE FINANCEIRA GLOBAL",
  [ALVO]: "1º PREGÃO APÓS O 2º TURNO",
  "13/01/1999": "BANDA CAMBIAL MUDA",
  "18/05/2017": "JOESLEY DAY",
};
const top5 = ranking.slice(0, 5).map((d) => ({ data: d.data, pct: +d.pct.toFixed(4), contexto: nomes[d.data] ?? "" }));
if (top5.some((d) => !d.contexto)) throw new Error(`top 5 mudou: ${top5.map((d) => d.data).join(", ")}`);

// 1º pregão depois de cada 2º turno presidencial desde 2002 (as eleições de 1998 são
// anteriores à série). O pregão é a próxima data da série depois do domingo da votação, e
// a variação é contra o pregão anterior. Todas as eleições entram, de todos os lados.
const TURNOS = ["27/10/2002", "29/10/2006", "31/10/2010", "26/10/2014", "28/10/2018", "30/10/2022", "25/10/2026"];
const ord = (d) => d.split("/").reverse().join("");
const eleicoes = TURNOS.map((t) => {
  const d = var_.find((v) => ord(v.data) > ord(t));
  return { turno: t, ano: t.slice(6), data: d.data, de: d.de, para: d.para, pct: +d.pct.toFixed(4) };
});
const outras = eleicoes.filter((e) => e.data !== ALVO).map((e) => Math.abs(e.pct));
if (eleicoes.at(-1).data !== ALVO || Math.max(...outras) > 3) {
  throw new Error(`eleições não batem: ${JSON.stringify(eleicoes)}`);
}

// Boletim Focus (Banco Central) de 23/10/2026, câmbio no fim de 2026: mediana, menor e
// maior projeção entre 112 respostas. Não sai da série da PTAX; digitado da publicação.
const focus = { data: "23/10/2026", respostas: 112, min: 4.5, mediana: 5.05, max: 5.4 };
if (alvo.para <= focus.max) throw new Error("a PTAX de 26/10 devia ficar acima do maior palpite do Focus");

writeFileSync(SAIDA, JSON.stringify({
  fonte: "Banco Central do Brasil, PTAX de venda (SGS 1), 04/01/1999 a 27/10/2026",
  alvo: { data: ALVO, de: alvo.de, para: alvo.para, pct: +alvo.pct.toFixed(4) },
  dia27: var_.find((d) => d.data === "27/10/2026"),
  posicao, top5,
  media: +media.toFixed(5), dp: +dp.toFixed(5), z: +z.toFixed(3), p, anosEspera, vezesUniverso,
  extremos, esperadoNormal, limiteZ: LIMITE_Z, nRegime: x.length,
  bins, bin: BIN,
  sismografo: var_.map((d) => [d.data.slice(6), +d.pct.toFixed(3)]),
  ultimos: serie.slice(-12),
  eleicoes, focus,
}));
console.log(`26/10: +${alvo.pct.toFixed(2)}% (posição ${posicao}) · dp ${dp.toFixed(3)}% · z ${z.toFixed(2)} · 1 a cada ${anosEspera.toExponential(2)} anos (${vezesUniverso.toExponential(2)}× a idade do universo)`);
console.log(`1º pregão após o 2º turno: ${eleicoes.map((e) => `${e.ano} ${e.pct > 0 ? "+" : ""}${e.pct.toFixed(2)}%`).join(" · ")}`);
console.log(`dias acima de ${LIMITE_Z} dp: ${extremos} (normal esperaria ${esperadoNormal.toFixed(4)}) · ${bins.length} bins de ${min} a ${max}`);
