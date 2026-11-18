import { describe, expect, test } from "vitest";
import { fase, lerCanal, lerRede, slugify } from "../src/rede/importar-canais";

describe("importar canais", () => {
  test("lê a tabela da rede, com e sem slug", () => {
    const md = "| Canal | Slug | Nicho | Fase | Criado |\n|---|---|---|---|---|\n| Margin Notes | margin-notes | Economia | Piloto | 2026 |\n| Rise & Ruin | — | Empresas | Planejado (fase 2) | — |";
    expect(lerRede(md)).toEqual([
      { nome: "Margin Notes", slug: "margin-notes", nicho: "Economia", fase: "Piloto" },
      { nome: "Rise & Ruin", slug: null, nicho: "Empresas", fase: "Planejado (fase 2)" },
    ]);
  });

  test("lê os bullets do canal.md", () => {
    expect(lerCanal("# X\n\n- **Nicho:** Economia\n- **Voz TTS:** _a definir_")).toEqual({ Nicho: "Economia", "Voz TTS": "_a definir_" });
  });

  test("fase e slug", () => {
    expect(fase("Piloto")).toBe("PILOTO");
    expect(fase("Planejado (fase 2)")).toBe("CANDIDATO");
    expect(slugify("Rise & Ruin")).toBe("rise-and-ruin");
  });
});
