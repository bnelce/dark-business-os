// Linha do tempo do reel "De onde vieram os votos" (ciencia/OrigemVotos), em quadros a 30fps,
// a partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra
// (palavras.json, do Whisper, scripts/palavras-dolar.mjs). A composição e a trilha
// (gerar-trilha-origem-votos.mjs) leem o mesmo arquivo: mudou a narração, roda isto de novo.
//
//   node scripts/tempos-origem-votos.mjs <pasta do reel> src/ciencia/origem-votos-tempos.json
//
// Lê <pasta>/roteiro.json e <pasta>/audio/proc/{duracoes,palavras}.json. Gera:
//   fala     quadro em que cada fala começa (a fala k é public/ciencia/origem-votos/beat-<k>.mp3)
//   legendas blocos de 2 a 4 palavras sincronizados com a voz, com a palavra-chave marcada;
//            os blocos com § viram a pergunta grande do fim
//   grande   as palavras da pergunta final, uma a uma, no quadro em que a voz diz cada uma
//   m        instantes em que a animação reage à voz ("3,7", "secreto", "Sudeste"...)
//   digita   números digitados na tela (a trilha põe um tique em cada caractere)
//   cenas    trocas de cena (a trilha põe um whoosh em cada uma)
//   retorno  quadros do fim em que os contadores voltam a subir: emendam no quadro 0
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-origem-votos.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 0; // a voz começa no quadro 0, com os contadores já correndo
const PAUSA = { gancho: 1, soma: 4, torneiras: 5, limite: 6, eliminados: 6, voltou: 8, virada: 6, fecho: 0 }; // respiro depois de cada fala
const ORDEM = ["gancho", "soma", "torneiras", "limite", "eliminados", "voltou", "virada", "fecho"];

// "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que sai como
// pergunta grande no palco. Sem as marcas, o texto tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "O Lula ganhou | *10 milhões* de votos | em três semanas. | De onde eles *vieram?*",
  soma: "O *Flávio* ganhou *3,7*. | No total, | *14 milhões* de votos | entraram na disputa: | *74%* pro Lula, | *26%* pro Flávio.",
  torneiras: "Três *torneiras*: | *9,3 milhões* de votos | dos eliminados, | *3 milhões* a mais | de comparecimento, | *1,8 milhão* a menos | de branco e nulo. | Fecha *voto a voto*: | *14.098.232*.",
  limite: "Mas qual torneira | encheu *quem?* | O voto é *secreto*. | Ninguém sabe | quem votou em quem. | Comparando | *499 mil* seções, | o que cresceu | onde cada eliminado | era forte | dá uma *estimativa*.",
  eliminados: "Pela *estimativa*, | o saldo do Cury: | *70 a 91%* pro Lula. | Caiado: | *50 a 55%* pro Flávio. | Renan Santos: | *58 a 62%* pro Lula. | Zema: | *quase tudo* pro Flávio.",
  voltou: "Comparecimento a mais: | *63%* pro Lula, | *37* pro Flávio. | Branco e nulo | a menos: | *82 a 100%* pro Lula. | Também *estimativa*: | saldo, não pessoas.",
  virada: "Todo mundo olhou | pro Nordeste. | Mas a *maior mudança* | foi no Sudeste. | A margem andou | *6,7 milhões* de votos: | *43%* no Sudeste, | *38%* no Nordeste. | São Paulo sozinho, | *21%*.",
  fecho: "O Lula ganhou votos | em *97,6%* das seções. | O Flávio, | em *79,8%*. | Os dois subiram | quase em *todo lugar*. | §Qual dado | §da *sua cidade* | §você quer ver?",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Tempo (s) de cada palavra do roteiro. O Whisper escreve diferente do roteiro: expande
 * "14.098.232" em "14 milhões, 98 mil, 232", troca "Cury" por "Kuri". Em vez de só escalar as
 * letras, como o tempos-miniatura.mjs, aqui as palavras são alinhadas uma a uma (programação
 * dinâmica): a palavra que casa fica com o tempo dela, e o que não casa é interpolado entre as
 * vizinhas que casaram. Assim um número longo não empurra as palavras de antes dele.
 */
const parecida = (a, b) => {
  if (a === b) return 3;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return 1.5;
  let iguais = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) iguais++;
  return iguais / Math.max(a.length, b.length) >= 0.6 ? 1 : -1;
};
const alinhar = (narracao, bruto) => {
  const rot = narracao.split(/\s+/), R = rot.map(norm);
  // O Whisper quebra "9,3" em "9" e "3" e devolve o "%" como palavra vazia: junta de volta.
  const ws = [];
  for (const p of bruto) {
    const ant = ws.at(-1);
    if (!norm(p.w)) { if (ant) ant.e = Math.max(ant.e, p.e); continue; }
    if (ant && /^\d+$/.test(norm(ant.w)) && /^\d+$/.test(norm(p.w)) && R.includes(norm(ant.w) + norm(p.w))) ws[ws.length - 1] = { w: ant.w + p.w, s: ant.s, e: p.e };
    else ws.push({ ...p });
  }
  const W = ws.map((w) => norm(w.w));
  const n = R.length, m = W.length;
  const S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = 1; i <= n; i++) S[i][0] = -0.6 * i;
  for (let j = 1; j <= m; j++) S[0][j] = -0.6 * j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    S[i][j] = Math.max(S[i - 1][j - 1] + parecida(R[i - 1], W[j - 1]), S[i - 1][j] - 0.6, S[i][j - 1] - 0.6);
  }
  const par = new Array(n).fill(-1);
  for (let i = n, j = m; i > 0 && j > 0;) {
    if (S[i][j] === S[i - 1][j - 1] + parecida(R[i - 1], W[j - 1])) { if (parecida(R[i - 1], W[j - 1]) > 0) par[i - 1] = j - 1; i--; j--; }
    else if (S[i][j] === S[i - 1][j] - 0.6) i--;
    else j--;
  }
  const saida = rot.map((w, i) => ({ w, s: par[i] >= 0 ? ws[par[i]].s : null, e: par[i] >= 0 ? ws[par[i]].e : null }));
  for (let i = 0; i < n; i++) {
    if (saida[i].s !== null) continue;
    let a = i - 1; while (a >= 0 && saida[a].e === null) a--;
    let b = i; while (b < n && saida[b].s === null) b++;
    const t0 = a >= 0 ? saida[a].e : ws[0].s, t1 = b < n ? saida[b].s : ws.at(-1).e;
    const ate = b - a - 1, pos = i - a - 1;
    saida[i].s = t0 + ((t1 - t0) * pos) / ate;
    saida[i].e = t0 + ((t1 - t0) * (pos + 1)) / ate;
  }
  return saida;
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
  f += dur[id] + PAUSA[id];
}
const fimFala = fala.fecho + dur.fecho;

/** Quadro em que a voz diz `palavra` (a n-ésima vez) na fala `id`. */
const em = (id, palavra, n = 1) => {
  const alvo = norm(palavra);
  const achadas = palavras[id].filter((p) => norm(p.w) === alvo);
  if (achadas.length < n) throw new Error(`"${palavra}" não aparece ${n}× na fala ${id}`);
  return achadas[n - 1].f;
};

// Legendas: cada bloco vale do começo da 1ª palavra até o começo do próximo bloco.
const legendas = [];
const grande = []; // { t, chave, f, l }: l é a linha da pergunta (um bloco § por linha)
let linhaGrande = 0;
for (const id of ORDEM) {
  const blocos = BLOCOS[id].split("|").map((s) => s.trim());
  const limpo = blocos.join(" ").replace(/[*§]/g, "");
  const narr = roteiro.beats.find((x) => x.id === id).narracao;
  if (norm(limpo.replace(/\s/g, "")) !== norm(narr.replace(/\s/g, ""))) throw new Error(`legenda de ${id} não bate com a narração:\n  ${limpo}\n  ${narr}`);
  let k = 0;
  for (const bloco of blocos) {
    const ehGrande = bloco.startsWith("§");
    const bl = bloco.replace(/^§/, "");
    const n = bl.split(/\s+/).length;
    const ps = palavras[id].slice(k, k + n);
    let dentro = false;
    const partes = bl.split(/\s+/).map((w, j) => {
      const abre = w.startsWith("*"), fecha = w.replace(/[.,:;?!]+$/, "").endsWith("*");
      if (abre) dentro = true;
      const parte = { t: w.replace(/\*/g, ""), chave: dentro };
      if (fecha) dentro = false;
      if (ehGrande) grande.push({ ...parte, f: ps[j].f, l: linhaGrande });
      return parte;
    });
    if (ehGrande) linhaGrande++;
    if (!ehGrande) legendas.push({ de: Math.max(0, ps[0].f - 2), partes, fim: ps.at(-1).fe });
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
  dez: em("gancho", "10"),
  vieram: em("gancho", "vieram?"),
  flavio: em("soma", "Flávio"),
  f37: em("soma", "3,7."),
  total: em("soma", "total,"),
  t14: em("soma", "14"),
  p74: em("soma", "74%"),
  p26: em("soma", "26%"),
  tres: em("torneiras", "Três"),
  n93: em("torneiras", "9,3"),
  n3: em("torneiras", "3"),
  n18: em("torneiras", "1,8"),
  fecha: em("torneiras", "Fecha"),
  n14: em("torneiras", "14.098.232."),
  qual: em("limite", "qual"),
  quem: em("limite", "quem?"),
  secreto: em("limite", "secreto."),
  ninguem: em("limite", "Ninguém"),
  comparando: em("limite", "Comparando"),
  n499: em("limite", "499"),
  cresceu: em("limite", "cresceu"),
  forte: em("limite", "forte"),
  estimativa: em("limite", "estimativa."),
  cury: em("eliminados", "Cury:"),
  n70: em("eliminados", "70"),
  caiado: em("eliminados", "Caiado:"),
  n50: em("eliminados", "50"),
  renan: em("eliminados", "Renan"),
  n58: em("eliminados", "58"),
  zema: em("eliminados", "Zema:"),
  quase: em("eliminados", "quase"),
  comp: em("voltou", "Comparecimento"),
  n63: em("voltou", "63%"),
  n37: em("voltou", "37"),
  bn: em("voltou", "Branco"),
  n82: em("voltou", "82"),
  tambem: em("voltou", "Também"),
  saldo: em("voltou", "saldo,"),
  nordeste: em("virada", "Nordeste."),
  mas: em("virada", "Mas"),
  sudeste: em("virada", "Sudeste."),
  margem: em("virada", "margem"),
  n67: em("virada", "6,7"),
  p43: em("virada", "43%"),
  p38: em("virada", "38%"),
  sp: em("virada", "São"),
  p21: em("virada", "21%."),
  n976: em("fecho", "97,6%"),
  flavio2: em("fecho", "Flávio,"),
  n798: em("fecho", "79,8%."),
  dois: em("fecho", "dois"),
  todo: em("fecho", "todo"),
};

const digita = [
  { id: "n14", texto: "14.098.232", de: m.n14 + 6, ate: Math.min(m.n14 + 44, fala.limite - 2) },
  { id: "n499", texto: "499.205", de: m.n499 - 2, ate: m.n499 + 18 },
  { id: "n67", texto: "6,7", de: m.n67 - 2, ate: m.n67 + 8 },
  { id: "n976", texto: "97,6%", de: m.n976 - 2, ate: m.n976 + 14 },
  { id: "n798", texto: "79,8%", de: m.n798 - 2, ate: m.n798 + 14 },
];

// O fim: a pergunta grande fica um instante, os retratos voltam com os contadores subindo de
// zero até o ponto em que o quadro 0 está (o loop emenda); o CTA escrito ocupa o último 1,5s.
const RETORNO = 45; // quadros do fim com os contadores subindo (τ de −45 a −1)
const cta = fimFala + 18;
const total = cta + 45;

const T = {
  fala, dur, m, digita, legendas, grande,
  cenas: [fala.soma, m.tres, m.qual, m.secreto, m.comparando, fala.eliminados, fala.voltou, fala.virada, m.sudeste, m.margem, m.sp, fala.fecho, grande[0].f, total - RETORNO],
  retorno: RETORNO,
  fimFala, cta, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s · "3,7" falado em ${(m.f37 / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
console.log(Object.entries(m).map(([k, v]) => `${k} ${(v / FPS).toFixed(2)}`).join(" · "));
const semPar = ORDEM.flatMap((id) => palavras[id].filter((p) => p.fe <= p.f).map((p) => `${id}:${p.w}`));
if (semPar.length) console.log("palavras sem duração:", semPar.join(" "));
