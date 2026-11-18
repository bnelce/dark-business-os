// Linha do tempo do reel do roubo da Binance (ciencia/Binance), em quadros a 30fps, a partir
// da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra (palavras.json,
// do Whisper). A composição e a trilha (gerar-trilha-binance.mjs) leem o mesmo arquivo: mudou
// uma fala, tudo se reposiciona. O audio-binance.mjs já chama este script.
//
//   node scripts/tempos-binance.mjs <pasta do reel> src/ciencia/binance-tempos.json
//
// Gera:
//   fala     quadro em que cada fala começa (a fala k é public/ciencia/binance/beat-<k>.mp3)
//   legendas blocos de 2 a 4 palavras (BLOCOS abaixo), com a palavra-chave marcada; os blocos com
//            § viram a pergunta grande do fim
//   grande   as palavras da pergunta final, uma a uma, no quadro em que a voz diz cada uma
//   m        instantes em que a animação reage à voz
//   digita   textos digitados na tela (a trilha põe um tique em cada caractere)
//   contas   contadores (a trilha põe tiques enquanto o número corre)
//   relogio  os minutos do relógio de 17h20 a 17h24, no gancho e voltando no fim
//   cenas    trocas de cena (a trilha põe um whoosh em cada uma)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-binance.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem o logo tremendo e o relógio correndo; a voz entra logo
const PAUSA = 5; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "tamanho", "fortaleza", "cofre", "ataque", "misterio", "padrao", "cauda", "congelar", "bitcoin", "quem", "pergunta"];
// Quadros a mais depois da voz: a cauda pesada precisa ficar na tela, com a LuBian legendada.
const EXTRA = { cauda: 42 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que sai
// como pergunta grande no palco. Sem as marcas, o texto tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "*Menos de quatro minutos.* | *Dois bilhões e meio* | de dólares. | Numa transação.",
  tamanho: "É o *maior roubo* | de cripto | já registrado: | *6,4 bilhões*, | pela conta | da Elliptic. | Na Binance, | na quinta.",
  fortaleza: "Em 2005, | o furto | ao Banco Central | de *Fortaleza* | rendeu | *3,5 toneladas* | de notas. | Corrigido | pela inflação, | esse é | *mais de 60 vezes* | maior.",
  cofre: "O alvo foi | a carteira *quente*, | a parte conectada | que paga | os *saques*.",
  ataque: "Às *17h20*, | uma transação levou | *50 autorizações* | em nome | da carteira. | *Uma valeu*, | e ela passou | a obedecer | um programa | dos *invasores*.",
  misterio: "A Binance diz | que não achou | evidência de vazamento | da *chave*. | Como essas autorizações | foram assinadas, | ela *ainda não* | explicou.",
  padrao: "E é a *regra*: | sem contar | esse caso, | *62%* do dinheiro | de *quase 1.300* | ataques | saiu por chave, | sistema | ou gente enganada.",
  cauda: "O ataque *típico* | leva *menos de* | *1 milhão* | de dólares. | Esse sozinho | é *quase um quarto* | de tudo. | Isso é | *cauda pesada*.",
  congelar: "Aí veio | a *virada*. | A Tether travou | *1,2 bilhão* | *37 minutos* depois | de o dinheiro chegar. | Já são | *44%* travados, | quase tudo | em *dólar digital*, | que tem empresa | por trás.",
  bitcoin: "*Bitcoin* não tem | esse botão. | Dos 18 mil roubados, | até agora | *nenhum* foi travado.",
  quem: "O *FBI* atribuiu | o roubo | à *Coreia do Norte*. | A Binance diz | ter reposto *95%*.",
  pergunta: "Bitcoin nasceu | sem *botão de travar*. | O do dólar digital | travou | *quase 3 bilhões*. | Mas quem tem | o botão | decide | o que *trava*. | §Você daria | §esse *botão* | §a alguém?",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Tempo (s) de cada palavra do roteiro. O Whisper escreve diferente ("1300", "US$ 1 milhão"), então a
 * palavra k do roteiro recebe o tempo do ponto equivalente no texto transcrito, medido em letras e
 * algarismos acumulados (o mesmo método do tempos-miniatura.mjs).
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
    const ws = bl.split(/\s+/);
    if (ws.length > 4) throw new Error(`bloco com mais de 4 palavras: ${bl}`);
    const ps = palavras[id].slice(k, k + ws.length);
    let dentro = false;
    const partes = ws.map((w, j) => {
      const abre = w.startsWith("*"), fecha = w.replace(/[.,:;?!]+$/, "").endsWith("*") || w.endsWith("*");
      if (abre) dentro = true;
      const parte = { t: w.replace(/\*/g, ""), chave: dentro };
      if (fecha) dentro = false;
      if (ehGrande) grande.push({ ...parte, f: ps[j].f, l: linhaGrande });
      return parte;
    });
    if (ehGrande) linhaGrande++;
    else legendas.push({ de: Math.max(0, ps[0].f - 2), partes, fim: ps.at(-1).fe });
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
  dois: em("gancho", "Dois"),
  numa: em("gancho", "Numa"),
  transacao: em("gancho", "transação."),
  maior: em("tamanho", "maior"),
  b64: em("tamanho", "6,4"),
  elliptic: em("tamanho", "Elliptic."),
  binance: em("tamanho", "Binance,"),
  quinta: em("tamanho", "quinta."),
  furto: em("fortaleza", "furto"),
  rendeu: em("fortaleza", "rendeu"),
  ton: em("fortaleza", "3,5"),
  corrigido: em("fortaleza", "Corrigido"),
  vezes: em("fortaleza", "60"),
  quente: em("cofre", "quente,"),
  conectada: em("cofre", "conectada"),
  saques: em("cofre", "saques."),
  h1720: em("ataque", "17h20,"),
  a50: em("ataque", "50"),
  carteira: em("ataque", "carteira."),
  uma: em("ataque", "Uma", 2),
  programa: em("ataque", "programa"),
  invasores: em("ataque", "invasores."),
  evidencia: em("misterio", "evidência"),
  chave: em("misterio", "chave."),
  como: em("misterio", "Como"),
  ainda: em("misterio", "ainda"),
  regra: em("padrao", "regra:"),
  contar: em("padrao", "contar"),
  p62: em("padrao", "62%"),
  n1300: em("padrao", "1.300"),
  pchave: em("padrao", "chave,"),
  sistema: em("padrao", "sistema"),
  gente: em("padrao", "gente"),
  tipico: em("cauda", "típico"),
  menos: em("cauda", "menos"),
  milhao: em("cauda", "milhão"),
  esse: em("cauda", "Esse"),
  quarto: em("cauda", "quarto"),
  cauda: em("cauda", "cauda"),
  virada: em("congelar", "virada."),
  tether: em("congelar", "Tether"),
  b12: em("congelar", "1,2"),
  m37: em("congelar", "37"),
  p44: em("congelar", "44%"),
  digital: em("congelar", "digital,"),
  empresa: em("congelar", "empresa"),
  m18: em("bitcoin", "18"),
  nenhum: em("bitcoin", "nenhum"),
  coreia: em("quem", "Coreia"),
  binance2: em("quem", "Binance"),
  p95: em("quem", "95%."),
  dolar: em("pergunta", "dólar"),
  travou: em("pergunta", "travou"),
  q3: em("pergunta", "3"),
  mas: em("pergunta", "Mas"),
  decide: em("pergunta", "decide"),
  trava: em("pergunta", "trava."),
};

const digita = [
  { id: "t35", texto: "3,5 TONELADAS", de: m.ton - 2, ate: m.ton + 15 },
  { id: "x60", texto: "MAIS DE 60×", de: m.vezes - 6, ate: m.vezes + 8 },
  { id: "a50", texto: "50 ASSINATURAS,", de: m.a50 - 2, ate: m.a50 + 16 },
  { id: "v1", texto: "1 VALEU", de: m.uma - 1, ate: m.uma + 9 },
  { id: "m1", texto: "MENOS DE US$ 1 MI", de: m.menos - 2, ate: m.milhao + 4 },
  { id: "b12", texto: "US$ 1,2 BI", de: m.b12 - 2, ate: m.b12 + 12 },
  { id: "btc", texto: "18.270 BTC", de: m.m18 - 2, ate: m.m18 + 12 },
];

// Depois da pergunta, o quadro da abertura volta: o relógio retrocede até o quadro 0 pro loop
// emendar, e o CTA escrito ocupa o último 1,5s.
const VOLTA = 45;
const cta = fimFala + 8;
const total = cta + VOLTA;
const fim = total - VOLTA;

// O relógio marca só a transação de 2,5 bi (17h20 → 17h24), não o começo do roubo.
const RELOGIO_ATE = m.numa + 4;
const minutos = (de, ate) => [1, 2, 3, 4].map((k) => Math.round(de + ((ate - de) * k) / 4));

const contas = [
  { id: "c25", de: 0, ate: RELOGIO_ATE + 6, passo: 3 },
  { id: "c64", de: m.b64 - 2, ate: m.b64 + 12, passo: 2 },
  { id: "c62", de: m.p62 - 2, ate: m.p62 + 14, passo: 2 },
  { id: "c285", de: m.p44 - 2, ate: m.p44 + 22, passo: 2 },
];

const G0 = grande[0].f;
const T = {
  fala, dur, m, digita, contas, legendas, grande,
  relogio: { ate: RELOGIO_ATE, ticks: minutos(0, RELOGIO_ATE), voltaTicks: minutos(fim + 6, total - 3) },
  cenas: [fala.tamanho, fala.fortaleza, m.corrigido, fala.cofre, fala.ataque, fala.misterio, fala.padrao, fala.cauda, fala.congelar, fala.bitcoin, fala.quem, fala.pergunta, G0, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
