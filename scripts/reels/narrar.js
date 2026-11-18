import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { carregarRoteiro } from "./roteiro.js";

const VOZ_PADRAO = "onyx";
const MODELO = "gpt-4o-mini-tts";
const INSTRUCOES_PADRAO = "Fale em português do Brasil, tom coloquial e direto, ritmo levemente acelerado, como quem explica pra um amigo antes da prova.";

export function duracaoDoAudio(caminho) {
  const saida = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    caminho,
  ]).toString().trim();

  const duracao = Number.parseFloat(saida);
  if (!Number.isFinite(duracao)) throw new Error(`ffprobe não retornou duração pra ${caminho}`);
  return duracao;
}

export async function gerarNarracao(roteiro, pastaDeSaida, opcoes = {}) {
  // O roteiro pode trazer voz e tom próprios (cada marca tem o seu); senão vale o padrão.
  // `apenas`: ids dos beats a regravar. O TTS às vezes engole a última frase de uma fala ou
  // embola uma palavra; regravar só aquela fala mantém o resto da narração que já foi conferido.
  const {
    apiKey, voz = roteiro.voz ?? VOZ_PADRAO, instrucoes = roteiro.instrucoesVoz ?? INSTRUCOES_PADRAO,
    fetchImpl = fetch, tentativas = 4, esperaMs = 700, apenas = null,
  } = opcoes;
  const pastaDeAudio = join(pastaDeSaida, "audio");
  await mkdir(pastaDeAudio, { recursive: true });
  for (const id of apenas ?? []) {
    if (!roteiro.beats.some((b) => b.id === id)) throw new Error(`beat que não existe no roteiro: ${id}`);
  }

  const resultado = [];

  for (const [i, beat] of roteiro.beats.entries()) {
    const nome = `beat-${String(i + 1).padStart(2, "0")}.mp3`;
    const caminho = join(pastaDeAudio, nome);

    if (apenas && !apenas.includes(beat.id)) {
      resultado.push({ id: beat.id, arquivo: nome, duracao: duracaoDoAudio(caminho) });
      continue;
    }

    const pedido = {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELO,
        voice: voz,
        input: beat.narracao,
        // Um beat pode pedir um tom próprio (ex.: o gancho mais rápido que o resto).
        instructions: beat.instrucoesVoz ?? instrucoes,
        response_format: "mp3",
      }),
    };

    // A API devolve erro passageiro sob chamadas rápidas em sequência (já observado:
    // 404 de corpo vazio na 4ª requisição de um lote, com a mesma chamada funcionando
    // isolada). Abortar na primeira falha matava o lote inteiro por um blip. Retenta
    // antes de desistir — a garantia de nunca deixar trecho mudo continua, porque
    // esgotadas as tentativas ainda lança.
    let res;
    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
      res = await fetchImpl("https://api.openai.com/v1/audio/speech", pedido);
      if (res.ok) break;
      if (tentativa === tentativas) {
        throw new Error(`TTS falhou no beat "${beat.id}" após ${tentativas} tentativas (HTTP ${res.status}): ${await res.text()}`);
      }
      await new Promise((r) => setTimeout(r, esperaMs * tentativa));
    }

    await writeFile(caminho, Buffer.from(await res.arrayBuffer()));
    resultado.push({ id: beat.id, arquivo: nome, duracao: duracaoDoAudio(caminho) });
  }

  await writeFile(join(pastaDeAudio, "duracoes.json"), `${JSON.stringify(resultado, null, 2)}\n`);
  return resultado;
}

if (import.meta.filename === process.argv[1]) {
  const [pasta, ...apenas] = process.argv.slice(2);
  if (!pasta) {
    console.error("Uso: node --env-file=.env scripts/reels/narrar.js <pasta-do-reel> [id-do-beat ...]");
    process.exit(1);
  }

  const roteiro = await carregarRoteiro(join(pasta, "roteiro.json"));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Variável de ambiente faltando: OPENAI_API_KEY");

  const beats = await gerarNarracao(roteiro, pasta, {
    apiKey, ...(process.env.VOZ_TTS && { voz: process.env.VOZ_TTS }), ...(apenas.length && { apenas }),
  });
  const total = beats.reduce((soma, b) => soma + b.duracao, 0);

  for (const b of beats) console.log(`  ${b.arquivo}  ${b.duracao.toFixed(2)}s  (${b.id})`);
  console.log(`\n✓ ${beats.length} beats, ${total.toFixed(2)}s de narração`);
}
