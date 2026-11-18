// scripts/reels/checar-ambiente.js
import { execFileSync } from "node:child_process";

const OBRIGATORIAS = [
  "META_IG_USER_ID",
  "META_PAGE_ACCESS_TOKEN",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "OPENAI_API_KEY",
];

function checarEnv() {
  const faltando = OBRIGATORIAS.filter((nome) => !process.env[nome]);
  if (faltando.length > 0) {
    throw new Error(`Variáveis faltando no .env: ${faltando.join(", ")}`);
  }
  console.log(`✓ ${OBRIGATORIAS.length} variáveis de ambiente presentes`);
}

function checarBinario(nome) {
  try {
    execFileSync(nome, ["-version"], { stdio: "ignore" });
    console.log(`✓ ${nome} disponível`);
  } catch {
    throw new Error(`${nome} não encontrado no PATH. Instale com: brew install ffmpeg`);
  }
}

async function checarLimiteDePublicacao() {
  const url = new URL(`https://graph.facebook.com/v21.0/${process.env.META_IG_USER_ID}/content_publishing_limit`);
  url.searchParams.set("fields", "quota_usage,config");
  url.searchParams.set("access_token", process.env.META_PAGE_ACCESS_TOKEN);

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(`Token da Meta inválido ou sem permissão: ${data.error?.message ?? res.statusText}`);

  const uso = data.data?.[0]?.quota_usage ?? 0;
  console.log(`✓ Meta respondeu. Uso de publicação nas últimas 24h: ${uso}/100`);
}

checarEnv();
checarBinario("ffmpeg");
checarBinario("ffprobe");
await checarLimiteDePublicacao();
console.log("\nAmbiente pronto.");
