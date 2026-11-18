// Trilha do reel do D-rex (ciencia/DRex). Sintetizada, como as outras: uso comercial
// resolvido e cada som no quadro da cena.
//
// Agora tem narração por cima: a composição toca a trilha baixa (0.22) e os eventos
// ficam esparsos. Um sopro crescente enquanto o asteroide cai e um impacto grave no
// chão; o colchão abre quando o ramo do D-rex se separa; uma nota por barra na régua (a
// do D-rex mais aguda); uma nota quando o fungo sai da raiz; vento na cena dos esporos;
// e o acorde resolve no fecho, com uma nota por ícone.
//
// Os quadros vêm de src/ciencia/drex-tempos.json, o mesmo arquivo que a composição lê:
// mudou a narração, gera os tempos de novo e depois esta trilha.
//
//   node scripts/gerar-trilha-drex.mjs public/ciencia/trilha-drex.wav
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-drex.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/drex-tempos.json", import.meta.url), "utf-8"));
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 6600;
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

// Queda do asteroide: ruído que abre e cresce até o chão, e o impacto grave.
{
  let y = 0;
  soma(q(T.fala.asteroide), q(T.impacto - T.fala.asteroide), 0.6, (t, D) => {
    const u = t / D, corte = 0.01 + 0.12 * u * u;
    y += corte * ((rnd() * 2 - 1) - y);
    return y * u * u * 1.6;
  });
}
grave(P.D2, q(T.impacto), 0.8);
estalo(q(T.impacto), 0.5, 0.5);
colchao([P.D2, P.A2], 0, q(T.escala + 20), 0.12);
colchao([P.D3, P.A3], q(T.separa), q(T.escala - T.separa), 0.1);

// Régua: celular, D-rex (chega aos 50 cm), recorde anterior.
sino(P.D4, q(T.escala + 30), 0.12, 0.35);
sino(P.A5, q(T.fala.altura + 110), 0.18, 0.65);
sino(P.F4, q(T.recorde + 35), 0.12, 0.5);
colchao([P.D3, P.F3, P.A3], q(T.escala), q(T.carvalho - T.escala + 20), 0.1);

// Carvalho: o fungo sai da raiz.
colchao([P.D3, P.A3], q(T.carvalho), q(T.porque - T.carvalho + 20), 0.1);
sino(P.D5, q(T.carvalho + 80), 0.12, 0.6);

// Esporos: sopro de vento que cresce quando entra o vento da estrutura alta.
{
  let y = 0;
  const D = q(T.grupo - T.porque);
  soma(q(T.porque), D, 0.5, (t) => {
    y += 0.03 * ((rnd() * 2 - 1) - y);
    const forte = Math.min(1, Math.max(0, (t - q(T.esporosAlto - T.porque)) / 1.5));
    return y * Math.min(1, t / 1.5) * Math.min(1, (D - t) / 1.5) * (0.7 + 0.9 * forte);
  });
}

// Fecho: resolve, uma nota por ícone (D-rex, pão, laranja) e a marca.
colchao([P.D2, P.A2, P.D3, P.Fs3], q(T.grupo), DUR - q(T.grupo), 0.16);
sino(P.D5, q(T.grupo + 40), 0.14);
sino(P.Fs3 * 2, q(T.grupo + 110), 0.1, 0.35);
sino(P.A4, q(T.grupo + 160), 0.1, 0.65);
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
