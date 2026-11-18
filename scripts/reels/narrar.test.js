import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { duracaoDoAudio, gerarNarracao } from "./narrar.js";

// Gera um MP3 real de duração conhecida, pra testar o ffprobe de verdade
function mp3DeSilencio(caminho, segundos) {
  execFileSync("ffmpeg", [
    "-f", "lavfi", "-i", `anullsrc=r=24000:cl=mono`,
    "-t", String(segundos), "-q:a", "9", "-y", caminho,
  ], { stdio: "ignore" });
  return caminho;
}

test("lê a duração real de um mp3 com ffprobe", async () => {
  const dir = await mkdtemp(join(tmpdir(), "narrar-"));
  const arquivo = mp3DeSilencio(join(dir, "t.mp3"), 2);
  const duracao = duracaoDoAudio(arquivo);
  assert.ok(Math.abs(duracao - 2) < 0.2, `esperava ~2s, veio ${duracao}`);
});

test("gera um mp3 por beat e grava duracoes.json", async () => {
  const dir = await mkdtemp(join(tmpdir(), "narrar-"));
  const roteiro = {
    beats: [
      { id: "gancho", narracao: "primeira" },
      { id: "resposta", narracao: "segunda" },
    ],
  };

  const chamadas = [];
  const fetchImpl = async (url, opcoes) => {
    chamadas.push(JSON.parse(opcoes.body));
    const mp3 = mp3DeSilencio(join(dir, `fonte-${chamadas.length}.mp3`), 1);
    const buf = await readFile(mp3);
    // .buffer devolveria o pool interno do Node (maior que o arquivo). Recorta só os bytes reais.
    return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  };

  const resultado = await gerarNarracao(roteiro, dir, { apiKey: "k", fetchImpl });

  assert.equal(resultado.length, 2);
  assert.equal(resultado[0].arquivo, "beat-01.mp3");
  assert.equal(resultado[1].arquivo, "beat-02.mp3");
  assert.ok(resultado[0].duracao > 0);
  assert.ok(resultado[1].duracao > 0);

  assert.deepEqual(chamadas.map((c) => c.input), ["primeira", "segunda"]);

  const gravado = JSON.parse(await readFile(join(dir, "audio", "duracoes.json"), "utf-8"));
  assert.equal(gravado.length, 2);
  assert.equal(gravado[0].id, "gancho");
  assert.equal(gravado[0].arquivo, "beat-01.mp3");
  assert.ok(gravado[0].duracao > 0);
  assert.equal(gravado[1].id, "resposta");
  assert.equal(gravado[1].arquivo, "beat-02.mp3");
  assert.ok(gravado[1].duracao > 0);

  const stat1 = await stat(join(dir, "audio", resultado[0].arquivo));
  const stat2 = await stat(join(dir, "audio", resultado[1].arquivo));
  assert.ok(stat1.isFile());
  assert.ok(stat2.isFile());
});

test("aborta se a API de TTS falhar num beat, em vez de deixar trecho mudo", async () => {
  const dir = await mkdtemp(join(tmpdir(), "narrar-"));
  const roteiro = { beats: [{ id: "a", narracao: "x" }] };
  const fetchImpl = async () => ({ ok: false, status: 429, text: async () => "rate limited" });

  await assert.rejects(() => gerarNarracao(roteiro, dir, { apiKey: "k", fetchImpl }), /TTS falhou/);
});

test("aborta no meio de um roteiro de vários beats sem gravar duracoes.json", async () => {
  const dir = await mkdtemp(join(tmpdir(), "narrar-"));
  const roteiro = {
    beats: [
      { id: "gancho", narracao: "primeira" },
      { id: "meio", narracao: "segunda" },
      { id: "fim", narracao: "terceira" },
    ],
  };

  let chamada = 0;
  const fetchImpl = async () => {
    chamada += 1;
    if (chamada < 3) {
      const mp3 = mp3DeSilencio(join(dir, `fonte-${chamada}.mp3`), 1);
      const buf = await readFile(mp3);
      return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    }
    return { ok: false, status: 429, text: async () => "rate limited" };
  };

  await assert.rejects(
    () => gerarNarracao(roteiro, dir, { apiKey: "k", fetchImpl }),
    /TTS falhou no beat "fim"/,
  );

  // A garantia que importa: duracoes.json só existe se o loop inteiro terminou.
  // Arquivos dos beats anteriores podem ter ficado no disco (sem limpeza deliberada) —
  // isso não é o que provaria uma corrida incompleta; a ausência do duracoes.json é.
  await assert.rejects(() => stat(join(dir, "audio", "duracoes.json")));
});

test("retenta falha passageira e segue, em vez de matar o lote", async () => {
  const dir = await mkdtemp(join(tmpdir(), "narrar-"));
  const roteiro = { beats: [{ id: "a", narracao: "x" }] };
  let chamadas = 0;
  const fetchImpl = async () => {
    chamadas++;
    // falha nas duas primeiras, sucede na terceira — é o padrão observado em produção
    if (chamadas < 3) return { ok: false, status: 404, text: async () => "" };
    const mp3 = mp3DeSilencio(join(dir, "ok.mp3"), 1);
    const buf = await readFile(mp3);
    return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  };

  const r = await gerarNarracao(roteiro, dir, { apiKey: "k", fetchImpl, esperaMs: 1 });
  assert.equal(chamadas, 3, "deveria ter tentado 3 vezes");
  assert.equal(r.length, 1);
  assert.ok(r[0].duracao > 0);
});

test("desiste depois de esgotar as tentativas, sem deixar duracoes.json", async () => {
  const dir = await mkdtemp(join(tmpdir(), "narrar-"));
  let chamadas = 0;
  const fetchImpl = async () => { chamadas++; return { ok: false, status: 500, text: async () => "erro" }; };
  await assert.rejects(
    () => gerarNarracao({ beats: [{ id: "a", narracao: "x" }] }, dir, { apiKey: "k", fetchImpl, tentativas: 3, esperaMs: 1 }),
    /TTS falhou.*3 tentativas/,
  );
  assert.equal(chamadas, 3);
  await assert.rejects(() => stat(join(dir, "audio", "duracoes.json")));
});

test("regrava só os beats pedidos e mantém o áudio dos outros", async () => {
  const dir = await mkdtemp(join(tmpdir(), "narrar-"));
  const roteiro = { beats: [{ id: "gancho", narracao: "primeira" }, { id: "resposta", narracao: "segunda" }] };
  const fetchDe = (segundos, chamadas) => async (url, opcoes) => {
    chamadas.push(JSON.parse(opcoes.body).input);
    const buf = await readFile(mp3DeSilencio(join(dir, `fonte-${segundos}-${chamadas.length}.mp3`), segundos));
    return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  };

  await gerarNarracao(roteiro, dir, { apiKey: "k", fetchImpl: fetchDe(1, []) });
  const chamadas = [];
  const resultado = await gerarNarracao(roteiro, dir, { apiKey: "k", fetchImpl: fetchDe(2, chamadas), apenas: ["resposta"] });

  assert.deepEqual(chamadas, ["segunda"]);
  assert.ok(Math.abs(resultado[0].duracao - 1) < 0.2, "o gancho ficou com o áudio antigo");
  assert.ok(Math.abs(resultado[1].duracao - 2) < 0.2, "a resposta foi regravada");
  const gravado = JSON.parse(await readFile(join(dir, "audio", "duracoes.json"), "utf-8"));
  assert.deepEqual(gravado.map((b) => b.id), ["gancho", "resposta"]);
});

test("recusa regravar beat que não existe no roteiro", async () => {
  const dir = await mkdtemp(join(tmpdir(), "narrar-"));
  await assert.rejects(
    gerarNarracao({ beats: [{ id: "gancho", narracao: "x" }] }, dir, { apiKey: "k", apenas: ["gancho", "fantasma"] }),
    /fantasma/,
  );
});
