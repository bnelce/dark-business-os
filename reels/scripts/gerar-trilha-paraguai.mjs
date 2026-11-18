// Trilha do reel do Ueno Bank no Paraguai (ciencia/Paraguai), por baixo da narração. Sintetizada,
// como as outras: uso comercial resolvido e cada som no quadro da cena.
//
// Colchão contínuo com pulso grave do quadro 0 ao fim (a composição toca a 0.3); whoosh em cada troca
// de cena (T.cenas); um "bip de recusa" (dois tons descendo) no app, no cartão e na agência; impactos
// graves nos números que a voz diz; tiques nos contadores e nas barras; um tom que desce quando o
// índice de solvência cai abaixo da metade do mínimo. Sem som de sirene, de caixa registradora ou de
// multidão: o assunto é sério e é de outro país. O acorde do fim é o mesmo do começo, pro loop emendar.
//
// Os quadros vêm de src/ciencia/paraguai-tempos.json, o mesmo arquivo que a composição lê: mudou a
// narração, gera os tempos de novo e depois esta trilha (o audio-paraguai.mjs faz as duas coisas).
//
//   node scripts/gerar-trilha-paraguai.mjs <saída.wav>
import { readFileSync, writeFileSync } from "node:fs";

const SAIDA = process.argv[2];
if (!SAIDA) throw new Error("uso: gerar-trilha-paraguai.mjs <saída.wav>");

const T = JSON.parse(readFileSync(new URL("../src/ciencia/paraguai-tempos.json", import.meta.url), "utf-8"));
const M = T.m, F = T.fala, C = T.cena;
const FPS = 30, SR = 44100, DUR = T.total / FPS;
const q = (quadro) => quadro / FPS;
const n = Math.floor(SR * DUR);
const L = new Float32Array(n), R = new Float32Array(n);

let semente = 1102;
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
const tique = (t0, vol, pan, fq = 1900) => {
  let ant = 0;
  soma(t0, 0.03, pan, (t) => {
    const r = rnd() * 2 - 1, hp = r - ant; ant = r;
    return (hp * 0.7 * Math.exp(-t * 500) + Math.sin(2 * Math.PI * fq * t) * 0.35 * Math.exp(-t * 260)) * vol;
  });
};
const whoosh = (t0, vol, dur = 0.42) => {
  let y = 0;
  soma(t0 - dur * 0.6, dur, 0.5, (t, D) => {
    const u = t / D, a = 0.02 + 0.35 * Math.sin(Math.PI * u) ** 2;
    y += a * ((rnd() * 2 - 1) - y);
    return y * Math.sin(Math.PI * u) ** 1.5 * vol;
  });
};
/** Vento: ruído com passa-baixa que oscila; `env(u)` dá o volume ao longo do trecho. */
const vento = (t0, t1, vol, env) => {
  let y = 0;
  soma(t0, t1 - t0, 0.5, (t, D) => {
    const u = t / D, a = 0.012 + 0.01 * Math.sin(2 * Math.PI * 0.7 * t) ** 2;
    y += a * ((rnd() * 2 - 1) - y);
    return y * 6 * env(u) * vol;
  });
};
/** Chuva miúda: estalos curtos e aleatórios. */
const chuva = (t0, t1, vol, densidade = 40) => {
  for (let t = t0; t < t1; t += 1 / densidade) estalo(t + rnd() / densidade, vol * (0.4 + 0.6 * rnd()), 0.2 + 0.6 * rnd());
};
const riser = (t0, t1, vol) => {
  let y = 0;
  soma(t0, t1 - t0, 0.5, (t, D) => {
    const u = t / D, a = 0.01 + 0.4 * u * u;
    y += a * ((rnd() * 2 - 1) - y);
    return (y * 0.8 + Math.sin(2 * Math.PI * (300 + 900 * u * u) * t) * 0.25) * u ** 2 * vol;
  });
};

/** Bip de recusa: dois tons curtos descendo, como um terminal negando a operação. */
const recusa = (t0, vol, pan = 0.5) => {
  for (const [dt, fq] of [[0, 880], [0.12, 587]]) {
    soma(t0 + dt, 0.11, pan, (t, D) => (Math.sin(2 * Math.PI * fq * t) + 0.3 * Math.sin(2 * Math.PI * fq * 3 * t)) * Math.min(1, t / 0.005) * Math.min(1, (D - t) / 0.02) * vol);
  }
};
/** Tom que desce (a solvência caindo). */
const desce = (t0, dur, vol) => soma(t0, dur, 0.5, (t, D) => Math.sin(2 * Math.PI * (520 - 340 * (t / D)) * t) * Math.sin(Math.PI * t / D) * vol);

// Colchão: acordes longos em ré menor que trocam com as cenas, e um pulso grave a 120 bpm.
const G0 = T.grande[0].f;
const ACORDES = [
  [0, [P.D3, P.F3, P.A3]], [C.pessoas.de, [P.A2, P.E3, P.C4]], [C.deposito.de, [P.F3, P.A3, P.C4]], [C.resolucao.de, [P.D3, P.F3, P.A3]],
  [C.cobertura.de, [P.C3, P.E3, P.G3]], [M.mas, [P.E3, P.G3, P.B3]], [C.senado.de, [P.D3, P.F3, P.A3]], [F.defesa, [P.A2, P.E3, P.C4]],
  [G0, [P.F3, P.A3, P.C4]], [T.fim, [P.D3, P.F3, P.A3]],
];
ACORDES.forEach(([de, notas], k) => {
  const t0 = q(de), t1 = k + 1 < ACORDES.length ? q(ACORDES[k + 1][0]) : DUR;
  notas.forEach((fq, j) => soma(t0, t1 - t0 + 0.4, j % 2 ? 0.62 : 0.38, (t, D) => {
    const env = (k === 0 ? 1 : Math.min(1, t / 0.25)) * (k === ACORDES.length - 1 ? 1 : Math.min(1, (D - t) / 0.4));
    return (Math.sin(2 * Math.PI * fq * t) + 0.5 * Math.sin(2 * Math.PI * fq * 2.003 * t)) * 0.5 * env * 0.09;
  }));
});
for (let t = 0; t < DUR - 0.2; t += 0.5) {
  soma(t, 0.3, 0.5, (u) => Math.sin(2 * Math.PI * 55 * u * (1 - 0.3 * u)) * Math.exp(-u * 14) * 0.22);
}

// Trocas de cena.
for (const c of T.cenas) whoosh(q(c), 0.3);

// O app, o cartão, a agência: três recusas. O número, um impacto.
recusa(q(M.app), 0.16, 0.4); recusa(q(M.cartao), 0.16, 0.5); recusa(q(M.agencia), 0.16, 0.6);
riser(q(M.paraguai - 6), q(M.milhoes), 0.2);
grave(P.A1, q(M.milhoes), 0.9); sino(P.D3 * 4, q(M.milhoes + 1), 0.08);
// Clientes × habitantes: as barras crescem com tiques.
for (let k = 0; k < 2; k++) tique(q(C.pessoas.de + 8 + k * 10), 0.3, 0.4 + 0.2 * k, 1700 + 200 * k);
grave(P.D2, q(M.m65), 0.6);
// Depósitos: o contador e a grade.
grave(P.A1, q(M.b28), 0.8);
for (let k = 0; k < 9; k++) tique(q(M.um + k * 1.5), 0.22, 0.3 + 0.05 * k, 2100);
sino(P.A4, q(M.dez), 0.1);
// Resolução: o selo do BCP, a solvência caindo abaixo da metade.
grave(P.D2, q(M.central), 0.6);
desce(q(M.capital), q(M.metade + 6) - q(M.capital), 0.07);
grave(P.A1, q(M.metade), 0.9);
// Cobertura: 97% dos clientes e, na virada, 30% do dinheiro.
sino(P.E5, q(M.p97), 0.1); grave(P.A1, q(M.p97), 0.6);
grave(P.D2, q(M.mas), 1.0, 2.0);
sino(P.C5, q(M.p30), 0.1); grave(P.A1, q(M.p30), 0.7);
sino(P.A4, q(M.previdencia), 0.06, 0.6);
// Senado: a linha dos 4 dias e o placar.
for (let k = 0; k < 5; k++) tique(q(C.senado.de + 4 + k * 4), 0.28, 0.3 + 0.1 * k, 1500 + 120 * k);
grave(P.A1, q(M.p44), 0.9); sino(P.E5, q(M.p44 + 1), 0.08);
// Acusação e defesa: o mesmo som pros dois cartões.
sino(P.A4, q(M.nega), 0.07, 0.35); sino(P.A4, q(M.defesa), 0.07, 0.65);
sino(P.A5, q(T.grande.at(-1).f), 0.08); // "primeiro?"

// Contadores: tiques enquanto o número corre.
for (const c of T.contas) for (let g = c.de; g < c.ate; g += c.passo) tique(q(g), 0.2, 0.4 + 0.2 * (g % 2));

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
