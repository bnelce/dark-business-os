import { NextResponse } from "next/server";
import { MinioStorageProvider } from "@/storage/minio";
import { sessaoAtual } from "@/lib/auth";

/**
 * Serve a mídia do MinIO pela aplicação, atrás da sessão.
 *
 * O bucket nunca é exposto direto: quem quiser ver um slide precisa estar
 * autenticado. A URL que a plataforma consome é outra coisa (PublicUrlProvider)
 * e não passa por aqui.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ chave: string[] }> }) {
  if (!(await sessaoAtual())) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { chave } = await ctx.params;
  const objectKey = chave.map(decodeURIComponent).join("/");

  // Travessia de diretório não chega no MinIO, mas barrar aqui é mais barato.
  if (objectKey.includes("..") || !objectKey.startsWith("projects/")) {
    return NextResponse.json({ erro: "Chave inválida" }, { status: 400 });
  }

  const storage = new MinioStorageProvider();
  try {
    const dados = await storage.download(objectKey);
    return new NextResponse(new Uint8Array(dados), {
      headers: {
        "Content-Type": tipoPorExtensao(objectKey),
        "Content-Length": String(dados.length),
        // Imutável: a chave inclui o id da publicação e o arquivo nunca muda no lugar.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ erro: "Mídia não encontrada" }, { status: 404 });
  }
}

function tipoPorExtensao(chave: string): string {
  const ext = chave.slice(chave.lastIndexOf(".")).toLowerCase();
  return { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4", ".mov": "video/quicktime",
  }[ext] ?? "application/octet-stream";
}
