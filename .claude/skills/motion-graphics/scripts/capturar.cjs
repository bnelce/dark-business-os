#!/usr/bin/env node
// QA ao vivo de uma animação HTML: serve a pasta por http, abre a página, clica para começar,
// mede o fps real segundo a segundo, tira prints em tempo real e grava erros de console.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const C = require("./lib/comum.cjs");

const AJUDA = `Uso: node capturar.cjs <pasta> [opções]

  --arquivo index.html   página dentro da pasta (ex.: index-9x16.html)
  --raiz <dir>           serve uma pasta acima, se o HTML usa ../ (prefira copiar os assets para a pasta)
  --w 1080 --h 1920      janela; sem isso usa o que a página declara em window.MOTION, senão 1920x1080
  --dur 20               duração; sem isso lê window.MOTION.dur
  --tempos 0.5,2,4.5     segundos dos prints; sem isso, 12 pontos espalhados pela duração
  --preview              abre com ?preview (modo leve) para medir o fps da prévia ao vivo
  --query "guias"        parâmetros extras na URL (ex.: guias das zonas seguras)
  --saida <dir>          onde salvar; padrão <pasta>/_captura (ou _captura-preview)
  --sem-fps              pula a medição de fps (que roda a animação inteira uma vez sem prints)
  --sem-folha            não monta folha.png

Saída: NN-tX.Xs.png, folha.png e log.txt (gpu, fps médio/mínimo e por segundo, quadros distintos, erros).
Código de saída 2 se houver erro de página, requisição falha ou animação parada.`;

// Contador de quadros que roda ao lado da página (mesma thread: se a cena trava, ele trava junto).
const SONDA_FPS = `(() => {
  const raf = window.requestAnimationFrame.bind(window), agora = performance.now.bind(performance);
  let ativo = false; const marcas = [];
  const tick = () => { if (!ativo) return; marcas.push(agora()); raf(tick); };
  window.__mgFps = { iniciar() { marcas.length = 0; ativo = true; raf(tick); }, parar() { ativo = false; return marcas.slice(); } };
})();`;

function resumoFps(marcas) {
  if (marcas.length < 2) return { media: 0, minimo: 0, segMin: 0, porSegundo: [] };
  const m0 = marcas[0], baldes = [];
  for (const m of marcas) { const b = Math.floor((m - m0) / 1000); baldes[b] = (baldes[b] || 0) + 1; }
  const cheios = baldes.slice(0, Math.max(1, baldes.length - 1)).map((v) => v || 0);
  const minimo = Math.min(...cheios);
  const media = (marcas.length - 1) / ((marcas[marcas.length - 1] - m0) / 1000);
  return { media: Math.round(media * 10) / 10, minimo, segMin: cheios.indexOf(minimo), porSegundo: cheios };
}

(async () => {
  const args = C.lerArgs(process.argv.slice(2), ["preview", "sem-fps", "sem-folha"]);
  if (args.ajuda || !args._[0]) { console.log(AJUDA); process.exit(args.ajuda ? 0 : 1); }

  const pasta = path.resolve(args._[0]);
  const { raiz, rel } = C.resolverPagina(pasta, args.arquivo || "index.html", args.raiz);
  const params = [args.preview ? "preview" : "", args.query || ""];
  const saida = path.resolve(args.saida || path.join(pasta, args.preview ? "_captura-preview" : "_captura"));
  fs.mkdirSync(saida, { recursive: true });
  for (const f of fs.readdirSync(saida)) if (/^\d\d-.*\.png$|^folha\.png$|^log\.txt$/.test(f)) fs.rmSync(path.join(saida, f));

  const { chromium, origem } = C.carregarPlaywright([pasta]);
  const srv = await C.servirPasta(raiz);
  const url = C.montarUrl(srv.base, rel, params);
  const browser = await C.abrirNavegador(chromium);
  let w = C.num(args.w, 1920), h = C.num(args.h, 1080);
  const log = [];

  async function abrir(etiqueta) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    C.registrarErros(page, log, etiqueta);
    await page.addInitScript(SONDA_FPS);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    let info = await C.lerMotion(page);
    if (await C.ajustarJanela(page, args, info, () => page.reload({ waitUntil: "networkidle", timeout: 60000 }))) {
      ({ width: w, height: h } = page.viewportSize());
      info = await C.lerMotion(page);
    }
    const estado = await C.esperarPronto(page);
    return { page, info, estado };
  }

  try {
    // ---------- 1) fps: a animação inteira, sem prints (print atrapalha a medição) ----------
    let fps = null, info, estado;
    if (!args["sem-fps"]) {
      const a = await abrir("");
      info = a.info; estado = a.estado;
      const durFps = C.num(args.dur, info.dur || 20);
      await C.clicarInicio(a.page, w, h);
      await a.page.evaluate(() => window.__mgFps.iniciar());
      await a.page.waitForTimeout(Math.min(durFps, 60) * 1000);
      fps = resumoFps(await a.page.evaluate(() => window.__mgFps.parar()));
      await a.page.close();
    }

    // ---------- 2) prints em tempo real ----------
    const b = await abrir(args["sem-fps"] ? "" : "[prints] ");
    info = b.info; estado = b.estado;
    const page = b.page;
    const dur = C.num(args.dur, info.dur || 20);
    const tempos = args.tempos
      ? String(args.tempos).split(",").map(Number).filter((x) => isFinite(x))
      : Array.from({ length: 12 }, (_, i) => Math.round((0.5 + (i * (dur - 0.3)) / 11.5) * 10) / 10);
    await page.screenshot({ path: path.join(saida, "00-antes-do-clique.png") });
    const gpu = await page.evaluate(() => {
      try { const gl = document.createElement("canvas").getContext("webgl"); const ext = gl.getExtension("WEBGL_debug_renderer_info"); return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL); }
      catch (_) { return "sem webgl"; }
    });
    const clicou = await C.clicarInicio(page, w, h);
    const t0 = Date.now();
    const arquivos = [], hashes = new Set();
    for (const [i, t] of tempos.entries()) {
      const falta = t * 1000 - (Date.now() - t0);
      if (falta > 0) await page.waitForTimeout(falta);
      const real = ((Date.now() - t0) / 1000).toFixed(1);
      const arq = path.join(saida, `${String(i + 1).padStart(2, "0")}-t${real}s.png`);
      const buf = await page.screenshot({ path: arq });
      hashes.add(crypto.createHash("md5").update(buf).digest("hex"));
      arquivos.push(arq);
    }
    await page.waitForTimeout(400); // pega erro que só aparece no fim
    await page.close();

    // ---------- relatório ----------
    const graves = log.filter(C.ehErroGrave);
    const parada = tempos.length >= 3 && hashes.size <= 1;
    const linhas = [
      `pagina: ${url}`,
      `janela: ${w}x${h} | duração: ${dur}s | contrato window.MOTION: ${info.temContrato ? "sim" : "não"} (${estado}) | clique: ${clicou}`,
      `gpu: ${gpu}`,
      fps ? `fps médio: ${fps.media} | fps mínimo: ${fps.minimo} (no segundo ${fps.segMin})` : "fps: não medido (--sem-fps)",
      fps ? `fps por segundo: ${fps.porSegundo.join(" ")}` : "",
      `quadros distintos nos prints: ${hashes.size} de ${tempos.length}${parada ? "  << ALERTA: nada se mexeu (init quebrou? clique não pegou?)" : ""}`,
      `erros graves: ${graves.length} | avisos/erros de console: ${log.length}`,
      `playwright: ${origem}`,
      ...log,
    ].filter(Boolean);
    fs.writeFileSync(path.join(saida, "log.txt"), linhas.join("\n") + "\n");

    if (!args["sem-folha"]) {
      try { C.exigirFfmpeg(); C.montarFolha([path.join(saida, "00-antes-do-clique.png"), ...arquivos], path.join(saida, "folha.png")); }
      catch (e) { console.warn("folha.png não montada: " + e.message.split("\n")[0]); }
    }

    console.log(linhas.slice(1, 7).join("\n"));
    log.slice(0, 15).forEach((l) => console.log("  " + l.slice(0, 300)));
    if (log.length > 15) console.log(`  ... mais ${log.length - 15} linhas em log.txt`);
    console.log(`prints e folha em: ${saida}`);
    process.exitCode = graves.length || parada ? 2 : 0;
  } finally {
    await browser.close();
    srv.fechar();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
