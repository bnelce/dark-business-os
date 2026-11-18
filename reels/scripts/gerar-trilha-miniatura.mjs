// Trilha do reel "Brasil em miniatura" (ciencia/BrasilMiniatura), por baixo da narração.
// Sintetizada, como as outras: uso comercial resolvido e cada som no quadro da cena.
//
// Colchão contínuo com pulso leve do quadro 0 ao fim (a composição toca a 0.3); riser no mapa
// encolhendo até Ananindeua e impacto quando vira um ponto (o riser é uma curva só entre o fim
// e o começo, então o loop emenda); whoosh curto em cada troca de cena (T.cenas); tique de
// teclado em cada caractere digitado (T.digita); impactos no 1,7, no 1ª, no Mossoró, no 23 e
// no 67; estalos nas 27 miniaturas acendendo. O acorde do fim é o mesmo do começo.
//
// Os quadros vêm de src/ciencia/brasil-miniatura-tempos.json, o mesmo arquivo que a
// composição lê: mudou a narração, gera os tempos de novo (scripts/tempos-miniatura.mjs) e
// depois esta trilha.
//
//   node scripts/gerar-trilha-miniatura.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-miniatura.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/brasil-miniatura-tempos.json", import.meta.url), "utf-8"));
const M = T.m, F = T.fala;
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 5563;
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
/** Tique de teclado: clique agudo (ruído com passa-alta) + um corpo curto. */
const tique = (t0, vol, pan) => {
  let ant = 0;
  soma(t0, 0.03, pan, (t) => {
    const r = rnd() * 2 - 1, hp = r - ant; ant = r;
    return (hp * 0.7 * Math.exp(-t * 500) + Math.sin(2 * Math.PI * 1900 * t) * 0.35 * Math.exp(-t * 260)) * vol;
  });
};
/** Gota: tom curto e agudo com queda de altura (as miniaturas acendendo). */
const gota = (t0, fq, vol, pan) => soma(t0, 0.12, pan, (t) =>
  Math.sin(2 * Math.PI * fq * t * (1 + 0.6 * Math.exp(-t * 40))) * Math.exp(-t * 35) * vol);
/** Whoosh: ruído que abre e fecha (um passa-baixa variando). */
const whoosh = (t0, vol, dur = 0.42) => {
  let y = 0;
  soma(t0 - dur * 0.6, dur, 0.5, (t, D) => {
    const u = t / D, a = 0.02 + 0.35 * Math.sin(Math.PI * u) ** 2;
    y += a * ((rnd() * 2 - 1) - y);
    return y * Math.sin(Math.PI * u) ** 1.5 * vol;
  });
};
/**
 * Riser do colapso como função de u (0 → 1 ao longo de τ de −45 a +40 quadros). Toca o
 * pedaço [u0, u1] a partir de t0: o fim toca 0 → 45/85 e o começo 45/85 → 1, e as duas
 * metades formam a mesma subida quando o vídeo volta pro quadro 0.
 */
const riserColapso = (t0, u0, u1, vol) => {
  const total = (T.colapso.fim + T.colapso.inicio) / FPS;
  let y = 0;
  soma(t0, (u1 - u0) * total, 0.5, (t) => {
    const u = u0 + t / total, a = 0.01 + 0.4 * u * u;
    y += a * ((rnd() * 2 - 1) - y);
    const fq = 220 + 660 * u * u;
    return (y * 0.8 + Math.sin(2 * Math.PI * fq * t) * 0.22) * u ** 2 * vol;
  });
};
const riser = (t0, t1, vol) => {
  let y = 0;
  soma(t0, t1 - t0, 0.5, (t, D) => {
    const u = t / D, a = 0.01 + 0.4 * u * u;
    y += a * ((rnd() * 2 - 1) - y);
    return (y * 0.8 + Math.sin(2 * Math.PI * (300 + 900 * u * u) * t) * 0.25) * u ** 2 * vol;
  });
};

// Colchão: acordes longos que trocam com as cenas, e um pulso grave a 120 bpm.
const G0 = T.grande[0].f, FIM = T.total - T.colapso.fim;
const ACORDES = [
  [0, [P.A2, P.E3, P.C4]], [F.prova, [P.F3, P.A3, P.C4]], [F.historico, [P.C3, P.E3, P.G3]], [F.ranking, [P.A2, P.E3, P.C4]],
  [F.pergunta, [P.D3, P.F3, P.A3]], [F.paradoxo, [P.F3, P.A3, P.C4]], [M.mossoro, [P.E3, P.G3, P.B3]], [M.termometro, [P.D3, P.F3, P.A3]],
  [F.minas, [P.C3, P.E3, P.G3]], [F.estados, [P.F3, P.A3, P.C4]], [G0, [P.D3, P.F3, P.A3]], [FIM, [P.A2, P.E3, P.C4]],
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

// Gancho e fim: o país encolhendo até Ananindeua, e o impacto quando vira um ponto.
const uCorte = T.colapso.fim / (T.colapso.fim + T.colapso.inicio);
riserColapso(0, uCorte, 1, 0.3);
riserColapso(q(FIM), 0, uCorte, 0.3);
grave(P.A1, q(T.colapso.inicio), 0.9);
sino(P.A5, q(T.colapso.inicio + 1), 0.12);
sino(P.E5, q(M.g24), 0.07, 0.6);

// Trocas de cena.
for (const c of T.cenas) whoosh(q(c), 0.32);

// Impactos que acompanham a voz.
sino(P.C5, q(M.a526), 0.07, 0.4); sino(P.E5, q(M.b518), 0.07, 0.6);
grave(P.A1, q(M.b482 + 12), 0.5); // punch-in nas divisórias
grave(P.A1, q(M.h17), 0.7); sino(P.A5, q(M.h17 + 2), 0.1);
grave(P.A1, q(M.n5563), 0.8); sino(P.E5, q(M.n5563 + 2), 0.1);
estalo(q(M.r2022), 0.6, 0.6); estalo(q(M.r2022 + 3), 0.35, 0.6); // o X de 2022
sino(P.C5, q(M.miniatura), 0.1); // o "?"
sino(P.E4, q(M.nao), 0.07, 0.4);
riser(q(M.evangelica + 20), q(M.mossoro), 0.26); // e a mais parecida é...
grave(P.A1, q(M.mossoro), 0.8); sino(P.B3 * 2, q(M.mossoro + 2), 0.1);
grave(P.A1, q(M.p12), 0.5);
sino(P.A4, q(M.t2002), 0.1, 0.4); // 2002 em cheio
grave(P.A1, q(M.t23), 0.7); sino(P.E5, q(M.t23 + 2), 0.08, 0.6);
sino(P.C5, q(M.minas), 0.08, 0.4);
grave(P.A1, q(M.m67), 0.7); sino(P.A5, q(M.m67 + 2), 0.1);
sino(P.A5, q(T.grande.at(-1).f), 0.08); // "Brasil?"

// Números digitados: um tique por caractere.
for (const d of T.digita) {
  const passo = (d.ate - d.de) / d.texto.length;
  for (let k = 0; k < d.texto.length; k++) if (d.texto[k] !== " ") tique(q(d.de + k * passo), 0.32, 0.4 + 0.2 * (k % 2));
}
// Seis anos acertados nos chips (2022 é o estalo), sete em Minas.
for (let i = 0; i < 7; i++) if (i !== 5) tique(q(M.errou + i * 6), 0.28, 0.5);
for (let i = 0; i < 7; i++) tique(q(M.sete2 + i * 3), 0.26, 0.5);
// As 27 miniaturas acendendo, de norte a sul.
for (let k = 0; k < 27; k++) gota(q(F.estados + 2 + k * 0.7), 1400 + 40 * (k % 6), 0.07, 0.3 + 0.4 * (k % 2));

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
