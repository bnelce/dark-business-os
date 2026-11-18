// Linha do tempo da aula narrada de ondas (ciencia/AulaOndas; material de estudo, não publicar), em quadros
// a 30fps, a partir da narração: duração de cada fala (audio/proc/duracoes.json) e tempo de cada palavra
// (audio/proc/palavras.json, Whisper). A composição e a trilha leem o mesmo arquivo. O audio-aula-ondas.mjs
// já chama este script.
//
//   node scripts/tempos-aula-ondas.mjs <pasta> src/ciencia/aula-ondas-tempos.json
//
// Diferente da Voyager: os blocos da legenda saem sozinhos (até 4 palavras, quebra na pontuação) e a
// palavra-chave em laranja vem da lista CHAVES. Cada fala é uma cena (Sequence) com relógio próprio:
// `cena[id].de` é o quadro de início, e `pal[id]` traz as palavras em quadros LOCAIS da cena.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-aula-ondas.mjs <pasta> <saída.json>");

const FPS = 30;
const INICIO = 20;
const PAUSA = 15; // respiro entre conceitos
const ANTES = 12; // a cena entra um pouco antes da voz
const ORDEM = ["abertura", "rolha", "natureza", "direcao", "crista", "lambda", "frequencia", "equacao", "pegadinha", "reflexao", "refracao", "difracao", "interferencia", "polarizacao", "resumo"];
// Quadros a mais depois da voz: tempo pra ler e anotar a definição antes da cena seguinte.
const EXTRA = { abertura: 20, rolha: 10, natureza: 15, direcao: 20, crista: 15, lambda: 15, frequencia: 20, equacao: 30, pegadinha: 20, reflexao: 12, refracao: 15, difracao: 12, interferencia: 15, polarizacao: 15 };
const SEGURA = 200; // a tabela do resumo fica parada ~6,7 s depois da última palavra

const CHAVES = {
  abertura: ["ola", "onda", "energia", "matéria"],
  rolha: ["sobe", "desce", "energia"],
  natureza: ["natureza", "mecânica", "meio", "material", "eletromagnética", "vácuo"],
  direcao: ["transversal", "perpendicular", "longitudinal", "mesma", "direção"],
  crista: ["crista", "vale", "amplitude", "energia", "volume"],
  lambda: ["lambda", "cristas", "seguidas"],
  frequencia: ["período", "frequência", "hertz", "inverso", "440"],
  equacao: ["lambda", "77", "centímetros"],
  pegadinha: ["fonte", "não", "muda", "velocidade", "comprimento"],
  reflexao: ["reflexão", "volta", "igual"],
  refracao: ["refração", "velocidade", "direção", "mesma"],
  difracao: ["difração", "contorna", "frestas"],
  interferencia: ["interferência", "somam", "construtiva", "destrutiva", "invertida"],
  polarizacao: ["polarização", "plano", "transversal", "polariza"],
  resumo: ["energia", "matéria", "lambda", "reflexão", "refração", "difração", "interferência"],
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/** Tempo de cada palavra do roteiro, pelo ponto equivalente do texto do Whisper (mesmo método da Voyager). */
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

const fala = {}, dur = {}, abs = {};
let f = INICIO;
for (const id of ORDEM) {
  const b = falas.find((x) => x.id === id);
  const beat = roteiro.beats.find((x) => x.id === id);
  const tr = transcritas.find((x) => x.id === id);
  fala[id] = f;
  dur[id] = Math.ceil(b.duracao * FPS);
  abs[id] = alinhar(beat.narracao, tr.palavras).map((p) => ({ w: p.w, f: f + Math.round(p.s * FPS), fe: f + Math.round(p.e * FPS) }));
  f += dur[id] + (EXTRA[id] ?? 0) + PAUSA;
}
const fimFala = fala.resumo + dur.resumo;
const total = fimFala + SEGURA;

// Cenas: cada uma começa ANTES quadros antes da sua fala e vai até a próxima (com 10 de fusão).
const cena = {};
ORDEM.forEach((id, i) => {
  const de = i === 0 ? 0 : fala[id] - ANTES;
  const ate = i + 1 < ORDEM.length ? fala[ORDEM[i + 1]] - ANTES : total;
  cena[id] = { de, ate };
});

// Palavras em quadros locais da cena: { w (normalizada), f, fe }.
const pal = {};
for (const id of ORDEM) pal[id] = abs[id].map((p) => ({ w: norm(p.w), f: p.f - cena[id].de, fe: p.fe - cena[id].de }));

// Legenda: blocos de até 4 palavras, quebrando depois de pontuação.
const legendas = [];
for (const id of ORDEM) {
  const chaves = new Set(CHAVES[id].map(norm));
  const ws = abs[id];
  let bloco = [];
  const fecha = () => {
    if (!bloco.length) return;
    legendas.push({ de: Math.max(0, bloco[0].f - 2), fim: bloco.at(-1).fe, partes: bloco.map((p) => ({ t: p.w, chave: chaves.has(norm(p.w)) })) });
    bloco = [];
  };
  ws.forEach((p) => {
    bloco.push(p);
    const pont = /[.,:;?!]$/.test(p.w);
    if (pont || bloco.length === 4) fecha();
  });
  fecha();
}
for (let i = 0; i < legendas.length; i++) {
  const prox = legendas[i + 1];
  legendas[i].ate = prox && prox.de - legendas[i].fim < 20 ? prox.de : legendas[i].fim + 10;
  delete legendas[i].fim;
}

const T = { fala, dur, cena, pal, legendas, ordem: ORDEM, fimFala, total };
writeFileSync(SAIDA, `${JSON.stringify(T)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (fimFala / FPS)).toFixed(2)} palavras/s`);
console.log(ORDEM.map((id) => `${id} ${(cena[id].de / FPS).toFixed(1)}s`).join(" · "));
