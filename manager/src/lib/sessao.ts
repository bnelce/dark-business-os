import { SignJWT, jwtVerify } from "jose";

/**
 * Sessão como JWT assinado. Isolado de crypto.ts de propósito: o middleware
 * roda no runtime Edge, que não tem node:crypto — só o que estiver aqui pode
 * ser importado por ele.
 */

export const NOME_DO_COOKIE = "pm_sessao";
export const DURACAO_HORAS = 12;

export type Sessao = { usuario: string; emitidoEm: number };

function segredo(): Uint8Array {
  const valor = process.env.AUTH_SECRET;
  if (!valor) throw new Error("Variável de ambiente faltando: AUTH_SECRET");
  return new TextEncoder().encode(valor);
}

export async function criarSessao(usuario: string): Promise<string> {
  return new SignJWT({ usuario })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_HORAS}h`)
    .sign(segredo());
}

export async function lerSessao(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    return { usuario: String(payload.usuario), emitidoEm: Number(payload.iat) };
  } catch {
    return null;
  }
}
