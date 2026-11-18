// Trilha do reel da prova de Pitágoras (L23PitagorasProva). 1100 quadros a 30fps =
// 38,333s. Sintetizada em vez de licenciada: resolve uso comercial e deixa a batida
// cair junto com os cortes, por construção.
//
// Timbre de marimba sobre colchão, igual ao do showreel da Flor — é o som que combina
// com a identidade de papel creme. A harmonia resolve na nota tônica no momento em que
// a conclusão entra na tela (F[5] = quadro 880 = 29,33s), porque o fecho da música tem
// que coincidir com o fecho do argumento.
import { writeFileSync } from "node:fs";

const SR = 44100, DUR = 1150 / 30, BPM = 96, BAT = 60 / BPM;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

const nota = (freq, t0, dur, vol, pan = 0.5) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 4.4) * (1 - Math.exp(-t * 280));
    const s = (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(4 * Math.PI * freq * t)
             + 0.1 * Math.sin(6 * Math.PI * freq * t)) * env * vol;
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};

const grave = (freq, t0, dur, vol) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t * 5) * Math.min(1, (N - i) / (SR * 0.6)) * Math.exp(-t * 0.25);
    const s = (Math.sin(2 * Math.PI * freq * t) + 0.2 * Math.sin(4 * Math.PI * freq * t)) * env * vol;
    L[i0 + i] += s * 0.5; R[i0 + i] += s * 0.5;
  }
};

const P = { C3: 130.81, G3: 196.0, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99 };
const motivo = [P.C5, P.G4, P.A4, P.E5, P.D5, P.G4, P.C5, P.E4];

const batidas = Math.floor(DUR / BAT);
for (let k = 0; k < batidas; k++) {
  const t = k * BAT;
  nota(motivo[k % motivo.length], t, 1.5, 0.26, k % 2 ? 0.62 : 0.38);
  if (k % 4 === 0) nota(motivo[(k + 3) % motivo.length] * 0.5, t, 2.2, 0.14, 0.5);
}

// Colchão: tônica até a conclusão, depois sobe pra oitava e sustenta até o fim.
const CONCLUSAO = 880 / 30;
grave(P.C3, 0, CONCLUSAO, 0.3);
grave(P.C4, CONCLUSAO, DUR - CONCLUSAO, 0.3);
grave(P.G3, CONCLUSAO, DUR - CONCLUSAO, 0.16);

// Fade final de 1,2s — o reel não é loop, então cortar seco estalaria.
const fade = Math.floor(1.2 * SR);
for (let i = 0; i < fade; i++) {
  const g = i / fade;
  L[n - 1 - i] *= g; R[n - 1 - i] *= g;
}

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
writeFileSync("/tmp/trilha-pitagoras.wav", Buffer.concat([cab, buf]));
console.log(`trilha de ${DUR.toFixed(3)}s (pico ${pico.toFixed(3)}, ganho ${g.toFixed(3)})`);
