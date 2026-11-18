export type ObjetoSalvo = {
  objectKey: string;
  size: number;
  etag?: string;
};

export type OpcoesDeUpload = {
  mimeType: string;
  /** Metadados livres gravados no objeto (projectId, publicationId). */
  metadata?: Record<string, string>;
};

/**
 * Contrato de armazenamento. O domínio nunca fala com o SDK do MinIO direto —
 * trocar por S3 ou Cloudinary é implementar esta interface e nada mais.
 */
export interface StorageProvider {
  readonly nome: string;
  upload(objectKey: string, dados: Buffer, opcoes: OpcoesDeUpload): Promise<ObjetoSalvo>;
  download(objectKey: string): Promise<Buffer>;
  delete(objectKey: string): Promise<void>;
  exists(objectKey: string): Promise<boolean>;
  /** URL pra uso interno (preview no dashboard). Não é a URL que a Meta consome. */
  getPublicUrl(objectKey: string): string;
}
