import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { prisma } from "../lib/prisma";
import { config } from "../lib/env";
import { logger } from "../lib/logger";
import { reivindicarProxima } from "../queue/claim";
import { liberarLock } from "../queue/claim";
import { executarPublicacao, type DependenciasDoWorker } from "./executar";
import { recuperarPresas } from "./recuperacao";
import { baterHeartbeat } from "./heartbeat";
import { MinioStorageProvider } from "../storage/minio";
import { publicUrlProviderDoAmbiente } from "../publicurl";
import { InstagramPublisher } from "../publishers/instagram";
import { DryRunPublisher } from "../publishers/dry-run";
import type { Publisher } from "../publishers/types";
import type { Channel } from "@prisma/client";

/**
 * Worker de publicação.
 *
 * Responsabilidade única: executar o que já está aprovado e agendado.
 * Ele não escolhe conteúdo, não aplica cronograma editorial e não conhece
 * disciplina nem dia da semana — isso é planejamento, e vive fora daqui.
 */

const workerId = process.env.WORKER_ID ?? `${hostname()}-${randomUUID().slice(0, 8)}`;
const log = logger.com({ workerId });

function publisherPara(canal: Channel): Publisher {
  if (canal !== "INSTAGRAM") {
    throw new Error(`Nenhum publisher implementado para o canal ${canal}`);
  }
  const real = new InstagramPublisher();
  return config.dryRun ? new DryRunPublisher(real) : real;
}

async function cicloDeTrabalho(deps: DependenciasDoWorker): Promise<number> {
  let executadas = 0;

  // Antes de pegar trabalho novo, resolve o que ficou preso: uma publicação
  // presa pode já ter saído do outro lado, e isso precisa ser conciliado antes
  // de qualquer coisa nova entrar em voo.
  const recuperadas = await recuperarPresas(deps.prisma, config.lockTimeoutMs);
  if (recuperadas.length > 0) {
    log.warn("publicações presas tratadas", { event: "RECOVERY", quantidade: recuperadas.length, recuperadas });
  }

  // Uma por ciclo: publicar em rajada divide a distribuição do Instagram entre
  // vários posts e lê como spam. O espaçamento é do agendamento, não do worker.
  const publicacao = await reivindicarProxima(deps.prisma, workerId);
  if (!publicacao) return 0;

  log.info("publicação reivindicada", {
    event: "CLAIMED", publicationId: publicacao.id, projectId: publicacao.projectId,
    tipo: publicacao.type, canal: publicacao.channel, tentativa: publicacao.attempts,
  });

  try {
    await executarPublicacao(deps, publicacao);
    executadas = 1;
  } catch (erro) {
    // executarPublicacao já trata a falha da publicação. Cair aqui é falha do
    // próprio worker (banco fora, por exemplo): solta o lock pra não prender a fila.
    log.error("falha inesperada no worker durante a execução", {
      publicationId: publicacao.id, error: erro instanceof Error ? erro.message : String(erro),
    });
    await liberarLock(deps.prisma, publicacao.id, workerId).catch(() => {});
  }
  return executadas;
}

async function main() {
  const storage = new MinioStorageProvider();
  await storage.garantirBucket();

  const deps: DependenciasDoWorker = {
    prisma,
    storage,
    publicUrl: publicUrlProviderDoAmbiente(),
    publisherPara,
    workerId,
  };

  log.info("worker iniciado", {
    event: "WORKER_STARTED",
    dryRun: config.dryRun,
    pollIntervalMs: config.pollIntervalMs,
    publicUrlProvider: deps.publicUrl.nome,
  });
  if (config.dryRun) {
    log.warn("PUBLISHING_DRY_RUN=true — nenhuma publicação real será enviada");
  }

  let rodando = true;
  const desligar = async (sinal: string) => {
    if (!rodando) return;
    rodando = false;
    log.info("desligando", { event: "WORKER_STOPPING", sinal });
    clearInterval(timerHeartbeat);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void desligar("SIGINT"));
  process.on("SIGTERM", () => void desligar("SIGTERM"));

  await baterHeartbeat(prisma, workerId);
  const timerHeartbeat = setInterval(() => {
    baterHeartbeat(prisma, workerId).catch((e) =>
      log.error("heartbeat falhou", { error: e instanceof Error ? e.message : String(e) }));
  }, config.heartbeatIntervalMs);

  while (rodando) {
    try {
      const executadas = await cicloDeTrabalho(deps);
      // Achou trabalho? Volta rápido: a fila pode ter mais coisa vencida.
      await esperar(executadas > 0 ? 2000 : config.pollIntervalMs);
    } catch (erro) {
      log.error("ciclo do worker falhou", { error: erro instanceof Error ? erro.message : String(erro) });
      await esperar(config.pollIntervalMs);
    }
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

main().catch((erro) => {
  log.error("worker morreu", { error: erro instanceof Error ? erro.message : String(erro) });
  process.exit(1);
});
