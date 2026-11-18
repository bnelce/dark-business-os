import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export function env(nome) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente faltando: ${nome}`);
  return valor;
}

export function assinarUpload(timestamp, apiSecret) {
  return createHash("sha1").update(`timestamp=${timestamp}${apiSecret}`).digest("hex");
}

export function endpointDeUpload(cloudName, resourceType = "image") {
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
}

export async function uploadParaCloudinary(caminho, { resourceType = "image", fetchImpl = fetch } = {}) {
  const cloudName = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const apiSecret = env("CLOUDINARY_API_SECRET");

  const timestamp = Math.floor(Date.now() / 1000);
  const form = new FormData();
  form.append("file", new Blob([await readFile(caminho)]), basename(caminho));
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", assinarUpload(timestamp, apiSecret));

  const res = await fetchImpl(endpointDeUpload(cloudName, resourceType), { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(`Cloudinary falhou (${caminho}): ${data.error?.message ?? res.statusText}`);
  return data.secure_url;
}
