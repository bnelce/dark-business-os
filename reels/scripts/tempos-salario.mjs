// Linha do tempo do reel "O mínimo bateu recorde e compra menos comida que em 2017"
// (ciencia/SalarioCesta), em quadros a 30fps, a partir da narração: a duração de cada fala
// (duracoes.json) e o tempo de cada palavra (palavras.json, do Whisper,
// scripts/palavras-dolar.mjs). A composição e a trilha (gerar-trilha-salario.mjs) leem o
// mesmo arquivo: mudou a narração, roda isto de novo. Mesmo método do tempos-miniatura.mjs.
//
//   node scripts/tempos-salario.mjs <pasta do reel> src/ciencia/salario-cesta-tempos.json
//
// Lê <pasta>/roteiro.json e <pasta>/audio/proc/{duracoes,palavras}.json. Gera:
//   fala     quadro em que cada fala começa (a fala k é public/ciencia/salario/beat-<k>.mp3)
//   legendas blocos de 2 a 4 palavras sincronizados com a voz (BLOCOS abaixo), com a
//            palavra-chave marcada; os blocos com § saem grandes no palco (as duas perguntas)
//   grande   as palavras das perguntas grandes, uma a uma, com o grupo (g) e a linha (l)
//   m        instantes em que a animação reage à voz
//   digita   números digitados na tela (a trilha põe um tique em cada caractere)
//   cenas    trocas de cena (a trilha põe um whoosh em cada uma)
//   loop     quadros do gancho que se repetem no fim: a pilha de 2026 descendo de 2,16 pra 1,79
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-salario.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem a pilha descendo e o "1,79 cestas"; a voz entra logo
const PAUSA = 5;
const ORDEM = ["gancho", "real", "cesta", "cestas", "pergunta", "relogio", "historia", "final"];
const MINIMO = { pergunta: 56 }; // a pergunta grande fica um instante na tela

// "|" separa os blocos, *assim* marca a chave (laranja), § marca o bloco que sai grande no palco.
const BLOCOS = {
  gancho: "O salário mínimo | bateu *recorde*. | E compra | *menos comida* | que em 2017.",
  real: "Descontada | a inflação, | o mínimo de hoje | vale *três vezes* | o do começo | de 1995.",
  cesta: "Só que | a *cesta básica* | também subiu. | Em São Paulo, | descontada | a inflação, | ficou perto | de *570 reais* | até 2011. | Hoje custa *918*.",
  cestas: "Em 1995, | o mínimo comprava | *uma cesta*. | Em 2017, | *mais de duas*: | o melhor ano. | Em 2022, | *1,6*, | o pior | desde 2004. | Hoje, *1,8*.",
  pergunta: "§Então | §o que | §ficou *caro?*",
  relogio: "O *arroz* | nunca custou | tão pouco trabalho: | *36 minutos* | o quilo. | A *carne* | custa *7 horas* | *e 23 minutos*. | Em 2018, | eram *5 horas e 36*.",
  historia: "E a série | não conta | uma história | *simples*: | o maior | aumento real | do mínimo | foi em *1995*, | e o melhor ano | em cestas | foi *2017*.",
  final: "§Quanto tempo | §de trabalho | §custa o que | §você mais *compra?* | Diz aí | que a gente | faz a conta.",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/** Tempo (s) de cada palavra do roteiro, pelo ponto equivalente do texto transcrito (letras acumuladas). */
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
  f += Math.max(dur[id], MINIMO[id] ?? 0) + PAUSA;
}
const fimFala = fala.final + dur.final;

const em = (id, palavra, n = 1) => {
  const alvo = norm(palavra);
  const achadas = palavras[id].filter((p) => norm(p.w) === alvo);
  if (achadas.length < n) throw new Error(`"${palavra}" não aparece ${n}× na fala ${id}`);
  return achadas[n - 1].f;
};

const legendas = [];
const grande = []; // { t, chave, f, l, g }
for (const id of ORDEM) {
  const blocos = BLOCOS[id].split("|").map((s) => s.trim());
  const limpo = blocos.join(" ").replace(/[*§]/g, "");
  const narr = roteiro.beats.find((x) => x.id === id).narracao;
  if (norm(limpo.replace(/\s/g, "")) !== norm(narr.replace(/\s/g, ""))) throw new Error(`legenda de ${id} não bate com a narração:\n  ${limpo}\n  ${narr}`);
  let k = 0, linha = 0;
  for (const bloco of blocos) {
    const ehGrande = bloco.startsWith("§");
    const bl = bloco.replace(/^§/, "");
    const n = bl.split(/\s+/).length;
    const ps = palavras[id].slice(k, k + n);
    let dentro = false;
    const partes = bl.split(/\s+/).map((w, j) => {
      const abre = w.startsWith("*"), fecha = w.replace(/[.,:;?!]+$/, "").endsWith("*");
      if (abre) dentro = true;
      const parte = { t: w.replace(/\*/g, ""), chave: dentro };
      if (fecha) dentro = false;
      if (ehGrande) grande.push({ ...parte, f: ps[j].f, l: linha, g: id });
      return parte;
    });
    if (ehGrande) linha++;
    else legendas.push({ de: Math.max(0, ps[0].f - 2), partes, fim: ps.at(-1).fe });
    k += n;
  }
}
for (let i = 0; i < legendas.length; i++) {
  const prox = legendas[i + 1];
  legendas[i].ate = prox && prox.de - legendas[i].fim < 20 ? prox.de : legendas[i].fim + 8;
  delete legendas[i].fim;
}

const m = {
  recorde: em("gancho", "recorde."),
  menos: em("gancho", "menos"),
  g2017: em("gancho", "2017."),
  inflacao: em("real", "inflação,"),
  hoje: em("real", "hoje"),
  tres: em("real", "três"),
  r1995: em("real", "1995."),
  cestaB: em("cesta", "cesta"),
  subiu: em("cesta", "subiu."),
  paulo: em("cesta", "Paulo,"),
  c570: em("cesta", "570"),
  c2011: em("cesta", "2011."),
  hoje2: em("cesta", "Hoje"),
  c918: em("cesta", "918."),
  k1995: em("cestas", "1995,"),
  uma: em("cestas", "uma"),
  k2017: em("cestas", "2017,"),
  duas: em("cestas", "duas:"),
  melhor: em("cestas", "melhor"),
  k2022: em("cestas", "2022,"),
  k16: em("cestas", "1,6,"),
  pior: em("cestas", "pior"),
  k2004: em("cestas", "2004."),
  hoje3: em("cestas", "Hoje,"),
  k18: em("cestas", "1,8."),
  caro: em("pergunta", "caro?"),
  arroz: em("relogio", "arroz"),
  m36: em("relogio", "36"),
  carne: em("relogio", "carne"),
  h7: em("relogio", "7"),
  m23: em("relogio", "23"),
  r2018: em("relogio", "2018,"),
  h5: em("relogio", "5"),
  m36b: em("relogio", "36", 2),
  simples: em("historia", "simples:"),
  maior: em("historia", "maior"),
  h1995: em("historia", "1995,"),
  melhorAno: em("historia", "melhor"),
  h2017: em("historia", "2017."),
  compra: em("final", "compra?"),
  diz: em("final", "Diz"),
};

const digita = [
  { id: "x3", texto: "3", de: m.tres - 1, ate: m.tres + 3 },
  { id: "c570", texto: "570", de: m.c570 - 2, ate: m.c570 + 9 },
  { id: "c918", texto: "918", de: m.c918 - 2, ate: m.c918 + 9 },
  { id: "k102", texto: "1,02", de: m.uma - 2, ate: m.uma + 10 },
  { id: "k216", texto: "2,16", de: m.duas - 2, ate: m.duas + 10 },
  { id: "k159", texto: "1,59", de: m.k16 - 2, ate: m.k16 + 10 },
  { id: "k179", texto: "1,79", de: m.k18 - 2, ate: m.k18 + 10 },
  { id: "m36", texto: "36", de: m.m36 - 2, ate: m.m36 + 6 },
  { id: "h723", texto: "7H23", de: m.h7 - 2, ate: m.m23 + 2 },
  { id: "h536", texto: "5H36", de: m.h5 - 2, ate: m.m36b + 2 },
  { id: "g226", texto: "+22,6%", de: m.h1995 - 2, ate: m.h1995 + 14 },
  { id: "h216", texto: "2,16", de: m.h2017 - 2, ate: m.h2017 + 10 },
];

// O fim: a pergunta grande, o "diz aí", e o gancho volta: a pilha de 2026 desce de 2,16 até
// o ponto em que o quadro 0 está (o loop emenda); o CTA escrito ocupa o último 1,5s.
const LOOP_FIM = 45; // quadros do fim com a pilha descendo (τ de −45 a −1)
const LOOP_INICIO = 40; // a pilha chega em 1,79 no quadro 40 (τ de 0 a 40)
const G_FINAL = grande.filter((w) => w.g === "final");
const cta = Math.max(fimFala + 6, m.diz + 30);
const total = cta + LOOP_FIM;

const T = {
  fala, dur, m, digita, legendas, grande,
  cenas: [fala.real, fala.cesta, fala.cestas, fala.pergunta, fala.relogio, m.carne, fala.historia, G_FINAL[0].f, total - LOOP_FIM],
  loop: { inicio: LOOP_INICIO, fim: LOOP_FIM },
  fimFala, cta, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
