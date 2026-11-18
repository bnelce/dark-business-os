// Trilha do reel do fogo no Ceará (ciencia/FogoCeara), agora com narração por cima.
// Sintetizada, como as outras: uso comercial resolvido e cada som no quadro da cena.
//
// Colchão grave em ré menor com brasa rala (o fogo "ainda nem começou"); um sino quando
// o laranja de out–dez acende no relógio; um tique por mês enquanto o ponteiro corre até
// hoje e um sino em "hoje"; a brasa adensa quando o ponteiro entra em novembro e
// dezembro; um clique por ano no mapa dos 23 anos e uma nota curta por município; um
// grave na barra de 2025; e o acorde abre em ré maior no fecho. Com voz por cima, menos
// eventos que na versão muda e nada sustentado no registro da fala; a composição toca a
// trilha a 0.22.
//
// Os quadros vêm de src/ciencia/fogo-ceara-tempos.json, o mesmo arquivo que a composição
// lê: mudou a narração, gera os tempos de novo e depois esta trilha.
//
//   node scripts/gerar-trilha-fogo-ce.mjs public/ciencia/trilha-fogo-ce.wav
//   ffmpeg -i public/ciencia/trilha-fogo-ce.wav -b:a 192k public/ciencia/trilha-fogo-ce.mp3
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-fogo-ce.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/fogo-ceara-tempos.json", import.meta.url), "utf-8"));
const F = T.fala;
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 2823;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    if (i0 + i < 0) continue;
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};
const colchao = (freqs, t0, dur, vol) => freqs.forEach((fq, k) => soma(t0, dur, k % 2 ? 0.6 : 0.4, (t, D) => {
  const env = Math.min(1, t / 1.5) * Math.min(1, (D - t) / 1.5);
  return (Math.sin(2 * Math.PI * fq * t) + Math.sin(2 * Math.PI * fq * 1.004 * t)) * 0.5 * env * vol;
}));
const sino = (fq, t0, vol, pan = 0.5) => soma(t0, 3, pan, (t) =>
  (Math.sin(2 * Math.PI * fq * t) + 0.35 * Math.sin(2 * Math.PI * fq * 2.76 * t) * Math.exp(-t * 3))
  * Math.exp(-t * 1.6) * (1 - Math.exp(-t * 400)) * vol);
const estalo = (t0, vol, pan) => {
  let y = 0;
  soma(t0, 0.02, pan, (t) => { y += 0.5 * ((rnd() * 2 - 1) - y); return y * Math.exp(-t * 300) * vol; });
};
const grave = (fq, t0, vol) => soma(t0, 2.5, 0.5, (t) => Math.sin(2 * Math.PI * fq * t * (1 - 0.15 * t / 2.5)) * Math.exp(-t * 1.4) * (1 - Math.exp(-t * 200)) * vol);

const P = { D2: 73.42, A2: 110, D3: 146.83, F3: 174.61, A3: 220, Fs3: 185, D4: 293.66, F4: 349.23, A4: 440, D5: 587.33, F5: 698.46, A5: 880 };

// Outubro: brasa rala sobre o colchão, até o relógio entrar.
colchao([P.D2, P.A2, P.D3], 0, q(T.mapa23 + 30), 0.15);
for (let t = 0; t < q(T.relogio); t += 0.02) if (rnd() < 0.03) estalo(t, 0.2, rnd());

// Relógio: sino quando out–dez acende ("86%").
sino(P.D5, q(T.pct86), 0.12);

// Ponteiro de 1/jan até hoje: um tique por mês, e o sino de "hoje".
const corre0 = F.hoje - 8, corre1 = T.hojeChega;
for (let m = 0; m < 10; m++) {
  const t = q(corre0) + (m / 10) * q(corre1 - corre0);
  soma(t, 0.05, 0.5, (tt) => Math.sin(2 * Math.PI * 2400 * tt) * Math.exp(-tt * 160) * 0.08);
}
sino(P.A5, q(T.hojeChega), 0.14);

// Ponteiro em novembro e dezembro: a brasa adensa.
const nd0 = q(F["nov-dez"] + 4), nd1 = q(T.pct67 + 20);
for (let t = nd0; t < nd1 + 1; t += 0.02) {
  const p = Math.min(1, (t - nd0) / (nd1 - nd0));
  if (rnd() < 0.04 + 0.4 * p) estalo(t, 0.24, rnd());
}

// 23 anos no mapa: um clique por ano; um sino curto por município citado.
const a0 = q(T.mapa23 + 20), a1 = q(F.sertao);
for (let a = 0; a < 23; a++) estalo(a0 + (a / 23) * (a1 - a0), 0.45, 0.3 + 0.4 * (a / 22));
colchao([P.D3, P.F3, P.A3], q(T.mapa23), q(T.fecho - T.mapa23 + 20), 0.1);
T.nomes.forEach((quadro, i) => sino([P.D5, P.F5, P.A4, P.D5, P.F5][i], q(quadro), 0.05, i % 2 ? 0.65 : 0.35));

// Tendência: grave quando a barra de 2025 termina de subir (15 + 22*6 + 22 quadros).
grave(P.D2 * 2, q(T.tendencia + 15 + 22 * 6 + 22), 0.45);

// Fecho: abre em ré maior.
colchao([P.D2, P.A2, P.D3, P.Fs3], q(T.fecho), DUR - q(T.fecho), 0.16);
sino(P.D5, q(F.fecho + 40), 0.14); // o dia 1 acende
sino(P.A4, q(T.marca), 0.13);

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
