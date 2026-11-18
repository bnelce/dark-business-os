// Trilha do reel "Mesmos acertos, notas diferentes" (ciencia/EnemTri), por baixo da narração. Sintetizada,
// como as outras: uso comercial resolvido e cada som no quadro da cena.
//
// Colchão contínuo com pulso grave do quadro 0 ao fim (a composição toca a 0.3); whoosh em cada troca de
// cena (T.cenas); tiques quando as questões acendem na régua e quando as barras do histograma sobem;
// um grave seco em cada "errou" e no "chute"; sinos nos números. O acorde do fim é o mesmo do começo, pro
// loop emendar.
//
// Os quadros vêm de src/ciencia/enem-tri-tempos.json, o mesmo arquivo que a composição lê (o
// audio-enem-tri.mjs gera os tempos e depois esta trilha).
//
//   node scripts/gerar-trilha-enem-tri.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-enem-tri.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/enem-tri-tempos.json", import.meta.url), "utf-8"));
const M = T.m, F = T.fala, C = T.cena;
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 1511;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    if (i0 + i < 0) continue;
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};
const P = { A1: 55, D2: 73.42, E2: 82.41, A2: 110, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94, C4: 261.63, E4: 329.63, A4: 440, C5: 523.25, E5: 659.25, A5: 880 };

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
/** Vento: ruído com passa-baixa que oscila; `env(u)` dá o volume ao longo do trecho. */
const vento = (t0, t1, vol, env) => {
  let y = 0;
  soma(t0, t1 - t0, 0.5, (t, D) => {
    const u = t / D, a = 0.012 + 0.01 * Math.sin(2 * Math.PI * 0.7 * t) ** 2;
    y += a * ((rnd() * 2 - 1) - y);
    return y * 6 * env(u) * vol;
  });
};
/** Chuva miúda: estalos curtos e aleatórios. */
const chuva = (t0, t1, vol, densidade = 40) => {
  for (let t = t0; t < t1; t += 1 / densidade) estalo(t + rnd() / densidade, vol * (0.4 + 0.6 * rnd()), 0.2 + 0.6 * rnd());
};
const riser = (t0, t1, vol) => {
  let y = 0;
  soma(t0, t1 - t0, 0.5, (t, D) => {
    const u = t / D, a = 0.01 + 0.4 * u * u;
    y += a * ((rnd() * 2 - 1) - y);
    return (y * 0.8 + Math.sin(2 * Math.PI * (300 + 900 * u * u) * t) * 0.25) * u ** 2 * vol;
  });
};

// Colchão: acordes longos em lá menor que trocam com as cenas, e um pulso grave a 120 bpm.
const G0 = T.grande[0].f;
const ACORDES = [
  [0, [P.A2, P.E3, P.C4]], [C.domingo.de, [P.F3, P.A3, P.C4]], [C.regua.de, [P.D3, P.F3, P.A3]], [F.tri, [P.E3, P.G3, P.B3]],
  [C.hist.de, [P.C3, P.E3, P.G3]], [C.inep.de, [P.F3, P.A3, P.C4]], [G0, [P.D3, P.F3, P.A3]], [T.fim, [P.A2, P.E3, P.C4]],
];
ACORDES.forEach(([de, notas], k) => {
  const t0 = q(de), t1 = k + 1 < ACORDES.length ? q(ACORDES[k + 1][0]) : DUR;
  notas.forEach((fq, j) => soma(t0, t1 - t0 + 0.4, j % 2 ? 0.62 : 0.38, (t, D) => {
    const env = (k === 0 ? 1 : Math.min(1, t / 0.25)) * (k === ACORDES.length - 1 ? 1 : Math.min(1, (D - t) / 0.4));
    return (Math.sin(2 * Math.PI * fq * t) + 0.5 * Math.sin(2 * Math.PI * fq * 2.003 * t)) * 0.5 * env * 0.09;
  }));
});
for (let t = 0; t < DUR - 0.2; t += 0.5) {
  soma(t, 0.3, 0.5, (u) => Math.sin(2 * Math.PI * 55 * u * (1 - 0.3 * u)) * Math.exp(-u * 14) * 0.22);
}

// Trocas de cena.
for (const c of T.cenas) whoosh(q(c), 0.3);

// Gancho: as duas notas.
sino(P.E4, q(M.n319), 0.1, 0.35); grave(P.A1, q(M.n319), 0.6);
sino(P.A5, q(M.n570), 0.1, 0.65); grave(P.A1, q(M.n570), 0.9);
// Domingo: "conta quais".
grave(P.A1, q(M.quais), 0.9); sino(P.C5, q(M.quais), 0.08);
// Régua: as 43 questões aparecem de baixo pra cima; acendem as fáceis de quem tirou quase 570;
// as 21 fáceis de quem tirou 319 apagam com um grave seco.
for (let k = 0; k < 43; k += 2) tique(q(M.n43 - 6 + k * 0.6), 0.16, 0.3 + 0.01 * k, 1500 + 20 * k);
for (let k = 0; k < 5; k++) tique(q(M.cinco + k * 2), 0.35, 0.3, 2200 + 120 * k);
sino(P.E5, q(M.cinco + 10), 0.08, 0.3);
grave(P.E2, q(M.errou), 0.9); grave(P.A1, q(M.n21), 0.8);
// TRI: "chute" e "valem menos".
grave(P.A1, q(M.chute), 0.8); sino(P.C5, q(M.chute), 0.07, 0.7);
grave(P.E2, q(M.valem), 0.6);
// Histograma: as barras sobem, os 250 pontos.
riser(q(C.hist.de), q(M.n250), 0.18);
for (let k = 0; k < 26; k += 2) tique(q(C.hist.de + 4 + k * 0.7), 0.18, 0.2 + 0.025 * k, 1500 + 40 * k);
sino(P.E5, q(M.n250), 0.1); grave(P.A1, q(M.n250), 0.8);
// INEP: a questão em branco.
grave(P.E2, q(M.branco), 0.6); sino(P.A4, q(M.soma), 0.08, 0.4); grave(P.A1, q(M.erro), 0.7);
sino(P.A5, q(T.grande.at(-1).f), 0.08); // "dá?"

// Contadores: tiques enquanto o número corre.
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
