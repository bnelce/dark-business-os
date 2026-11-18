// Duplicação deliberada: reels/ é um pacote npm separado e não importa daqui.
// Os mesmos valores vivem em reels/src/Root.tsx (<Composition fps width height>)
// e os dois lados TÊM que bater. O teste em timeline.test.js lê o Root.tsx como
// texto e pega a divergência antes do render e do gasto de TTS.
export const FPS = 30;
export const LARGURA = 1080;
export const ALTURA = 1920;
export const DURACAO_MIN_S = 15;
export const DURACAO_MAX_S = 25;

// Pausa acrescentada ao fim de cada beat, pra fala não emendar na próxima cartela.
const RESPIRO_PADRAO_S = 0.35;

export function montarTimeline(beats, { respiroS = RESPIRO_PADRAO_S } = {}) {
  let cursor = 0;
  const comFrames = beats.map((beat) => {
    const frames = Math.ceil((beat.duracao + respiroS) * FPS);
    const item = { id: beat.id, arquivo: beat.arquivo, deFrame: cursor, frames };
    cursor += frames;
    return item;
  });

  return { fps: FPS, totalFrames: cursor, totalSegundos: cursor / FPS, beats: comFrames };
}

export function verificarLimitesDeDuracao(timeline) {
  const erros = [];
  const s = timeline.totalSegundos;

  if (s < DURACAO_MIN_S) {
    erros.push(`Reel curto demais: ${s.toFixed(1)}s, mínimo ${DURACAO_MIN_S}s. Escreva mais texto de narração.`);
  }
  if (s > DURACAO_MAX_S) {
    erros.push(`Reel longo demais: ${s.toFixed(1)}s, máximo ${DURACAO_MAX_S}s. Corte narração.`);
  }
  return erros;
}
