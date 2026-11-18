import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspecionarMp4, validarMp4 } from "./validar-mp4.js";

function mp4Sintetico(caminho, { largura, altura, segundos, comAudio, fps = 30, codec = "libx264" }) {
  const args = [
    "-f", "lavfi", "-i", `color=c=blue:s=${largura}x${altura}:r=${fps}:d=${segundos}`,
  ];
  if (comAudio) args.push("-f", "lavfi", "-i", `anullsrc=r=44100:cl=stereo`, "-shortest");
  args.push("-c:v", codec, "-pix_fmt", "yuv420p", "-t", String(segundos), "-y", caminho);
  execFileSync("ffmpeg", args, { stdio: "ignore" });
  return caminho;
}

test("inspeciona dimensões, fps, codec e presença de áudio", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mp4-"));
  const arquivo = mp4Sintetico(join(dir, "ok.mp4"), { largura: 1080, altura: 1920, segundos: 16, comAudio: true });

  const info = inspecionarMp4(arquivo);
  assert.equal(info.largura, 1080);
  assert.equal(info.altura, 1920);
  assert.equal(info.fps, 30);
  assert.equal(info.codec, "h264");
  assert.equal(info.temAudio, true);
  assert.ok(Math.abs(info.duracao - 16) < 0.5);
});

test("aprova um mp4 conforme", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mp4-"));
  const arquivo = mp4Sintetico(join(dir, "ok.mp4"), { largura: 1080, altura: 1920, segundos: 18, comAudio: true });
  assert.deepEqual(validarMp4(arquivo), []);
});

test("reprova aspect ratio errado — o modo de falha mais caro", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mp4-"));
  const arquivo = mp4Sintetico(join(dir, "quadrado.mp4"), { largura: 1080, altura: 1080, segundos: 18, comAudio: true });
  const erros = validarMp4(arquivo);
  assert.ok(erros.some((e) => e.includes("1080x1920")));
});

test("reprova vídeo sem faixa de áudio", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mp4-"));
  const arquivo = mp4Sintetico(join(dir, "mudo.mp4"), { largura: 1080, altura: 1920, segundos: 18, comAudio: false });
  const erros = validarMp4(arquivo);
  assert.ok(erros.some((e) => e.includes("áudio")));
});

test("reprova duração fora da faixa", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mp4-"));
  const arquivo = mp4Sintetico(join(dir, "curto.mp4"), { largura: 1080, altura: 1920, segundos: 6, comAudio: true });
  const erros = validarMp4(arquivo);
  assert.ok(erros.some((e) => e.includes("Duração")));
});

test("reprova fps errado", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mp4-"));
  const arquivo = mp4Sintetico(join(dir, "24fps.mp4"), {
    largura: 1080, altura: 1920, segundos: 18, comAudio: true, fps: 24,
  });
  const erros = validarMp4(arquivo);
  assert.ok(erros.some((e) => e.includes("FPS")));
});

test("reprova codec errado", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mp4-"));
  const arquivo = mp4Sintetico(join(dir, "mpeg4.mp4"), {
    largura: 1080, altura: 1920, segundos: 18, comAudio: true, codec: "mpeg4",
  });
  const erros = validarMp4(arquivo);
  assert.ok(erros.some((e) => e.includes("Codec")));
});

test("lança erro claro quando ffprobe não reporta duração, em vez de aprovar em silêncio", async () => {
  // ffmpeg não tem um jeito confiável de produzir um mp4 válido sem format.duration,
  // então este teste stuba o ffprobe: um binário fake na frente do PATH que devolve
  // um JSON conforme em tudo, exceto que "format" não traz "duration".
  const dir = await mkdtemp(join(tmpdir(), "ffprobe-fake-"));
  const fakeFfprobe = join(dir, "ffprobe");
  await writeFile(
    fakeFfprobe,
    [
      "#!/bin/sh",
      "cat <<'JSON'",
      JSON.stringify({
        streams: [
          { codec_type: "video", codec_name: "h264", width: 1080, height: 1920, r_frame_rate: "30/1" },
          { codec_type: "audio" },
        ],
        format: {},
      }),
      "JSON",
    ].join("\n"),
  );
  await chmod(fakeFfprobe, 0o755);

  const pathOriginal = process.env.PATH;
  process.env.PATH = `${dir}:${pathOriginal}`;
  try {
    assert.throws(() => inspecionarMp4("qualquer.mp4"), /duração/i);
  } finally {
    process.env.PATH = pathOriginal;
  }
});
