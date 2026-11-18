import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicarNoYouTube, lerArgumentos, REGISTRO } from "./publicar.js";

const CANAL = "UCcanalA2LO";

async function pasta(cfg = {}) {
  const d = await mkdtemp(join(tmpdir(), "ytpub-"));
  await writeFile(join(d, "short.mp4"), "mp4");
  await writeFile(join(d, "youtube.json"), JSON.stringify({ titulo: "Título", descricao: "Desc", tags: ["a"], ...cfg }));
  return d;
}

function falso({ canalId = CANAL, obtida = "private", confirma = true, canalDoVideo = CANAL } = {}) {
  const chamadas = [];
  const cliente = {
    confirmarCanal: async (esperado) => ({ ok: confirma === null ? null : canalId === esperado && confirma, id: canalId, via: "teste" }),
    enviarVideo: async (arq, meta) => { chamadas.push(["enviar", arq, meta]); return { id: "vid123", snippet: { channelId: canalDoVideo }, status: { privacyStatus: obtida } }; },
    acharOuCriarPlaylist: async (t) => { chamadas.push(["playlist", t]); return { id: "PL1", criada: true }; },
    adicionarNaPlaylist: async (p, v) => chamadas.push(["add", p, v]),
    comentar: async (v, t) => chamadas.push(["comentar", v, t]),
  };
  return { chamadas, deps: { obterAccessToken: async () => "at", criarCliente: () => cliente, canalEsperado: CANAL, log: () => {} } };
}

test("sem flags: envio privado de teste, sem precisar de aprovação", async () => {
  const d = await pasta();
  const { chamadas, deps } = falso();
  const r = await publicarNoYouTube(d, {}, deps);
  assert.equal(chamadas[0][2].status.privacyStatus, "private");
  assert.equal(r.url, "https://www.youtube.com/shorts/vid123");
  const salvo = JSON.parse(await readFile(join(d, REGISTRO), "utf8"));
  assert.equal(salvo.videoId, "vid123");
});

test("público ou agendado sem --pode-publicar: recusa antes de qualquer chamada", async () => {
  const d = await pasta();
  const { chamadas, deps } = falso();
  await assert.rejects(publicarNoYouTube(d, { privacidade: "public" }, deps), /pode-publicar/);
  await assert.rejects(publicarNoYouTube(d, { publicarEm: new Date(Date.now() + 9e6).toISOString() }, deps), /pode-publicar/);
  await assert.rejects(publicarNoYouTube(d, { privacidade: "unlisted" }, deps), /pode-publicar/);
  assert.equal(chamadas.length, 0);
});

test("recusa canal errado sem enviar", async () => {
  const d = await pasta();
  const { chamadas, deps } = falso({ canalId: "UCoutro" });
  await assert.rejects(publicarNoYouTube(d, {}, deps), /canal/);
  assert.equal(chamadas.length, 0);
});

test("pediu público e veio privado: avisa da auditoria", async () => {
  const d = await pasta();
  const { deps } = falso({ obtida: "private" });
  const r = await publicarNoYouTube(d, { privacidade: "public", aprovado: true }, deps);
  assert.match(r.avisos.join(" "), /auditoria/);
});

test("público: aplica playlist e posta o comentário", async () => {
  const d = await pasta({ playlist: "Segurança digital", comentario: "O que tem painel na internet?" });
  const { chamadas, deps } = falso({ obtida: "public" });
  const r = await publicarNoYouTube(d, { privacidade: "public", aprovado: true }, deps);
  assert.deepEqual(chamadas.find((c) => c[0] === "add"), ["add", "PL1", "vid123"]);
  assert.ok(chamadas.find((c) => c[0] === "comentar"));
  assert.equal(r.playlist.id, "PL1");
});

test("privado: comentário fica pendente", async () => {
  const d = await pasta({ comentario: "oi" });
  const { chamadas, deps } = falso();
  const r = await publicarNoYouTube(d, {}, deps);
  assert.equal(chamadas.some((c) => c[0] === "comentar"), false);
  assert.match(r.comentario, /pendente/);
});

test("não envia duas vezes a mesma pasta", async () => {
  const d = await pasta();
  const { deps } = falso();
  await publicarNoYouTube(d, {}, deps);
  await assert.rejects(publicarNoYouTube(d, {}, deps), /já enviado/);
});

test("metadados inválidos param antes do envio", async () => {
  const d = await pasta({ titulo: "x".repeat(120) });
  const { chamadas, deps } = falso();
  await assert.rejects(publicarNoYouTube(d, {}, deps), /100/);
  assert.equal(chamadas.length, 0);
});

test("argumentos da linha de comando", () => {
  assert.deepEqual(lerArgumentos(["p"]), { pasta: "p", opcoes: { privacidade: "private" } });
  assert.deepEqual(lerArgumentos(["p", "--publico", "--pode-publicar"]).opcoes, { privacidade: "public", aprovado: true });
  assert.equal(lerArgumentos(["p", "--agendar", "2026-11-14T19:00:00-03:00"]).opcoes.publicarEm, "2026-11-14T19:00:00-03:00");
  assert.throws(() => lerArgumentos(["p", "--xyz"]), /desconhecida/);
});

test("canal não confirmável (cota geral zerada, canal sem vídeo público): só deixa envio privado", async () => {
  const d = await pasta();
  const { chamadas, deps } = falso({ confirma: null });
  await assert.rejects(publicarNoYouTube(d, { privacidade: "public", aprovado: true }, deps), /envio privado/);
  assert.equal(chamadas.length, 0);
  const r = await publicarNoYouTube(d, {}, deps);
  assert.equal(r.canal.id, CANAL, "conferido pela resposta do envio");
});

test("vídeo caiu em outro canal: grava o registro com o aviso e falha alto, sem playlist nem comentário", async () => {
  const d = await pasta({ playlist: "X", comentario: "oi" });
  const { chamadas, deps } = falso({ confirma: null, canalDoVideo: "UCpessoal" });
  await assert.rejects(publicarNoYouTube(d, {}, deps), /CANAL ERRADO/);
  assert.equal(chamadas.some((c) => c[0] === "playlist" || c[0] === "comentar"), false);
  const salvo = JSON.parse(await readFile(join(d, REGISTRO), "utf8"));
  assert.equal(salvo.canal.id, "UCpessoal");
});
