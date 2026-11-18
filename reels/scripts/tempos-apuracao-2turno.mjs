// Linha do tempo do reel da apuração do 2º turno (ciencia/Apuracao2Turno), em quadros a
// 30fps, a partir da duração de cada fala da narração. A composição e a trilha leem o
// mesmo arquivo: mudou a narração, roda isto de novo e as duas acompanham.
//
//   node scripts/tempos-apuracao-2turno.mjs <reel>/audio/duracoes.json src/ciencia/apuracao-2turno-tempos.json
import { readFileSync, writeFileSync } from "node:fs";

const [ENTRADA, SAIDA] = process.argv.slice(2);
if (!ENTRADA || !SAIDA) throw new Error("uso: tempos-apuracao-2turno.mjs <duracoes.json> <saída.json>");

const FPS = 30;
const PAUSA = 10; // respiro entre uma fala e a próxima
const ORDEM = [
  "gancho", "virada-1", "virada-2", "final", "mapa-cedo", "mapa-tarde", "sorteio",
  "sorteadas", "amostras", "amostras-resposta", "conclusao", "cta",
];
// Quadros que a animação precisa, mesmo que a fala acabe antes.
const MINIMO = { final: 150, sorteio: 110, sorteadas: 180 };

const falas = JSON.parse(readFileSync(ENTRADA, "utf-8"));
const dur = Object.fromEntries(falas.map((b) => [b.id, Math.ceil(b.duracao * FPS)]));
for (const id of ORDEM) if (!dur[id]) throw new Error(`fala sem duração: ${id}`);

const fala = {};
let f = 8; // o quadro 0 é a capa: a voz entra logo depois
for (const id of ORDEM) {
  fala[id] = f;
  f += Math.max(dur[id], MINIMO[id] ?? 0) + PAUSA;
}

// As linhas se cruzam quando a voz diz "Flávio passou" e "virou de novo". Medido no
// áudio da cedar com silencedetect: se regravar a narração, medir de novo.
const VIRADA_1 = 6.3, VIRADA_2 = 4.3; // segundos depois do início da fala

const T = {
  fala, // quadro em que cada fala começa
  virada1: fala["virada-1"] + Math.round(VIRADA_1 * FPS),
  virada2: fala["virada-2"] + Math.round(VIRADA_2 * FPS),
  fimReal: fala.final - 10, // linha real chega a 100%
  mapa: fala["mapa-cedo"] - 20,
  fimMapa: fala.sorteio - 10, // último quadro com os pontos acendendo
  sorteio: fala.sorteio,
  sorteadas: fala.sorteadas,
  amostras: fala.amostras,
  conclusao: fala.conclusao,
  cta: fala.cta,
  marca: fala.cta + dur.cta + 15,
};
T.total = T.marca + 75;

writeFileSync(SAIDA, `${JSON.stringify(T, null, 2)}\n`);
console.log(`${T.total} quadros (${(T.total / FPS).toFixed(1)}s) · viradas em ${T.virada1} e ${T.virada2}`);
