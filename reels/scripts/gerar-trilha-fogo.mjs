// Trilha do reel do fogo no Pará (ciencia/Fogo), agora por baixo da narração.
// Sintetizada, como as outras: uso comercial resolvido e cada som no quadro da cena.
//
// Colchão grave em ré menor. Estalos de brasa (cliques curtos com semente fixa) que
// adensam enquanto o mapa do mês acende; um sopro curto a cada passada do GOES-19; um
// grave quando a barra de 2026 passa o recorde; notas curtas quando os pixels do esquema
// acendem; um tique por hora nas 24 horas (o relógio não anda em ritmo fixo, então cada
// tique cai no quadro em que aquela hora passa); uma nota por cidade, no nome dela; e o
// acorde abre em ré maior no fecho. Nada no registro da voz (200 Hz a 3 kHz) fica alto.
//
// Os quadros vêm de src/ciencia/fogo-para-tempos.json, o mesmo arquivo que a composição
// lê: mudou a narração, gera os tempos de novo e depois esta trilha.
//
//   node scripts/gerar-trilha-fogo.mjs public/ciencia/trilha-fogo.wav
//   ffmpeg -i public/ciencia/trilha-fogo.wav -b:a 192k public/ciencia/trilha-fogo.mp3
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-fogo.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/fogo-para-tempos.json", import.meta.url), "utf-8"));
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 2810;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    if (i0 + i < 0) continue;
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};
const colchao = (freqs, t0, dur, vol) => freqs.forEach((fq, k) => soma(t0, dur, k % 2 ? 0.6 : 0.4, (t, D) => {
  const env = Math.min(1, t / 1.5) * Math.min(1, (D - t) / 1.5);
  return (Math.sin(2 * Math.PI * fq * t) + Math.sin(2 * Math.PI * fq * 1.004 * t)) * 0.5 * env * vol;
}));
const sino = (fq, t0, vol, pan = 0.5) => soma(t0, 3, pan, (t) =>
  (Math.sin(2 * Math.PI * fq * t) + 0.35 * Math.sin(2 * Math.PI * fq * 2.76 * t) * Math.exp(-t * 3))
  * Math.exp(-t * 1.6) * (1 - Math.exp(-t * 400)) * vol);
const estalo = (t0, vol, pan) => {
  let y = 0;
  soma(t0, 0.02, pan, (t) => { y += 0.5 * ((rnd() * 2 - 1) - y); return y * Math.exp(-t * 300) * vol; });
};
const grave = (fq, t0, vol) => soma(t0, 2.5, 0.5, (t) => Math.sin(2 * Math.PI * fq * t * (1 - 0.15 * t / 2.5)) * Math.exp(-t * 1.4) * (1 - Math.exp(-t * 200)) * vol);

const P = { D2: 73.42, A2: 110, D3: 146.83, F3: 174.61, A3: 220, Fs3: 185, D4: 293.66, F4: 349.23, A4: 440, D5: 587.33, F5: 698.46, A5: 880 };

const sopro = (t0, dur, vol) => {
  let y = 0;
  soma(t0, dur, 0.5, (t, D) => { const c = 0.03 + 0.1 * Math.sin(Math.PI * t / D); y += c * ((rnd() * 2 - 1) - y); return y * Math.sin(Math.PI * t / D) * vol; });
};

// Mapa do mês: colchão e brasa adensando até as barras.
colchao([P.D2, P.A2, P.D3], 0, q(T.dia + 30), 0.15);
for (let t = 0; t < q(T.historico); t += 0.02) if (rnd() < 0.04 + 0.4 * (t / q(T.historico))) estalo(t, 0.22, rnd());

// Passadas do GOES-19 (Fogo.tsx: uma a cada 54 quadros, 46 de duração), aqui e no fecho.
for (let f = T.varredura; f < T.historico - 10; f += 54) sopro(q(f), q(46), 0.35);
for (let f = T.fim + 15; f < T.fim + 15 + 2 * 54; f += 54) sopro(q(f), q(46), 0.3);

// Série: grave quando o 2026 termina de subir (barraAtual + 45 quadros).
grave(P.D2 * 2, q(T.barraAtual + 45), 0.5);
sino(P.A5, q(T.barraAtual + 45), 0.1);

// Foco não é incêndio: uma nota aguda e curta por pixel que acende (45 quadros, ~10 pixels).
[P.D5, P.F5, P.A5, P.D5, P.F5, P.A5, P.D5, P.F5, P.A5, P.D5].forEach((fq, i) => sino(fq, q(T.focoPixels + i * 4.5), 0.035, 0.3 + 0.04 * i));
sino(P.A4, q(T.focoMesmo), 0.08);

// 24 horas: um tique por hora, no quadro em que o relógio passa por ela.
const RELOGIO = T.relogio;
const quadroDaHora = (min) => {
  for (let i = 1; i < RELOGIO.length; i++) {
    const [f0, m0] = RELOGIO[i - 1], [f1, m1] = RELOGIO[i];
    if (min <= m1) return f0 + ((min - m0) / (m1 - m0)) * (f1 - f0);
  }
  return RELOGIO[RELOGIO.length - 1][0];
};
for (let h = 0; h < 24; h++) soma(q(quadroDaHora(h * 60)), 0.05, 0.5, (tt) => Math.sin(2 * Math.PI * 2400 * tt) * Math.exp(-tt * 160) * 0.08);
colchao([P.D3, P.F3, P.A3], q(T.dia), q(T.cidades - T.dia + 20), 0.1);

// Cidades: uma nota por cidade, descendo, quando a voz diz o nome.
[P.D5, P.A4, P.F4, P.D4, P.A3].forEach((fq, i) => sino(fq, q(T.nomes[i] - 6), 0.12, 0.3 + 0.1 * i));

// Fecho: abre em ré maior.
colchao([P.D2, P.A2, P.D3, P.Fs3], q(T.fim), DUR - q(T.fim), 0.16);
sino(P.D5, q(T.fim), 0.14);
sino(P.A4, q(T.marca), 0.13);

const fade = Math.floor(1.2 * SR);
for (let i = 0; i < fade; i++) { const g = i / fade; L[n - 1 - i] *= g; R[n - 1 - i] *= g; }
let pico = 0;
for (let i = 0; i < n; i++) pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.84 / pico;
const buf = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * g * 32767))), i * 4);
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * g * 32767))), i * 4 + 2);
}
const cab = Buffer.alloc(44);
cab.write("RIFF", 0); cab.writeUInt32LE(36 + buf.length, 4); cab.write("WAVE", 8);
cab.write("fmt ", 12); cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20); cab.writeUInt16LE(2, 22);
cab.writeUInt32LE(SR, 24); cab.writeUInt32LE(SR * 4, 28); cab.writeUInt16LE(4, 32); cab.writeUInt16LE(16, 34);
cab.write("data", 36); cab.writeUInt32LE(buf.length, 40);
writeFileSync(SAIDA, Buffer.concat([cab, buf]));
console.log(`trilha de ${DUR.toFixed(3)}s (pico ${pico.toFixed(3)}, ganho ${g.toFixed(3)})`);
