// Importa os canais de uma pasta canais/ (formato antigo, em Markdown) para o banco.
// Idempotente: roda de novo e só atualiza. Depois da importação, canais/ sai do git.
//
//   npm run import:canais                 # dry-run: mostra o que faria
//   npm run import:canais -- --commit     # grava
//   npm run import:canais -- --dir ../canais --commit
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient, type ChannelPhase } from "@prisma/client";

type Linha = { nome: string; slug: string | null; nicho: string; fase: string };

/** Lê a tabela do _rede.md. */
export function lerRede(md: string): Linha[] {
  return md
    .split("\n")
    .filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l) && !/^\|\s*Canal\s*\|/.test(l))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length >= 4)
    .map(([nome, slug, nicho, fase]) => ({ nome, slug: slug && slug !== "—" ? slug : null, nicho, fase }));
}

/** Lê os bullets "- **Chave:** valor" do canal.md. */
export function lerCanal(md: string): Record<string, string> {
  const perfil: Record<string, string> = {};
  for (const m of md.matchAll(/^- \*\*(.+?):\*\*\s*(.*)$/gm)) perfil[m[1].trim()] = m[2].trim();
  return perfil;
}

export function fase(texto: string): ChannelPhase {
  const t = texto.toLowerCase();
  if (t.includes("piloto")) return "PILOTO";
  if (t.includes("ativo")) return "ATIVO";
  if (t.includes("pausado")) return "PAUSADO";
  return "CANDIDATO";
}

export function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function semPlaceholder(v: string | undefined): string | undefined {
  return v && !/^_.*_$/.test(v) ? v : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const i = args.indexOf("--dir");
  const dir = resolve(i !== -1 ? args[i + 1] : "../canais");
  const rede = join(dir, "_rede.md");
  if (!existsSync(rede)) throw new Error(`não achei ${rede}`);

  const prisma = new PrismaClient();
  try {
    for (const l of lerRede(readFileSync(rede, "utf8"))) {
      const slug = l.slug ?? slugify(l.nome);
      const arquivo = join(dir, slug, "canal.md");
      const perfil = existsSync(arquivo) ? lerCanal(readFileSync(arquivo, "utf8")) : {};
      const identidadeMd = join(dir, slug, "identidade.md");
      const identidade = existsSync(identidadeMd) ? readFileSync(identidadeMd, "utf8").trim() : "";
      const dados = {
        name: l.nome,
        niche: perfil["Nicho"] ?? l.nicho,
        phase: fase(l.fase),
        handle: semPlaceholder(perfil["Handle"]) ?? null,
        profile: perfil,
        identity: identidade ? { markdown: identidade } : {},
      };
      console.log(`${commit ? "grava" : "faria"}  ${slug.padEnd(18)} ${dados.phase.padEnd(9)} ${Object.keys(perfil).length} campos de perfil`);
      if (commit) await prisma.darkChannel.upsert({ where: { slug }, create: { slug, ...dados }, update: dados });
    }
    if (!commit) console.log("\nDry-run. Rode com --commit para gravar.");
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
