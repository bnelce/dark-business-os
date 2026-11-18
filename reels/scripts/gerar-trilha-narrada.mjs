// Trilha de fundo pros reels de dados narrados (ciencia/Benford, ciencia/VotoNulo): o
// mesmo timbre da trilha da apuração do 2º turno, só que sem eventos amarrados à cena.
// Colchão em lá menor, um sino discreto a cada fala nova, resolve em dó maior na fala
// "conclusao" e fecha na cartela da marca. Nada no registro da voz.
//
// Os quadros vêm do arquivo de tempos do reel (scripts/tempos-narracao.mjs), o mesmo que a
// composição lê: mudou a narração, gera os tempos de novo e depois esta trilha.
//
//   node scripts/gerar-trilha-narrada.mjs src/ciencia/<reel>-tempos.json <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const [TEMPOS, SAIDA] = process.argv.slice(2);
if (!TEMPOS || !SAIDA) throw new Error("uso: gerar-trilha-narrada.mjs <tempos.json> <saída.wav>");

const T = JSON.parse(readFileSync(TEMPOS, "utf-8"));
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};

/** Colchão: duas senoides desafinadas por nota, ataque e saída lentos. */
const colchao = (freqs, t0, dur, vol) => {
  freqs.forEach((fq, k) => soma(t0, dur, k % 2 ? 0.6 : 0.4, (t, D) => {
    const env = Math.min(1, t / 1.5) * Math.min(1, (D - t) / 1.5);
    return (Math.sin(2 * Math.PI * fq * t) + Math.sin(2 * Math.PI * fq * 1.004 * t)) * 0.5 * env * vol;
  }));
};

const sino = (fq, t0, vol, pan = 0.5) => soma(t0, 3, pan, (t) =>
  (Math.sin(2 * Math.PI * fq * t) + 0.35 * Math.sin(2 * Math.PI * fq * 2.76 * t) * Math.exp(-t * 3))
  * Math.exp(-t * 1.6) * (1 - Math.exp(-t * 400)) * vol);

const P = { A2: 110, C3: 130.81, E3: 164.81, G3: 196, A3: 220, C4: 261.63, E4: 329.63, G4: 392, A4: 440, C5: 523.25, E5: 659.25, A5: 880 };

const ids = Object.keys(T.fala);
const resolve = T.fala.conclusao ?? T.fala[ids.at(-2)];

colchao([P.A2, P.E3, P.A3], 0, q(resolve + 20), 0.16);
const ARP = [P.A4, P.C5, P.E5, P.C5];
ids.forEach((id, k) => {
  if (k === 0 || T.fala[id] >= resolve) return;
  sino(ARP[k % ARP.length], q(T.fala[id]), 0.08, k % 2 ? 0.65 : 0.35);
});

colchao([P.C3, P.G3, P.C4, P.E4], q(resolve), DUR - q(resolve), 0.17);
sino(P.C5, q(resolve), 0.14);
if (T.fala.cta) sino(P.E5, q(T.fala.cta), 0.1);
sino(P.G4, q(T.marca), 0.14);

// Fade final de 1,2s: o reel não é loop, cortar seco estalaria.
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
