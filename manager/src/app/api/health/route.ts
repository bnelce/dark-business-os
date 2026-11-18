import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MinioStorageProvider } from "@/storage/minio";
import { saudeDoWorker } from "@/worker/heartbeat";
import { config } from "@/lib/env";

export const dynamic = "force-dynamic";

type Check = { ok: boolean; detalhe?: string };

async function checar(fn: () => Promise<unknown>): Promise<Check> {
  try {
    await fn();
    return { ok: true };
  } catch (erro) {
    return { ok: false, detalhe: erro instanceof Error ? erro.message : String(erro) };
  }
}

/** Aberta de propósito: monitoramento precisa alcançar isto sem sessão. Não devolve segredo. */
export async function GET() {
  const [banco, storage] = await Promise.all([
    checar(() => prisma.$queryRaw`SELECT 1`),
    checar(async () => {
      const s = new MinioStorageProvider();
      await s.exists("healthcheck/ping");
    }),
  ]);

  const worker = await saudeDoWorker(prisma, config.workerOfflineAfterMs).catch(() => null);
  const tudoOk = banco.ok && storage.ok;

  return NextResponse.json(
    {
      status: tudoOk ? "ok" : "degradado",
      timestamp: new Date().toISOString(),
      aplicacao: { ok: true },
      banco,
      storage,
      worker: {
        ok: worker?.online ?? false,
        workerId: worker?.workerId ?? null,
        lastHeartbeatAt: worker?.lastHeartbeatAt ?? null,
        segundosDesdeUltimo: worker?.segundosDesdeUltimo ?? null,
      },
      dryRun: config.dryRun,
    },
    { status: tudoOk ? 200 : 503 },
  );
}
