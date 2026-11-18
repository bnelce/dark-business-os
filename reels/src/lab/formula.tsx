import katex from "katex";
import "katex/dist/katex.min.css";
import { continueRender, delayRender, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useEffect, useState } from "react";
import { PRETO } from "../aula/cena";
import { paperJitter } from "../remocn/stop-motion";

/** Espera as fontes do KaTeX, que vêm por CSS e o Remotion não aguarda sozinho.
 *  Sem isso os primeiros quadros saem com fonte de fallback e a fórmula "pula". */
export const useFontesKatex = () => {
  const [handle] = useState(() => delayRender("fontes do KaTeX"));
  useEffect(() => {
    Promise.all([
      document.fonts.load("76px KaTeX_Main"),
      document.fonts.load("italic 76px KaTeX_Math"),
      document.fonts.load("bold 76px KaTeX_Main"),
    ])
      .then(() => continueRender(handle))
      .catch((err) => {
        console.error("KaTeX: fontes não carregaram", err);
        continueRender(handle);
      });
  }, [handle]);
};

/** Fórmula dentro de cartão com sombra dura: o container carrega a identidade da casa,
 *  a notação continua precisa. Sozinha, a fonte do KaTeX lê como livro didático colado
 *  por cima de um zine. */
export const Formula: React.FC<{
  tex: string; at: number; y: number; tamanho?: number; cor?: string; seed?: string; fundo?: string;
}> = ({ tex, at, y, tamanho = 76, cor = PRETO, seed = "f", fundo = "#FFFDF6" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: { damping: 200 }, durationInFrames: 10 });
  if (p <= 0.001) return null;
  const jt = paperJitter(f, seed, { amp: 0.9, rotAmp: 0.18 });
  // displayMode adiciona 1em de margem em cima e embaixo; dentro do cartão isso vira
  // espaço morto e frações empilhadas se sobrepõem. \displaystyle mantém o tamanho grande.
  const html = katex.renderToString(`\\displaystyle ${tex}`, { throwOnError: true, displayMode: false, output: "html" });
  return (
    <div style={{
      position: "absolute", top: y, left: 0, width: "100%", display: "flex", justifyContent: "center",
      opacity: p, transform: `translateY(${(1 - p) * 24}px) scale(${0.9 + 0.1 * p}) rotate(${jt.rot}deg)`,
      color: cor, fontSize: tamanho,
    }}>
      <div style={{
        background: fundo, border: `6px solid ${PRETO}`, borderRadius: 14,
        boxShadow: `10px 11px 0 ${PRETO}`, padding: "18px 44px",
      }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};
