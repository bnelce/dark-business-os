/**
 * Acesso tipado ao ambiente. Leitura preguiçosa: o dashboard não deve quebrar
 * na inicialização por falta de uma variável que só o worker usa.
 */

function ler(nome: string): string | undefined {
  const v = process.env[nome];
  return v === undefined || v === "" ? undefined : v;
}

export function obrigatorio(nome: string): string {
  const v = ler(nome);
  if (!v) throw new Error(`Variável de ambiente faltando: ${nome}`);
  return v;
}

export function opcional(nome: string, padrao?: string): string | undefined {
  return ler(nome) ?? padrao;
}

export function numero(nome: string, padrao: number): number {
  const v = ler(nome);
  if (!v) return padrao;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${nome} não é um número: ${v}`);
  return n;
}

export function booleano(nome: string, padrao: boolean): boolean {
  const v = ler(nome)?.toLowerCase();
  if (v === undefined) return padrao;
  return v === "true" || v === "1" || v === "yes";
}

export const config = {
  /** Enquanto true, nenhum publisher real é acionado. Padrão seguro: ligado. */
  get dryRun() { return booleano("PUBLISHING_DRY_RUN", true); },
  get pollIntervalMs() { return numero("WORKER_POLL_INTERVAL_MS", 30_000); },
  get heartbeatIntervalMs() { return numero("WORKER_HEARTBEAT_INTERVAL_MS", 15_000); },
  get workerOfflineAfterMs() { return numero("WORKER_OFFLINE_AFTER_MS", 60_000); },
  get lockTimeoutMs() { return numero("LOCK_TIMEOUT_MS", 900_000); },
  get legacyContentRoot() { return opcional("LEGACY_CONTENT_ROOT", "../marketing/conteudo")!; },
  get timezone() { return opcional("TZ_DISPLAY", "America/Fortaleza")!; },
};
