import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { assinarUpload, endpointDeUpload } from "./cloudinary.js";

test("assina o upload com sha1 de timestamp + secret", () => {
  const esperado = createHash("sha1").update("timestamp=1234segredo").digest("hex");
  assert.equal(assinarUpload(1234, "segredo"), esperado);
});

test("usa o endpoint de imagem por padrão", () => {
  assert.equal(endpointDeUpload("demo"), "https://api.cloudinary.com/v1_1/demo/image/upload");
});

test("usa o endpoint de vídeo quando pedido", () => {
  assert.equal(endpointDeUpload("demo", "video"), "https://api.cloudinary.com/v1_1/demo/video/upload");
});

// O upload de vídeo bate noutro endpoint do Cloudinary (/video/upload). Foi por
// isso que o helper foi extraído do postar-instagram.js com `resourceType` —
// trocar o literal por "image" em publicar.js voltaria a subir reel como imagem.
test("upload de vídeo bate no endpoint /video/upload", async () => {
  const { mkdtemp, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { uploadParaCloudinary } = await import("./cloudinary.js");

  const dir = await mkdtemp(join(tmpdir(), "cloudinary-"));
  const arquivo = join(dir, "reel.mp4");
  await writeFile(arquivo, "conteudo-falso");

  process.env.CLOUDINARY_CLOUD_NAME = "demo";
  process.env.CLOUDINARY_API_KEY = "chave";
  process.env.CLOUDINARY_API_SECRET = "segredo";

  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    return { ok: true, json: async () => ({ secure_url: "https://cdn/demo/reel.mp4" }) };
  };

  const url = await uploadParaCloudinary(arquivo, { resourceType: "video", fetchImpl });

  assert.equal(urls.length, 1);
  assert.ok(urls[0].endsWith("/video/upload"), `subiu em ${urls[0]}, e vídeo não sobe pelo endpoint de imagem`);
  assert.equal(url, "https://cdn/demo/reel.mp4");
});
