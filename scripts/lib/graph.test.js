import { test } from "node:test";
import assert from "node:assert/strict";
import { esperarContainer } from "./graph.js";

function fetchFalso(sequenciaDeStatus) {
  let chamada = 0;
  return async () => {
    const status_code = sequenciaDeStatus[Math.min(chamada++, sequenciaDeStatus.length - 1)];
    return { ok: true, json: async () => ({ status_code }) };
  };
}

test("retorna quando o container fica FINISHED", async () => {
  await esperarContainer("c1", "token", {
    fetchImpl: fetchFalso(["IN_PROGRESS", "IN_PROGRESS", "FINISHED"]),
    intervaloMs: 1,
  });
});

test("lança quando o container vai pra ERROR", async () => {
  await assert.rejects(
    () => esperarContainer("c1", "token", { fetchImpl: fetchFalso(["ERROR"]), intervaloMs: 1 }),
    /falhou no processamento/,
  );
});

test("lança ao estourar o timeout", async () => {
  await assert.rejects(
    () => esperarContainer("c1", "token", { fetchImpl: fetchFalso(["IN_PROGRESS"]), intervaloMs: 1, timeoutMs: 20 }),
    /não ficou pronto/,
  );
});

test("respeita um timeout maior, que é o que vídeo precisa", async () => {
  const inicio = Date.now();
  await esperarContainer("c1", "token", {
    fetchImpl: fetchFalso(["IN_PROGRESS", "FINISHED"]),
    intervaloMs: 5,
    timeoutMs: 300_000,
  });
  assert.ok(Date.now() - inicio < 1000, "não deve esperar o timeout inteiro quando fica pronto");
});
