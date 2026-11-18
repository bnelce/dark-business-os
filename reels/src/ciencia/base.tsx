import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CIANO, FUNDO, FUNDO_CENTRO, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";

// Peças comuns dos reels de dados do Ciência Visual: fundo, manchete, linha de status,
// fonte dos dados e cartela da marca. Medidas pensadas pra 1080x1920 com a área segura
// do Reels (legenda e botões cobrem a base e a lateral direita).
// O Apuracao.tsx é anterior a este arquivo e tem cópias locais destas peças.

export const entre = (f: number, de: number, ate: number, easing?: (t: number) => number) =>
  interpolate(f, [de, ate], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** Entra e sai com fade curto; fora da janela vale 0. */
export const janela = (f: number, de: number, ate: number, fade = 8) =>
  Math.min(entre(f, de, de + fade), 1 - entre(f, ate - fade, ate));

/** Margens do conteúdo (gráficos, status, listas). */
export const X0 = 130, X1 = 940;

export const Fundo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 48%, ${FUNDO_CENTRO} 0%, ${FUNDO} 70%)` }}>
    {children}
  </AbsoluteFill>
);

/** Manchete no topo (ou no centro, pra cartela sem gráfico). `de` negativo = já visível no quadro 0. */
export const Manchete: React.FC<{ de: number; ate: number; centro?: boolean; children: React.ReactNode }> = ({
  de, ate, centro, children,
}) => {
  const f = useCurrentFrame();
  const o = janela(f, de, ate);
  if (o <= 0) return null;
  return (
    <div style={{
      position: "absolute", top: centro ? 780 : 170, left: 90, right: 90, opacity: o, textAlign: centro ? "center" : undefined,
      translate: `0 ${(1 - entre(f, de, de + 10)) * 14}px`,
      fontFamily: SORA, fontWeight: 300, fontSize: 64, lineHeight: 1.14, color: TEXTO, whiteSpace: "pre-line", letterSpacing: -0.5,
    }}>
      {children}
    </div>
  );
};

export const Destaque: React.FC<{ cor?: string; children: React.ReactNode }> = ({ cor = CIANO, children }) => (
  <span style={{ color: cor, fontWeight: 400 }}>{children}</span>
);

export const Status: React.FC<{ esquerda: string; direita?: string; opacidade?: number; top?: number }> = ({ esquerda, direita, opacidade = 1, top = 452 }) => (
  <div style={{
    position: "absolute", top, left: X0, width: X1 - X0, display: "flex", justifyContent: "space-between",
    fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: TEXTO_2, opacity: opacidade,
  }}>
    <span>{esquerda}</span><span>{direita}</span>
  </div>
);

export const Fonte: React.FC<{ texto: string; ate: number }> = ({ texto, ate }) => {
  const f = useCurrentFrame();
  return (
    <div style={{
      position: "absolute", top: 1665, width: "100%", textAlign: "center", opacity: 1 - entre(f, ate, ate + 15),
      fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2,
    }}>
      {texto}
    </div>
  );
};

export const Marca: React.FC<{ de: number }> = ({ de }) => {
  const f = useCurrentFrame();
  const o = entre(f, de, de + 20);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o, background: `rgba(5,7,12,${0.85 * o})` }}>
      <Img src={staticFile("ciencia/icone.png")} style={{ width: 300, height: 300 }} />
      <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 46, letterSpacing: "0.26em", color: TEXTO, marginTop: 24 }}>
        CIÊNCIA VISUAL
      </div>
    </AbsoluteFill>
  );
};
