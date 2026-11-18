import { PrismaClient, type Channel } from "@prisma/client";
import { credenciaisDoCanal } from "../worker/credenciais";
import { GraphClient } from "../publishers/instagram/client";

/**
 * Confere a credencial de um canal sem publicar nada.
 *
 * Só faz leitura: resolve o perfil e consulta a cota de publicação. Serve pra
 * saber que o token está vivo e que a conta é a esperada ANTES de desligar o
 * dry-run — descobrir token inválido no meio de um publish é bem pior.
 *
 *   npm run checar-canal                          → revisao-rapida / INSTAGRAM
 *   npm run checar-canal -- --projeto=<slug>
 */
async function main() {
  const args = process.argv.slice(2);
  const slug = args.find((a) => a.startsWith("--projeto="))?.split("=")[1] ?? "revisao-rapida";
  const canal = (args.find((a) => a.startsWith("--canal="))?.split("=")[1] ?? "INSTAGRAM") as Channel;

  const prisma = new PrismaClient();
  try {
    const projeto = await prisma.project.findUnique({ where: { slug } });
    if (!projeto) throw new Error(`Projeto "${slug}" não existe.`);

    const { credenciais, channelConfigId } = await credenciaisDoCanal(prisma, projeto.id, canal);
    console.log(`projeto:      ${projeto.name}`);
    console.log(`origem:       ${channelConfigId ? "ChannelConfig (cifrado no banco)" : "variáveis de ambiente"}`);
    console.log(`decifrou:     accountId=${credenciais.accountId}, token de ${credenciais.accessToken.length} chars`);

    const cliente = new GraphClient();
    const perfil = await cliente.get(credenciais.accountId, {
      fields: "username,followers_count,media_count",
      access_token: credenciais.accessToken,
    });
    console.log(`conta:        @${perfil.username}`);
    console.log(`seguidores:   ${perfil.followers_count}`);
    console.log(`publicações:  ${perfil.media_count}`);

    const uso = await cliente.usoDaCota(credenciais.accountId, credenciais.accessToken);
    console.log(`cota 24h:     ${uso}/100`);
    console.log(`\n✓ Credencial válida. Nada foi publicado.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(`\n✗ ${e instanceof Error ? e.message : e}`); process.exit(1); });
