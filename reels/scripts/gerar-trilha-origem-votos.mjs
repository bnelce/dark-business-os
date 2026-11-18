// Trilha do reel "De onde vieram os votos" (ciencia/OrigemVotos), por baixo da narração.
// Sintetizada, como as outras: uso comercial resolvido e cada som no quadro da cena.
//
// Colchão contínuo com pulso leve do quadro 0 ao fim (a composição toca a 0.3); os contadores
// correm com tiques sobre um riser que é uma curva só entre o fim e o começo, então o loop
// emenda; whoosh curto em cada troca de cena (T.cenas); tique em cada caractere digitado
// (T.digita); gotas nas torneiras, nas seções aparecendo e nos pontos da grade final; impactos
// nos números da fala; um riser que estoura em "Sudeste", a virada do vídeo. O acorde do fim é o
// mesmo do começo.
//
// Os quadros vêm de src/ciencia/origem-votos-tempos.json, o mesmo arquivo que a composição lê:
// mudou a narração, gera os tempos de novo (scripts/tempos-origem-votos.mjs) e depois esta trilha.
//
//   node scripts/gerar-trilha-origem-votos.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-origem-votos.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/origem-votos-tempos.json", import.meta.url), "utf-8"));
const M = T.m, F = T.fala;
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 499205;
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
/** Gota: tom curto e agudo com queda de altura. */
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
const POUSO = M.dez + 8;
/**
 * Riser dos contadores como função de u (0 → 1 ao longo de τ de −45 até POUSO). Toca o pedaço
 * [u0, u1] a partir de t0: o fim toca 0 → 45/(45+POUSO) e o começo o resto, e as duas metades
 * formam a mesma subida quando o vídeo volta pro quadro 0.
 */
const riserContador = (t0, u0, u1, vol) => {
  const total = (T.retorno + POUSO) / FPS;
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
const G0 = T.grande[0].f, FIM = T.total - T.retorno;
const ACORDES = [
  [0, [P.A2, P.E3, P.C4]], [F.soma, [P.F3, P.A3, P.C4]], [M.tres, [P.C3, P.E3, P.G3]], [M.qual, [P.D3, P.F3, P.A3]],
  [M.secreto, [P.A2, P.E3, P.C4]], [M.comparando, [P.E3, P.G3, P.B3]], [F.eliminados, [P.F3, P.A3, P.C4]], [F.voltou, [P.C3, P.E3, P.G3]],
  [F.virada, [P.D3, P.F3, P.A3]], [M.sudeste, [P.E3, P.G3, P.B3]], [F.fecho, [P.F3, P.A3, P.C4]], [G0, [P.D3, P.F3, P.A3]], [FIM, [P.A2, P.E3, P.C4]],
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
  // "O voto é secreto": o pulso some por um instante
  if (t >= q(M.secreto) && t < q(M.ninguem + 14)) continue;
  soma(t, 0.3, 0.5, (u) => Math.sin(2 * Math.PI * 55 * u * (1 - 0.3 * u)) * Math.exp(-u * 14) * 0.22);
  if (Math.round(t * 2) % 2) estalo(t, 0.05, 0.65);
}

// Gancho e fim: os contadores correndo e o impacto quando pousam.
const uCorte = T.retorno / (T.retorno + POUSO);
riserContador(0, uCorte, 1, 0.28);
riserContador(q(FIM), 0, uCorte, 0.28);
for (let k = 0; k < POUSO; k += 2) tique(q(k), 0.22 + 0.1 * (k / POUSO), 0.4 + 0.2 * (k % 4 ? 1 : 0));
for (let k = FIM; k < T.total; k += 2) tique(q(k), 0.14 + 0.1 * ((k - FIM) / T.retorno), 0.4 + 0.2 * (k % 4 ? 1 : 0));
grave(P.A1, q(POUSO), 0.9);
sino(P.A5, q(POUSO + 1), 0.1);

// Trocas de cena.
for (const c of T.cenas) whoosh(q(c), 0.32);

// Soma.
sino(P.E5, q(M.f37), 0.08, 0.6);
grave(P.A1, q(M.t14), 0.7); sino(P.C5, q(M.t14 + 2), 0.08);
sino(P.C5, q(M.p74), 0.07, 0.4); sino(P.E5, q(M.p26), 0.07, 0.6);

// As três torneiras: três gotas descendo, e o total fechando.
for (const [de, fq] of [[M.n93, 1250], [M.n3, 1500], [M.n18, 1750]]) {
  grave(P.A1, q(de), 0.4, 0.9);
  for (let k = 0; k < 5; k++) gota(q(de + 2 + k * 3), fq - k * 70, 0.09, 0.35 + 0.1 * k);
}
const d14 = T.digita.find((d) => d.id === "n14");
grave(P.A1, q(d14.ate), 0.8); sino(P.A5, q(d14.ate + 1), 0.11);

// A pergunta e o voto secreto.
sino(P.C5, q(M.qual + 4), 0.1);
grave(P.A1, q(M.secreto), 0.9);
sino(P.E4, q(M.secreto + 2), 0.09);

// As 499 mil seções acendendo e voando pras curvas.
for (let k = 0; k < 18; k++) gota(q(M.comparando + k * 3), 1300 + 60 * (k % 5), 0.05, 0.3 + 0.4 * (k % 2));
riser(q(M.cresceu - 8), q(M.forte), 0.22);
grave(P.A1, q(M.forte), 0.5);
grave(P.A1, q(M.estimativa - 4), 0.8); sino(P.E5, q(M.estimativa - 2), 0.11);

// Eliminados e quem voltou: um estalo e um sino em cada barra, os dois lados iguais.
for (const de of [M.n70, M.n50, M.n58, M.quase, M.n63, M.n82]) { estalo(q(de - 2), 0.5, 0.5); sino(P.C5, q(de), 0.075, 0.45); }
sino(P.E5, q(M.n37), 0.07, 0.6);
grave(P.A1, q(M.tambem), 0.45);

// Virada: riser que estoura no Sudeste.
sino(P.E4, q(M.nordeste), 0.07, 0.6);
riser(q(M.nordeste + 2), q(M.sudeste), 0.3);
grave(P.A1, q(M.sudeste), 1); sino(P.B3 * 2, q(M.sudeste + 2), 0.12);
sino(P.C5, q(M.p43), 0.08, 0.4); sino(P.E5, q(M.p38), 0.08, 0.6);
grave(P.A1, q(M.sp), 0.6);
grave(P.A1, q(M.p21), 0.7); sino(P.A5, q(M.p21 + 2), 0.1);

// Fecho: os pontos acendendo, os dois com o mesmo som.
for (const de of [M.n976, M.n798]) for (let i = 0; i < 28; i++) gota(q(de - 2 + i), 1400 + 40 * (i % 6), 0.05, 0.3 + 0.4 * (i % 2));
sino(P.C5, q(M.todo), 0.09);
sino(P.A5, q(T.grande.at(-1).f), 0.08);

// Números digitados: um tique por caractere.
for (const d of T.digita) {
  const passo = (d.ate - d.de) / d.texto.length;
  for (let k = 0; k < d.texto.length; k++) if (d.texto[k] !== " ") tique(q(d.de + k * passo), 0.32, 0.4 + 0.2 * (k % 2));
}

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
