// Linha do tempo do reel "Vai faltar luz em dezembro?" (ciencia/Apagao), em quadros a 30fps, a
// partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra
// (palavras.json, do Whisper). A composição e a trilha (gerar-trilha-apagao.mjs) leem o mesmo
// arquivo: mudou uma fala, tudo se reposiciona. O audio-apagao.mjs já chama este script.
//
//   node scripts/tempos-apagao.mjs <pasta do reel> src/ciencia/apagao-tempos.json
//
// Os números da fala são conferidos contra os CSVs do ONS pelo gerar-apagao.py (que escreve
// src/ciencia/apagao.json). Aqui só se confere que a legenda bate com a narração.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-apagao.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem o celular vibrando; a voz entra logo
const PAUSA = 4; // respiro entre uma fala e a próxima
const ORDEM = ["gancho", "origem", "sudeste", "compara", "norte", "ons", "bolso", "pergunta"];
// Quadros a mais depois da voz: o tanque do Norte encolhe e o 2021 fica na tela pra dar tempo de ler.
const EXTRA = { compara: 10, norte: 12 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja). Sem as marcas, o texto
// tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "Vai faltar luz | em *dezembro*? | O tal apagão | de *90 dias* | é *falso*.",
  origem: "Ele mistura *Os Simpsons*, | um *teste de alerta* | nos Estados Unidos | e o *kit* | de 72 horas | da Defesa Civil, | que é só *prevenção*.",
  sudeste: "A luz depende | da água | das *hidrelétricas*. | No *Sudeste* | e Centro-Oeste, | que guardam | *70%* dela, | os reservatórios | estão em *55%*.",
  compara: "Há um ano, | *44%*. | Em *2021*, | na crise hídrica, | *menos de 19%*.",
  norte: "O *Norte* caiu: | *57%*, | contra *69%* | em 2025, | o ano mais cheio | em seis. | Mas lá fica | só *5%* da água.",
  ons: "O ONS diz | que o *El Niño*, | *sozinho*, | não *ameaça* | o fornecimento, | e *1,8 gigawatt* | de térmicas | foi antecipado. | Queda *local*, | por temporal, | ainda acontece.",
  bolso: "O que pode | pesar é | a *conta*: | a *ANEEL* anuncia | a bandeira | de *dezembro* | no dia *27*.",
  pergunta: "Você achava | que os *reservatórios* | estavam mais *vazios* | que no *ano passado*?",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);
const fala$ = (id) => roteiro.beats.find((b) => b.id === id).narracao;

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Tempo (s) de cada palavra do roteiro. O Whisper escreve diferente ("ANEL", "1,8 GW"), então a
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
  dezembro: em("gancho", "dezembro?"),
  apagao: em("gancho", "apagão"),
  n90: em("gancho", "90"),
  dias: em("gancho", "dias"),
  falso: em("gancho", "falso."),
  mistura: em("origem", "mistura"),
  simpsons: em("origem", "Simpsons,"),
  teste: em("origem", "teste"),
  kit: em("origem", "kit"),
  n72: em("origem", "72"),
  prevencao: em("origem", "prevenção."),
  agua: em("sudeste", "água"),
  hidreletricas: em("sudeste", "hidrelétricas."),
  sudeste: em("sudeste", "Sudeste"),
  p70: em("sudeste", "70%"),
  reservatorios: em("sudeste", "reservatórios"),
  p55: em("sudeste", "55%."),
  ano: em("compara", "ano,"),
  p44: em("compara", "44%."),
  a2021: em("compara", "2021,"),
  crise: em("compara", "crise"),
  p19: em("compara", "19%."),
  norte: em("norte", "Norte"),
  p57: em("norte", "57%,"),
  p69: em("norte", "69%"),
  cheio: em("norte", "cheio"),
  seis: em("norte", "seis."),
  p5: em("norte", "5%"),
  ons: em("ons", "ONS"),
  nino: em("ons", "Niño,"),
  sozinho: em("ons", "sozinho,"),
  g18: em("ons", "1,8"),
  termicas: em("ons", "térmicas"),
  queda: em("ons", "Queda"),
  temporal: em("ons", "temporal,"),
  conta: em("bolso", "conta:"),
  aneel: em("bolso", "ANEEL"),
  bandeira: em("bolso", "bandeira"),
  dezembroB: em("bolso", "dezembro"),
  d27: em("bolso", "27."),
  achava: em("pergunta", "achava"),
  reservatoriosP: em("pergunta", "reservatórios"),
  vazios: em("pergunta", "vazios"),
  passado: em("pergunta", "passado?"),
};

// Depois da pergunta, o celular volta com a 1ª mensagem (o loop emenda no quadro 0) e o CTA
// escrito ocupa o último 1,3s.
const VOLTA = 40;
const cta = fimFala + 8;
const total = cta + VOLTA;
const fim = total - VOLTA;

const digita = [
  { id: "boato", texto: "APAGÃO DE 90 DIAS A PARTIR\nDE 17/11. REPASSA!", de: m.apagao - 4, ate: m.dias + 4 },
  { id: "ons", texto: "ONS: EL NIÑO, SOZINHO,\nNÃO AMEAÇA O FORNECIMENTO", de: m.ons - 2, ate: m.sozinho + 14 },
  { id: "queda", texto: "QUEDA LOCAL CONTINUA POSSÍVEL", de: m.queda - 2, ate: m.temporal + 10 },
];

// Contadores: a água subindo e descendo (a trilha põe tiques enquanto ela anda) e os números correndo.
const contas = [
  { id: "enche55", de: m.agua - 2, ate: m.p55, passo: 3 },
  { id: "desce21", de: m.a2021 - 4, ate: m.p19 + 2, passo: 2 },
  { id: "volta55", de: fala.norte - 14, ate: fala.norte + 2, passo: 3 },
  { id: "norte57", de: m.p57 - 6, ate: m.p57 + 6, passo: 2 },
  { id: "gw", de: m.g18 - 6, ate: m.termicas + 4, passo: 2 },
  { id: "dias", de: m.dezembroB - 4, ate: m.d27 + 6, passo: 2 },
];

const T = {
  fala, dur, m, digita, contas, legendas,
  cenas: [fala.origem, fala.sudeste, fala.norte, fala.ons, fala.bolso, fala.pergunta, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s · "falso" em ${(m.falso / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
