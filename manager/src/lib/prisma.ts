import { PrismaClient } from "@prisma/client";

// O dev server do Next recarrega módulos a cada edição; sem o cache global
// cada reload abriria um pool novo e o Postgres estouraria o limite de conexões.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
