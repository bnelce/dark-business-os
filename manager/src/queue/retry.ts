import type { Classificacao } from "../domain/errors";
import { ErrorKind } from "../domain/errors";

export const MINUTO = 60_000;

/**
 * Espera base por tentativa. Dois regimes separados porque os erros são
 * diferentes: um timeout de rede passa em minutos; um rate limit da Meta é
 * uma janela de contagem que só reabre depois de bastante tempo.
 *
 * O caso do rate limit é o que motivou o número alto: em 2026-09-05 a mesma
 * publicação foi retentada de 30 em 30 minutos por 4 horas contra uma janela
 * que não tinha reaberto, queimando cota e enchendo o log.
 */
const BASE_TRANSITORIO = 2 * MINUTO;
const BASE_RATE_LIMIT = 30 * MINUTO;
const FATOR = 3;
const TETO = 4 * 60 * MINUTO;
/** Amplitude do jitter, em fração do atraso calculado. */
const JITTER = 0.2;

export type PlanoDeRetry = {
  status: "RETRYING" | "FAILED";
  nextAttemptAt: Date | null;
  motivo: string;
};

export function atrasoDeRetry(
  tentativa: number,
  rateLimited: boolean,
  aleatorio: () => number = Math.random,
): number {
  const base = rateLimited ? BASE_RATE_LIMIT : BASE_TRANSITORIO;
  const bruto = Math.min(base * FATOR ** Math.max(0, tentativa - 1), TETO);
  // Jitter só pra cima do piso: retry nunca pode cair antes do backoff mínimo.
  const comJitter = bruto * (1 - JITTER + 2 * JITTER * aleatorio());
  return Math.min(Math.round(comJitter), TETO);
}

export function planejarRetry(entrada: {
  attempts: number;
  maxAttempts: number;
  classificacao: Classificacao;
  agora?: Date;
  aleatorio?: () => number;
}): PlanoDeRetry {
  const { attempts, maxAttempts, classificacao } = entrada;
  const agora = entrada.agora ?? new Date();

  if (classificacao.kind === ErrorKind.PERMANENT) {
    return {
      status: "FAILED",
      nextAttemptAt: null,
      motivo: "Erro permanente — retry repetiria o mesmo resultado. Corrija a causa e reagende à mão.",
    };
  }

  if (attempts >= maxAttempts) {
    return {
      status: "FAILED",
      nextAttemptAt: null,
      motivo: `Esgotou as tentativas (${attempts} de ${maxAttempts}).`,
    };
  }

  const atraso = atrasoDeRetry(attempts, classificacao.rateLimited, entrada.aleatorio);
  return {
    status: "RETRYING",
    nextAttemptAt: new Date(agora.getTime() + atraso),
    motivo: `${classificacao.rateLimited ? "Rate limit" : "Erro transitório"} — nova tentativa em ${Math.round(atraso / MINUTO)} min (${attempts + 1} de ${maxAttempts}).`,
  };
}
