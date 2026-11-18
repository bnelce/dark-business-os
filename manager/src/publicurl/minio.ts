import type { PublicUrlProvider } from "./types";
import { obrigatorio } from "../lib/env";

/**
 * Produção: o bucket é servido por um DNS próprio (media.dominio.com) atrás de
 * proxy reverso. A chave do objeto é o caminho, então a URL é estável e não expira.
 */
export class MinioPublicUrlProvider implements PublicUrlProvider {
  readonly nome = "minio";

  constructor(private readonly base = obrigatorio("MEDIA_PUBLIC_BASE_URL")) {
    if (!/^https:\/\//.test(this.base)) {
      // A Meta recusa http em produção, e um erro aqui é bem mais barato
      // do que descobrir isso no meio de um publish.
      throw new Error(`MEDIA_PUBLIC_BASE_URL precisa ser https: recebido "${this.base}"`);
    }
  }

  async urlPublica(objectKey: string): Promise<string> {
    const caminho = objectKey.split("/").map(encodeURIComponent).join("/");
    return `${this.base.replace(/\/+$/, "")}/${caminho}`;
  }
}
