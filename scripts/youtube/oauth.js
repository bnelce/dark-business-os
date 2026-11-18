// OAuth 2.0 do Google para app de computador: login uma vez no navegador (loopback em 127.0.0.1 + PKCE),
// guarda o refresh token em <secrets>/youtube-token.json (0600) e depois renova o access token sozinho.
// Nada aqui imprime client_secret, refresh token ou access token.
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { readFile, writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

export const ESCOPOS = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const ARQUIVO_CLIENTE = "youtube-oauth-client.json";
export const ARQUIVO_TOKEN = "youtube-token.json";

export function gerarPkce() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function montarUrlDeAutorizacao({ clientId, redirectUri, codeChallenge, state, escopos = ESCOPOS }) {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: escopos.join(" "),
    access_type: "offline", // devolve refresh token
    prompt: "consent select_account", // força o refresh token e deixa escolher o canal certo
    include_granted_scopes: "true",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });
  return `${AUTH_URL}?${p}`;
}

/** Lê o JSON baixado do Google Cloud (credencial "App para computador"). */
export async function carregarCliente(dirSecrets) {
  const caminho = join(dirSecrets, ARQUIVO_CLIENTE);
  let bruto;
  try { bruto = JSON.parse(await readFile(caminho, "utf8")); }
  catch { throw new Error(`não achei a credencial OAuth em ${caminho} (baixe o JSON do Google Cloud e salve com esse nome)`); }
  const c = bruto.installed ?? bruto.web;
  if (!bruto.installed) throw new Error("a credencial precisa ser do tipo \"App para computador\" (o JSON veio sem a chave \"installed\")");
  if (!c?.client_id || !c?.client_secret) throw new Error("credencial OAuth incompleta (sem client_id ou client_secret)");
  return { clientId: c.client_id, clientSecret: c.client_secret };
}

export async function lerToken(dirSecrets) {
  try { return JSON.parse(await readFile(join(dirSecrets, ARQUIVO_TOKEN), "utf8")); }
  catch { return null; }
}

export async function salvarToken(dirSecrets, dados) {
  const caminho = join(dirSecrets, ARQUIVO_TOKEN);
  await writeFile(caminho, JSON.stringify(dados, null, 2) + "\n", { mode: 0o600 });
  await chmod(caminho, 0o600);
}

async function postarToken(corpo, fetchFn) {
  const r = await fetchFn(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(corpo) });
  const j = await r.json();
  if (!r.ok || j.error) {
    const motivo = j.error === "invalid_grant"
      ? "autorização vencida ou revogada: rode de novo scripts/youtube/autorizar.js (se o app estiver em \"Teste\" no Google Cloud, ela vence em 7 dias)"
      : `${j.error ?? r.status}: ${j.error_description ?? ""}`;
    throw new Error(`Google OAuth recusou: ${motivo}`);
  }
  return j;
}

/** Troca o refresh token guardado por um access token novo. */
export async function obterAccessToken(dirSecrets, { fetchFn = fetch } = {}) {
  const cliente = await carregarCliente(dirSecrets);
  const token = await lerToken(dirSecrets);
  if (!token?.refresh_token) throw new Error("ainda não autorizado: rode node scripts/youtube/autorizar.js");
  const j = await postarToken({ client_id: cliente.clientId, client_secret: cliente.clientSecret, refresh_token: token.refresh_token, grant_type: "refresh_token" }, fetchFn);
  return j.access_token;
}

function abrirNoNavegador(url) {
  spawn("open", [url], { stdio: "ignore", detached: true }).unref();
}

/** Login no navegador: sobe um servidor em 127.0.0.1 numa porta livre e espera o Google redirecionar com o code. */
export async function autorizarNoNavegador(dirSecrets, { fetchFn = fetch, abrir = abrirNoNavegador, log = console.log } = {}) {
  const cliente = await carregarCliente(dirSecrets);
  const { verifier, challenge } = gerarPkce();
  const state = randomBytes(16).toString("hex");

  let redirectUri;
  const code = await new Promise((resolve, reject) => {
    const servidor = createServer((req, res) => {
      const u = new URL(req.url, "http://127.0.0.1");
      if (u.pathname !== "/") { res.writeHead(404).end(); return; }
      const erro = u.searchParams.get("error");
      const ok = !erro && u.searchParams.get("state") === state && u.searchParams.get("code");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(ok ? "<h2>Autorizado. Pode fechar esta aba e voltar ao terminal.</h2>" : `<h2>Não autorizado (${erro ?? "state inválido"}).</h2>`);
      servidor.close();
      if (ok) resolve(u.searchParams.get("code"));
      else reject(new Error(`autorização recusada: ${erro ?? "state não confere"}`));
    });
    servidor.listen(0, "127.0.0.1", () => {
      redirectUri = `http://127.0.0.1:${servidor.address().port}`;
      const url = montarUrlDeAutorizacao({ clientId: cliente.clientId, redirectUri, codeChallenge: challenge, state });
      log("Abrindo o navegador para autorizar. Escolha a conta e o CANAL A2LO, e marque todas as permissões.");
      log(`Se não abrir sozinho, cole no navegador:\n${url}\n`);
      abrir(url);
    });
    setTimeout(() => { servidor.close(); reject(new Error("tempo esgotado (5 min) esperando a autorização")); }, 300_000).unref();
  });

  const j = await postarToken({ client_id: cliente.clientId, client_secret: cliente.clientSecret, code, code_verifier: verifier, redirect_uri: redirectUri, grant_type: "authorization_code" }, fetchFn);
  if (!j.refresh_token) throw new Error("o Google não devolveu refresh token (revogue o acesso em myaccount.google.com/permissions e autorize de novo)");
  const faltando = ESCOPOS.filter((e) => !(j.scope ?? "").split(" ").includes(e));
  return { refreshToken: j.refresh_token, accessToken: j.access_token, escopos: (j.scope ?? "").split(" "), faltando };
}
