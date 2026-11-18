// Gera os dados do reel da Lei de Benford (ciencia/Benford) a partir dos Boletins de Urna
// do 2º turno de 2026: o primeiro dígito dos votos de cada candidato em cada seção do
// Brasil (reprova) e em cada município (passa). Mesmos votos, duas escalas.
//
//   node scripts/gerar-benford.mjs <pasta dados/ do reel da apuração> src/ciencia/benford.json
//
// O exterior (UF ZZ) fica de fora: as "cidades" do exterior não são municípios, e a
// legenda fala em seções do Brasil. O total com o exterior é conferido contra o oficial.
import { writeFileSync } from "node:fs";
import { lerSecoes, sorteador } from "./secoes.mjs";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-benford.mjs <dados/> <saída.json>");

const OFICIAL = { lula: 64256232, flavio: 59826041 };
const CAND = { lula: "13", flavio: "22" };

const secoes = lerSecoes(DADOS);
for (const [c, cod] of Object.entries(CAND)) {
  const soma = secoes.reduce((s, x) => s + (x.votos[cod] ?? 0), 0);
  if (soma !== OFICIAL[c]) throw new Error(`${c}: ${soma} votos, oficial ${OFICIAL[c]}`);
}
const brasil = secoes.filter((s) => s.uf !== "ZZ");

const porMun = new Map();
for (const s of brasil) {
  const k = `${s.uf}-${s.mun}`;
  const m = porMun.get(k) ?? { nome: s.nome, uf: s.uf, lula: 0, flavio: 0 };
  m.lula += s.votos[CAND.lula] ?? 0;
  m.flavio += s.votos[CAND.flavio] ?? 0;
  porMun.set(k, m);
}
const muns = [...porMun.values()];

const pct = (n, total) => +((100 * n) / total).toFixed(2);
/** % de cada primeiro dígito, 1 a 9. Zero não tem primeiro dígito e fica de fora. */
const digitos = (xs) => {
  const c = Array(9).fill(0);
  for (const x of xs) if (x > 0) c[+String(x)[0] - 1]++;
  const n = c.reduce((a, b) => a + b, 0);
  return c.map((k) => pct(k, n));
};
const benford = Array.from({ length: 9 }, (_, d) => +(100 * Math.log10(1 + 1 / (d + 1))).toFixed(2));

const PASSO = 10, BINS = 40; // histograma de 0 a 400 votos por seção
const hist = (xs) => {
  const c = Array(BINS).fill(0);
  for (const x of xs) if (x < PASSO * BINS) c[Math.floor(x / PASSO)]++;
  return c.map((k) => pct(k, xs.length));
};

// Faixa de pontos no eixo log: todas as cidades e uma amostra das seções (as 498 mil
// não cabem num quadro, e a amostra já mostra o amontoado).
const AMOSTRA = 1500;
const rnd = sorteador(2026);
const amostra = (xs) => Array.from({ length: AMOSTRA }, () => xs[Math.floor(rnd() * xs.length)]);
const log = (xs) => xs.filter((x) => x > 0).map((x) => +Math.log10(x).toFixed(3));

const saida = { fonte: "TSE, Boletim de Urna, 2º turno de 25/10/2026, Presidente", secoes: brasil.length, municipios: muns.length, benford, urna: {}, cidade: {}, hist: { passo: PASSO }, faixa1: {}, log: { urnas: {}, cidades: {} }, extremos: {} };
for (const c of Object.keys(CAND)) {
  const urna = brasil.map((s) => s.votos[CAND[c]] ?? 0);
  const cidade = muns.map((m) => m[c]);
  saida.urna[c] = digitos(urna);
  saida.cidade[c] = digitos(cidade);
  saida.hist[c] = hist(urna);
  saida.faixa1[c] = pct(urna.filter((x) => x >= 100 && x < 200).length, urna.length);
  saida.log.urnas[c] = log(amostra(urna));
  saida.log.cidades[c] = log(cidade);
  const ord = [...muns].sort((a, b) => a[c] - b[c]);
  saida.extremos[c] = { min: ord[0][c], minNome: `${ord[0].nome} (${ord[0].uf})`, max: ord.at(-1)[c], maxNome: `${ord.at(-1).nome} (${ord.at(-1).uf})` };
}

writeFileSync(SAIDA, `${JSON.stringify(saida)}\n`);
console.log(`${saida.secoes} seções, ${saida.municipios} municípios`);
for (const c of Object.keys(CAND)) console.log(`${c}: urna 1=${saida.urna[c][0]}% · cidade 1=${saida.cidade[c][0]}% · 100-199 ${saida.faixa1[c]}% · ${JSON.stringify(saida.extremos[c])}`);
