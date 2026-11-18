// Trilha do reel da Voyager 1 a um dia-luz (ciencia/Voyager), por baixo da narração. Sintetizada, como as
// outras: uso comercial resolvido e cada som no quadro da cena.
//
// Colchão de acordes longos (espaço, sem pulso marcado); tique-taque do relógio correndo no gancho e na
// volta do fim; "ping" de sonar quando o pulso de luz sai da Terra e em cada parada da corrida (Lua, Sol,
// Netuno, Voyager); whoosh nas trocas de cena; um sino só no Pale Blue Dot. O acorde do fim é o do começo,
// pro loop emendar.
//
//   node scripts/gerar-trilha-voyager.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-voyager.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/voyager-tempos.json", import.meta.url), "utf-8"));
const M = T.m, F = T.fala, C = T.cena;
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 1977;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    if (i0 + i < 0) continue;
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};
const P = { D2: 73.42, A2: 110, Bb2: 116.54, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, Bb3: 233.08, C4: 261.63, D4: 293.66, F4: 349.23, A4: 440, D5: 587.33, A5: 880 };

const sino = (fq, t0, vol, pan = 0.5) => soma(t0, 3, pan, (t) =>
  (Math.sin(2 * Math.PI * fq * t) + 0.35 * Math.sin(2 * Math.PI * fq * 2.76 * t) * Math.exp(-t * 3))
  * Math.exp(-t * 1.4) * (1 - Math.exp(-t * 400)) * vol);
const grave = (fq, t0, vol, dur = 1.8) => soma(t0, dur, 0.5, (t) =>
  Math.sin(2 * Math.PI * fq * t * (1 - 0.2 * t / dur)) * Math.exp(-t * 2) * (1 - Math.exp(-t * 300)) * vol);
/** Ping de sonar: senoide aguda com cauda longa e um eco. */
const ping = (t0, vol, fq = 1320, pan = 0.5) => {
  for (const [atraso, g] of [[0, 1], [0.32, 0.35], [0.64, 0.12]]) {
    soma(t0 + atraso, 1.4, atraso ? 1 - pan : pan, (t) => Math.sin(2 * Math.PI * fq * t) * Math.exp(-t * 5) * (1 - Math.exp(-t * 600)) * vol * g);
  }
};
const tique = (t0, vol, pan, fq = 2400) => {
  let ant = 0;
  soma(t0, 0.03, pan, (t) => {
    const r = rnd() * 2 - 1, hp = r - ant; ant = r;
    return (hp * 0.6 * Math.exp(-t * 500) + Math.sin(2 * Math.PI * fq * t) * 0.35 * Math.exp(-t * 300)) * vol;
  });
};
const whoosh = (t0, vol, dur = 0.45) => {
  let y = 0;
  soma(t0 - dur * 0.6, dur, 0.5, (t, D) => {
    const u = t / D, a = 0.02 + 0.3 * Math.sin(Math.PI * u) ** 2;
    y += a * ((rnd() * 2 - 1) - y);
    return y * Math.sin(Math.PI * u) ** 1.5 * vol;
  });
};
const riser = (t0, t1, vol) => {
  let y = 0;
  soma(t0, t1 - t0, 0.5, (t, D) => {
    const u = t / D, a = 0.01 + 0.3 * u * u;
    y += a * ((rnd() * 2 - 1) - y);
    return (y * 0.6 + Math.sin(2 * Math.PI * (400 + 1200 * u * u) * t) * 0.2) * u ** 2 * vol;
  });
};

// Colchão em ré menor, que troca com as cenas.
const ACORDES = [
  [0, [P.D3, P.A3, P.F4]], [F.dialuz, [P.Bb2, P.F3, P.D4]], [C.corrida.de, [P.C3, P.G3, P.E3]], [M.netuno, [P.A2, P.E3, P.C4]],
  [C.longe.de, [P.Bb2, P.F3, P.D4]], [C.bolha.de, [P.F3, P.A3, P.C4]], [C.ponto.de, [P.D3, P.A3, P.F4]],
  [C.pergunta.de, [P.Bb2, P.F3, P.D4]], [T.fim, [P.D3, P.A3, P.F4]],
];
ACORDES.forEach(([de, notas], k) => {
  const t0 = q(de), t1 = k + 1 < ACORDES.length ? q(ACORDES[k + 1][0]) : DUR;
  notas.forEach((fq, j) => soma(t0, t1 - t0 + 0.5, j % 2 ? 0.65 : 0.35, (t, D) => {
    const env = (k === 0 ? 1 : Math.min(1, t / 0.4)) * (k === ACORDES.length - 1 ? 1 : Math.min(1, (D - t) / 0.5));
    const trem = 1 + 0.15 * Math.sin(2 * Math.PI * 0.25 * t + j);
    return (Math.sin(2 * Math.PI * fq * t) + 0.4 * Math.sin(2 * Math.PI * fq * 2.004 * t)) * 0.5 * env * trem * 0.085;
  }));
});
// Grave contínuo bem baixo, pra dar fundo.
soma(0, DUR, 0.5, (t) => Math.sin(2 * Math.PI * P.D2 * t) * 0.05 * (1 + 0.3 * Math.sin(2 * Math.PI * 0.1 * t)));

for (const c of T.cenas) whoosh(q(c), 0.28);

// Gancho: o pulso já saiu no quadro 0, o relógio corre (tique rápido), a resposta volta.
ping(0, 0.35, 1320, 0.4);
for (let g = 0; g < F.dialuz - 2; g += 3) tique(q(g), 0.14, 0.4 + 0.2 * ((g / 3) % 2));
ping(q(M.resposta), 0.25, 990, 0.6);
grave(P.D2 * 2, q(M.sexta), 0.8);
// Dia-luz: o instante e as 24 horas de ida e volta.
sino(P.D5, q(M.dialuz), 0.08);
riser(q(M.h24 - 12), q(M.chegar), 0.18);
grave(P.D2 * 2, q(M.mais24), 0.6);
// Corrida: um ping por parada, cada vez mais grave (mais longe).
ping(q(M.luz), 0.25, 1760);
ping(q(M.segundo), 0.3, 1320, 0.35);
ping(q(M.minutos), 0.3, 1100, 0.6);
ping(q(M.horas), 0.3, 880, 0.4);
ping(q(C.longe.de - 10), 0.35, 660, 0.5);
// Longe: a régua estica e o número cai.
riser(q(F.longe), q(M.seis), 0.2);
grave(P.D2 * 2, q(M.bilhoes), 0.8);
// Bolha: a sonda sai, cruza a borda em 2012.
grave(P.D2 * 2, q(M.a2012), 0.7); sino(P.A4, q(M.a2012 + 2), 0.07, 0.6);
// O ponto: silêncio quase, um sino.
sino(P.A5, q(M.terraP), 0.07, 0.5);
// Pergunta e volta: o relógio volta a correr pro loop.
ping(q(T.fim), 0.35, 1320, 0.4);
for (let g = T.fim; g < T.total - 1; g += 3) tique(q(g), 0.14, 0.4 + 0.2 * ((g / 3) % 2));

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
