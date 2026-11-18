// Linha do tempo do reel "Quanto custou cada voto" (ciencia/CustoVoto), em quadros a 30fps, a
// partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra (palavras.json, do
// Whisper). A composição e a trilha (gerar-trilha-custo-voto.mjs) leem o mesmo arquivo: mudou uma fala,
// tudo se reposiciona. O audio-custo-voto.mjs já chama este script.
//
//   node scripts/tempos-custo-voto.mjs <pasta do reel> src/ciencia/custo-voto-tempos.json
//
// Gera fala, legendas, grande (a pergunta final), m (marcadores), contas e cenas, como o tempos-elnino.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-custo-voto.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem os dois deputados e os dois números; a voz entra logo
const PAUSA = 5; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "bolso", "tipico", "partidos", "fora", "ressalva", "pergunta"];
// Quadros a mais depois da voz: a distribuição e a régua dos partidos precisam ficar na tela pra serem lidas.
const EXTRA = { tipico: 10, partidos: 24, fora: 6 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que sai
// como pergunta grande no palco. Sem as marcas, o texto tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "*Esse deputado* | gastou *25 centavos* | por voto. | Esse outro, | *170 reais.*",
  bolso: "E quase tudo | veio do *mesmo bolso:* | de cada *100 reais* | que os eleitos pagaram, | *88* eram | *dinheiro público,* | do fundo eleitoral | e do partidário.",
  tipico: "Nos *513 eleitos,* | o voto típico | custou *22 reais.* | *Metade* gastou menos | que isso por voto, | *metade* gastou mais.",
  partidos: "Aqui estão | os *28 partidos,* | com todos os candidatos | de cada um, | na *mesma régua:* | de *zero* | a *70 reais* | por voto.",
  fora: "E quem | *não se elegeu?* | Gastou *2,2 bilhões,* | e o voto típico | custou *65 reais.* | *Três vezes* | o dos eleitos.",
  ressalva: "Gasto alto | não quer dizer | *irregularidade,* | e gasto baixo | não quer dizer | *mérito.* | O número sozinho | *não explica* | o porquê.",
  pergunta: "§Quanto você acha | §*justo* custar | §*um voto?*",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Tempo (s) de cada palavra do roteiro. O Whisper escreve diferente ("El Nino", "1950"), então a
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
  deputado: em("gancho", "deputado"),
  centavos: em("gancho", "centavos"),
  outro: em("gancho", "outro,"),
  n170: em("gancho", "170"),
  bolso: em("bolso", "bolso:"),
  n100: em("bolso", "100"),
  n88: em("bolso", "88"),
  publico: em("bolso", "público,"),
  fundo: em("bolso", "fundo"),
  partidario: em("bolso", "partidário."),
  n513: em("tipico", "513"),
  n22: em("tipico", "22"),
  metade1: em("tipico", "Metade"),
  metade2: em("tipico", "metade", 2),
  n28: em("partidos", "28"),
  regua: em("partidos", "régua:"),
  zero: em("partidos", "zero"),
  n70: em("partidos", "70"),
  nao: em("fora", "não"),
  bilhoes: em("fora", "bilhões,"),
  n65: em("fora", "65"),
  tres: em("fora", "Três"),
  alto: em("ressalva", "alto"),
  baixo: em("ressalva", "baixo"),
  explica: em("ressalva", "explica"),
  justo: em("pergunta", "justo"),
};

// Depois da pergunta, a cena volta pros dois deputados (o quadro 0), pro loop emendar. O CTA escrito
// ocupa o último 1,3s.
const VOLTA = 40;
const cta = fimFala + 10;
const total = cta + VOLTA;
const fim = total - VOLTA;

const cena = {
  dupla: { de: 0, ate: fala.bolso }, // os dois extremos: R$ 0,25 e R$ 170,37 por voto
  bolso: { de: fala.bolso, ate: fala.tipico }, // 88 de cada 100 reais pagos pelos eleitos vieram do FEFC e do Fundo Partidário
  dist: { de: fala.tipico, ate: fala.partidos }, // os 513 eleitos numa régua de gasto por voto, a mediana
  partidos: { de: fala.partidos, ate: fala.fora }, // os 28 partidos, todos os candidatos, mesma cor
  fora: { de: fala.fora, ate: fala.ressalva }, // eleitos × não eleitos (medianas)
  ressalva: { de: fala.ressalva, ate: fala.pergunta }, // o dado não explica a causa
  pergunta: { de: fala.pergunta, ate: fim },
};

const contas = [
  { id: "c88", de: m.n88 - 12, ate: m.n88 + 2, passo: 2 },
];

const T = {
  fala, dur, m, contas, legendas, grande, cena,
  cenas: [cena.bolso.de, cena.dist.de, cena.partidos.de, cena.fora.de, cena.ressalva.de, cena.pergunta.de, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · 170 em ${(m.n170 / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
