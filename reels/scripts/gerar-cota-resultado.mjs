// Dados do reel "Cota × resultado" (ciencia/CotaResultado). Lê a conta feita sobre os dados abertos do TSE e o
// Censo 2022 (resultado.json, saída do scripts/eleicoes/cota_resultado.py), confere cada número que a narração
// e a tela dizem, e grava o que a composição usa.
//
//   cd reels && node scripts/gerar-cota-resultado.mjs ../<pasta>/resultado.json src/ciencia/cota-resultado.json
//
// Para no primeiro número que não bater.
import { readFileSync, writeFileSync } from "node:fs";

const [ENTRADA, SAIDA] = process.argv.slice(2);
if (!ENTRADA || !SAIDA) throw new Error("uso: gerar-cota-resultado.mjs <resultado.json> <saída.json>");
const R = JSON.parse(readFileSync(ENTRADA, "utf-8"));
const G = R.geral, P = R.pop, Md = R.medias;

const confere = (ok, msg) => { if (!ok) throw new Error(`não bate: ${msg}`); console.log(`ok  ${msg}`); };
const r0 = (x) => Math.round(x);

confere(G.eleitos === 513, "513 eleitos");
confere(r0(P.pct_negras) === 56, `"pessoas negras são 56% do Brasil" (${P.pct_negras.toFixed(2)}%)`);
confere(r0(G.pct_el_negros) === 26, `"na nova Câmara, 26%" (${G.el_negros} de 513 = ${G.pct_el_negros}%)`);
confere(r0(P.pct_mulheres) === 51, `"mulheres: 51% do país" (${P.pct_mulheres.toFixed(2)}%)`);
confere(G.el_mulheres === 109, `"109 cadeiras" (${G.el_mulheres})`);
confere(r0(G.pct_el_mulheres) === 21, `"21%" (${G.pct_el_mulheres}%)`);
confere(r0(G.pct_cand_mulheres) === 37, `"mulheres: 37% das candidaturas" (${G.pct_cand_mulheres}%)`);
confere(r0(G.pct_fefc_mulheres) === 35, `"35% do fundo eleitoral" (${G.pct_fefc_mulheres}%)`);
confere(r0(G.pct_cand_negros) === 46, `"pessoas negras: 46% das candidaturas" (${G.pct_cand_negros}%)`);
confere(r0(G.pct_fefc_negros) === 37, `"37% do fundo" (${G.pct_fefc_negros}%)`);
const mn = Md.mulheres_negras, hb = Md.homens_brancos;
confere(r0(mn.n / mn.eleitos) === 40, `"de cada 40 candidatas negras, uma se elegeu" (${mn.eleitos} de ${mn.n})`);
confere(r0(hb.n / hb.eleitos) === 8, `"homens brancos, um em cada oito" (${hb.eleitos} de ${hb.n})`);

// Ficha nacional (todos os cargos, FEFC contado no partido que repassou). Mulheres: só partidos com candidata e
// com FEFC. Negros: partidos com FEFC.
const F = R.ficha_nacional_todos_cargos;
const comM = Object.entries(F).filter(([, r]) => r.fefc > 0 && r.pct_cand_m > 0);
const comN = Object.entries(F).filter(([, r]) => r.fefc > 0);
const abaixoM = comM.filter(([, r]) => !r.m_ok).map(([p]) => p);
const abaixoN = comN.filter(([, r]) => !r.n_30_ok).map(([p]) => p);
confere(abaixoM.length > comM.length / 2, `"mais da metade dos partidos ficou abaixo dessa proporção" (${abaixoM.length} de ${comM.length})`);
confere(abaixoN.length === 7, `"7 deram menos de 30% a pessoas negras" (${abaixoN.length} de ${comN.length}: ${abaixoN})`);
const dep = Object.values(R.partidos);
confere(dep.every((r) => r.pct_reg_mulheres >= 30), `todos os ${dep.length} partidos com 30% ou mais de candidatas a deputada federal no país`);

const partidos = Object.entries(F)
  .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
  .map(([p, r]) => ({
    p, cand: r.cand, cm: r.pct_cand_m, fm: r.pct_fefc_m, fn: r.pct_fefc_n, fefc: r.fefc,
    mOk: r.fefc > 0 && r.pct_cand_m > 0 ? r.m_ok : null, nOk: r.fefc > 0 ? r.n_30_ok : null,
  }));

const out = {
  pop: { m: P.pct_mulheres, n: P.pct_negras },
  // percentuais refeitos a partir das contagens (o resultado.json guarda 2 casas, e 21,25 viraria "21,3")
  m: { cand: (100 * G.cand_mulheres) / G.candidatos, fefc: (100 * G.fefc_mulheres) / G.fefc, el: (100 * G.el_mulheres) / G.eleitos, nEl: G.el_mulheres, reais: G.fefc_mulheres },
  n: { cand: (100 * G.cand_negros) / G.candidatos, fefc: (100 * G.fefc_negros) / G.fefc, el: (100 * G.el_negros) / G.eleitos, nEl: G.el_negros, reais: G.fefc_negros },
  fefcTotal: G.fefc,
  candidatos: G.candidatos,
  mn: { n: mn.n, el: mn.eleitos }, hb: { n: hb.n, el: hb.eleitos },
  // os 513 assentos: quantos de cada grupo (para o hemiciclo)
  assentos: { negros: G.el_negros, mulheres: G.el_mulheres },
  partidos,
  abaixoM: abaixoM.length, totalM: comM.length, abaixoN: abaixoN.length, totalN: comN.length,
};
writeFileSync(SAIDA, `${JSON.stringify(out, null, 1)}\n`);
console.log(`gravado ${SAIDA}`);
