// Linha do tempo do reel do fogo no Ceará (ciencia/FogoCeara), em quadros a 30fps, a
// partir da duração de cada fala da narração. A composição e a trilha leem o mesmo
// arquivo: mudou a narração, roda isto de novo e as duas acompanham.
//
//   node scripts/tempos-fogo-ceara.mjs <reel>/audio/duracoes.json src/ciencia/fogo-ceara-tempos.json
import { readFileSync, writeFileSync } from "node:fs";

const [ENTRADA, SAIDA] = process.argv.slice(2);
if (!ENTRADA || !SAIDA) throw new Error("uso: tempos-fogo-ceara.mjs <duracoes.json> <saída.json>");

const FPS = 30;
const PAUSA = 10; // respiro entre uma fala e a próxima
const ORDEM = [
  "gancho", "foco", "relogio", "seca", "hoje", "nov-dez", "mapa23", "sertao", "tendencia", "fecho", "cta",
];
// Quadros que a animação precisa, mesmo que a fala acabe antes: o sol e a nuvem se
// desenham, o ponteiro anda de hoje a 31/dez, os 23 anos acumulam no mapa sem pressa,
// o calendário se monta.
const MINIMO = { seca: 170, "nov-dez": 150, mapa23: 200, fecho: 100 };

const falas = JSON.parse(readFileSync(ENTRADA, "utf-8"));
const dur = Object.fromEntries(falas.map((b) => [b.id, Math.ceil(b.duracao * FPS)]));
for (const id of ORDEM) if (!dur[id]) throw new Error(`fala sem duração: ${id}`);

const fala = {};
let f = 8; // o quadro 0 é a capa: a voz entra logo depois
for (const id of ORDEM) {
  fala[id] = f;
  f += Math.max(dur[id], MINIMO[id] ?? 0) + PAUSA;
}

// Instantes dentro das falas em que a imagem tem que bater com a palavra. Medido no
// áudio da cedar com silencedetect (pausas entre as frases): se regravar a narração,
// medir de novo.
const S = {
  pct86: 4.2, // "...de 2003 a 2025, | 86%"
  chuva: 2.0, // "É o fim da estação seca, | antes da quadra chuvosa"
  fevMai: 3.7, // "..., | que vai de fevereiro a maio"
  hojeChega: 1.6, // "Hoje é 28 de outubro." termina
  pct72: 3.0, // "Em média, | 72%"
  pct67: 2.4, // "Só novembro e dezembro concentram | dois em cada três"
  nomes: [2.9, 4.0, 4.9, 6.1, 6.6], // Boa Viagem, Crateús, Santa Quitéria, Granja, Quixeramobim
};
const em = (id, s) => fala[id] + Math.round(s * FPS);

const T = {
  fala, // quadro em que cada fala começa
  relogio: fala.relogio - 12, // cena do relógio entra um pouco antes da voz
  pct86: em("relogio", S.pct86),
  chuva: em("seca", S.chuva),
  fevMai: em("seca", S.fevMai),
  hojeChega: em("hoje", S.hojeChega),
  pct72: em("hoje", S.pct72),
  pct67: em("nov-dez", S.pct67),
  mapa23: fala.mapa23 - 12,
  nomes: S.nomes.map((s) => em("sertao", s)),
  tendencia: fala.tendencia - 12,
  fecho: fala.fecho - 12,
  cta: fala.cta,
  marca: fala.cta + dur.cta + 15,
};
T.total = T.marca + 75;

writeFileSync(SAIDA, `${JSON.stringify(T, null, 2)}\n`);
console.log(`${T.total} quadros (${(T.total / FPS).toFixed(1)}s)`);
