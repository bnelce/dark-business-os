import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, limparBanco, projetoDeTeste, publicacaoDeTeste } from "./helpers/db";
import {
  aprovar, agendar, reagendar, desagendar, cancelar, reabrir, publicarAgora, retentar,
  registrarPublicado, registrarFalha, sincronizarMetadados,
  ConflitoDeEstadoError,
} from "../src/queue/transitions";
import { InvalidTransitionError } from "../src/domain/publication-state";
import { classificarErro, GraphApiError, PermanentError, TransientError } from "../src/domain/errors";
import { reivindicarProxima } from "../src/queue/claim";

let projectId: string;
beforeEach(async () => { await limparBanco(); projectId = (await projetoDeTeste()).id; });
afterAll(async () => { await limparBanco(); await prisma.$disconnect(); });

const eventos = (id: string) =>
  prisma.publicationEvent.findMany({ where: { publicationId: id }, orderBy: { createdAt: "asc" } });

describe("caminho do operador", () => {
  it("aprova, agenda e a publicação vira elegível", async () => {
    const p = await publicacaoDeTeste(projectId, { status: "DRAFT", scheduledAt: null });
    await aprovar(prisma, p.id);
    const quando = new Date(Date.now() - 1000);
    const agendada = await agendar(prisma, p.id, quando);
    expect(agendada.status).toBe("SCHEDULED");
    expect(agendada.scheduledAt?.getTime()).toBe(quando.getTime());
    expect((await reivindicarProxima(prisma, "w1"))?.id).toBe(p.id);
  });

  it("recusa agendar direto do rascunho", async () => {
    const p = await publicacaoDeTeste(projectId, { status: "DRAFT", scheduledAt: null });
    await expect(agendar(prisma, p.id, new Date())).rejects.toThrow(InvalidTransitionError);
  });

  it("reagenda sem sair de SCHEDULED e registra o de/para", async () => {
    const p = await publicacaoDeTeste(projectId, { scheduledAt: new Date("2026-09-10T12:00:00Z") });
    const novo = new Date("2026-09-11T20:00:00Z");
    const r = await reagendar(prisma, p.id, novo);
    expect(r.status).toBe("SCHEDULED");
    expect(r.scheduledAt?.toISOString()).toBe(novo.toISOString());
    const ev = (await eventos(p.id)).at(-1)!;
    expect(ev.type).toBe("RESCHEDULED");
    expect((ev.metadata as any).de).toBe("2026-09-10T12:00:00.000Z");
  });

  it("desagenda de volta pra aprovada e some da fila", async () => {
    const p = await publicacaoDeTeste(projectId, { scheduledAt: new Date(Date.now() - 1000) });
    const r = await desagendar(prisma, p.id);
    expect(r.status).toBe("APPROVED");
    expect(r.scheduledAt).toBeNull();
    expect(await reivindicarProxima(prisma, "w1")).toBeNull();
  });

  it("cancela e reabre como rascunho", async () => {
    const p = await publicacaoDeTeste(projectId);
    expect((await cancelar(prisma, p.id, "conteúdo desatualizado")).status).toBe("CANCELLED");
    const reaberta = await reabrir(prisma, p.id);
    expect(reaberta.status).toBe("DRAFT");
    expect(reaberta.attempts).toBe(0);
  });

  it("não cancela o que já está publicando", async () => {
    const p = await publicacaoDeTeste(projectId);
    await reivindicarProxima(prisma, "w1");
    await expect(cancelar(prisma, p.id)).rejects.toThrow(InvalidTransitionError);
  });
});

describe("publicar agora", () => {
  it("de SCHEDULED, só antecipa o horário — sem caminho paralelo de publicação", async () => {
    const p = await publicacaoDeTeste(projectId, { scheduledAt: new Date(Date.now() + 86_400_000) });
    const r = await publicarAgora(prisma, p.id);
    expect(r.status).toBe("SCHEDULED");
    expect(r.scheduledAt!.getTime()).toBeLessThanOrEqual(Date.now());
    expect((await reivindicarProxima(prisma, "w1"))?.id).toBe(p.id);
  });

  it("de APPROVED, agenda para agora", async () => {
    const p = await publicacaoDeTeste(projectId, { status: "APPROVED", scheduledAt: null });
    expect((await publicarAgora(prisma, p.id)).status).toBe("SCHEDULED");
  });

  it("de DRAFT, recusa — aprovar continua sendo obrigatório", async () => {
    const p = await publicacaoDeTeste(projectId, { status: "DRAFT", scheduledAt: null });
    await expect(publicarAgora(prisma, p.id)).rejects.toThrow(ConflitoDeEstadoError);
  });
});

describe("resultado da publicação", () => {
  it("PUBLISHING → PUBLISHED grava external id, url e libera o lock", async () => {
    const p = await publicacaoDeTeste(projectId);
    await reivindicarProxima(prisma, "w1");
    const r = await registrarPublicado(prisma, p.id, {
      externalId: "17900000", externalUrl: "https://www.instagram.com/p/Abc/",
    });
    expect(r.status).toBe("PUBLISHED");
    expect(r.externalId).toBe("17900000");
    expect(r.metadataSyncedAt).toBeInstanceOf(Date);
    expect(r.lockedBy).toBeNull();
    expect(r.publishedAt).toBeInstanceOf(Date);
  });

  // O bug de 2026-09-05, virado teste.
  it("publicada sem permalink continua PUBLISHED e NÃO volta pra fila", async () => {
    const p = await publicacaoDeTeste(projectId);
    await reivindicarProxima(prisma, "w1");
    const r = await registrarPublicado(prisma, p.id, { externalId: "17900001", externalUrl: null });

    expect(r.status).toBe("PUBLISHED");
    expect(r.externalId).toBe("17900001");
    expect(r.externalUrl).toBeNull();
    expect(r.metadataSyncedAt).toBeNull();
    expect(r.nextAttemptAt).toBeNull();
    expect(await reivindicarProxima(prisma, "w2")).toBeNull();

    const tipos = (await eventos(p.id)).map((e) => e.type);
    expect(tipos).toContain("PUBLISHED");
    expect(tipos).toContain("METADATA_SYNC_FAILED");
  });

  it("sincronizar metadados depois completa o permalink sem tocar no status", async () => {
    const p = await publicacaoDeTeste(projectId);
    await reivindicarProxima(prisma, "w1");
    await registrarPublicado(prisma, p.id, { externalId: "17900002", externalUrl: null });
    const r = await sincronizarMetadados(prisma, p.id, { externalUrl: "https://www.instagram.com/p/Xyz/" });
    expect(r.status).toBe("PUBLISHED");
    expect(r.externalUrl).toBe("https://www.instagram.com/p/Xyz/");
    expect(r.metadataSyncedAt).toBeInstanceOf(Date);
  });

  it("nenhuma transição consegue tirar uma publicação de PUBLISHED", async () => {
    const p = await publicacaoDeTeste(projectId);
    await reivindicarProxima(prisma, "w1");
    await registrarPublicado(prisma, p.id, { externalId: "179", externalUrl: null });

    for (const acao of [
      () => aprovar(prisma, p.id),
      () => agendar(prisma, p.id, new Date()),
      () => cancelar(prisma, p.id),
      () => retentar(prisma, p.id),
      () => publicarAgora(prisma, p.id),
      () => registrarFalha(prisma, p.id, classificarErro(new TransientError("x"))),
    ]) {
      await expect(acao()).rejects.toThrow();
    }
    expect((await prisma.publication.findUnique({ where: { id: p.id } }))!.status).toBe("PUBLISHED");
  });
});

describe("falha e retry", () => {
  it("erro transitório agenda retry e volta pra fila só depois do backoff", async () => {
    const p = await publicacaoDeTeste(projectId);
    await reivindicarProxima(prisma, "w1");
    const r = await registrarFalha(prisma, p.id, classificarErro(new TransientError("timeout")));

    expect(r.status).toBe("RETRYING");
    expect(r.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now());
    expect(r.lockedBy).toBeNull();
    expect(await reivindicarProxima(prisma, "w2")).toBeNull();
  });

  it("erro permanente vai direto pra FAILED, sem retry", async () => {
    const p = await publicacaoDeTeste(projectId);
    await reivindicarProxima(prisma, "w1");
    const r = await registrarFalha(prisma, p.id, classificarErro(new PermanentError("token inválido")));
    expect(r.status).toBe("FAILED");
    expect(r.nextAttemptAt).toBeNull();
    expect(r.lastErrorKind).toBe("PERMANENT");
  });

  it("rate limit espera bem mais que um transitório comum", async () => {
    const rl = await publicacaoDeTeste(projectId, { title: "rl" });
    await reivindicarProxima(prisma, "w1");
    const comRateLimit = await registrarFalha(prisma, rl.id,
      classificarErro(new GraphApiError({ message: "Application request limit reached", code: 4 }, "media_publish", 400)));
    expect(comRateLimit.nextAttemptAt!.getTime() - Date.now()).toBeGreaterThan(20 * 60_000);
  });

  it("esgotar as tentativas encerra em FAILED e tira da fila", async () => {
    const p = await publicacaoDeTeste(projectId, { attempts: 0 });
    for (let i = 0; i < 3; i++) {
      const pego = await reivindicarProxima(prisma, `w${i}`);
      expect(pego).not.toBeNull();
      await registrarFalha(prisma, p.id, classificarErro(new TransientError("timeout")));
      await prisma.publication.update({ where: { id: p.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
    }
    const final = await prisma.publication.findUnique({ where: { id: p.id } });
    expect(final!.status).toBe("FAILED");
    expect(final!.attempts).toBe(3);
    expect(await reivindicarProxima(prisma, "w9")).toBeNull();
  });

  it("retry manual reabre o teto de tentativas", async () => {
    const p = await publicacaoDeTeste(projectId, { status: "FAILED", attempts: 3, scheduledAt: null });
    const r = await retentar(prisma, p.id);
    expect(r.status).toBe("RETRYING");
    expect(r.maxAttempts).toBeGreaterThan(3);
    expect((await reivindicarProxima(prisma, "w1"))?.id).toBe(p.id);
  });
});

describe("guarda de concorrência", () => {
  it("recusa a segunda ação quando o estado mudou no meio", async () => {
    const p = await publicacaoDeTeste(projectId, { status: "DRAFT", scheduledAt: null });
    const [a, b] = await Promise.allSettled([aprovar(prisma, p.id), aprovar(prisma, p.id)]);
    const ok = [a, b].filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
  });
});

describe("isolamento entre projetos", () => {
  it("cada publicação continua no seu projeto ao longo de todo o fluxo", async () => {
    const revisao = await projetoDeTeste("revisao-teste", "Revisão Rápida");
    const dev = await projetoDeTeste("dev-teste", "Abner Oliveira Dev");

    const a = await publicacaoDeTeste(revisao.id, { title: "carrossel de biologia" });
    const b = await publicacaoDeTeste(dev.id, { title: "reel de next.js", scheduledAt: new Date(Date.now() - 2000) });

    const primeiro = await reivindicarProxima(prisma, "w1");
    const segundo = await reivindicarProxima(prisma, "w2");
    expect(primeiro!.id).toBe(b.id);
    expect(primeiro!.projectId).toBe(dev.id);
    expect(segundo!.projectId).toBe(revisao.id);

    await registrarPublicado(prisma, a.id, { externalId: "ig-a", externalUrl: "https://x/a" });
    await registrarPublicado(prisma, b.id, { externalId: "ig-b", externalUrl: "https://x/b" });

    const doRevisao = await prisma.publication.findMany({ where: { projectId: revisao.id } });
    expect(doRevisao).toHaveLength(1);
    expect(doRevisao[0].externalId).toBe("ig-a");
    const doDev = await prisma.publication.findMany({ where: { projectId: dev.id } });
    expect(doDev[0].externalId).toBe("ig-b");
  });
});
