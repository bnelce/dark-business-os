import { describe, it, expect } from "vitest";
import { config } from "../src/middleware";

/**
 * Regressão do bug encontrado no deploy on-prem: sob basePath, a rota raiz
 * ("/publicador" sem barra final) não casava com o matcher de rota única e o
 * dashboard abria sem sessão.
 */
describe("matcher do middleware", () => {
  it("cobre a raiz explicitamente", () => {
    expect(config.matcher).toContain("/");
  });

  it("mantém o padrão amplo, que protege rota nova por omissão", () => {
    expect(config.matcher.some((m) => m.includes("(?!_next/static"))).toBe(true);
  });
});
