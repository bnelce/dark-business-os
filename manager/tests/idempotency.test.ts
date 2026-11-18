import { describe, it, expect, vi } from "vitest";
import { InstagramPublisher } from "../src/publishers/instagram";
import { GraphClient } from "../src/publishers/instagram/client";
import { reconciliar } from "../src/publishers/instagram/reconcile";
import { GraphApiError } from "../src/domain/errors";
import type { EntradaDePublicacao, GanchosDePublicacao } from "../src/publishers/types";

/**
 * O arquivo mais importante do projeto: o bug de 2026-09-05 virado teste.
 * O media_publish respondeu erro numa chamada que a plataforma processou;
 * o sistema leu como falha e republicou.
 */

const LEGENDA = "QUAL SER VIVO NÃO TEM NÚCLEO??\n\nArrastei aqui um resumo rápido.";

function entrada(overrides: Partial<EntradaDePublicacao["publicacao"]> = {}): EntradaDePublicacao {
  return {
    publicacao: {
      id: "pub1", projectId: "proj1", type: "CAROUSEL", caption: LEGENDA, media: [],
      ...overrides,
    } as any,
    midias: [
      { url: "https://cdn.exemplo/1.png", mimeType: "image/png", posicao: 1 },
      { url: "https://cdn.exemplo/2.png", mimeType: "image/png", posicao: 2 },
    ],
    credenciais: { accessToken: "token", accountId: "17841000" },
  };
}

function ganchosFalsos() {
  const eventos: Array<{ tipo: string; mensagem: string }> = [];
  const pedidos: string[] = [];
  const ganchos: GanchosDePublicacao = {
    aoPedirPublicacao: async (id) => { pedidos.push(id); },
    aoEvento: async (tipo, mensagem) => { eventos.push({ tipo, mensagem }); },
  };
  return { ganchos, eventos, pedidos };
}

/** Graph API falsa, roteada por caminho, contando chamadas. */
function graphFalso(rotas: Record<string, (params: any) => any>) {
  const chamadas: Array<{ metodo: string; caminho: string }> = [];
  const resolver = (caminho: string, params: any) => {
    for (const [padrao, fn] of Object.entries(rotas)) {
      if (caminho.includes(padrao)) return fn(params);
    }
    throw new Error(`rota não mapeada no teste: ${caminho}`);
  };
  const cliente = new GraphClient();
  (cliente as any).post = async (caminho: string, params: any) => {
    chamadas.push({ metodo: "POST", caminho });
    return resolver(caminho, params);
  };
  (cliente as any).get = async (caminho: string, params: any) => {
    chamadas.push({ metodo: "GET", caminho });
    return resolver(caminho, params);
  };
  (cliente as any).esperarContainer = async () => {};
  (cliente as any).usoDaCota = async () => 5;
  return { cliente, chamadas };
}

describe("REGRA DE OURO: publicado é publicado", () => {
  it("permalink falha depois do publish → PUBLISHED com url nula, sem republicar", async () => {
    const { cliente, chamadas } = graphFalso({
      "/media_publish": () => ({ id: "17999" }),
      "/media": () => ({ id: "container1" }),
      "17999": () => { throw new GraphApiError({ message: "Application request limit reached", code: 4 }, "17999", 400); },
    });

    const { ganchos } = ganchosFalsos();
    const r = await new InstagramPublisher(cliente).publicar(entrada(), ganchos);

    expect(r.externalId).toBe("17999");
    expect(r.externalUrl).toBeNull();
    expect(chamadas.filter((c) => c.caminho.includes("media_publish"))).toHaveLength(1);
  });

  // O caso exato do log de 2026-09-05.
  it("media_publish responde rate limit MAS publicou → adota o post existente", async () => {
    const publicadoEm = new Date().toISOString();
    const { cliente, chamadas } = graphFalso({
      "/media_publish": () => { throw new GraphApiError({ message: "Application request limit reached", code: 4 }, "media_publish", 400); },
      "/media?": () => ({}),
      "/media": (params: any) =>
        params.fields?.includes("caption")
          ? { data: [{ id: "17888", caption: LEGENDA, timestamp: publicadoEm, permalink: "https://www.instagram.com/p/Dc5dyQyG5jN/" }] }
          : { id: "container1" },
    });

    const { ganchos, eventos } = ganchosFalsos();
    const r = await new InstagramPublisher(cliente).publicar(entrada(), ganchos);

    expect(r.externalId).toBe("17888");
    expect(r.externalUrl).toBe("https://www.instagram.com/p/Dc5dyQyG5jN/");
    expect(r.reconciliada).toBe(true);
    // Um único publish. É este número que impede o post duplicado.
    expect(chamadas.filter((c) => c.caminho.includes("media_publish"))).toHaveLength(1);
    expect(eventos.map((e) => e.tipo)).toContain("RECONCILED");
  });

  it("media_publish falha e NÃO publicou → o erro sobe pra virar retry", async () => {
    const { cliente } = graphFalso({
      "/media_publish": () => { throw new GraphApiError({ message: "Application request limit reached", code: 4 }, "media_publish", 400); },
      "/media": (params: any) => (params.fields?.includes("caption") ? { data: [] } : { id: "container1" }),
    });
    const { ganchos } = ganchosFalsos();
    await expect(new InstagramPublisher(cliente).publicar(entrada(), ganchos))
      .rejects.toThrow(/Application request limit reached/);
  });

  it("se a própria reconciliação falhar, o erro original é preservado", async () => {
    const { cliente } = graphFalso({
      "/media_publish": () => { throw new GraphApiError({ message: "erro original do publish", code: 4 }, "media_publish", 400); },
      "/media": (params: any) => {
        if (params.fields?.includes("caption")) throw new GraphApiError({ message: "consulta também falhou" }, "media", 500);
        return { id: "container1" };
      },
    });
    const { ganchos } = ganchosFalsos();
    await expect(new InstagramPublisher(cliente).publicar(entrada(), ganchos))
      .rejects.toThrow(/erro original do publish/);
  });
});

describe("gancho de pedido de publicação", () => {
  it("grava o container ANTES do publish sair", async () => {
    const ordem: string[] = [];
    const { cliente } = graphFalso({
      "/media_publish": () => { ordem.push("publish"); return { id: "17999" }; },
      "/media": () => ({ id: "container1" }),
      "17999": () => ({ permalink: "https://x/p" }),
    });
    const ganchos: GanchosDePublicacao = {
      aoPedirPublicacao: async () => { ordem.push("gravou-container"); },
      aoEvento: async () => {},
    };
    await new InstagramPublisher(cliente).publicar(entrada(), ganchos);
    expect(ordem).toEqual(["gravou-container", "publish"]);
  });
});

describe("reconciliar", () => {
  const cliente = (data: any[]) => {
    const c = new GraphClient();
    (c as any).get = async () => ({ data });
    return c;
  };
  const base = { accountId: "1784", accessToken: "t", pedidoEm: new Date("2026-09-05T12:00:00Z"), legenda: LEGENDA };

  it("casa por legenda normalizada, ignorando espaço e caixa", async () => {
    const c = cliente([{ id: "1", caption: "qual ser vivo   não tem núcleo??  Arrastei aqui um resumo rápido.", timestamp: "2026-09-05T12:00:30+0000" }]);
    expect((await reconciliar(c, base))?.externalId).toBe("1");
  });

  it("ignora post antigo com a mesma legenda — republicação de tema não pode ser adotada", async () => {
    const c = cliente([{ id: "antigo", caption: LEGENDA, timestamp: "2026-08-01T10:00:00+0000" }]);
    expect(await reconciliar(c, base)).toBeNull();
  });

  it("ignora post novo com legenda diferente", async () => {
    const c = cliente([{ id: "outro", caption: "outra coisa qualquer", timestamp: "2026-09-05T12:00:30+0000" }]);
    expect(await reconciliar(c, base)).toBeNull();
  });

  it("tolera folga de relógio entre a máquina e a Meta", async () => {
    const c = cliente([{ id: "1", caption: LEGENDA, timestamp: "2026-09-05T11:58:00+0000" }]);
    expect((await reconciliar(c, base))?.externalId).toBe("1");
  });

  it("ignora entrada sem timestamp legível", async () => {
    const c = cliente([{ id: "1", caption: LEGENDA, timestamp: "data-invalida" }, { id: "2", caption: LEGENDA }]);
    expect(await reconciliar(c, base)).toBeNull();
  });

  it("devolve null quando a conta não tem mídia nenhuma", async () => {
    expect(await reconciliar(cliente([]), base)).toBeNull();
  });

  it("devolve permalink quando a plataforma manda", async () => {
    const c = cliente([{ id: "1", caption: LEGENDA, timestamp: "2026-09-05T12:00:30+0000", permalink: "https://www.instagram.com/p/X/" }]);
    expect((await reconciliar(c, base))?.externalUrl).toBe("https://www.instagram.com/p/X/");
  });
});

describe("validações que evitam publish inútil", () => {
  const publisher = () => new InstagramPublisher(graphFalso({ "/media": () => ({ id: "c" }) }).cliente);

  it("recusa carrossel com uma mídia só", async () => {
    const e = entrada(); e.midias = [e.midias[0]];
    await expect(publisher().publicar(e, ganchosFalsos().ganchos)).rejects.toThrow(/ao menos 2/);
  });

  it("recusa carrossel com mais de 10 mídias", async () => {
    const e = entrada();
    e.midias = Array.from({ length: 11 }, (_, i) => ({ url: `https://x/${i}.png`, mimeType: "image/png", posicao: i + 1 }));
    await expect(publisher().publicar(e, ganchosFalsos().ganchos)).rejects.toThrow(/no máximo 10/);
  });

  it("recusa tipo ainda não implementado, em vez de fingir suporte", async () => {
    const e = entrada({ type: "STORY" } as any);
    await expect(publisher().publicar(e, ganchosFalsos().ganchos)).rejects.toThrow(/STORY.*não implementado/);
  });

  it("trata cota esgotada como rate limit, não como falha de mídia", async () => {
    const { cliente } = graphFalso({ "/media": () => ({ id: "c" }) });
    (cliente as any).usoDaCota = async () => 100;
    await expect(new InstagramPublisher(cliente).publicar(entrada(), ganchosFalsos().ganchos))
      .rejects.toMatchObject({ body: { code: 4 } });
  });
});

describe("dry-run", () => {
  it("valida tudo e não chama a plataforma", async () => {
    const { DryRunPublisher } = await import("../src/publishers/dry-run");
    const { cliente, chamadas } = graphFalso({});
    const p = new DryRunPublisher(new InstagramPublisher(cliente));
    const { ganchos, pedidos } = ganchosFalsos();
    const r = await p.publicar(entrada(), ganchos);
    expect(r.externalId).toContain("dryrun");
    // Sem URL falsa: a interface não pode oferecer um link que não abre post nenhum.
    expect(r.externalUrl).toBeNull();
    expect(chamadas).toHaveLength(0);
    expect(pedidos).toHaveLength(1);
  });

  it("reprova mídia sem URL pública https — a plataforma não conseguiria baixar", async () => {
    const { DryRunPublisher } = await import("../src/publishers/dry-run");
    const p = new DryRunPublisher(new InstagramPublisher(graphFalso({}).cliente));
    const e = entrada();
    e.midias = [{ url: "http://localhost:9000/bucket/a.png", mimeType: "image/png", posicao: 1 },
                { url: "http://localhost:9000/bucket/b.png", mimeType: "image/png", posicao: 2 }];
    await expect(p.publicar(e, ganchosFalsos().ganchos)).rejects.toThrow(/URL pública https/);
  });

  it("reprova legenda vazia", async () => {
    const { DryRunPublisher } = await import("../src/publishers/dry-run");
    const p = new DryRunPublisher(new InstagramPublisher(graphFalso({}).cliente));
    await expect(p.publicar(entrada({ caption: "  " } as any), ganchosFalsos().ganchos)).rejects.toThrow(/legenda vazia/);
  });
});
