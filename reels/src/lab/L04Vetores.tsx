import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Papel, Titulo, Assinatura, Rotulo, SANS, TINTA, PAPEL, PALETA, ramp } from "./base";

// 04 — Física: por que o bloco desce a rampa. O peso não puxa pra rampa,
// ele se DECOMPÕE. A animação separa o vetor na frente do espectador.
const TOTAL = 320;
const ANG = 30 * Math.PI / 180;
const OX = 150, OY = 1180, L = 780;
const BX = OX + L * 0.52, BY = OY - L * 0.52 * Math.tan(ANG);
const P = 300;
const PX = P * Math.sin(ANG) * Math.cos(ANG), PY = -P * Math.sin(ANG) * Math.sin(ANG);
const NX = -P * Math.cos(ANG) * Math.sin(ANG), NY = -P * Math.cos(ANG) * Math.cos(ANG);

const Seta: React.FC<{ x1: number; y1: number; x2: number; y2: number; cor: string; p: number; larg?: number }> =
({ x1, y1, x2, y2, cor, p, larg = 9 }) => {
  if (p <= 0) return null;
  const ex = x1 + (x2 - x1) * p, ey = y1 + (y2 - y1) * p;
  const a = Math.atan2(ey - y1, ex - x1), h = 26;
  return (
    <g>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={cor} strokeWidth={larg} strokeLinecap="round" />
      {p > 0.9 && (
        <polygon
          points={`${ex},${ey} ${ex - h * Math.cos(a - 0.42)},${ey - h * Math.sin(a - 0.42)} ${ex - h * Math.cos(a + 0.42)},${ey - h * Math.sin(a + 0.42)}`}
          fill={cor}
        />
      )}
    </g>
  );
};

export const L04Vetores: React.FC = () => {
  const f = useCurrentFrame();
  const pPeso = ramp(f, 60, 90);
  const pDec = ramp(f, 130, 168);

  return (
    <AbsoluteFill style={{ background: PAPEL }}>
      <Papel total={TOTAL} />
      <Titulo materia="Física" titulo={"POR QUE O BLOCO\nDESCE A RAMPA"} />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <line x1={OX} y1={OY} x2={OX + L} y2={OY} stroke="rgba(31,26,23,0.28)" strokeWidth={5} />
        <line x1={OX} y1={OY} x2={OX + L} y2={OY - L * Math.tan(ANG)} stroke={TINTA} strokeWidth={9} strokeLinecap="round" />
        <path d={`M ${OX + 130} ${OY} A 130 130 0 0 0 ${OX + 130 * Math.cos(ANG)} ${OY - 130 * Math.sin(ANG)}`} fill="none" stroke={PALETA.roxo} strokeWidth={5} />
        <g transform={`rotate(${-30} ${BX} ${BY})`}>
          <rect x={BX - 62} y={BY - 62} width={124} height={62} fill={PALETA.roxoEsc} rx={6} />
        </g>
        {/* peso */}
        <Seta x1={BX} y1={BY - 30} x2={BX} y2={BY - 30 + P} cor={TINTA} p={pPeso} larg={11} />
        {/* componentes */}
        <Seta x1={BX} y1={BY - 30} x2={BX + PX} y2={BY - 30 - PY} cor={PALETA.coral} p={pDec} />
        <Seta x1={BX} y1={BY - 30} x2={BX + NX} y2={BY - 30 - NY} cor={PALETA.azul} p={pDec} />
        {pDec > 0.5 && (
          <>
            <line x1={BX + PX} y1={BY - 30 - PY} x2={BX} y2={BY - 30 + P} stroke="rgba(31,26,23,0.25)" strokeWidth={3} strokeDasharray="10 12" />
            <line x1={BX + NX} y1={BY - 30 - NY} x2={BX} y2={BY - 30 + P} stroke="rgba(31,26,23,0.25)" strokeWidth={3} strokeDasharray="10 12" />
          </>
        )}
      </svg>

      <Rotulo x={OX + 190} y={OY - 46} texto="30°" cor={PALETA.roxo} at={30} tamanho={40} peso={800} />
      <Rotulo x={BX + 74} y={BY + 200} texto="P" cor={TINTA} at={92} tamanho={48} peso={800} />
      <Rotulo x={BX + PX + 96} y={BY - 30 - PY + 26} texto="P·sen θ" cor={PALETA.coral} at={172} tamanho={38} />
      <Rotulo x={BX + NX - 110} y={BY - 30 - NY} texto="P·cos θ" cor={PALETA.azul} at={172} tamanho={38} />

      <div style={{ position: "absolute", top: 1320, width: "100%", textAlign: "center", padding: "0 80px" }}>
        {f > 100 && f < 150 && <div style={{ opacity: ramp(f, 100, 116), fontFamily: SANS, fontWeight: 700, fontSize: 50, color: TINTA }}>o peso aponta pra baixo. sempre.</div>}
        {f > 200 && (
          <div style={{ opacity: ramp(f, 200, 218) }}>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, color: TINTA, lineHeight: 1.28 }}>
              mas ele se divide em duas partes:<br />
              <span style={{ color: PALETA.coral }}>uma empurra rampa abaixo</span><br />
              <span style={{ color: PALETA.azul }}>a outra aperta contra a rampa</span>
            </div>
            {f > 262 && (
              <div style={{ marginTop: 34, opacity: ramp(f, 262, 280) }}>
                <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 50, color: TINTA, background: PALETA.amarelo, padding: "10px 22px", borderRadius: 8 }}>
                  quanto maior o ângulo, mais rápido desce
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <Assinatura />
    </AbsoluteFill>
  );
};
export const L04_TOTAL = TOTAL;
