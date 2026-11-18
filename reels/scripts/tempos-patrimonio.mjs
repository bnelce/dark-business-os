// Linha do tempo do reel "O patrimônio de quem te representa" (ciencia/Patrimonio), em quadros a 30fps, a
// partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra (palavras.json, do
// Whisper). A composição e a trilha (gerar-trilha-patrimonio.mjs) leem o mesmo arquivo: mudou uma fala,
// tudo se reposiciona. O audio-patrimonio.mjs já chama este script.
//
//   node scripts/tempos-patrimonio.mjs <pasta do reel> src/ciencia/patrimonio-tempos.json
//
// Mesmo método do tempos-enem-tri.mjs (alinhamento por letras, blocos de até 4 palavras).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-patrimonio.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem as duas grades (62 de 100 e 7 de 100); a voz entra logo
const PAUSA = 5;
const ORDEM = ["gancho", "mediana", "renda", "aviso", "extremos", "partidos", "reeleitos", "pergunta"];
// Quadros a mais depois da voz: os 586 eleitos ordenados e os 20 partidos precisam ficar na tela pra serem lidos.
const EXTRA = { extremos: 10, partidos: 24, reeleitos: 6 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que sai
// como pergunta grande no palco. Sem as marcas, o texto tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "Quem vai decidir | *teus impostos:* | *seis em cada dez* | declararam mais de | *1 milhão de reais* | em bens. | Entre quem declara | Imposto de Renda, são | *7 em cada 100.*",
  mediana: "Dos *586 eleitos* | em outubro, | o *típico* declarou | *1 milhão e* | *450 mil reais.*",
  renda: "Com a renda | de um *brasileiro típico,* | juntar isso | levaria *81 anos,* | sem gastar nada.",
  aviso: "E é *valor declarado* | ao TSE, | *não de mercado:* | imóvel costuma entrar | pelo *preço de compra.*",
  extremos: "Nas pontas: | o governador eleito | de Mato Grosso, | Otaviano Pivetta, | declarou *575 milhões* | de reais. | E *oito eleitos* | não declararam | *bem nenhum.*",
  partidos: "Por partido, | a mediana vai | de *172 mil* | a *4 milhões* | e 300 mil reais. | Estão aqui | os *20 partidos* | com eleitos.",
  reeleitos: "Entre os *289 reeleitos,* | o valor declarado | *subiu 39%* | desde 2022, | na mediana. | A *inflação* | foi de *quase 20%.* | E *68* | *declararam menos.*",
  pergunta: "§E os eleitos | §do *teu estado,* | §quanto será que | §*declararam?*",
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
  seis: em("gancho", "seis"),
  milhao: em("gancho", "milhão"),
  ir: em("gancho", "Imposto"),
  n7: em("gancho", "7"),
  n586: em("mediana", "586"),
  tipico: em("mediana", "típico"),
  mi: em("mediana", "milhão"),
  renda: em("renda", "renda"),
  n81: em("renda", "81"),
  nada: em("renda", "nada."),
  tse: em("aviso", "TSE,"),
  mercado: em("aviso", "mercado:"),
  imovel: em("aviso", "imóvel"),
  compra: em("aviso", "compra."),
  pontas: em("extremos", "pontas:"),
  governador: em("extremos", "governador"),
  pivetta: em("extremos", "Pivetta,"),
  n575: em("extremos", "575"),
  oito: em("extremos", "oito"),
  nenhum: em("extremos", "nenhum."),
  n172: em("partidos", "172"),
  n4: em("partidos", "4"),
  aqui: em("partidos", "aqui"),
  n20: em("partidos", "20"),
  n289: em("reeleitos", "289"),
  subiu: em("reeleitos", "subiu"),
  n39: em("reeleitos", "39%"),
  inflacao: em("reeleitos", "inflação"),
  n20b: em("reeleitos", "20%."),
  n68: em("reeleitos", "68"),
  menos: em("reeleitos", "menos."),
  estado: em("pergunta", "estado,"),
  declararam: em("pergunta", "declararam?"),
};

// Depois da pergunta, a cena volta pras duas grades (o quadro 0), pro loop emendar. O CTA escrito
// ocupa o último 1,3s.
const VOLTA = 40;
const cta = fimFala + 10;
const total = cta + VOLTA;
const fim = total - VOLTA;

const cena = {
  grade: { de: 0, ate: fala.mediana }, // 62 de 100 eleitos × 7 de 100 declarantes do IR
  mediana: { de: fala.mediana, ate: fala.renda }, // 586 eleitos, foto do Congresso, mediana 1,45 mi
  renda: { de: fala.renda, ate: fala.aviso }, // 81 anos de renda mediana
  aviso: { de: fala.aviso, ate: fala.extremos }, // declarado ≠ mercado
  extremos: { de: fala.extremos, ate: fala.partidos }, // os 586 ordenados, escala log
  partidos: { de: fala.partidos, ate: fala.reeleitos }, // os 20 partidos
  reeleitos: { de: fala.reeleitos, ate: fala.pergunta }, // 289 reeleitos, 219 ↑ e 68 ↓
  pergunta: { de: fala.pergunta, ate: fim }, // os 27 estados
};

const contas = [
  { id: "c81", de: m.n81 - 14, ate: m.n81 + 2, passo: 2 },
  { id: "c575", de: m.n575 - 16, ate: m.n575 + 2, passo: 2 },
];

const T = {
  fala, dur, m, contas, legendas, grande, cena,
  cenas: [cena.mediana.de, cena.renda.de, cena.aviso.de, cena.extremos.de, cena.partidos.de, cena.reeleitos.de, cena.pergunta.de, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · "seis" em ${(m.seis / FPS).toFixed(2)}s · "7" em ${(m.n7 / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
