import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, limparBanco, projetoDeTeste, publicacaoDeTeste } from "./helpers/db";
import { reivindicarProxima, contarElegiveis, locksExpirados, devolverParaFila, liberarLock } from "../src/queue/claim";

let projectId: string;

beforeEach(async () => {
  await limparBanco();
  projectId = (await projetoDeTeste()).id;
});
afterAll(async () => { await limparBanco(); await prisma.$disconnect(); });

describe("elegibilidade — só status e horário, nunca regra editorial", () => {
  it("pega uma SCHEDULED cujo horário já passou", async () => {
    const p = await publicacaoDeTeste(projectId, { scheduledAt: new Date(Date.now() - 60_000) });
    const pego = await reivindicarProxima(prisma, "w1");
    expect(pego?.id).toBe(p.id);
    expect(pego?.status).toBe("PUBLISHING");
  });

  it("não pega uma SCHEDULED com horário no futuro", async () => {
    await publicacaoDeTeste(projectId, { scheduledAt: new Date(Date.now() + 3_600_000) });
    expect(await reivindicarProxima(prisma, "w1")).toBeNull();
  });

  it("não pega DRAFT nem APPROVED — aprovar não é agendar", async () => {
    await publicacaoDeTeste(projectId, { status: "DRAFT", scheduledAt: null });
    await publicacaoDeTeste(projectId, { status: "APPROVED", scheduledAt: null });
    expect(await reivindicarProxima(prisma, "w1")).toBeNull();
  });

  it("não pega APPROVED mesmo com horário no passado — falta o ato de agendar", async () => {
    await publicacaoDeTeste(projectId, { status: "APPROVED", scheduledAt: new Date(Date.now() - 60_000) });
    expect(await reivindicarProxima(prisma, "w1")).toBeNull();
  });

  it("não pega CANCELLED, PUBLISHED nem FAILED", async () => {
    for (const status of ["CANCELLED", "PUBLISHED", "FAILED"] as const) {
      await publicacaoDeTeste(projectId, { status, scheduledAt: new Date(Date.now() - 60_000) });
    }
    expect(await reivindicarProxima(prisma, "w1")).toBeNull();
  });

  it("pega RETRYING cujo nextAttemptAt venceu, e ignora o que ainda não venceu", async () => {
    await publicacaoDeTeste(projectId, { status: "RETRYING", scheduledAt: null, nextAttemptAt: new Date(Date.now() + 600_000) });
    const pronta = await publicacaoDeTeste(projectId, { status: "RETRYING", scheduledAt: null, nextAttemptAt: new Date(Date.now() - 1000) });
    expect((await reivindicarProxima(prisma, "w1"))?.id).toBe(pronta.id);
    expect(await reivindicarProxima(prisma, "w1")).toBeNull();
  });

  it("atende na ordem do horário, não na ordem de criação", async () => {
    const tarde = await publicacaoDeTeste(projectId, { title: "tarde", scheduledAt: new Date(Date.now() - 1000) });
    const cedo = await publicacaoDeTeste(projectId, { title: "cedo", scheduledAt: new Date(Date.now() - 60_000) });
    expect((await reivindicarProxima(prisma, "w1"))?.id).toBe(cedo.id);
    expect((await reivindicarProxima(prisma, "w2"))?.id).toBe(tarde.id);
  });
});

describe("lock — dois workers nunca pegam o mesmo job", () => {
  it("com uma publicação e 8 workers simultâneos, exatamente um leva", async () => {
    await publicacaoDeTeste(projectId, { scheduledAt: new Date(Date.now() - 1000) });

    const resultados = await Promise.all(
      Array.from({ length: 8 }, (_, i) => reivindicarProxima(prisma, `worker-${i}`)),
    );

    const pegos = resultados.filter(Boolean);
    expect(pegos).toHaveLength(1);
    expect(pegos[0]!.lockedBy).toMatch(/^worker-\d$/);
  });

  it("com 5 publicações e 5 workers simultâneos, cada um leva uma diferente", async () => {
    for (let i = 0; i < 5; i++) {
      await publicacaoDeTeste(projectId, { title: `p${i}`, scheduledAt: new Date(Date.now() - (i + 1) * 1000) });
    }
    const resultados = await Promise.all(
      Array.from({ length: 5 }, (_, i) => reivindicarProxima(prisma, `worker-${i}`)),
    );
    const ids = resultados.filter(Boolean).map((p) => p!.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  it("grava quem travou e quando", async () => {
    await publicacaoDeTeste(projectId);
    const pego = await reivindicarProxima(prisma, "worker-abc");
    expect(pego!.lockedBy).toBe("worker-abc");
    expect(pego!.lockedAt).toBeInstanceOf(Date);
  });
});

describe("tentativas", () => {
  it("conta a tentativa na aquisição, não no resultado", async () => {
    await publicacaoDeTeste(projectId, { attempts: 0 });
    expect((await reivindicarProxima(prisma, "w1"))!.attempts).toBe(1);
  });

  it("um worker que morre no meio já gastou a tentativa", async () => {
    const p = await publicacaoDeTeste(projectId, { attempts: 0 });
    await reivindicarProxima(prisma, "w1");
    // Simula processo morto: o lock expira e a publicação volta pra fila.
    await prisma.publication.update({ where: { id: p.id }, data: { lockedAt: new Date(Date.now() - 3_600_000) } });
    const presas = await locksExpirados(prisma, 60_000);
    expect(presas.map((x) => x.id)).toContain(p.id);
    await devolverParaFila(prisma, p.id);
    expect((await reivindicarProxima(prisma, "w2"))!.attempts).toBe(2);
  });
});

describe("locks expirados", () => {
  it("não reporta lock dentro do prazo", async () => {
    await publicacaoDeTeste(projectId);
    await reivindicarProxima(prisma, "w1");
    expect(await locksExpirados(prisma, 900_000)).toHaveLength(0);
  });

  // A regra que impede o pior caso: presa depois de pedir publish pode ter
  // publicado do outro lado. Isso não volta pra fila sozinho.
  it("NÃO devolve pra fila quem já pediu publicação — precisa reconciliar", async () => {
    const p = await publicacaoDeTeste(projectId, {
      status: "PUBLISHING",
      lockedAt: new Date(Date.now() - 3_600_000),
      lockedBy: "w-morto",
      publishRequestedAt: new Date(Date.now() - 3_500_000),
    });
    expect((await locksExpirados(prisma, 900_000)).map((x) => x.id)).toContain(p.id);
    expect(await devolverParaFila(prisma, p.id)).toBe(false);
    expect((await prisma.publication.findUnique({ where: { id: p.id } }))!.status).toBe("PUBLISHING");
  });

  it("devolve pra fila quem morreu antes de pedir publicação", async () => {
    const p = await publicacaoDeTeste(projectId, {
      status: "PUBLISHING", lockedAt: new Date(Date.now() - 3_600_000), lockedBy: "w-morto", publishRequestedAt: null,
    });
    expect(await devolverParaFila(prisma, p.id)).toBe(true);
    const depois = await prisma.publication.findUnique({ where: { id: p.id } });
    expect(depois!.status).toBe("RETRYING");
    expect(depois!.lockedBy).toBeNull();
  });
});

describe("liberarLock", () => {
  it("só libera se o lock for do worker que pediu", async () => {
    await publicacaoDeTeste(projectId);
    const pego = await reivindicarProxima(prisma, "w1");
    await liberarLock(prisma, pego!.id, "outro-worker");
    expect((await prisma.publication.findUnique({ where: { id: pego!.id } }))!.lockedBy).toBe("w1");
    await liberarLock(prisma, pego!.id, "w1");
    expect((await prisma.publication.findUnique({ where: { id: pego!.id } }))!.lockedBy).toBeNull();
  });
});

describe("contarElegiveis", () => {
  it("conta só o que está pronto pra executar agora", async () => {
    await publicacaoDeTeste(projectId, { scheduledAt: new Date(Date.now() - 1000) });
    await publicacaoDeTeste(projectId, { scheduledAt: new Date(Date.now() + 600_000) });
    await publicacaoDeTeste(projectId, { status: "DRAFT", scheduledAt: null });
    expect(await contarElegiveis(prisma)).toBe(1);
  });
});
