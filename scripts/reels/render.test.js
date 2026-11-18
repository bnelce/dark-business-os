import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderizar, PUBLIC_NARRACAO } from "./render.js";

// Nenhum teste aqui invoca o Remotion de verdade nem o ffprobe: `deps.rodar` e
// `deps.validar` são sempre injetados. A pasta do reel é um mkdtemp; a única
// coisa que estes testes tocam no repo é reels/public/narracao/, que é
// justamente a área de staging sob teste (gitignorada, e o render limpa no fim).

const BEATS = ["gancho", "pergunta", "resposta", "cta"];
const PROPS_ATUAL = join(import.meta.dirname, "../../reels/props-atual.json");

function roteiroDe(ids) {
  return {
    formato: "quiz-relampago",
    disciplina: "fisica",
    tema: "MRU",
    beats: ids.map((id, i) => ({
      id,
      textoTela: `tela ${i}`,
      narracao: `narração do beat número ${i}`,
    })),
    legenda: { corpo: "Revisão de MRU.", cta: "Salva pra revisar." },
    hashtags: ["#fisica"],
  };
}

// (4.5 + 0.35) * 30 = 145.5 → 146 frames por beat; 4 beats = 584 frames ≈ 19.5s,
// dentro da faixa de 15-25s exigida por verificarLimitesDeDuracao.
async function pastaDeRender({ idsRoteiro = BEATS, idsAudio = BEATS } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "render-"));
  await writeFile(join(dir, "roteiro.json"), JSON.stringify(roteiroDe(idsRoteiro)));

  const audio = join(dir, "audio");
  await mkdir(audio, { recursive: true });

  const duracoes = idsAudio.map((id, i) => ({
    id,
    arquivo: `beat-${String(i + 1).padStart(2, "0")}.mp3`,
    duracao: 4.5,
  }));
  for (const d of duracoes) await writeFile(join(audio, d.arquivo), `mp3 falso de ${d.id}`);
  await writeFile(join(audio, "duracoes.json"), JSON.stringify(duracoes));

  return dir;
}

test("render: contagem de beats diferente aborta antes de invocar o Remotion", async () => {
  const dir = await pastaDeRender({ idsAudio: BEATS.slice(0, 3) });

  let rodou = false;
  const deps = { rodar: () => { rodou = true; }, validar: () => [] };

  await assert.rejects(() => renderizar(dir, { deps }), /4 beats mas a narração tem 3/);
  assert.equal(rodou, false, "render de vários minutos não pode começar com a narração errada");
});

test("render: mesma contagem com ids trocados aborta apontando o índice", async () => {
  // Reordenar beats e re-renderizar sem renarrar dá exatamente isto: o mesmo
  // número de arquivos, com a narração debaixo da cartela errada.
  const dir = await pastaDeRender({ idsAudio: ["gancho", "resposta", "pergunta", "cta"] });

  let rodou = false;
  const deps = { rodar: () => { rodou = true; }, validar: () => [] };

  await assert.rejects(() => renderizar(dir, { deps }), /beat 1[\s\S]*"resposta"[\s\S]*"pergunta"/);
  assert.equal(rodou, false);
});

test("render: staging é limpo antes de copiar e removido mesmo se o render explodir", async () => {
  const dir = await pastaDeRender();

  // Áudio de um reel anterior, do tipo que vazaria pro render seguinte.
  await mkdir(PUBLIC_NARRACAO, { recursive: true });
  await writeFile(join(PUBLIC_NARRACAO, "beat-99.mp3"), "narração velha");

  let vistoNoStaging = null;
  const deps = {
    rodar: () => {
      vistoNoStaging = readdirSync(PUBLIC_NARRACAO);
      throw new Error("remotion explodiu no meio do render");
    },
    validar: () => [],
  };

  await assert.rejects(() => renderizar(dir, { deps }), /remotion explodiu/);

  assert.ok(vistoNoStaging, "o render precisa ter sido invocado");
  assert.ok(!vistoNoStaging.includes("beat-99.mp3"), "áudio de reel antigo vazou pro staging");
  assert.ok(vistoNoStaging.includes("beat-01.mp3"), "a narração deste reel precisa estar no staging");

  assert.equal(existsSync(PUBLIC_NARRACAO), false, "o staging tem que sumir mesmo com o render falhando");
  assert.equal(existsSync(PROPS_ATUAL), false, "props-atual.json também sai no finally");
});

test("render: MP4 não conforme derruba o render em vez de seguir pro gate humano", async () => {
  const dir = await pastaDeRender();

  const deps = {
    rodar: () => {},
    validar: () => ["Dimensões erradas: 1080x1080, esperado 1080x1920 (9:16)"],
  };

  await assert.rejects(() => renderizar(dir, { deps }), /não está conforme[\s\S]*Dimensões erradas/);
  await rm(PUBLIC_NARRACAO, { recursive: true, force: true });
});

test("render: sem a base instrumental no disco, segue sem música em vez de erro obscuro de asset", async () => {
  const dir = await pastaDeRender();
  const base = join(import.meta.dirname, "../../reels/public/audio/base-quiz.mp3");
  assert.equal(existsSync(base), false, "esse teste pressupõe que a trilha ainda não foi escolhida");

  let props = null;
  const deps = {
    rodar: () => { props = JSON.parse(readFileSync(PROPS_ATUAL, "utf-8")); },
    validar: () => [],
  };

  await renderizar(dir, { deps });

  assert.equal(props.baseInstrumental, undefined, "apontar pra um mp3 inexistente explode lá dentro do Remotion");
  assert.equal(props.roteiro.disciplina, "fisica");
  assert.equal(props.timeline.beats.length, 4);
});
