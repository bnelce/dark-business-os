import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { prisma, limparBanco, projetoDeTeste } from "./helpers/db";
import { varrerConteudo, lerRegistroDePublicado } from "../src/import/scan-conteudo";
import { importar } from "../src/import/importer";
import { MinioStorageProvider } from "../src/storage/minio";
import { reivindicarProxima } from "../src/queue/claim";

const storage = new MinioStorageProvider();
let raiz: string;
let projectId: string;

async function pasta(nome: string, opcoes: {
  slides?: number; legenda?: string; pendente?: boolean; publicado?: string; conteudo?: object;
} = {}) {
  const dir = join(raiz, nome);
  await mkdir(join(dir, "instagram"), { recursive: true });
  for (let i = 1; i <= (opcoes.slides ?? 6); i++) {
    await writeFile(join(dir, "instagram", `slide-0${i}.png`), Buffer.from(`png ${i}`));
  }
  await writeFile(join(dir, "legenda.md"), opcoes.legenda ?? "Legenda de teste\n\n#tag");
  if (opcoes.conteudo !== undefined) await writeFile(join(dir, "conteudo.json"), JSON.stringify(opcoes.conteudo));
  if (opcoes.pendente) await writeFile(join(dir, "pendente.md"), "**Aprovado (texto e formato):** sim\n");
  if (opcoes.publicado) await writeFile(join(dir, "publicado.md"), opcoes.publicado);
  return dir;
}

beforeEach(async () => {
  await limparBanco();
  projectId = (await projetoDeTeste()).id;
  raiz = await mkdtemp(join(tmpdir(), "pm-import-"));
});
afterAll(async () => { await limparBanco(); await prisma.$disconnect(); });

describe("leitura do sistema antigo", () => {
  it("lê pasta pendente como aprovada, com slides ordenados", async () => {
    await pasta("biologia-mitose-2026-09-04", {
      pendente: true, conteudo: { disciplina: "biologia", tema: "mitose" },
    });
    const [achado] = await varrerConteudo(raiz);

    expect(achado.estado).toBe("APPROVED");
    expect(achado.titulo).toBe("Mitose");
    expect(achado.disciplina).toBe("biologia");
    expect(achado.tipo).toBe("CAROUSEL");
    expect(achado.midias.map((m) => m.posicao)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("lê pasta publicada com data e link", async () => {
    await pasta("biologia-celula-2026-09-03", {
      pendente: true,
      publicado: "**Publicado em:** 2026-09-05\n**Link:** https://www.instagram.com/p/Dc5dCC3mzPs/\n",
    });
    const [achado] = await varrerConteudo(raiz);
    expect(achado.estado).toBe("PUBLISHED");
    expect(achado.externalUrl).toBe("https://www.instagram.com/p/Dc5dCC3mzPs/");
    expect(achado.publicadoEm?.toISOString().slice(0, 10)).toBe("2026-09-05");
  });

  it("sem pendente nem publicado, entra como rascunho", async () => {
    await pasta("quimica-atomo-2026-09-04", {});
    const [achado] = await varrerConteudo(raiz);
    expect(achado.estado).toBe("DRAFT");
    expect(achado.avisos.join()).toMatch(/rascunho/);
  });

  it("um slide só vira IMAGE, não carrossel", async () => {
    await pasta("dicas-uma-2026-09-04", { slides: 1, pendente: true });
    expect((await varrerConteudo(raiz))[0].tipo).toBe("IMAGE");
  });

  it("ignora pasta sem imagem e o template _render-template.js", async () => {
    await mkdir(join(raiz, "sem-imagem"), { recursive: true });
    await writeFile(join(raiz, "_render-template.js"), "// template");
    await pasta("com-imagem", { pendente: true });
    const achados = await varrerConteudo(raiz);
    expect(achados.map((a) => a.sourcePath)).toEqual(["com-imagem"]);
  });

  it("avisa quando falta legenda", async () => {
    const dir = await pasta("sem-legenda", { pendente: true });
    await rm(join(dir, "legenda.md"));
    expect((await varrerConteudo(raiz))[0].avisos.join()).toMatch(/sem legenda/);
  });

  // O caso real de biologia-reino-monera: publicado.md com dois links.
  it("sinaliza publicado.md com mais de um link e importa o primeiro", async () => {
    await pasta("biologia-reino-monera-2026-09-04", {
      pendente: true,
      publicado:
        "**Publicado em:** 2026-09-05\n" +
        "**Links (duplicado por bug — ver nota):** https://www.instagram.com/p/Dc5dyQyG5jN/ e https://www.instagram.com/p/Dc6O-GoG7IZ/\n",
    });
    const [achado] = await varrerConteudo(raiz);
    expect(achado.estado).toBe("PUBLISHED");
    expect(achado.externalUrl).toBe("https://www.instagram.com/p/Dc5dyQyG5jN/");
    expect(achado.avisos.join()).toMatch(/2 links/);
  });

  it("lerRegistroDePublicado tolera data ilegível sem quebrar", () => {
    const avisos: string[] = [];
    const r = lerRegistroDePublicado("**Publicado em:** ontem\n**Link:** https://x/p", avisos);
    expect(r.publicadoEm).toBeNull();
    expect(r.externalUrl).toBe("https://x/p");
    expect(avisos.join()).toMatch(/ilegível/);
  });
});

describe("import", () => {
  it("dry-run não grava nada", async () => {
    await pasta("a", { pendente: true });
    const r = await importar(prisma, storage, projectId, await varrerConteudo(raiz), { dryRun: true });
    expect(r.criadas).toBe(1);
    expect(await prisma.publication.count()).toBe(0);
  });

  it("commit cria publicação, mídias no MinIO e evento de import", async () => {
    await pasta("biologia-mitose-2026-09-04", { pendente: true, conteudo: { disciplina: "biologia", tema: "mitose" } });
    const r = await importar(prisma, storage, projectId, await varrerConteudo(raiz), { dryRun: false });

    expect(r.criadas).toBe(1);
    const pub = await prisma.publication.findFirst({ include: { media: true, events: true } });
    expect(pub!.status).toBe("APPROVED");
    expect(pub!.sourcePath).toBe("biologia-mitose-2026-09-04");
    expect(pub!.media).toHaveLength(6);
    expect(pub!.events.map((e) => e.type)).toEqual(expect.arrayContaining(["IMPORTED", "APPROVED"]));

    for (const midia of pub!.media) {
      expect(await storage.exists(midia.objectKey)).toBe(true);
      expect(midia.objectKey).toContain(`projects/${projectId}/publications/${pub!.id}/`);
    }
  });

  // Nada importado pode entrar na fila sozinho.
  it("importado como aprovado NÃO fica agendado nem elegível pro worker", async () => {
    await pasta("a", { pendente: true });
    await importar(prisma, storage, projectId, await varrerConteudo(raiz), { dryRun: false });
    const pub = await prisma.publication.findFirst();
    expect(pub!.status).toBe("APPROVED");
    expect(pub!.scheduledAt).toBeNull();
    expect(await reivindicarProxima(prisma, "w1")).toBeNull();
  });

  it("publicado entra como PUBLISHED e nunca é reivindicado", async () => {
    await pasta("b", { pendente: true, publicado: "**Publicado em:** 2026-09-05\n**Link:** https://x/p\n" });
    await importar(prisma, storage, projectId, await varrerConteudo(raiz), { dryRun: false });
    const pub = await prisma.publication.findFirst();
    expect(pub!.status).toBe("PUBLISHED");
    expect(pub!.externalUrl).toBe("https://x/p");
    expect(pub!.publishedAt).toBeInstanceOf(Date);
    expect(await reivindicarProxima(prisma, "w1")).toBeNull();
  });

  it("rodar duas vezes não duplica", async () => {
    await pasta("a", { pendente: true });
    const achados = await varrerConteudo(raiz);
    await importar(prisma, storage, projectId, achados, { dryRun: false });
    const segunda = await importar(prisma, storage, projectId, achados, { dryRun: false });

    expect(segunda.criadas).toBe(0);
    expect(segunda.puladas).toBe(1);
    expect(await prisma.publication.count()).toBe(1);
    expect(await prisma.media.count()).toBe(6);
  });

  it("não sobrescreve o que o operador mudou depois do import", async () => {
    await pasta("a", { pendente: true });
    const achados = await varrerConteudo(raiz);
    await importar(prisma, storage, projectId, achados, { dryRun: false });

    const pub = await prisma.publication.findFirst();
    await prisma.publication.update({ where: { id: pub!.id }, data: { title: "Título editado à mão", status: "DRAFT" } });

    await importar(prisma, storage, projectId, achados, { dryRun: false });
    const depois = await prisma.publication.findFirst();
    expect(depois!.title).toBe("Título editado à mão");
    expect(depois!.status).toBe("DRAFT");
  });

  it("não apaga nem move nada na origem", async () => {
    const dir = await pasta("a", { pendente: true, publicado: "**Publicado em:** 2026-09-05\n**Link:** https://x\n" });
    const antes = (await readdir(dir)).sort();
    const dentroAntes = (await readdir(join(dir, "instagram"))).sort();

    await importar(prisma, storage, projectId, await varrerConteudo(raiz), { dryRun: false });

    expect((await readdir(dir)).sort()).toEqual(antes);
    expect((await readdir(join(dir, "instagram"))).sort()).toEqual(dentroAntes);
  });

  it("um item com erro não derruba o lote", async () => {
    await pasta("boa", { pendente: true });
    const achados = await varrerConteudo(raiz);
    achados.push({ ...achados[0], sourcePath: "quebrada", midias: [{ ...achados[0].midias[0], caminho: "/nao/existe.png" }] });

    const r = await importar(prisma, storage, projectId, achados, { dryRun: false });
    expect(r.criadas).toBe(1);
    expect(r.erros).toBe(1);
    // O parcial é desfeito: publicação aprovada sem todas as mídias seria
    // agendável sem o operador perceber. Só a boa fica.
    expect(await prisma.publication.count()).toBe(1);
    expect((await prisma.publication.findFirst())!.sourcePath).toBe("boa");
  });
});

describe("data sem hora", () => {
  it("ancora no meio-dia pra não escorregar pro dia anterior no fuso local", async () => {
    const { interpretarData } = await import("../src/import/scan-conteudo");
    const d = interpretarData("2026-09-05");
    // Formatado no fuso de exibição, tem que continuar sendo dia 5.
    const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(d);
    expect(dia).toBe("2026-09-05");
  });

  it("respeita data com hora quando ela existe", async () => {
    const { interpretarData } = await import("../src/import/scan-conteudo");
    expect(interpretarData("2026-09-05T15:30:00Z").toISOString()).toBe("2026-09-05T15:30:00.000Z");
  });

  it("publicado.md só com data entra no dia certo", async () => {
    await pasta("c", { pendente: true, publicado: "**Publicado em:** 2026-09-05\n**Link:** https://x/p\n" });
    await importar(prisma, storage, projectId, await varrerConteudo(raiz), { dryRun: false });
    const pub = await prisma.publication.findFirst({ where: { sourcePath: "c" } });
    const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(pub!.publishedAt!);
    expect(dia).toBe("2026-09-05");
  });
});
