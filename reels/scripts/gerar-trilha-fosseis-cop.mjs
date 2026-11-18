// Trilha do reel "Os anfitriões da COP31 e os fósseis" (ciencia/FosseisCop), por baixo da narração.
// Sintetizada, como as outras (uso comercial resolvido, cada som no quadro da cena). Mesma base do
// gerar-trilha-binance.mjs: colchão de acordes com pulso leve, whoosh nas trocas de cena, tiques
// enquanto os contadores correm, impactos nos números ditos. O acorde do fim é o do começo (loop).
//
//   node scripts/gerar-trilha-fosseis-cop.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-fosseis-cop.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/fosseis-cop-tempos.json", import.meta.url), "utf-8"));
const M = T.m, F = T.fala;
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 3101;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    if (i0 + i < 0) continue;
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};
const P = { A1: 55, D2: 73.42, E2: 82.41, G2: 98, A2: 110, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, A4: 440, C5: 523.25, E5: 659.25, A5: 880 };

const sino = (fq, t0, vol, pan = 0.5) => soma(t0, 2.5, pan, (t) =>
  (Math.sin(2 * Math.PI * fq * t) + 0.35 * Math.sin(2 * Math.PI * fq * 2.76 * t) * Math.exp(-t * 3))
  * Math.exp(-t * 1.8) * (1 - Math.exp(-t * 400)) * vol);
const grave = (fq, t0, vol, dur = 1.6) => soma(t0, dur, 0.5, (t) =>
  Math.sin(2 * Math.PI * fq * t * (1 - 0.25 * t / dur)) * Math.exp(-t * 2.2) * (1 - Math.exp(-t * 300)) * vol);
const estalo = (t0, vol, pan) => {
  let y = 0;
  soma(t0, 0.025, pan, (t) => { y += 0.5 * ((rnd() * 2 - 1) - y); return y * Math.exp(-t * 280) * vol; });
};
const tique = (t0, vol, pan, fq = 1900) => {
  let ant = 0;
  soma(t0, 0.03, pan, (t) => {
    const r = rnd() * 2 - 1, hp = r - ant; ant = r;
    return (hp * 0.7 * Math.exp(-t * 500) + Math.sin(2 * Math.PI * fq * t) * 0.35 * Math.exp(-t * 260)) * vol;
  });
};
const whoosh = (t0, vol, dur = 0.42) => {
  let y = 0;
  soma(t0 - dur * 0.6, dur, 0.5, (t, D) => {
    const u = t / D, a = 0.02 + 0.35 * Math.sin(Math.PI * u) ** 2;
    y += a * ((rnd() * 2 - 1) - y);
    return y * Math.sin(Math.PI * u) ** 1.5 * vol;
  });
};
/** Varredura de fita voltando (o "rebobinar" até 2000): ruído que desce de tom. */
const rebobina = (t0, dur, vol) => {
  let y = 0;
  soma(t0, dur, 0.5, (t, D) => {
    const u = t / D, a = 0.4 - 0.36 * u;
    y += a * ((rnd() * 2 - 1) - y);
    return (y * 0.7 + Math.sin(2 * Math.PI * (1400 - 1000 * u) * t) * 0.18) * Math.sin(Math.PI * u) * vol;
  });
};

// Colchão: ré menor / fá / dó / lá menor, trocando com as cenas; pulso grave a 120 bpm.
const G0 = T.grande[0].f;
const ACORDES = [
  [0, [P.D3, P.F3, P.A3]], [F.turquia, [P.A2, P.E3, P.C4]], [F.australia, [P.F3, P.A3, P.C4]], [F.mundo, [P.C3, P.E3, P.G3]],
  [M.contradicao + 6, [P.A2, P.E3, P.C4]], [F.brasil, [P.G2, P.D3, P.B3]], [T.varre.volta, [P.D3, P.F3, P.A3]],
  [T.varre.ate, [P.A2, P.E3, P.C4]], [F.pergunta, [P.F3, P.A3, P.C4]], [G0, [P.C3, P.E3, P.G3]], [T.fim, [P.D3, P.F3, P.A3]],
];
ACORDES.forEach(([de, notas], k) => {
  const t0 = q(de), t1 = k + 1 < ACORDES.length ? q(ACORDES[k + 1][0]) : DUR;
  notas.forEach((fq, j) => soma(t0, t1 - t0 + 0.4, j % 2 ? 0.62 : 0.38, (t, D) => {
    const env = (k === 0 ? 1 : Math.min(1, t / 0.25)) * (k === ACORDES.length - 1 ? 1 : Math.min(1, (D - t) / 0.4));
    return (Math.sin(2 * Math.PI * fq * t) + 0.5 * Math.sin(2 * Math.PI * fq * 2.003 * t)) * 0.5 * env * 0.09;
  }));
});
for (let t = 0; t < DUR - 0.2; t += 0.5) {
  soma(t, 0.3, 0.5, (u) => Math.sin(2 * Math.PI * 55 * u * (1 - 0.3 * u)) * Math.exp(-u * 14) * 0.2);
  if (Math.round(t * 2) % 2) estalo(t, 0.045, 0.65);
}

for (const c of T.cenas) whoosh(q(c), 0.3);

// Impactos nos números ditos.
grave(P.A1, q(M.metade), 0.8); sino(P.A5, q(M.metade + 1), 0.09);
sino(P.C5, q(M.p57), 0.08, 0.4);
sino(P.E5, q(M.terco), 0.07, 0.6);
grave(P.A1, q(M.p60), 0.6); sino(P.A4, q(M.p43), 0.08, 0.6);
sino(P.E5, q(M.contradicao), 0.09, 0.5);
grave(P.A1, q(M.p58), 0.8); sino(P.A5, q(M.p58 + 2), 0.09);
sino(P.C5, q(M.abaixo), 0.06, 0.4); sino(P.E5, q(M.acima), 0.06, 0.6);
sino(P.A4, q(M.p11), 0.08, 0.5); sino(P.C5, q(M.hidro), 0.06, 0.5);
rebobina(q(T.varre.volta), q(M.caiu - T.varre.volta) + 0.1, 0.35);
grave(P.A1, q(M.p32), 0.7);
sino(P.E4, q(M.p92), 0.07, 0.4);
for (const k of [M.t18, M.m7, M.b2]) sino(P.A4, q(k), 0.06, 0.5);
sino(P.A5, q(T.grande.at(-1).f), 0.08); // "sai?"

// Contadores: tiques enquanto o número corre. Na corrida dos anos, um tique por ano.
for (const c of T.contas) {
  if (c.id === "anos") {
    for (let k = 0; k <= 25; k++) tique(q(c.de + ((c.ate - c.de) * k) / 25), 0.2, 0.4 + 0.2 * (k % 2), 2200);
  } else for (let g = c.de; g < c.ate; g += c.passo) tique(q(g), 0.18, 0.4 + 0.2 * (g % 2));
}

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
