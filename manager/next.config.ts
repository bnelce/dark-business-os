import type { NextConfig } from "next";

/**
 * basePath vem do ambiente porque o app é servido sob um subcaminho no
 * proxy reverso (ex.: dominio.com/publicador). Local fica vazio.
 *
 * Precisa estar presente em BUILD-TIME: o Next assa o basePath nos assets e
 * nas rotas do bundle. Passar só em runtime quebra os links e o /_next/.
 *
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const config: NextConfig = {
  basePath,
  // O repo tem lockfile na raiz e aqui; sem isso o Next escolhe a raiz errada.
  outputFileTracingRoot: import.meta.dirname,
  // O worker e o import rodam fora do Next; o Prisma não deve ser empacotado.
  serverExternalPackages: ["@prisma/client", "minio"],
  poweredByHeader: false,
};

export default config;
