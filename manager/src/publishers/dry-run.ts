import type { Channel, PublicationType } from "@prisma/client";
import type { Publisher, EntradaDePublicacao, GanchosDePublicacao, ResultadoDePublicacao } from "./types";
import { PermanentError } from "../domain/errors";
import { logger } from "../lib/logger";

/**
 * Publisher de ensaio: percorre o pipeline inteiro sem publicar nada.
 *
 * Não é um stub que devolve sucesso — valida credencial, tipo, quantidade de
 * mídia e se as URLs públicas foram realmente geradas. Um dry-run que passa
 * significa que só faltou a chamada final, e é assim que se testa a fila sem
 * risco de post duplicado.
 */
/** Prefixo do external id de ensaio. A interface usa isto pra rotular a publicação. */
export const PREFIXO_DRY_RUN = "dryrun-";

export class DryRunPublisher implements Publisher {
  readonly canal: Channel;
  readonly tiposSuportados: PublicationType[];

  constructor(private readonly real: Publisher) {
    this.canal = real.canal;
    this.tiposSuportados = real.tiposSuportados;
  }

  async publicar(entrada: EntradaDePublicacao, ganchos: GanchosDePublicacao): Promise<ResultadoDePublicacao> {
    const { publicacao, midias, credenciais } = entrada;

    if (!credenciais.accessToken || !credenciais.accountId) {
      throw new PermanentError("Dry-run: credenciais do canal ausentes ou incompletas");
    }
    if (!this.tiposSuportados.includes(publicacao.type)) {
      throw new PermanentError(`Dry-run: tipo ${publicacao.type} não suportado por ${this.canal}`);
    }
    if (midias.length === 0) throw new PermanentError("Dry-run: nenhuma mídia para publicar");
    if (publicacao.type === "CAROUSEL" && (midias.length < 2 || midias.length > 10)) {
      throw new PermanentError(`Dry-run: carrossel precisa de 2 a 10 mídias, recebeu ${midias.length}`);
    }
    if (!publicacao.caption?.trim()) throw new PermanentError("Dry-run: legenda vazia");

    for (const midia of midias) {
      if (!/^https:\/\//.test(midia.url)) {
        throw new PermanentError(
          `Dry-run: mídia ${midia.posicao} sem URL pública https (${midia.url}) — a plataforma não conseguiria baixar`,
        );
      }
    }

    const containerId = `dryrun-container-${publicacao.id}`;
    // As URLs já chegam prontas: dependendo do PublicUrlProvider, a mídia foi
    // mesmo espelhada num serviço externo pra provar que a URL é alcançável.
    // Só a chamada de publicação é que não acontece.
    await ganchos.aoEvento("MEDIA_UPLOADED",
      `[DRY-RUN] ${midias.length} mídia(s) com URL pública válida. Nada foi publicado.`, {
      dryRun: true, urls: midias.map((m) => m.url),
    });
    await ganchos.aoPedirPublicacao(containerId);
    await ganchos.aoEvento("PUBLISH_REQUEST_SENT", "[DRY-RUN] media_publish NÃO foi enviado", { dryRun: true });

    logger.info("dry-run: publicação validada e não enviada", {
      publicationId: publicacao.id, projectId: publicacao.projectId, event: "DRY_RUN_PUBLISH",
    });

    // externalUrl fica nulo: um link que parece post real mas não abre nada é
    // pior do que link nenhum. O prefixo dryrun- no id é o que a interface usa
    // pra dizer que aquilo foi ensaio, e não publicação.
    return { externalId: `${PREFIXO_DRY_RUN}${publicacao.id}`, externalUrl: null, reconciliada: false };
  }
}
