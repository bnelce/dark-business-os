import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function limparBanco() {
  // Guarda dupla: o setup já aponta pro banco _test, mas um deleteMany no banco
  // de desenvolvimento apagaria o conteúdo importado. Barato demais pra não ter.
  if (!process.env.DATABASE_URL?.includes("_test")) {
    throw new Error(`Testes apontando pro banco errado: ${process.env.DATABASE_URL}. Esperado um banco _test.`);
  }
  // Ordem importa: eventos e mídias apontam pra publicação.
  await prisma.publicationEvent.deleteMany();
  await prisma.media.deleteMany();
  await prisma.publication.deleteMany();
  await prisma.channelConfig.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workerInstance.deleteMany();
}

export async function projetoDeTeste(slug = "teste", nome = "Projeto de Teste") {
  return prisma.project.upsert({ where: { slug }, update: {}, create: { name: nome, slug } });
}

type Status =
  | "DRAFT" | "APPROVED" | "SCHEDULED" | "PUBLISHING"
  | "PUBLISHED" | "FAILED" | "RETRYING" | "CANCELLED";

type Opcoes = Partial<{
  status: Status;
  scheduledAt: Date | null;
  nextAttemptAt: Date | null;
  title: string;
  attempts: number;
  lockedAt: Date | null;
  lockedBy: string | null;
  publishRequestedAt: Date | null;
  caption: string;
  sourcePath: string | null;
}>;

export async function publicacaoDeTeste(projectId: string, opcoes: Opcoes = {}) {
  return prisma.publication.create({
    data: {
      projectId,
      title: opcoes.title ?? "Publicação de teste",
      type: "CAROUSEL",
      channel: "INSTAGRAM",
      caption: opcoes.caption ?? "legenda de teste",
      status: opcoes.status ?? "SCHEDULED",
      scheduledAt: opcoes.scheduledAt === undefined ? new Date(Date.now() - 1000) : opcoes.scheduledAt,
      nextAttemptAt: opcoes.nextAttemptAt ?? null,
      attempts: opcoes.attempts ?? 0,
      lockedAt: opcoes.lockedAt ?? null,
      lockedBy: opcoes.lockedBy ?? null,
      publishRequestedAt: opcoes.publishRequestedAt ?? null,
      sourcePath: opcoes.sourcePath ?? null,
    },
  });
}
