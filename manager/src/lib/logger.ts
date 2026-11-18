/**
 * Log estruturado em JSON, uma linha por evento.
 *
 * Todo valor passa pelo redator antes de sair: um access token em log é um
 * token vazado, e tokens da Meta circulam por praticamente todo o pipeline.
 */

const CHAVES_SENSIVEIS =
  /(token|secret|password|senha|api_key|apikey|access_key|credential|authorization|signature)/i;

/** Assinaturas de segredo que aparecem no meio de strings (URL, mensagem de erro). */
const PADROES_SENSIVEIS: Array<[RegExp, string]> = [
  [/access_token=[^&\s"]+/gi, "access_token=[REDACTED]"],
  [/api_key=[^&\s"]+/gi, "api_key=[REDACTED]"],
  [/signature=[^&\s"]+/gi, "signature=[REDACTED]"],
  [/\bEAA[A-Za-z0-9]{20,}/g, "[REDACTED_META_TOKEN]"],
  [/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]"],
];

export function redigir(valor: unknown, profundidade = 0): unknown {
  if (profundidade > 6) return "[profundo demais]";
  if (typeof valor === "string") {
    return PADROES_SENSIVEIS.reduce((s, [re, sub]) => s.replace(re, sub), valor);
  }
  if (Array.isArray(valor)) return valor.map((v) => redigir(v, profundidade + 1));
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([k, v]) =>
        CHAVES_SENSIVEIS.test(k) ? [k, "[REDACTED]"] : [k, redigir(v, profundidade + 1)],
      ),
    );
  }
  return valor;
}

export type Nivel = "debug" | "info" | "warn" | "error";

export type Contexto = {
  projectId?: string;
  publicationId?: string;
  workerId?: string;
  event?: string;
  status?: string;
  durationMs?: number;
  error?: string;
  [k: string]: unknown;
};

function emitir(nivel: Nivel, mensagem: string, contexto: Contexto = {}) {
  const linha = { timestamp: new Date().toISOString(), nivel, mensagem, ...(redigir(contexto) as Contexto) };
  const saida = nivel === "error" || nivel === "warn" ? console.error : console.log;
  saida(JSON.stringify(linha));
}

export const logger = {
  debug: (m: string, c?: Contexto) => emitir("debug", m, c),
  info: (m: string, c?: Contexto) => emitir("info", m, c),
  warn: (m: string, c?: Contexto) => emitir("warn", m, c),
  error: (m: string, c?: Contexto) => emitir("error", m, c),
  /** Logger com contexto fixo — usado pelo worker pra carregar workerId em tudo. */
  com(base: Contexto) {
    return {
      debug: (m: string, c?: Contexto) => emitir("debug", m, { ...base, ...c }),
      info: (m: string, c?: Contexto) => emitir("info", m, { ...base, ...c }),
      warn: (m: string, c?: Contexto) => emitir("warn", m, { ...base, ...c }),
      error: (m: string, c?: Contexto) => emitir("error", m, { ...base, ...c }),
    };
  },
};
