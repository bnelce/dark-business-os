import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { Assinatura, SANS, PALETA, ramp } from "./base";

// 07 — Tipografia cinética. Sem papel, sem foto: o tipo É a imagem.
// Gramática oposta à do caderno — rápida, gráfica, sem textura.
const TOTAL = 300;
const BLOCOS = [
  { txt: "TODO CORPO", sub: "", fundo: "#0E0E12", cor: "#FAFAF7", de: 0, ate: 46 },
  { txt: "FICA PARADO", sub: "…se ninguém empurrar", fundo: PALETA.roxo, cor: "#0E0E12", de: 46, ate: 100 },
  { txt: "F = m · a", sub: "força muda a velocidade", fundo: PALETA.coral, cor: "#0E0E12", de: 100, ate: 158 },
  { txt: "TODA AÇÃO", sub: "", fundo: "#0E0E12", cor: "#FAFAF7", de: 158, ate: 200 },
  { txt: "TEM REAÇÃO", sub: "igual e contrária", fundo: PALETA.verde, cor: "#0E0E12", de: 200, ate: 258 },
  { txt: "NEWTON", sub: "as 3 leis, em 10 segundos", fundo: "#0E0E12", cor: PALETA.amarelo, de: 258, ate: TOTAL },
];

export const L07Cinetica: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = [...BLOCOS].reverse().find((x) => f >= x.de) ?? BLOCOS[0];
  const local = f - b.de;
  const ent = spring({ frame: local, fps, config: { damping: 200 }, durationInFrames: 9 });
  // escala que "estoura" na entrada
  const esc = interpolate(ent, [0, 1], [1.22, 1]);
  const letras = Array.from(b.txt);

  return (
    <AbsoluteFill style={{ background: b.fundo, alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${esc})`, textAlign: "center", padding: "0 50px" }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: b.txt.length > 10 ? 96 : b.txt.length > 7 ? 118 : 142, color: b.cor, letterSpacing: -4, lineHeight: 0.95 }}>
          {letras.map((c, i) => {
            const li = spring({ frame: local - i * 1.1, fps, config: { damping: 200 }, durationInFrames: 8 });
            return (
              <span key={i} style={{ display: "inline-block", opacity: li, transform: `translateY(${(1 - li) * 46}px)`, whiteSpace: "pre" }}>{c}</span>
            );
          })}
        </div>
        {b.sub && (
          <div style={{ marginTop: 34, fontFamily: SANS, fontWeight: 600, fontSize: 46, color: b.cor, opacity: ramp(local, 12, 24) * 0.78 }}>
            {b.sub}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", top: 108, fontFamily: SANS, fontWeight: 700, fontSize: 26, color: b.cor, opacity: 0.5, letterSpacing: 5 }}>
        FÍSICA
      </div>
      <Assinatura claro={b.fundo === "#0E0E12"} />
    </AbsoluteFill>
  );
};
export const L07_TOTAL = TOTAL;
