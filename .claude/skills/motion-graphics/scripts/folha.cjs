#!/usr/bin/env node
// Folha de contato (filtro tile do ffmpeg) a partir de uma pasta de prints ou de um vídeo.
// Com vídeo, tira N quadros espaçados por igual: serve para revisar o MP4 exportado de verdade.
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const C = require("./lib/comum.cjs");

const AJUDA = `Uso: node folha.cjs <pasta-de-prints | video.mp4> [opções]

  --saida folha.png    arquivo de saída (padrão: <pasta>/folha.png ou <video>-folha.png)
  --n 12               (vídeo) quantos quadros tirar
  --tempos 1,3.5,9     (vídeo) segundos exatos, em vez de --n
  --colunas 3          padrão: 3 em 16:9, 6 em 9:16, 4 em 4:5/1:1
  --largura 640        largura de cada célula em px

O ffmpeg desta máquina não tem drawtext: o tempo de cada quadro fica no nome do arquivo, não na imagem.`;

const args = C.lerArgs(process.argv.slice(2));
if (args.ajuda || !args._[0]) { console.log(AJUDA); process.exit(args.ajuda ? 0 : 1); }
C.exigirFfmpeg();

const entrada = path.resolve(args._[0]);
const ehPasta = fs.statSync(entrada).isDirectory();
const opc = { colunas: C.num(args.colunas), largura: C.num(args.largura) };
let imagens, saida, tmp;

if (ehPasta) {
  imagens = fs.readdirSync(entrada).filter((f) => /\.(png|jpe?g)$/i.test(f) && !/^folha/i.test(f)).sort().map((f) => path.join(entrada, f));
  saida = path.resolve(args.saida || path.join(entrada, "folha.png"));
} else {
  const dur = +C.ffprobeJson(entrada).format.duration;
  const n = C.num(args.n, 12);
  const tempos = args.tempos ? String(args.tempos).split(",").map(Number) : Array.from({ length: n }, (_, i) => ((i + 0.5) * dur) / n);
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "motion-folha-"));
  imagens = tempos.map((t, i) => {
    const arq = path.join(tmp, `${String(i).padStart(2, "0")}-t${t.toFixed(1)}s.png`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", t.toFixed(3), "-i", entrada, "-frames:v", "1", arq]);
    return arq;
  });
  saida = path.resolve(args.saida || entrada.replace(/\.[^.]+$/, "") + "-folha.png");
  console.log("quadros em: " + tempos.map((t) => t.toFixed(1) + "s").join(" "));
}

try {
  const r = C.montarFolha(imagens, saida, opc);
  console.log(`${saida} (${imagens.length} quadros, ${r.cols}x${r.linhas}, células de ${r.cel}px)`);
} finally {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
}
