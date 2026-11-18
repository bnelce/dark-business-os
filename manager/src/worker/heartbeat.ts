import type { PrismaClient } from "@prisma/client";
import { hostname } from "node:os";

/**
 * Sinal de vida do worker. O dashboard usa o último heartbeat pra dizer se o
 * worker está no ar — sem isso, uma fila parada é indistinguível de um worker
 * morto, que é o pior modo de falha desse sistema.
 */
export async function baterHeartbeat(prisma: PrismaClient, workerId: string, version = "1"): Promise<void> {
  await prisma.workerInstance.upsert({
    where: { workerId },
    update: { lastHeartbeatAt: new Date() },
    create: { workerId, hostname: hostname(), version },
  });
}

export type SaudeDoWorker = {
  online: boolean;
  workerId: string | null;
  lastHeartbeatAt: Date | null;
  segundosDesdeUltimo: number | null;
};

export async function saudeDoWorker(
  prisma: PrismaClient,
  offlineAposMs: number,
  agora: Date = new Date(),
): Promise<SaudeDoWorker> {
  const ultimo = await prisma.workerInstance.findFirst({ orderBy: { lastHeartbeatAt: "desc" } });
  if (!ultimo) return { online: false, workerId: null, lastHeartbeatAt: null, segundosDesdeUltimo: null };

  const decorrido = agora.getTime() - ultimo.lastHeartbeatAt.getTime();
  return {
    online: decorrido <= offlineAposMs,
    workerId: ultimo.workerId,
    lastHeartbeatAt: ultimo.lastHeartbeatAt,
    segundosDesdeUltimo: Math.round(decorrido / 1000),
  };
}
