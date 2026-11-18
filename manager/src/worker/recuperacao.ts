import type { PrismaClient, Publication } from "@prisma/client";
import { locksExpirados, devolverParaFila } from "../queue/claim";
import { registrarEvento } from "../queue/events";
import { registrarPublicado } from "../queue/transitions";
import { reconciliar } from "../publishers/instagram/reconcile";
import { GraphClient } from "../publishers/instagram/client";
import { credenciaisDoCanal } from "./credenciais";
import { logger } from "../lib/logger";

export type ResultadoDaRecuperacao = {
  publicationId: string;
  desfecho: "devolvida" | "publicada" | "mantida";
  motivo: string;
};

/**
 * Recupera publicações presas em PUBLISHING (processo morto, máquina desligada).
 *
 * A ordem das perguntas é o que impede duplicação:
 *   1. chegou a pedir publicação? Não → devolver pra fila é seguro.
 *   2. chegou → a plataforma tem esse post? Sim → adotar.
 *   3. não tem → devolver pra fila.
 *   4. não deu pra perguntar → NÃO MEXER. Uma consulta que falhou não é prova
 *      de que nada foi publicado, e na dúvida a publicação fica presa (visível
 *      no dashboard) em vez de sair duas vezes.
 */
export async function recuperarPresas(
  prisma: PrismaClient,
  timeoutMs: number,
  cliente: GraphClient = new GraphClient(),
): Promise<ResultadoDaRecuperacao[]> {
  const presas = await locksExpirados(prisma, timeoutMs);
  const resultados: ResultadoDaRecuperacao[] = [];

  for (const publicacao of presas) {
    resultados.push(await recuperarUma(prisma, publicacao, cliente));
  }
  return resultados;
}

async function recuperarUma(
  prisma: PrismaClient,
  publicacao: Publication,
  cliente: GraphClient,
): Promise<ResultadoDaRecuperacao> {
  const log = logger.com({ publicationId: publicacao.id, projectId: publicacao.projectId });

  if (!publicacao.publishRequestedAt) {
    await devolverParaFila(prisma, publicacao.id);
    await registrarEvento(prisma, publicacao.id, "LOCK_EXPIRED",
      "Lock expirou antes de qualquer pedido de publicação — devolvida à fila com segurança");
    log.warn("presa antes do publish, devolvida à fila", { event: "LOCK_EXPIRED" });
    return { publicationId: publicacao.id, desfecho: "devolvida", motivo: "nunca pediu publicação" };
  }

  let achado;
  try {
    const { credenciais } = await credenciaisDoCanal(prisma, publicacao.projectId, publicacao.channel);
    achado = await reconciliar(cliente, {
      accountId: credenciais.accountId,
      accessToken: credenciais.accessToken,
      pedidoEm: publicacao.publishRequestedAt,
      legenda: publicacao.caption,
    });
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    await registrarEvento(prisma, publicacao.id, "LOCK_EXPIRED",
      `Presa em PUBLISHING e a reconciliação não pôde consultar a plataforma (${motivo}). ` +
      `Mantida como está de propósito: consulta que falhou não é prova de que nada foi publicado. ` +
      `Confira a conta e resolva à mão.`);
    log.error("reconciliação indisponível — publicação mantida presa de propósito", {
      event: "RECONCILE_UNAVAILABLE", error: motivo,
    });
    return { publicationId: publicacao.id, desfecho: "mantida", motivo };
  }

  if (achado) {
    await registrarEvento(prisma, publicacao.id, "RECONCILED",
      "Estava presa em PUBLISHING, mas a publicação existe na plataforma — adotada",
      { externalId: achado.externalId });
    await registrarPublicado(prisma, publicacao.id, { ...achado, reconciliada: true });
    log.info("presa reconciliada como publicada", { event: "RECONCILED", externalId: achado.externalId });
    return { publicationId: publicacao.id, desfecho: "publicada", motivo: "encontrada na plataforma" };
  }

  await devolverParaFilaAposReconciliacao(prisma, publicacao.id);
  await registrarEvento(prisma, publicacao.id, "LOCK_EXPIRED",
    "Pediu publicação, mas a plataforma não tem o post — devolvida à fila");
  log.warn("presa não encontrada na plataforma, devolvida à fila", { event: "LOCK_EXPIRED" });
  return { publicationId: publicacao.id, desfecho: "devolvida", motivo: "não encontrada na plataforma" };
}

/**
 * Devolve pra fila depois de a reconciliação ter confirmado que não há post lá.
 * Limpa o rastro daquela tentativa: o container antigo não serve mais.
 */
async function devolverParaFilaAposReconciliacao(prisma: PrismaClient, id: string): Promise<void> {
  await prisma.publication.updateMany({
    where: { id, status: "PUBLISHING" },
    data: {
      status: "RETRYING", nextAttemptAt: new Date(), lockedAt: null, lockedBy: null,
      remoteContainerId: null, publishRequestedAt: null,
    },
  });
}
