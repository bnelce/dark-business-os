import { PrismaClient } from "@prisma/client";
import { PREFIXO_DRY_RUN } from "../publishers/dry-run";

/**
 * Devolve à fila as publicações que "saíram" só em dry-run.
 *
 * Todo ensaio deixa rastro: a publicação fica PUBLISHED com um externalId
 * dryrun-*, sem post correspondente. Deixar isso no banco confunde a fila e
 * some com a publicação do backlog real.
 *
 * Como PUBLISHED é terminal de propósito, esta é uma operação de manutenção
 * fora da máquina de estados — e por isso só toca em registros de ensaio.
 *
 *   npm run limpar-ensaios              → relata
 *   npm run limpar-ensaios -- --commit  → aplica
 */
async function main() {
  const commit = process.argv.includes("--commit");
  const prisma = new PrismaClient();

  try {
    const ensaios = await prisma.publication.findMany({
      where: { status: "PUBLISHED", externalId: { startsWith: PREFIXO_DRY_RUN } },
      select: { id: true, title: true, sourcePath: true },
    });

    if (ensaios.length === 0) {
      console.log("Nenhuma publicação de ensaio no banco.");
      return;
    }

    console.log(`${ensaios.length} publicação(ões) de ensaio:`);
    for (const e of ensaios) console.log(`  ${e.title}  (${e.sourcePath ?? e.id})`);

    if (!commit) {
      console.log("\nVoltariam para APPROVED, sem agendamento.");
      console.log("Para aplicar: npm run limpar-ensaios -- --commit\n");
      return;
    }

    for (const e of ensaios) {
      await prisma.$transaction([
        prisma.publication.update({
          where: { id: e.id },
          data: {
            status: "APPROVED",
            externalId: null, externalUrl: null, publishedAt: null, metadataSyncedAt: null,
            scheduledAt: null, nextAttemptAt: null, attempts: 0,
            remoteContainerId: null, publishRequestedAt: null, captionFingerprint: null,
            lastError: null, lastErrorKind: null,
          },
        }),
        prisma.publicationEvent.create({
          data: {
            publicationId: e.id, type: "CREATED",
            message: "Resultado de dry-run descartado — devolvida para aprovada, sem agendamento.",
          },
        }),
      ]);
    }
    console.log(`\n✓ ${ensaios.length} publicação(ões) devolvida(s) para APPROVED.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(`\n✗ ${e instanceof Error ? e.message : e}`); process.exit(1); });
