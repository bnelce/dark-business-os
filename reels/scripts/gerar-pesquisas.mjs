// Gera os dados do reel "as pesquisas erraram?" (ciencia/Pesquisas) a partir dos Boletins de
// Urna do 2º turno de 2026: o resultado real e mil pesquisas simuladas, cada uma com 4.050
// eleitores sorteados dos votos válidos de verdade (o tamanho do Datafolha da véspera).
//
//   node scripts/gerar-pesquisas.mjs <pasta dados/ do reel da apuração> src/ciencia/pesquisas.json
//
// Sortear um eleitor entre os 124 milhões de votos válidos e ver em quem ele votou é um sorteio
// com probabilidade igual à fatia real de cada candidato: é isso que o laço faz. Semente fixa,
// pra o vídeo e a legenda saírem iguais a cada geração.
//
// Os números das pesquisas não estão nos boletins e são digitados aqui, com a fonte:
// - Datafolha, 23 e 24/10/2026, 4.050 entrevistas, margem de 2 pontos: Flávio 51%, Lula 49% dos
//   válidos (Estado de Minas, "Quaest confirma Datafolha: Flávio tem 51% e Lula, 49%")
// - Quaest, 24/10/2026: Flávio 51%, Lula 49% (mesma matéria; Revista Oeste)
// - Datafolha, 30/09 e 01/10/2022, 12.800 entrevistas, margem de 2 pontos: Bolsonaro 36% dos
//   válidos; resultado do 1º turno de 2022, 43,20% (Metrópoles; TSE)
import { writeFileSync } from "node:fs";
import { lerSecoes, sorteador } from "./secoes.mjs";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-pesquisas.mjs <dados/> <saída.json>");

const OFICIAL = { lula: 64256232, flavio: 59826041 };
let lula = 0, flavio = 0;
for (const s of lerSecoes(DADOS)) { lula += s.votos["13"] ?? 0; flavio += s.votos["22"] ?? 0; }
if (lula !== OFICIAL.lula || flavio !== OFICIAL.flavio) throw new Error(`totais não batem com o oficial: ${lula} × ${flavio}`);
const validos = lula + flavio;

const N = 4050, SORTEIOS = 1000;
const rnd = sorteador(2026);
const sorteios = Array.from({ length: SORTEIOS }, () => {
  let l = 0;
  for (let i = 0; i < N; i++) if (Math.floor(rnd() * validos) < lula) l++;
  return +((100 * l) / N).toFixed(2);
});

const real = +((100 * lula) / validos).toFixed(2);
const resumo = {
  foraDe2: sorteios.filter((v) => Math.abs(v - real) > 2).length,
  flavioNaFrente: sorteios.filter((v) => v < 50).length,
  ate49: sorteios.filter((v) => v <= 49).length,
  min: Math.min(...sorteios), max: Math.max(...sorteios),
};

const saida = {
  fonte: "TSE, Boletim de Urna, 2º turno de 25/10/2026, Presidente",
  validos, final: { lula: real, flavio: +(100 - real).toFixed(2) },
  n: N, sorteios, resumo,
  vespera: { lula: 49, flavio: 51, margem: 2, institutos: "Datafolha e Quaest", campo: "23 e 24/10/2026" },
  em2022: { candidato: "Bolsonaro", pesquisa: 36, resultado: 43.2, n: 12800, data: "01/10/2022" },
};
writeFileSync(SAIDA, `${JSON.stringify(saida)}\n`);
console.log(`real ${real}% · ${JSON.stringify(resumo)}`);
