import type { Channel, Media, Publication, PublicationType } from "@prisma/client";

export type MidiaPublicavel = {
  /** URL alcançável pela plataforma. Vem do PublicUrlProvider, não do storage. */
  url: string;
  mimeType: string;
  posicao: number;
};

export type CredenciaisInstagram = {
  accessToken: string;
  accountId: string;
};

export type EntradaDePublicacao = {
  publicacao: Publication & { media: Media[] };
  midias: MidiaPublicavel[];
  credenciais: CredenciaisInstagram;
};

/**
 * Ganchos que o publisher chama em pontos irreversíveis.
 * aoPedirPublicacao é o mais importante: grava em disco que um publish foi
 * disparado ANTES da chamada sair. Se o processo morrer no meio, a recuperação
 * sabe que precisa reconciliar em vez de republicar.
 */
export type GanchosDePublicacao = {
  aoPedirPublicacao(containerId: string): Promise<void>;
  aoEvento(tipo: "MEDIA_UPLOADED" | "PUBLISH_REQUEST_SENT" | "RECONCILED", mensagem: string, metadata?: Record<string, unknown>): Promise<void>;
};

export type ResultadoDePublicacao = {
  externalId: string;
  /** null quando a publicação saiu mas o permalink não veio. Nunca é falha. */
  externalUrl: string | null;
  /** true quando o publish respondeu erro mas a plataforma tinha publicado. */
  reconciliada: boolean;
};

export interface Publisher {
  readonly canal: Channel;
  readonly tiposSuportados: PublicationType[];
  /** Lança em caso de falha real. Sucesso sempre devolve um externalId. */
  publicar(entrada: EntradaDePublicacao, ganchos: GanchosDePublicacao): Promise<ResultadoDePublicacao>;
}
