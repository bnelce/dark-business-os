import type { StorageProvider } from "../storage/types";

/**
 * A Meta baixa a mídia por URL: precisa ser alcançável pela internet pública.
 * MinIO em localhost não é — daí este contrato existir separado do storage.
 *
 * Em produção o MinIO tem DNS próprio e a URL sai dele direto.
 * Em desenvolvimento o arquivo é espelhado no Cloudinary só pra gerar a URL.
 */
export interface PublicUrlProvider {
  readonly nome: string;
  /** URL pública e alcançável para um objeto já gravado no storage. */
  urlPublica(objectKey: string, opcoes: { mimeType: string; storage: StorageProvider }): Promise<string>;
}
