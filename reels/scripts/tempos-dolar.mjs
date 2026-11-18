// Linha do tempo do reel do dólar v2 (ciencia/Dolar), em quadros a 30fps, a partir da
// narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra (palavras.json,
// do Whisper, scripts/palavras-dolar.mjs). A composição e a trilha (gerar-trilha-dolar.mjs)
// leem o mesmo arquivo: mudou a narração, roda isto de novo e as duas acompanham.
//
//   node scripts/tempos-dolar.mjs <pasta do reel> src/ciencia/dolar-tempos.json
//
// Lê <pasta>/roteiro.json e <pasta>/audio/v2/{duracoes,palavras}.json. Gera:
//   fala     quadro em que cada fala começa (a fala k é public/ciencia/dolar/beat-<k>.mp3)
//   legendas blocos de 2 a 4 palavras sincronizados com a voz (BLOCOS abaixo), com a
//            palavra-chave marcada
//   m        instantes em que a animação reage à voz ("5,40", "segunda", "quintilhões"...)
//   digita   números digitados na tela (a trilha põe um tique em cada caractere)
//   cenas    trocas de cena (a trilha põe um whoosh em cada uma)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-dolar.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 3; // o quadro 0 já tem movimento; a voz entra logo
const PAUSA = 5; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "promessa", "focus", "sismografo", "eleicoes", "ranking", "pergunta", "espera", "extremos", "cauda", "palpite"];
// Quadros que a animação precisa, mesmo que a fala acabe antes.
const MINIMO = { eleicoes: 130, pergunta: 75 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja). Sem as marcas,
// o texto tem que ser igual à narração do roteiro (o script confere).
const BLOCOS = {
  gancho: "O dólar subiu | *9,2%* | em um dia.",
  promessa: "Pela curva do sino, | isso não devia | acontecer | nem *uma vez* | na idade | do *universo*.",
  focus: "Na sexta, | o boletim *Focus*, | do Banco Central, | previa dólar a *5,05* | no fim do ano. | O palpite mais alto, | entre *112* bancos | e consultorias, | era *5,40*. | Na segunda, | a cotação oficial | bateu *5,50*.",
  sismografo: "Cada traço | é um dia | de cotação oficial, | desde *1999*. | Esse é *segunda*, | o primeiro pregão | depois do | *segundo turno*.",
  eleicoes: "*Nenhum* dia | depois de | segundo turno, | desde 2002, | chegou *perto*.",
  ranking: "No geral, | só *dois dias* | foram piores: | a saída do | *câmbio fixo*, | em 1999, | e a *crise* | de 2008.",
  pergunta: "Então qual é | a *chance* | de um dia assim?",
  espera: "Pela curva normal, | uma vez a cada | *29 quintilhões* | de anos.",
  extremos: "Só que, | desde 1999, | foram *18 dias* | que a curva | chamaria de | *impossíveis*. | Ela previa | praticamente *zero*.",
  cauda: "Isso tem nome: | *cauda pesada*. | Modelo de risco | que usa | a curva do sino | *subestima* | as crises.",
  palpite: "Na terça, | o dólar já voltou | pra *5,33*. | Até dezembro, | ele chega nos | *5,05* | que o mercado previa? | Deixa seu *palpite*, | que em dezembro | a gente confere.",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/v2/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/v2/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Tempo (s) de cada palavra do roteiro. O Whisper escreve diferente ("9.2%", "nenhuma"),
 * então a palavra k do roteiro recebe o tempo do ponto equivalente no texto transcrito,
 * medido em letras e algarismos acumulados.
 */
const alinhar = (narracao, ws) => {
  const rot = narracao.split(/\s+/);
  const lr = rot.map((w) => Math.max(1, norm(w).length));
  const lw = ws.map((w) => Math.max(1, norm(w.w).length));
  const totR = lr.reduce((a, b) => a + b, 0), totW = lw.reduce((a, b) => a + b, 0);
  const tempoEm = (c) => { // c em letras do Whisper
    let acc = 0;
    for (let i = 0; i < ws.length; i++) {
      if (c <= acc + lw[i] || i === ws.length - 1) return ws[i].s + (ws[i].e - ws[i].s) * Math.min(1, Math.max(0, (c - acc) / lw[i]));
      acc += lw[i];
    }
    return 0;
  };
  let acc = 0;
  return rot.map((w, k) => {
    const s = tempoEm((acc / totR) * totW);
    acc += lr[k];
    const e = tempoEm((acc / totR) * totW);
    return { w, s, e };
  });
};

const fala = {}, dur = {}, palavras = {};
let f = INICIO;
for (const id of ORDEM) {
  const b = falas.find((x) => x.id === id);
  const beat = roteiro.beats.find((x) => x.id === id);
  const tr = transcritas.find((x) => x.id === id);
  fala[id] = f;
  dur[id] = Math.ceil(b.duracao * FPS);
  palavras[id] = alinhar(beat.narracao, tr.palavras).map((p) => ({ w: p.w, f: f + Math.round(p.s * FPS), fe: f + Math.round(p.e * FPS) }));
  f += Math.max(dur[id], MINIMO[id] ?? 0) + PAUSA;
}
const fimFala = fala.palpite + dur.palpite;

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
  const narr = roteiro.beats.find((x) => x.id === id).narracao;
  if (norm(limpo.replace(/\s/g, "")) !== norm(narr.replace(/\s/g, ""))) throw new Error(`legenda de ${id} não bate com a narração:\n  ${limpo}\n  ${narr}`);
  let k = 0;
  for (const bl of blocos) {
    const n = bl.split(/\s+/).length;
    const ps = palavras[id].slice(k, k + n);
    // marca a chave palavra por palavra (uma chave pode ter mais de uma palavra)
    let dentro = false;
    const partes = bl.split(/\s+/).map((w) => {
      const abre = w.startsWith("*"), fecha = w.replace(/[.,:;?!]+$/, "").endsWith("*");
      if (abre) dentro = true;
      const parte = { t: w.replace(/\*/g, ""), chave: dentro };
      if (fecha) dentro = false;
      return parte;
    });
    legendas.push({ de: ps[0].f - 2, partes, fim: ps.at(-1).fe });
    k += n;
  }
}
for (let i = 0; i < legendas.length; i++) {
  const prox = legendas[i + 1];
  // dentro da mesma frase emenda no próximo; na troca de fala, some pouco depois da voz
  legendas[i].ate = prox && prox.de - legendas[i].fim < 20 ? prox.de : legendas[i].fim + 8;
  delete legendas[i].fim;
}

const m = {
  pico: 8, // a pena chega no topo de 26/10
  sino: em("promessa", "sino"),
  universo: em("promessa", "acontecer"),
  vez: em("promessa", "vez"),
  f505: em("focus", "5,05"),
  alto: em("focus", "alto"),
  f540: em("focus", "5,40"),
  f550: em("focus", "5,50"),
  segunda: em("sismografo", "segunda"),
  pregao: em("sismografo", "depois"), // o zoom dos 12 pregões entra aqui
  e2026: fala.eleicoes + 4, // 2026 sobe primeiro e fica a fala inteira na tela
  fixo: em("ranking", "fixo"),
  crise: em("ranking", "crise"),
  chance: em("pergunta", "chance"),
  normal: em("espera", "normal"),
  cada: em("espera", "cada"),
  quint: em("espera", "quintilhões"),
  n18: em("extremos", "18"),
  impossiveis: em("extremos", "impossíveis"),
  zero: em("extremos", "zero"),
  pesada: em("cauda", "pesada"),
  modelo: em("cauda", "Modelo"),
  f533: em("palpite", "5,33"),
  p505: em("palpite", "5,05"),
  palpite: em("palpite", "palpite"),
};

const ANOS = "29.000.000.000.000.000.000";
const digita = [
  // o contador termina de ser digitado exatamente no "quintilhões"
  { id: "anos", texto: ANOS, de: m.normal + 6, ate: m.quint },
  { id: "18", texto: "18", de: m.n18 - 2, ate: m.n18 + 4 },
  { id: "previsto", texto: "0,004", de: m.zero - 4, ate: m.zero + 8 },
];

const cta = fimFala + 4;
const loop = fimFala + 12; // volta pro quadro do gancho (a pena no pico), pra emendar no começo
const total = cta + 45; // CTA escrito nos últimos 1,5s

const T = {
  fala, dur, m, digita, legendas,
  cenas: [fala.promessa, fala.focus, fala.sismografo, m.segunda, fala.eleicoes, fala.ranking, fala.pergunta, fala.extremos, m.modelo, fala.palpite, loop],
  fimFala, cta, loop, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
