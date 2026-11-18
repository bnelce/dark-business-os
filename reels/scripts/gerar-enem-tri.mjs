// Dados do reel "Mesmos acertos, notas diferentes" (ciencia/EnemTri). Lê a conta feita sobre os
// microdados do ENEM 2025 (dados/resultado-tri-mt.json, saída reduzida do dados/tri_mt.py), confere cada
// número que a narração e a tela dizem, e grava o que a composição usa.
//
//   cd reels && node scripts/gerar-enem-tri.mjs ../<pasta>/dados src/ciencia/enem-tri.json
//
// Para no primeiro número que não bater.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-enem-tri.mjs <pasta dados> <saída.json>");
const R = JSON.parse(readFileSync(join(DADOS, "resultado-tri-mt.json"), "utf-8"));

const confere = (ok, msg) => { if (!ok) throw new Error(`não bate: ${msg}`); console.log(`ok  ${msg}`); };

const base = R.tabelas.so_provas_com_itens["10"];
const baixa = R.candidato_nota_baixa, alta = R.candidato_nota_alta;
const itens = R.prova_exemplo.itens_validos_por_dificuldade;
const ordBaixa = baixa.acertos.map((a) => a.ordem_dificuldade).sort((a, b) => a - b);
const ordAlta = alta.acertos.map((a) => a.ordem_dificuldade).sort((a, b) => a - b);

confere(R.presentes_mt === 3260336, "3.260.336 presentes em Matemática");
confere(itens.length === 43 && R.prova_exemplo.anulados_posicao.length === 2, "43 questões válidas (45 menos 2 anuladas)");
confere(baixa.acertos.length === 10 && alta.acertos.length === 10, "os dois têm 10 acertos válidos");
confere(Math.round(baixa.nota) === 319, `"um tirou 319" (${baixa.nota})`);
confere(alta.nota < 570 && alta.nota >= 569.5, `"quase 570" (${alta.nota})`);
confere([1, 2, 3, 4, 5].every((k) => ordAlta.includes(k)), `"quem tirou quase 570 acertou as cinco mais fáceis" (${ordAlta})`);
confere(ordBaixa[0] === 22, `"quem tirou 319 errou as 21 mais fáceis": o acerto mais fácil dele é a ${ordBaixa[0]}ª`);
confere(ordBaixa.every((k) => k > 21), "todos os acertos de quem tirou 319 estão acima da 21ª (metade difícil: 22ª a 43ª)");
confere(Math.round(base.n / 1000) === 268, `"268 mil pessoas" com 10 acertos (${base.n})`);
confere(Math.round(base.max - base.min) === 250, `"variou 250 pontos" (${base.min} a ${base.max})`);
confere(base.min <= baixa.nota && base.max === alta.nota, "a dupla do exemplo está dentro (e no topo) da faixa geral");
const h = R.hist_10_acertos_so_provas_com_itens;
confere(Object.values(h).reduce((a, b) => a + b, 0) === base.n, "o histograma soma as 267.971 pessoas");

const out = {
  notaBaixa: baixa.nota,
  notaAlta: alta.nota,
  ordBaixa,
  ordAlta,
  nItens: itens.length,
  pessoas10: base.n,
  min10: base.min,
  max10: base.max,
  p5: base.p5,
  p95: base.p95,
  hist: Object.entries(h).map(([de, n]) => ({ de: Number(de), n })),
};
writeFileSync(SAIDA, `${JSON.stringify(out, null, 1)}\n`);
console.log(`gravado ${SAIDA}`);
