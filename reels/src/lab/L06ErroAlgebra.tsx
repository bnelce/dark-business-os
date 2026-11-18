import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Papel, Assinatura, SANS, TINTA, PAPEL, PALETA, ramp } from "./base";
import { Handwrite } from "../remocn/handwrite";
import { PaperWobble } from "../remocn/paper-wobble";

// 06 — Matemática: o erro sendo COMETIDO e depois riscado.
// A gramática aqui é a da correção: caneta vermelha por cima do que estava errado.
const TOTAL = 330;

export const L06ErroAlgebra: React.FC = () => {
  const f = useCurrentFrame();
  const risco = ramp(f, 150, 176);

  return (
    <AbsoluteFill style={{ background: PAPEL }}>
      <Papel total={TOTAL} />

      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 62, color: TINTA, letterSpacing: -1.5 }}>
          90% ERRA ISSO
        </div>
        <div style={{ marginTop: 8, fontFamily: SANS, fontWeight: 600, fontSize: 30, color: "rgba(31,26,23,0.5)", letterSpacing: 3 }}>
          MATEMÁTICA · POTENCIAÇÃO
        </div>
      </div>

      <div style={{ position: "absolute", top: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 96, color: TINTA, opacity: ramp(f, 20, 40) }}>
          (a + b)²
        </div>
      </div>

      {/* a resposta errada, escrita à mão */}
      <div style={{ position: "absolute", top: 610, left: 0, width: "100%", height: 200 }}>
        <Handwrite text="= a² + b²" delay={20} fontSize={92} color={TINTA} align="center" perStep={1.5} />
      </div>

      {/* risco em vermelho */}
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {risco > 0 && (
          <line x1={300} y1={700} x2={300 + 480 * risco} y2={694} stroke="#D63A3A" strokeWidth={13} strokeLinecap="round" />
        )}
      </svg>
      {f > 178 && (
        <div style={{ position: "absolute", top: 636, right: 96, opacity: ramp(f, 178, 194), transform: "rotate(-9deg)" }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 58, color: "#D63A3A" }}>NÃO</span>
        </div>
      )}

      {/* a correta */}
      {f > 205 && (
        <div style={{ position: "absolute", top: 880, width: "100%", display: "flex", justifyContent: "center", opacity: ramp(f, 205, 222) }}>
          <PaperWobble seed="certa" amp={2} rotAmp={0.4}>
            <div style={{ background: "#FFFDF4", padding: "34px 52px", border: `5px solid ${PALETA.verde}`, borderRadius: 10, transform: "rotate(-1.4deg)", boxShadow: "0 16px 34px rgba(0,0,0,0.16)" }}>
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color: TINTA }}>a² + 2ab + b²</span>
            </div>
          </PaperWobble>
        </div>
      )}

      <div style={{ position: "absolute", top: 1180, left: 0, width: "100%", height: 260 }}>
        {f > 245 && <Handwrite text={"o quadrado da soma\nnão é a soma dos quadrados"} delay={245} fontSize={54} color="rgba(31,26,23,0.8)" align="center" perStep={3.2} />}
      </div>

      {f > 296 && (
        <div style={{ position: "absolute", bottom: 250, width: "100%", textAlign: "center", opacity: ramp(f, 296, 312) }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: TINTA, background: PALETA.amarelo, padding: "10px 22px", borderRadius: 8 }}>
            faltou o 2ab do meio
          </span>
        </div>
      )}
      <Assinatura />
    </AbsoluteFill>
  );
};
export const L06_TOTAL = TOTAL;
