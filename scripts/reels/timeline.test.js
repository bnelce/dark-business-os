// scripts/reels/timeline.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { montarTimeline, verificarLimitesDeDuracao, FPS } from "./timeline.js";

// Durations chosen to produce non-integer frame counts when multiplied by FPS.
// With respiroS 0.35: (2.1 + 0.35) * 30 = 73.5 → ceil 74 (vs floor 73)
// and (3.2 + 0.35) * 30 = 106.5 → ceil 107 (vs floor 106).
// This discriminates between Math.ceil and Math.floor implementations.
// Also ensures totalSegundos (181/30 ≈ 6.033) differs from float-sum (6.0).
const beats = [
  { id: "a", arquivo: "beat-01.mp3", duracao: 2.1 },
  { id: "b", arquivo: "beat-02.mp3", duracao: 3.2 },
];

test("converte duração em frames somando o respiro", () => {
  const t = montarTimeline(beats, { respiroS: 0.35 });
  assert.equal(t.fps, FPS);
  assert.equal(t.beats[0].frames, 74);
  assert.equal(t.beats[1].frames, 107);
});

test("encadeia os beats sem buraco nem sobreposição", () => {
  const t = montarTimeline(beats, { respiroS: 0.35 });
  assert.equal(t.beats[0].deFrame, 0);
  assert.equal(t.beats[1].deFrame, t.beats[0].frames);
  assert.equal(t.totalFrames, 181);
});

test("totalSegundos deriva de totalFrames, não da soma de floats", () => {
  const t = montarTimeline(beats, { respiroS: 0.35 });
  assert.equal(t.totalSegundos, 181 / FPS);
  // 6.0 is what a float-sum bug would produce; frames-derived total differs
  assert.notEqual(t.totalSegundos, 6);
});

test("aponta reel curto demais pra aba Reels", () => {
  const t = montarTimeline([{ id: "a", arquivo: "x.mp3", duracao: 3 }], { respiroS: 0 });
  const erros = verificarLimitesDeDuracao(t);
  assert.ok(erros.some((e) => e.includes("curto")));
});

test("aponta reel longo demais", () => {
  const t = montarTimeline([{ id: "a", arquivo: "x.mp3", duracao: 40 }], { respiroS: 0 });
  const erros = verificarLimitesDeDuracao(t);
  assert.ok(erros.some((e) => e.includes("longo")));
});

test("não reclama de reel dentro da faixa", () => {
  const t = montarTimeline([{ id: "a", arquivo: "x.mp3", duracao: 18 }], { respiroS: 0 });
  assert.deepEqual(verificarLimitesDeDuracao(t), []);
});

// Duplicação deliberada: reels/ é um pacote npm separado e não importa deste
// repo. Sem esta checagem, a divergência só aparece no validarMp4 — depois de
// um render de vários minutos e do gasto de TTS.
test("Root.tsx repete exatamente os constantes de formato daqui", async () => {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { LARGURA, ALTURA } = await import("./timeline.js");

  const fonte = await readFile(join(import.meta.dirname, "../../reels/src/Root.tsx"), "utf-8");

  assert.ok(fonte.includes(`fps={${FPS}}`), `Root.tsx precisa declarar fps={${FPS}}`);
  assert.ok(fonte.includes(`width={${LARGURA}}`), `Root.tsx precisa declarar width={${LARGURA}}`);
  assert.ok(fonte.includes(`height={${ALTURA}}`), `Root.tsx precisa declarar height={${ALTURA}}`);
});
