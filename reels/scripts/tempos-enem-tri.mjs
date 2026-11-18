// Linha do tempo do reel "Mesmos acertos, notas diferentes" (ciencia/EnemTri), em quadros a 30fps, a
// partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra (palavras.json, do
// Whisper). A composição e a trilha (gerar-trilha-enem-tri.mjs) leem o mesmo arquivo: mudou uma fala,
// tudo se reposiciona. O audio-enem-tri.mjs já chama este script.
//
//   node scripts/tempos-enem-tri.mjs <pasta do reel> src/ciencia/enem-tri-tempos.json
//
// Gera fala, legendas, grande (a pergunta final), m (marcadores), contas e cenas, como o tempos-elnino.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-enem-tri.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem os dois candidatos e as duas notas; a voz entra logo
const PAUSA = 5; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "domingo", "regua", "tri", "escala", "inep", "pergunta"];
// Quadros a mais depois da voz: a régua e o histograma precisam ficar na tela pra serem lidos.
const EXTRA = { regua: 12, escala: 14 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que sai
// como pergunta grande no palco. Sem as marcas, o texto tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "*Dois candidatos* | acertaram *10 questões* | de Matemática. | Um tirou *319.* | O outro, | *quase 570.*",
  domingo: "Domingo tem prova, | e no ENEM | não conta só | *quantas* você acerta. | *Conta quais.*",
  regua: "Estas são | as *43 questões* | que valeram, | da *mais fácil* | à *mais difícil.* | Quem tirou | quase 570 | acertou as *cinco* | *mais fáceis.* | Quem tirou 319 | *errou* as *21* | *mais fáceis.*",
  tri: "Para a *TRI,* | isso parece *chute:* | quem sabe *o difícil* | deveria saber | *o fácil.* | Por isso, | esses acertos | *valem menos.*",
  escala: "Não é exceção: | com *10 acertos,* | a nota de | *268 mil pessoas* | variou *250 pontos.*",
  inep: "E o próprio | *INEP* avisa: | não deixe questão | *em branco.* | Acerto *sempre soma,* | e *branco* | conta como *erro.*",
  pergunta: "§E com *15 acertos,* | §que nota | §você acha que *dá?*",
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
  um: em("gancho", "Um"),
  n319: em("gancho", "319."),
  outro: em("gancho", "outro,"),
  n570: em("gancho", "570."),
  domingo: em("domingo", "Domingo"),
  enem: em("domingo", "ENEM"),
  quantas: em("domingo", "quantas"),
  quais: em("domingo", "quais."),
  estas: em("regua", "Estas"),
  n43: em("regua", "43"),
  facil: em("regua", "fácil"),
  dificil: em("regua", "difícil."),
  alta: em("regua", "Quem", 1),
  cinco: em("regua", "cinco"),
  baixa: em("regua", "Quem", 2),
  errou: em("regua", "errou"),
  n21: em("regua", "21"),
  tri: em("tri", "TRI,"),
  chute: em("tri", "chute:"),
  sabe: em("tri", "sabe"),
  facilT: em("tri", "fácil."),
  valem: em("tri", "valem"),
  excecao: em("escala", "exceção:"),
  mil: em("escala", "mil"),
  variou: em("escala", "variou"),
  n250: em("escala", "250"),
  inep: em("inep", "INEP"),
  branco: em("inep", "branco"),
  soma: em("inep", "soma,"),
  branco2: em("inep", "branco", 2),
  erro: em("inep", "erro."),
  n15: em("pergunta", "15"),
  da: em("pergunta", "dá?"),
};

// Depois da pergunta, a cena volta pros dois candidatos (o quadro 0), pro loop emendar. O CTA escrito
// ocupa o último 1,5s.
const VOLTA = 40;
const cta = fimFala + 10;
const total = cta + VOLTA;
const fim = total - VOLTA;

const cena = {
  dupla: { de: 0, ate: fala.domingo }, // os dois candidatos, 10 acertos cada, 319,4 × 569,6
  domingo: { de: fala.domingo, ate: fala.regua }, // "não é quantas, é quais"
  regua: { de: fala.regua, ate: fala.escala }, // as 43 questões, fácil embaixo, difícil em cima (a TRI usa a mesma régua)
  hist: { de: fala.escala, ate: fala.inep }, // as 267.971 notas de quem fez 10 acertos
  inep: { de: fala.inep, ate: fala.pergunta }, // o recado do guia: questão em branco conta como errada
  pergunta: { de: fala.pergunta, ate: fim },
};

const contas = [
  { id: "c268", de: m.mil - 12, ate: m.mil + 4, passo: 2 },
];

const T = {
  fala, dur, m, contas, legendas, grande, cena,
  cenas: [cena.domingo.de, cena.regua.de, fala.tri, cena.hist.de, cena.inep.de, cena.pergunta.de, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s · 570 em ${(m.n570 / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
