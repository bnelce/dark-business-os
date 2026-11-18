// Peças compartilhadas pelos scripts da skill motion-graphics:
// argumentos, Playwright, servidor local, clique de início, prontidão e ffmpeg.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { execFileSync } = require("node:child_process");

const PLAYWRIGHT_FALLBACK = require("node:path").join(require("node:os").homedir(), "Projetos/VENDAS-IG/node_modules/playwright");

// ---------- argumentos ----------
// lerArgs(process.argv.slice(2), ["preview", "png"]) → { _: [posicionais], preview: true, w: "1080" }
function lerArgs(argv, booleanos = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help" || a === "--ajuda") { out.ajuda = true; continue; }
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const [chave, valorIgual] = a.slice(2).split(/=(.*)/s);
    if (valorIgual !== undefined) out[chave] = valorIgual;
    else if (booleanos.includes(chave)) out[chave] = true;
    else if (i + 1 < argv.length) out[chave] = argv[++i];
    else out[chave] = true;
  }
  return out;
}
const num = (v, padrao) => (v === undefined || v === true || v === "" || isNaN(+v) ? padrao : +v);

// ---------- Playwright ----------
function carregarPlaywright(basesExtras = []) {
  const candidatos = [];
  if (process.env.PLAYWRIGHT_PATH) candidatos.push(process.env.PLAYWRIGHT_PATH);
  for (const base of [process.cwd(), ...basesExtras]) {
    try { candidatos.push(require.resolve("playwright", { paths: [base] })); } catch (_) { /* não tem aqui */ }
  }
  candidatos.push(PLAYWRIGHT_FALLBACK);
  const tentados = [];
  for (const c of [...new Set(candidatos)]) {
    try { const pw = require(c); if (pw.chromium) return { chromium: pw.chromium, origem: c }; } catch (_) { tentados.push(c); }
  }
  const msg = [
    "Playwright não encontrado.",
    "Procurei no projeto atual (" + process.cwd() + "), na pasta do HTML e em:",
    ...tentados.map((t) => "  - " + t),
    "Resolva de um destes jeitos:",
    "  1) no projeto: npm i -D playwright && npx playwright install chromium",
    "  2) aponte um existente: PLAYWRIGHT_PATH=/caminho/node_modules/playwright node <script> ...",
  ].join("\n");
  throw new Error(msg);
}

function argsChromium({ mudo = false } = {}) {
  const a = ["--autoplay-policy=no-user-gesture-required", "--enable-gpu", "--ignore-gpu-blocklist"];
  if (process.platform === "darwin") a.push("--use-angle=metal");
  if (mudo) a.push("--mute-audio");
  return a;
}

async function abrirNavegador(chromium, opcoes = {}) {
  try {
    return await chromium.launch({ headless: true, args: argsChromium(opcoes) });
  } catch (e) {
    if (/Executable doesn't exist|browserType\.launch/i.test(e.message)) {
      throw new Error("O Chromium do Playwright não está instalado para essa versão.\nRode: npx playwright install chromium\n\n" + e.message.split("\n")[0]);
    }
    throw e;
  }
}

// ---------- servidor estático (com Range, para áudio e vídeo) ----------
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".cjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".map": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".avif": "image/avif", ".ico": "image/x-icon",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".webm": "video/webm",
  ".mp4": "video/mp4", ".mov": "video/quicktime",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
  ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".hdr": "application/octet-stream", ".wasm": "application/wasm",
};

function servirPasta(pasta) {
  const raiz = path.resolve(pasta);
  const srv = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, "http://local").pathname); } catch (_) { res.writeHead(400); return res.end(); }
    let p = path.resolve(raiz, "." + rel);
    if (p !== raiz && !p.startsWith(raiz + path.sep)) { res.writeHead(403); return res.end(); }
    let st;
    try { st = fs.statSync(p); if (st.isDirectory()) { p = path.join(p, "index.html"); st = fs.statSync(p); } }
    catch (_) { res.writeHead(404); return res.end(); }
    const cab = {
      "Content-Type": TIPOS[path.extname(p).toLowerCase()] || "application/octet-stream",
      "Accept-Ranges": "bytes", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*",
    };
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      let ini = range[1] ? +range[1] : 0, fim = range[2] ? +range[2] : st.size - 1;
      if (!range[1] && range[2]) { ini = Math.max(0, st.size - +range[2]); fim = st.size - 1; }
      fim = Math.min(fim, st.size - 1);
      if (ini > fim) { res.writeHead(416, { "Content-Range": `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { ...cab, "Content-Range": `bytes ${ini}-${fim}/${st.size}`, "Content-Length": fim - ini + 1 });
      if (req.method === "HEAD") return res.end();
      return fs.createReadStream(p, { start: ini, end: fim }).pipe(res);
    }
    res.writeHead(200, { ...cab, "Content-Length": st.size });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok({ base: `http://127.0.0.1:${srv.address().port}`, fechar: () => srv.close() })));
}

// Resolve pasta/arquivo/raiz → { raiz, rel } onde rel é o caminho do HTML dentro da raiz servida.
function resolverPagina(pasta, arquivo = "index.html", raizOpc) {
  const dir = path.resolve(pasta);
  const html = path.resolve(dir, arquivo);
  if (!fs.existsSync(html)) throw new Error(`Não achei ${html}`);
  const raiz = path.resolve(raizOpc || dir);
  const rel = path.relative(raiz, html);
  if (rel.startsWith("..")) throw new Error(`--raiz (${raiz}) precisa conter o HTML (${html})`);
  return { raiz, rel: rel.split(path.sep).map(encodeURIComponent).join("/"), html };
}

function montarUrl(base, rel, params = []) {
  const q = params.filter(Boolean).join("&");
  return `${base}/${rel}${q ? "?" + q : ""}`;
}

// ---------- página ----------
// Lê o que a página declara em window.MOTION (contrato da skill). Campos ausentes voltam null.
async function lerMotion(page) {
  return page.evaluate(() => {
    const m = window.MOTION || {};
    const n = (v) => (isFinite(+v) && +v > 0 ? +v : null);
    return { dur: n(m.dur) || n(window.DUR), w: n(m.w), h: n(m.h), atraso: isFinite(+m.atraso) ? +m.atraso : null, temContrato: !!window.MOTION };
  });
}

// Se o usuário não passou --w/--h e a página declara outro tamanho, ajusta a janela e recarrega.
async function ajustarJanela(page, args, info, recarregar) {
  if (args.w || args.h || !info.w || !info.h) return false;
  const vp = page.viewportSize();
  if (vp.width === info.w && vp.height === info.h) return false;
  await page.setViewportSize({ width: info.w, height: info.h });
  await recarregar();
  return true;
}

// Espera window.MOTION.pronto. Páginas sem contrato seguem depois de uma pausa curta.
// Com relógio virtual, avança o tempo enquanto espera (timeouts de fonte são virtuais).
async function esperarPronto(page, { virtual = false, limiteMs = 25000 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const estado = await page.evaluate(() => (window.MOTION && "pronto" in window.MOTION ? !!window.MOTION.pronto : null));
    if (estado === true) return "pronto";
    if (estado === null && Date.now() - t0 > 800) return "sem contrato";
    if (Date.now() - t0 > limiteMs) throw new Error("A página não ficou pronta em 25 s (window.MOTION.pronto continuou false). Veja os erros de console.");
    if (virtual) await page.evaluate(() => window.__advance && window.__advance(1000 / 30));
    await page.waitForTimeout(50);
  }
}

async function clicarInicio(page, w, h) {
  for (const sel of ["#start", "[data-start]", "button", "[role=button]"]) {
    const el = page.locator(`${sel}:visible`).first();
    if (await el.count()) {
      try { await el.click({ timeout: 3000 }); return sel; } catch (_) { /* tenta o próximo */ }
    }
  }
  await page.mouse.click(Math.round(w / 2), Math.round(h / 2));
  return "centro da tela";
}

function registrarErros(page, log, prefixo = "") {
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) log.push(`${prefixo}[${m.type()}] ${m.text()}`); });
  page.on("pageerror", (e) => log.push(`${prefixo}[pageerror] ${e.message}`));
  page.on("requestfailed", (r) => log.push(`${prefixo}[requestfailed] ${r.url()} ${r.failure()?.errorText || ""}`));
  page.on("response", (r) => { if (r.status() >= 400) log.push(`${prefixo}[http ${r.status()}] ${r.url()}`); });
}
const ehErroGrave = (l) => /\[(pageerror|requestfailed|http 4\d\d|http 5\d\d)\]/.test(l);

// ---------- ffmpeg ----------
function exigirFfmpeg() {
  for (const bin of ["ffmpeg", "ffprobe"]) {
    try { execFileSync(bin, ["-version"], { stdio: "ignore" }); } catch (_) { throw new Error(`${bin} não encontrado no PATH (brew install ffmpeg).`); }
  }
}
function ffprobeJson(arquivo) {
  return JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", arquivo]).toString());
}
function dimensoes(arquivo) {
  const v = ffprobeJson(arquivo).streams.find((s) => s.codec_type === "video");
  return { w: v.width, h: v.height };
}

// Folha de contato com o filtro tile do ffmpeg (este ffmpeg não tem drawtext:
// o tempo de cada quadro fica só no nome do arquivo).
function montarFolha(imagens, saida, { colunas, largura } = {}) {
  if (!imagens.length) throw new Error("Nenhuma imagem para a folha.");
  const { w, h } = dimensoes(imagens[0]);
  const retrato = h > w * 1.2, paisagem = w > h * 1.2;
  const cols = colunas || (retrato ? 6 : paisagem ? 3 : 4);
  const cel = largura || (retrato ? 270 : paisagem ? 640 : 400);
  const linhas = Math.ceil(imagens.length / cols);
  const lista = path.join(path.dirname(saida), `.folha-${process.pid}.txt`);
  fs.writeFileSync(lista, imagens.map((i) => `file '${path.resolve(i).replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista,
      "-vf", `scale=${cel}:-2:flags=lanczos,tile=${cols}x${linhas}:padding=8:margin=8:color=0x808080`,
      "-frames:v", "1", "-update", "1", saida]);
  } finally { fs.rmSync(lista, { force: true }); }
  return { cols, linhas, cel };
}

module.exports = {
  lerArgs, num, carregarPlaywright, argsChromium, abrirNavegador, servirPasta, resolverPagina, montarUrl,
  lerMotion, ajustarJanela, esperarPronto, clicarInicio, registrarErros, ehErroGrave,
  exigirFfmpeg, ffprobeJson, dimensoes, montarFolha,
};
