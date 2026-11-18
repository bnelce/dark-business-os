import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarCliente } from "./api.js";

const resp = (status, { json, headers = {} } = {}) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => json, text: async () => (json ? JSON.stringify(json) : ""),
});

async function arquivo(bytes = 1000) {
  const d = await mkdtemp(join(tmpdir(), "ytapi-"));
  const p = join(d, "short.mp4");
  await writeFile(p, Buffer.alloc(bytes, 1));
  return p;
}

test("envio retomável: abre a sessão com os metadados e manda o arquivo inteiro", async () => {
  const p = await arquivo(1000);
  const chamadas = [];
  const fetchFn = async (url, init) => {
    chamadas.push({ url, init });
    if (init.method === "POST") return resp(200, { headers: { location: "https://up/sessao1" } });
    return resp(200, { json: { id: "abc", status: { privacyStatus: "private" } } });
  };
  const v = await criarCliente("at", { fetchFn }).enviarVideo(p, { snippet: { title: "t" }, status: {} });
  assert.equal(v.id, "abc");
  const [abre, envia] = chamadas;
  assert.match(abre.url, /uploadType=resumable/);
  assert.equal(abre.init.headers["X-Upload-Content-Length"], "1000");
  assert.equal(abre.init.headers.Authorization, "Bearer at");
  assert.equal(JSON.parse(abre.init.body).snippet.title, "t");
  assert.equal(envia.url, "https://up/sessao1");
  assert.equal(envia.init.headers["Content-Length"], "1000");
});

test("queda no meio: pergunta quanto chegou e retoma do byte seguinte", async () => {
  const p = await arquivo(1000);
  const puts = [];
  let n = 0;
  const fetchFn = async (url, init) => {
    if (init.method === "POST") return resp(200, { headers: { location: "https://up/s" } });
    puts.push(init.headers);
    n++;
    if (n === 1) throw new Error("conexão caiu");
    if (n === 2) return resp(308, { headers: { range: "bytes=0-399" } }); // consulta de estado
    return resp(201, { json: { id: "abc", status: {} } });
  };
  const v = await criarCliente("at", { fetchFn }).enviarVideo(p, {}, { tentativas: 3 });
  assert.equal(v.id, "abc");
  assert.equal(puts[1]["Content-Range"], "bytes */1000", "consulta");
  assert.equal(puts[2]["Content-Range"], "bytes 400-999/1000", "retoma do 400");
  assert.equal(puts[2]["Content-Length"], "600");
});

test("erro 4xx no envio não fica tentando de novo", async () => {
  const p = await arquivo(10);
  let puts = 0;
  const fetchFn = async (_u, init) => {
    if (init.method === "POST") return resp(200, { headers: { location: "https://up/s" } });
    puts++;
    return resp(403, { json: { error: { message: "quotaExceeded" } } });
  };
  await assert.rejects(criarCliente("at", { fetchFn }).enviarVideo(p, {}), /403/);
  assert.equal(puts, 1);
});

test("erro da API traz o motivo", async () => {
  const fetchFn = async () => resp(403, { json: { error: { message: "The request cannot be completed", errors: [{ reason: "quotaExceeded" }] } } });
  await assert.rejects(criarCliente("at", { fetchFn }).canalAtual(), /quotaExceeded/);
});

test("confirmarCanal: com a cota geral zerada, confere pelo dono do vídeo no oEmbed", async () => {
  const mk = (autorUrl) => async (url) => {
    if (url.includes("/channels?")) return resp(403, { json: { error: { message: "quota", errors: [{ reason: "quotaExceeded" }] } } });
    if (url.includes("youtubeanalytics")) return resp(200, { json: { rows: [["vidA", 10]] } });
    if (url.includes("oembed")) return resp(200, { json: { author_name: "X", author_url: autorUrl } });
    throw new Error("inesperado " + url);
  };
  const ok = await criarCliente("at", { fetchFn: mk("https://www.youtube.com/@a2lo_dev") }).confirmarCanal("UC1", "https://www.youtube.com/@a2lo_dev");
  assert.equal(ok.ok, true);
  const errado = await criarCliente("at", { fetchFn: mk("https://www.youtube.com/@outro_canal") }).confirmarCanal("UC1", "https://www.youtube.com/@a2lo_dev");
  assert.equal(errado.ok, false);
});

test("confirmarCanal: sem vídeo público para conferir, devolve inconclusivo (null)", async () => {
  const fetchFn = async (url) => {
    if (url.includes("/channels?")) return resp(403, { json: { error: { message: "quota", errors: [{ reason: "quotaExceeded" }] } } });
    return resp(200, { json: { rows: [] } });
  };
  const r = await criarCliente("at", { fetchFn }).confirmarCanal("UC1", "https://www.youtube.com/@a2lo_dev");
  assert.equal(r.ok, null);
});
