import { describe, it, expect } from "vitest";
import {
  TransientError, PermanentError, GraphApiError,
  classificarErro, ErrorKind,
} from "../src/domain/errors";

const graph = (code: number, message = "erro", subcode?: number) =>
  new GraphApiError({ message, code, error_subcode: subcode }, "media_publish", 400);

describe("erros permanentes — retry não resolve, só repete", () => {
  it("token inválido (190)", () => {
    expect(classificarErro(graph(190, "Invalid OAuth access token")).kind).toBe(ErrorKind.PERMANENT);
  });
  it("permissão faltando (200)", () => {
    expect(classificarErro(graph(200, "Permissions error")).kind).toBe(ErrorKind.PERMANENT);
  });
  it("parâmetro inválido (100) — mídia ou formato que a plataforma recusou", () => {
    expect(classificarErro(graph(100, "Invalid parameter")).kind).toBe(ErrorKind.PERMANENT);
  });
  it("erro de mídia (2207026)", () => {
    expect(classificarErro(graph(2207026, "Video format not supported")).kind).toBe(ErrorKind.PERMANENT);
  });
  it("PermanentError explícito passa direto", () => {
    expect(classificarErro(new PermanentError("MP4 fora do padrão")).kind).toBe(ErrorKind.PERMANENT);
  });
});

describe("erros transitórios — vale tentar de novo", () => {
  it("serviço indisponível (2)", () => {
    expect(classificarErro(graph(2, "Service temporarily unavailable")).kind).toBe(ErrorKind.TRANSIENT);
  });
  it("HTTP 5xx sem código da Meta", () => {
    const e = new GraphApiError({ message: "Bad Gateway" }, "media", 502);
    expect(classificarErro(e).kind).toBe(ErrorKind.TRANSIENT);
  });
  it("erro de rede do fetch", () => {
    expect(classificarErro(new TypeError("fetch failed")).kind).toBe(ErrorKind.TRANSIENT);
  });
  it("timeout de socket", () => {
    const e = Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" });
    expect(classificarErro(e).kind).toBe(ErrorKind.TRANSIENT);
  });
});

describe("rate limit — transitório, mas com espera bem maior", () => {
  // Foi esse erro que derrubou 8 publicações seguidas em 2026-09-05.
  it.each([4, 17, 32, 613, 80004])("código %i é rate limit", (code) => {
    const c = classificarErro(graph(code, "Application request limit reached"));
    expect(c.kind).toBe(ErrorKind.TRANSIENT);
    expect(c.rateLimited).toBe(true);
  });

  it("reconhece pela mensagem quando o código não vem", () => {
    const c = classificarErro(new GraphApiError({ message: "Application request limit reached" }, "media_publish", 400));
    expect(c.rateLimited).toBe(true);
    expect(c.kind).toBe(ErrorKind.TRANSIENT);
  });

  it("um transitório comum não é marcado como rate limit", () => {
    expect(classificarErro(graph(2)).rateLimited).toBe(false);
  });
});

describe("desconhecido", () => {
  // Na dúvida, transitório: desistir cedo de algo recuperável custa uma publicação
  // perdida; o teto de tentativas impede o loop infinito de qualquer jeito.
  it("erro sem assinatura conhecida vira transitório", () => {
    expect(classificarErro(new Error("aconteceu algo estranho")).kind).toBe(ErrorKind.TRANSIENT);
  });
  it("TransientError explícito passa direto", () => {
    expect(classificarErro(new TransientError("container ainda processando")).kind).toBe(ErrorKind.TRANSIENT);
  });
});

describe("mensagem preservada", () => {
  it("guarda a mensagem original pra aparecer no dashboard", () => {
    expect(classificarErro(graph(190, "Invalid OAuth access token")).message)
      .toContain("Invalid OAuth access token");
  });
});
