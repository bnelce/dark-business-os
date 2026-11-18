import type { Publication, PrismaClient } from "@prisma/client";

/**
 * Aquisição de trabalho pela fila.
 *
 * A elegibilidade é só (status, quando executar) — nunca dia da semana,
 * disciplina ou qualquer regra editorial. Quem decide o que publicar é o
 * planejamento; o worker só executa o que já está aprovado e agendado.
 */

/**
 * Reivindica a próxima publicação elegível, de forma atômica.
 *
 * O CTE seleciona com FOR UPDATE SKIP LOCKED: linhas já travadas por outra
 * transação são puladas em vez de esperarem, então dois workers concorrentes
 * nunca pegam a mesma publicação. Seleção e UPDATE estão no mesmo comando —
 * não existe janela entre "escolhi" e "marquei como minha".
 *
 * attempts é incrementado aqui, na aquisição, e não no resultado: uma tentativa
 * que morre no meio (processo morto, máquina desligada) já conta, senão um
 * crash em loop retentaria pra sempre sem nunca gastar tentativa.
 */
export async function reivindicarProxima(
  prisma: PrismaClient,
  workerId: string,
  agora: Date = new Date(),
): Promise<Publication | null> {
  const linhas = await prisma.$queryRaw<Publication[]>`
    WITH elegivel AS (
      SELECT id FROM "Publication"
      WHERE (status = 'SCHEDULED'::"PublicationStatus" AND "scheduledAt" IS NOT NULL AND "scheduledAt" <= ${agora})
         OR (status = 'RETRYING'::"PublicationStatus"  AND "nextAttemptAt" IS NOT NULL AND "nextAttemptAt" <= ${agora})
      ORDER BY COALESCE("nextAttemptAt", "scheduledAt") ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "Publication" p
    SET status = 'PUBLISHING'::"PublicationStatus",
        "lockedAt" = ${agora},
        "lockedBy" = ${workerId},
        attempts = p.attempts + 1,
        "updatedAt" = ${agora}
    FROM elegivel
    WHERE p.id = elegivel.id
    RETURNING p.*;
  `;
  return linhas[0] ?? null;
}

/** Quantas publicações estão prontas pra executar agora. Alimenta o dashboard. */
export async function contarElegiveis(prisma: PrismaClient, agora: Date = new Date()): Promise<number> {
  const [{ total }] = await prisma.$queryRaw<[{ total: bigint }]>`
    SELECT COUNT(*)::bigint AS total FROM "Publication"
    WHERE (status = 'SCHEDULED'::"PublicationStatus" AND "scheduledAt" IS NOT NULL AND "scheduledAt" <= ${agora})
       OR (status = 'RETRYING'::"PublicationStatus"  AND "nextAttemptAt" IS NOT NULL AND "nextAttemptAt" <= ${agora})
  `;
  return Number(total);
}

/**
 * Publicações presas em PUBLISHING além do timeout do lock.
 *
 * Deliberadamente NÃO devolve nada pra fila: uma publicação presa pode ter
 * chegado a publicar do outro lado antes do processo morrer. Devolver pra fila
 * às cegas é exatamente o caminho que gera post duplicado. Quem decide é o
 * worker, e só depois de reconciliar com a plataforma — ver publishRequestedAt.
 */
export async function locksExpirados(
  prisma: PrismaClient,
  timeoutMs: number,
  agora: Date = new Date(),
): Promise<Publication[]> {
  const limite = new Date(agora.getTime() - timeoutMs);
  return prisma.publication.findMany({
    where: { status: "PUBLISHING", lockedAt: { lt: limite } },
    orderBy: { lockedAt: "asc" },
  });
}

/**
 * Devolve pra fila uma publicação travada que comprovadamente NÃO chegou a
 * pedir publicação (publishRequestedAt nulo). Se chegou, o caminho é reconciliar.
 */
export async function devolverParaFila(
  prisma: PrismaClient,
  id: string,
  agora: Date = new Date(),
): Promise<boolean> {
  const { count } = await prisma.publication.updateMany({
    where: { id, status: "PUBLISHING", publishRequestedAt: null },
    data: { status: "RETRYING", nextAttemptAt: agora, lockedAt: null, lockedBy: null },
  });
  return count === 1;
}

/** Libera o lock mantendo o status — usado quando o worker desliga no meio. */
export async function liberarLock(prisma: PrismaClient, id: string, workerId: string): Promise<void> {
  await prisma.publication.updateMany({
    where: { id, lockedBy: workerId },
    data: { lockedAt: null, lockedBy: null },
  });
}
