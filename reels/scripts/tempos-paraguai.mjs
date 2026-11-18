// Linha do tempo do reel do Ueno Bank no Paraguai (ciencia/Paraguai), em quadros a 30fps, a partir
// da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra (palavras.json, do
// Whisper). A composição e a trilha (gerar-trilha-paraguai.mjs) leem o mesmo arquivo: mudou uma fala,
// tudo se reposiciona. O audio-paraguai.mjs já chama este script.
//
//   node scripts/tempos-paraguai.mjs <pasta do reel> src/ciencia/paraguai-tempos.json
//
// Gera:
//   fala     quadro em que cada fala começa (a fala k é public/ciencia/paraguai/beat-<k>.mp3)
//   legendas blocos de 2 a 4 palavras (BLOCOS abaixo), com a palavra-chave marcada; os blocos com
//            § viram a pergunta grande do fim
//   grande   as palavras da pergunta final, uma a uma, no quadro em que a voz diz cada uma
//   m        instantes em que a animação reage à voz
//   contas   contadores (a trilha põe tiques enquanto o número corre)
//   cenas    trocas de cena (a trilha põe um whoosh em cada uma)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-paraguai.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem a torre do Ueno, o zoom correndo e o número escrito; a voz entra logo
const PAUSA = 5; // respiro entre uma fala e a próxima
const ORDEM = ["trava", "tamanho", "resolucao", "garantia", "virada", "senado", "defesa", "pergunta"];
// Quadros a mais depois da voz: o gráfico ou os cartões precisam ficar na tela pra ser lidos.
const EXTRA = { tamanho: 10, resolucao: 6, virada: 14, defesa: 18 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que sai
// como pergunta grande no palco. Sem as marcas, o texto tem que ser igual à narração (o script confere).
const BLOCOS = {
  trava: "O *app parou.* | O *cartão, recusado.* | A *agência, fechada.* | No Paraguai, | foi assim para | *quase 3 milhões* | de clientes | de um banco só.",
  tamanho: "É o *banco Ueno,* | num país de | *6,5 milhões* | de pessoas. | Ele guardava | *2,8 bilhões* | de dólares, quase | *1 em cada 10* | depositados no país.",
  resolucao: "Em *2 de novembro,* | o Banco Central | abriu a *resolução* | do banco: | o capital estava | *abaixo da metade* | do mínimo.",
  garantia: "Um *fundo de garantia* | devolve até | *um limite,* | que cobre | o *saldo todo* | de *97%* dos clientes, | estima o | Banco Central.",
  virada: "*Mas,* pela conta | da Moody's, | isso é só | *30% do dinheiro.* | O resto está | em *contas grandes,* | como a da | *previdência pública.*",
  senado: "*Quatro dias depois,* | o Senado *destituiu* | o presidente | Santiago Peña | por mau desempenho, | *44 a 0.* | Ele foi *acionista* | do grupo do banco | até 2025.",
  defesa: "Peña *nega* | ter interferido, | e a *defesa* | *contesta* o processo.",
  pergunta: "§Se o *seu banco* | §travasse amanhã, | §o que pararia *primeiro?*",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Tempo (s) de cada palavra do roteiro. O Whisper escreve diferente ("Pena", "44%"), então a
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
  app: em("trava", "app"),
  cartao: em("trava", "cartão,"),
  agencia: em("trava", "agência,"),
  paraguai: em("trava", "Paraguai,"),
  milhoes: em("trava", "milhões"),
  so: em("trava", "só."),
  ueno: em("tamanho", "Ueno"),
  pais: em("tamanho", "país"),
  m65: em("tamanho", "6,5"),
  pessoas: em("tamanho", "pessoas."),
  guardava: em("tamanho", "guardava"),
  b28: em("tamanho", "2,8"),
  um: em("tamanho", "1"),
  dez: em("tamanho", "10"),
  depositados: em("tamanho", "depositados"),
  novembro: em("resolucao", "novembro,"),
  central: em("resolucao", "Central"),
  resolucao: em("resolucao", "resolução"),
  capital: em("resolucao", "capital"),
  metade: em("resolucao", "metade"),
  minimo: em("resolucao", "mínimo."),
  fundo: em("garantia", "fundo"),
  limite: em("garantia", "limite,"),
  saldo: em("garantia", "saldo"),
  p97: em("garantia", "97%"),
  estima: em("garantia", "estima"),
  mas: em("virada", "Mas,"),
  moodys: em("virada", "Moody's,"),
  p30: em("virada", "30%"),
  resto: em("virada", "resto"),
  grandes: em("virada", "grandes,"),
  previdencia: em("virada", "previdência"),
  dias: em("senado", "dias"),
  destituiu: em("senado", "destituiu"),
  pena: em("senado", "Peña"),
  p44: em("senado", "44"),
  acionista: em("senado", "acionista"),
  a2025: em("senado", "2025."),
  nega: em("defesa", "nega"),
  defesa: em("defesa", "defesa"),
  contesta: em("defesa", "contesta"),
  seu: em("pergunta", "seu"),
  primeiro: em("pergunta", "primeiro?"),
};

// Depois da pergunta, a cena volta pra torre (o quadro 0), pro loop emendar. O CTA escrito ocupa o
// último 1,5s.
const VOLTA = 45;
const cta = fimFala + 10;
const total = cta + VOLTA;
const fim = total - VOLTA;

// Cenas (cada uma é uma tela inteira; a composição faz as trocas com corte ou fusão curta).
const cena = {
  torre: { de: 0, ate: fala.tamanho }, // a torre do Ueno em Assunção, com o app, o cartão e a porta
  pessoas: { de: fala.tamanho, ate: m.b28 - 8 }, // clientes × habitantes, na mesma régua
  deposito: { de: m.b28 - 8, ate: fala.resolucao }, // US$ 2,8 bi e a grade de 100 com 9 acesas
  resolucao: { de: fala.resolucao, ate: fala.garantia }, // o selo do BCP e o índice de solvência
  cobertura: { de: fala.garantia, ate: fala.senado }, // 97% dos clientes × 30% do dinheiro
  senado: { de: fala.senado, ate: fala.pergunta }, // o Congresso, os 4 dias, o placar, acusação × defesa
  pergunta: { de: fala.pergunta, ate: fim },
};

const contas = [
  { id: "c28", de: m.b28 - 2, ate: m.b28 + 14, passo: 2 },
  { id: "c97", de: m.p97 - 3, ate: m.p97 + 12, passo: 2 },
  { id: "c30", de: m.p30 - 3, ate: m.p30 + 10, passo: 2 },
];

const T = {
  fala, dur, m, contas, legendas, grande, cena,
  cenas: [cena.pessoas.de, cena.deposito.de, cena.resolucao.de, cena.cobertura.de, m.mas, cena.senado.de, fala.defesa, cena.pergunta.de, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.trava.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
