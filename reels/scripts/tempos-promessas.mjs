// Linha do tempo do reel do termômetro das promessas (ciencia/Promessas), em quadros a 30fps, a
// partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra
// (palavras.json, do Whisper). A composição e a trilha (gerar-trilha-promessas.mjs) leem o mesmo
// arquivo: mudou uma fala, tudo se reposiciona. O audio-promessas.mjs já chama este script.
//
//   node scripts/tempos-promessas.mjs <pasta do reel> src/ciencia/promessas-tempos.json
//
// Antes de tudo, confere que cada número da fala existe em src/ciencia/promessas.json (a fonte
// única dos números da tela): se alguém mexer num lado só, o script para.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-promessas.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem o mercúrio subindo; a voz entra logo
const PAUSA = 4; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "cop", "atual", "otimista", "paris", "corte", "pergunta"];
// Quadros a mais depois da voz: as barras dos cortes ficam na tela pra dar tempo de ler.
const EXTRA = { corte: 15 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja). Sem as marcas, o texto
// tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "Mesmo se *cada país* | cumprir o que | *prometeu*, | o aquecimento | chega a *2,6 graus*.",
  cop: "É a conta | da ONU | pra *COP31*, | que abriu *hoje*. | E a OMM mostrou: | os últimos | *12 anos* | são os *mais quentes* | já medidos.",
  atual: "Mantidas as políticas | de *hoje*, | são *2,8 graus* | neste século.",
  otimista: "Com as *promessas* | e as metas | de *neutralidade*, | *2,1*.",
  paris: "*Paris* mira *1,5*. | Nem o cenário | mais *otimista* | chega lá.",
  corte: "No cenário | de *menor ultrapassagem* | de 1,5, | as emissões | teriam que cair | *18%* até 2030 | e *45%* até 2035. | As promessas cortam | *menos da metade*.",
  pergunta: "Você achava | que as *promessas* | já *seguravam* | o planeta | em *1,5*?",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
const D = JSON.parse(readFileSync(new URL("../src/ciencia/promessas.json", import.meta.url), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

// Números da fala contra o promessas.json.
const br = (n) => String(n).replace(".", ",");
const fala$ = (id) => roteiro.beats.find((b) => b.id === id).narracao;
const exige = (id, trecho) => { if (!fala$(id).includes(trecho)) throw new Error(`fala ${id} não diz "${trecho}" (promessas.json)`); };
const cen = (id) => D.cenarios.find((c) => c.id === id).c;
exige("gancho", `${br(cen("ndc"))} graus`);
exige("atual", `${br(cen("atual"))} graus`);
exige("otimista", br(cen("otimista")));
exige("paris", br(cen("paris")));
exige("cop", `${D.omm.anos} anos`);
for (const k of D.cortes) exige("corte", `${k.cenario}% até ${k.ano}`);
// "menos da metade": o máximo das NDCs tem que ficar abaixo de metade do corte do cenário.
for (const k of D.cortes) if (!(k.ndc[1] < k.cenario / 2)) throw new Error(`NDC de ${k.ano} não é menos da metade`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Tempo (s) de cada palavra do roteiro. O Whisper escreve diferente ("COP 31", "18 %"), então a
 * palavra k do roteiro recebe o tempo do ponto equivalente no texto transcrito, medido em letras e
 * algarismos acumulados (o mesmo método do tempos-binance.mjs).
 */
const alinhar = (narracao, ws) => {
  const rot = narracao.split(/\s+/);
  const lr = rot.map((w) => Math.max(1, norm(w).length));
  const lw = ws.map((w) => Math.max(1, norm(w.w).length));
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

const fala = {}, dur = {}, palavras = {};
let f = INICIO;
for (const id of ORDEM) {
  const b = falas.find((x) => x.id === id);
  const tr = transcritas.find((x) => x.id === id);
  fala[id] = f;
  dur[id] = Math.ceil(b.duracao * FPS);
  palavras[id] = alinhar(fala$(id), tr.palavras).map((p) => ({ w: p.w, f: f + Math.round(p.s * FPS), fe: f + Math.round(p.e * FPS) }));
  f += dur[id] + (EXTRA[id] ?? 0) + PAUSA;
}
const fimFala = fala.pergunta + dur.pergunta;

/** Quadro em que a voz diz `palavra` (a n-ésima vez) na fala `id`. */
const em = (id, palavra, n = 1) => {
  const alvo = norm(palavra);
  const achadas = palavras[id].filter((p) => norm(p.w) === alvo);
  if (achadas.length < n) throw new Error(`"${palavra}" não aparece ${n}× na fala ${id}`);
  return achadas[n - 1].f;
};

// Legendas: cada bloco vale do começo da 1ª palavra até o começo do próximo bloco.
const legendas = [];
for (const id of ORDEM) {
  const blocos = BLOCOS[id].split("|").map((s) => s.trim());
  const limpo = blocos.join(" ").replace(/\*/g, "");
  if (norm(limpo.replace(/\s/g, "")) !== norm(fala$(id).replace(/\s/g, ""))) throw new Error(`legenda de ${id} não bate com a narração:\n  ${limpo}\n  ${fala$(id)}`);
  let k = 0;
  for (const bloco of blocos) {
    const ws = bloco.split(/\s+/);
    if (ws.length > 4) throw new Error(`bloco com mais de 4 palavras: ${bloco}`);
    const ps = palavras[id].slice(k, k + ws.length);
    let dentro = false;
    const partes = ws.map((w) => {
      const abre = w.startsWith("*"), fecha = w.replace(/[.,:;?!]+$/, "").endsWith("*") || w.endsWith("*");
      if (abre) dentro = true;
      const parte = { t: w.replace(/\*/g, ""), chave: dentro };
      if (fecha) dentro = false;
      return parte;
    });
    legendas.push({ de: Math.max(0, ps[0].f - 2), partes, fim: ps.at(-1).fe });
    k += ws.length;
  }
}
for (let i = 0; i < legendas.length; i++) {
  const prox = legendas[i + 1];
  // dentro da mesma frase emenda no próximo; na troca de fala, some pouco depois da voz
  legendas[i].ate = prox && prox.de - legendas[i].fim < 20 ? prox.de : legendas[i].fim + 8;
  delete legendas[i].fim;
}
legendas[0].de = 0; // a 1ª legenda já está inteira no quadro 0

const m = {
  cada: em("gancho", "cada"),
  prometeu: em("gancho", "prometeu,"),
  aquecimento: em("gancho", "aquecimento"),
  g26: em("gancho", "2,6"),
  conta: em("cop", "conta"),
  onu: em("cop", "ONU"),
  cop31: em("cop", "COP31,"),
  hoje: em("cop", "hoje."),
  omm: em("cop", "OMM"),
  ultimos: em("cop", "últimos"),
  n12: em("cop", "12"),
  quentes: em("cop", "quentes"),
  medidos: em("cop", "medidos."),
  mantidas: em("atual", "Mantidas"),
  g28: em("atual", "2,8"),
  seculo: em("atual", "século."),
  promessas: em("otimista", "promessas"),
  neutralidade: em("otimista", "neutralidade,"),
  g21: em("otimista", "2,1."),
  paris: em("paris", "Paris"),
  g15: em("paris", "1,5."),
  otimista: em("paris", "otimista"),
  la: em("paris", "lá."),
  cenario: em("corte", "cenário"),
  ultrapassagem: em("corte", "ultrapassagem"),
  emissoes: em("corte", "emissões"),
  cair: em("corte", "cair"),
  p18: em("corte", "18%"),
  a2030: em("corte", "2030"),
  p45: em("corte", "45%"),
  a2035: em("corte", "2035."),
  promessasC: em("corte", "promessas"),
  metade: em("corte", "metade."),
  achava: em("pergunta", "achava"),
  promessasP: em("pergunta", "promessas"),
  seguravam: em("pergunta", "seguravam"),
  planeta: em("pergunta", "planeta"),
  q15: em("pergunta", "1,5?"),
};

// Depois da pergunta, o mercúrio desce até o nível do quadro 0 pro loop emendar, e o CTA escrito
// ocupa o último 1,5s.
const VOLTA = 40;
const cta = fimFala + 8;
const total = cta + VOLTA;
const fim = total - VOLTA;

const digita = [
  { id: "cop", texto: "COP31 · ANTÁLIA · 9/11", de: m.cop31 - 4, ate: m.cop31 + 14 },
  { id: "omm", texto: "ESTADO DO CLIMA 2026", de: m.omm - 2, ate: m.omm + 14 },
  { id: "esc", texto: "CENÁRIO DE MENOR\nULTRAPASSAGEM DE 1,5 °C", de: m.cenario - 2, ate: m.ultrapassagem + 16 },
];

// Contadores: o mercúrio correndo (a trilha põe tiques enquanto ele anda) e as barras crescendo.
const contas = [
  { id: "sobe26", de: 0, ate: m.g26 + 4, passo: 3 },
  { id: "sobe28", de: m.mantidas, ate: m.g28 + 4, passo: 2 },
  { id: "desce21", de: m.promessas - 2, ate: m.g21 + 4, passo: 2 },
  { id: "b18", de: m.p18 - 4, ate: m.p18 + 10, passo: 2 },
  { id: "b45", de: m.p45 - 4, ate: m.p45 + 12, passo: 2 },
  { id: "ndc", de: m.promessasC - 2, ate: m.promessasC + 12, passo: 2 },
];

const T = {
  fala, dur, m, digita, contas, legendas,
  cenas: [fala.cop, fala.atual, fala.corte, fala.pergunta, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
