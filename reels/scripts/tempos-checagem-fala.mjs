// Linha do tempo do reel "Ele disse. Os dados mostram." (ciencia/ChecagemFala), em quadros a 30fps, a partir
// da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra (palavras.json, do Whisper). A
// composição e a trilha (gerar-trilha-checagem-fala.mjs) leem o mesmo arquivo: mudou uma fala, tudo se
// reposiciona. O audio-checagem-fala.mjs já chama este script.
//
//   node scripts/tempos-checagem-fala.mjs <pasta do reel> src/ciencia/checagem-fala-tempos.json
//
// Mesmo método do tempos-enem-tri.mjs: fala, legendas, grande (a pergunta final), m (marcadores), contas e cenas.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-checagem-fala.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 0; // a citação já está na tela no quadro 0 e a voz começa junto (gancho nos 2 primeiros segundos)
const PAUSA = 5; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "pontos", "p1", "p2", "p3", "p4", "soma", "pergunta"];
// Quadros a mais depois da voz: os mapas e a soma precisam ficar na tela pra serem lidos.
const EXTRA = { p2: 14, soma: 12 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que sai
// como pergunta grande no palco. Sem as marcas, o texto tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "“Todos os votos | dos outros candidatos | teriam que ir | pro *Lula.* | *Qual a chance?”* | Nikolas Ferreira, | na noite do | segundo turno.",
  pontos: "São *quatro pontos.* | Os boletins de urna | do *TSE* | respondem um por um.",
  p1: "Um: | mais de *11 milhões* | de votos a mais. | Foram *10,4 milhões.* | *Exagerado.*",
  p2: "Dois: | crescimento em | *todos os estados.* | *Verdade:* | o Lula cresceu | nos *27.* | O Flávio também, | em *21.*",
  p3: "Três: | a queda da abstenção | não explica. | Também *verdade:* | só *3 milhões* | a mais foram votar.",
  p4: "Então de onde | veio o *resto?* | Quatro: | os votos dos outros | teriam que ir | *todos* pro Lula. | Os eliminados tinham | *9,3 milhões.* | *Menos* que o ganho | do Lula.",
  soma: "Mas some | *3 milhões* a mais | nas urnas | e *1,8 milhão* | a menos de | branco e nulo: | *14,1 milhões* em jogo. | Lula levou *74%.* | Flávio, *26.* | *Não precisou* | ser tudo.",
  pergunta: "*Sozinha,* nenhuma fonte explica. | *Juntas,* fecham | voto a voto. | §Qual frase | §da eleição | §você quer ver | §nos *dados?*",
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
  chance: em("gancho", "chance?”"),
  nikolas: em("gancho", "Nikolas"),
  quatro: em("pontos", "quatro"),
  tse: em("pontos", "TSE"),
  um: em("p1", "Um:"),
  n11: em("p1", "11"),
  foram: em("p1", "Foram"),
  n104: em("p1", "10,4"),
  exag: em("p1", "Exagerado."),
  dois: em("p2", "Dois:"),
  todos: em("p2", "todos"),
  verdade2: em("p2", "Verdade:"),
  n27: em("p2", "27."),
  flavio2: em("p2", "Flávio"),
  n21: em("p2", "21."),
  tres: em("p3", "Três:"),
  abst: em("p3", "abstenção"),
  verdade3: em("p3", "verdade:"),
  n3: em("p3", "3"),
  votar: em("p3", "votar."),
  resto: em("p4", "resto?"),
  quatro4: em("p4", "Quatro:"),
  todos4: em("p4", "todos"),
  elim: em("p4", "eliminados"),
  n93: em("p4", "9,3"),
  menos: em("p4", "Menos"),
  s3: em("soma", "3"),
  n18: em("soma", "1,8"),
  nulo: em("soma", "nulo:"),
  n141: em("soma", "14,1"),
  n74: em("soma", "74%."),
  flavioS: em("soma", "Flávio,"),
  n26: em("soma", "26."),
  precisou: em("soma", "precisou"),
  sozinha: em("pergunta", "Sozinha,"),
  juntas: em("pergunta", "Juntas,"),
  voto: em("pergunta", "voto", 2),
  qual: em("pergunta", "Qual"),
  dados: em("pergunta", "dados?"),
};

// Depois da pergunta, a cena volta pra citação (o quadro 0), pro loop emendar. O CTA escrito ocupa o último 1,3s.
const VOLTA = 40;
const G0 = grande[0].f;
const cta = fimFala + 10;
const total = cta + VOLTA;
const fim = total - VOLTA;

const cena = {
  cartao: { de: 0, ate: fala.pontos }, // a citação, com nome, data e fonte
  lista: { de: fala.pontos, ate: fala.p1 }, // os 4 pontos do post, literais, com o carimbo vazio
  p1: { de: fala.p1, ate: fala.p2 }, // >11 milhões × 10.376.694
  p2: { de: fala.p2, ate: fala.p3 }, // os dois mapas de 27 UFs
  p3: { de: fala.p3, ate: fala.p4 }, // abstenção 21,08% → 19,22%, +2.960.239 contra o ganho do Lula
  fontes: { de: fala.p4, ate: G0 }, // as três fontes contra a linha do ganho do Lula, a soma e a divisão 74/26
  veredito: { de: G0, ate: fim }, // os 4 carimbos e a pergunta
};

const contas = [
  { id: "c104", de: m.foram, ate: m.n104 + 6, passo: 2 },
  { id: "c3", de: m.n3 - 8, ate: m.n3 + 6, passo: 2 },
];

const T = {
  fala, dur, m, contas, legendas, grande, cena,
  cenas: [cena.lista.de, cena.p1.de, cena.p2.de, cena.p3.de, cena.fontes.de, cena.veredito.de, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · "chance?" em ${(m.chance / FPS).toFixed(2)}s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
