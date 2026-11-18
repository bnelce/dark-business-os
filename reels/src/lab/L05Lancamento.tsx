import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Papel, Titulo, Assinatura, Rotulo, SANS, TINTA, PAPEL, PALETA, ramp } from "./base";

// 05 — Física: lançamento oblíquo. Duas cores mostram a ideia central —
// horizontal é constante, vertical é que muda. A trajetória se traça sozinha.
const TOTAL = 330;
const X0 = 150, Y0 = 1300, ALC = 700, ALT = 470;

const traj = (t: number) => ({ x: X0 + ALC * t, y: Y0 - 4 * ALT * t * (1 - t) });

export const L05Lancamento: React.FC = () => {
  const f = useCurrentFrame();
  const t = ramp(f, 50, 210);
  const p = traj(t);
  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) { const q = traj((i / 100) * t); pts.push(`${q.x},${q.y}`); }

  return (
    <AbsoluteFill style={{ background: PAPEL }}>
      <Papel total={TOTAL} />
      <Titulo materia="Física" titulo={"DOIS MOVIMENTOS\nAO MESMO TEMPO"} />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <line x1={90} y1={Y0} x2={1010} y2={Y0} stroke="rgba(31,26,23,0.3)" strokeWidth={5} />
        {/* caminho completo em fantasma + trecho já percorrido em cheio */}
        <path d={`M ${X0} ${Y0} Q ${X0 + ALC / 2} ${Y0 - 2 * ALT} ${X0 + ALC} ${Y0}`} fill="none" stroke="rgba(31,26,23,0.16)" strokeWidth={5} strokeDasharray="12 14" />
        <polyline points={pts.join(" ")} fill="none" stroke={PALETA.roxoEsc} strokeWidth={7} strokeLinecap="round" />
        {t > 0 && <>
          {/* componentes de velocidade no ponto atual */}
          <line x1={p.x} y1={p.y} x2={p.x + 120} y2={p.y} stroke={PALETA.azul} strokeWidth={9} strokeLinecap="round" />
          <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + (t - 0.5) * 400} stroke={PALETA.coral} strokeWidth={9} strokeLinecap="round" />
          <circle cx={p.x} cy={p.y} r={22} fill={PALETA.roxoEsc} />
          {/* marcas de sombra no chão: espaçamento igual = horizontal constante */}
          {[0.2, 0.4, 0.6, 0.8].filter((m) => m <= t).map((m) => (
            <circle key={m} cx={traj(m).x} cy={Y0} r={9} fill={PALETA.azul} opacity={0.65} />
          ))}
        </>}
      </svg>

      <Rotulo x={Math.min(p.x + 170, 900)} y={p.y - 44} texto="Vx constante" cor={PALETA.azul} at={70} tamanho={34} />
      <Rotulo x={Math.max(p.x - 120, 150)} y={p.y + 84} texto="Vy muda" cor={PALETA.coral} at={70} tamanho={34} />

      <div style={{ position: "absolute", top: 1470, width: "100%", textAlign: "center", padding: "0 70px" }}>
        {f > 225 && (
          <div style={{ opacity: ramp(f, 225, 244), fontFamily: SANS, fontWeight: 700, fontSize: 48, color: TINTA, lineHeight: 1.3 }}>
            as bolinhas no chão ficam<br />
            <span style={{ color: PALETA.azul }}>sempre à mesma distância</span>
          </div>
        )}
        {f > 275 && (
          <div style={{ marginTop: 32, opacity: ramp(f, 275, 294) }}>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: TINTA, background: PALETA.amarelo, padding: "10px 22px", borderRadius: 8 }}>
              a gravidade só mexe na vertical
            </span>
          </div>
        )}
      </div>
      <Assinatura />
    </AbsoluteFill>
  );
};
export const L05_TOTAL = TOTAL;
