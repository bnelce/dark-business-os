import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { chaveDeMidia, sanitizar, validarArquivo, mimeDoArquivo } from "../src/storage/keys";
import { MinioStorageProvider } from "../src/storage/minio";
import { assinarUpload, endpointDeUpload, CloudinaryPublicUrlProvider } from "../src/publicurl/cloudinary";
import { MinioPublicUrlProvider } from "../src/publicurl/minio";

describe("chaves de objeto", () => {
  it("organiza por projeto e publicação, com a posição no nome", () => {
    expect(chaveDeMidia("proj1", "pub1", 1, "slide-01.png"))
      .toBe("projects/proj1/publications/pub1/original/01-slide-01.png");
  });

  it("usa IDs, não slugs — renomear projeto não pode invalidar mídia publicada", () => {
    const chave = chaveDeMidia("clx123", "clx456", 3, "a.png");
    expect(chave).toContain("clx123");
    expect(chave).toContain("clx456");
  });

  it("sanitiza acento, espaço e travessia de diretório", () => {
    expect(sanitizar("Fotossíntese final.png")).toBe("Fotossintese-final.png");
    expect(sanitizar("../../etc/passwd.png")).toBe("passwd.png");
    expect(chaveDeMidia("p", "u", 1, "../../../evil.png")).not.toContain("..");
  });

  it("não devolve nome vazio", () => {
    expect(sanitizar("!!!.png")).toBe("arquivo.png");
  });
});

describe("validação de arquivo", () => {
  it("aceita PNG dentro do limite", () => {
    expect(validarArquivo("slide-01.png", 900_000)).toEqual([]);
  });
  it("recusa extensão não suportada", () => {
    expect(validarArquivo("planilha.xlsx", 1000)[0]).toMatch(/não suportada/);
  });
  it("recusa imagem acima de 8MB (limite da Meta)", () => {
    expect(validarArquivo("grande.png", 9 * 1024 * 1024)[0]).toMatch(/acima do limite de 8MB/);
  });
  it("aceita vídeo grande, que tem limite próprio", () => {
    expect(validarArquivo("reel.mp4", 40 * 1024 * 1024)).toEqual([]);
  });
  it("recusa arquivo vazio", () => {
    expect(validarArquivo("slide.png", 0)).toContain("slide.png está vazio");
  });
  it("deduz o mime pela extensão", () => {
    expect(mimeDoArquivo("a.PNG")).toBe("image/png");
    expect(mimeDoArquivo("a.mp4")).toBe("video/mp4");
    expect(mimeDoArquivo("a.exe")).toBeUndefined();
  });
});

describe("MinioStorageProvider.getPublicUrl", () => {
  const antes = process.env.NEXT_PUBLIC_BASE_PATH;
  afterEach(() => {
    if (antes === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = antes;
  });

  it("aponta pra rota autenticada do app, nunca pro bucket", () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    const p = new MinioStorageProvider({} as never, "bucket");
    const url = p.getPublicUrl("projects/p1/publications/u1/original/01-slide.png");
    expect(url).toBe("/api/media/projects/p1/publications/u1/original/01-slide.png");
    expect(url).not.toContain("9000");
  });

  // Atrás de um proxy reverso o app vive em /publicador; sem o prefixo o preview quebra.
  it("carrega o basePath quando o app é servido sob subcaminho", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/publicador";
    const p = new MinioStorageProvider({} as never, "bucket");
    expect(p.getPublicUrl("projects/p1/publications/u1/original/01-slide.png"))
      .toBe("/publicador/api/media/projects/p1/publications/u1/original/01-slide.png");
  });
});

describe("MinioPublicUrlProvider", () => {
  it("monta a URL a partir do DNS do storage", async () => {
    const p = new MinioPublicUrlProvider("https://media.exemplo.com/");
    expect(await p.urlPublica("projects/p/publications/u/original/01-a.png"))
      .toBe("https://media.exemplo.com/projects/p/publications/u/original/01-a.png");
  });

  it("recusa base sem https — a Meta não aceita http", () => {
    expect(() => new MinioPublicUrlProvider("http://media.exemplo.com")).toThrow(/https/);
  });
});

describe("CloudinaryPublicUrlProvider", () => {
  const antes = { ...process.env };
  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = "cloud";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "segredo";
  });
  afterEach(() => { process.env = { ...antes }; });

  it("assina igual ao script legado (sha1 de timestamp=<ts><secret>)", () => {
    // Mesmo algoritmo de scripts/lib/cloudinary.js, que publica desde o 1º carrossel.
    expect(assinarUpload(1234567890, "segredo")).toMatch(/^[0-9a-f]{40}$/);
    expect(assinarUpload(1, "a")).toBe(assinarUpload(1, "a"));
    expect(assinarUpload(1, "a")).not.toBe(assinarUpload(2, "a"));
  });

  it("escolhe o resource_type pelo mime", () => {
    expect(endpointDeUpload("cloud", "video")).toContain("/video/upload");
    expect(endpointDeUpload("cloud")).toContain("/image/upload");
  });

  it("baixa do storage e devolve a secure_url", async () => {
    let urlChamada = "";
    const fakeFetch = (async (url: string) => {
      urlChamada = String(url);
      return { ok: true, json: async () => ({ secure_url: "https://res.cloudinary.com/x/a.png" }) };
    }) as unknown as typeof fetch;

    const storage = { download: async () => Buffer.from("png") } as never;
    const p = new CloudinaryPublicUrlProvider(fakeFetch);
    const url = await p.urlPublica("projects/p/publications/u/original/01-a.png", {
      mimeType: "image/png", storage,
    });
    expect(url).toBe("https://res.cloudinary.com/x/a.png");
    expect(urlChamada).toContain("/image/upload");
  });

  it("manda vídeo pro endpoint de vídeo", async () => {
    let urlChamada = "";
    const fakeFetch = (async (url: string) => {
      urlChamada = String(url);
      return { ok: true, json: async () => ({ secure_url: "https://res.cloudinary.com/x/a.mp4" }) };
    }) as unknown as typeof fetch;
    const storage = { download: async () => Buffer.from("mp4") } as never;
    await new CloudinaryPublicUrlProvider(fakeFetch).urlPublica("k.mp4", { mimeType: "video/mp4", storage });
    expect(urlChamada).toContain("/video/upload");
  });

  it("falha de espelhamento é transitória — nada foi publicado ainda", async () => {
    const fakeFetch = (async () => ({
      ok: false, statusText: "Bad Request", json: async () => ({ error: { message: "quota" } }),
    })) as unknown as typeof fetch;
    const storage = { download: async () => Buffer.from("x") } as never;
    const p = new CloudinaryPublicUrlProvider(fakeFetch);
    await expect(p.urlPublica("k.png", { mimeType: "image/png", storage }))
      .rejects.toMatchObject({ kind: "TRANSIENT" });
  });
});
