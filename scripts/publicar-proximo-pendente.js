import { readdir, access, writeFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const raizRepo = join(__dirname, "..");

function argOuPadrao(nome, padrao) {
  const prefixo = `--${nome}=`;
  const achado = process.argv.find((a) => a.startsWith(prefixo));
  return achado ? achado.slice(prefixo.length) : padrao;
}

const conteudoDir = resolve(raizRepo, argOuPadrao("raiz", "negocios/ciencia-visual/marketing/conteudo"));
// Nome diferente de "--env-file" de propósito: essa é uma flag nativa do Node,
// intercepta mesmo vindo depois do caminho do script e quebra se apontar pra
// um arquivo que não existe relativo ao cwd de quem invocou.
const envFile = argOuPadrao("negocio-env", "negocios/ciencia-visual/.env");

// Cronograma da Revisão Rápida: seg Biologia, ter Química, qua Física, qui História/Geografia
// (alterna por semana do ano), sex Dicas gerais, fds sem lote ainda.
// Específico desse negócio — um negócio novo com automação própria usa seu próprio mapeamento.
const DISCIPLINA_POR_DIA = {
  1: ["biologia"],
  2: ["quimica"],
  3: ["fisica"],
  4: ["historia", "geografia"],
  5: ["dicas"],
};

function disciplinasDeHoje() {
  const diaSemana = new Date().getDay();
  return DISCIPLINA_POR_DIA[diaSemana] ?? null;
}

async function existe(caminho) {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

async function listarPendentes() {
  const entradas = await readdir(conteudoDir, { withFileTypes: true });
  const candidatas = [];

  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;
    const pasta = join(conteudoDir, entrada.name);
    const temPendente = await existe(join(pasta, "pendente.md"));
    const temPublicado = await existe(join(pasta, "publicado.md"));
    if (temPendente && !temPublicado) {
      candidatas.push({ pasta, nome: entrada.name });
    }
  }

  candidatas.sort((a, b) => a.nome.localeCompare(b.nome));
  return candidatas;
}

async function proximaPasta() {
  const pendentes = await listarPendentes();
  if (pendentes.length === 0) return null;

  const disciplinasHoje = disciplinasDeHoje();
  if (disciplinasHoje) {
    const daDisciplina = pendentes.find((c) =>
      disciplinasHoje.some((d) => c.nome.startsWith(`${d}-`))
    );
    if (daDisciplina) return daDisciplina;
  }

  // Sem lote da disciplina de hoje (ou fim de semana/sexta) — publica o mais antigo disponível
  return pendentes[0];
}

async function main() {
  const proxima = await proximaPasta();
  if (!proxima) {
    console.log("Nenhum carrossel pendente de publicação. Nada a fazer.");
    return;
  }

  console.log(`[${new Date().toISOString()}] Publicando: ${proxima.nome}`);
  const { stdout } = await run(
    process.execPath,
    [`--env-file=${envFile}`, "scripts/postar-instagram.js", proxima.pasta],
    { cwd: raizRepo }
  );
  console.log(stdout);

  const linkMatch = stdout.match(/Link: (\S+)/);
  const idMatch = stdout.match(/media id: (\S+)\)/);
  const link = linkMatch ? linkMatch[1] : idMatch ? `(link não capturado, media id: ${idMatch[1]} — conferir manualmente)` : "(link não capturado — conferir manualmente)";
  const hoje = new Date().toISOString().slice(0, 10);

  await writeFile(
    join(proxima.pasta, "publicado.md"),
    `**Publicado em:** ${hoje}\n**Link:** ${link}\n\n(Publicado automaticamente pela rotina agendada.)\n`,
    "utf-8"
  );

  console.log(`[${new Date().toISOString()}] Marcado como publicado: ${proxima.nome}`);
}

main().catch((err) => {
  console.error(`[${new Date().toISOString()}] Falha ao publicar: ${err.message}`);
  process.exit(1);
});
