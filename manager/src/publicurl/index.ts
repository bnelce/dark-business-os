import type { PublicUrlProvider } from "./types";
import { MinioPublicUrlProvider } from "./minio";
import { CloudinaryPublicUrlProvider } from "./cloudinary";
import { opcional } from "../lib/env";

export type { PublicUrlProvider };
export { MinioPublicUrlProvider, CloudinaryPublicUrlProvider };

export function publicUrlProviderDoAmbiente(): PublicUrlProvider {
  const escolha = (opcional("PUBLIC_URL_PROVIDER", "cloudinary") ?? "cloudinary").toLowerCase();
  switch (escolha) {
    case "minio": return new MinioPublicUrlProvider();
    case "cloudinary": return new CloudinaryPublicUrlProvider();
    default:
      throw new Error(`PUBLIC_URL_PROVIDER desconhecido: "${escolha}". Use "minio" ou "cloudinary".`);
  }
}
