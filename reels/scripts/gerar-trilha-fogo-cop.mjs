// Trilha do reel desmatamento × fogo (ciencia/FogoCop), por baixo da narração. Sintetizada, como as
// outras (uso comercial resolvido e cada som no quadro da cena).
//
// Colchão contínuo em ré menor, com pulso leve (a composição toca a 0.28); whoosh em cada troca de
// cena (T.cenas); tique em cada caractere digitado (T.digita) e enquanto os contadores correm
// (T.contas); um "plic" seco por quadrado que some do desmatamento (T.somem) e um crepitar curto
// quando as barras de fogo sobem (T.fogos). O acorde do fim é o mesmo do começo, pro loop emendar.
//
// Os quadros vêm de src/ciencia/fogo-cop-tempos.json, o mesmo arquivo que a composição lê (o
// audio-fogo-cop.mjs gera os tempos e depois esta trilha).
//
//   node scripts/gerar-trilha-fogo-cop.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-fogo-cop.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/fogo-cop-tempos.json", import.meta.url), "utf-8"));
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 3335;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    if (i0 + i < 0) continue;
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};
const P = { D1: 36.71, A1: 55, D2: 73.42, F2: 87.31, A2: 110, Bb2: 116.54, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, Bb3: 233.08, C4: 261.63, D4: 293.66, F4: 349.23, A4: 440, D5: 587.33, F5: 698.46, A5: 880 };

const sino = (fq, t0, vol, pan = 0.5) => soma(t0, 2.4, pan, (t) =>
  (Math.sin(2 * Math.PI * fq * t) + 0.35 * Math.sin(2 * Math.PI * fq * 2.76 * t) * Math.exp(-t * 3))
  * Math.exp(-t * 1.9) * (1 - Math.exp(-t * 400)) * vol);
const grave = (fq, t0, vol, dur = 1.6) => soma(t0, dur, 0.5, (t) =>
  Math.sin(2 * Math.PI * fq * t * (1 - 0.25 * t / dur)) * Math.exp(-t * 2.2) * (1 - Math.exp(-t * 300)) * vol);
const tique = (t0, vol, pan, fq = 1900) => {
  let ant = 0;
  soma(t0, 0.03, pan, (t) => {
    const r = rnd() * 2 - 1, hp = r - ant; ant = r;
    return (hp * 0.7 * Math.exp(-t * 500) + Math.sin(2 * Math.PI * fq * t) * 0.35 * Math.exp(-t * 260)) * vol;
  });
};
/** "Plic": bolha curta que desce de tom (um quadrado de desmatamento apagando). */
const plic = (t0, vol, pan, fq = 900) => soma(t0, 0.09, pan, (t) =>
  Math.sin(2 * Math.PI * fq * t * (1 - 2.5 * t)) * Math.exp(-t * 45) * (1 - Math.exp(-t * 900)) * vol);
/** Crepitar: estalos de ruído espaçados ao acaso (com semente), como brasa. */
const crepita = (t0, dur, vol) => {
  for (let t = 0; t < dur; t += 0.018 + 0.05 * rnd()) {
    let y = 0;
    const v = vol * (0.4 + 0.6 * rnd()) * Math.sin((Math.PI * t) / dur);
    soma(t0 + t, 0.012, 0.3 + 0.4 * rnd(), (u) => { y += 0.6 * ((rnd() * 2 - 1) - y); return y * Math.exp(-u * 400) * v; });
  }
};
const whoosh = (t0, vol, dur = 0.42) => {
  let y = 0;
  soma(t0 - dur * 0.6, dur, 0.5, (t, D) => {
    const u = t / D, a = 0.02 + 0.35 * Math.sin(Math.PI * u) ** 2;
    y += a * ((rnd() * 2 - 1) - y);
    return y * Math.sin(Math.PI * u) ** 1.5 * vol;
  });
};

// Colchão: acordes longos que trocam com as cenas, e um pulso grave a 112 bpm.
const ACORDES_NOTAS = [
  [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3], [P.F3, P.A3, P.C4], [P.C3, P.E3, P.G3],
  [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3], [P.G3, P.Bb3, P.D4], [P.A2, P.E3, P.A3],
];
const trocas = [0, ...T.cenas.filter((c) => c < T.fim), T.fim];
trocas.forEach((de, k) => {
  const notas = k === trocas.length - 1 ? ACORDES_NOTAS[0] : ACORDES_NOTAS[k % ACORDES_NOTAS.length];
  const t0 = q(de), t1 = k + 1 < trocas.length ? q(trocas[k + 1]) : DUR;
  notas.forEach((fq, j) => soma(t0, t1 - t0 + 0.4, j % 2 ? 0.62 : 0.38, (t, D) => {
    const env = (k === 0 ? 1 : Math.min(1, t / 0.25)) * (k === trocas.length - 1 ? 1 : Math.min(1, (D - t) / 0.4));
    return (Math.sin(2 * Math.PI * fq * t) + 0.5 * Math.sin(2 * Math.PI * fq * 2.003 * t)) * 0.5 * env * 0.085;
  }));
});
const BATIDA = 60 / 112;
for (let t = 0; t < DUR - 0.2; t += BATIDA) soma(t, 0.3, 0.5, (u) => Math.sin(2 * Math.PI * 52 * u * (1 - 0.3 * u)) * Math.exp(-u * 14) * 0.2);

for (const c of T.cenas) whoosh(q(c), 0.3);
for (const s of T.somem ?? []) plic(q(s.f), 0.16, s.pan ?? 0.5, s.fq ?? 900);
for (const fo of T.fogos ?? []) crepita(q(fo.de), q(fo.ate - fo.de), 0.22);
for (const g of T.graves ?? []) grave(P.D2, q(g), 0.7);
for (const s of T.sinos ?? []) sino(P.A4, q(s), 0.07, 0.45);
sino(P.D5, q(T.grande.at(-1).f), 0.08); // última palavra da pergunta

for (const d of T.digita) {
  const passo = (d.ate - d.de) / d.texto.length;
  for (let k = 0; k < d.texto.length; k++) if (d.texto[k] !== " ") tique(q(d.de + k * passo), 0.3, 0.4 + 0.2 * (k % 2));
}
for (const c of T.contas) for (let g = c.de; g < c.ate; g += c.passo) tique(q(g), 0.2, 0.4 + 0.2 * (g % 2));

const fade = Math.floor(0.04 * SR);
for (let i = 0; i < fade; i++) { const g = i / fade; L[n - 1 - i] *= g; R[n - 1 - i] *= g; }
let pico = 0;
for (let i = 0; i < n; i++) pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / pico;
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
