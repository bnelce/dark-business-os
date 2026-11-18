import { Client } from "minio";
import type { StorageProvider, ObjetoSalvo, OpcoesDeUpload } from "./types";
import { obrigatorio, opcional, booleano, numero } from "../lib/env";

let clienteCache: Client | undefined;

export function clienteMinio(): Client {
  if (!clienteCache) {
    clienteCache = new Client({
      endPoint: obrigatorio("MINIO_ENDPOINT"),
      port: numero("MINIO_PORT", 9000),
      useSSL: booleano("MINIO_USE_SSL", false),
      accessKey: obrigatorio("MINIO_ACCESS_KEY"),
      secretKey: obrigatorio("MINIO_SECRET_KEY"),
    });
  }
  return clienteCache;
}

export class MinioStorageProvider implements StorageProvider {
  readonly nome = "minio";
  private readonly bucket: string;

  constructor(private readonly cliente: Client = clienteMinio(), bucket?: string) {
    this.bucket = bucket ?? opcional("MINIO_BUCKET", "publication-media")!;
  }

  /** Cria o bucket se ainda não existir. Chamado no boot do worker e do import. */
  async garantirBucket(): Promise<void> {
    if (!(await this.cliente.bucketExists(this.bucket))) {
      await this.cliente.makeBucket(this.bucket);
    }
  }

  async upload(objectKey: string, dados: Buffer, opcoes: OpcoesDeUpload): Promise<ObjetoSalvo> {
    const resultado = await this.cliente.putObject(this.bucket, objectKey, dados, dados.length, {
      "Content-Type": opcoes.mimeType,
      ...Object.fromEntries(Object.entries(opcoes.metadata ?? {}).map(([k, v]) => [`X-Amz-Meta-${k}`, v])),
    });
    return { objectKey, size: dados.length, etag: resultado.etag };
  }

  async download(objectKey: string): Promise<Buffer> {
    const stream = await this.cliente.getObject(this.bucket, objectKey);
    const pedacos: Buffer[] = [];
    for await (const pedaco of stream) pedacos.push(pedaco as Buffer);
    return Buffer.concat(pedacos);
  }

  async delete(objectKey: string): Promise<void> {
    await this.cliente.removeObject(this.bucket, objectKey);
  }

  async exists(objectKey: string): Promise<boolean> {
    try {
      await this.cliente.statObject(this.bucket, objectKey);
      return true;
    } catch (err) {
      if ((err as { code?: string }).code === "NotFound") return false;
      throw err;
    }
  }

  /**
   * Rota autenticada do próprio dashboard — o bucket nunca é servido direto.
   * Carrega o basePath porque o app pode estar sob subcaminho no proxy reverso.
   */
  getPublicUrl(objectKey: string): string {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    return `${base}/api/media/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  }
}
