// Trilha do reel do pêndulo (L22PenduloEnergiaPT), sintetizada na grade da animação:
// período de 4s, 8 ciclos, 32s. Gerar em vez de licenciar resolve o uso comercial e
// torna a sincronia exata por construção.
//
// A batida vem da própria física: uma nota em cada extremo do balanço (t = 0, 2, 4…,
// onde θ = ±θ₀ e a energia é toda potencial), panorâmica alternando com o lado em que
// a bola está. O colchão grave respira no mesmo período.
//
// Toda escrita no buffer é CIRCULAR (índice % n). Sem isso a cauda da última nota é
// cortada no fim do arquivo e o loop estala — com isso ela reaparece no começo, e o
// áudio fecha o loop exatamente como o vídeo fecha no quadro 960.
import { writeFileSync } from "node:fs";

const SR = 44100, PERIODO = 4, CICLOS = 8, DUR = PERIODO * CICLOS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

/** Sino/marimba com decaimento longo, escrito em círculo. */
const sino = (freq, t0, dur, vol, pan = 0.5) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 1.9) * (1 - Math.exp(-t * 320));
    const s = (Math.sin(2 * Math.PI * freq * t)
             + 0.28 * Math.sin(4 * Math.PI * freq * t)
             + 0.08 * Math.sin(6 * Math.PI * freq * t)) * env * vol;
    const k = (i0 + i) % n;
    L[k] += s * (1 - pan); R[k] += s * pan;
  }
};

/** Colchão grave contínuo, amplitude respirando no período do pêndulo. */
const colchao = (freq, vol) => {
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const resp = 0.72 + 0.28 * Math.cos((2 * Math.PI * t) / PERIODO) ** 2;
    const s = (Math.sin(2 * Math.PI * freq * t) + 0.22 * Math.sin(4 * Math.PI * freq * t)) * resp * vol;
    L[i] += s * 0.5; R[i] += s * 0.5;
  }
};

// Pentatônica menor de Lá — fecha com o visual escuro; a maior soaria infantil aqui.
const P = { A2: 110.0, A3: 220.0, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, E5: 659.25 };

// Frequência do colchão fixa na fundamental: é o "total" que nunca muda, que é a tese do reel.
colchao(P.A2, 0.17);

// Um extremo a cada meio período. O motivo tem 8 notas e o ciclo de panorâmica tem 2,
// então o padrão só se repete de verdade a cada 4 períodos — evita soar mecânico em 32s.
const motivo = [P.A4, P.C5, P.E4, P.G4, P.A3, P.E5, P.D4, P.C4];
const extremos = (DUR / PERIODO) * 2; // 16
for (let k = 0; k < extremos; k++) {
  const t = k * (PERIODO / 2);
  // k par = bola num extremo, k ímpar = no outro. Casa com sin(θ) na tela.
  const pan = k % 2 === 0 ? 0.74 : 0.26;
  sino(motivo[k % motivo.length], t, 2.6, 0.3, pan);
  // harmônico uma oitava acima, bem baixo, só pra dar brilho de vidro
  sino(motivo[k % motivo.length] * 2, t, 1.1, 0.075, pan);
}

// Normaliza com folga de 1.5 dB — estourar no encoder soaria pior que estar baixo.
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

writeFileSync("/tmp/trilha-pendulo.wav", Buffer.concat([cab, buf]));
console.log(`trilha de ${DUR}s escrita (pico original ${pico.toFixed(3)}, ganho ${g.toFixed(3)})`);
