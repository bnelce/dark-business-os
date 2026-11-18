import { execFileSync } from "node:child_process";
import { LARGURA, ALTURA, FPS, DURACAO_MIN_S, DURACAO_MAX_S } from "./timeline.js";

export function inspecionarMp4(caminho) {
  const bruto = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate",
    "-show_entries", "format=duration",
    "-of", "json",
    caminho,
  ]).toString();

  const dados = JSON.parse(bruto);
  const video = dados.streams.find((s) => s.codec_type === "video");
  if (!video) throw new Error(`Sem faixa de vídeo em ${caminho}`);

  const [num, den] = String(video.r_frame_rate).split("/").map(Number);

  const duracao = Number.parseFloat(dados.format?.duration);
  if (!Number.isFinite(duracao)) {
    throw new Error(`Duração inválida (ffprobe não reportou format.duration) em ${caminho}`);
  }

  return {
    largura: video.width,
    altura: video.height,
    fps: Math.round(num / (den || 1)),
    codec: video.codec_name,
    duracao,
    temAudio: dados.streams.some((s) => s.codec_type === "audio"),
  };
}

// duracaoMinS/duracaoMaxS têm default do formato curto (quiz relâmpago etc.,
// ver timeline.js). O aula-reel (várias cenas) mira até 90s — ver .claude/skills/aula-reel —
// então publicar.js passa uma faixa maior pra esse formato em vez de mudar o default
// compartilhado com o resto do pipeline.
export function validarMp4(caminho, opcoes = {}) {
  const { duracaoMinS = DURACAO_MIN_S, duracaoMaxS = DURACAO_MAX_S } = opcoes;
  const info = inspecionarMp4(caminho);
  const erros = [];

  if (info.largura !== LARGURA || info.altura !== ALTURA) {
    erros.push(`Dimensões erradas: ${info.largura}x${info.altura}, esperado ${LARGURA}x${ALTURA} (9:16)`);
  }
  if (info.fps !== FPS) erros.push(`FPS errado: ${info.fps}, esperado ${FPS}`);
  if (info.codec !== "h264") erros.push(`Codec errado: ${info.codec}, esperado h264`);
  if (!info.temAudio) erros.push("Vídeo sem faixa de áudio — o Instagram entrega menos e a narração sumiu");
  if (info.duracao < duracaoMinS || info.duracao > duracaoMaxS) {
    erros.push(`Duração fora da faixa: ${info.duracao.toFixed(1)}s, esperado entre ${duracaoMinS}s e ${duracaoMaxS}s`);
  }

  return erros;
}
