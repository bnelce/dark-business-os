import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { carregarRoteiro } from "./roteiro.js";
import { montarTimeline, verificarLimitesDeDuracao } from "./timeline.js";
import { validarMp4 } from "./validar-mp4.js";

const RAIZ = resolve(import.meta.dirname, "../..");
const PROJETO_REMOTION = join(RAIZ, "reels");
export const PUBLIC_NARRACAO = join(PROJETO_REMOTION, "public", "narracao");

const COMPOSICAO_POR_FORMATO = {
  "quiz-relampago": "QuizRelampago",
};

const BASE_POR_FORMATO = {
  "quiz-relampago": "audio/base-quiz.mp3",
};

export async function renderizar(pasta, opcoes = {}) {
  const d = opcoes.deps ?? {};
  const rodar = d.rodar ?? ((args, cwd) => execFileSync("npx", args, { cwd, stdio: "inherit" }));
  const validar = d.validar ?? validarMp4;

  const roteiro = await carregarRoteiro(join(pasta, "roteiro.json"));
  const beats = JSON.parse(await readFile(join(pasta, "audio", "duracoes.json"), "utf-8"));

  if (beats.length !== roteiro.beats.length) {
    throw new Error(`Roteiro tem ${roteiro.beats.length} beats mas a narração tem ${beats.length}. Rode narrar.js de novo.`);
  }

  // O componente casa timeline.beats[i] com roteiro.beats[i]: contar igual não
  // basta. Reordenar ou reescrever beats sem renarrar dá o mesmo número de
  // arquivos com a narração trocada, e o ffprobe não enxerga isso.
  const desalinhado = beats.findIndex((beat, i) => beat.id !== roteiro.beats[i].id);
  if (desalinhado !== -1) {
    throw new Error(
      `Narração fora de sincronia com o roteiro no beat ${desalinhado}: ` +
      `duracoes.json diz "${beats[desalinhado].id}" e o roteiro diz "${roteiro.beats[desalinhado].id}". Rode narrar.js de novo.`
    );
  }

  const timeline = montarTimeline(beats);
  const errosDeDuracao = verificarLimitesDeDuracao(timeline);
  if (errosDeDuracao.length > 0) {
    throw new Error(`Timeline fora dos limites:\n  - ${errosDeDuracao.join("\n  - ")}`);
  }

  const composicao = COMPOSICAO_POR_FORMATO[roteiro.formato];
  if (!composicao) throw new Error(`Sem composição Remotion pro formato "${roteiro.formato}"`);

  // O Remotion resolve staticFile() dentro de reels/public/. Copia a narração pra lá,
  // renderiza, e limpa — nada de áudio de reel antigo vazando pro próximo render.
  await rm(PUBLIC_NARRACAO, { recursive: true, force: true });
  await mkdir(PUBLIC_NARRACAO, { recursive: true });
  await cp(join(pasta, "audio"), PUBLIC_NARRACAO, { recursive: true });

  // A base instrumental é escolhida num passo posterior. Faltando a faixa, o
  // render segue sem música (o componente já trata baseInstrumental como
  // opcional) em vez de abortar: reel mudo de fundo dá pra revisar e publicar,
  // e travar aqui bloquearia o pipeline inteiro por um arquivo cosmético.
  // O que não pode é o erro obscuro de asset do Remotion depois do gasto de TTS.
  let baseInstrumental = BASE_POR_FORMATO[roteiro.formato];
  if (baseInstrumental && !existsSync(join(PROJETO_REMOTION, "public", baseInstrumental))) {
    console.warn(`! Base instrumental ausente: ${join(PROJETO_REMOTION, "public", baseInstrumental)}`);
    console.warn(`  Renderizando sem música de fundo. Coloque a faixa nesse caminho quando escolher a trilha.`);
    baseInstrumental = undefined;
  }

  const props = { roteiro, timeline, baseInstrumental };
  const caminhoDeProps = join(PROJETO_REMOTION, "props-atual.json");
  await writeFile(caminhoDeProps, JSON.stringify(props));

  const saida = resolve(pasta, "reel.mp4");
  console.log(`Renderizando ${composicao} — ${timeline.totalFrames} frames (${timeline.totalSegundos.toFixed(1)}s)...`);

  try {
    rodar(["remotion", "render", composicao, saida, `--props=${caminhoDeProps}`], PROJETO_REMOTION);
  } finally {
    await rm(PUBLIC_NARRACAO, { recursive: true, force: true });
    await rm(caminhoDeProps, { force: true });
  }

  const erros = validar(saida);
  if (erros.length > 0) {
    throw new Error(`MP4 gerado não está conforme:\n  - ${erros.join("\n  - ")}`);
  }

  console.log(`\n✓ ${saida} — conforme (1080x1920, 30fps, h264, com áudio)`);
  return saida;
}

if (import.meta.filename === process.argv[1]) {
  const pasta = process.argv[2];
  if (!pasta) {
    console.error("Uso: node scripts/reels/render.js <pasta-do-reel>");
    process.exit(1);
  }
  await renderizar(pasta);
}
