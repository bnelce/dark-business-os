import { GraphApiError, TransientError } from "../../domain/errors";

/**
 * Cliente da Graph API. Porte de scripts/lib/graph.js, que roda em produção
 * desde o primeiro carrossel — mesma versão de API, mesmo formato de corpo.
 * A diferença é que aqui o erro sobe tipado, pra alimentar a classificação.
 */
export const GRAPH_API = "https://graph.facebook.com/v21.0";

type Fetch = typeof fetch;

export class GraphClient {
  constructor(private readonly fetchImpl: Fetch = fetch) {}

  async post(caminho: string, params: Record<string, string>): Promise<any> {
    const res = await this.fetchImpl(`${GRAPH_API}/${caminho}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    const dados = await res.json().catch(() => ({}));
    if (!res.ok) throw new GraphApiError(dados?.error ?? { message: res.statusText }, caminho, res.status);
    return dados;
  }

  async get(caminho: string, params: Record<string, string>): Promise<any> {
    const url = new URL(`${GRAPH_API}/${caminho}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await this.fetchImpl(url);
    const dados = await res.json().catch(() => ({}));
    if (!res.ok) throw new GraphApiError(dados?.error ?? { message: res.statusText }, caminho, res.status);
    return dados;
  }

  /**
   * Espera o container terminar o processamento.
   * Imagem resolve em segundos; vídeo pode levar minutos — daí o timeout ser
   * parâmetro e não constante.
   */
  async esperarContainer(
    containerId: string,
    accessToken: string,
    { timeoutMs = 60_000, intervaloMs = 2000 } = {},
  ): Promise<void> {
    const inicio = Date.now();
    while (Date.now() - inicio < timeoutMs) {
      const { status_code } = await this.get(containerId, { fields: "status_code", access_token: accessToken });
      if (status_code === "FINISHED") return;
      if (status_code === "ERROR") {
        throw new TransientError(`Container ${containerId} falhou no processamento da plataforma`);
      }
      await new Promise((r) => setTimeout(r, intervaloMs));
    }
    throw new TransientError(`Container ${containerId} não ficou pronto em ${timeoutMs / 1000}s`);
  }

  /** Quanto da cota de publicação das últimas 24h já foi usada. */
  async usoDaCota(accountId: string, accessToken: string): Promise<number> {
    const dados = await this.get(`${accountId}/content_publishing_limit`, {
      fields: "quota_usage", access_token: accessToken,
    });
    return dados?.data?.[0]?.quota_usage ?? 0;
  }
}
