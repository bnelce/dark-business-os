import { describe, it, expect } from "vitest";
import { planejarRetry, MINUTO } from "../src/queue/retry";
import { classificarErro, GraphApiError, PermanentError, TransientError } from "../src/domain/errors";

const agora = new Date("2026-09-05T12:00:00Z");
// Sem jitter, o cálculo do atraso fica verificável.
const semJitter = () => 0.5;

const plano = (attempts: number, erro: unknown, maxAttempts = 3) =>
  planejarRetry({ attempts, maxAttempts, classificacao: classificarErro(erro), agora, aleatorio: semJitter });

const atrasoMin = (p: { nextAttemptAt: Date | null }) =>
  p.nextAttemptAt ? (p.nextAttemptAt.getTime() - agora.getTime()) / MINUTO : null;

describe("erro permanente", () => {
  it("vai direto pra FAILED, sem nova tentativa", () => {
    const p = plano(1, new PermanentError("token inválido"));
    expect(p.status).toBe("FAILED");
    expect(p.nextAttemptAt).toBeNull();
    expect(p.motivo).toMatch(/permanente/i);
  });

  it("não retenta nem na primeira tentativa — repetir não muda o resultado", () => {
    expect(plano(0, new GraphApiError({ message: "Invalid OAuth", code: 190 }, "media", 400)).status).toBe("FAILED");
  });
});

describe("erro transitório", () => {
  it("agenda retry enquanto houver tentativa sobrando", () => {
    const p = plano(1, new TransientError("timeout"));
    expect(p.status).toBe("RETRYING");
    expect(p.nextAttemptAt).toBeInstanceOf(Date);
  });

  it("espera mais a cada tentativa (backoff exponencial)", () => {
    const a = atrasoMin(plano(1, new TransientError("x")))!;
    const b = atrasoMin(plano(2, new TransientError("x")))!;
    expect(b).toBeGreaterThan(a);
  });

  it("desiste ao esgotar o teto de tentativas", () => {
    const p = plano(3, new TransientError("timeout"));
    expect(p.status).toBe("FAILED");
    expect(p.nextAttemptAt).toBeNull();
    expect(p.motivo).toMatch(/3 de 3|tentativas/i);
  });

  it("respeita um teto customizado", () => {
    expect(plano(3, new TransientError("x"), 5).status).toBe("RETRYING");
    expect(plano(5, new TransientError("x"), 5).status).toBe("FAILED");
  });
});

describe("rate limit", () => {
  const rateLimit = new GraphApiError({ message: "Application request limit reached", code: 4 }, "media_publish", 400);

  it("espera muito mais que um transitório comum", () => {
    const comum = atrasoMin(plano(1, new TransientError("timeout")))!;
    const limitado = atrasoMin(plano(1, rateLimit))!;
    expect(limitado).toBeGreaterThan(comum * 5);
  });

  // Em 2026-09-05 a mesma publicação foi retentada 8x em 4h contra um rate limit
  // que não tinha passado. A primeira espera precisa ser longa o bastante.
  it("espera pelo menos 30 minutos na primeira vez", () => {
    expect(atrasoMin(plano(1, rateLimit))!).toBeGreaterThanOrEqual(30);
  });

  it("não passa do teto de 4 horas", () => {
    for (let n = 1; n <= 10; n++) {
      const p = planejarRetry({
        attempts: n, maxAttempts: 20, classificacao: classificarErro(rateLimit), agora, aleatorio: () => 1,
      });
      if (p.nextAttemptAt) expect(atrasoMin(p)!).toBeLessThanOrEqual(240);
    }
  });
});

describe("jitter", () => {
  it("espalha o horário do retry em vez de sincronizar tudo no mesmo minuto", () => {
    const cedo = planejarRetry({ attempts: 1, maxAttempts: 3, classificacao: classificarErro(new TransientError("x")), agora, aleatorio: () => 0 });
    const tarde = planejarRetry({ attempts: 1, maxAttempts: 3, classificacao: classificarErro(new TransientError("x")), agora, aleatorio: () => 1 });
    expect(tarde.nextAttemptAt!.getTime()).toBeGreaterThan(cedo.nextAttemptAt!.getTime());
  });

  it("nunca agenda retry no passado", () => {
    for (const r of [0, 0.5, 1]) {
      const p = planejarRetry({ attempts: 1, maxAttempts: 3, classificacao: classificarErro(new TransientError("x")), agora, aleatorio: () => r });
      expect(p.nextAttemptAt!.getTime()).toBeGreaterThan(agora.getTime());
    }
  });
});
