"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao, conferirCredenciais, criarSessao, gravarCookieDeSessao, limparSessao,
  registrarTentativaFalha, estaBloqueado, limparTentativas } from "@/lib/auth";
import * as t from "@/queue/transitions";
import { sincronizarMetadados } from "@/queue/transitions";
import { credenciaisDoCanal } from "@/worker/credenciais";
import { GraphClient } from "@/publishers/instagram/client";
import { cifrar } from "@/lib/crypto";

/**
 * Ações do operador. Toda ação que muda estado passa por exigirSessao() antes
 * de tocar no banco: o middleware protege navegação, mas POST de server action
 * precisa da guarda no próprio corpo.
 *
 * Nenhuma delas publica direto — publicar é sempre pela fila e pelo worker.
 */

export type Resposta = { ok: true } | { ok: false; erro: string };

async function executar(id: string, fn: () => Promise<unknown>): Promise<Resposta> {
  await exigirSessao();
  try {
    await fn();
    revalidatePath("/", "layout");
    revalidatePath(`/publicacoes/${id}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : String(erro) };
  }
}

export async function aprovarAcao(id: string) {
  return executar(id, () => t.aprovar(prisma, id));
}

export async function agendarAcao(id: string, quandoLocal: string) {
  const quando = new Date(quandoLocal);
  if (Number.isNaN(quando.getTime())) return { ok: false as const, erro: "Data inválida" };
  return executar(id, async () => {
    const atual = await prisma.publication.findUnique({ where: { id }, select: { status: true } });
    if (atual?.status === "SCHEDULED") return t.reagendar(prisma, id, quando);
    return t.agendar(prisma, id, quando);
  });
}

export async function desagendarAcao(id: string) {
  return executar(id, () => t.desagendar(prisma, id));
}

export async function cancelarAcao(id: string) {
  return executar(id, () => t.cancelar(prisma, id));
}

export async function reabrirAcao(id: string) {
  return executar(id, () => t.reabrir(prisma, id));
}

export async function publicarAgoraAcao(id: string) {
  return executar(id, () => t.publicarAgora(prisma, id));
}

export async function retentarAcao(id: string) {
  return executar(id, () => t.retentar(prisma, id));
}

/**
 * Busca o permalink de uma publicação que saiu sem ele. Só toca em metadados:
 * jamais republica, e falhar aqui não muda o status.
 */
export async function sincronizarMetadadosAcao(id: string) {
  return executar(id, async () => {
    const pub = await prisma.publication.findUnique({ where: { id } });
    if (!pub) throw new Error("Publicação não encontrada");
    if (!pub.externalId) throw new Error("Sem external id: nada a sincronizar. Preencha o link à mão.");

    const { credenciais } = await credenciaisDoCanal(prisma, pub.projectId, pub.channel);
    const { permalink } = await new GraphClient().get(pub.externalId, {
      fields: "permalink", access_token: credenciais.accessToken,
    });
    await sincronizarMetadados(prisma, id, { externalUrl: permalink ?? null });
  });
}

// ------------------------------------------------------------ sessão

export async function entrarAcao(_estado: unknown, dados: FormData): Promise<{ erro?: string }> {
  const usuario = String(dados.get("usuario") ?? "");
  const senha = String(dados.get("senha") ?? "");
  const chave = "admin";

  const bloqueio = estaBloqueado(chave);
  if (bloqueio.bloqueado) {
    return { erro: `Muitas tentativas. Tente de novo em ${Math.ceil(bloqueio.segundos / 60)} min.` };
  }

  if (!conferirCredenciais(usuario, senha)) {
    registrarTentativaFalha(chave);
    // Mensagem única: não revela se o usuário existe.
    return { erro: "Usuário ou senha inválidos." };
  }

  limparTentativas(chave);
  await gravarCookieDeSessao(await criarSessao(usuario));
  redirect(String(dados.get("de") || "/"));
}

export async function sairAcao() {
  await limparSessao();
  redirect("/login");
}

// ------------------------------------------------------------ projetos e canais

const RE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function criarProjetoAcao(dados: { nome: string; slug: string; descricao?: string }): Promise<Resposta> {
  await exigirSessao();
  const nome = dados.nome.trim();
  const slug = dados.slug.trim().toLowerCase();

  if (!nome) return { ok: false, erro: "Nome é obrigatório." };
  if (!RE_SLUG.test(slug)) {
    return { ok: false, erro: "Slug deve ter só letras minúsculas, números e hífens (ex: minha-marca)." };
  }
  if (await prisma.project.findUnique({ where: { slug } })) {
    return { ok: false, erro: `Já existe projeto com o slug "${slug}".` };
  }

  await prisma.project.create({
    data: { name: nome, slug, description: dados.descricao?.trim() || null },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Grava a credencial do par (projeto, canal), cifrada.
 * O valor nunca volta pra interface — trocar significa digitar de novo.
 */
export async function salvarCanalAcao(dados: {
  projectId: string; canal: "INSTAGRAM" | "YOUTUBE" | "TIKTOK" | "FACEBOOK" | "LINKEDIN";
  handle?: string; accessToken: string; accountId: string;
}): Promise<Resposta> {
  await exigirSessao();
  const accessToken = dados.accessToken.trim();
  const accountId = dados.accountId.trim();
  if (!accessToken || !accountId) return { ok: false, erro: "Token e ID da conta são obrigatórios." };

  const credentials = cifrar(JSON.stringify({ accessToken, accountId }));
  const handle = dados.handle?.trim() || null;

  await prisma.channelConfig.upsert({
    where: { projectId_channel: { projectId: dados.projectId, channel: dados.canal } },
    update: { credentials, handle, isActive: true },
    create: { projectId: dados.projectId, channel: dados.canal, credentials, handle },
  });
  revalidatePath("/projetos");
  return { ok: true };
}

export async function alternarCanalAcao(channelConfigId: string, ativo: boolean): Promise<Resposta> {
  await exigirSessao();
  await prisma.channelConfig.update({ where: { id: channelConfigId }, data: { isActive: ativo } });
  revalidatePath("/projetos");
  return { ok: true };
}
