// Servidor MCP do painel da rede (stdio). É por aqui que o Claude Code lê e grava o estado
// da rede: canais, Radar, pautas, roteiros. Registrado em .mcp.json na raiz do repo.
//
// Regra: as etapas com aprovação do usuário (EMBALAGEM → PESQUISA e REVISAO → AGENDADO)
// nunca avançam por aqui. Só pelo painel.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PrismaClient, type Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const server = new McpServer({ name: "dark-rede", version: "0.1.0" });

const json = (dados: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(dados, null, 2) }] });
const erro = (msg: string) => ({ content: [{ type: "text" as const, text: msg }], isError: true });

server.registerTool(
  "rede_listar_canais",
  {
    description: "Lista os canais da rede com fase, nicho e handle. Filtra por fase se informada.",
    inputSchema: { fase: z.enum(["CANDIDATO", "PILOTO", "ATIVO", "PAUSADO", "ENCERRADO"]).optional() },
  },
  async ({ fase }) => json(await prisma.darkChannel.findMany({
    where: fase ? { phase: fase } : undefined,
    orderBy: [{ phase: "asc" }, { name: "asc" }],
    select: { slug: true, name: true, handle: true, niche: true, phase: true, keywords: true },
  })),
);

server.registerTool(
  "canal_obter",
  {
    description: "Retorna o canal completo: perfil (ângulo, público, voz, cadência, produto, regras), identidade visual, palavras do Radar e canais de referência.",
    inputSchema: { slug: z.string() },
  },
  async ({ slug }) => {
    const canal = await prisma.darkChannel.findUnique({
      where: { slug },
      include: { references: { include: { referenceChannel: true } } },
    });
    return canal ? json(canal) : erro(`canal "${slug}" não existe`);
  },
);

server.registerTool(
  "canal_atualizar",
  {
    description: "Atualiza um canal. `perfil` e `identidade` são mesclados com o que já existe (chaves novas sobrescrevem). Use para gravar o resultado do /novo-canal.",
    inputSchema: {
      slug: z.string(),
      nome: z.string().optional(),
      handle: z.string().optional(),
      nicho: z.string().optional(),
      fase: z.enum(["CANDIDATO", "PILOTO", "ATIVO", "PAUSADO", "ENCERRADO"]).optional(),
      perfil: z.record(z.string(), z.unknown()).optional(),
      identidade: z.record(z.string(), z.unknown()).optional(),
      palavrasRadar: z.array(z.string()).optional(),
      categoriasYoutube: z.array(z.string()).optional(),
    },
  },
  async (a) => {
    const atual = await prisma.darkChannel.findUnique({ where: { slug: a.slug } });
    if (!atual) return erro(`canal "${a.slug}" não existe; use canal_criar`);
    const mescla = (base: Prisma.JsonValue, novo?: Record<string, unknown>) =>
      novo ? ({ ...(base as object), ...novo } as Prisma.InputJsonValue) : undefined;
    return json(await prisma.darkChannel.update({
      where: { slug: a.slug },
      data: {
        name: a.nome, handle: a.handle, niche: a.nicho, phase: a.fase,
        profile: mescla(atual.profile, a.perfil), identity: mescla(atual.identity, a.identidade),
        keywords: a.palavrasRadar, categoryIds: a.categoriasYoutube,
      },
    }));
  },
);

server.registerTool(
  "canal_criar",
  {
    description: "Cria um canal novo na rede (fase CANDIDATO por padrão).",
    inputSchema: { slug: z.string().regex(/^[a-z0-9-]+$/), nome: z.string(), nicho: z.string() },
  },
  async ({ slug, nome, nicho }) => {
    if (await prisma.darkChannel.findUnique({ where: { slug } })) return erro(`já existe "${slug}"`);
    return json(await prisma.darkChannel.create({ data: { slug, name: nome, niche: nicho } }));
  },
);

await server.connect(new StdioServerTransport());
