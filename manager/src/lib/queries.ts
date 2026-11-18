import type { Channel, Prisma, PublicationStatus, PublicationType } from "@prisma/client";
import { prisma } from "./prisma";
import { config } from "./env";
import { contarElegiveis } from "@/queue/claim";
import { saudeDoWorker } from "@/worker/heartbeat";

/** Limites do dia no fuso de exibição — "hoje" é o dia do operador, não UTC. */
export function limitesDeHoje(agora = new Date()): { inicio: Date; fim: Date } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const hoje = fmt.format(agora);
  // Descobre o deslocamento do fuso interpretando a meia-noite local.
  const meiaNoiteUtc = new Date(`${hoje}T00:00:00Z`);
  const deslocamento = meiaNoiteUtc.getTime() - new Date(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: config.timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).format(meiaNoiteUtc).replace(" ", "T") + "Z",
  ).getTime();
  const inicio = new Date(meiaNoiteUtc.getTime() + deslocamento);
  return { inicio, fim: new Date(inicio.getTime() + 86_400_000) };
}

export type FiltrosDaFila = {
  projeto?: string;
  status?: PublicationStatus;
  tipo?: PublicationType;
  canal?: Channel;
  de?: string;
  ate?: string;
};

export function whereDaFila(f: FiltrosDaFila): Prisma.PublicationWhereInput {
  const where: Prisma.PublicationWhereInput = {};
  if (f.projeto) where.project = { slug: f.projeto };
  if (f.status) where.status = f.status;
  if (f.tipo) where.type = f.tipo;
  if (f.canal) where.channel = f.canal;

  if (f.de || f.ate) {
    // Filtra pelo momento que importa pra cada linha: agendamento se houver,
    // senão a publicação. Publicação antiga importada não tem agendamento.
    const intervalo: Prisma.DateTimeFilter = {};
    if (f.de) intervalo.gte = new Date(`${f.de}T00:00:00`);
    if (f.ate) intervalo.lte = new Date(`${f.ate}T23:59:59`);
    where.OR = [{ scheduledAt: intervalo }, { publishedAt: intervalo }];
  }
  return where;
}

const INCLUI_CAPA = {
  project: { select: { id: true, name: true, slug: true, settings: true } },
  media: { orderBy: { position: "asc" }, take: 1 },
  _count: { select: { media: true } },
} satisfies Prisma.PublicationInclude;

export type LinhaDaFila = Prisma.PublicationGetPayload<{ include: typeof INCLUI_CAPA }>;

export async function listarFila(f: FiltrosDaFila, limite = 200): Promise<LinhaDaFila[]> {
  return prisma.publication.findMany({
    where: whereDaFila(f),
    include: INCLUI_CAPA,
    // Vencidas primeiro, depois o que vem por aí, e o passado no fim.
    orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: limite,
  });
}

export async function resumoDoPainel(projeto?: string) {
  const { inicio, fim } = limitesDeHoje();
  const escopo: Prisma.PublicationWhereInput = projeto ? { project: { slug: projeto } } : {};
  const conta = (where: Prisma.PublicationWhereInput) =>
    prisma.publication.count({ where: { ...escopo, ...where } });

  const [
    naFila, agendadasHoje, publicadasHoje, falhas, aprovadasSemData,
    elegiveisAgora, proxima, ultimas, ultimasFalhas, worker, projetos,
  ] = await Promise.all([
    conta({ status: { in: ["SCHEDULED", "RETRYING"] } }),
    conta({ status: { in: ["SCHEDULED", "RETRYING"] }, scheduledAt: { gte: inicio, lt: fim } }),
    conta({ status: "PUBLISHED", publishedAt: { gte: inicio, lt: fim } }),
    conta({ status: "FAILED" }),
    conta({ status: "APPROVED" }),
    contarElegiveis(prisma),
    prisma.publication.findFirst({
      where: { ...escopo, status: { in: ["SCHEDULED", "RETRYING"] } },
      include: INCLUI_CAPA,
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.publication.findMany({
      where: { ...escopo, status: "PUBLISHED" },
      include: INCLUI_CAPA, orderBy: { publishedAt: "desc" }, take: 8,
    }),
    prisma.publication.findMany({
      where: { ...escopo, status: { in: ["FAILED", "RETRYING"] } },
      include: INCLUI_CAPA, orderBy: { updatedAt: "desc" }, take: 5,
    }),
    saudeDoWorker(prisma, config.workerOfflineAfterMs),
    listarProjetos(),
  ]);

  return {
    naFila, agendadasHoje, publicadasHoje, falhas, aprovadasSemData,
    elegiveisAgora, proxima, ultimas, ultimasFalhas, worker, projetos,
    dryRun: config.dryRun,
  };
}

export async function listarProjetos() {
  return prisma.project.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      channelConfigs: { select: { id: true, channel: true, isActive: true, handle: true } },
      _count: { select: { publications: true } },
    },
  });
}

export async function publicacaoCompleta(id: string) {
  return prisma.publication.findUnique({
    where: { id },
    include: {
      project: true,
      channelConfig: { select: { channel: true, handle: true, isActive: true } },
      media: { orderBy: { position: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
}

export type PublicacaoCompleta = NonNullable<Awaited<ReturnType<typeof publicacaoCompleta>>>;
