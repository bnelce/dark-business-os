import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HASHTAGS_ESPECIFICAS } from "./hashtags-especificas.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const conteudoDir = join(__dirname, "..", "marketing", "conteudo");

const SIGLAS = ["DNA", "ATP", "MRU", "MRUV", "CO2", "H2O", "NaCl"];

function frasar(titulo) {
  const plano = titulo.replace(/\n/g, " ").trim();
  const palavras = plano.split(" ").map((p, i) => {
    const semPontuacao = p.replace(/[?.,]/g, "");
    if (SIGLAS.includes(semPontuacao.toUpperCase())) {
      return p.replace(semPontuacao, semPontuacao.toUpperCase());
    }
    const minuscula = p.toLowerCase();
    return i === 0 ? minuscula.charAt(0).toUpperCase() + minuscula.slice(1) : minuscula;
  });
  let frase = palavras.join(" ");
  if (!frase.endsWith("?")) frase += "?";
  return frase;
}

async function existe(caminho) {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

function nomeDisciplina(disciplina) {
  const mapa = { biologia: "Biologia", quimica: "Química", fisica: "Física", historia: "História", geografia: "Geografia", dicas: null };
  return mapa[disciplina] ?? null;
}

async function gerarLegenda(pastaAbsoluta, slug) {
  const conteudo = JSON.parse(await readFile(join(pastaAbsoluta, "conteudo.json"), "utf-8"));
  const capa = conteudo.slides.find((s) => s.tipo === "capa");
  const conceito = conteudo.slides.find((s) => s.tipo === "conceito");
  const lista = conteudo.slides.find((s) => s.tipo === "lista");
  const dica = conteudo.slides.find((s) => s.tipo === "dica");

  const hook = frasar(capa.titulo);
  const emoji = capa.emoji ? ` ${capa.emoji}` : "";
  const corpo = conceito.conteudo;
  const pontosChave = `${lista.titulo}:\n${lista.items.map((item) => `• ${item}`).join("\n")}`;
  const dicaBloco = `💡 ${dica.conteudo}`;

  const disciplinaNome = nomeDisciplina(conteudo.disciplina);
  const seguirLinha = disciplinaNome
    ? `Segue @revisaorapida1ano pra não perder as próximas revisões de ${disciplinaNome}.`
    : `Segue @revisaorapida1ano pra não perder as próximas.`;

  const especificas = HASHTAGS_ESPECIFICAS[slug];
  if (!especificas) throw new Error(`Sem hashtags específicas cadastradas pra ${slug}`);
  const tagDisciplina = conteudo.disciplina === "dicas" ? "dicasdeestudo" : `${conteudo.disciplina}1ano`;
  const hashtags = [tagDisciplina, ...especificas, "ensinomedio", "estudos"].map((h) => `#${h}`).join(" ");

  return `${hook}${emoji}

${corpo}

${pontosChave}

${dicaBloco}

Qual matéria você quer que eu resuma essa semana? Comenta 👇
Salva pra revisar antes da prova — e manda pro grupo da sala.

${seguirLinha}

${hashtags}
`;
}

async function main() {
  const entradas = await readdir(conteudoDir, { withFileTypes: true });
  let feitos = 0;
  let pulados = [];

  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;
    const pasta = join(conteudoDir, entrada.name);
    const temPendente = await existe(join(pasta, "pendente.md"));
    const temPublicado = await existe(join(pasta, "publicado.md"));
    const temJson = await existe(join(pasta, "conteudo.json"));

    if (!temPendente || temPublicado) continue;
    if (!temJson) {
      pulados.push(entrada.name);
      continue;
    }

    const slug = entrada.name.replace(/-2026-09-04$/, "").replace(/-2026-09-03$/, "");
    try {
      const legenda = await gerarLegenda(pasta, slug);
      await writeFile(join(pasta, "legenda.md"), legenda, "utf-8");
      console.log(`ok: ${entrada.name}`);
      feitos++;
    } catch (err) {
      console.log(`ERRO em ${entrada.name}: ${err.message}`);
      pulados.push(entrada.name);
    }
  }

  console.log(`\nFeitos: ${feitos}`);
  if (pulados.length) console.log(`Pulados (sem JSON ou sem hashtag cadastrada): ${pulados.join(", ")}`);
}

main();
