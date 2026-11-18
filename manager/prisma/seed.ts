import { PrismaClient } from "@prisma/client";
import { cifrar } from "../src/lib/crypto";
import { opcional } from "../src/lib/env";

const prisma = new PrismaClient();

/**
 * Cria os projetos do operador. Idempotente: rodar de novo não duplica nem
 * sobrescreve credencial já configurada pela interface.
 */
async function main() {
  const revisao = await prisma.project.upsert({
    where: { slug: "revisao-rapida" },
    update: {},
    create: {
      name: "Revisão Rápida",
      slug: "revisao-rapida",
      description: "Conteúdo educativo diário pro 1º ano do ensino médio (@revisaorapida1ano)",
      settings: {
        handle: "@revisaorapida1ano",
        cores: { primaria: "#667eea", destaque: "#fa709a", escura: "#764ba2" },
        fonte: "Poppins",
        timezone: "America/Fortaleza",
      },
    },
  });

  const dev = await prisma.project.upsert({
    where: { slug: "abner-oliveira-dev" },
    update: {},
    create: {
      name: "Abner Oliveira Dev",
      slug: "abner-oliveira-dev",
      description: "Conteúdo técnico. Sem canal configurado ainda.",
      settings: { cores: { primaria: "#1f2937", destaque: "#38bdf8" }, timezone: "America/Fortaleza" },
    },
  });

  // A conta do Instagram de hoje é a da Revisão Rápida. Abner Oliveira Dev fica
  // sem ChannelConfig de propósito: projeto sem canal é estado válido e testado.
  const token = opcional("INSTAGRAM_ACCESS_TOKEN");
  const contaId = opcional("INSTAGRAM_ACCOUNT_ID");

  if (token && contaId) {
    const jaExiste = await prisma.channelConfig.findUnique({
      where: { projectId_channel: { projectId: revisao.id, channel: "INSTAGRAM" } },
    });
    if (!jaExiste) {
      await prisma.channelConfig.create({
        data: {
          projectId: revisao.id,
          channel: "INSTAGRAM",
          handle: "@revisaorapida1ano",
          credentials: cifrar(JSON.stringify({ accessToken: token, accountId: contaId })),
        },
      });
      console.log("→ ChannelConfig do Instagram criado pra Revisão Rápida (credenciais cifradas)");
    } else {
      console.log("→ ChannelConfig do Instagram já existia, mantido como está");
    }
  } else {
    console.log("→ Sem INSTAGRAM_ACCESS_TOKEN/ACCOUNT_ID no .env: nenhum canal configurado");
  }

  console.log(`✓ Projetos: ${revisao.name}, ${dev.name}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
