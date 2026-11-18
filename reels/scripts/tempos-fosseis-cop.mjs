// Linha do tempo do reel "Os anfitriões da COP31 e os fósseis" (ciencia/FosseisCop), em quadros a
// 30fps, a partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra
// (palavras.json, do Whisper). A composição e a trilha (gerar-trilha-fosseis-cop.mjs) leem o mesmo
// arquivo. O audio-fosseis-cop.mjs já chama este script. Mesmo método do tempos-binance.mjs.
//
//   node scripts/tempos-fosseis-cop.mjs <pasta do reel> src/ciencia/fosseis-cop-tempos.json
//
// Gera: fala (quadro de início de cada fala), legendas (blocos de 2 a 4 palavras, chave marcada),
// grande (a pergunta final, palavra por palavra), m (instantes em que a animação reage à voz),
// varre (a corrida dos anos 2000 → 2025), contas (contadores, pra trilha), cenas (whoosh).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-fosseis-cop.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem a foto, a barra subindo e o assunto escrito; a voz entra logo
const PAUSA = 5;
const ORDEM = ["gancho", "turquia", "australia", "mundo", "brasil", "tempo", "pergunta"];
const EXTRA = { tempo: 14 }; // os quatro saldos ficam um instante na tela antes da pergunta

// "|" separa os blocos, *assim* marca a chave (laranja), § marca a pergunta grande do fim.
const BLOCOS = {
  gancho: "Quem preside | a *COP do clima* | tira *mais da metade* | da eletricidade | do *carvão* | e do *gás*.",
  turquia: "Em 2025, | *57%* da eletricidade | da *Turquia* | veio de fósseis. | *Mais de um terço*, | só do *carvão*.",
  australia: "A *Austrália*, | que conduz | as negociações, | chega a *60%*. | Só o carvão | dá *43%*.",
  mundo: "Parece *contradição*? | O *mundo inteiro* | fica em *58%*. | A Turquia, | um pouco *abaixo*. | A Austrália, | um pouco *acima*.",
  brasil: "O *Brasil*, | que presidiu | a COP30, | fica em *11%*: | mais da metade | da nossa eletricidade | vem das *hidrelétricas*.",
  tempo: "Desde *2000*, | a Austrália | caiu *32 pontos*: | estava em *92%*. | A Turquia | caiu *18*. | O mundo, *7*. | E o Brasil | subiu *2*.",
  pergunta: "Na conversa | sobre deixar | os *fósseis*, | o que *pesa mais*: | §onde cada *país está*, | §ou a *velocidade* | §com que ele *sai*?",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/** Tempo de cada palavra do roteiro, pelo ponto equivalente (em letras) no texto do Whisper. */
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

const em = (id, palavra, n = 1) => {
  const alvo = norm(palavra);
  const achadas = palavras[id].filter((p) => norm(p.w) === alvo);
  if (achadas.length < n) throw new Error(`"${palavra}" não aparece ${n}× na fala ${id}`);
  return achadas[n - 1].f;
};

const legendas = [];
const grande = [];
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
  legendas[i].ate = prox && prox.de - legendas[i].fim < 20 ? prox.de : legendas[i].fim + 8;
  delete legendas[i].fim;
}
legendas[0].de = 0;

const m = {
  metade: em("gancho", "metade"),
  carvao0: em("gancho", "carvão"),
  gas0: em("gancho", "gás."),
  p57: em("turquia", "57%"),
  turquia: em("turquia", "Turquia"),
  fosseis: em("turquia", "fósseis."),
  terco: em("turquia", "terço,"),
  carvao1: em("turquia", "carvão."),
  australia: em("australia", "Austrália,"),
  negociacoes: em("australia", "negociações,"),
  p60: em("australia", "60%."),
  so: em("australia", "Só"),
  p43: em("australia", "43%."),
  contradicao: em("mundo", "contradição?"),
  mundo: em("mundo", "mundo"),
  p58: em("mundo", "58%."),
  turquia2: em("mundo", "Turquia,"),
  abaixo: em("mundo", "abaixo."),
  australia2: em("mundo", "Austrália,"),
  acima: em("mundo", "acima."),
  brasil: em("brasil", "Brasil,"),
  cop30: em("brasil", "COP30,"),
  p11: em("brasil", "11%:"),
  metade2: em("brasil", "metade"),
  hidro: em("brasil", "hidrelétricas."),
  desde: em("tempo", "Desde"),
  a2000: em("tempo", "2000,"),
  caiu: em("tempo", "caiu"),
  p32: em("tempo", "32"),
  estava: em("tempo", "estava"),
  p92: em("tempo", "92%."),
  t18: em("tempo", "18."),
  m7: em("tempo", "7."),
  brasil2: em("tempo", "Brasil"),
  b2: em("tempo", "2."),
  conversa: em("pergunta", "conversa"),
  fosseis2: em("pergunta", "fósseis,"),
  pesa: em("pergunta", "pesa"),
};

// A corrida dos anos: no "2000" as barras voltam pra 2000, e enquanto a voz diz "a Austrália caiu 32
// pontos" o ano corre até 2025 (a barra da Austrália desce junto com a frase).
const varre = { volta: m.a2000 - 3, de: m.caiu - 6, ate: m.p32 + 30 };

const VOLTA = 45; // depois da pergunta, a tela volta pro quadro da abertura (loop)
const cta = fimFala + 8;
const total = cta + VOLTA;
const fim = total - VOLTA;

const contas = [
  { id: "aus", de: m.australia - 2, ate: m.p60 + 2, passo: 2 },
  { id: "mun", de: m.mundo - 2, ate: m.p58 + 2, passo: 2 },
  { id: "bra", de: m.brasil - 2, ate: m.p11 + 2, passo: 3 },
  { id: "anos", de: varre.de, ate: varre.ate, passo: 2 },
];

const G0 = grande[0].f;
const T = {
  fala, dur, m, varre, contas, legendas, grande,
  cenas: [fala.australia, fala.mundo, fala.brasil, m.a2000, G0, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
