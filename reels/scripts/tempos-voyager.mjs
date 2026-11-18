// Linha do tempo do reel da Voyager 1 a um dia-luz (ciencia/Voyager), em quadros a 30fps, a partir da
// narração: a duração de cada fala (duracoes.json) e o tempo de cada palavra (palavras.json, do Whisper).
// A composição e a trilha (gerar-trilha-voyager.mjs) leem o mesmo arquivo. O audio-voyager.mjs já chama
// este script.
//
//   node scripts/tempos-voyager.mjs <pasta do reel> src/ciencia/voyager-tempos.json
//
// Mesmo formato do tempos-elnino.mjs (fala, legendas, grande, m, cenas). Novidade: {fala=tela} nos
// BLOCOS, pra a voz ler "Voyager um" e a legenda mostrar "Voyager 1".
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: tempos-voyager.mjs <pasta do reel> <saída.json>");

const FPS = 30;
const INICIO = 1; // o quadro 0 já tem o pulso subindo e o relógio correndo; a voz entra logo
const PAUSA = 3;
const ORDEM = ["gancho", "dialuz", "corrida", "longe", "heliopausa", "ponto", "pergunta"];
// Quadros a mais depois da voz: a corrida termina com o pulso chegando à Voyager; o ponto pede silêncio.
const EXTRA = { corrida: 12, ponto: 10 };

// "|" separa os blocos, *assim* marca a palavra-chave (laranja), § marca a pergunta grande do fim,
// {um=1} é a palavra falada "um" que aparece escrita "1".
const BLOCOS = {
  gancho: "Se você mandar | um *oi* pra | *Voyager {um=1}* | nesta quarta, 18, | a resposta | *só chega* | *na sexta.*",
  dialuz: "Às 7 e 16 | da manhã, | ela fica | a *um dia-luz* | da Terra: | o sinal leva | *24 horas* | pra chegar lá, | e *mais 24* | pra voltar.",
  corrida: "A mesma luz | chega à *Lua* | em pouco mais | de *um segundo,* | ao *Sol* | em *8 minutos,* | e a *Netuno* | em *4 horas.*",
  longe: "A Voyager está | *quase seis vezes* | mais longe | que Netuno: | *25,9 bilhões* | de quilômetros.",
  heliopausa: "Lançada em *1977,* | ela cruzou | a *heliopausa,* | a borda da bolha | do vento solar, | em *2012,* | e *ainda manda dados.*",
  ponto: "Em *1990,* | a um quarto | dessa distância, | ela já via | a *Terra* assim.",
  pergunta: "§Chuta: em que ano | §ela chega a | §*dois dias-luz?*",
};

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const falas = JSON.parse(readFileSync(join(PASTA, "audio/proc/duracoes.json"), "utf-8"));
const transcritas = JSON.parse(readFileSync(join(PASTA, "audio/proc/palavras.json"), "utf-8"));
if (falas.map((b) => b.id).join() !== ORDEM.join()) throw new Error(`ordem das falas mudou: ${falas.map((b) => b.id)}`);

const norm = (w) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
const falada = (s) => s.replace(/\{([^=}]+)=[^}]+\}/g, "$1");
const escrita = (s) => s.replace(/\{[^=}]+=([^}]+)\}/g, "$1");

/** Tempo de cada palavra do roteiro, pelo ponto equivalente do texto do Whisper (mesmo método do tempos-elnino). */
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

const em = (id, palavra, n = 1) => {
  const alvo = norm(palavra);
  const achadas = palavras[id].filter((p) => norm(p.w) === alvo);
  if (achadas.length < n) throw new Error(`"${palavra}" não aparece ${n}× na fala ${id}`);
  return achadas[n - 1].f;
};

const legendas = [];
const grande = [];
let linhaGrande = 0;
for (const id of ORDEM) {
  const blocos = BLOCOS[id].split("|").map((s) => s.trim());
  const limpo = falada(blocos.join(" ")).replace(/[*§]/g, "");
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
      const parte = { t: escrita(w).replace(/\*/g, ""), chave: dentro };
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
legendas[0].de = 0;

const m = {
  oi: em("gancho", "oi"),
  voyager: em("gancho", "Voyager"),
  quarta: em("gancho", "quarta,"),
  resposta: em("gancho", "resposta"),
  sexta: em("gancho", "sexta."),
  h716: em("dialuz", "7"),
  dialuz: em("dialuz", "dia-luz"),
  terra: em("dialuz", "Terra:"),
  h24: em("dialuz", "24"),
  chegar: em("dialuz", "chegar"),
  mais24: em("dialuz", "24", 2),
  voltar: em("dialuz", "voltar."),
  luz: em("corrida", "luz"),
  lua: em("corrida", "Lua"),
  segundo: em("corrida", "segundo,"),
  sol: em("corrida", "Sol"),
  minutos: em("corrida", "minutos,"),
  netuno: em("corrida", "Netuno"),
  horas: em("corrida", "horas."),
  seis: em("longe", "seis"),
  netunoL: em("longe", "Netuno:"),
  bilhoes: em("longe", "bilhões"),
  a1977: em("heliopausa", "1977,"),
  heliopausa: em("heliopausa", "heliopausa,"),
  borda: em("heliopausa", "borda"),
  a2012: em("heliopausa", "2012,"),
  dados: em("heliopausa", "dados."),
  a1990: em("ponto", "1990,"),
  quarto: em("ponto", "quarto"),
  terraP: em("ponto", "Terra"),
  dois: em("pergunta", "dois"),
};

// O fim volta pra cena do relógio (o quadro 0), com o CTA escrito no último 1,5s.
const VOLTA = 45;
const cta = fimFala + 8;
const total = cta + VOLTA;
const fim = total - VOLTA;

const cena = {
  relogio: { de: 0, ate: fala.corrida },
  corrida: { de: fala.corrida, ate: fala.longe },
  longe: { de: fala.longe, ate: fala.heliopausa },
  bolha: { de: fala.heliopausa, ate: fala.ponto },
  ponto: { de: fala.ponto, ate: fala.pergunta },
  pergunta: { de: fala.pergunta, ate: fim },
};

const T = {
  fala, dur, m, legendas, grande, cena,
  cenas: [fala.dialuz, cena.corrida.de, cena.longe.de, cena.bolha.de, cena.ponto.de, cena.pergunta.de, fim],
  fimFala, cta, fim, total,
};
writeFileSync(SAIDA, `${JSON.stringify(T, null, 1)}\n`);
const nPal = roteiro.beats.reduce((s, b) => s + b.narracao.split(/\s+/).length, 0);
console.log(`${total} quadros (${(total / FPS).toFixed(1)}s) · ${nPal} palavras · ${(nPal / (total / FPS)).toFixed(2)} palavras/s · gancho termina em ${(palavras.gancho.at(-1).fe / FPS).toFixed(2)}s`);
console.log(Object.entries(fala).map(([k, v]) => `${k} ${(v / FPS).toFixed(1)}s`).join(" · "));
