// Trilha do reel do dólar v2 (ciencia/Dolar), por baixo da narração. Sintetizada, como as
// outras: uso comercial resolvido e cada som no quadro da cena.
//
// Colchão contínuo com pulso leve do quadro 0 ao fim (a composição toca a 0.3); impacto no
// pico do gancho; whoosh curto em cada troca de cena (T.cenas); impactos no punch-in de
// 26/10, na PTAX caindo fora da faixa do Focus e na barra de 2026; cadeado e banco no
// ranking; tique de teclado em cada caractere digitado (T.digita); riser que estoura no
// "quintilhões". O acorde do fim é o mesmo do começo, pra emendar o loop.
//
// Os quadros vêm de src/ciencia/dolar-tempos.json, o mesmo arquivo que a composição lê:
// mudou a narração, gera os tempos de novo (scripts/tempos-dolar.mjs) e depois esta trilha.
//
//   node scripts/gerar-trilha-dolar.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-dolar.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/dolar-tempos.json", import.meta.url), "utf-8"));
const M = T.m, F = T.fala;
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 9190;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    if (i0 + i < 0) continue;
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};
const P = { D2: 73.42, A2: 110, Bb2: 116.54, C3: 130.81, D3: 146.83, F3: 174.61, G3: 196, A3: 220, Bb3: 233.08, C4: 261.63, D4: 293.66, F4: 349.23, A4: 440, D5: 587.33, F5: 698.46, A5: 880 };

const sino = (fq, t0, vol, pan = 0.5) => soma(t0, 2.5, pan, (t) =>
  (Math.sin(2 * Math.PI * fq * t) + 0.35 * Math.sin(2 * Math.PI * fq * 2.76 * t) * Math.exp(-t * 3))
  * Math.exp(-t * 1.8) * (1 - Math.exp(-t * 400)) * vol);
const grave = (fq, t0, vol, dur = 1.6) => soma(t0, dur, 0.5, (t) =>
  Math.sin(2 * Math.PI * fq * t * (1 - 0.25 * t / dur)) * Math.exp(-t * 2.2) * (1 - Math.exp(-t * 300)) * vol);
const estalo = (t0, vol, pan) => {
  let y = 0;
  soma(t0, 0.025, pan, (t) => { y += 0.5 * ((rnd() * 2 - 1) - y); return y * Math.exp(-t * 280) * vol; });
};
/** Tique de teclado: clique agudo (ruído com passa-alta) + um corpo curto. */
const tique = (t0, vol, pan) => {
  let ant = 0;
  soma(t0, 0.03, pan, (t) => {
    const r = rnd() * 2 - 1, hp = r - ant; ant = r;
    return (hp * 0.7 * Math.exp(-t * 500) + Math.sin(2 * Math.PI * 1900 * t) * 0.35 * Math.exp(-t * 260)) * vol;
  });
};
/** Whoosh: ruído que abre e fecha (um passa-baixa variando), atravessando o estéreo. */
const whoosh = (t0, vol, dur = 0.42) => {
  let y = 0;
  soma(t0 - dur * 0.6, dur, 0.5, (t, D) => {
    const u = t / D, a = 0.02 + 0.35 * Math.sin(Math.PI * u) ** 2;
    y += a * ((rnd() * 2 - 1) - y);
    return y * Math.sin(Math.PI * u) ** 1.5 * vol;
  });
};
/** Riser: ruído e um tom subindo até `t1`, onde para seco (o impacto vem por cima). */
const riser = (t0, t1, vol) => {
  let y = 0;
  soma(t0, t1 - t0, 0.5, (t, D) => {
    const u = t / D, a = 0.01 + 0.4 * u * u;
    y += a * ((rnd() * 2 - 1) - y);
    const fq = 300 + 900 * u * u;
    return (y * 0.8 + Math.sin(2 * Math.PI * fq * t) * 0.25) * u ** 2 * vol;
  });
};

// Colchão: acordes longos que trocam com as cenas, e um pulso grave a 120 bpm.
const ACORDES = [
  [0, [P.D3, P.F3, P.A3]], [F.focus, [P.Bb2, P.D3, P.F3]], [F.sismografo, [P.D3, P.F3, P.A3]],
  [F.eleicoes, [P.C3, P.F3, P.A3]], [F.ranking, [P.Bb2, P.D3, P.F3]], [F.pergunta, [P.D3, P.F3, P.A3]],
  [F.extremos, [P.G3, P.Bb3, P.D4]], [F.cauda, [P.Bb2, P.D3, P.F3]], [F.palpite, [P.C3, P.F3, P.A3]], [T.loop, [P.D3, P.F3, P.A3]],
];
ACORDES.forEach(([de, notas], k) => {
  const t0 = q(de), t1 = k + 1 < ACORDES.length ? q(ACORDES[k + 1][0]) : DUR;
  notas.forEach((fq, j) => soma(t0, t1 - t0 + 0.4, j % 2 ? 0.62 : 0.38, (t, D) => {
    const env = Math.min(1, t / 0.25) * Math.min(1, (D - t) / 0.4);
    return (Math.sin(2 * Math.PI * fq * t) + 0.5 * Math.sin(2 * Math.PI * fq * 2.003 * t)) * 0.5 * env * 0.09;
  }));
});
for (let t = 0; t < DUR - 0.2; t += 0.5) {
  soma(t, 0.3, 0.5, (u) => Math.sin(2 * Math.PI * 55 * u * (1 - 0.3 * u)) * Math.exp(-u * 14) * 0.22);
  if (Math.round(t * 2) % 2) estalo(t, 0.05, 0.65); // contratempo bem baixo
}

// Gancho: impacto no pico (o mesmo acorde do fim).
grave(P.D2, q(M.pico), 0.9);
sino(P.A5, q(M.pico + 1), 0.12);

// Trocas de cena.
for (const c of T.cenas) whoosh(q(c), 0.32);

// Impactos que acompanham a voz.
grave(P.D2, q(M.segunda), 0.7); sino(P.D5, q(M.segunda + 2), 0.1, 0.6); // punch-in no pico
sino(P.D5, q(M.f505), 0.08, 0.4); sino(P.F5, q(M.f540), 0.08, 0.6);
grave(P.D2, q(M.f550), 0.7); sino(P.A5, q(M.f550 + 2), 0.12); // PTAX fora da faixa
grave(P.D2, q(M.e2026), 0.7); sino(P.A5, q(M.e2026 + 2), 0.1); // barra de 2026
estalo(q(M.fixo), 0.5, 0.4); // cadeado
estalo(q(M.crise), 0.7, 0.6); estalo(q(M.crise + 3), 0.4, 0.6); // banco racha
sino(P.A4, q(M.chance), 0.08); // a curva se desenha
sino(P.D5, q(M.impossiveis), 0.1); // caudas acendem
sino(P.F5, q(M.pesada), 0.08, 0.4);
grave(P.D2, q(M.modelo), 0.5); // punch-in na cauda
sino(P.D5, q(M.p505), 0.08, 0.4);

// Números digitados: um tique por caractere.
for (const d of T.digita) {
  const passo = (d.ate - d.de) / d.texto.length;
  for (let k = 0; k < d.texto.length; k++) if (d.texto[k] !== " ") tique(q(d.de + k * passo), 0.32, 0.4 + 0.2 * (k % 2));
}

// Riser até o "quintilhões", e o estouro.
riser(q(T.fala.espera), q(M.quint), 0.32);
grave(P.D2, q(M.quint), 1.0, 2);
sino(P.A5, q(M.quint), 0.14);

// Fecho: whoosh de volta pro gancho, o impacto do pico de novo (emenda com o começo).
grave(P.D2, q(T.loop), 0.6);

const fade = Math.floor(0.15 * SR); // curto: o loop emenda no começo
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
