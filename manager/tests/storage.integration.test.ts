import { describe, it, expect, beforeAll } from "vitest";
import { MinioStorageProvider } from "../src/storage/minio";
import { chaveDeMidia } from "../src/storage/keys";

// Roda contra o MinIO do docker-compose. Se o container não estiver de pé,
// o teste falha alto — é exatamente o sinal que se quer antes de publicar.
describe("MinIO de verdade", () => {
  let storage: MinioStorageProvider;

  beforeAll(async () => {
    storage = new MinioStorageProvider();
    await storage.garantirBucket();
  });

  it("faz o ciclo completo: upload, exists, download, delete", async () => {
    const chave = chaveDeMidia("proj-teste", "pub-teste", 1, "slide-01.png");
    const dados = Buffer.from("bytes de um slide");

    const salvo = await storage.upload(chave, dados, {
      mimeType: "image/png",
      metadata: { projectId: "proj-teste" },
    });
    expect(salvo.objectKey).toBe(chave);
    expect(salvo.size).toBe(dados.length);

    expect(await storage.exists(chave)).toBe(true);
    expect((await storage.download(chave)).equals(dados)).toBe(true);

    await storage.delete(chave);
    expect(await storage.exists(chave)).toBe(false);
  });

  it("exists devolve false pra chave inexistente em vez de explodir", async () => {
    expect(await storage.exists("projects/nao/existe/nada.png")).toBe(false);
  });

  it("mantém mídias de projetos diferentes em prefixos separados", async () => {
    const a = chaveDeMidia("projeto-a", "pub1", 1, "s.png");
    const b = chaveDeMidia("projeto-b", "pub1", 1, "s.png");
    await storage.upload(a, Buffer.from("A"), { mimeType: "image/png" });
    await storage.upload(b, Buffer.from("B"), { mimeType: "image/png" });

    expect((await storage.download(a)).toString()).toBe("A");
    expect((await storage.download(b)).toString()).toBe("B");

    await storage.delete(a);
    await storage.delete(b);
  });
});
