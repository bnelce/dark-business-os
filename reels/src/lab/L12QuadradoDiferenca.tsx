import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Assinatura, SANS, ramp } from "./base";

// 12 — (a−b)². Ataca o erro que a pesquisa apontou como o segundo mais comum:
// escrever −b² no fim. A resposta é visual: o cantinho foi retirado DUAS vezes,
// então precisa voltar uma. Por isso o último termo é POSITIVO.
const TOTAL = 690;
const A = "#fa709a", B = "#4facfe", VERDE = "#43e97b", OURO = "#FDE047";
const VERM = "#F0534E", FUNDO = "#0B0B10", CLARO = "#FAFAF7";

const X0 = 158, Y0 = 520, LADO = 764, U = LADO / 5;
const C = X0 + 3 * U, D = Y0 + 3 * U;   // corte em a−b = 3
const X1 = X0 + LADO, Y1 = Y0 + LADO;

const Rot: React.FC<{ x: number; y: number; t: string; cor: string; p: number; tam?: number }> =
({ x, y, t, cor, p, tam = 64 }) => p <= 0 ? null : (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${0.85 + 0.15 * p})`,
    opacity: p, fontFamily: SANS, fontWeight: 800, fontSize: tam, color: cor, whiteSpace: "nowrap",
    textShadow: `0 0 24px ${cor}55` }}>{t}</div>
);

export const L12QuadradoDiferenca: React.FC = () => {
  const f = useCurrentFrame();
  const pPerg = ramp(f, 12, 34);
  const pQuad = ramp(f, 96, 140);
  const pTiraD = ramp(f, 190, 220);   // tira faixa direita
  const pTiraB = ramp(f, 250, 280);   // tira faixa de baixo
  const pAviso = ramp(f, 330, 356);   // "esse aí saiu duas vezes"
  const pVolta = ramp(f, 428, 458);   // devolve o cantinho
  const pResto = ramp(f, 496, 522);   // sobra 9
  const pForm = ramp(f, 566, 592);
  const pFecho = ramp(f, 630, 652);
  const piscaCanto = f > 330 && f < 430 ? 0.45 + 0.55 * Math.sin((f - 330) / 3) : 0;

  return (
    <AbsoluteFill style={{ background: FUNDO }}>
      <div style={{ position: "absolute", top: 142, width: "100%", textAlign: "center", fontFamily: SANS, opacity: pPerg }}>
        <div style={{ fontWeight: 800, fontSize: 62, color: CLARO }}>
          (5 − 2)² = <span style={{ color: OURO }}>9</span>
        </div>
        <div style={{ marginTop: 14, fontWeight: 800, fontSize: 52, color: "rgba(250,250,247,0.62)" }}>
          mas 25 − 10 − 10 = <span style={{ color: VERM }}>5</span>
        </div>
        <div style={{ marginTop: 16, opacity: ramp(f, 52, 74) * (1 - ramp(f, 96, 124)), height: 78 * (1 - ramp(f, 96, 124)), overflow: "hidden" }}>
          <span style={{ fontWeight: 900, fontSize: 56, color: FUNDO, background: OURO, padding: "8px 22px", borderRadius: 10 }}>
            sobraram 4 a mais?
          </span>
        </div>
      </div>

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {/* o quadrado a² inteiro */}
        <rect x={X0} y={Y0} width={LADO} height={LADO} fill={A} opacity={0.16 * pQuad} />
        {/* faixas retiradas */}
        <rect x={C} y={Y0} width={LADO - 3 * U} height={LADO} fill={VERM} opacity={0.30 * pTiraD * (1 - 0.4 * pVolta)} />
        <rect x={X0} y={D} width={LADO} height={LADO - 3 * U} fill={VERM} opacity={0.30 * pTiraB * (1 - 0.4 * pVolta)} />
        {/* o canto retirado duas vezes */}
        <rect x={C} y={D} width={2 * U} height={2 * U}
          fill={pVolta > 0 ? VERDE : VERM} opacity={pVolta > 0 ? 0.45 * pVolta : 0.28 + 0.35 * piscaCanto} />
        {/* o que sobra: (a−b)² */}
        <rect x={X0} y={Y0} width={3 * U} height={3 * U} fill={VERDE} opacity={0.30 * pResto} />

        <rect x={X0} y={Y0} width={LADO} height={LADO} fill="none" stroke={OURO} strokeWidth={9}
          strokeDasharray={LADO * 4} strokeDashoffset={LADO * 4 * (1 - pQuad)} />
        {pTiraD > 0 && <line x1={C} y1={Y0} x2={C} y2={Y1} stroke={B} strokeWidth={8} strokeDasharray="20 18" />}
        {pTiraB > 0 && <line x1={X0} y1={D} x2={X1} y2={D} stroke={B} strokeWidth={8} strokeDasharray="20 18" />}
        {piscaCanto > 0 && (
          <rect x={C} y={D} width={2 * U} height={2 * U} fill="none" stroke={OURO} strokeWidth={7} opacity={piscaCanto} />
        )}
      </svg>

      <Rot x={X0 + 1.5 * U} y={Y0 + 1.5 * U} t="9" cor={pResto > 0 ? VERDE : CLARO} p={Math.max(pQuad * 0.55, pResto)} tam={108} />
      <Rot x={C + U} y={Y0 + 1.5 * U} t="−10" cor={VERM} p={pTiraD * (1 - 0.5 * pVolta)} tam={58} />
      <Rot x={X0 + 1.5 * U} y={D + U} t="−10" cor={VERM} p={pTiraB * (1 - 0.5 * pVolta)} tam={58} />
      <Rot x={C + U} y={D + U} t={pVolta > 0.4 ? "+4" : "4"} cor={pVolta > 0.4 ? VERDE : OURO} p={Math.max(piscaCanto, pVolta)} tam={64} />

      <div style={{ position: "absolute", top: 1362, width: "100%", textAlign: "center", fontFamily: SANS, padding: "0 70px" }}>
        <div style={{ opacity: pAviso * (1 - ramp(f, 428, 452)), fontWeight: 800, fontSize: 50, color: OURO }}>
          esse cantinho saiu DUAS vezes
        </div>
        <div style={{ opacity: pVolta, fontWeight: 800, fontSize: 50, color: VERDE, marginTop: -50 }}>
          então volta uma → <span style={{ color: CLARO }}>+4</span>
        </div>
      </div>

      <div style={{ position: "absolute", top: 1494, width: "100%", textAlign: "center", fontFamily: SANS, opacity: pForm }}>
        <div style={{ fontWeight: 900, fontSize: 58, color: CLARO, letterSpacing: -1 }}>
          (a−b)² = <span style={{ color: A }}>a²</span> − <span style={{ color: VERM }}>2ab</span> + <span style={{ color: VERDE }}>b²</span>
        </div>
      </div>

      <div style={{ position: "absolute", top: 1622, width: "100%", textAlign: "center", padding: "0 70px", opacity: pFecho }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: "rgba(250,250,247,0.82)", lineHeight: 1.3 }}>
          o último termo é <span style={{ color: VERDE }}>sempre positivo</span><br />
          porque ele volta, não sai
        </div>
      </div>
      <Assinatura claro />
    </AbsoluteFill>
  );
};
export const L12_TOTAL = TOTAL;
