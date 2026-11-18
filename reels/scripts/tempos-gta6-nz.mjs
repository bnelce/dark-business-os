// Linha do tempo do reel "GTA VI pelo fuso da Nova Zelândia" (ciencia/Gta6Nz), em quadros a 30fps,
// a partir da narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra
// (palavras.json, do Whisper). A composição e a trilha (gerar-trilha-gta6-nz.mjs) leem o mesmo arquivo.
// Mesmo método do tempos-gta6.mjs; o audio-gta6-nz.mjs já chama este script.
//
//   node scripts/tempos-gta6-nz.mjs <pasta do reel> src/ciencia/gta6-nz-tempos.json
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-gta6-nz.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1;
const PAUSA = 4;
const ORDEM = ["gancho", "ciencia", "regiao", "xbox", "ps5", "riscos", "fecho"];
// Quadros a mais depois da voz, pra ler o que ficou na tela.
const EXTRA = { gancho: 4, ciencia: 12, regiao: 4, xbox: 10, ps5: 12, riscos: 14 };

// Legenda: "|" separa os blocos, *assim* marca a palavra-chave (laranja). Sem as marcas, o texto
// tem que ser igual à narração (o script confere).
const BLOCOS = {
  gancho: "Tem *brasileiro* jogando | *GTA VI* desde | as *8 da manhã*. | E o jogo | só libera aqui | à *meia-noite*.",
  ciencia: "A Terra gira | *15 graus* por hora, | e a *meia-noite* anda | de *leste para oeste*. | A *Nova Zelândia*, | colada na | *Linha da Data* | e em | *horário de verão*, | vira o dia | *16 horas antes* | de Brasília.",
  regiao: "E a loja libera | pela *região*, | não pelo *relógio*. | Mudar a hora | do console | *não adianta*.",
  xbox: "No *Xbox*, | com o jogo | já baixado: | *Configurações*, | *Sistema*, | *Idioma e localização*, | local *Nova Zelândia*, | e *reiniciar*. | Segundo a Vice | e o TechTudo, | o jogo *destrava*. | Depois do lançamento, | é só voltar | para *Brasil*.",
  ps5: "No *PS5*, | a região é | *da conta* | e não muda. | Os guias descrevem | uma *conta nova* | da *Nova Zelândia*, | o jogo comprado | *de novo* | na loja de lá, | com *cartão-presente* | em *dólar neozelandês*, | e o *compartilhamento* | do console ligado.",
  riscos: "O *risco*: | as *regras do Xbox* | proíbem contornar | *trava regional*, | mas não há | punição relatada. | No *PS5*, | *dado falso* | viola os *termos* | da Sony, | e há relatos | de *contas suspensas*, | *sem confirmação*. | Você paga | *duas vezes*. | E *conta pronta*, | vendida por terceiros, | tem relato | de *banimento*.",
  fecho: "Para quem esperou | *13 anos*, | são *16 horas*. | Vale *arriscar* | *a conta*?",
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
const fimFala = fala.fecho + dur.fecho;

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
  brasileiro: em("gancho", "brasileiro"), n8: em("gancho", "8"), manha: fimDe("gancho", "manhã."), meianoiteG: em("gancho", "meia-noite."),
  terra: em("ciencia", "Terra"), n15: em("ciencia", "15"), meianoiteC: em("ciencia", "meia-noite"), leste: em("ciencia", "leste"),
  oeste: fimDe("ciencia", "oeste."), zelandiaC: em("ciencia", "Zelândia,"), linha: em("ciencia", "Linha"), verao: em("ciencia", "verão,"),
  vira: em("ciencia", "vira"), n16: em("ciencia", "16"), brasiliaC: fimDe("ciencia", "Brasília."),
  loja: em("regiao", "loja"), regiao: em("regiao", "região,"), relogio: em("regiao", "relógio."), mudar: em("regiao", "Mudar"), adianta: em("regiao", "adianta."),
  xbox: em("xbox", "Xbox,"), baixado: em("xbox", "baixado:"), config: em("xbox", "Configurações,"), sistema: em("xbox", "Sistema,"),
  idioma: em("xbox", "Idioma"), local: em("xbox", "local"), nzX: em("xbox", "Zelândia,"), reiniciar: em("xbox", "reiniciar."),
  segundo: em("xbox", "Segundo"), destrava: em("xbox", "destrava."), depois: em("xbox", "Depois"), brasilX: em("xbox", "Brasil."),
  ps5: em("ps5", "PS5,"), daConta: em("ps5", "conta"), guias: em("ps5", "guias"), contaNova: em("ps5", "conta", 2), nzP: em("ps5", "Zelândia,"),
  comprado: em("ps5", "comprado"), novo: em("ps5", "novo"), cartao: em("ps5", "cartão-presente"), dolar: em("ps5", "dólar"),
  compart: em("ps5", "compartilhamento"), ligado: fimDe("ps5", "ligado."),
  risco: em("riscos", "risco:"), regras: em("riscos", "regras"), trava: em("riscos", "trava"), punicao: em("riscos", "punição"),
  ps5R: em("riscos", "PS5,"), falso: em("riscos", "falso"), termos: em("riscos", "termos"), suspensas: em("riscos", "suspensas,"),
  confirmacao: em("riscos", "confirmação."), paga: em("riscos", "paga"), duas: em("riscos", "duas"), pronta: em("riscos", "pronta,"),
  banimento: fimDe("riscos", "banimento."),
  esperou: em("fecho", "esperou"), n13: em("fecho", "13"), n16F: em("fecho", "16"), vale: em("fecho", "Vale"), contaF: fimDe("fecho", "conta?"),
};

// Depois da pergunta, a tela do gancho volta (o loop emenda no quadro 0) e o CTA escrito ocupa o
// último 1,3s.
const VOLTA = 40;
const cta = fimFala + 10;
const total = cta + VOLTA;
const fim = total - VOLTA;

// O traço da meia-noite: hora UTC (a partir da 0h de 18/11) em cada quadro-chave. Entra pela direita,
// para na Nova Zelândia (11h) e corre até o Brasil (27h = 3h de 19/11).
const meianoite = [
  { f: fala.ciencia, t: 9.6 },
  { f: m.zelandiaC - 2, t: 11 },
  { f: m.vira - 2, t: 11 },
  { f: m.brasiliaC, t: 27 },
];

const T = {
  fala, dur, m, legendas, meianoite,
  cenas: [fala.ciencia, fala.regiao, fala.xbox, fala.ps5, fala.riscos, fala.fecho, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
