// Linha do tempo de um reel narrado, em quadros a 30fps, a partir da duração de cada fala
// (audio/duracoes.json, saída do scripts/reels/narrar.js). A composição e a trilha leem o
// mesmo arquivo: mudou a narração, roda isto de novo e as duas acompanham.
//
//   node scripts/tempos-narracao.mjs <reel>/audio/duracoes.json src/ciencia/<reel>-tempos.json [id=quadros ...]
//
// Cada `id=quadros` reserva um mínimo de quadros praquela fala, pra animação que precisa
// de mais tempo do que a voz leva. A ordem das falas é a do duracoes.json (a do roteiro):
// a fala k toca audio/beat-<k>.mp3.
import { readFileSync, writeFileSync } from "node:fs";

const [ENTRADA, SAIDA, ...MINIMOS] = process.argv.slice(2);
if (!ENTRADA || !SAIDA) throw new Error("uso: tempos-narracao.mjs <duracoes.json> <saída.json> [id=quadros ...]");

const FPS = 30;
const PAUSA = 10; // respiro entre uma fala e a próxima
const falas = JSON.parse(readFileSync(ENTRADA, "utf-8"));
// Id que parece número ("2022") vai pra frente das outras chaves num objeto JS, e a composição
// casa a fala k com o beat-k pela ordem de T.fala: a narração sairia trocada sem erro nenhum.
for (const { id } of falas) if (/^\d+$/.test(id)) throw new Error(`id de fala não pode ser só número: "${id}" (use "em-${id}")`);
const MINIMO = Object.fromEntries(MINIMOS.map((m) => { const [id, q] = m.split("="); return [id, +q]; }));
for (const id of Object.keys(MINIMO)) if (!falas.some((b) => b.id === id)) throw new Error(`mínimo pra fala que não existe: ${id}`);

const fala = {}, fim = {};
let f = 8; // o quadro 0 é a capa: a voz entra logo depois
for (const { id, duracao } of falas) {
  const q = Math.ceil(duracao * FPS);
  fala[id] = f;
  fim[id] = f + q; // fim da voz
  f += Math.max(q, MINIMO[id] ?? 0) + PAUSA;
}
const ultima = falas.at(-1).id;
const T = { fala, fim, marca: fim[ultima] + 15 };
T.total = T.marca + 75;

writeFileSync(SAIDA, `${JSON.stringify(T, null, 2)}\n`);
console.log(`${T.total} quadros (${(T.total / FPS).toFixed(1)}s)`);
