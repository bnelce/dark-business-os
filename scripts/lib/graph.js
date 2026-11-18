export const GRAPH_API = "https://graph.facebook.com/v21.0";

// error_subcode fica anexado ao Error (não só na mensagem) pra quem chama poder
// reagir a um código específico sem parsear string — ver o fallback de trial
// reel em scripts/reels/publicar.js.
function erroDaApi(caminho, data, res) {
  const erro = new Error(`Graph API falhou (${caminho}): ${data.error?.message ?? res.statusText}`);
  erro.subcode = data.error?.error_subcode;
  return erro;
}

export async function graphPost(caminho, params, fetchImpl = fetch) {
  const res = await fetchImpl(`${GRAPH_API}/${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) throw erroDaApi(caminho, data, res);
  return data;
}

export async function graphGet(caminho, params, fetchImpl = fetch) {
  const url = new URL(`${GRAPH_API}/${caminho}`);
  for (const [chave, valor] of Object.entries(params)) url.searchParams.set(chave, valor);
  const res = await fetchImpl(url);
  const data = await res.json();
  if (!res.ok) throw erroDaApi(caminho, data, res);
  return data;
}

export async function esperarContainer(containerId, accessToken, opcoes = {}) {
  const { timeoutMs = 60_000, intervaloMs = 2000, fetchImpl = fetch } = opcoes;
  const inicio = Date.now();

  while (Date.now() - inicio < timeoutMs) {
    const { status_code } = await graphGet(containerId, { fields: "status_code", access_token: accessToken }, fetchImpl);
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") throw new Error(`Container ${containerId} falhou no processamento`);
    await new Promise((r) => setTimeout(r, intervaloMs));
  }

  throw new Error(`Container ${containerId} não ficou pronto em ${timeoutMs / 1000}s`);
}
