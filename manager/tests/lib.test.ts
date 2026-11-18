import { describe, it, expect, beforeAll } from "vitest";
import { redigir } from "../src/lib/logger";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "a".repeat(64);
});

describe("redação de segredos no log", () => {
  it("mascara chaves sensíveis pelo nome", async () => {
    const saida = redigir({ access_token: "EAAsegredo", projectId: "p1" }) as Record<string, unknown>;
    expect(saida.access_token).toBe("[REDACTED]");
    expect(saida.projectId).toBe("p1");
  });

  it("mascara token da Meta no meio de uma URL", () => {
    const url = "https://graph.facebook.com/v21.0/123/media?access_token=EAAxyz123&fields=id";
    expect(redigir(url)).toBe("https://graph.facebook.com/v21.0/123/media?access_token=[REDACTED]&fields=id");
  });

  it("mascara token solto numa mensagem de erro", () => {
    const msg = "falhou usando EAAPQzabcdefghij1234567890xyz no header";
    expect(redigir(msg)).toContain("[REDACTED_META_TOKEN]");
    expect(redigir(msg)).not.toContain("EAAPQzabcdefghij");
  });

  it("desce em objetos aninhados e arrays", () => {
    const saida = redigir({ canais: [{ credentials: { token: "x" }, handle: "@rr" }] }) as any;
    expect(saida.canais[0].credentials).toBe("[REDACTED]");
    expect(saida.canais[0].handle).toBe("@rr");
  });
});

describe("cifra de credenciais", () => {
  it("cifra e decifra de volta", async () => {
    const { cifrar, decifrar } = await import("../src/lib/crypto");
    const segredo = JSON.stringify({ accessToken: "EAAtoken", accountId: "123" });
    const pacote = cifrar(segredo);
    expect(pacote).not.toContain("EAAtoken");
    expect(decifrar(pacote)).toBe(segredo);
  });

  it("gera texto cifrado diferente a cada vez (IV aleatório)", async () => {
    const { cifrar } = await import("../src/lib/crypto");
    expect(cifrar("mesmo texto")).not.toBe(cifrar("mesmo texto"));
  });

  it("recusa pacote adulterado", async () => {
    const { cifrar, decifrar } = await import("../src/lib/crypto");
    const pacote = cifrar("importante");
    const partes = pacote.split(".");
    partes[3] = Buffer.from("outracoisa").toString("base64url");
    expect(() => decifrar(partes.join("."))).toThrow();
  });
});

describe("conferência de senha", () => {
  it("aceita a senha certa e recusa a errada", async () => {
    const { senhaConfere } = await import("../src/lib/crypto");
    expect(senhaConfere("segredo", "segredo")).toBe(true);
    expect(senhaConfere("segred", "segredo")).toBe(false);
    expect(senhaConfere("", "segredo")).toBe(false);
  });
});

describe("impressão digital da legenda", () => {
  it("normaliza espaço e caixa pra sobreviver ao que a Meta devolve", async () => {
    const { impressaoDeLegenda } = await import("../src/lib/crypto");
    expect(impressaoDeLegenda("COMO UMA CÉLULA\n\nVIRA DUAS?")).toBe("como uma célula vira duas?");
  });
});
