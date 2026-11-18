import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CORES = {
  roxo: { bg: "#667eea", texto: "#FAFAF7", claro: false },
  verde: { bg: "#43e97b", texto: "#1A1A1A", claro: true },
  "roxo-esc": { bg: "#764ba2", texto: "#FAFAF7", claro: false },
  rosa: { bg: "#f093fb", texto: "#1A1A1A", claro: true },
  azul: { bg: "#4facfe", texto: "#1A1A1A", claro: true },
  coral: { bg: "#fa709a", texto: "#FAFAF7", claro: false },
};

const CSS_BASE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; }
  .slide {
    width: 1080px;
    height: 1350px;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 64px 64px;
    overflow: hidden;
  }
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 30px;
    font-weight: 600;
    letter-spacing: 0.14em;
    opacity: 0.9;
  }
  .logo-mark { width: 48px; height: 48px; border-radius: 11px; display: block; }
  .counter { letter-spacing: 0.14em; }
  .kicker {
    font-family: 'Poppins', sans-serif;
    font-size: 30px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    margin-bottom: 30px;
  }
  .regua { width: 90px; height: 6px; border-radius: 4px; margin-bottom: 36px; }
  h1 {
    font-family: 'Poppins', sans-serif;
    font-weight: 900;
    font-size: 112px;
    line-height: 0.96;
    letter-spacing: -0.03em;
    margin-bottom: 28px;
    overflow-wrap: break-word;
    max-width: 960px;
  }
  h2 {
    font-family: 'Poppins', sans-serif;
    font-weight: 800;
    font-size: 84px;
    line-height: 1.02;
    letter-spacing: -0.02em;
    margin-bottom: 32px;
    overflow-wrap: break-word;
    max-width: 960px;
  }
  p.body-text {
    font-size: 42px;
    font-weight: 500;
    line-height: 1.42;
    max-width: 920px;
  }
  .subtitulo {
    font-size: 42px;
    font-weight: 500;
    max-width: 760px;
  }
  .emoji-grande { font-size: 160px; margin-bottom: 36px; }
  .center-block { margin-top: 60px; }
  ul.lista { list-style: none; margin-top: 8px; }
  ul.lista li {
    font-size: 38px;
    font-weight: 500;
    line-height: 1.32;
    padding: 26px 0;
    border-top: 1px solid rgba(0,0,0,0.12);
  }
  ul.lista li:last-child { border-bottom: 1px solid rgba(0,0,0,0.12); }
  .card-destaque {
    border-radius: 28px;
    padding: 52px;
    background: rgba(255,255,255,0.16);
  }
  .preco {
    font-family: 'Poppins', sans-serif;
    font-weight: 900;
    font-size: 96px;
    margin: 28px 0;
  }
  .cta-botao {
    display: inline-block;
    align-self: flex-start;
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 36px;
    padding: 26px 52px;
    border-radius: 50px;
    margin-top: 20px;
  }
`;

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function corClasse(nome) {
  if (!CORES[nome]) throw new Error(`Cor desconhecida: ${nome}. Use uma de: ${Object.keys(CORES).join(", ")}`);
  return nome;
}

function hexParaRgba(hex, alpha) {
  const valor = hex.replace("#", "");
  const r = parseInt(valor.slice(0, 2), 16);
  const g = parseInt(valor.slice(2, 4), 16);
  const b = parseInt(valor.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderSlide(slide, index, total, cor) {
  const numero = String(index + 1).padStart(2, "0");
  const totalStr = String(total).padStart(2, "0");
  const topBar = `<div class="top-bar"><img class="logo-mark" src="../../../identidade/logo-perfil.png" alt=""><span class="counter">${numero} / ${totalStr}</span></div>`;

  let inner = "";
  switch (slide.tipo) {
    case "capa":
      inner = `
        ${slide.foto ? "" : `<div class="emoji-grande">${slide.emoji ?? ""}</div>`}
        <div class="kicker">${escapeHtml(slide.kicker ?? "")}</div>
        <div class="regua"></div>
        <h1>${escapeHtml(slide.titulo).replace(/\n/g, "<br>")}</h1>
        <p class="subtitulo">${escapeHtml(slide.subtitulo ?? "")}</p>`;
      break;
    case "conceito":
    case "exemplo":
      inner = `
        <div class="kicker">${escapeHtml(slide.kicker ?? (slide.tipo === "conceito" ? "Conceito" : "Na prática"))}</div>
        <div class="regua"></div>
        <h2>${escapeHtml(slide.titulo)}</h2>
        <p class="body-text">${escapeHtml(slide.conteudo)}</p>`;
      break;
    case "lista":
      inner = `
        <div class="kicker">${escapeHtml(slide.kicker ?? "Pontos-chave")}</div>
        <div class="regua"></div>
        <h2>${escapeHtml(slide.titulo)}</h2>
        <ul class="lista">${slide.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      break;
    case "dica":
      inner = `
        <div class="kicker">💡 ${escapeHtml(slide.kicker ?? "Dica de revisão")}</div>
        <div class="regua"></div>
        <div class="card-destaque">
          <h2 style="margin-bottom:0">${escapeHtml(slide.titulo)}</h2>
          <p class="body-text" style="margin-top:24px">${escapeHtml(slide.conteudo)}</p>
        </div>`;
      break;
    case "cta":
      if (slide.preco) {
        inner = `
          <div class="kicker">${escapeHtml(slide.kicker ?? "Resumo completo")}</div>
          <div class="regua"></div>
          <h2>${escapeHtml(slide.titulo)}</h2>
          <div class="preco">${escapeHtml(slide.preco)}</div>
          <div class="cta-botao">${escapeHtml(slide.botao ?? "Link na bio →")}</div>`;
      } else {
        inner = `
          <div class="kicker">${escapeHtml(slide.kicker ?? "Gostou da revisão?")}</div>
          <div class="regua"></div>
          <h2>${escapeHtml(slide.titulo)}</h2>
          <p class="body-text">${escapeHtml(slide.conteudo ?? "")}</p>
          <div class="cta-botao">${escapeHtml(slide.botao ?? "Seguir →")}</div>`;
      }
      break;
    default:
      throw new Error(`Tipo de slide desconhecido: ${slide.tipo}`);
  }

  let styleAttr = "";
  if (slide.tipo === "capa" && slide.foto) {
    const { bg } = CORES[corClasse(cor)];
    const overlay = `linear-gradient(165deg, ${hexParaRgba(bg, 0.55)}, ${hexParaRgba(bg, 0.88)})`;
    styleAttr = ` style="background-image: ${overlay}, url('../../../identidade/fotos/${slide.foto}'); background-size: cover; background-position: center ${slide.fotoPosicao ?? "center"};"`;
  }

  return `<div class="slide ${corClasse(cor)}"${styleAttr}>${topBar}<div class="center-block">${inner}</div></div>`;
}

const CORES_AUXILIARES_CSS = `
  .roxo      { background: #667eea; color: #FAFAF7; }
  .verde     { background: #43e97b; color: #1A1A1A; }
  .roxo-esc  { background: #764ba2; color: #FAFAF7; }
  .rosa      { background: #f093fb; color: #1A1A1A; }
  .azul      { background: #4facfe; color: #1A1A1A; }
  .coral     { background: #fa709a; color: #FAFAF7; }

  .roxo .regua, .roxo-esc .regua, .coral .regua { background: #FAFAF7; }
  .verde .regua, .rosa .regua, .azul .regua { background: #1A1A1A; }
  .roxo .cta-botao, .roxo-esc .cta-botao { background: #FAFAF7; color: #667eea; }
  .coral .cta-botao { background: #FAFAF7; color: #fa709a; }
`;

async function gerar(jsonPath) {
  const conteudo = JSON.parse(await readFile(jsonPath, "utf-8"));
  const { disciplina, tema, slides, cores } = conteudo;

  const paletaPadrao = ["roxo", "verde", "roxo-esc", "rosa", "azul", "coral"];
  const paleta = cores ?? paletaPadrao;

  const slidesHtml = slides
    .map((slide, i) => renderSlide(slide, i, slides.length, paleta[i % paleta.length]))
    .join("\n");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Revisão Rápida — ${escapeHtml(disciplina)}: ${escapeHtml(tema)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>${CSS_BASE}${CORES_AUXILIARES_CSS}</style>
</head>
<body>
${slidesHtml}
</body>
</html>
`;

  const outDir = dirname(jsonPath);
  await mkdir(join(outDir, "instagram"), { recursive: true });
  await writeFile(join(outDir, "carrossel.html"), html, "utf-8");
  await copyFile(join(__dirname, "_render-template.js"), join(outDir, "render.js"));
  console.log(`Gerado: ${join(outDir, "carrossel.html")}`);
}

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Uso: node scripts/gerar-carrossel-educativo.js <caminho-do-conteudo.json>");
  process.exit(1);
}

gerar(jsonPath).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
