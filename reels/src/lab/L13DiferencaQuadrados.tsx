import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Assinatura, SANS, ramp } from "./base";

// 13 — (a+b)(a−b) = a² − b². A prova é RECORTE E ENCAIXE: tira o quadradinho,
// corta a peça em L, gira 90° e encaixa. Vira um retângulo (a+b) por (a−b).
// É a única das três em que uma peça se move fisicamente.
const TOTAL = 720;
const A = "#fa709a", B = "#4facfe", VERDE = "#43e97b", OURO = "#FDE047";
const FUNDO = "#0B0B10", CLARO = "#FAFAF7";

const U = 132;                       // unidade
const X0 = 66, Y0 = 560;             // canto do quadrado a=5
const LADO = 5 * U;

const Rot: React.FC<{ x: number; y: number; t: string; cor: string; p: number; tam?: number }> =
({ x, y, t, cor, p, tam = 62 }) => p <= 0 ? null : (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${0.85 + 0.15 * p})`,
    opacity: p, fontFamily: SANS, fontWeight: 800, fontSize: tam, color: cor, whiteSpace: "nowrap",
    textShadow: `0 0 24px ${cor}55` }}>{t}</div>
);

export const L13DiferencaQuadrados: React.FC = () => {
  const f = useCurrentFrame();
  const pQuad = ramp(f, 20, 66);
  const pTira = ramp(f, 118, 150);     // remove b²
  const pCorte = ramp(f, 216, 246);    // linha de corte no L
  const mov = ramp(f, 300, 400);       // a peça gira e encaixa
  const pRet = ramp(f, 412, 442);      // o retângulo final acende
  const pConta = ramp(f, 470, 496);
  const pForm = ramp(f, 570, 596);
  const pFecho = ramp(f, 646, 668);

  // peça que se move: 3u x 2u, do topo-esquerda para a direita do bloco de baixo
  const cx = interpolate(mov, [0, 1], [X0 + 1.5 * U, X0 + 6 * U]);
  const cy = interpolate(mov, [0, 1], [Y0 + 1 * U, Y0 + 3.5 * U]);
  const rot = interpolate(mov, [0, 1], [0, 90]);

  return (
    <AbsoluteFill style={{ background: FUNDO }}>
      <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", fontFamily: SANS }}>
        <div style={{ fontWeight: 800, fontSize: 60, color: CLARO, opacity: pQuad }}>
          25 − 4 = <span style={{ color: OURO }}>21</span>
        </div>
        <div style={{ marginTop: 12, fontWeight: 800, fontSize: 60, color: CLARO, opacity: pConta }}>
          7 × 3 = <span style={{ color: OURO }}>21</span>
        </div>
        <div style={{ marginTop: 14, fontWeight: 700, fontSize: 44, color: "rgba(250,250,247,0.6)", opacity: pConta }}>
          o mesmo 21. não é coincidência.
        </div>
      </div>

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {/* quadrado a² */}
        <rect x={X0} y={Y0} width={LADO} height={LADO} fill={A} opacity={0.15 * pQuad * (1 - mov)} />
        {/* o b² que sai */}
        <rect x={X0 + 3 * U} y={Y0} width={2 * U} height={2 * U} fill={FUNDO} opacity={pTira} />
        <rect x={X0 + 3 * U} y={Y0} width={2 * U} height={2 * U} fill="none" stroke={B} strokeWidth={7}
          strokeDasharray="18 14" opacity={pTira * (1 - mov)} />
        {/* bloco de baixo, que fica parado */}
        <rect x={X0} y={Y0 + 2 * U} width={5 * U} height={3 * U} fill={VERDE} opacity={0.22 * Math.max(pCorte, pRet)} />
        {/* peça móvel */}
        {pCorte > 0 && (
          <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
            <rect x={-1.5 * U} y={-U} width={3 * U} height={2 * U} fill={OURO} opacity={0.34} />
            <rect x={-1.5 * U} y={-U} width={3 * U} height={2 * U} fill="none" stroke={OURO} strokeWidth={6} />
          </g>
        )}
        {/* contorno do quadrado original, some quando a peça sai */}
        <rect x={X0} y={Y0} width={LADO} height={LADO} fill="none" stroke={OURO} strokeWidth={8}
          strokeDasharray={LADO * 4} strokeDashoffset={LADO * 4 * (1 - pQuad)} opacity={1 - mov} />
        {pCorte > 0 && mov < 0.05 && (
          <line x1={X0} y1={Y0 + 2 * U} x2={X0 + 3 * U} y2={Y0 + 2 * U} stroke={CLARO} strokeWidth={7} strokeDasharray="16 14" />
        )}
        {/* contorno do retângulo final */}
        {pRet > 0 && (
          <rect x={X0} y={Y0 + 2 * U} width={7 * U} height={3 * U} fill="none" stroke={OURO} strokeWidth={9} opacity={pRet} />
        )}
      </svg>

      <Rot x={X0 + 4 * U} y={Y0 + U} t="tira b² = 4" cor={B} p={pTira * (1 - ramp(f, 236, 276))} tam={40} />
      <Rot x={X0 + 2.5 * U} y={Y0 + 3.5 * U} t="21" cor={pRet > 0 ? OURO : VERDE} p={Math.max(pCorte * 0.6, pRet)} tam={96} />
      <Rot x={X0 + 3.5 * U} y={Y0 + 5 * U + 70} t="7  =  a + b" cor={OURO} p={pRet} tam={48} />
      <Rot x={X0 + 7 * U + 46} y={Y0 + 3.5 * U} t="3" cor={OURO} p={pRet} tam={50} />

      <div style={{ position: "absolute", top: 1420, width: "100%", textAlign: "center", fontFamily: SANS, opacity: pForm }}>
        <div style={{ fontWeight: 900, fontSize: 56, color: CLARO, letterSpacing: -1 }}>
          (a+b)(a−b) = <span style={{ color: A }}>a²</span> − <span style={{ color: B }}>b²</span>
        </div>
      </div>

      <div style={{ position: "absolute", top: 1546, width: "100%", textAlign: "center", padding: "0 70px", opacity: pFecho }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: "rgba(250,250,247,0.82)", lineHeight: 1.3 }}>
          é o mesmo pedaço de papel<br />só que recortado e encaixado
        </div>
      </div>
      <Assinatura claro />
    </AbsoluteFill>
  );
};
export const L13_TOTAL = TOTAL;
