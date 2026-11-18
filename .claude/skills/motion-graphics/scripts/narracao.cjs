#!/usr/bin/env node
// Narração com a linha do tempo exata de cada frase: gera (ou recebe) uma faixa por frase,
// junta com silêncio no começo e entre frases e escreve tempos.json para a animação usar.
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const C = require("./lib/comum.cjs");

const AJUDA = `Uso: node narracao.cjs <frases.txt> <pasta-saida> [opções]

  frases.txt   uma frase por linha (linhas vazias e # são ignoradas).
               Se a linha for o caminho de um áudio (.wav .mp3 .m4a .aiff), usa a gravação em vez do TTS.
  --voz Luciana    voz do 'say' do macOS (pt_BR: Luciana, Flo, Eddy, Reed, Sandy, Shelley...)
  --taxa 180       palavras por minuto do 'say'
  --lead 0.4       silêncio antes da primeira frase (s)
  --gap 0.5        silêncio entre frases (s)

Saída: narracao.mp3, narracao.wav e tempos.json { total, frases: [{ i, texto, ini, fim }] }.
A voz do 'say' é rascunho para acertar o tempo. Para publicar, troque por locução real
(mesmas frases, um arquivo por linha) ou pelo TTS do projeto, e rode de novo: os tempos se refazem.`;

const args = C.lerArgs(process.argv.slice(2));
if (args.ajuda || args._.length < 2) { console.log(AJUDA); process.exit(args.ajuda ? 0 : 1); }
C.exigirFfmpeg();

const arqFrases = path.resolve(args._[0]);
const saida = path.resolve(args._[1]);
const voz = args.voz || "Luciana";
const taxa = String(C.num(args.taxa, 180));
const lead = C.num(args.lead, 0.4), gap = C.num(args.gap, 0.5);
fs.mkdirSync(saida, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "motion-narracao-"));

const ff = (a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a]);
const duracao = (f) => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim();
const silencio = (s, arq) => ff(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", String(s), "-c:a", "pcm_s16le", arq]);

try {
  const linhas = fs.readFileSync(arqFrases, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!linhas.length) throw new Error("frases.txt está vazio.");
  const frases = linhas.map((linha, i) => {
    const wav = path.join(tmp, `f${i + 1}.wav`);
    const talvez = path.resolve(path.dirname(arqFrases), linha);
    if (/\.(wav|mp3|m4a|aiff?|ogg|flac)$/i.test(linha) && fs.existsSync(talvez)) {
      ff(["-i", talvez, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", wav]);
      return { i: i + 1, texto: `(gravação) ${path.basename(talvez)}`, wav };
    }
    if (process.platform !== "darwin") throw new Error(`Sem 'say' fora do macOS. Grave a frase ${i + 1} e ponha o caminho do arquivo na linha.`);
    const aiff = path.join(tmp, `f${i + 1}.aiff`);
    execFileSync("say", ["-v", voz, "-r", taxa, "-o", aiff, linha]);
    ff(["-i", aiff, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", wav]);
    return { i: i + 1, texto: linha, wav };
  });

  silencio(lead, path.join(tmp, "lead.wav"));
  silencio(gap, path.join(tmp, "gap.wav"));
  const lista = [path.join(tmp, "lead.wav")];
  let t = lead;
  for (const [k, f] of frases.entries()) {
    const d = duracao(f.wav);
    f.ini = +t.toFixed(3); f.fim = +(t + d).toFixed(3);
    t += d;
    lista.push(f.wav);
    if (k < frases.length - 1) { lista.push(path.join(tmp, "gap.wav")); t += gap; }
  }
  const txt = path.join(tmp, "lista.txt");
  fs.writeFileSync(txt, lista.map((f) => `file '${f}'`).join("\n") + "\n");
  const wavFinal = path.join(saida, "narracao.wav");
  ff(["-f", "concat", "-safe", "0", "-i", txt, "-c:a", "pcm_s16le", wavFinal]);
  ff(["-i", wavFinal, "-c:a", "libmp3lame", "-q:a", "2", path.join(saida, "narracao.mp3")]);

  const total = +duracao(wavFinal).toFixed(3);
  const json = { total, voz: frases.some((f) => !f.texto.startsWith("(gravação)")) ? voz : "gravação", frases: frases.map(({ i, texto, ini, fim }) => ({ i, texto, ini, fim })) };
  fs.writeFileSync(path.join(saida, "tempos.json"), JSON.stringify(json, null, 2) + "\n");
  for (const f of json.frases) console.log(`${String(f.i).padStart(2)}  ${f.ini.toFixed(2).padStart(6)}s → ${f.fim.toFixed(2).padStart(6)}s  ${f.texto}`);
  console.log(`total ${total}s · ${path.join(saida, "narracao.mp3")} · tempos.json`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
