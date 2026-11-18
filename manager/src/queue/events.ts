import type { Prisma, PrismaClient, EventType } from "@prisma/client";
import { redigir } from "../lib/logger";

type Cliente = PrismaClient | Prisma.TransactionClient;

/**
 * Registra um evento na timeline da publicação.
 * Os metadados passam pelo redator: a timeline é lida no dashboard e às vezes
 * carrega a resposta crua da plataforma, que pode conter token.
 */
export async function registrarEvento(
  db: Cliente,
  publicationId: string,
  type: EventType,
  message?: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db.publicationEvent.create({
    data: {
      publicationId,
      type,
      message: message ? (redigir(message) as string) : null,
      metadata: redigir(metadata) as Prisma.InputJsonValue,
    },
  });
}
