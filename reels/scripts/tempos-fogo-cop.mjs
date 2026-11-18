// Linha do tempo do reel desmatamento × fogo (ciencia/FogoCop), em quadros a 30fps, a partir da
// narração: a duração de cada fala (audio/proc/duracoes.json) e o tempo de cada palavra
// (audio/proc/palavras.json, do Whisper). A composição e a trilha (gerar-trilha-fogo-cop.mjs) leem o
// mesmo arquivo: mudou uma fala, tudo se reposiciona. O audio-fogo-cop.mjs já chama este script.
//
//   node scripts/tempos-fogo-cop.mjs <pasta do reel> src/ciencia/fogo-cop-tempos.json
//
// Gera:
//   fala     quadro em que cada fala começa (a fala k é public/ciencia/fogo-cop/beat-<k>.mp3)
//   legendas blocos de 2 a 4 palavras (BLOCOS abaixo), com a palavra-chave marcada; os blocos com §
//            viram a pergunta grande do fim
//   grande   as palavras da pergunta final, uma a uma, no quadro em que a voz diz cada uma
//   m        instantes em que a animação reage à voz
//   drenaA/C quando os quadrados do desmatamento escorrem (Amazônia e Cerrado)
//   somem    um "plic" por quadrado que some (a trilha lê)
//   fogos    crepitar enquanto cada barra de fogo sobe
//   digita, contas, cenas, graves, sinos: marcas pra trilha
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-fogo-cop.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem os quadrados escorrendo; a voz entra logo
const PAUSA = 5; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "prodes", "foco", "biomas", "regua", "estados", "virada", "pergunta"];
const EXTRA = { estados: 10 }; // as barras dos estados ficam um pouco mais na tela

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca o bloco que sai
// como pergunta grande no palco. Sem as marcas, o texto tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "O desmatamento | na *Amazônia* | caiu ao *menor nível* | já medido. | E o *fogo?*",
  prodes: "Pela estimativa | do INPE, | foram *3.335* | quilômetros quadrados, | *42% a menos*. | No *Cerrado*, | o *menor* da série, | que começa | em *2001*.",
  foco: "O fogo aqui | é contado | em *focos de calor*, | e foco | *não é área queimada.* | Usamos sempre | o mesmo satélite, | o *AQUA*.",
  biomas: "De janeiro | a outubro, | a *Amazônia* teve | *40% menos* focos | que a *média* | de 2019 a 2025. | O *Cerrado*, | *38% menos*. | A *Caatinga*, | *8%*.",
  regua: "Mas troque | a *régua*. | Contra *2025*, | um ano | de pouco fogo, | a Amazônia teve | *70% a mais*.",
  estados: "No *Pará*, | mais da metade | dos focos de 2026 | veio só | em *outubro*, | o *maior outubro* | da série. | No *Ceará*, | perto da média.",
  virada: "E o *PRODES* | vai de agosto | a *julho*: | esse *outubro* | ficou *fora*. | Segundo o INPE, | nem toda | *área queimada* | vira *desmatamento*.",
  pergunta: "Pra comparar | o fogo, | §qual *régua* | §você usaria: | §a *média* ou | §o *ano passado?*",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
const D = JSON.parse(readFileSync(new URL("../src/ciencia/fogo-cop.json", import.meta.url), "utf-8"));
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
legendas[0].de = 0; // a 1ª legenda já está inteira no quadro 0

const m = {
  menor: em("gancho", "menor"),
  medido: em("gancho", "medido."),
  fogo: em("gancho", "fogo?"),
  km: em("prodes", "3.335"),
  p42: em("prodes", "42%"),
  cerrado: em("prodes", "Cerrado,"),
  c2001: em("prodes", "2001."),
  focos: em("foco", "focos"),
  area: em("foco", "área"),
  aqua: em("foco", "AQUA."),
  amazonia: em("biomas", "Amazônia"),
  media: em("biomas", "média"),
  cerrado2: em("biomas", "Cerrado,"),
  caatinga: em("biomas", "Caatinga,"),
  regua: em("regua", "régua."),
  r2025: em("regua", "2025,"),
  r70: em("regua", "70%"),
  para: em("estados", "Pará,"),
  outubro: em("estados", "outubro,"),
  serie: em("estados", "série."),
  ceara: em("estados", "Ceará,"),
  prodes: em("virada", "PRODES"),
  julho: em("virada", "julho:"),
  outubro2: em("virada", "outubro"),
  fora: em("virada", "fora."),
  queimada: em("virada", "queimada"),
  desmat: em("virada", "desmatamento."),
};

// Quadrados do desmatamento: a Amazônia escorre do quadro 0 até a voz dizer "3.335"; o Cerrado,
// de "Cerrado" até "2001". Um plic por quadrado inteiro que some, no quadro em que ele some.
const drenaA = { de: 0, ate: m.km + 4 }; // chega em 3.335 quando a voz diz o número
const drenaC = { de: m.cerrado + 4, ate: m.c2001 };
const somem = [];
const plics = (b, dr, pan, fq) => {
  for (let k = Math.floor(b.atual / 100); k < Math.ceil(b.anterior / 100); k++) {
    const km = (k + 0.5) * 100; // o quadrado k passa da metade
    if (km > b.anterior || km < b.atual) continue;
    const t = (b.anterior - km) / (b.anterior - b.atual);
    somem.push({ f: Math.round(dr.de + (dr.ate - dr.de) * t), pan, fq });
  }
};
plics(D.fatos.amazonia, drenaA, 0.42, 950);
plics(D.fatos.cerrado, drenaC, 0.6, 780);

const fogos = [m.amazonia, m.cerrado2, m.caatinga, m.para, m.ceara].map((q) => ({ de: q - 4, ate: q + 22 }));
// A régua muda: as marcas da média deslizam até 2025 entre "régua" e "2025".
const troca = { de: m.regua - 2, ate: m.r2025 + 6 };

// Depois da pergunta, os quadrados da abertura voltam e se enchem até o ano anterior: o último
// quadro emenda no quadro 0. O CTA escrito ocupa o último 1,5s.
const VOLTA = 45;
const cta = fimFala + 10;
const total = cta + VOLTA;
const fim = total - VOLTA;

const G0 = grande[0].f;
const T = {
  fala, dur, m, legendas, grande, drenaA, drenaC, somem, fogos, troca,
  digita: [],
  contas: [],
  graves: [m.medido, m.p42, m.c2001, m.area, m.r70, m.serie],
  sinos: [m.fogo, m.aqua, m.regua, m.prodes, m.fora],
  cenas: [fala.foco, fala.biomas, m.regua, fala.estados, fala.virada, fala.pergunta, G0, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
