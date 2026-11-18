// Dados do reel "Ele disse. Os dados mostram." (ciencia/ChecagemFala). Lê a conta feita sobre os boletins de
// urna dos dois turnos (dados/checagem.json, saída do scripts/eleicoes/checagem_fala.py, rodado com python3 -I),
// confere cada número que a narração e a tela dizem, e grava o que a composição usa.
//
//   cd reels && node scripts/gerar-checagem-fala.mjs ../<pasta>/dados src/ciencia/checagem-fala.json
//
// Para no primeiro número que não bater. A lista de conferências vai pra <pasta>/dados/conferencia.txt.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-checagem-fala.mjs <pasta dados> <saída.json>");
const R = JSON.parse(readFileSync(join(DADOS, "checagem.json"), "utf-8"));
const B = R.brasil;
const log = [];
const confere = (ok, msg) => { if (!ok) throw new Error(`não bate: ${msg}`); log.push(`ok  ${msg}`); console.log(`ok  ${msg}`); };
const mi = (n, c = 1) => Math.round(n / 10 ** (6 - c)) / 10 ** c;

// Totais oficiais (os mesmos do reel origem-votos e da nota do radar).
confere(B.lula1 === 53879538 && B.lula2 === 64256232, "Lula 53.879.538 → 64.256.232");
confere(B.flavio1 === 56104503 && B.flavio2 === 59826041, "Flávio 56.104.503 → 59.826.041");
confere(B.dLula === 10376694, "Lula ganhou 10.376.694");
confere(B.dFlavio === 3721538, "Flávio ganhou 3.721.538");
// Ponto 1: ">11 milhões"
confere(B.dLula < 11e6, `">11 milhões" não bate: ${B.dLula}`);
confere(mi(B.dLula) === 10.4, `"foram 10,4 milhões" (${B.dLula})`);
// Ponto 2: todos os estados
confere(R.estados === 27 && R.lulaCresceuEm === 27, `"o Lula cresceu nos 27" (${R.lulaCresceuEm} de ${R.estados})`);
confere(R.flavioCresceuEm === 21, `"o Flávio também, em 21" (${R.flavioCresceuEm}; não cresceu em ${R.flavioNaoCresceu})`);
// Ponto 3: abstenção
confere(B.dComp === 2960239, "comparecimento a mais: 2.960.239");
confere(Math.round(B.dComp / 1e6) === 3, `"só 3 milhões a mais foram votar" (${B.dComp})`);
confere(B.dComp < B.dLula / 3, "o comparecimento a mais é menos de 1/3 do ganho do Lula");
confere(B.abst1.toFixed(2) === "21.08" && B.abst2.toFixed(2) === "19.22", `abstenção 21,08% → 19,22% (${B.abst1}, ${B.abst2})`);
// Ponto 4: eliminados e a soma
confere(B.eliminados === 9321993, "votos dos eliminados: 9.321.993");
confere(mi(B.eliminados) === 9.3, `"os eliminados tinham 9,3 milhões"`);
confere(B.eliminados < B.dLula, `"menos que o ganho do Lula" (${B.eliminados} < ${B.dLula})`);
confere(B.dBN === 1816000, "branco e nulo a menos: 1.816.000");
confere(mi(B.dBN) === 1.8, `"1,8 milhão a menos de branco e nulo"`);
confere(B.fontes === 14098232, "votos em jogo: 14.098.232");
confere(mi(B.fontes) === 14.1, `"14,1 milhões em jogo"`);
confere(B.outros2T === 0 && B.dLula + B.dFlavio === B.fontes, "fecha voto a voto: 10.376.694 + 3.721.538 = 14.098.232");
confere(Math.round(B.lulaPctFontes) === 74 && Math.round(100 - B.lulaPctFontes) === 26, `"Lula levou 74%, Flávio 26" (${B.lulaPctFontes.toFixed(2)}%)`);
confere(B.dComp < B.dLula && B.dBN < B.dLula && B.eliminados < B.dLula, `"sozinha, nenhuma fonte explica"`);

// Mapa: as 27 UFs.
const ufs = Object.entries(R.ufs).filter(([u]) => u !== "ZZ").map(([u, p]) => ({ uf: u, dL: p.dLula, dF: p.dFlavio }));
confere(ufs.length === 27, "27 UFs no mapa");
confere(ufs.filter((u) => u.dL > 0).length === 27 && ufs.filter((u) => u.dF > 0).length === 21, "o mapa mostra 27 e 21");

writeFileSync(join(DADOS, "conferencia.txt"), `${log.join("\n")}\n`);
const out = {
  lula1: B.lula1, lula2: B.lula2, flavio1: B.flavio1, flavio2: B.flavio2,
  dLula: B.dLula, dFlavio: B.dFlavio, dComp: B.dComp, dBN: B.dBN, eliminados: B.eliminados, fontes: B.fontes,
  abst1: B.abst1, abst2: B.abst2, lulaPct: B.lulaPctFontes,
  ufs, flavioNaoCresceu: R.flavioNaoCresceu,
};
writeFileSync(SAIDA, `${JSON.stringify(out, null, 1)}\n`);
console.log(`gravado ${SAIDA}`);
