// Áudio do reel do Ueno Bank no Paraguai (ciencia/Paraguai), fala por fala. Pensado pra regravar
// UMA fala sem refazer as outras: só as falas pedidas passam pelo ffmpeg e pelo Whisper (o
// resto fica como está em audio/proc/), e depois os tempos e a trilha são refeitos pro vídeo
// inteiro se reposicionar sozinho.
//
//   node --env-file=reels/.env scripts/reels/narrar.js <pasta> <id>      (da raiz, só a fala)
//   cd reels && node --env-file=.env scripts/audio-paraguai.mjs ../<pasta> <id> [id ...]
//
// Sem ids, processa as 7 falas. Com --so-cru, só transcreve o áudio cru (audio/cru.json), pra
// conferir a pronúncia dos números antes de gastar tempo no resto.
//
// O corte de silêncio é em -50dB, como no reel da Binance: a -42dB ele comia o /k/ de "que" depois
// de uma pausa ("digital, que tem" virava "digital, e tem").
//
// Pra cada fala: tira as pausas, acelera (ATEMPO) e normaliza em audio/proc/, grava a duração
// em audio/proc/duracoes.json, transcreve (Whisper, tempo por palavra) em audio/proc/palavras.json
// e copia o mp3 pra public/ciencia/paraguai/. No fim roda tempos-paraguai.mjs e gerar-trilha-paraguai.mjs.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REELS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const soCru = args.includes("--so-cru");
const [PASTA_ARG, ...IDS_ARG] = args.filter((a) => a !== "--so-cru");
if (!PASTA_ARG) throw new Error("uso: audio-paraguai.mjs <pasta do reel> [ids...] [--so-cru]");
const PASTA = resolve(process.cwd(), PASTA_ARG);
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) throw new Error("falta OPENAI_API_KEY");

// Aceleração de cada fala. O gancho é o mais rápido (viralizacao.md, 3.3); a virada e a pergunta
// final respiram mais. Mudou aqui, roda de novo só a fala mudada.
const ATEMPO = { trava: 1.22, tamanho: 1.2, resolucao: 1.22, garantia: 1.22, virada: 1.18, senado: 1.22, defesa: 1.18, pergunta: 1.08 };

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const AUDIO = join(PASTA, "audio"), PROC = join(AUDIO, "proc"), PUB = join(REELS, "public/ciencia/paraguai");
mkdirSync(PROC, { recursive: true });
mkdirSync(PUB, { recursive: true });

const beats = roteiro.beats.map((b, i) => ({ id: b.id, arquivo: `beat-${String(i + 1).padStart(2, "0")}.mp3`, narracao: b.narracao }));
for (const id of IDS_ARG) if (!beats.some((b) => b.id === id)) throw new Error(`fala que não existe: ${id}`);
const alvo = IDS_ARG.length ? beats.filter((b) => IDS_ARG.includes(b.id)) : beats;

const lerJson = (arq, padrao) => (existsSync(arq) ? JSON.parse(readFileSync(arq, "utf-8")) : padrao);
const gravarJson = (arq, v) => writeFileSync(arq, `${JSON.stringify(v, null, 1)}\n`);
/** Troca as entradas das falas refeitas e mantém a ordem do roteiro. */
const junta = (velhos, novos) => beats.map((b) => novos.find((x) => x.id === b.id) ?? velhos.find((x) => x.id === b.id)).filter(Boolean);

const duracao = (arq) => Number.parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", arq]).toString());

const transcreve = async (arq, nome) => {
  const form = new FormData();
  form.append("file", new Blob([readFileSync(arq)], { type: "audio/mpeg" }), nome);
  form.append("model", "whisper-1");
  form.append("language", "pt");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  for (let t = 1; t <= 4; t++) {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${KEY}` }, body: form });
    if (res.ok) {
      const j = await res.json();
      return { texto: j.text, palavras: (j.words ?? []).map((w) => ({ w: w.word, s: +w.start.toFixed(3), e: +w.end.toFixed(3) })) };
    }
    if (t === 4) throw new Error(`Whisper falhou em ${nome}: HTTP ${res.status} ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 800 * t));
  }
};

// Conferência de pronúncia: sempre no áudio cru.
const cru = [];
for (const b of alvo) {
  const { texto } = await transcreve(join(AUDIO, b.arquivo), b.arquivo);
  cru.push({ id: b.id, narracao: b.narracao, texto });
  console.log(`cru ${b.id}: ${texto}`);
}
gravarJson(join(AUDIO, "cru.json"), junta(lerJson(join(AUDIO, "cru.json"), []), cru));
if (soCru) process.exit(0);

const novasDur = [], novasPal = [];
for (const b of alvo) {
  const entrada = join(AUDIO, b.arquivo), saida = join(PROC, b.arquivo);
  const t = ATEMPO[b.id];
  const filtro = `silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02:stop_periods=-1:stop_duration=0.14:stop_threshold=-50dB:stop_silence=0.1,atempo=${t},loudnorm=I=-15:TP=-1.5:LRA=11`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", entrada, "-af", filtro, "-ar", "44100", "-b:a", "192k", saida]);
  novasDur.push({ id: b.id, arquivo: b.arquivo, atempo: t, duracao: +duracao(saida).toFixed(3) });
  const { texto, palavras } = await transcreve(saida, b.arquivo);
  novasPal.push({ id: b.id, texto, palavras });
  copyFileSync(saida, join(PUB, b.arquivo));
  console.log(`proc ${b.id}: ${novasDur.at(-1).duracao}s · ${texto}`);
}
gravarJson(join(PROC, "duracoes.json"), junta(lerJson(join(PROC, "duracoes.json"), []), novasDur));
gravarJson(join(PROC, "palavras.json"), junta(lerJson(join(PROC, "palavras.json"), []), novasPal));

if (lerJson(join(PROC, "duracoes.json"), []).length === beats.length) {
  const roda = (script, ...a) => console.log(execFileSync("node", [join(REELS, "scripts", script), ...a], { cwd: REELS }).toString().trim());
  roda("tempos-paraguai.mjs", PASTA, "src/ciencia/paraguai-tempos.json");
  const wav = join(PROC, "trilha.wav");
  roda("gerar-trilha-paraguai.mjs", wav);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-b:a", "192k", join(PUB, "trilha.mp3")]);
}
