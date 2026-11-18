// Linha do tempo do reel do fogo no Pará (ciencia/Fogo), em quadros a 30fps, a partir da
// duração de cada fala da narração. A composição e a trilha (gerar-trilha-fogo.mjs) leem o
// mesmo arquivo: mudou a narração, roda isto de novo e as duas acompanham.
//
//   node scripts/tempos-fogo-para.mjs <reel>/audio/duracoes.json src/ciencia/fogo-para-tempos.json
import { readFileSync, writeFileSync } from "node:fs";

const [ENTRADA, SAIDA] = process.argv.slice(2);
if (!ENTRADA || !SAIDA) throw new Error("uso: tempos-fogo-para.mjs <duracoes.json> <saída.json>");

const FPS = 30;
const PAUSA = 10; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "satelite", "recorde", "foco", "madrugada", "tarde", "cidades", "fim", "cta"];
// Quadros que a animação precisa, mesmo que a fala acabe antes: depois de "o pico foi às
// 19 horas" o relógio ainda anda até a meia-noite; o mapa final segura um instante.
const MINIMO = { tarde: 280, fim: 100 };

const falas = JSON.parse(readFileSync(ENTRADA, "utf-8"));
const dur = Object.fromEntries(falas.map((b) => [b.id, Math.ceil(b.duracao * FPS)]));
for (const id of ORDEM) if (!dur[id]) throw new Error(`fala sem duração: ${id}`);

const fala = {};
let f = 8; // o quadro 0 é a capa: a voz entra logo depois
for (const id of ORDEM) {
  fala[id] = f;
  f += Math.max(dur[id], MINIMO[id] ?? 0) + PAUSA;
}

// Instantes dentro das falas, em segundos desde o início de cada uma. Medidos no áudio da
// cedar com silencedetect (as pausas entre as palavras-chave) e conferidos com o whisper-cli: se regravar a narração,
// medir de novo. Cada animação cai na palavra que fala dela.
const DENTRO = {
  gancho: { para: 2.4 }, // "…e o Pará já bateu o recorde"
  satelite: { nome: 1.4, varre: 2.7 }, // "GOES-19" / "um satélite parado…"
  recorde: { aqua: 2.3, atual: 5.1, anterior: 7.6 }, // "o satélite de referência" / "onze mil…" / "o recorde anterior"
  foco: { fogo: 3.1, pixels: 4.3, mesmo: 7.5 }, // "um fogo grande" / "pode acender vários" / "a série compara sempre o mesmo"
  madrugada: { madrugada: 4.7 }, // "de madrugada"
  tarde: { volta: 1.2, pico: 6.7 }, // "e volta no fim da tarde" / "o pico foi às 19 horas"
  cidades: { nomes: [5.45, 6.47, 8.13, 9.17, 9.7] }, // Uruará, São Félix do Xingu, Altamira, Portel, Santarém
};
const q = (id, s) => fala[id] + Math.round(s * FPS);

const T = {
  fala, // quadro em que cada fala começa
  destaquePA: q("gancho", DENTRO.gancho.para),
  goesNome: q("satelite", DENTRO.satelite.nome),
  varredura: q("satelite", DENTRO.satelite.varre),
  historico: fala.recorde - 12, // as barras entram um pouco antes da voz
  aqua: q("recorde", DENTRO.recorde.aqua),
  barraAtual: q("recorde", DENTRO.recorde.atual),
  recordeAnterior: q("recorde", DENTRO.recorde.anterior),
  foco: fala.foco - 8,
  focoFogo: q("foco", DENTRO.foco.fogo),
  focoPixels: q("foco", DENTRO.foco.pixels),
  focoMesmo: q("foco", DENTRO.foco.mesmo),
  dia: fala.madrugada - 8,
  // Âncoras do relógio das 24 horas: [quadro, minuto do dia]. Rápido onde não há fogo,
  // devagar onde ele volta, pra que cada frase caia na hora de que fala.
  relogio: [
    [fala.madrugada + 15, 0],
    [q("madrugada", DENTRO.madrugada.madrugada), 210],
    [fala.tarde, 540],
    [q("tarde", DENTRO.tarde.volta), 900],
    [q("tarde", DENTRO.tarde.pico), 19 * 60 + 20],
    [fala.cidades - 40, 1439],
  ],
  cidades: fala.cidades - 8,
  nomes: DENTRO.cidades.nomes.map((s) => q("cidades", s)),
  fim: fala.fim - 10,
  cta: fala.cta,
  marca: fala.cta + dur.cta + 15,
};
T.total = T.marca + 75;

writeFileSync(SAIDA, `${JSON.stringify(T, null, 2)}\n`);
console.log(`${T.total} quadros (${(T.total / FPS).toFixed(1)}s)`);
