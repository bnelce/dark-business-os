import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual, scryptSync } from "node:crypto";
import { obrigatorio } from "./env";

/**
 * Cifra das credenciais de canal guardadas no banco.
 * AES-256-GCM: além de esconder, detecta adulteração do texto cifrado.
 * Formato: v1.<iv base64url>.<tag base64url>.<cifrado base64url>
 */

const VERSAO = "v1";

function chave(): Buffer {
  const hex = obrigatorio("ENCRYPTION_KEY");
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error("ENCRYPTION_KEY precisa ser 64 caracteres hex (openssl rand -hex 32)");
  }
  return Buffer.from(hex, "hex");
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chave(), iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSAO, iv.toString("base64url"), tag.toString("base64url"), cifrado.toString("base64url")].join(".");
}

export function decifrar(pacote: string): string {
  const [versao, iv, tag, dados] = pacote.split(".");
  if (versao !== VERSAO || !iv || !tag || !dados) throw new Error("Pacote cifrado malformado");
  const decipher = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dados, "base64url")), decipher.final()]).toString("utf8");
}

/**
 * Comparação de senha em tempo constante.
 * Deriva os dois lados com scrypt antes de comparar: iguala o tamanho e
 * impede que o tempo de resposta revele o prefixo correto da senha.
 */
export function senhaConfere(informada: string, esperada: string): boolean {
  const sal = "publication-manager/admin";
  const a = scryptSync(informada, sal, 32);
  const b = scryptSync(esperada, sal, 32);
  return timingSafeEqual(a, b);
}

/** Impressão digital da legenda — chave da reconciliação pós-publish. */
export function impressaoDeLegenda(legenda: string): string {
  return legenda.replace(/\s+/g, " ").trim().slice(0, 160).toLowerCase();
}
