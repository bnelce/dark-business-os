// Trilha do reel do Roadster (ciencia/Roadster). Sintetizada, como as outras: uso comercial
// resolvido e cada som no quadro da cena. Fica baixa (0.22) por baixo da narração.
//
// Chiado de ar (ruído filtrado) sempre que um jato está aceso, baque grave nos pousos, um
// tique por segundo no quarto de ar, zumbido de ventoinha na rampa e notas curtas nos
// números. Os quadros vêm de src/ciencia/roadster-tempos.json, o mesmo arquivo da composição.
//
//   node scripts/gerar-trilha-roadster.mjs public/ciencia/trilha-roadster.wav
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-roadster.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/roadster-tempos.json", import.meta.url), "utf-8"));
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 1510;
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
const baque = (t0, vol) => soma(t0, 1.2, 0.5, (t) => Math.sin(2 * Math.PI * 55 * t * (1 - 0.3 * t)) * Math.exp(-t * 4) * (1 - Math.exp(-t * 300)) * vol);
/** Chiado de ar comprimido: ruído com corte alto, ataque e soltura curtos. */
const chiado = (t0, dur, vol, pan = 0.5, cai = false) => {
  let y = 0;
  soma(t0, dur, pan, (t, D) => {
    y += 0.35 * ((rnd() * 2 - 1) - y);
    const env = Math.min(1, t / 0.05) * Math.min(1, (D - t) / 0.15) * (cai ? 1 - 0.85 * (t / D) : 1);
    return y * env * vol;
  });
};

const P = { E2: 82.41, B2: 123.47, E3: 164.81, G3: 196, B3: 246.94, E4: 329.63, G4: 392, B4: 493.88, D5: 587.33, E5: 659.25, B5: 987.77 };

// 1. salto: jato na decolagem e no pouso, baque no chão
colchao([P.E2, P.B2], 0, q(T.fala.bicos + 20), 0.12);
chiado(q(T.salto - 4), q(20), 0.5, 0.4);
chiado(q(T.salto + 34), q(22), 0.5, 0.6);
baque(q(T.salto + 52), 0.7);
sino(P.B4, q(T.pergunta), 0.12);

// 2. bicos e tanques
colchao([P.E3, P.B3], q(T.fala.bicos), q(T.fala.newton - T.fala.bicos), 0.08);
[0, 1, 2, 3].forEach((k) => sino(P.E5, q(T.dezBicos + k * 7.5), 0.07, 0.3 + k * 0.13));
sino(P.B5 / 2, q(T.quilos + 10), 0.12);
sino(P.E4, q(T.tanques), 0.1);

// 3. Newton: o jato fica aceso a cena toda
chiado(q(T.fala.newton), q(T.fala.vazao - T.fala.newton), 0.22);
sino(P.G4, q(T.som), 0.1);
sino(P.E4, q(T.empurra + 10), 0.1, 0.4);
sino(P.B3, q(T.flutuar + 10), 0.12, 0.6);

// 4. quarto de ar: um tique por segundo
colchao([P.E2, P.G3], q(T.fala.vazao), q(T.fala.tempo - T.fala.vazao), 0.1);
sino(P.D5, q(T.vazao), 0.12);
for (let f = T.cadaSegundo; f < T.fala.tempo - 10; f += 30) estalo(q(f), 0.5, 0.5);

// 5. o tanque esvazia, o carro cai, saltos
chiado(q(T.fala.tempo + 8), q(T.sete - T.fala.tempo - 3), 0.3, 0.5, true);
baque(q(T.sete + 17), 0.6);
[0, 1, 2].forEach((k) => sino(P.E5, q(T.saltos + 18 + k * 10), 0.08, 0.3 + k * 0.2));

// 6. giro: um par de jatos acelera, o oposto freia
const J0 = T.cantos + 15, J1 = J0 + 70, J2 = J1 + 46, J3 = J2 + 70;
colchao([P.E3, P.B3], q(T.fala.giro), q(T.fala.nuvem - T.fala.giro), 0.08);
chiado(q(J0), q(J1 - J0), 0.25, 0.3);
chiado(q(J2), q(J3 - J2), 0.25, 0.7);

// 7. nuvem: jato contínuo e brilhos quando condensa
chiado(q(T.fala.nuvem + 10), q(T.fala.teto - T.fala.nuvem - 10), 0.18);
[0, 1, 2, 3, 4].forEach((k) => sino(P.B5 - k * 60, q(T.condensa + 10 + k * 6), 0.05, 0.2 + k * 0.15));

// 8. rampa: zumbido de ventoinha, nota na pressão, e o colchão abre quando o ar segura
soma(q(T.ventoinhas), q(T.fala.cta - T.ventoinhas), 0.5, (t, D) => {
  const env = Math.min(1, t / 0.6) * Math.min(1, (D - t) / 0.8);
  return (Math.sin(2 * Math.PI * 110 * t) * 0.6 + Math.sin(2 * Math.PI * 220 * t) * 0.3) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 18 * t)) * env * 0.06;
});
sino(P.G4, q(T.pressao + 5), 0.12);
colchao([P.E2, P.B2, P.E3, P.G3], q(T.segura), DUR - q(T.segura), 0.14);
sino(P.B4, q(T.segura + 10), 0.1);

// fecho
sino(P.E5, q(T.marca), 0.13);

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
