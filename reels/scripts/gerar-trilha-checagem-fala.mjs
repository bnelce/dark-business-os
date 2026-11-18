// Trilha do reel "Ele disse. Os dados mostram." (ciencia/ChecagemFala), por baixo da narração. Sintetizada,
// como as outras: uso comercial resolvido e cada som no quadro da cena.
//
// Colchão contínuo com pulso grave (a composição toca a 0.3); whoosh em cada troca de cena (T.cenas); um
// carimbo (grave seco + estalo) em cada veredito; tiques quando os estados acendem e quando as barras
// crescem; riser até a soma passar a linha do ganho do Lula. O acorde do fim é o do começo, pro loop emendar.
//
// Os quadros vêm de src/ciencia/checagem-fala-tempos.json, o mesmo arquivo que a composição lê.
//
//   node scripts/gerar-trilha-checagem-fala.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-checagem-fala.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/checagem-fala-tempos.json", import.meta.url), "utf-8"));
const M = T.m, F = T.fala, C = T.cena;
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 2511;
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

// Colchão: acordes longos em ré menor que trocam com as cenas, e um pulso grave a 120 bpm.
const G0 = T.grande[0].f;
const ACORDES = [
  [0, [P.D3, P.F3, P.A3]], [C.lista.de, [P.A2, P.E3, P.C4]], [C.p1.de, [P.F3, P.A3, P.C4]], [C.p2.de, [P.C3, P.E3, P.G3]],
  [C.p3.de, [P.A2, P.E3, P.C4]], [C.fontes.de, [P.D3, P.F3, P.A3]], [M.n141, [P.F3, P.A3, P.C4]], [G0, [P.A2, P.E3, P.C4]], [T.fim, [P.D3, P.F3, P.A3]],
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

/** Carimbo de veredito: grave seco + estalo. */
const carimbo = (quadro, vol = 0.9) => { grave(P.A1, q(quadro), vol, 0.9); estalo(q(quadro), 0.8, 0.5); estalo(q(quadro) + 0.012, 0.5, 0.45); };

// Gancho: o "Qual a chance?" e o nome.
sino(P.A4, q(M.chance), 0.08, 0.6);
// Lista: os 4 pontos aparecem.
for (let k = 0; k < 4; k++) tique(q(C.lista.de + 4 + k * 5), 0.3, 0.35 + 0.1 * k, 1700 + 150 * k);
sino(P.E5, q(M.tse), 0.07);
// Ponto 1.
grave(P.A1, q(M.n11), 0.5); sino(P.C5, q(M.n104), 0.09, 0.6); carimbo(M.exag);
// Ponto 2: os 27 estados acendem, depois os 21.
for (let k = 0; k < 27; k++) tique(q(M.todos + k * 0.8), 0.16, 0.25 + 0.5 * (k / 27), 1500 + 25 * k);
carimbo(M.verdade2, 0.7);
sino(P.E5, q(M.n27), 0.08, 0.35);
for (let k = 0; k < 21; k++) tique(q(M.flavio2 + k * 0.8), 0.14, 0.75 - 0.5 * (k / 21), 1400 + 25 * k);
sino(P.C5, q(M.n21), 0.08, 0.65);
// Ponto 3.
grave(P.E2, q(M.abst), 0.5); carimbo(M.verdade3, 0.7); sino(P.A4, q(M.n3), 0.08);
// Ponto 4: as fontes contra a linha.
grave(P.E2, q(M.resto), 0.6); sino(P.C5, q(M.n93), 0.08, 0.35); grave(P.A1, q(M.menos), 0.7);
riser(q(M.s3 - 6), q(M.n141), 0.2);
tique(q(M.s3), 0.35, 0.5, 2100); tique(q(M.n18), 0.35, 0.5, 2300);
sino(P.A5, q(M.n141), 0.1); grave(P.A1, q(M.n141), 0.9);
sino(P.E5, q(M.n74), 0.08, 0.35); sino(P.C5, q(M.n26), 0.08, 0.65);
carimbo(M.precisou);
// Fecho: separa e junta.
grave(P.E2, q(M.sozinha), 0.5); sino(P.A4, q(M.juntas), 0.08); sino(P.E5, q(M.voto), 0.08);
for (let k = 0; k < 4; k++) estalo(q(G0 + 2 + k * 3), 0.5, 0.3 + 0.13 * k);
sino(P.A5, q(T.grande.at(-1).f), 0.08); // "dados?"

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
