#!/usr/bin/env node
// Exporta uma animação HTML para MP4 em duas passadas:
//  1) áudio em tempo real: toda conexão com ctx.destination é espelhada num MediaStreamDestination
//     gravado por MediaRecorder, a partir do clique de início;
//  2) vídeo quadro a quadro com relógio virtual (rAF, performance.now, Date.now, setTimeout/setInterval,
//     AudioContext.currentTime e animações CSS/WAAPI), então a qualidade não depende da máquina;
// e junta tudo com ffmpeg.
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const C = require("./lib/comum.cjs");

const AJUDA = `Uso: node gravar.cjs <pasta> <saida.mp4> [opções]

  --arquivo index.html   página dentro da pasta (ex.: index-9x16.html)
  --raiz <dir>           serve uma pasta acima, se o HTML usa ../
  --w 1080 --h 1920      janela de render; sem isso usa window.MOTION, senão 1920x1080
  --dur 20               duração da animação; sem isso lê window.MOTION.dur
  --cauda 0.5            segundos extras no fim (o relógio da página começa ~0,15 s depois do clique)
  --fps 30               quadros por segundo do MP4
  --escala 1             tamanho do MP4 em relação à janela (0.5 = metade); ou --saida-w 1280
  --crf 18               qualidade do x264 (menor = melhor e maior)
  --png                  quadros em PNG (sem perda, mais lento) em vez de JPEG 92
  --sem-audio            MP4 mudo
  --audio trilha.wav     usa esse arquivo como trilha em vez de gravar o Web Audio
  --audio-atraso 0.15    atraso da trilha externa (padrão: window.MOTION.atraso, senão 0)
  --manter               não apaga a pasta temporária com quadros e áudio

Rascunho rápido: --fps 15 --escala 0.5`;

// ---------- passada 1: grava o áudio a partir do clique ----------
const TAP_AUDIO = `(() => {
  const ctxs = (window.__mgCtxs = []);
  const stReal = window.setTimeout.bind(window);
  let gravando = false, clique = 0, tarefaDoClique = false;
  // Atraso de cada trilha em relação ao clique, em segundos de vídeo.
  // Contexto que já existia, ou que nasce na tarefa do clique, tem atraso 0: o relógio dele só anda
  // quando o JavaScript do clique termina, igual ao relógio virtual da passada de vídeo.
  // Contexto que nasce depois (ex.: <audio> tocado por um setTimeout) usa o tempo real até nascer.
  function iniciar(ctx) {
    if (ctx.__mgRec.state !== "inactive") return;
    ctx.__mgRec.start(250);
    ctx.__mgC0 = ctx.currentTime;
    ctx.__mgAtraso = ctx.__mgDepois && !tarefaDoClique ? (performance.now() - clique) / 1000 : 0;
  }
  function preparar(ctx) {
    if (ctx.__mgTap) return ctx.__mgTap;
    const tap = ctx.createMediaStreamDestination();
    const rec = new MediaRecorder(tap.stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 256000 });
    ctx.__mgPedacos = [];
    rec.ondataavailable = (e) => e.data.size && ctx.__mgPedacos.push(e.data);
    ctx.__mgTap = tap; ctx.__mgRec = rec; ctx.__mgDepois = gravando; ctxs.push(ctx);
    if (gravando) iniciar(ctx);
    return tap;
  }
  const conectar = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...resto) {
    const r = conectar.call(this, dest, ...resto);
    if (dest instanceof AudioDestinationNode) {
      const tap = preparar(dest.context);
      try { conectar.call(this, tap, resto[0] || 0); } catch (e) { try { conectar.call(this, tap); } catch (_) {} }
    }
    return r;
  };
  // <audio>/<video> fora do Web Audio: desvia para um contexto que também é gravado
  const tocar = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this.__mgLigado) {
      this.__mgLigado = true;
      try { const c = window.__mgCtxMidia || (window.__mgCtxMidia = new AudioContext()); c.createMediaElementSource(this).connect(c.destination); } catch (_) {}
    }
    return tocar.apply(this, arguments);
  };
  // O zero é o evento click (o mesmo zero do vídeo, cujo relógio fica parado durante o clique).
  // Não usar pointerdown: o Playwright aperta e solta em comandos separados, ~100 ms de diferença.
  const noClique = () => {
    if (gravando) return;
    gravando = true; clique = performance.now(); tarefaDoClique = true;
    stReal(() => { tarefaDoClique = false; }, 0);
    ctxs.forEach(iniciar);
  };
  for (const ev of ["click", "keydown"]) window.addEventListener(ev, noClique, { capture: true });
  window.__mgParar = async () => {
    const out = [], m = window.MOTION || {};
    for (const ctx of ctxs) {
      if (ctx.__mgRec.state === "inactive") continue;
      await new Promise((r) => { ctx.__mgRec.onstop = r; ctx.__mgRec.stop(); });
      const buf = new Uint8Array(await new Blob(ctx.__mgPedacos, { type: "audio/webm" }).arrayBuffer());
      let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      // Contrato: com MOTION.audio = { ctx, t0 } o alinhamento é exato pelo relógio do contexto.
      let atraso = ctx.__mgAtraso || 0, via = "clique";
      if (m.audio && m.audio.ctx === ctx && isFinite(m.audio.t0) && isFinite(m.atraso)) {
        atraso = m.atraso - (m.audio.t0 - ctx.__mgC0); via = "contrato";
      }
      out.push({ b64: btoa(s), atraso, via });
    }
    return out;
  };
})();`;

// ---------- passada 2: relógio virtual ----------
const RELOGIO = `(() => {
  let vt = 0;
  const base = Date.now();
  performance.now = () => vt;
  Date.now = () => base + vt;
  let raf = [], rid = 0;
  window.requestAnimationFrame = (cb) => { raf.push([++rid, cb]); return rid; };
  window.cancelAnimationFrame = (id) => { raf = raf.filter(([i]) => i !== id); };
  let timers = [], tid = 0;
  const stReal = window.setTimeout;
  window.setTimeout = (cb, ms = 0, ...a) => { if (typeof cb !== "function") return stReal(cb, ms); timers.push({ id: ++tid, due: vt + (+ms || 0), cb, a }); return tid; };
  window.clearTimeout = (id) => { timers = timers.filter((t) => t.id !== id); };
  window.setInterval = (cb, ms = 0, ...a) => { const iv = Math.max(+ms || 0, 1); timers.push({ id: ++tid, due: vt + iv, cb, a, iv }); return tid; };
  window.clearInterval = window.clearTimeout;
  Object.defineProperty(BaseAudioContext.prototype, "currentTime", { get() { return vt / 1000; }, configurable: true });
  window.__advance = (ms) => {
    vt += ms;
    for (let guarda = 0; guarda < 1000; guarda++) {
      timers.sort((x, y) => x.due - y.due);
      const t = timers[0];
      if (!t || t.due > vt) break;
      if (t.iv) t.due += t.iv; else timers.shift();
      try { t.cb(...t.a); } catch (e) { console.error(e); }
    }
    try {
      document.getAnimations().forEach((an) => {
        if (an.__st === undefined) { an.__st = vt - (an.currentTime || 0); an.pause(); }
        an.currentTime = vt - an.__st;
      });
    } catch (_) {}
    const q = raf; raf = [];
    q.forEach(([, cb]) => { try { cb(vt); } catch (e) { console.error(e); } });
  };
})();`;

(async () => {
  const args = C.lerArgs(process.argv.slice(2), ["png", "sem-audio", "manter"]);
  if (args.ajuda || args._.length < 2) { console.log(AJUDA); process.exit(args.ajuda ? 0 : 1); }
  C.exigirFfmpeg();

  const pasta = path.resolve(args._[0]);
  const saida = path.resolve(args._[1]);
  const { raiz, rel } = C.resolverPagina(pasta, args.arquivo || "index.html", args.raiz);
  const FPS = C.num(args.fps, 30);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "motion-gravar-"));
  const dirQuadros = path.join(tmp, "quadros");
  fs.mkdirSync(dirQuadros);
  fs.mkdirSync(path.dirname(saida), { recursive: true });

  const { chromium } = C.carregarPlaywright([pasta]);
  const srv = await C.servirPasta(raiz);
  const erros = [];
  let w = C.num(args.w, 1920), h = C.num(args.h, 1080), info = {};

  async function abrir(browser, initScript, params, etiqueta, virtual) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    C.registrarErros(page, erros, etiqueta);
    await page.addInitScript(initScript);
    const url = C.montarUrl(srv.base, rel, params);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    info = await C.lerMotion(page);
    if (await C.ajustarJanela(page, args, info, () => page.reload({ waitUntil: "networkidle", timeout: 60000 }))) {
      ({ width: w, height: h } = page.viewportSize());
      info = await C.lerMotion(page);
    }
    await C.esperarPronto(page, { virtual });
    return page;
  }

  const trilhas = [];
  let total = 0, dur = 0;
  try {
    // ---------- passada 1: áudio ----------
    const usarExterno = args.audio && args.audio !== true;
    if (!args["sem-audio"] && !usarExterno) {
      const browser = await C.abrirNavegador(chromium);
      // ?preview alivia a cena: nesta passada só o som importa
      const page = await abrir(browser, TAP_AUDIO, ["preview", args.query || ""], "[audio] ", false);
      dur = C.num(args.dur, info.dur);
      if (!dur) throw new Error("Não sei a duração: passe --dur <segundos> ou declare window.MOTION.dur na página.");
      total = dur + C.num(args.cauda, 0.5);
      await C.clicarInicio(page, w, h);
      process.stdout.write(`áudio: gravando ${total.toFixed(1)} s em tempo real... `);
      await page.waitForTimeout(total * 1000 + 300);
      const pedacos = await page.evaluate(() => window.__mgParar());
      pedacos.forEach((p, i) => {
        const arq = path.join(tmp, `audio-${i}.webm`);
        fs.writeFileSync(arq, Buffer.from(p.b64, "base64"));
        trilhas.push({ arq, atraso: p.atraso, via: p.via });
      });
      console.log(trilhas.length ? `ok (${trilhas.map((t) => `contexto alinhado por ${t.via}, atraso ${Math.round(t.atraso * 1000)} ms`).join(", ")})` : "nenhum som conectado ao destino");
      await browser.close();
    }

    // ---------- passada 2: vídeo ----------
    const browser = await C.abrirNavegador(chromium, { mudo: true });
    const page = await abrir(browser, RELOGIO, [args.query || ""], "[video] ", true);
    dur = dur || C.num(args.dur, info.dur);
    if (!dur) throw new Error("Não sei a duração: passe --dur <segundos> ou declare window.MOTION.dur na página.");
    total = total || dur + C.num(args.cauda, 0.5);
    if (usarExterno) {
      const atraso = C.num(args["audio-atraso"], info.atraso ?? 0);
      trilhas.push({ arq: path.resolve(args.audio), atraso });
    }
    for (let i = 0; i < 20; i++) await page.evaluate(() => window.__advance(1000 / 30));
    await C.clicarInicio(page, w, h);
    await page.waitForTimeout(1500); // promessas reais: resume() do áudio, decodificação, imagens
    const nQuadros = Math.ceil(total * FPS);
    const ext = args.png ? "png" : "jpg";
    const t0 = Date.now();
    for (let f = 0; f < nQuadros; f++) {
      await page.evaluate((ms) => window.__advance(ms), f === 0 ? 0.0001 : 1000 / FPS);
      const arq = path.join(dirQuadros, `${String(f).padStart(5, "0")}.${ext}`);
      await page.screenshot(args.png ? { path: arq, type: "png" } : { path: arq, type: "jpeg", quality: 92 });
      if (f % FPS === 0 || f === nQuadros - 1) {
        const seg = (Date.now() - t0) / 1000, resta = (seg / (f + 1)) * (nQuadros - f - 1);
        process.stdout.write(`\rvídeo: quadro ${f + 1}/${nQuadros} (${(f / FPS).toFixed(1)} s) · faltam ~${Math.ceil(resta)} s   `);
      }
    }
    console.log("");
    await browser.close();

    // ---------- junta ----------
    let sw = w, sh = h;
    if (args["saida-w"]) { sw = C.num(args["saida-w"], w); sh = Math.round((h * sw) / w); }
    else if (args.escala) { const e = C.num(args.escala, 1); sw = Math.round(w * e); sh = Math.round(h * e); }
    sw -= sw % 2; sh -= sh % 2; // yuv420p exige par
    const ff = ["-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(dirQuadros, `%05d.${ext}`)];
    trilhas.forEach((t) => ff.push("-i", t.arq));
    const vf = sw !== w || sh !== h ? `scale=${sw}:${sh}:flags=lanczos,format=yuv420p` : "format=yuv420p";
    if (trilhas.length) {
      const partes = trilhas.map((t, i) => {
        const ms = Math.round(t.atraso * 1000);
        const ajuste = ms > 5 ? `,adelay=${ms}:all=1` : ms < -5 ? `,atrim=start=${(-ms / 1000).toFixed(3)},asetpts=PTS-STARTPTS` : "";
        return `[${i + 1}:a]aresample=48000${ajuste},apad[a${i}]`;
      });
      const mix = trilhas.length > 1 ? `;${trilhas.map((_, i) => `[a${i}]`).join("")}amix=inputs=${trilhas.length}:normalize=0[aout]` : "";
      ff.push("-filter_complex", partes.join(";") + mix, "-map", "0:v", "-map", trilhas.length > 1 ? "[aout]" : "[a0]");
      ff.push("-c:a", "aac", "-b:a", "192k", "-ar", "48000");
    }
    ff.push("-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", String(C.num(args.crf, 18)), "-profile:v", "high",
      "-r", String(FPS), "-t", String(total), "-movflags", "+faststart", saida);
    execFileSync("ffmpeg", ff, { stdio: ["ignore", "inherit", "inherit"] });

    // ---------- confere ----------
    const pr = C.ffprobeJson(saida);
    const v = pr.streams.find((s) => s.codec_type === "video");
    const temA = pr.streams.some((s) => s.codec_type === "audio");
    const mb = +pr.format.size / 1e6;
    let media, pico;
    if (temA) { // volumedetect escreve no stderr
      const r = spawnSync("ffmpeg", ["-hide_banner", "-i", saida, "-af", "volumedetect", "-vn", "-f", "null", "-"], { encoding: "utf8" });
      media = (/mean_volume: (-?[\d.]+) dB/.exec(r.stderr) || [])[1];
      pico = (/max_volume: (-?[\d.]+) dB/.exec(r.stderr) || [])[1];
    }
    console.log(`${path.basename(saida)}: ${v.width}x${v.height} · ${FPS} fps · ${(+pr.format.duration).toFixed(2)} s · ${mb.toFixed(1)} MB · ` +
      (temA ? `áudio média ${media} dB, pico ${pico} dB` : "SEM áudio"));
    if (temA && media !== undefined && +media < -55) console.log("  ALERTA: áudio praticamente mudo. O som passa pelo AudioContext? O clique iniciou a trilha?");
    if (mb > 7.4) console.log(`  Acima de ~7,4 MB: para enviar pelo conector do Google Drive, rode scripts/drive.sh "${saida}"`);
    const graves = erros.filter(C.ehErroGrave);
    if (erros.length) {
      console.log(`  ${erros.length} aviso(s)/erro(s) de página${graves.length ? ` (${graves.length} grave(s))` : ""}:`);
      [...new Set(erros)].slice(0, 8).forEach((l) => console.log("    " + l.slice(0, 240)));
    }
    if (args.manter) console.log(`  quadros e áudio mantidos em ${tmp}`);
    process.exitCode = graves.length ? 2 : 0;
  } finally {
    srv.fechar();
    if (!args.manter) fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => { console.error("\n" + (e.message || e)); process.exit(1); });
