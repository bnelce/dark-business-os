// Linha do tempo do reel "Cota × resultado" (ciencia/CotaResultado), em quadros a 30fps, a
// partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra (palavras.json, do
// Whisper). A composição e a trilha (gerar-trilha-cota-resultado.mjs) leem o mesmo arquivo: mudou uma fala,
// tudo se reposiciona. O audio-cota-resultado.mjs já chama este script.
//
//   node scripts/tempos-cota-resultado.mjs <pasta do reel> src/ciencia/cota-resultado-tempos.json
//
// Gera fala, legendas, grande (a pergunta final), m (marcadores), contas e cenas, como o tempos-elnino.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-cota-resultado.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem o hemiciclo com os 135 assentos e "56% → 26%"; a voz entra logo
const PAUSA = 5; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "camara", "mulheres", "negros", "chance", "regra", "pergunta"];
// Quadros a mais depois da voz: os funis e a tabela de partidos precisam ficar na tela pra serem lidos.
const EXTRA = { negros: 10, regra: 24 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que sai
// como pergunta grande no palco. Sem as marcas, o texto tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "*Pessoas negras* | são *56%* | do Brasil. | Na nova Câmara, | *26%.*",
  camara: "São esses | *513 deputados* | que votam as leis | a partir de fevereiro. | E as *mulheres?* | *51%* do país, | *109 cadeiras:* | *21%.*",
  mulheres: "Siga as etapas. | *Mulheres:* | *37%* das candidaturas, | *35%* do fundo eleitoral, | *21%* dos eleitos.",
  negros: "*Pessoas negras:* | *46%* das candidaturas, | *37%* do fundo, | *26%* dos eleitos.",
  chance: "De cada *40* | *candidatas negras,* | *uma* se elegeu. | Entre os | *homens brancos,* | *um em cada oito.*",
  regra: "A regra pede | *30%* de candidaturas | de cada sexo | e o fundo | na *proporção* | das candidatas. | Na nossa conta, | com todos os cargos, | *mais da metade* | dos partidos | ficou abaixo | dessa proporção, | e *7* deram | *menos de 30%* | a pessoas negras.",
  pergunta: "Os números | não dizem o porquê. | §Em qual etapa | §você acha que | §a diferença | §mais *cresce:* | §na *lista,* no *dinheiro* | §ou na *urna?*",
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
  n56: em("gancho", "56%"),
  camaraG: em("gancho", "Câmara,"),
  n26: em("gancho", "26%."),
  n513: em("camara", "513"),
  leis: em("camara", "leis"),
  fevereiro: em("camara", "fevereiro."),
  mulheres: em("camara", "mulheres?"),
  n51: em("camara", "51%"),
  n109: em("camara", "109"),
  n21: em("camara", "21%."),
  etapas: em("mulheres", "etapas."),
  mCand: em("mulheres", "37%"),
  mFundo: em("mulheres", "35%"),
  mEl: em("mulheres", "21%"),
  nCand: em("negros", "46%"),
  nFundo: em("negros", "37%"),
  nEl: em("negros", "26%"),
  n40: em("chance", "40"),
  uma: em("chance", "uma"),
  homens: em("chance", "homens"),
  oito: em("chance", "oito."),
  regra: em("regra", "regra"),
  n30: em("regra", "30%"),
  proporcao: em("regra", "proporção"),
  conta: em("regra", "conta,"),
  metade: em("regra", "metade"),
  n7: em("regra", "7"),
  menos30: em("regra", "menos"),
  porque: em("pergunta", "porquê."),
  lista: em("pergunta", "lista,"),
  dinheiro: em("pergunta", "dinheiro"),
  urna: em("pergunta", "urna?"),
};

// Depois da pergunta, a cena volta pro hemiciclo (o quadro 0), pro loop emendar. O CTA escrito ocupa o fim.
const VOLTA = 40;
const cta = fimFala + 10;
const total = cta + VOLTA;
const fim = total - VOLTA;

const cena = {
  gancho: { de: 0, ate: fala.camara }, // hemiciclo, 135 assentos acesos, 56% → 26%
  camara: { de: fala.camara, ate: fala.mulheres }, // o hemiciclo troca pros 109 assentos de mulheres
  mulheres: { de: fala.mulheres, ate: fala.negros }, // funil: população, candidaturas, fundo, eleitos
  negros: { de: fala.negros, ate: fala.chance },
  chance: { de: fala.chance, ate: fala.regra }, // 1 em 40 × 1 em 8
  regra: { de: fala.regra, ate: fala.pergunta }, // a regra e a tabela de todos os partidos
  pergunta: { de: fala.pergunta, ate: fim },
};

const contas = [];

const T = {
  fala, dur, m, contas, legendas, grande, cena,
  cenas: [cena.camara.de, cena.mulheres.de, cena.negros.de, cena.chance.de, cena.regra.de, m.conta, cena.pergunta.de, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s · 26% em ${(m.n26 / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
