// Linha do tempo do reel do Roadster (ciencia/Roadster), em quadros a 30fps, a partir da
// duração de cada fala da narração. A composição e a trilha leem o mesmo arquivo.
//
//   node scripts/tempos-roadster.mjs <reel>/audio/duracoes.json src/ciencia/roadster-tempos.json
import { readFileSync, writeFileSync } from "node:fs";

const [ENTRADA, SAIDA] = process.argv.slice(2);
if (!ENTRADA || !SAIDA) throw new Error("uso: tempos-roadster.mjs <duracoes.json> <saída.json>");

const FPS = 30;
const PAUSA = 10;
const ORDEM = ["gancho", "bicos", "newton", "vazao", "tempo", "giro", "nuvem", "teto", "cta"];
// O pulinho do "só saltos" e a volta inteira do giro continuam depois que a fala acaba.
const MINIMO = { tempo: 180, giro: 260 };

const falas = JSON.parse(readFileSync(ENTRADA, "utf-8"));
const dur = Object.fromEntries(falas.map((b) => [b.id, Math.ceil(b.duracao * FPS)]));
for (const id of ORDEM) if (!dur[id]) throw new Error(`fala sem duração: ${id}`);

const fala = {};
let f = 8;
for (const id of ORDEM) {
  fala[id] = f;
  f += Math.max(dur[id], MINIMO[id] ?? 0) + PAUSA;
}

// Começo das frases dentro de cada fala (silencedetect, -35 dB, 0,18 s, no áudio da cedar).
// Se regravar a narração, medir de novo.
const S = {
  salto: 1.3, // "...esse carro SALTAR por cima de um caminhão"
  pergunta: 3.98, // "Quanto tempo ele aguentaria lá em cima?"
  dezBicos: 1.95, // "São dez bicos soltando ar comprimido"
  quilos: 4.98, // "250 quilos de ar"
  tanques: 7.16, // "guardados em dois tanques"
  som: 1.62, // "mais rápido que o som"
  empurra: 3.19, // "e empurra o carro pra cima"
  flutuar: 5.11, // "Pra flutuar, o empurrão tem que igualar o peso"
  vazao: 3.12, // "isso gasta mais de 30 quilos de ar por segundo"
  quarto: 6.7, // "Um quarto cheio"
  cadaSegundo: 8.26, // "a cada segundo"
  sete: 2.4, // "...em uns SETE segundos"
  saltos: 3.42, // "Por isso, só saltos"
  cantos: 1.17, // "bicos em cantos opostos sopram em sentidos contrários"
  roda: 4.75, // "e o carro roda no ar"
  fumaca: 1.67, // "não é fumaça"
  gelado: 3.28, // "O ar sai tão gelado"
  condensa: 4.12, // "que condensa a umidade em volta"
  ventoinhas: 2.28, // "ventoinhas tiram ar de baixo do carro"
  pressao: 5.12, // "Uns 3% a menos de pressão"
  segura: 7.6, // "e o ar de fora segura o carro"
};
const em = (id, s) => fala[id] + Math.round(s * FPS);

const T = {
  fala,
  salto: em("gancho", S.salto),
  pergunta: em("gancho", S.pergunta),
  dezBicos: em("bicos", S.dezBicos),
  quilos: em("bicos", S.quilos),
  tanques: em("bicos", S.tanques),
  som: em("newton", S.som),
  empurra: em("newton", S.empurra),
  flutuar: em("newton", S.flutuar),
  vazao: em("vazao", S.vazao),
  quarto: em("vazao", S.quarto),
  cadaSegundo: em("vazao", S.cadaSegundo),
  sete: em("tempo", S.sete),
  saltos: em("tempo", S.saltos),
  cantos: em("giro", S.cantos),
  roda: em("giro", S.roda),
  fumaca: em("nuvem", S.fumaca),
  gelado: em("nuvem", S.gelado),
  condensa: em("nuvem", S.condensa),
  ventoinhas: em("teto", S.ventoinhas),
  pressao: em("teto", S.pressao),
  segura: em("teto", S.segura),
  cta: fala.cta,
  marca: fala.cta + dur.cta + 15,
};
T.total = T.marca + 75;

writeFileSync(SAIDA, `${JSON.stringify(T, null, 2)}\n`);
console.log(`${T.total} quadros (${(T.total / FPS).toFixed(1)}s)`);
