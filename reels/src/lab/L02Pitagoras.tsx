import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Papel, Titulo, Assinatura, Rotulo, Traco, SANS, TINTA, PAPEL, PALETA, ramp } from "./base";

// 02 — Geometria: Pitágoras como ÁREA, não como fórmula decorada.
// Triângulo 3-4-5; os quadrados crescem nos catetos e na hipotenusa.
const TOTAL = 300;
const U = 74;                       // unidade
const AX = 330, AY = 980;           // vértice do ângulo reto
const BX = AX + 4 * U, BY = AY;     // cateto 4 (horizontal)
const CX = AX, CY = AY - 3 * U;     // cateto 3 (vertical)

export const L02Pitagoras: React.FC = () => {
  const f = useCurrentFrame();
  const gA = ramp(f, 70, 100);   // quadrado do cateto 4
  const gB = ramp(f, 110, 140);  // quadrado do cateto 3
  const gC = ramp(f, 165, 200);  // quadrado da hipotenusa

  return (
    <AbsoluteFill style={{ background: PAPEL }}>
      <Papel total={TOTAL} />
      <Titulo materia="Geometria" titulo={"PITÁGORAS É\nSOBRE ÁREA"} />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {/* quadrado sobre o cateto horizontal (4) — cresce pra baixo */}
        <rect x={AX} y={AY} width={4 * U} height={4 * U * gA} fill={PALETA.azul} opacity={0.75} />
        {/* quadrado sobre o cateto vertical (3) — cresce pra esquerda */}
        <rect x={AX - 3 * U * gB} y={CY} width={3 * U * gB} height={3 * U} fill={PALETA.verde} opacity={0.75} />
        {/* quadrado sobre a hipotenusa, girado */}
        {/* quadrado sobre a hipotenusa: cresce ao longo da normal externa (3,-4)/5 */}
        <polygon
          points={`${CX},${CY} ${BX},${BY} ${BX + 3 * U * gC},${BY - 4 * U * gC} ${CX + 3 * U * gC},${CY - 4 * U * gC}`}
          fill={PALETA.coral} opacity={0.72}
        />
        {/* triângulo por cima de tudo */}
        <Traco d={`M ${AX} ${AY} L ${BX} ${BY}`} cor={TINTA} de={20} ate={40} comprimento={4 * U} largura={8} />
        <Traco d={`M ${AX} ${AY} L ${CX} ${CY}`} cor={TINTA} de={34} ate={52} comprimento={3 * U} largura={8} />
        <Traco d={`M ${CX} ${CY} L ${BX} ${BY}`} cor={TINTA} de={48} ate={70} comprimento={5 * U} largura={8} />
        {f > 40 && <rect x={AX} y={AY - 30} width={30} height={30} fill="none" stroke={TINTA} strokeWidth={4} />}
      </svg>

      <Rotulo x={AX + 2 * U} y={AY + 2 * U * gA} texto={gA > 0.9 ? "16" : ""} cor="#123" at={98} tamanho={56} peso={800} />
      <Rotulo x={AX - 1.5 * U * gB} y={CY + 1.5 * U} texto={gB > 0.9 ? "9" : ""} cor="#123" at={138} tamanho={56} peso={800} />
      <Rotulo x={(CX + BX) / 2 + 1.5 * U} y={(CY + BY) / 2 - 2 * U} texto={gC > 0.9 ? "25" : ""} cor="#3a1116" at={198} tamanho={64} peso={800} />

      <div style={{ position: "absolute", top: 1420, width: "100%", textAlign: "center" }}>
        {f > 215 && (
          <div style={{ opacity: ramp(f, 215, 232), fontFamily: SANS, fontWeight: 800, fontSize: 72, color: TINTA }}>
            <span style={{ color: PALETA.verde }}>9</span> + <span style={{ color: PALETA.azul }}>16</span> ={" "}
            <span style={{ background: PALETA.amarelo, padding: "6px 18px", borderRadius: 8 }}>25</span>
          </div>
        )}
        {f > 250 && (
          <div style={{ marginTop: 34, opacity: ramp(f, 250, 268), fontFamily: SANS, fontWeight: 600, fontSize: 42, color: "rgba(31,26,23,0.7)" }}>
            os quadradinhos dos catetos<br />cabem exatamente na hipotenusa
          </div>
        )}
      </div>
      <Assinatura />
    </AbsoluteFill>
  );
};
export const L02_TOTAL = TOTAL;
