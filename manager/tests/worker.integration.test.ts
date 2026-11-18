import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, limparBanco, projetoDeTeste, publicacaoDeTeste } from "./helpers/db";
import { reivindicarProxima } from "../src/queue/claim";
import { aprovar, agendar } from "../src/queue/transitions";
import { executarPublicacao, type DependenciasDoWorker } from "../src/worker/executar";
import { recuperarPresas } from "../src/worker/recuperacao";
import { baterHeartbeat, saudeDoWorker } from "../src/worker/heartbeat";
import { MinioStorageProvider } from "../src/storage/minio";
import { chaveDeMidia } from "../src/storage/keys";
import { GraphClient } from "../src/publishers/instagram/client";
import { cifrar } from "../src/lib/crypto";
import { GraphApiError, PermanentError, TransientError } from "../src/domain/errors";
import type { Publisher, ResultadoDePublicacao } from "../src/publishers/types";

const storage = new MinioStorageProvider();

/** Publisher de teste: registra o que recebeu e devolve o que o teste mandar. */
function publisherFalso(comportamento: (n: number) => Promise<ResultadoDePublicacao>) {
  const chamadas: Array<{ urls: string[]; legenda: string }> = [];
  const publisher: Publisher = {
    canal: "INSTAGRAM",
    tiposSuportados: ["IMAGE", "CAROUSEL", "REEL"],
    async publicar(entrada, ganchos) {
      chamadas.push({ urls: entrada.midias.map((m) => m.url), legenda: entrada.publicacao.caption });
      await ganchos.aoPedirPublicacao(`container-${chamadas.length}`);
      return comportamento(chamadas.length);
    },
  };
  return { publisher, chamadas };
}

function deps(publisher: Publisher): DependenciasDoWorker {
  return {
    prisma,
    storage,
    publicUrl: { nome: "falso", urlPublica: async (k) => `https://cdn.teste/${k}` },
    publisherPara: () => publisher,
    workerId: "worker-teste",
  };
}

async function comMidias(projectId: string, publicationId: string, quantidade = 6) {
  for (let i = 1; i <= quantidade; i++) {
    const objectKey = chaveDeMidia(projectId, publicationId, i, `slide-0${i}.png`);
    await storage.upload(objectKey, Buffer.from(`slide ${i}`), { mimeType: "image/png" });
    await prisma.media.create({
      data: { publicationId, position: i, objectKey, mimeType: "image/png", size: 8 },
    });
  }
}

let projectId: string;
beforeEach(async () => {
  await limparBanco();
  projectId = (await projetoDeTeste()).id;
  await prisma.channelConfig.deleteMany({ where: { projectId } });
  await prisma.channelConfig.create({
    data: {
      projectId, channel: "INSTAGRAM", handle: "@teste",
      credentials: cifrar(JSON.stringify({ accessToken: "token-teste", accountId: "1784000" })),
    },
  });
});
afterAll(async () => { await limparBanco(); await prisma.$disconnect(); });

describe("fluxo completo: rascunho até publicado", () => {
  it("aprova, agenda, worker pega, publica e grava tudo", async () => {
    const p = await publicacaoDeTeste(projectId, { status: "DRAFT", scheduledAt: null, title: "Mitose" });
    await comMidias(projectId, p.id);

    await aprovar(prisma, p.id);
    await agendar(prisma, p.id, new Date(Date.now() - 1000));

    const { publisher, chamadas } = publisherFalso(async () => ({
      externalId: "17999", externalUrl: "https://www.instagram.com/p/Abc/", reconciliada: false,
    }));

    const pego = await reivindicarProxima(prisma, "worker-teste");
    const resultado = await executarPublicacao(deps(publisher), pego!);

    expect(resultado.status).toBe("PUBLISHED");
    const final = await prisma.publication.findUnique({ where: { id: p.id } });
    expect(final!.status).toBe("PUBLISHED");
    expect(final!.externalId).toBe("17999");
    expect(final!.publishedAt).toBeInstanceOf(Date);
    expect(final!.lockedBy).toBeNull();

    // As 6 mídias chegaram ao publisher, na ordem, com URL pública.
    expect(chamadas[0].urls).toHaveLength(6);
    expect(chamadas[0].urls[0]).toContain("01-slide-01.png");
    expect(chamadas[0].urls.every((u) => u.startsWith("https://"))).toBe(true);

    const tipos = (await prisma.publicationEvent.findMany({
      where: { publicationId: p.id }, orderBy: { createdAt: "asc" },
    })).map((e) => e.type);
    expect(tipos).toEqual(expect.arrayContaining(["APPROVED", "SCHEDULED", "PUBLISHING_STARTED", "PUBLISHED"]));
  });

  it("grava o container antes do publish, pra recuperação saber reconciliar", async () => {
    const p = await publicacaoDeTeste(projectId);
    await comMidias(projectId, p.id, 2);
    let durante: { remoteContainerId: string | null; publishRequestedAt: Date | null } | null = null;

    const publisher: Publisher = {
      canal: "INSTAGRAM", tiposSuportados: ["CAROUSEL"],
      async publicar(_e, ganchos) {
        await ganchos.aoPedirPublicacao("container-xyz");
        durante = await prisma.publication.findUnique({
          where: { id: p.id }, select: { remoteContainerId: true, publishRequestedAt: true },
        });
        return { externalId: "1", externalUrl: null, reconciliada: false };
      },
    };

    const pego = await reivindicarProxima(prisma, "w1");
    await executarPublicacao(deps(publisher), pego!);
    expect(durante!.remoteContainerId).toBe("container-xyz");
    expect(durante!.publishRequestedAt).toBeInstanceOf(Date);
  });
});

describe("falha e recuperação", () => {
  it("falha transitória vira RETRYING e a segunda tentativa publica", async () => {
    const p = await publicacaoDeTeste(projectId);
    await comMidias(projectId, p.id, 2);

    const { publisher, chamadas } = publisherFalso(async (n) => {
      if (n === 1) throw new TransientError("timeout na plataforma");
      return { externalId: "17999", externalUrl: "https://x/p", reconciliada: false };
    });

    await executarPublicacao(deps(publisher), (await reivindicarProxima(prisma, "w1"))!);
    let estado = await prisma.publication.findUnique({ where: { id: p.id } });
    expect(estado!.status).toBe("RETRYING");
    expect(estado!.lastErrorKind).toBe("TRANSIENT");

    // Antecipa o backoff pra exercitar a segunda tentativa.
    await prisma.publication.update({ where: { id: p.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
    await executarPublicacao(deps(publisher), (await reivindicarProxima(prisma, "w1"))!);

    estado = await prisma.publication.findUnique({ where: { id: p.id } });
    expect(estado!.status).toBe("PUBLISHED");
    expect(estado!.attempts).toBe(2);
    expect(chamadas).toHaveLength(2);
  });

  it("publicação sem mídia falha de forma permanente, sem queimar retry", async () => {
    const p = await publicacaoDeTeste(projectId);
    const { publisher } = publisherFalso(async () => ({ externalId: "x", externalUrl: null, reconciliada: false }));
    await executarPublicacao(deps(publisher), (await reivindicarProxima(prisma, "w1"))!);
    const estado = await prisma.publication.findUnique({ where: { id: p.id } });
    expect(estado!.status).toBe("FAILED");
    expect(estado!.lastError).toMatch(/sem nenhuma mídia/);
  });

  it("canal desativado é erro permanente, não fica retentando", async () => {
    await prisma.channelConfig.updateMany({ where: { projectId }, data: { isActive: false } });
    const p = await publicacaoDeTeste(projectId);
    await comMidias(projectId, p.id, 2);
    const { publisher } = publisherFalso(async () => ({ externalId: "x", externalUrl: null, reconciliada: false }));
    await executarPublicacao(deps(publisher), (await reivindicarProxima(prisma, "w1"))!);
    const estado = await prisma.publication.findUnique({ where: { id: p.id } });
    expect(estado!.status).toBe("FAILED");
    expect(estado!.lastErrorKind).toBe("PERMANENT");
  });
});

describe("recuperação de publicação presa", () => {
  const graphComMidias = (data: any[]) => {
    const c = new GraphClient();
    (c as any).get = async () => ({ data });
    return c;
  };

  it("presa antes do publish volta pra fila", async () => {
    const p = await publicacaoDeTeste(projectId, {
      status: "PUBLISHING", lockedAt: new Date(Date.now() - 3_600_000), lockedBy: "w-morto", publishRequestedAt: null,
    });
    const r = await recuperarPresas(prisma, 900_000, graphComMidias([]));
    expect(r[0].desfecho).toBe("devolvida");
    expect((await prisma.publication.findUnique({ where: { id: p.id } }))!.status).toBe("RETRYING");
  });

  // O cenário mais perigoso: processo morreu depois de publicar.
  it("presa depois do publish, com post na plataforma, é adotada — nunca republicada", async () => {
    const legenda = "COMO UMA CÉLULA VIRA DUAS IGUAIS??";
    const p = await publicacaoDeTeste(projectId, {
      status: "PUBLISHING", caption: legenda,
      lockedAt: new Date(Date.now() - 3_600_000), lockedBy: "w-morto",
      publishRequestedAt: new Date(Date.now() - 3_500_000),
    });
    const cliente = graphComMidias([
      { id: "17888", caption: legenda, timestamp: new Date(Date.now() - 3_400_000).toISOString(), permalink: "https://www.instagram.com/p/Dc5dcpiG_Ey/" },
    ]);

    const r = await recuperarPresas(prisma, 900_000, cliente);
    expect(r[0].desfecho).toBe("publicada");
    const final = await prisma.publication.findUnique({ where: { id: p.id } });
    expect(final!.status).toBe("PUBLISHED");
    expect(final!.externalId).toBe("17888");
    expect(final!.externalUrl).toBe("https://www.instagram.com/p/Dc5dcpiG_Ey/");
  });

  it("presa depois do publish, sem post na plataforma, volta pra fila", async () => {
    const p = await publicacaoDeTeste(projectId, {
      status: "PUBLISHING", lockedAt: new Date(Date.now() - 3_600_000), lockedBy: "w-morto",
      publishRequestedAt: new Date(Date.now() - 3_500_000),
    });
    const r = await recuperarPresas(prisma, 900_000, graphComMidias([]));
    expect(r[0].desfecho).toBe("devolvida");
    const final = await prisma.publication.findUnique({ where: { id: p.id } });
    expect(final!.status).toBe("RETRYING");
    expect(final!.remoteContainerId).toBeNull();
  });

  // Consulta que falhou não é prova de que nada foi publicado.
  it("se a plataforma não responde, a presa NÃO volta pra fila", async () => {
    const p = await publicacaoDeTeste(projectId, {
      status: "PUBLISHING", lockedAt: new Date(Date.now() - 3_600_000), lockedBy: "w-morto",
      publishRequestedAt: new Date(Date.now() - 3_500_000),
    });
    const cliente = new GraphClient();
    (cliente as any).get = async () => { throw new GraphApiError({ message: "Service unavailable" }, "media", 503); };

    const r = await recuperarPresas(prisma, 900_000, cliente);
    expect(r[0].desfecho).toBe("mantida");
    expect((await prisma.publication.findUnique({ where: { id: p.id } }))!.status).toBe("PUBLISHING");
  });
});

describe("heartbeat", () => {
  it("sem worker registrado, o dashboard mostra offline", async () => {
    expect((await saudeDoWorker(prisma, 60_000)).online).toBe(false);
  });

  it("batida recente é online, batida velha é offline", async () => {
    await baterHeartbeat(prisma, "w1");
    expect((await saudeDoWorker(prisma, 60_000)).online).toBe(true);
    const futuro = new Date(Date.now() + 120_000);
    expect((await saudeDoWorker(prisma, 60_000, futuro)).online).toBe(false);
  });
});
