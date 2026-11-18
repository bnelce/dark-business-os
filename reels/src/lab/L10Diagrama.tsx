import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Papel, Titulo, Assinatura, Rotulo, SANS, TINTA, PAPEL, PALETA, ramp } from "./base";
import { InkArrow } from "../remocn/ink-arrow";

// 10 — Diagrama que se desenha, com setas de tinta apontando cada parte.
// Aqui a ferramenta é usada pra ANOTAR um desenho, não pra escrever texto.
const TOTAL = 330;
const CX = 540, CY = 830;

const PARTES = [
  { nome: "membrana", cor: PALETA.azul, ax: 880, ay: 560, tx: 800, ty: 690, at: 60 },
  { nome: "citoplasma", cor: PALETA.verde, ax: 200, ay: 560, tx: 330, ty: 700, at: 118 },
  { nome: "núcleo", cor: PALETA.coral, ax: 880, ay: 1140, tx: 620, ty: 880, at: 176 },
  { nome: "mitocôndria", cor: PALETA.roxoEsc, ax: 200, ay: 1140, tx: 400, ty: 950, at: 234 },
];

export const L10Diagrama: React.FC = () => {
  const f = useCurrentFrame();
  const cel = ramp(f, 16, 42);
  return (
    <AbsoluteFill style={{ background: PAPEL }}>
      <Papel total={TOTAL} />
      <Titulo materia="Biologia" titulo="A CÉLULA EM 4 PARTES" />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <ellipse cx={CX} cy={CY} rx={300 * cel} ry={250 * cel} fill="rgba(67,233,123,0.16)" stroke={PALETA.azul} strokeWidth={10} />
        {ramp(f, 176, 200) > 0 && (
          <circle cx={620} cy={880} r={92 * ramp(f, 176, 200)} fill="rgba(250,112,154,0.35)" stroke={PALETA.coral} strokeWidth={7} />
        )}
        {ramp(f, 234, 258) > 0 && (
          <ellipse cx={400} cy={950} rx={78 * ramp(f, 234, 258)} ry={40 * ramp(f, 234, 258)} fill="rgba(118,75,162,0.35)" stroke={PALETA.roxoEsc} strokeWidth={7} transform="rotate(-24 400 950)" />
        )}
      </svg>

      {PARTES.map((p) => (
        <div key={p.nome}>
          <AbsoluteFill>
            <InkArrow from={{ x: p.ax, y: p.ay }} to={{ x: p.tx, y: p.ty }} curvature={p.ax > CX ? 0.35 : -0.35}
              color={p.cor} strokeWidth={7} drawDur={18} headSize={22} delay={p.at} seed={p.nome} />
          </AbsoluteFill>
          <Rotulo x={p.ax} y={p.ay - 46} texto={p.nome} cor={TINTA} at={p.at} tamanho={38} fundo={p.cor} />
        </div>
      ))}

      <div style={{ position: "absolute", top: 1420, width: "100%", textAlign: "center", padding: "0 80px" }}>
        {f > 274 && (
          <div style={{ opacity: ramp(f, 274, 292), fontFamily: SANS, fontWeight: 700, fontSize: 48, color: TINTA, lineHeight: 1.3 }}>
            só a célula <span style={{ color: PALETA.coral }}>com núcleo</span> é eucarionte
          </div>
        )}
      </div>
      <Assinatura />
    </AbsoluteFill>
  );
};
export const L10_TOTAL = TOTAL;
