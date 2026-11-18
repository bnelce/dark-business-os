import type { Channel, PublicationType } from "@prisma/client";
import type {
  Publisher, EntradaDePublicacao, GanchosDePublicacao, ResultadoDePublicacao, MidiaPublicavel,
} from "../types";
import { GraphClient } from "./client";
import { tentarReconciliar } from "./reconcile";
import { PermanentError, TransientError, GraphApiError } from "../../domain/errors";
import { logger } from "../../lib/logger";

const TIMEOUT_IMAGEM_MS = 60_000;
const TIMEOUT_VIDEO_MS = 300_000;
/** Cota de publicação da conta em 24h. Chegar no teto é rate limit, não falha de mídia. */
const COTA_MAXIMA = 100;

export class InstagramPublisher implements Publisher {
  readonly canal: Channel = "INSTAGRAM";
  readonly tiposSuportados: PublicationType[] = ["IMAGE", "CAROUSEL", "REEL"];

  constructor(private readonly cliente: GraphClient = new GraphClient()) {}

  async publicar(entrada: EntradaDePublicacao, ganchos: GanchosDePublicacao): Promise<ResultadoDePublicacao> {
    const { publicacao, midias, credenciais } = entrada;
    const { accountId, accessToken } = credenciais;

    if (!this.tiposSuportados.includes(publicacao.type)) {
      throw new PermanentError(
        `Instagram: tipo ${publicacao.type} ainda não implementado. Suportados: ${this.tiposSuportados.join(", ")}.`,
      );
    }
    if (midias.length === 0) throw new PermanentError("Nenhuma mídia para publicar");
    if (publicacao.type === "CAROUSEL" && midias.length < 2) {
      throw new PermanentError(`Carrossel precisa de ao menos 2 mídias, recebeu ${midias.length}`);
    }
    if (publicacao.type === "CAROUSEL" && midias.length > 10) {
      throw new PermanentError(`Carrossel aceita no máximo 10 mídias, recebeu ${midias.length}`);
    }

    // Descobrir a cota estourada aqui é bem mais legível do que no meio do publish.
    const uso = await this.cliente.usoDaCota(accountId, accessToken);
    if (uso >= COTA_MAXIMA) {
      throw new GraphApiError(
        { message: `Cota de publicação esgotada: ${uso}/${COTA_MAXIMA} nas últimas 24h`, code: 4 },
        "content_publishing_limit", 400,
      );
    }

    const ordenadas = [...midias].sort((a, b) => a.posicao - b.posicao);
    const legenda = publicacao.caption;

    const containerId = await this.criarContainerComRetry(publicacao.type, ordenadas, legenda, credenciais);
    await ganchos.aoEvento("MEDIA_UPLOADED", `Container pronto na plataforma (${ordenadas.length} mídia(s))`, {
      containerId, quantidade: ordenadas.length,
    });

    // Ponto de não retorno: a partir da próxima linha pode existir post no ar.
    // Isto precisa estar gravado ANTES da chamada sair.
    await ganchos.aoPedirPublicacao(containerId);
    const pedidoEm = new Date();
    await ganchos.aoEvento("PUBLISH_REQUEST_SENT", "media_publish enviado", { containerId });

    let externalId: string;
    let reconciliada = false;

    try {
      const { id } = await this.cliente.post(`${accountId}/media_publish`, {
        creation_id: containerId,
        access_token: accessToken,
      });
      if (!id) throw new TransientError("media_publish respondeu sem id");
      externalId = id;
    } catch (erro) {
      // Erro no publish NÃO é veredito. A Graph API já respondeu erro em
      // chamada que ela processou — foi assim que nasceu o post duplicado.
      logger.warn("media_publish respondeu erro; conferindo se publicou mesmo assim", {
        publicationId: publicacao.id, error: erro instanceof Error ? erro.message : String(erro),
      });

      const achado = await tentarReconciliar(
        this.cliente,
        { accountId, accessToken, pedidoEm, legenda },
        (falha) => logger.warn("reconciliação não pôde consultar a plataforma", {
          publicationId: publicacao.id, error: falha instanceof Error ? falha.message : String(falha),
        }),
      );

      if (!achado) throw erro;

      await ganchos.aoEvento("RECONCILED",
        "O publish respondeu erro, mas a publicação existe na plataforma — adotada em vez de republicada",
        { externalId: achado.externalId, erroOriginal: erro instanceof Error ? erro.message : String(erro) });

      return { externalId: achado.externalId, externalUrl: achado.externalUrl, reconciliada: true };
    }

    // Daqui pra baixo o post ESTÁ no ar. Nada mais pode virar falha de publicação.
    const externalUrl = await this.buscarPermalink(externalId, accessToken, publicacao.id);
    return { externalId, externalUrl, reconciliada };
  }

  /**
   * Cria o container. O retry é local e pequeno porque a Graph API falha de
   * forma transitória na criação ("Only photo or video can be accepted as media
   * type") e resolve na tentativa seguinte — comportamento observado desde o
   * script original. Containers filhos não são reutilizáveis: recria do zero.
   *
   * Retentar aqui é seguro: nada foi publicado ainda.
   */
  private async criarContainerComRetry(
    tipo: PublicationType,
    midias: MidiaPublicavel[],
    legenda: string,
    credenciais: { accountId: string; accessToken: string },
    tentativas = 3,
  ): Promise<string> {
    let ultimoErro: unknown;
    for (let n = 1; n <= tentativas; n++) {
      try {
        const id = await this.criarContainer(tipo, midias, legenda, credenciais);
        await this.cliente.esperarContainer(id, credenciais.accessToken, {
          timeoutMs: tipo === "REEL" ? TIMEOUT_VIDEO_MS : TIMEOUT_IMAGEM_MS,
        });
        return id;
      } catch (erro) {
        ultimoErro = erro;
        // Erro de configuração não melhora com repetição.
        if (erro instanceof GraphApiError && [190, 200, 100].includes(erro.code ?? 0)) throw erro;
        if (n === tentativas) break;
        await new Promise((r) => setTimeout(r, 3000 * n));
      }
    }
    throw ultimoErro;
  }

  private async criarContainer(
    tipo: PublicationType,
    midias: MidiaPublicavel[],
    legenda: string,
    { accountId, accessToken }: { accountId: string; accessToken: string },
  ): Promise<string> {
    if (tipo === "REEL") {
      const { id } = await this.cliente.post(`${accountId}/media`, {
        media_type: "REELS",
        video_url: midias[0].url,
        caption: legenda,
        access_token: accessToken,
      });
      return id;
    }

    if (midias.length === 1) {
      const { id } = await this.cliente.post(`${accountId}/media`, {
        image_url: midias[0].url,
        caption: legenda,
        access_token: accessToken,
      });
      return id;
    }

    const filhos: string[] = [];
    for (const midia of midias) {
      const { id } = await this.cliente.post(`${accountId}/media`, {
        image_url: midia.url,
        is_carousel_item: "true",
        access_token: accessToken,
      });
      filhos.push(id);
    }
    const { id } = await this.cliente.post(`${accountId}/media`, {
      media_type: "CAROUSEL",
      children: filhos.join(","),
      caption: legenda,
      access_token: accessToken,
    });
    return id;
  }

  /**
   * Busca o permalink. Falhar aqui é irrelevante pro desfecho: o post já saiu.
   * Devolve null e a publicação fica PUBLISHED com metadados pendentes.
   */
  private async buscarPermalink(externalId: string, accessToken: string, publicationId: string): Promise<string | null> {
    try {
      const { permalink } = await this.cliente.get(externalId, { fields: "permalink", access_token: accessToken });
      return permalink ?? null;
    } catch (erro) {
      logger.warn("publicado, mas o permalink não veio — metadados ficam pendentes, sem retry", {
        publicationId, externalId, error: erro instanceof Error ? erro.message : String(erro),
      });
      return null;
    }
  }
}
