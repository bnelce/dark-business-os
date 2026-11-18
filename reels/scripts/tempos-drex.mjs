// Linha do tempo do reel do D-rex (ciencia/DRex), em quadros a 30fps, a partir da duração
// de cada fala da narração. A composição e a trilha leem o mesmo arquivo: mudou a
// narração, roda isto de novo e as duas acompanham.
//
//   node scripts/tempos-drex.mjs <reel>/audio/duracoes.json src/ciencia/drex-tempos.json
import { readFileSync, writeFileSync } from "node:fs";

const [ENTRADA, SAIDA] = process.argv.slice(2);
if (!ENTRADA || !SAIDA) throw new Error("uso: tempos-drex.mjs <duracoes.json> <saída.json>");

const FPS = 30;
const PAUSA = 10; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "asteroide", "ramo", "altura", "carvalho", "porque", "grupo", "cta"];
// Quadros que a animação precisa, mesmo que a fala acabe antes: o carvalho e os três
// ícones do fecho se desenham traço a traço e não podem ser cortados no meio; e os esporos
// do D-rex precisam de uns 3,5 s depois de "o vento leva" pra atravessar a tela.
const MINIMO = { carvalho: 170, porque: 340, grupo: 170 };

const falas = JSON.parse(readFileSync(ENTRADA, "utf-8"));
const dur = Object.fromEntries(falas.map((b) => [b.id, Math.ceil(b.duracao * FPS)]));
for (const id of ORDEM) if (!dur[id]) throw new Error(`fala sem duração: ${id}`);

const fala = {};
let f = 8; // o quadro 0 é a capa: a voz entra logo depois
for (const id of ORDEM) {
  fala[id] = f;
  f += Math.max(dur[id], MINIMO[id] ?? 0) + PAUSA;
}

// Instantes dentro de cada fala em que a imagem tem que bater com a palavra. Medidos no
// áudio da cedar com silencedetect (pausas entre as frases): se regravar, medir de novo.
const S = {
  impacto: 3.6, // "um asteroide ACABOU com os dinossauros"
  separa: 2.4, // "a família desse fungo SURGIU"
  recorde: 6.0, // "Os recordistas anteriores…" (segunda frase da fala altura)
  esporosBaixo: 4.1, // "de uma estrutura baixa, os esporos caem no mato"
  esporosAlto: 7.9, // "De uma alta, o vento leva"
};
const em = (id, s) => fala[id] + Math.round(s * FPS);

const T = {
  fala, // quadro em que cada fala começa
  impacto: em("asteroide", S.impacto),
  separa: em("ramo", S.separa),
  escala: fala.altura - 8, // a régua entra um pouco antes da voz
  recorde: em("altura", S.recorde),
  carvalho: fala.carvalho - 8,
  porque: fala.porque - 8,
  esporosBaixo: em("porque", S.esporosBaixo),
  esporosAlto: em("porque", S.esporosAlto),
  grupo: fala.grupo - 8,
  cta: fala.cta,
  marca: fala.cta + dur.cta + 15,
};
T.total = T.marca + 75;

writeFileSync(SAIDA, `${JSON.stringify(T, null, 2)}\n`);
console.log(`${T.total} quadros (${(T.total / FPS).toFixed(1)}s) · impacto em ${T.impacto}, separação em ${T.separa}`);
