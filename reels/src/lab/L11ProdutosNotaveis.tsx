import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Assinatura, SANS, ramp } from "./base";

// 11 — Produtos notáveis pela ÁREA. Neon sobre escuro.
// A tese: o 2ab não é uma regra, são dois retângulos que você esquece de contar.
// Números concretos dirigem (3 e 2), as letras entram só quando a imagem já provou.
const TOTAL = 660;

const A = "#fa709a";     // segmento a
const B = "#4facfe";     // segmento b
const AB = "#43e97b";    // os dois retângulos cruzados — a cor do esquecimento
const OURO = "#FDE047";  // contorno do quadrado
const FUNDO = "#0B0B10";
const CLARO = "#FAFAF7";

// geometria: quadrado de lado 5 (a=3, b=2)
const X0 = 158, Y0 = 500, LADO = 764;
const FA = LADO * 3 / 5;              // porção a
const XM = X0 + FA, YM = Y0 + FA;     // linhas de corte
const X1 = X0 + LADO, Y1 = Y0 + LADO;

const Seg: React.FC<{ x1: number; y1: number; x2: number; y2: number; cor: string; p: number }> =
({ x1, y1, x2, y2, cor, p }) => p <= 0 ? null : (
  <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p}
    stroke={cor} strokeWidth={11} strokeLinecap="round" />
);

const Rot: React.FC<{ x: number; y: number; t: string; cor: string; p: number; tam?: number }> =
({ x, y, t, cor, p, tam = 62 }) => p <= 0 ? null : (
  <div style={{
    position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${0.85 + 0.15 * p})`,
    opacity: p, fontFamily: SANS, fontWeight: 800, fontSize: tam, color: cor, whiteSpace: "nowrap",
    textShadow: `0 0 26px ${cor}55`,
  }}>{t}</div>
);

export const L11ProdutosNotaveis: React.FC = () => {
  const f = useCurrentFrame();

  const pErrado = ramp(f, 10, 26);
  const pCerto = ramp(f, 52, 68);
  const pCade = ramp(f, 86, 104);
  const pQuad = ramp(f, 132, 168);      // contorno
  const pSegs = ramp(f, 176, 206);      // a e b nas arestas
  const pCorte = ramp(f, 226, 256);     // tracejados
  const pA2 = ramp(f, 280, 300);
  const pAB1 = ramp(f, 330, 350);
  const pAB2 = ramp(f, 372, 392);
  const pB2 = ramp(f, 414, 434);
  const pDoze = ramp(f, 466, 490);
  const pForm = ramp(f, 536, 560);
  const pFecho = ramp(f, 600, 620);
  const saiPergunta = 1 - ramp(f, 128, 152);   // o crachá sai quando o quadrado entra
  const recua = 1 - 0.45 * ramp(f, 128, 158);  // as contas recuam pra segundo plano

  // os dois retângulos verdes pulsam quando entram em cena como "os que somem"
  const pulso = f > 466 && f < 540 ? 0.5 + 0.5 * Math.sin((f - 466) / 3.2) : 0;

  return (
    <AbsoluteFill style={{ background: FUNDO }}>
      {/* gancho numérico */}
      <div style={{ position: "absolute", top: 148, width: "100%", textAlign: "center", fontFamily: SANS }}>
        <div style={{ fontWeight: 800, fontSize: 74 * (0.72 + 0.28 * recua), color: CLARO, opacity: pErrado * recua }}>
          3² + 2² = <span style={{ color: A }}>13</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: 74 * (0.72 + 0.28 * recua), color: CLARO, opacity: pCerto * recua, marginTop: 10 }}>
          (3 + 2)² = <span style={{ color: OURO }}>25</span>
        </div>
        <div style={{ opacity: pCade * saiPergunta, marginTop: 20, height: 84 * saiPergunta, overflow: "hidden" }}>
          <span style={{ fontWeight: 900, fontSize: 62, color: FUNDO, background: OURO, padding: "8px 24px", borderRadius: 10 }}>
            cadê os 12?
          </span>
        </div>
      </div>

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {/* preenchimento das 4 regiões */}
        <rect x={X0} y={Y0} width={FA} height={FA} fill={A} opacity={0.20 * pA2} />
        <rect x={XM} y={Y0} width={LADO - FA} height={FA} fill={AB} opacity={(0.20 + 0.18 * pulso) * pAB1} />
        <rect x={X0} y={YM} width={FA} height={LADO - FA} fill={AB} opacity={(0.20 + 0.18 * pulso) * pAB2} />
        <rect x={XM} y={YM} width={LADO - FA} height={LADO - FA} fill={B} opacity={0.20 * pB2} />

        {/* contorno externo, desenhando */}
        <rect x={X0} y={Y0} width={LADO} height={LADO} fill="none" stroke={OURO} strokeWidth={9}
          strokeDasharray={LADO * 4} strokeDashoffset={LADO * 4 * (1 - pQuad)} />

        {/* segmentos a e b POR FORA de cada aresta — é isso que prova que o lado é a+b */}
        <Seg x1={X0} y1={Y0 - 46} x2={XM} y2={Y0 - 46} cor={A} p={pSegs} />
        <Seg x1={XM} y1={Y0 - 46} x2={X1} y2={Y0 - 46} cor={B} p={pSegs} />
        <Seg x1={X0 - 46} y1={Y0} x2={X0 - 46} y2={YM} cor={A} p={pSegs} />
        <Seg x1={X0 - 46} y1={YM} x2={X0 - 46} y2={Y1} cor={B} p={pSegs} />
        <Seg x1={X1 + 46} y1={Y0} x2={X1 + 46} y2={YM} cor={A} p={pSegs} />
        <Seg x1={X1 + 46} y1={YM} x2={X1 + 46} y2={Y1} cor={B} p={pSegs} />
        <Seg x1={X0} y1={Y1 + 46} x2={XM} y2={Y1 + 46} cor={A} p={pSegs} />
        <Seg x1={XM} y1={Y1 + 46} x2={X1} y2={Y1 + 46} cor={B} p={pSegs} />

        {/* cortes internos, tracejados */}
        {pCorte > 0 && <>
          <line x1={XM} y1={Y0} x2={XM} y2={Y0 + LADO * pCorte} stroke={A} strokeWidth={8} strokeDasharray="20 18" />
          <line x1={X0} y1={YM} x2={X0 + LADO * pCorte} y2={YM} stroke={B} strokeWidth={8} strokeDasharray="20 18" />
        </>}
      </svg>

      {/* rótulos das arestas */}
      <Rot x={(X0 + XM) / 2} y={Y0 - 100} t="3" cor={A} p={pSegs} tam={58} />
      <Rot x={(XM + X1) / 2} y={Y0 - 100} t="2" cor={B} p={pSegs} tam={58} />
      <Rot x={X0 - 104} y={(Y0 + YM) / 2} t="3" cor={A} p={pSegs} tam={58} />
      <Rot x={X0 - 104} y={(YM + Y1) / 2} t="2" cor={B} p={pSegs} tam={58} />

      {/* rótulos das regiões */}
      <Rot x={(X0 + XM) / 2} y={(Y0 + YM) / 2} t="9" cor={A} p={pA2} tam={118} />
      <Rot x={(XM + X1) / 2} y={(Y0 + YM) / 2} t="6" cor={AB} p={pAB1} tam={92} />
      <Rot x={(X0 + XM) / 2} y={(YM + Y1) / 2} t="6" cor={AB} p={pAB2} tam={92} />
      <Rot x={(XM + X1) / 2} y={(YM + Y1) / 2} t="4" cor={B} p={pB2} tam={84} />

      {/* os dois que somem */}
      <div style={{ position: "absolute", top: 1330, width: "100%", textAlign: "center", fontFamily: SANS, opacity: pDoze }}>
        <div style={{ fontWeight: 800, fontSize: 66, color: AB }}>6 + 6 = 12</div>
        <div style={{ marginTop: 14, fontWeight: 700, fontSize: 46, color: "rgba(250,250,247,0.72)" }}>
          9 + 4 = 13 &nbsp;<span style={{ color: A }}>+ os 12 que você esqueceu</span>
        </div>
      </div>

      {/* a fórmula, cada termo na cor do seu pedaço */}
      <div style={{ position: "absolute", top: 1496, width: "100%", textAlign: "center", fontFamily: SANS, opacity: pForm,
        transform: `translateY(${(1 - pForm) * 26}px)` }}>
        <div style={{ fontWeight: 900, fontSize: 62, color: CLARO, letterSpacing: -1 }}>
          (a+b)² = <span style={{ color: A }}>a²</span> + <span style={{ color: AB }}>2ab</span> + <span style={{ color: B }}>b²</span>
        </div>
      </div>

      <div style={{ position: "absolute", top: 1632, width: "100%", textAlign: "center", padding: "0 70px", opacity: pFecho }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: "rgba(250,250,247,0.8)", lineHeight: 1.3 }}>
          esquecer o 2ab é montar o quadrado<br />e perder dois pedaços
        </div>
      </div>

      <Assinatura claro />
    </AbsoluteFill>
  );
};
export const L11_TOTAL = TOTAL;
