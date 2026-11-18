// Trilha do reel da apuração do 2º turno (ciencia/Apuracao2Turno). Mesmo timbre da trilha
// do 1º turno (gerar-trilha-apuracao.mjs), mas aqui tem narração por cima: menos eventos,
// nada no registro da voz, e a composição toca a trilha mais baixa.
//
// Os quadros vêm de src/ciencia/apuracao-2turno-tempos.json, o mesmo arquivo que a
// composição lê: mudou a narração, gera os tempos de novo e depois esta trilha.
//
//   node scripts/gerar-trilha-apuracao-2turno.mjs public/ciencia/trilha-apuracao-2turno.wav
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-apuracao-2turno.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/apuracao-2turno-tempos.json", import.meta.url), "utf-8"));
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

const soma = (t0, dur, pan, fn) => {
  const i0 = Math.floor(t0 * SR), N = Math.floor(dur * SR);
  for (let i = 0; i < N && i0 + i < n; i++) {
    const s = fn(i / SR, N / SR);
    L[i0 + i] += s * (1 - pan); R[i0 + i] += s * pan;
  }
};

/** Colchão: duas senoides desafinadas por nota, ataque e saída lentos. */
const colchao = (freqs, t0, dur, vol) => {
  freqs.forEach((fq, k) => soma(t0, dur, k % 2 ? 0.6 : 0.4, (t, D) => {
    const env = Math.min(1, t / 1.5) * Math.min(1, (D - t) / 1.5);
    return (Math.sin(2 * Math.PI * fq * t) + Math.sin(2 * Math.PI * fq * 1.004 * t)) * 0.5 * env * vol;
  }));
};

const tique = (t0, vol) => soma(t0, 0.05, 0.5, (t) =>
  Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 160) * vol);

const sino = (fq, t0, vol, pan = 0.5) => soma(t0, 3, pan, (t) =>
  (Math.sin(2 * Math.PI * fq * t) + 0.35 * Math.sin(2 * Math.PI * fq * 2.76 * t) * Math.exp(-t * 3))
  * Math.exp(-t * 1.6) * (1 - Math.exp(-t * 400)) * vol);

/** Varredura de ruído filtrado (semente fixa: a trilha sai igual a cada geração). */
const varredura = (t0, dur, vol) => {
  let y = 0, a = 2026;
  const ruido = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  soma(t0, dur, 0.5, (t, D) => {
    const corte = 0.02 + 0.2 * Math.sin(Math.PI * t / D);
    y += corte * (ruido() - y);
    return y * Math.sin(Math.PI * t / D) * vol;
  });
};

const P = { A2: 110, C3: 130.81, E3: 164.81, G3: 196, A3: 220, C4: 261.63, E4: 329.63, G4: 392, A4: 440, C5: 523.25, E5: 659.25, A5: 880 };

// Apuração real e mapa: lá menor, relógio a cada segundo até a linha chegar a 100%.
colchao([P.A2, P.E3, P.A3], 0, q(T.sorteio + 30), 0.16);
for (let t = 0; t < q(T.fimReal); t += 1) tique(t, 0.07);
varredura(q(160), q(30), 0.35); // rebobina
sino(P.A5, q(T.virada1), 0.16, 0.4); // Flávio passa
sino(P.E5, q(T.virada2), 0.16, 0.6); // Lula volta

// Mapa: pontos acendendo viram notas curtas e esparsas.
const ARP = [P.A4, P.C5, P.E5, P.C5];
for (let k = 0, t = q(T.mapa + 30); t < q(T.fimMapa - 10); k++, t += 0.5) sino(ARP[k % ARP.length], t, 0.04, k % 2 ? 0.7 : 0.3);

// Sorteio: ruído subindo e descendo enquanto os pontos se misturam.
varredura(q(T.sorteio + 15), q(100), 0.45);

// Urnas sorteadas: tom parado, como a linha.
colchao([P.E3, P.A3, P.E4], q(T.sorteadas), q(T.conclusao - T.sorteadas + 20), 0.12);
[0, 1, 2, 3].forEach((i) => sino([P.A4, P.C5, P.E5, P.A5][i], q(T.amostras + 25 + i * 45), 0.1));

// Conclusão: resolve em dó maior e segura até o fim.
colchao([P.C3, P.G3, P.C4, P.E4], q(T.conclusao), DUR - q(T.conclusao), 0.17);
sino(P.C5, q(T.conclusao), 0.16);
sino(P.E5, q(T.cta), 0.12);
sino(P.G4, q(T.marca), 0.14);

// Fade final de 1,2s — o reel não é loop, cortar seco estalaria.
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
