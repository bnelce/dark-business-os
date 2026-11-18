// Linha do tempo do reel "Quanto tempo leva baixar o GTA VI" (ciencia/Gta6), em quadros a 30fps,
// a partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra
// (palavras.json, do Whisper). A composição e a trilha (gerar-trilha-gta6.mjs) leem o mesmo arquivo:
// mudou uma fala, tudo se reposiciona. O audio-gta6.mjs já chama este script.
//
//   node scripts/tempos-gta6.mjs <pasta do reel> src/ciencia/gta6-tempos.json
//
// Os números da fala são conferidos contra a conta pelo gerar-gta6.mjs (src/ciencia/gta6.json).
// Aqui só se confere que a legenda bate com a narração.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-gta6.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem a barra andando; a voz entra logo
const PAUSA = 4; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "tamanho", "corrida", "fusos", "zelandia", "pergunta"];
// Quadros a mais depois da voz: o 23H33 e o mapa aceso ficam na tela pra dar tempo de ler.
const EXTRA = { gancho: 6, corrida: 14, fusos: 14, zelandia: 8 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja). Sem as marcas, o texto
// tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "Se a sua internet | for de *20 mega*, | o *GTA VI* | só termina de baixar | *amanhã à noite*.",
  tamanho: "A Rockstar diz | que o *pré-load* pede | até *212 gigabytes*. | E internet | se mede em *bits*: | são *1.696 gigabits*.",
  corrida: "No *melhor caso*, | com *1 giga*, | isso leva | *28 minutos*. | Na velocidade *mediana* | do Brasil, | uns *220 mega*, | pouco mais | de *duas horas*. | Com *100 mega*, | quase *cinco*. | Com *20*, | *23 horas e meia*.",
  fusos: "E que horas | o jogo *libera*? | No *mesmo instante*, | no país todo: | *22 horas* no Acre, | *23* em Manaus, | *meia-noite* em Brasília | e *uma da manhã* | em Noronha.",
  zelandia: "Na *Nova Zelândia*, | ele abriu | *16 horas antes*.",
  pergunta: "Quem baixou | no *pré-load* | só espera o relógio. | E o seu, | *quanto tempo* | *demorou*?",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);
const fala$ = (id) => roteiro.beats.find((b) => b.id === id).narracao;

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Tempo (s) de cada palavra do roteiro. O Whisper escreve diferente ("preload", "1696", "MB"), então
 * a palavra k do roteiro recebe o tempo do ponto equivalente no texto transcrito, medido em letras e
 * algarismos acumulados (o mesmo método do tempos-apagao.mjs).
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
  const tr = transcritas.find((x) => x.id === id);
  fala[id] = f;
  dur[id] = Math.ceil(b.duracao * FPS);
  palavras[id] = alinhar(fala$(id), tr.palavras).map((p) => ({ w: p.w, f: f + Math.round(p.s * FPS), fe: f + Math.round(p.e * FPS) }));
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
const fimDe = (id, palavra, n = 1) => {
  const alvo = norm(palavra);
  return palavras[id].filter((p) => norm(p.w) === alvo)[n - 1].fe;
};

// Legendas: cada bloco vale do começo da 1ª palavra até o começo do próximo bloco.
const legendas = [];
for (const id of ORDEM) {
  const blocos = BLOCOS[id].split("|").map((s) => s.trim());
  const limpo = blocos.join(" ").replace(/\*/g, "");
  if (norm(limpo.replace(/\s/g, "")) !== norm(fala$(id).replace(/\s/g, ""))) throw new Error(`legenda de ${id} não bate com a narração:\n  ${limpo}\n  ${fala$(id)}`);
  let k = 0;
  for (const bloco of blocos) {
    const ws = bloco.split(/\s+/);
    if (ws.length > 4) throw new Error(`bloco com mais de 4 palavras: ${bloco}`);
    const ps = palavras[id].slice(k, k + ws.length);
    let dentro = false;
    const partes = ws.map((w) => {
      const abre = w.startsWith("*"), fecha = w.replace(/[.,:;?!]+$/, "").endsWith("*") || w.endsWith("*");
      if (abre) dentro = true;
      const parte = { t: w.replace(/\*/g, ""), chave: dentro };
      if (fecha) dentro = false;
      return parte;
    });
    legendas.push({ de: Math.max(0, ps[0].f - 2), partes, fim: ps.at(-1).fe });
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
  vinteG: em("gancho", "20"),
  gta: em("gancho", "GTA"),
  termina: em("gancho", "termina"),
  amanha: em("gancho", "amanhã"),
  noite: fimDe("gancho", "noite."),
  rockstar: em("tamanho", "Rockstar"),
  preload: em("tamanho", "pré-load"),
  n212: em("tamanho", "212"),
  gigabytes: em("tamanho", "gigabytes."),
  internet: em("tamanho", "internet"),
  bits: em("tamanho", "bits:"),
  n1696: em("tamanho", "1.696"),
  gigabits: em("tamanho", "gigabits."),
  melhor: em("corrida", "melhor"),
  giga: em("corrida", "giga,"),
  n28: em("corrida", "28"),
  minutos: em("corrida", "minutos."),
  mediana: em("corrida", "mediana"),
  n220: em("corrida", "220"),
  duas: em("corrida", "duas"),
  horasC: fimDe("corrida", "horas."),
  n100: em("corrida", "100"),
  cinco: fimDe("corrida", "cinco."),
  n20: em("corrida", "20,"),
  n23: em("corrida", "23"),
  meia: fimDe("corrida", "meia."),
  libera: em("fusos", "libera?"),
  instante: em("fusos", "instante,"),
  n22: em("fusos", "22"),
  acre: em("fusos", "Acre,"),
  n23f: em("fusos", "23"),
  manaus: em("fusos", "Manaus,"),
  meianoite: em("fusos", "meia-noite"),
  brasilia: em("fusos", "Brasília"),
  uma: em("fusos", "uma"),
  noronha: em("fusos", "Noronha."),
  zelandia: em("zelandia", "Zelândia,"),
  abriu: em("zelandia", "abriu"),
  n16: em("zelandia", "16"),
  antes: fimDe("zelandia", "antes."),
  preloadP: em("pergunta", "pré-load"),
  relogio: em("pergunta", "relógio."),
  seu: em("pergunta", "seu,"),
  demorou: em("pergunta", "demorou?"),
};

// Depois da pergunta, a tela do download volta (o loop emenda no quadro 0) e o CTA escrito ocupa o
// último 1,3s.
const VOLTA = 40;
const cta = fimFala + 8;
const total = cta + VOLTA;
const fim = total - VOLTA;

// O relógio do download (horas simuladas). No gancho corre de 0 a 23h33 de uma vez; na corrida,
// anda por trechos e para em cada tempo dito pela voz.
const relogio = {
  gancho: { de: 0, ate: m.noite },
  corrida: [
    { de: m.giga - 4, ate: m.minutos, ate_h: "giga" },
    { de: m.mediana, ate: m.horasC, ate_h: "mediana" },
    { de: m.n100 - 2, ate: m.cinco, ate_h: "cem" },
    { de: m.n20 - 2, ate: m.meia, ate_h: "vinte" },
  ],
};

const digita = [
  { id: "melhor", texto: "NO MELHOR CASO", de: m.melhor - 2, ate: m.giga + 2 },
];

// Contadores (a trilha põe tiques enquanto correm).
const contas = [
  { id: "bits", de: m.bits - 6, ate: m.bits + 10, passo: 2 },
  { id: "nz", de: m.abriu - 4, ate: m.n16 + 4, passo: 2 },
];

const T = {
  fala, dur, m, relogio, digita, contas, legendas,
  cenas: [fala.tamanho, fala.corrida, fala.fusos, fala.zelandia, fala.pergunta, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
