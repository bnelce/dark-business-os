import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Papel, Titulo, Assinatura, Rotulo, SANS, TINTA, PAPEL, PALETA, ramp } from "./base";

// 01 — Trigonometria: o círculo trigonométrico GERANDO a senoide.
// A ideia: seno não é uma tabela decorada, é a altura de um ponto girando.
const TOTAL = 300;
const CX = 320, CY = 760, R = 215;
const X0 = 600, LARG = 400;

export const L01CircTrig: React.FC = () => {
  const f = useCurrentFrame();
  const t = ramp(f, 40, 275);          // 0→1 percorre a volta
  const ang = t * Math.PI * 2;
  const px = CX + R * Math.cos(ang);
  const py = CY - R * Math.sin(ang);
  const wx = X0 + LARG * t;

  // rastro da senoide até o ângulo atual
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const tt = (i / 120) * t;
    pts.push(`${X0 + LARG * tt},${CY - R * Math.sin(tt * Math.PI * 2)}`);
  }

  return (
    <AbsoluteFill style={{ background: PAPEL }}>
      <Papel total={TOTAL} />
      <Titulo materia="Trigonometria" titulo={"O SENO É\nUMA ALTURA"} />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(31,26,23,0.25)" strokeWidth={4} />
        <line x1={CX - R - 40} y1={CY} x2={X0 + LARG + 30} y2={CY} stroke="rgba(31,26,23,0.3)" strokeWidth={3} />
        <line x1={CX} y1={CY - R - 40} x2={CX} y2={CY + R + 40} stroke="rgba(31,26,23,0.3)" strokeWidth={3} />

        {f > 40 && <>
          {/* raio girando */}
          <line x1={CX} y1={CY} x2={px} y2={py} stroke={PALETA.roxo} strokeWidth={7} strokeLinecap="round" />
          {/* a ALTURA: é isso que é o seno */}
          <line x1={px} y1={CY} x2={px} y2={py} stroke={PALETA.coral} strokeWidth={9} strokeLinecap="round" />
          <line x1={px} y1={py} x2={wx} y2={py} stroke="rgba(31,26,23,0.28)" strokeWidth={3} strokeDasharray="10 12" />
          <circle cx={px} cy={py} r={13} fill={PALETA.roxo} />
          {/* senoide traçada */}
          <polyline points={pts.join(" ")} fill="none" stroke={PALETA.coral} strokeWidth={8} strokeLinecap="round" />
          <circle cx={wx} cy={CY - R * Math.sin(ang)} r={13} fill={PALETA.coral} />
        </>}
      </svg>

      <Rotulo x={CX + 120} y={CY - 60} texto="raio = 1" cor={PALETA.roxo} at={54} tamanho={34} />
      <Rotulo x={px + 90} y={(CY + py) / 2} texto="sen θ" cor={PALETA.coral} at={72} tamanho={40} />

      <div style={{ position: "absolute", top: 1180, width: "100%", textAlign: "center", padding: "0 90px" }}>
        {f > 150 && (
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 52, color: TINTA, opacity: ramp(f, 150, 168), lineHeight: 1.25 }}>
            gira o ponto no círculo<br />e a altura dele desenha a onda
          </div>
        )}
        {f > 205 && (
          <div style={{ marginTop: 40, opacity: ramp(f, 205, 222) }}>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 62, color: TINTA, background: PALETA.amarelo, padding: "10px 22px", borderRadius: 8 }}>
              sen 90° = 1
            </span>
            <div style={{ marginTop: 26, fontFamily: SANS, fontWeight: 600, fontSize: 40, color: "rgba(31,26,23,0.65)" }}>
              porque ali a altura é o raio inteiro
            </div>
          </div>
        )}
      </div>
      <Assinatura />
    </AbsoluteFill>
  );
};
export const L01_TOTAL = TOTAL;
