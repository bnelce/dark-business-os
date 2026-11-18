// Linha do tempo da aula narrada de decibéis (ciencia/AulaDecibeis; material de estudo, não publicar), em quadros
// a 30fps, a partir da narração: duração de cada fala (audio/proc/duracoes.json) e tempo de cada palavra
// (audio/proc/palavras.json, Whisper). A composição e a trilha leem o mesmo arquivo. O audio-aula-decibeis.mjs
// já chama este script.
//
//   node scripts/tempos-aula-decibeis.mjs <pasta> src/ciencia/aula-decibeis-tempos.json
//
// Diferente da Voyager: os blocos da legenda saem sozinhos (até 4 palavras, quebra na pontuação) e a
// palavra-chave em laranja vem da lista CHAVES. Cada fala é uma cena (Sequence) com relógio próprio:
// `cena[id].de` é o quadro de início, e `pal[id]` traz as palavras em quadros LOCAIS da cena.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-aula-decibeis.mjs <pasta> <saída.json>");

const FPS = 30;
const INICIO = 20;
const PAUSA = 15; // respiro entre conceitos
const ANTES = 12; // a cena entra um pouco antes da voz
const ORDEM = ["gancho", "intensidade", "escala", "formula", "regua", "tabela", "dobro", "exemplo1", "exemplo2", "pegadinha", "questaoA", "questaoB", "resumo"];
// Quadros a mais depois da voz: tempo pra ler e anotar a conta antes da cena seguinte.
const EXTRA = { gancho: 15, intensidade: 30, escala: 20, formula: 35, regua: 25, tabela: 30, dobro: 30, exemplo1: 40, exemplo2: 35, pegadinha: 30, questaoA: 40, questaoB: 35 };
const SEGURA = 215; // o resumo fica parado ~7 s depois da última palavra

const CHAVES = {
  gancho: ["fraco", "longe", "energia", "espalhou"],
  intensidade: ["intensidade", "potência", "esfera", "dez", "cem"],
  escala: ["fraco", "dói", "doze", "trilhão", "logarítmica"],
  formula: ["beta", "log", "decibéis", "audição", "zero", "dor"],
  regua: ["sussurro", "trinta", "conversa", "sessenta", "noventa", "dor"],
  tabela: ["log", "razão", "dez", "cem", "mil", "dezenas"],
  dobro: ["dobrar", "dois", "três", "dobrou", "cem", "vinte"],
  exemplo1: ["potência", "cancela", "dez", "cem"],
  exemplo2: ["cem", "oitenta", "vinte", "sessenta", "conversa"],
  pegadinha: ["logarítmica", "não", "dobro", "mil", "dobra", "três"],
  questaoA: ["expoentes", "três", "trinta", "sussurro"],
  questaoB: ["trinta", "dezenas", "mil"],
  resumo: ["potência", "área", "quadrado", "log", "audição", "dor", "dobrou", "vinte"],
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

// O Whisper escreve números com algarismos ("10⁻¹²", "4π", "0,3", "1.000") e o roteiro, por extenso. O
// alinhamento é pela proporção de letras, então cada palavra do Whisper conta pelo tamanho falado dela.
const UN = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CT = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
const porExtenso = (n) => {
  if (n < 20) return UN[n];
  if (n < 100) return DZ[Math.floor(n / 10)] + (n % 10 ? ` e ${UN[n % 10]}` : "");
  if (n === 100) return "cem";
  if (n < 1000) return CT[Math.floor(n / 100)] + (n % 100 ? ` e ${porExtenso(n % 100)}` : "");
  if (n === 1000) return "mil";
  return String(n);
};
const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };
const falado = (w) => {
  let t = w.normalize("NFC").toLowerCase().replace(/₀/g, " zero").replace(/π/g, " pi ").replace(/[βΒ]/g, " beta ").replace(/²/g, " ao quadrado ");
  t = t.replace(/([0-9]+)([⁻⁰¹³⁴⁵⁶⁷⁸⁹]+)/g, (_, b, e) => {
    const x = [...e].map((c) => SUP[c]).join("");
    return `${b} elevado a ${x.startsWith("-") ? "menos " + x.slice(1) : x}`;
  });
  t = t.replace(/(\d)\.(\d{3})/g, "$1$2").replace(/(\d+),(\d+)/g, (_, a, b) => `${a} vírgula ${b}`).replace(/-(\d)/g, "menos $1");
  t = t.replace(/\d+/g, (d) => porExtenso(Number(d)));
  return t;
};
const tamFalado = (w) => Math.max(1, norm(falado(w).replace(/\s+/g, "")).length);

/** Tempo de cada palavra do roteiro, pelo ponto equivalente do texto do Whisper (mesmo método da Voyager). */
const alinhar = (narracao, ws) => {
  const rot = narracao.split(/\s+/);
  const lr = rot.map((w) => Math.max(1, norm(w).length));
  const lw = ws.map((w) => tamFalado(w.w));
  const totR = lr.reduce((a, b) => a + b, 0), totW = lw.reduce((a, b) => a + b, 0);
  const tempoEm = (c) => {
    let acc = 0;
    for (let i = 0; i < ws.length; i++) {
      if (c <= acc + lw[i] || i === ws.length - 1) return ws[i].s + (ws[i].e - ws[i].s) * Math.min(1, Math.max(0, (c - acc) / lw[i]));
      acc += lw[i];
    }
    return 0;
  };
  let acc = 0;
  return rot.map((w) => {
    const s = tempoEm((acc / totR) * totW);
    acc += Math.max(1, norm(w).length);
    const e = tempoEm((acc / totR) * totW);
    return { w, s, e };
  });
};

const fala = {}, dur = {}, abs = {};
let f = INICIO;
for (const id of ORDEM) {
  const b = falas.find((x) => x.id === id);
  const beat = roteiro.beats.find((x) => x.id === id);
  const tr = transcritas.find((x) => x.id === id);
  fala[id] = f;
  dur[id] = Math.ceil(b.duracao * FPS);
  abs[id] = alinhar(beat.narracao, tr.palavras).map((p) => ({ w: p.w, f: f + Math.round(p.s * FPS), fe: f + Math.round(p.e * FPS) }));
  f += dur[id] + (EXTRA[id] ?? 0) + PAUSA;
}
const fimFala = fala.resumo + dur.resumo;
const total = fimFala + SEGURA;

// Cenas: cada uma começa ANTES quadros antes da sua fala e vai até a próxima (com 10 de fusão).
const cena = {};
ORDEM.forEach((id, i) => {
  const de = i === 0 ? 0 : fala[id] - ANTES;
  const ate = i + 1 < ORDEM.length ? fala[ORDEM[i + 1]] - ANTES : total;
  cena[id] = { de, ate };
});

// Palavras em quadros locais da cena: { w (normalizada), f, fe }.
const pal = {};
for (const id of ORDEM) pal[id] = abs[id].map((p) => ({ w: norm(p.w), f: p.f - cena[id].de, fe: p.fe - cena[id].de }));

// Legenda: blocos de até 4 palavras, quebrando depois de pontuação.
const legendas = [];
for (const id of ORDEM) {
  const chaves = new Set(CHAVES[id].map(norm));
  const ws = abs[id];
  let bloco = [];
  const fecha = () => {
    if (!bloco.length) return;
    legendas.push({ de: Math.max(0, bloco[0].f - 2), fim: bloco.at(-1).fe, partes: bloco.map((p) => ({ t: p.w, chave: chaves.has(norm(p.w)) })) });
    bloco = [];
  };
  ws.forEach((p) => {
    bloco.push(p);
    const pont = /[.,:;?!]$/.test(p.w);
    if (pont || bloco.length === 4) fecha();
  });
  fecha();
}
for (let i = 0; i < legendas.length; i++) {
  const prox = legendas[i + 1];
  legendas[i].ate = prox && prox.de - legendas[i].fim < 20 ? prox.de : legendas[i].fim + 10;
  delete legendas[i].fim;
}

const T = { fala, dur, cena, pal, legendas, ordem: ORDEM, fimFala, total };
writeFileSync(SAIDA, `${JSON.stringify(T)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (fimFala / FPS)).toFixed(2)} palavras/s`);
console.log(ORDEM.map((id) => `${id} ${(cena[id].de / FPS).toFixed(1)}s`).join(" · "));
