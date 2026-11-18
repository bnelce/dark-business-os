import { createHash } from "node:crypto";
import { basename } from "node:path";
import type { PublicUrlProvider } from "./types";
import type { StorageProvider } from "../storage/types";
import { obrigatorio } from "../lib/env";
import { TransientError } from "../domain/errors";

/**
 * Desenvolvimento: espelha o objeto no Cloudinary só pra ter uma URL que a Meta
 * alcança. Porte direto de scripts/lib/cloudinary.js, que já roda em produção
 * desde o primeiro carrossel — mesma assinatura, mesmo endpoint.
 *
 * O MinIO continua sendo a fonte de verdade; o Cloudinary aqui é só um espelho
 * descartável de entrega.
 */
export function assinarUpload(timestamp: number, apiSecret: string): string {
  return createHash("sha1").update(`timestamp=${timestamp}${apiSecret}`).digest("hex");
}

export function endpointDeUpload(cloudName: string, resourceType = "image"): string {
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
}

export class CloudinaryPublicUrlProvider implements PublicUrlProvider {
  readonly nome = "cloudinary";

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async urlPublica(
    objectKey: string,
    { mimeType, storage }: { mimeType: string; storage: StorageProvider },
  ): Promise<string> {
    const cloudName = obrigatorio("CLOUDINARY_CLOUD_NAME");
    const apiKey = obrigatorio("CLOUDINARY_API_KEY");
    const apiSecret = obrigatorio("CLOUDINARY_API_SECRET");

    const dados = await storage.download(objectKey);
    const resourceType = mimeType.startsWith("video/") ? "video" : "image";
    const timestamp = Math.floor(Date.now() / 1000);

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(dados)], { type: mimeType }), basename(objectKey));
    form.append("api_key", apiKey);
    form.append("timestamp", String(timestamp));
    form.append("signature", assinarUpload(timestamp, apiSecret));

    const res = await this.fetchImpl(endpointDeUpload(cloudName, resourceType), { method: "POST", body: form });
    const corpo = (await res.json()) as { secure_url?: string; error?: { message?: string } };
    if (!res.ok || !corpo.secure_url) {
      // Espelhar é etapa de entrega, não de publicação: falhar aqui é sempre
      // seguro pra retentar, porque nada foi publicado ainda.
      throw new TransientError(
        `Cloudinary falhou (${objectKey}): ${corpo.error?.message ?? res.statusText}`,
      );
    }
    return corpo.secure_url;
  }
}
