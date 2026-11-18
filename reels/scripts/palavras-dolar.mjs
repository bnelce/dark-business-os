// Tempo de cada palavra da narração do reel do dólar (ciencia/Dolar), pra legenda
// sincronizada e pros instantes em que a animação reage à voz. Transcreve cada
// audio/beat-XX.mp3 com o Whisper (whisper-1, timestamp_granularities=word).
//
//   node --env-file=.env scripts/palavras-dolar.mjs <reel>/audio
//
// Grava <reel>/audio/palavras.json: [{ id, texto, palavras: [{ w, s, e }] }], em segundos
// a partir do início de cada fala. O texto do Whisper pode diferir do roteiro ("9.2%" no
// lugar de "9,2%"): o tempos-dolar.mjs alinha as palavras do roteiro por posição no texto.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PASTA = process.argv[2];
if (!PASTA) throw new Error("uso: palavras-dolar.mjs <reel>/audio");
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) throw new Error("falta OPENAI_API_KEY");

const falas = JSON.parse(readFileSync(join(PASTA, "duracoes.json"), "utf-8"));
const saida = [];
for (const b of falas) {
  const form = new FormData();
  form.append("file", new Blob([readFileSync(join(PASTA, b.arquivo))], { type: "audio/mpeg" }), b.arquivo);
  form.append("model", "whisper-1");
  form.append("language", "pt");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  let res;
  for (let t = 1; t <= 4; t++) {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${KEY}` }, body: form });
    if (res.ok) break;
    if (t === 4) throw new Error(`Whisper falhou em ${b.arquivo}: HTTP ${res.status} ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 800 * t));
  }
  const j = await res.json();
  saida.push({ id: b.id, texto: j.text, palavras: (j.words ?? []).map((w) => ({ w: w.word, s: +w.start.toFixed(3), e: +w.end.toFixed(3) })) });
  console.log(`${b.id}: ${j.text}`);
}
writeFileSync(join(PASTA, "palavras.json"), `${JSON.stringify(saida, null, 1)}\n`);
