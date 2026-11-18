// Linha do tempo do reel de divulgação do eleicoes.a2lo.dev (ciencia/SiteEleicoes), em quadros
// a 30fps, a partir da narração: duracoes.json e palavras.json (Whisper, palavras-dolar.mjs).
// As legendas vêm do campo `legenda` de cada beat do roteiro: "|" separa os blocos e *assim*
// marca a palavra-chave. Sem as marcas, o texto tem que ser igual à narração (o script confere).
//
//   node scripts/tempos-site-eleicoes.mjs <pasta do reel> src/ciencia/site-eleicoes-tempos.json
//
// Gera fala (quadro em que cada fala começa; a fala k é public/ciencia/site-eleicoes/beat-<k>.mp3),
// fim, palavras (quadro de cada palavra do roteiro, pra animação reagir à voz), legendas,
// marca e total. O fim emenda no começo: o último quadro volta ao enquadramento do quadro 0.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-site-eleicoes.mjs <pasta do reel> <saída.json>");

const FPS = 30, INICIO = 1, PAUSA = 5;
const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== roteiro.beats.map((b) => b.id).join()) throw new Error("as falas gravadas não batem com o roteiro");

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
const palavrasDe = (t) => t.split(/\s+/).filter(Boolean);

/** Tempo (s) de cada palavra do roteiro, pelo ponto equivalente do texto transcrito (letras acumuladas). */
const alinhar = (narracao, ws) => {
  const rot = palavrasDe(narracao);
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
  return rot.map((w, i) => {
    const s = tempoEm((acc / totR) * totW);
    acc += lr[i];
    return { w, s, e: tempoEm((acc / totR) * totW) };
  });
};

const fala = {}, fim = {}, palavras = {}, legendas = [];
let f = INICIO;
for (const [i, beat] of roteiro.beats.entries()) {
  const q = Math.ceil(falas[i].duracao * FPS);
  fala[beat.id] = f;
  fim[beat.id] = f + q;
  palavras[beat.id] = alinhar(beat.narracao, transcritas[i].palavras).map((p) => ({ w: p.w, f: f + Math.round(p.s * FPS), fe: f + Math.round(p.e * FPS) }));

  const blocos = beat.legenda.split("|").map((s) => s.trim());
  const limpo = blocos.join(" ").replace(/\*/g, "");
  if (norm(limpo) !== norm(beat.narracao)) throw new Error(`a legenda de "${beat.id}" não bate com a narração:\n  ${limpo}\n  ${beat.narracao}`);
  let k = 0, dentro = false;
  for (const bloco of blocos) {
    const pedacos = palavrasDe(bloco);
    const ps = palavras[beat.id].slice(k, k + pedacos.length);
    const partes = pedacos.map((w) => {
      if (w.startsWith("*")) dentro = true;
      const parte = { t: w.replace(/\*/g, ""), chave: dentro };
      if (w.replace(/[.,:;?!]+$/, "").endsWith("*")) dentro = false;
      return parte;
    });
    legendas.push({ de: Math.max(0, ps[0].f - 2), partes, fim: ps.at(-1).fe });
    k += pedacos.length;
  }
  f += q + PAUSA;
}
for (let i = 0; i < legendas.length; i++) {
  const prox = legendas[i + 1];
  legendas[i].ate = prox && prox.de - legendas[i].fim < 20 ? prox.de : legendas[i].fim + 8;
  delete legendas[i].fim;
}
legendas[0].de = 0; // a primeira legenda já está inteira no quadro 0

const ultima = roteiro.beats.at(-1).id;
const T = { fala, fim, palavras, legendas, marca: fim[ultima], total: fim[ultima] + 14 };
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
console.log(`${T.total} quadros (${(T.total / FPS).toFixed(1)}s)`);
