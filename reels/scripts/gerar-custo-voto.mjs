// Dados do reel "Quanto custou cada voto" (ciencia/CustoVoto). Lê a conta feita sobre os dados abertos do
// TSE (<pasta>/conta/custo-voto.json, saída do scripts/custo-voto.py), confere cada número que a narração e a
// tela dizem, e grava o que a composição usa.
//
//   cd reels && node scripts/gerar-custo-voto.mjs ../<pasta>/conta/custo-voto.json src/ciencia/custo-voto.json
//
// Para no primeiro número que não bater.
import { readFileSync, writeFileSync } from "node:fs";

const [ENTRADA, SAIDA] = process.argv.slice(2);
if (!ENTRADA || !SAIDA) throw new Error("uso: gerar-custo-voto.mjs <custo-voto.json da conta> <saída.json>");
const R = JSON.parse(readFileSync(ENTRADA, "utf-8"));
const confere = (ok, msg) => { if (!ok) throw new Error(`não bate: ${msg}`); console.log(`ok  ${msg}`); };

const E = R.eleitos, N = R.naoEleitos;
const L = R.eleitosOrdenados; // do mais barato ao mais caro (gasto ÷ votos)
const barato = L[0], caro = L.at(-1);

confere(E.n === 513 && E.nComGastoEVoto === 513, `513 eleitos, todos com gasto e voto (${E.n}, ${E.nComGastoEVoto})`);
confere(R.conferenciaJson.eleitosJson === 513 && R.conferenciaJson.eleitosIguais === 513, "os 513 eleitos batem com o resultado oficial por UF");
confere(R.conferenciaJson.nDifVotos === 0, `votos válidos iguais ao resultado oficial por UF (${R.conferenciaJson.nDifVotos} diferenças; só do JSON: ${R.conferenciaJson.ufsSoNoJson})`);
confere(R.tiposPrestacaoEleitos.FINAL === 513, "os 513 eleitos entregaram a prestação final");
confere(Math.round(barato.cpv * 100) === 25, `"25 centavos por voto" (${barato.nome}: ${barato.cpv})`);
confere(Math.round(caro.cpv) === 170, `"170 reais" (${caro.nome}: ${caro.cpv})`);
confere(Math.round(E.pctPublicoPago) === 88, `"de cada 100 reais que os eleitos pagaram, 88 eram dinheiro público" (${E.pctPublicoPago}%)`);
confere(Math.round(E.mediana) === 22, `"o voto típico custou 22 reais" (mediana ${E.mediana})`);
const abaixo = L.filter((c) => c.cpv < E.mediana).length, acima = L.filter((c) => c.cpv > E.mediana).length;
confere(abaixo === 256 && acima === 256, `"metade gastou menos, metade mais" (${abaixo} abaixo, ${acima} acima, 1 na mediana)`);

const P = Object.entries(R.partidos).map(([sg, v]) => ({
  sg, n: v.todos.n, nEleitos: v.eleitos.n, votos: v.todos.votos, gasto: v.todos.gasto,
  cpv: v.todos.custoAgregado ?? 0, pub: v.todos.pctPublicoPago ?? null,
})).sort((a, b) => a.cpv - b.cpv || a.sg.localeCompare(b.sg));
confere(P.length === 28, `"os 28 partidos" (${P.length})`);
confere(P[0].cpv === 0 && P[0].gasto === 0, `"de zero": ${P[0].sg} não declarou despesa contratada`);
confere(Math.round(P.at(-1).cpv) === 70, `"a 70 reais por voto" (${P.at(-1).sg}: ${P.at(-1).cpv})`);
confere(Math.round(N.gasto / 1e8) === 22, `"gastou 2,2 bilhões" (${N.gasto})`);
confere(Math.round(N.mediana) === 65, `"o voto típico custou 65 reais" (mediana dos não eleitos ${N.mediana})`);
confere(Math.round(N.mediana / E.mediana) === 3, `"três vezes o dos eleitos" (${(N.mediana / E.mediana).toFixed(2)})`);

const pessoa = (c, foto) => ({ nome: c.nome, partido: c.partido, uf: c.uf, cpv: c.cpv, gasto: c.gasto, votos: c.votos, foto });
const out = {
  barato: pessoa(barato, "ciencia/custo-voto/fotos/polese.jpg"),
  caro: pessoa(caro, "ciencia/custo-voto/fotos/stelio.jpg"),
  nEleitos: E.n,
  mediana: E.mediana, p25: E.p25, p75: E.p75,
  dist: L.map((c) => +c.cpv.toFixed(3)),
  gastoEleitos: E.gasto, pagoEleitos: E.pago, pagoPublicoEleitos: E.pagoPublico, pctPublico: E.pctPublicoPago,
  partidos: P,
  fora: { n: N.n, nComGastoEVoto: N.nComGastoEVoto, semGasto: N.semGasto, gasto: N.gasto, mediana: N.mediana, pctPublico: N.pctPublicoPago },
  carga: R.geracao,
};
confere(out.barato.nome === "LUCAS POLESE" && out.caro.nome === "DEFENSOR STÉLIO DENER", "as fotos são dos dois extremos");
writeFileSync(SAIDA, `${JSON.stringify(out, null, 1)}\n`);
console.log(`gravado ${SAIDA}`);
