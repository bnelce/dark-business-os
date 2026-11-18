import type { Media, PrismaClient, Publication } from "@prisma/client";
import type { Publisher, GanchosDePublicacao, MidiaPublicavel } from "../publishers/types";
import type { StorageProvider } from "../storage/types";
import type { PublicUrlProvider } from "../publicurl/types";
import { registrarPublicado, registrarFalha } from "../queue/transitions";
import { registrarEvento } from "../queue/events";
import { classificarErro, PermanentError } from "../domain/errors";
import { credenciaisDoCanal } from "./credenciais";
import { impressaoDeLegenda } from "../lib/crypto";
import { logger } from "../lib/logger";

export type DependenciasDoWorker = {
  prisma: PrismaClient;
  storage: StorageProvider;
  publicUrl: PublicUrlProvider;
  publisherPara(canal: Publication["channel"]): Publisher;
  workerId: string;
};

/**
 * Executa uma publicação já reivindicada (status PUBLISHING, lock adquirido).
 *
 * O worker não decide o que publicar, não gera conteúdo, não aprova e não
 * conhece a API da plataforma: monta as URLs públicas, chama o publisher e
 * grava o desfecho.
 */
export async function executarPublicacao(
  deps: DependenciasDoWorker,
  publicacao: Publication,
): Promise<{ status: "PUBLISHED" | "RETRYING" | "FAILED"; externalId?: string }> {
  const { prisma, storage, publicUrl, workerId } = deps;
  const log = logger.com({ workerId, publicationId: publicacao.id, projectId: publicacao.projectId });
  const inicio = Date.now();

  await registrarEvento(prisma, publicacao.id, "PUBLISHING_STARTED",
    `Execução iniciada pelo worker ${workerId} (tentativa ${publicacao.attempts})`,
    { workerId, tentativa: publicacao.attempts });

  try {
    const midias = await prisma.media.findMany({
      where: { publicationId: publicacao.id },
      orderBy: { position: "asc" },
    });
    if (midias.length === 0) throw new PermanentError("Publicação sem nenhuma mídia associada");

    const { credenciais } = await credenciaisDoCanal(prisma, publicacao.projectId, publicacao.channel);
    const publisher = deps.publisherPara(publicacao.channel);

    const publicaveis = await urlsPublicas(midias, publicUrl, storage);

    const ganchos: GanchosDePublicacao = {
      // Gravado antes do publish sair: se o processo morrer aqui, a recuperação
      // sabe que precisa reconciliar em vez de republicar.
      aoPedirPublicacao: async (containerId) => {
        await prisma.publication.update({
          where: { id: publicacao.id },
          data: {
            remoteContainerId: containerId,
            publishRequestedAt: new Date(),
            captionFingerprint: impressaoDeLegenda(publicacao.caption),
          },
        });
      },
      aoEvento: async (tipo, mensagem, metadata) => {
        await registrarEvento(prisma, publicacao.id, tipo, mensagem, metadata);
      },
    };

    const resultado = await publisher.publicar(
      { publicacao: { ...publicacao, media: midias }, midias: publicaveis, credenciais },
      ganchos,
    );

    await registrarPublicado(prisma, publicacao.id, {
      externalId: resultado.externalId,
      externalUrl: resultado.externalUrl,
      reconciliada: resultado.reconciliada,
    });

    log.info("publicação concluída", {
      event: "PUBLISHED", status: "PUBLISHED", durationMs: Date.now() - inicio,
      externalId: resultado.externalId, reconciliada: resultado.reconciliada,
    });
    return { status: "PUBLISHED", externalId: resultado.externalId };
  } catch (erro) {
    const classificacao = classificarErro(erro);
    const depois = await registrarFalha(prisma, publicacao.id, classificacao);

    log.error("publicação falhou", {
      event: "FAILED", status: depois.status, durationMs: Date.now() - inicio,
      error: classificacao.message, kind: classificacao.kind, rateLimited: classificacao.rateLimited,
    });
    return { status: depois.status as "RETRYING" | "FAILED" };
  }
}

async function urlsPublicas(
  midias: Media[],
  publicUrl: PublicUrlProvider,
  storage: StorageProvider,
): Promise<MidiaPublicavel[]> {
  const publicaveis: MidiaPublicavel[] = [];
  for (const midia of midias) {
    publicaveis.push({
      url: await publicUrl.urlPublica(midia.objectKey, { mimeType: midia.mimeType, storage }),
      mimeType: midia.mimeType,
      posicao: midia.position,
    });
  }
  return publicaveis;
}
