// Trilha da aula narrada de decibéis (ciencia/AulaDecibeis; material de estudo, não publicar). Sintetizada, discreta:
// é aula, a voz manda. Colchão de acordes longos que troca a cada conceito, whoosh leve nas trocas de cena e
// um sino curto quando cada cena começa. No resumo, o acorde do começo volta.
//
//   node scripts/gerar-trilha-aula-decibeis.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-aula-decibeis.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/aula-decibeis-tempos.json", import.meta.url), "utf-8"));
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 440;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);
const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    if (i0 + i < 0) continue;
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};
const P = { D2: 73.42, A2: 110, Bb2: 116.54, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, A4: 440, D5: 587.33, E5: 659.25 };
const sino = (fq, t0, vol, pan = 0.5) => soma(t0, 2.5, pan, (t) =>
  (Math.sin(2 * Math.PI * fq * t) + 0.3 * Math.sin(2 * Math.PI * fq * 2.76 * t) * Math.exp(-t * 3)) * Math.exp(-t * 1.8) * (1 - Math.exp(-t * 400)) * vol);
const whoosh = (t0, vol, dur = 0.5) => {
  let y = 0;
  soma(t0 - dur * 0.6, dur, 0.5, (t, D) => {
    const u = t / D, a = 0.02 + 0.25 * Math.sin(Math.PI * u) ** 2;
    y += a * ((rnd() * 2 - 1) - y);
    return y * Math.sin(Math.PI * u) ** 1.5 * vol;
  });
};

const ACORDES = [[P.D3, P.A3, P.F4], [P.Bb2, P.F3, P.D4], [P.C3, P.G3, P.E4], [P.A2, P.E3, P.C4]];
const inicios = T.ordem.map((id) => T.cena[id].de);
inicios.forEach((de, k) => {
  const notas = k === inicios.length - 1 ? ACORDES[0] : ACORDES[k % ACORDES.length];
  const t0 = q(de), t1 = k + 1 < inicios.length ? q(inicios[k + 1]) : DUR;
  notas.forEach((fq, j) => soma(t0, t1 - t0 + 0.6, j % 2 ? 0.65 : 0.35, (t, D) => {
    const env = (k === 0 ? Math.min(1, t / 1.5) : Math.min(1, t / 0.6)) * Math.min(1, (D - t) / 0.6);
    const trem = 1 + 0.12 * Math.sin(2 * Math.PI * 0.2 * t + j);
    return (Math.sin(2 * Math.PI * fq * t) + 0.35 * Math.sin(2 * Math.PI * fq * 2.003 * t)) * 0.5 * env * trem * 0.07;
  }));
});
soma(0, DUR, 0.5, (t) => Math.sin(2 * Math.PI * P.D2 * t) * 0.04 * (1 + 0.3 * Math.sin(2 * Math.PI * 0.1 * t)));
inicios.forEach((de, k) => {
  if (k) whoosh(q(de + 6), 0.2);
  sino(k % 2 ? P.E5 : P.D5, q(de + 10), 0.05, k % 2 ? 0.6 : 0.4);
});

const fade = Math.floor(1.5 * SR);
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
