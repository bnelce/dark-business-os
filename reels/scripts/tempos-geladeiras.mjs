// Linha do tempo do reel das geladeiras hackeadas (ciencia/Geladeiras), em quadros a 30fps, a
// partir da narração (duracoes.json e palavras.json do Whisper). A composição e a trilha
// (gerar-trilha-geladeiras.mjs) leem o mesmo arquivo. O audio-geladeiras.mjs já chama este script.
//
//   node scripts/tempos-geladeiras.mjs <pasta do reel> src/ciencia/geladeiras-tempos.json
//
// Antes de tudo, confere que cada número da fala existe em src/ciencia/geladeiras.json e que esse
// arquivo bate com dados/kev-resumo.json (gerado pelo dados/conferir.py): se um lado mudar, para.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-geladeiras.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem o termômetro subindo; a voz entra logo
const PAUSA = 4;
const ORDEM = ["gancho", "fogo", "painel", "degelo", "alarme", "falhas", "kev", "expostos", "autoria", "pergunta"];
// Quadros a mais depois da voz, pra dar tempo de ler.
const EXTRA = { fogo: 8, kev: 10, autoria: 14 };

const BLOCOS = {
  gancho: "*Ninguém tocou* | nessas geladeiras. | Mesmo assim, | elas começaram | a *esquentar*. | Numa noite, | o ataque atingiu | cerca de *700 locais* | na França.",
  fogo: "E houve cerca | de *20 começos* | *de incêndio*, | segundo a promotoria | de Paris.",
  painel: "Os invasores entraram | pelos *painéis* | que controlam o frio, | *abertos na internet*.",
  degelo: "Segundo a promotoria, | mandaram um | *degelo sem fim*: | a *resistência* | que derrete o gelo | ficou *ligada* | *sem parar*.",
  alarme: "E o *alarme* | de temperatura? | *Desligado*.",
  falhas: "Só que a agência | americana *CISA* | já tinha publicado | *26 falhas* | desses painéis | *antes do ataque*.",
  kev: "*Nenhuma* delas | está na lista | de *falhas exploradas* | da própria CISA.",
  expostos: "E a empresa | *Coalition* contou | *820 painéis* Danfoss | abertos em | *redes francesas*.",
  autoria: "*Segundo a França*, | foi uma unidade | da Guarda Revolucionária | do Irã. | *O Irã* chama | a acusação | de *sem fundamento*.",
  pergunta: "Você imaginava | que dava pra | *esquentar* a geladeira | de um mercado | *pela internet*?",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
const D = JSON.parse(readFileSync(new URL("../src/ciencia/geladeiras.json", import.meta.url), "utf-8"));
const K = JSON.parse(readFileSync(join(PASTA, "dados/kev-resumo.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

// Números da fala contra o geladeiras.json, e o geladeiras.json contra os dados conferidos.
const fala$ = (id) => roteiro.beats.find((b) => b.id === id).narracao;
const exige = (id, trecho) => { if (!fala$(id).includes(trecho)) throw new Error(`fala ${id} não diz "${trecho}" (geladeiras.json)`); };
exige("gancho", `cerca de ${D.locais} locais`);
exige("fogo", `cerca de ${D.incendios} começos`);
exige("falhas", `${D.falhas} falhas`);
exige("expostos", `${D.expostos.franca} painéis`);
const confere = (nome, a, b) => { if (a !== b) throw new Error(`${nome}: tela ${a}, dados ${b}`); };
confere("falhas", D.falhas, K.cves.length);
confere("cves", D.cves.join(), K.cves.join());
D.avisos.forEach((a, i) => { confere(`aviso ${a.id}`, a.cves, K.avisos[i].cves); confere(`id ${i}`, a.id, K.avisos[i].id); });
confere("soma dos avisos", D.avisos.reduce((s, a) => s + a.cves, 0), D.falhas);
confere("kev achadas", D.kev.achadas, K.cves_no_kev.length + K.kev_com_esses_fabricantes.length);
confere("kev entradas", D.kev.entradas, K.kev.entradas);
confere("nota máxima", D.notaMaxima.cve, K.avisos[1].cve_nota_maxima);
confere("nota", D.notaMaxima.nota, K.avisos[1].nota_maxima);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Tempo (s) de cada palavra do roteiro. O Whisper escreve diferente ("COP 31", "18 %"), então a
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
  ninguem: em("gancho", "Ninguém"),
  esquentar: em("gancho", "esquentar."),
  noite: em("gancho", "noite,"),
  atingiu: em("gancho", "atingiu"),
  n700: em("gancho", "700"),
  houve: em("fogo", "houve"),
  n20: em("fogo", "20"),
  incendio: em("fogo", "incêndio,"),
  promotoria: em("fogo", "promotoria"),
  invasores: em("painel", "invasores"),
  paineis: em("painel", "painéis"),
  frio: em("painel", "frio,"),
  internet: em("painel", "internet."),
  degelo: em("degelo", "degelo"),
  resistencia: em("degelo", "resistência"),
  gelo: em("degelo", "gelo"),
  ligada: em("degelo", "ligada"),
  parar: em("degelo", "parar."),
  alarme: em("alarme", "alarme"),
  desligado: em("alarme", "Desligado."),
  cisa: em("falhas", "CISA"),
  publicado: em("falhas", "publicado"),
  n26: em("falhas", "26"),
  antes: em("falhas", "antes"),
  nenhuma: em("kev", "Nenhuma"),
  lista: em("kev", "lista"),
  exploradas: em("kev", "exploradas"),
  coalition: em("expostos", "Coalition"),
  n820: em("expostos", "820"),
  francesas: em("expostos", "francesas."),
  franca: em("autoria", "França,"),
  guarda: em("autoria", "Guarda"),
  ira: em("autoria", "Irã", 2),
  fundamento: em("autoria", "fundamento."),
  imaginava: em("pergunta", "imaginava"),
  esquentarP: em("pergunta", "esquentar"),
  internetP: em("pergunta", "internet?"),
};

// Depois da pergunta, o balcão volta ao frio do quadro 0 (o loop emenda) e o CTA escrito ocupa o fim.
const VOLTA = 40;
const cta = fimFala + 8;
const total = cta + VOLTA;
const fim = total - VOLTA;

const digita = [
  { id: "cert", texto: "ALERTA CERT-FR · 12/10/2026", de: m.paineis - 4, ate: m.paineis + 16 },
  { id: "prom", texto: "SEGUNDO A PROMOTORIA DE PARIS", de: fala.degelo, ate: fala.degelo + 18 },
  { id: "kev", texto: "DANFOSS · COPELAND · DIXELL", de: m.lista - 2, ate: m.lista + 16 },
];

const contas = [
  { id: "c700", de: m.n700 - 10, ate: m.n700 + 8, passo: 2 },
  { id: "c26", de: m.n26 - 8, ate: m.n26 + 10, passo: 2 },
  { id: "c820", de: m.n820 - 10, ate: m.n820 + 8, passo: 2 },
];

const T = {
  fala, dur, m, digita, contas, legendas,
  cenas: [fala.fogo, fala.painel, fala.degelo, fala.falhas, fala.kev, fala.expostos, fala.autoria, fala.pergunta, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · "Ninguém tocou" termina em ${(palavras.gancho[1].fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
