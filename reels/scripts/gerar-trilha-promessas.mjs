// Trilha do reel do termômetro das promessas (ciencia/Promessas), por baixo da narração.
// Sintetizada, como as outras (gerar-trilha-binance.mjs): uso comercial resolvido e cada som no
// quadro da cena.
//
// Colchão contínuo com pulso leve (a composição toca a 0.3); tiques enquanto o mercúrio corre e as
// barras crescem (T.contas) e em cada caractere digitado (T.digita); whoosh em cada troca de cena
// (T.cenas); um sino em cada marca do termômetro; o acorde do fim é o mesmo do começo, pro loop.
//
// Os quadros vêm de src/ciencia/promessas-tempos.json, o mesmo arquivo que a composição lê.
//
//   node scripts/gerar-trilha-promessas.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-promessas.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/promessas-tempos.json", import.meta.url), "utf-8"));
const M = T.m, F = T.fala;
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 2026;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    if (i0 + i < 0) continue;
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};
const P = { A1: 55, E2: 82.41, A2: 110, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94, C4: 261.63, E4: 329.63, A4: 440, C5: 523.25, E5: 659.25, A5: 880 };

const sino = (fq, t0, vol, pan = 0.5) => soma(t0, 2.5, pan, (t) =>
  (Math.sin(2 * Math.PI * fq * t) + 0.35 * Math.sin(2 * Math.PI * fq * 2.76 * t) * Math.exp(-t * 3))
  * Math.exp(-t * 1.8) * (1 - Math.exp(-t * 400)) * vol);
const grave = (fq, t0, vol, dur = 1.6) => soma(t0, dur, 0.5, (t) =>
  Math.sin(2 * Math.PI * fq * t * (1 - 0.25 * t / dur)) * Math.exp(-t * 2.2) * (1 - Math.exp(-t * 300)) * vol);
const estalo = (t0, vol, pan) => {
  let y = 0;
  soma(t0, 0.025, pan, (t) => { y += 0.5 * ((rnd() * 2 - 1) - y); return y * Math.exp(-t * 280) * vol; });
};
/** Tique: clique agudo (ruído com passa-alta) + um corpo curto. */
const tique = (t0, vol, pan, fq = 1900) => {
  let ant = 0;
  soma(t0, 0.03, pan, (t) => {
    const r = rnd() * 2 - 1, hp = r - ant; ant = r;
    return (hp * 0.7 * Math.exp(-t * 500) + Math.sin(2 * Math.PI * fq * t) * 0.35 * Math.exp(-t * 260)) * vol;
  });
};
/** Whoosh: ruído que abre e fecha (um passa-baixa variando). */
const whoosh = (t0, vol, dur = 0.42) => {
  let y = 0;
  soma(t0 - dur * 0.6, dur, 0.5, (t, D) => {
    const u = t / D, a = 0.02 + 0.35 * Math.sin(Math.PI * u) ** 2;
    y += a * ((rnd() * 2 - 1) - y);
    return y * Math.sin(Math.PI * u) ** 1.5 * vol;
  });
};

// Colchão: acordes longos em lá menor que trocam com as cenas, e um pulso grave a 120 bpm.
const ACORDES = [
  [0, [P.A2, P.E3, P.C4]], [F.cop, [P.F3, P.A3, P.C4]], [F.atual, [P.D3, P.F3, P.A3]], [F.otimista, [P.C3, P.E3, P.G3]],
  [F.paris, [P.E3, P.G3, P.B3]], [F.corte, [P.F3, P.A3, P.C4]], [M.promessasC, [P.D3, P.F3, P.A3]],
  [F.pergunta, [P.E3, P.G3, P.B3]], [T.fim, [P.A2, P.E3, P.C4]],
];
ACORDES.forEach(([de, notas], k) => {
  const t0 = q(de), t1 = k + 1 < ACORDES.length ? q(ACORDES[k + 1][0]) : DUR;
  notas.forEach((fq, j) => soma(t0, t1 - t0 + 0.4, j % 2 ? 0.62 : 0.38, (t, D) => {
    // o 1º acorde já entra cheio (o loop emenda nele) e o último não some no fim
    const env = (k === 0 ? 1 : Math.min(1, t / 0.25)) * (k === ACORDES.length - 1 ? 1 : Math.min(1, (D - t) / 0.4));
    return (Math.sin(2 * Math.PI * fq * t) + 0.5 * Math.sin(2 * Math.PI * fq * 2.003 * t)) * 0.5 * env * 0.09;
  }));
});
for (let t = 0; t < DUR - 0.2; t += 0.5) {
  soma(t, 0.3, 0.5, (u) => Math.sin(2 * Math.PI * 55 * u * (1 - 0.3 * u)) * Math.exp(-u * 14) * 0.22);
  if (Math.round(t * 2) % 2) estalo(t, 0.05, 0.65);
}

// Trocas de cena.
for (const c of T.cenas) whoosh(q(c), 0.32);

// Cada marca do termômetro: um impacto grave e um sino.
grave(P.A1, q(M.g26), 0.9); sino(P.A5, q(M.g26 + 1), 0.12);
grave(P.A1, q(M.g28), 0.8); sino(P.E5, q(M.g28 + 1), 0.1);
grave(P.A1, q(M.g21), 0.6); sino(P.C5, q(M.g21 + 1), 0.1);
sino(P.A4, q(M.g15), 0.12, 0.4); estalo(q(M.g15), 0.5, 0.5);
sino(P.E4, q(M.otimista), 0.07, 0.6);
// Os 12 anos acendendo, um tique por ano.
for (let k = 0; k < 12; k++) tique(q(M.n12 - 6 + k * 2), 0.22, 0.4 + 0.2 * (k % 2), 2200);
sino(P.C5, q(M.quentes), 0.08, 0.6);
// As barras: impacto em 18% e em 45%, e a régua das promessas.
grave(P.A1, q(M.p18), 0.6); grave(P.A1, q(M.p45), 0.8); sino(P.A5, q(M.p45 + 2), 0.1);
sino(P.E4, q(M.metade), 0.09, 0.4);
// A pergunta: o mercúrio-fantasma desce até 1,5.
sino(P.A4, q(M.q15), 0.1, 0.5);

// Números digitados: um tique por caractere. Contadores: tiques enquanto o número corre.
for (const d of T.digita) {
  const passo = (d.ate - d.de) / d.texto.length;
  for (let k = 0; k < d.texto.length; k++) if (d.texto[k] !== " ") tique(q(d.de + k * passo), 0.22, 0.4 + 0.2 * (k % 2));
}
for (const c of T.contas) for (let g = c.de; g < c.ate; g += c.passo) tique(q(g), 0.2, 0.4 + 0.2 * (g % 2));

const fade = Math.floor(0.04 * SR); // só o bastante pra não estalar no corte; o loop emenda no acorde do começo
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
