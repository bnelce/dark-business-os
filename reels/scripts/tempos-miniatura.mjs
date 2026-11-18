// Linha do tempo do reel "Brasil em miniatura" (ciencia/BrasilMiniatura), em quadros a
// 30fps, a partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada
// palavra (palavras.json, do Whisper, scripts/palavras-dolar.mjs). A composição e a trilha
// (gerar-trilha-miniatura.mjs) leem o mesmo arquivo: mudou a narração, roda isto de novo.
//
//   node scripts/tempos-miniatura.mjs <pasta do reel> src/ciencia/brasil-miniatura-tempos.json
//
// Lê <pasta>/roteiro.json e <pasta>/audio/proc/{duracoes,palavras}.json. Gera:
//   fala     quadro em que cada fala começa (a fala k é public/ciencia/miniatura/beat-<k>.mp3)
//   legendas blocos de 2 a 4 palavras sincronizados com a voz (BLOCOS abaixo), com a
//            palavra-chave marcada; os blocos com § viram a pergunta grande do fim
//   grande   as palavras da pergunta final, uma a uma, no quadro em que a voz diz cada uma
//   m        instantes em que a animação reage à voz ("52,6", "Mossoró", "67"...)
//   digita   números digitados na tela (a trilha põe um tique em cada caractere)
//   cenas    trocas de cena (a trilha põe um whoosh em cada uma)
//   colapso  quadros do mapa encolhendo até Ananindeua: no gancho e no fim, pro loop emendar
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-miniatura.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem o mapa encolhendo e o "24 anos"; a voz entra logo
const PAUSA = 5; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "prova", "historico", "ranking", "pergunta", "paradoxo", "termometro", "minas", "estados", "final"];
// Quadros que a animação precisa, mesmo que a fala acabe antes (as 27 miniaturas voam pra lista).
const MINIMO = { estados: 80 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que
// sai como pergunta grande no palco em vez de legenda. Sem as marcas, o texto tem que ser
// igual à narração do roteiro (o script confere).
const BLOCOS = {
  gancho: "Existe uma cidade | que vota igual | ao Brasil | há *24 anos*.",
  prova: "*Ananindeua*, | no Pará. | No segundo turno, | deu *52,6* | a 47,4. | O Brasil, | *51,8* | a 48,2.",
  historico: "E não foi | sorte | de uma eleição. | Em sete | segundos turnos | desde 2002, | ficou em média | a *1,7 ponto* | do país.",
  ranking: "É a *primeira* | entre *5.563* | cidades. | Errou o vencedor | uma vez só, | em *2022*, | por *meio ponto*.",
  pergunta: "Então *Ananindeua* | é um Brasil | em *miniatura*?",
  paradoxo: "No Censo, | *não*. | É bem mais parda | e mais evangélica | que o país. | A cidade | mais parecida | com o Brasil | no Censo | é *Mossoró*, | e ela votou | *quase 12 pontos* | fora.",
  termometro: "Parecer com o país | *não é* | votar como ele. | E o *termômetro* | de uma eleição | costuma errar | na seguinte: | *Pedreira*, | em São Paulo, | acertou 2002 | em cheio | e em 2026 | ficou *23 pontos* | longe.",
  minas: "Tem até estado | com fama | de termômetro: | quem ganhou | em *Minas* | ganhou o Brasil | nas *sete* eleições. | Das *107* cidades | que acertaram | todas, | *67* são mineiras.",
  estados: "E cada estado | tem a sua | *miniatura*.",
  final: "A do seu estado | tá na *legenda*. | §A sua cidade | §vota como | §o *Brasil?*",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Tempo (s) de cada palavra do roteiro. O Whisper escreve diferente ("52 6", "Moçoró"),
 * então a palavra k do roteiro recebe o tempo do ponto equivalente no texto transcrito,
 * medido em letras e algarismos acumulados (o mesmo método do tempos-dolar.mjs).
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
  const beat = roteiro.beats.find((x) => x.id === id);
  const tr = transcritas.find((x) => x.id === id);
  fala[id] = f;
  dur[id] = Math.ceil(b.duracao * FPS);
  palavras[id] = alinhar(beat.narracao, tr.palavras).map((p) => ({ w: p.w, f: f + Math.round(p.s * FPS), fe: f + Math.round(p.e * FPS) }));
  f += Math.max(dur[id], MINIMO[id] ?? 0) + PAUSA;
}
const fimFala = fala.final + dur.final;

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
  g24: em("gancho", "24"),
  turno: em("prova", "segundo"),
  a526: em("prova", "52,6"),
  a474: em("prova", "47,4"),
  brasil: em("prova", "Brasil,"),
  b518: em("prova", "51,8"),
  b482: em("prova", "48,2."),
  sorte: em("historico", "sorte"),
  sete: em("historico", "sete"),
  h2002: em("historico", "2002,"),
  media: em("historico", "média"),
  h17: em("historico", "1,7"),
  primeira: em("ranking", "primeira"),
  n5563: em("ranking", "5.563"),
  errou: em("ranking", "Errou"),
  r2022: em("ranking", "2022,"),
  meio: em("ranking", "meio"),
  miniatura: em("pergunta", "miniatura?"),
  censo: em("paradoxo", "Censo,"),
  nao: em("paradoxo", "não."),
  parda: em("paradoxo", "parda"),
  evangelica: em("paradoxo", "evangélica"),
  mossoro: em("paradoxo", "Mossoró,"),
  votou: em("paradoxo", "votou"),
  p12: em("paradoxo", "12"),
  termometro: em("termometro", "termômetro"),
  pedreira: em("termometro", "Pedreira,"),
  t2002: em("termometro", "2002"),
  cheio: em("termometro", "cheio"),
  t2026: em("termometro", "2026"),
  t23: em("termometro", "23"),
  minas: em("minas", "Minas"),
  sete2: em("minas", "sete"),
  m107: em("minas", "107"),
  m67: em("minas", "67"),
  miniatura2: em("estados", "miniatura."),
  legenda: em("final", "legenda."),
  sua: em("final", "sua"),
};

const digita = [
  { id: "a526", texto: "52,6", de: m.a526 - 2, ate: m.a526 + 10 },
  { id: "a474", texto: "47,4", de: m.a474 - 2, ate: m.a474 + 10 },
  { id: "b518", texto: "51,8", de: m.b518 - 2, ate: m.b518 + 10 },
  { id: "b482", texto: "48,2", de: m.b482 - 2, ate: m.b482 + 10 },
  { id: "h17", texto: "1,7", de: m.h17 - 2, ate: m.h17 + 8 },
  { id: "n5563", texto: "5.563", de: m.n5563 - 2, ate: m.n5563 + 14 },
  { id: "p12", texto: "11,9", de: m.p12 - 2, ate: m.p12 + 10 },
  { id: "t23", texto: "23", de: m.t23 - 2, ate: m.t23 + 5 },
  { id: "m67", texto: "67", de: m.m67 - 2, ate: m.m67 + 5 },
];

// O fim: a pergunta grande fica um instante, o mapa volta inteiro e encolhe até o ponto em
// que o quadro 0 está (o loop emenda); o CTA escrito ocupa o último 1,5s.
const COLAPSO_FIM = 45; // quadros do fim com o mapa encolhendo (τ de −45 a −1)
const COLAPSO_INICIO = m.g24 - 4; // o mapa vira um ponto quando a voz diz "24" (τ de 0 até aqui)
const cta = fimFala + 8;
const total = cta + 45;

const T = {
  fala, dur, m, digita, legendas, grande,
  cenas: [m.turno, fala.historico, fala.ranking, m.errou, fala.pergunta, fala.paradoxo, m.mossoro, m.termometro, fala.minas, fala.estados, grande[0].f, total - COLAPSO_FIM],
  colapso: { inicio: COLAPSO_INICIO, fim: COLAPSO_FIM },
  fimFala, cta, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
