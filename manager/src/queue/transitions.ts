import type { Prisma, PrismaClient, Publication } from "@prisma/client";
import { assertTransition, PublicationStatus } from "../domain/publication-state";
import { registrarEvento } from "./events";
import { planejarRetry } from "./retry";
import type { Classificacao } from "../domain/errors";

/**
 * Transições de publicação como serviço. É por aqui que passam tanto as ações
 * do dashboard quanto as do worker — não existe um segundo caminho pra mudar
 * status. Toda mudança valida a máquina de estados e deixa evento na timeline.
 *
 * Todo UPDATE carrega o status esperado no WHERE: se alguém mudou a publicação
 * no meio do caminho, a escrita não acontece e o chamador recebe erro, em vez
 * de sobrescrever uma decisão mais nova.
 */

export class ConflitoDeEstadoError extends Error {
  constructor(readonly id: string, readonly esperado: string) {
    super(`A publicação ${id} não está mais em ${esperado} — outra ação mudou o estado antes desta. Recarregue.`);
    this.name = "ConflitoDeEstadoError";
  }
}

export class PublicacaoNaoEncontradaError extends Error {
  constructor(id: string) {
    super(`Publicação não encontrada: ${id}`);
    this.name = "PublicacaoNaoEncontradaError";
  }
}

async function carregar(db: PrismaClient, id: string): Promise<Publication> {
  const p = await db.publication.findUnique({ where: { id } });
  if (!p) throw new PublicacaoNaoEncontradaError(id);
  return p;
}

/** Aplica uma transição validada, sob guarda do status atual. */
async function transicionar(
  db: PrismaClient,
  id: string,
  para: PublicationStatus,
  dados: Prisma.PublicationUpdateManyMutationInput,
  evento: { type: Prisma.PublicationEventCreateInput["type"]; message?: string; metadata?: Record<string, unknown> },
): Promise<Publication> {
  const atual = await carregar(db, id);
  assertTransition(atual.status as PublicationStatus, para);

  const { count } = await db.publication.updateMany({
    where: { id, status: atual.status },
    data: { status: para, ...dados },
  });
  if (count !== 1) throw new ConflitoDeEstadoError(id, atual.status);

  await registrarEvento(db, id, evento.type, evento.message, evento.metadata);
  return carregar(db, id);
}

// ------------------------------------------------------------ ações do operador

export function aprovar(db: PrismaClient, id: string) {
  return transicionar(db, id, PublicationStatus.APPROVED, {}, {
    type: "APPROVED", message: "Aprovada pelo operador",
  });
}

export function voltarParaRascunho(db: PrismaClient, id: string) {
  return transicionar(db, id, PublicationStatus.DRAFT, { scheduledAt: null }, {
    type: "CREATED", message: "Devolvida para rascunho",
  });
}

export async function agendar(db: PrismaClient, id: string, quando: Date) {
  if (Number.isNaN(quando.getTime())) throw new Error("Data de agendamento inválida");
  return transicionar(db, id, PublicationStatus.SCHEDULED, { scheduledAt: quando }, {
    type: "SCHEDULED", message: `Agendada para ${quando.toISOString()}`, metadata: { scheduledAt: quando.toISOString() },
  });
}

/**
 * Reagendar não é transição: a publicação continua SCHEDULED, só muda o horário.
 * Fica separado justamente pra não passar por assertTransition (SCHEDULED→SCHEDULED
 * é inválido de propósito, senão qualquer estado poderia "reagendar" pra si mesmo).
 */
export async function reagendar(db: PrismaClient, id: string, quando: Date): Promise<Publication> {
  const atual = await carregar(db, id);
  if (atual.status !== "SCHEDULED") throw new ConflitoDeEstadoError(id, "SCHEDULED");

  const { count } = await db.publication.updateMany({
    where: { id, status: "SCHEDULED" },
    data: { scheduledAt: quando },
  });
  if (count !== 1) throw new ConflitoDeEstadoError(id, "SCHEDULED");

  await registrarEvento(db, id, "RESCHEDULED", `Reagendada para ${quando.toISOString()}`, {
    de: atual.scheduledAt?.toISOString() ?? null, para: quando.toISOString(),
  });
  return carregar(db, id);
}

export function desagendar(db: PrismaClient, id: string) {
  return transicionar(db, id, PublicationStatus.APPROVED, { scheduledAt: null }, {
    type: "APPROVED", message: "Agendamento removido — voltou para aprovada",
  });
}

export function cancelar(db: PrismaClient, id: string, motivo?: string) {
  return transicionar(db, id, PublicationStatus.CANCELLED, { scheduledAt: null, nextAttemptAt: null }, {
    type: "CANCELLED", message: motivo ?? "Cancelada pelo operador",
  });
}

export function reabrir(db: PrismaClient, id: string) {
  return transicionar(db, id, PublicationStatus.DRAFT, {
    scheduledAt: null, nextAttemptAt: null, attempts: 0, lastError: null, lastErrorKind: null,
  }, { type: "CREATED", message: "Reaberta como rascunho" });
}

/**
 * "Publicar agora" não cria um segundo caminho de publicação: só antecipa o
 * horário. O worker pega pela mesma fila, com o mesmo lock e a mesma idempotência.
 */
export async function publicarAgora(db: PrismaClient, id: string): Promise<Publication> {
  const atual = await carregar(db, id);
  const agora = new Date();

  if (atual.status === "SCHEDULED") return reagendar(db, id, agora);

  if (atual.status === "APPROVED") return agendar(db, id, agora);

  if (atual.status === "FAILED") return retentar(db, id);

  throw new ConflitoDeEstadoError(id, "APPROVED, SCHEDULED ou FAILED");
}

/** Retry manual a partir de FAILED: entra na fila imediatamente. */
export async function retentar(db: PrismaClient, id: string, tentativasExtras = 1): Promise<Publication> {
  const atual = await carregar(db, id);
  assertTransition(atual.status as PublicationStatus, PublicationStatus.RETRYING);

  const { count } = await db.publication.updateMany({
    where: { id, status: atual.status },
    data: {
      status: "RETRYING",
      nextAttemptAt: new Date(),
      // Sem isso, uma publicação que já esgotou o teto voltaria pra fila e
      // falharia de novo na hora, sem nunca tentar de verdade.
      maxAttempts: Math.max(atual.maxAttempts, atual.attempts + tentativasExtras),
      lockedAt: null, lockedBy: null,
    },
  });
  if (count !== 1) throw new ConflitoDeEstadoError(id, atual.status);

  await registrarEvento(db, id, "RETRY_SCHEDULED", "Retry solicitado pelo operador");
  return carregar(db, id);
}

// ------------------------------------------------------------ ações do worker

/**
 * Registra que a plataforma aceitou a publicação. Ponto de não retorno:
 * daqui pra frente nenhuma falha reabre a publicação (regra de ouro do publisher).
 */
export async function registrarPublicado(
  db: PrismaClient,
  id: string,
  dados: { externalId: string; externalUrl?: string | null; reconciliada?: boolean },
): Promise<Publication> {
  const agora = new Date();
  const { count } = await db.publication.updateMany({
    where: { id, status: "PUBLISHING" },
    data: {
      status: "PUBLISHED",
      publishedAt: agora,
      externalId: dados.externalId,
      externalUrl: dados.externalUrl ?? null,
      metadataSyncedAt: dados.externalUrl ? agora : null,
      lastError: null, lastErrorKind: null, nextAttemptAt: null,
      lockedAt: null, lockedBy: null,
    },
  });
  if (count !== 1) throw new ConflitoDeEstadoError(id, "PUBLISHING");

  await registrarEvento(db, id, "PUBLISHED", dados.reconciliada
    ? "Publicada — confirmada por reconciliação com a plataforma"
    : "Publicada", { externalId: dados.externalId, externalUrl: dados.externalUrl ?? null });

  if (!dados.externalUrl) {
    await registrarEvento(db, id, "METADATA_SYNC_FAILED",
      "Publicada, mas o permalink não veio. Isso NÃO é falha de publicação e não gera retry.",
      { externalId: dados.externalId });
  }
  return carregar(db, id);
}

/**
 * Sincroniza metadados auxiliares de uma publicação já publicada.
 * Nunca muda status: é a única operação permitida sobre PUBLISHED.
 */
export async function sincronizarMetadados(
  db: PrismaClient,
  id: string,
  dados: { externalUrl?: string | null },
): Promise<Publication> {
  const atual = await carregar(db, id);
  if (atual.status !== "PUBLISHED") {
    throw new ConflitoDeEstadoError(id, "PUBLISHED");
  }
  await db.publication.update({
    where: { id },
    data: { externalUrl: dados.externalUrl ?? atual.externalUrl, metadataSyncedAt: new Date() },
  });
  await registrarEvento(db, id, "METADATA_SYNCED", "Metadados sincronizados", { externalUrl: dados.externalUrl ?? null });
  return carregar(db, id);
}

/** Resultado negativo de uma tentativa: decide entre novo retry e desistência. */
export async function registrarFalha(
  db: PrismaClient,
  id: string,
  classificacao: Classificacao,
): Promise<Publication> {
  const atual = await carregar(db, id);
  const plano = planejarRetry({
    attempts: atual.attempts, maxAttempts: atual.maxAttempts, classificacao,
  });

  const { count } = await db.publication.updateMany({
    where: { id, status: "PUBLISHING" },
    data: {
      status: plano.status,
      nextAttemptAt: plano.nextAttemptAt,
      lastError: classificacao.message.slice(0, 2000),
      lastErrorKind: classificacao.kind,
      lockedAt: null, lockedBy: null,
      // A tentativa acabou: o container daquela tentativa não serve pra próxima.
      remoteContainerId: null, publishRequestedAt: null,
    },
  });
  if (count !== 1) throw new ConflitoDeEstadoError(id, "PUBLISHING");

  await registrarEvento(
    db, id,
    plano.status === "RETRYING" ? "RETRY_SCHEDULED" : "FAILED",
    `${classificacao.message} — ${plano.motivo}`,
    { kind: classificacao.kind, rateLimited: classificacao.rateLimited, nextAttemptAt: plano.nextAttemptAt?.toISOString() ?? null },
  );
  return carregar(db, id);
}
