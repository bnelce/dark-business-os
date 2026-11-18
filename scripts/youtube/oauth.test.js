import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { montarUrlDeAutorizacao, gerarPkce, ESCOPOS, carregarCliente, obterAccessToken, salvarToken, ARQUIVO_CLIENTE } from "./oauth.js";

test("PKCE: challenge é o SHA-256 base64url do verifier", () => {
  const { verifier, challenge } = gerarPkce();
  assert.equal(challenge, createHash("sha256").update(verifier).digest("base64url"));
  assert.ok(verifier.length >= 43);
});

test("URL pede offline, consentimento, os 3 escopos e PKCE S256", () => {
  const u = new URL(montarUrlDeAutorizacao({ clientId: "abc", redirectUri: "http://127.0.0.1:5555", codeChallenge: "xyz", state: "s1" }));
  assert.equal(u.searchParams.get("access_type"), "offline");
  assert.match(u.searchParams.get("prompt"), /consent/);
  assert.match(u.searchParams.get("prompt"), /select_account/, "precisa deixar escolher o canal A2LO");
  assert.deepEqual(u.searchParams.get("scope").split(" "), ESCOPOS);
  assert.equal(u.searchParams.get("code_challenge_method"), "S256");
  assert.equal(u.searchParams.get("redirect_uri"), "http://127.0.0.1:5555");
  assert.equal(u.searchParams.get("state"), "s1");
});

async function dirComCliente(conteudo) {
  const d = await mkdtemp(join(tmpdir(), "yt-"));
  await writeFile(join(d, ARQUIVO_CLIENTE), JSON.stringify(conteudo));
  return d;
}

test("aceita só credencial de App para computador", async () => {
  const ok = await dirComCliente({ installed: { client_id: "id", client_secret: "seg" } });
  assert.deepEqual(await carregarCliente(ok), { clientId: "id", clientSecret: "seg" });
  const web = await dirComCliente({ web: { client_id: "id", client_secret: "seg" } });
  await assert.rejects(carregarCliente(web), /App para computador/);
  await assert.rejects(carregarCliente(join(tmpdir(), "nao-existe-yt")), /não achei/);
});

test("renova o access token com o refresh token guardado", async () => {
  const d = await dirComCliente({ installed: { client_id: "id", client_secret: "seg" } });
  await salvarToken(d, { refresh_token: "rt" });
  assert.equal(((await stat(join(d, "youtube-token.json"))).mode & 0o777), 0o600, "token só legível pelo dono");
  let corpo;
  const fetchFn = async (_url, init) => { corpo = Object.fromEntries(new URLSearchParams(init.body)); return { ok: true, json: async () => ({ access_token: "at" }) }; };
  assert.equal(await obterAccessToken(d, { fetchFn }), "at");
  assert.equal(corpo.grant_type, "refresh_token");
  assert.equal(corpo.refresh_token, "rt");
});

test("invalid_grant vira instrução de reautorizar", async () => {
  const d = await dirComCliente({ installed: { client_id: "id", client_secret: "seg" } });
  await salvarToken(d, { refresh_token: "rt" });
  const fetchFn = async () => ({ ok: false, status: 400, json: async () => ({ error: "invalid_grant" }) });
  await assert.rejects(obterAccessToken(d, { fetchFn }), /autorizar\.js/);
});

test("sem token: manda autorizar", async () => {
  const d = await dirComCliente({ installed: { client_id: "id", client_secret: "seg" } });
  await assert.rejects(obterAccessToken(d), /ainda não autorizado/);
});
