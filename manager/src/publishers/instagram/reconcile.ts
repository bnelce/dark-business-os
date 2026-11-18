import type { GraphClient } from "./client";
import { impressaoDeLegenda } from "../../lib/crypto";

/**
 * Reconciliação pós-publish — a peça central da idempotência.
 *
 * O caso real que motivou isto (2026-09-05): o `media_publish` respondeu
 * "Application request limit reached", o script leu como falha, retentou, e o
 * post foi ao ar duas vezes. A Graph API às vezes devolve erro numa chamada que
 * ela processou.
 *
 * Por isso um erro no publish nunca é veredito sozinho. Antes de declarar
 * falha, olha-se a conta: se apareceu uma mídia nova com a mesma legenda depois
 * do momento em que a publicação foi pedida, ela foi publicada — e o certo é
 * adotar aquele post, não criar outro.
 */

export type MidiaRemota = {
  id: string;
  caption?: string;
  timestamp?: string;
  permalink?: string;
};

/** Folga pra trás no tempo: o relógio local e o da Meta não são o mesmo. */
const FOLGA_DE_RELOGIO_MS = 5 * 60_000;

export type Reconciliacao = { externalId: string; externalUrl: string | null } | null;

export async function reconciliar(
  cliente: GraphClient,
  entrada: {
    accountId: string;
    accessToken: string;
    /** Momento em que o publish foi pedido. Nada anterior a isso conta. */
    pedidoEm: Date;
    /** Legenda enviada, para casar com a que voltou da plataforma. */
    legenda: string;
    /** Quantas mídias recentes olhar. */
    limite?: number;
  },
): Promise<Reconciliacao> {
  const { accountId, accessToken, pedidoEm, legenda, limite = 25 } = entrada;

  const resposta = await cliente.get(`${accountId}/media`, {
    fields: "id,caption,timestamp,permalink",
    limit: String(limite),
    access_token: accessToken,
  });

  const candidatas: MidiaRemota[] = resposta?.data ?? [];
  const alvo = impressaoDeLegenda(legenda);
  const piso = pedidoEm.getTime() - FOLGA_DE_RELOGIO_MS;

  for (const midia of candidatas) {
    if (!midia.id) continue;

    // Sem timestamp legível não dá pra afirmar que é desta tentativa.
    // Adotar um post antigo por engano é pior do que não reconciliar.
    const quando = midia.timestamp ? Date.parse(midia.timestamp) : NaN;
    if (Number.isNaN(quando) || quando < piso) continue;

    if (impressaoDeLegenda(midia.caption ?? "") !== alvo) continue;

    return { externalId: midia.id, externalUrl: midia.permalink ?? null };
  }

  return null;
}

/**
 * Reconciliação tolerante a falha: usada no caminho de erro, onde uma segunda
 * exceção não pode esconder a primeira. Não achou ou não deu pra consultar,
 * devolve null e o erro original segue seu curso.
 */
export async function tentarReconciliar(
  cliente: GraphClient,
  entrada: Parameters<typeof reconciliar>[1],
  aoFalhar?: (erro: unknown) => void,
): Promise<Reconciliacao> {
  try {
    return await reconciliar(cliente, entrada);
  } catch (erro) {
    aoFalhar?.(erro);
    return null;
  }
}
