// Marca do reel: Ciência Visual (padrão) ou A2LO (Shorts do YouTube da A2LO).
// A composição original não muda; a versão A2LO embrulha o mesmo componente em <ComMarca marca="a2lo">,
// o que troca a assinatura do fim (AssinaturaCta) e põe o selo pequeno da A2LO no canto o vídeo todo.
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { MONO, TEXTO } from "./tokens";

const { fontFamily: ANTON } = loadAnton();
const VERDE = "#00B074";
const PAPEL = "#F2F0EB";

export type Marca = "cv" | "a2lo";
const MarcaCtx = createContext<Marca>("cv");
export const useMarca = () => useContext(MarcaCtx);

/** O conteúdo da linha de CTA do fim (ícone + frase). Fica dentro da div posicionada de cada reel. */
export const AssinaturaCta: React.FC<{ sombra?: string }> = ({ sombra }) => {
  const marca = useMarca();
  if (marca === "a2lo") {
    return (
      <>
        <div style={{ position: "relative", fontFamily: ANTON, fontSize: 64, lineHeight: 1, color: PAPEL, letterSpacing: 1, textShadow: sombra }}>
          A2LO
          <div style={{ position: "absolute", left: 2, bottom: -10, width: "48%", height: 7, background: VERDE }} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: TEXTO, textShadow: sombra, lineHeight: 1.35 }}>
          DIAGNÓSTICO GRÁTIS<br /><span style={{ color: VERDE }}>A2LO.DEV</span>
        </div>
      </>
    );
  }
  return (
    <>
      <Img src={staticFile("ciencia/icone.png")} style={{ width: 64, height: 64 }} />
      <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO, textShadow: sombra }}>SEGUE O CIÊNCIA VISUAL</div>
    </>
  );
};

/** Selo pequeno no canto superior esquerdo (fora dos botões do Shorts, que ficam à direita e embaixo). */
const Selo: React.FC = () => (
  <div style={{ position: "absolute", top: 96, left: 56, opacity: 0.9 }}>
    <div style={{ position: "relative", fontFamily: ANTON, fontSize: 40, lineHeight: 1, color: PAPEL, letterSpacing: 1, textShadow: "0 0 10px rgba(5,7,12,0.9)" }}>
      A2LO
      <div style={{ position: "absolute", left: 1, bottom: -7, width: "48%", height: 5, background: VERDE }} />
    </div>
  </div>
);

export const ComMarca: React.FC<{ marca: Marca; children: React.ReactNode }> = ({ marca, children }) => (
  <MarcaCtx.Provider value={marca}>
    <AbsoluteFill>
      {children}
      {marca === "a2lo" && <Selo />}
    </AbsoluteFill>
  </MarcaCtx.Provider>
);
