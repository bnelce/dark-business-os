// Trilha do showreel da Flor de Gostosura, sintetizada na mesma grade de tempo
// da animação (100 BPM = 0,6s por batida = 18 quadros a 30fps). Gerar em vez de
// licenciar resolve dois problemas de uma vez: não há dúvida de uso comercial, e
// a sincronia entre corte e ataque é exata por construção, não por detecção.
//
// Timbre: marimba suave (senoide com harmônico e decaimento rápido) sobre um
// colchão grave. Sem bateria — percussão brigaria com o tom caseiro da marca.
import { writeFileSync } from "node:fs";

const SR = 44100, DUR = 28, BPM = 100, BAT = 60 / BPM;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

const nota = (freq, t0, dur, vol, pan = 0.5) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 5.2) * (1 - Math.exp(-t * 260));
    const s = (Math.sin(2 * Math.PI * freq * t) + 0.33 * Math.sin(4 * Math.PI * freq * t)
             + 0.12 * Math.sin(6 * Math.PI * freq * t)) * env * vol;
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};

const grave = (freq, t0, dur, vol) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t * 6) * Math.exp(-t * 0.9);
    const s = (Math.sin(2 * Math.PI * freq * t) + 0.2 * Math.sin(4 * Math.PI * freq * t)) * env * vol;
    L[i0 + i] += s * 0.5; R[i0 + i] += s * 0.5;
  }
};

// Pentatônica maior de Dó — intervalos sem tensão, combina com "comer e ser feliz"
const P = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99 };
const motivo = [P.C5, P.E5, P.G4, P.A4, P.G5, P.E5, P.D5, P.C5];

for (let b = 0; b < 47; b++) {
  const t = b * BAT;
  // motivo em colcheias alternando o estéreo, mais denso nos trechos de diferencial
  const denso = b >= 20 && b < 37;
  nota(motivo[b % motivo.length], t, 1.2, 0.17, b % 2 ? 0.62 : 0.38);
  if (denso) nota(motivo[(b + 3) % motivo.length] * 2, t + BAT / 2, 0.7, 0.085, b % 2 ? 0.34 : 0.66);
  if (b % 4 === 0) grave([130.81, 164.81, 196.0, 174.61][(b / 4) % 4], t, 2.6, 0.22);
}

// fecho: acorde sustentado no último compasso
grave(130.81, 37 * BAT, 5.0, 0.26);
nota(P.C5, 37 * BAT, 3.2, 0.2, 0.5);
nota(P.E5, 37 * BAT + 0.08, 3.2, 0.15, 0.4);
nota(P.G5, 37 * BAT + 0.16, 3.2, 0.12, 0.6);

// fade de saída e normalização com folga
const fade = Math.floor(2.2 * SR);
let pico = 0;
for (let i = 0; i < n; i++) {
  if (i > n - fade) { const k = (n - i) / fade; L[i] *= k; R[i] *= k; }
  pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.82 / pico;

const buf = Buffer.alloc(44 + n * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVEfmt ", 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * g * 32767))), 44 + i * 4);
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * g * 32767))), 46 + i * 4);
}
writeFileSync("public/trilha-flor.wav", buf);
console.log(`trilha: ${DUR}s, ${BPM} BPM, batida a cada ${BAT.toFixed(2)}s (${Math.round(BAT * 30)} quadros)`);
