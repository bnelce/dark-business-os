import { extname, basename } from "node:path";

/**
 * Layout das chaves no bucket:
 *   projects/{projectId}/publications/{publicationId}/original/{posição}-{nome}
 *
 * IDs em vez de slugs: renomear um projeto não pode invalidar as mídias já
 * publicadas. A posição no nome mantém o carrossel legível no console do MinIO.
 */
export function chaveDeMidia(
  projectId: string,
  publicationId: string,
  posicao: number,
  nomeArquivo: string,
): string {
  const nome = sanitizar(basename(nomeArquivo));
  const pos = String(posicao).padStart(2, "0");
  return `projects/${projectId}/publications/${publicationId}/original/${pos}-${nome}`;
}

export function prefixoDaPublicacao(projectId: string, publicationId: string): string {
  return `projects/${projectId}/publications/${publicationId}/`;
}

export function sanitizar(nome: string): string {
  const ext = extname(nome).toLowerCase();
  const base = basename(nome, extname(nome))
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "arquivo";
  return `${base}${ext}`;
}

const MIME_POR_EXTENSAO: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4", ".mov": "video/quicktime",
};

export const MIMES_PERMITIDOS = new Set(Object.values(MIME_POR_EXTENSAO));

export function mimeDoArquivo(nome: string): string | undefined {
  return MIME_POR_EXTENSAO[extname(nome).toLowerCase()];
}

/** Limites da própria Meta: 8MB por imagem, 1GB por vídeo. */
export const TAMANHO_MAXIMO = { imagem: 8 * 1024 * 1024, video: 1024 * 1024 * 1024 };

export function validarArquivo(nome: string, tamanho: number): string[] {
  const erros: string[] = [];
  const mime = mimeDoArquivo(nome);
  if (!mime) { erros.push(`Extensão não suportada: ${nome}`); return erros; }
  const limite = mime.startsWith("video/") ? TAMANHO_MAXIMO.video : TAMANHO_MAXIMO.imagem;
  if (tamanho > limite) {
    erros.push(`${nome} tem ${(tamanho / 1048576).toFixed(1)}MB, acima do limite de ${(limite / 1048576).toFixed(0)}MB`);
  }
  if (tamanho === 0) erros.push(`${nome} está vazio`);
  return erros;
}
