/**
 * Classificação de erro do pipeline de publicação.
 *
 * A pergunta que este módulo responde é uma só: "tentar de novo tem chance de
 * dar certo?". Retry cego em erro permanente queima cota e enche o log; desistir
 * de um erro transitório perde a publicação do dia.
 */

export const ErrorKind = { TRANSIENT: "TRANSIENT", PERMANENT: "PERMANENT" } as const;
export type ErrorKind = (typeof ErrorKind)[keyof typeof ErrorKind];

export class TransientError extends Error {
  readonly kind = ErrorKind.TRANSIENT;
  constructor(message: string, readonly causa?: unknown) {
    super(message);
    this.name = "TransientError";
  }
}

export class PermanentError extends Error {
  readonly kind = ErrorKind.PERMANENT;
  constructor(message: string, readonly causa?: unknown) {
    super(message);
    this.name = "PermanentError";
  }
}

export type GraphErrorBody = {
  message?: string;
  code?: number;
  error_subcode?: number;
  type?: string;
  fbtrace_id?: string;
};

export class GraphApiError extends Error {
  constructor(
    readonly body: GraphErrorBody,
    readonly endpoint: string,
    readonly httpStatus: number,
  ) {
    super(`Graph API falhou (${endpoint}): ${body.message ?? `HTTP ${httpStatus}`}`);
    this.name = "GraphApiError";
  }
  get code() { return this.body.code; }
}

// Códigos da Meta. Fonte: Graph API error reference + o que já apareceu em produção.
const CODIGOS_RATE_LIMIT = new Set([4, 17, 32, 613, 80001, 80002, 80003, 80004, 80005, 80006, 80007]);
const CODIGOS_TRANSITORIOS = new Set([1, 2, 341, 368]);
const CODIGOS_PERMANENTES = new Set([10, 100, 102, 190, 200, 803]);

const ERROS_DE_REDE = new Set([
  "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "EPIPE", "ENOTFOUND", "UND_ERR_CONNECT_TIMEOUT",
]);

const PADRAO_RATE_LIMIT = /request limit reached|rate limit|too many calls|throttl/i;

export type Classificacao = {
  kind: ErrorKind;
  rateLimited: boolean;
  message: string;
  code?: number;
};

function ehErroDeRede(erro: unknown): boolean {
  if (erro instanceof TypeError && /fetch failed|network|socket/i.test(erro.message)) return true;
  const code = (erro as { code?: string })?.code;
  return typeof code === "string" && ERROS_DE_REDE.has(code);
}

export function classificarErro(erro: unknown): Classificacao {
  const message = erro instanceof Error ? erro.message : String(erro);

  if (erro instanceof PermanentError) return { kind: ErrorKind.PERMANENT, rateLimited: false, message };
  if (erro instanceof TransientError) return { kind: ErrorKind.TRANSIENT, rateLimited: false, message };

  if (erro instanceof GraphApiError) {
    const { code } = erro;
    const rateLimited =
      (code !== undefined && CODIGOS_RATE_LIMIT.has(code)) || PADRAO_RATE_LIMIT.test(erro.body.message ?? "");

    if (rateLimited) return { kind: ErrorKind.TRANSIENT, rateLimited: true, message, code };
    if (code !== undefined && CODIGOS_PERMANENTES.has(code)) {
      return { kind: ErrorKind.PERMANENT, rateLimited: false, message, code };
    }
    if (code !== undefined && CODIGOS_TRANSITORIOS.has(code)) {
      return { kind: ErrorKind.TRANSIENT, rateLimited: false, message, code };
    }
    // Família 22070xx: mídia/vídeo recusado pelo Instagram. Recusa é recusa.
    if (code !== undefined && code >= 2_207_000 && code < 2_208_000) {
      return { kind: ErrorKind.PERMANENT, rateLimited: false, message, code };
    }
    if (erro.httpStatus >= 500) return { kind: ErrorKind.TRANSIENT, rateLimited: false, message, code };
    // 4xx sem código conhecido: a plataforma recusou o pedido como ele está.
    if (erro.httpStatus >= 400) return { kind: ErrorKind.PERMANENT, rateLimited: false, message, code };
  }

  if (ehErroDeRede(erro)) return { kind: ErrorKind.TRANSIENT, rateLimited: false, message };
  if (PADRAO_RATE_LIMIT.test(message)) return { kind: ErrorKind.TRANSIENT, rateLimited: true, message };

  // Desconhecido → transitório. O teto de tentativas limita o estrago,
  // e desistir de algo recuperável custa mais caro do que uma tentativa extra.
  return { kind: ErrorKind.TRANSIENT, rateLimited: false, message };
}
