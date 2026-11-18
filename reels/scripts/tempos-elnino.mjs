// Linha do tempo do reel do El Niño de 2026 (ciencia/ElNino), versão 2, em quadros a 30fps, a partir
// da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra (palavras.json, do
// Whisper). A composição e a trilha (gerar-trilha-elnino.mjs) leem o mesmo arquivo: mudou uma fala,
// tudo se reposiciona. O audio-elnino.mjs já chama este script.
//
//   node scripts/tempos-elnino.mjs <pasta do reel> src/ciencia/elnino-tempos.json
//
// Gera:
//   fala     quadro em que cada fala começa (a fala k é public/ciencia/elnino/beat-<k>.mp3)
//   legendas blocos de 2 a 4 palavras (BLOCOS abaixo), com a palavra-chave marcada; os blocos com
//            § viram a pergunta grande do fim
//   grande   as palavras da pergunta final, uma a uma, no quadro em que a voz diz cada uma
//   m        instantes em que a animação reage à voz
//   contas   contadores (a trilha põe tiques enquanto o número corre)
//   cenas    trocas de cena (a trilha põe um whoosh em cada uma)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-elnino.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem o rio no satélite e a cortina correndo; a voz entra logo
const PAUSA = 5; // respiro entre uma fala e a próxima
const ORDEM = ["rio", "sul", "elo", "mecanismo", "agora", "noaa", "brasil", "pergunta"];
// Quadros a mais depois da voz: o gráfico precisa ficar na tela pra ser lido.
const EXTRA = { agora: 18 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que sai
// como pergunta grande no palco. Sem as marcas, o texto tem que ser igual à narração (o script confere).
const BLOCOS = {
  rio: "*Esse rio encolheu* | assim em um ano: | é o *rio Negro,* | em Manaus, | no *menor nível* | em *121 anos.*",
  sul: "Enquanto isso, | o Sul ia | para o *outro extremo:* | *enchentes* | em 2023 | e em 2024.",
  elo: "Nos dois casos, | tinha o dedo | do *El Niño:* | o Pacífico | *quente demais.*",
  mecanismo: "Os *ventos* | que prendem | a água quente | perto da Ásia | *enfraquecem,* | ela *escorre* | para o leste, | e a chuva | *muda de lugar.*",
  agora: "*Agora ele voltou.* | E desde 1950 | o Pacífico | *nunca esquentou* | *tão rápido:* | de abaixo do normal | para *2,5 graus* acima, | em oito meses.",
  noaa: "A agência americana | NOAA vê | *83% de chance* | de ele superar | *todos desde 1950* | até dezembro.",
  brasil: "E o alerta oficial | já fala | nos *dois extremos:* | *seca* | e *risco de fogo* | no centro-norte, | *chuva* acima da média | no Sul.",
  pergunta: "§E na *sua cidade,* | §a chuva já *mudou?*",
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
  ano: em("rio", "ano:"),
  negro: em("rio", "Negro,"),
  menor: em("rio", "menor"),
  n121: em("rio", "121"),
  extremo: em("sul", "extremo:"),
  enchentes: em("sul", "enchentes"),
  a2023: em("sul", "2023"),
  a2024: em("sul", "2024."),
  casos: em("elo", "casos,"),
  elnino: em("elo", "Niño:"),
  pacifico: em("elo", "Pacífico"),
  demais: em("elo", "demais."),
  ventos: em("mecanismo", "ventos"),
  asia: em("mecanismo", "Ásia"),
  enfraquecem: em("mecanismo", "enfraquecem,"),
  escorre: em("mecanismo", "escorre"),
  leste: em("mecanismo", "leste,"),
  chuva: em("mecanismo", "chuva"),
  lugar: em("mecanismo", "lugar."),
  voltou: em("agora", "voltou."),
  desde: em("agora", "desde"),
  nunca: em("agora", "nunca"),
  rapido: em("agora", "rápido:"),
  abaixo: em("agora", "abaixo"),
  v25: em("agora", "2,5"),
  oito: em("agora", "oito"),
  noaa: em("noaa", "NOAA"),
  p83: em("noaa", "83%"),
  superar: em("noaa", "superar"),
  todos: em("noaa", "todos"),
  alerta: em("brasil", "alerta"),
  extremos: em("brasil", "extremos:"),
  seca: em("brasil", "seca"),
  fogo: em("brasil", "fogo"),
  chuvaS: em("brasil", "chuva"),
  sulB: em("brasil", "Sul."),
  cidade: em("pergunta", "cidade,"),
  mudou: em("pergunta", "mudou?"),
};

// Depois da pergunta, a cena volta pro rio no satélite (o quadro 0), pro loop emendar. O CTA escrito
// ocupa o último 1,5s.
const VOLTA = 45;
const cta = fimFala + 10;
const total = cta + VOLTA;
const fim = total - VOLTA;

// Cenas (cada uma é uma tela inteira; a composição faz as trocas com corte ou fusão curta).
const cena = {
  landsat: { de: 0, ate: m.menor - 2 }, // o rio encolhendo no satélite (cortina de 2022 para 2023)
  porto: { de: m.menor - 2, ate: fala.sul }, // o porto de Manaus, leito exposto
  enchente: { de: fala.sul, ate: fala.elo },
  dois: { de: fala.elo, ate: m.pacifico - 2 }, // seca em cima, enchente embaixo, "EL NIÑO" no meio
  mapa: { de: m.pacifico - 2, ate: m.desde + 6 }, // o satélite (e, no mecanismo, o esquema por cima)
  grafico: { de: m.desde + 6, ate: fala.noaa },
  chance: { de: fala.noaa, ate: fala.brasil },
  brasil: { de: fala.brasil, ate: fim },
};

const contas = [
  { id: "c83", de: m.p83 - 2, ate: m.p83 + 16, passo: 2 },
];

const T = {
  fala, dur, m, contas, legendas, grande, cena,
  cenas: [cena.porto.de, cena.enchente.de, m.a2024 - 2, cena.dois.de, cena.mapa.de, fala.mecanismo, fala.agora, cena.grafico.de, cena.chance.de, cena.brasil.de, grande[0].f, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.rio.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
