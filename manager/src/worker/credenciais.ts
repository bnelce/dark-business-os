import type { Channel, PrismaClient } from "@prisma/client";
import { decifrar } from "../lib/crypto";
import { opcional } from "../lib/env";
import { PermanentError } from "../domain/errors";
import type { CredenciaisInstagram } from "../publishers/types";

/**
 * Resolve as credenciais do par (projeto, canal).
 *
 * Cada projeto pode ter conta própria — não se assume que todas as marcas
 * publicam na mesma conta. O fallback por variável de ambiente existe só pra
 * quem ainda não migrou a credencial pro banco.
 */
export async function credenciaisDoCanal(
  prisma: PrismaClient,
  projectId: string,
  canal: Channel,
): Promise<{ credenciais: CredenciaisInstagram; channelConfigId: string | null }> {
  const config = await prisma.channelConfig.findUnique({
    where: { projectId_channel: { projectId, channel: canal } },
  });

  if (config) {
    if (!config.isActive) {
      throw new PermanentError(`O canal ${canal} deste projeto está desativado.`);
    }
    if (!config.credentials) {
      throw new PermanentError(`O canal ${canal} deste projeto não tem credenciais configuradas.`);
    }
    let dados: Partial<CredenciaisInstagram>;
    try {
      dados = JSON.parse(decifrar(config.credentials));
    } catch {
      // Chave de cifra trocada ou registro corrompido: repetir não resolve.
      throw new PermanentError(`Não foi possível decifrar as credenciais do canal ${canal}. Reconfigure o canal.`);
    }
    if (!dados.accessToken || !dados.accountId) {
      throw new PermanentError(`Credenciais incompletas no canal ${canal} (falta accessToken ou accountId).`);
    }
    return { credenciais: dados as CredenciaisInstagram, channelConfigId: config.id };
  }

  const accessToken = opcional("INSTAGRAM_ACCESS_TOKEN");
  const accountId = opcional("INSTAGRAM_ACCOUNT_ID");
  if (canal === "INSTAGRAM" && accessToken && accountId) {
    return { credenciais: { accessToken, accountId }, channelConfigId: null };
  }

  throw new PermanentError(
    `Nenhum canal ${canal} configurado para este projeto. Configure em Projetos → Canais antes de publicar.`,
  );
}
