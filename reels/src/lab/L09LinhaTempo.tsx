import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Papel, Assinatura, SANS, TINTA, PAPEL, PALETA, ramp } from "./base";

// 09 — Linha do tempo com CÂMERA que percorre. Primeira composição em que
// o quadro se move sobre um canvas maior, em vez de tudo caber na tela.
const TOTAL = 360;
const EVENTOS = [
  { ano: "1889", txt: "Proclamação\nda República", cor: PALETA.azul },
  { ano: "1930", txt: "Era Vargas\ncomeça", cor: PALETA.coral },
  { ano: "1964", txt: "Golpe\nmilitar", cor: PALETA.roxoEsc },
  { ano: "1985", txt: "Redemocratização", cor: PALETA.verde },
  { ano: "1988", txt: "Constituição\nCidadã", cor: PALETA.rosa },
];
const PASSO = 430;

export const L09LinhaTempo: React.FC = () => {
  const f = useCurrentFrame();
  const cam = interpolate(f, [40, TOTAL - 60], [0, (EVENTOS.length - 1) * PASSO], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: PAPEL, overflow: "hidden" }}>
      <Papel total={TOTAL} />
      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 27, color: "rgba(31,26,23,0.5)", letterSpacing: 4 }}>HISTÓRIA DO BRASIL</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 58, color: TINTA, marginTop: 4, letterSpacing: -1.4 }}>UM SÉCULO EM 12s</div>
      </div>

      {/* trilho vertical: a câmera desce por ele */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${420 - cam}px)` }}>
        <div style={{ position: "absolute", left: 152, top: 0, width: 6, height: EVENTOS.length * PASSO, background: "rgba(31,26,23,0.22)", borderRadius: 3 }} />
        {EVENTOS.map((e, i) => {
          const at = 40 + i * ((TOTAL - 100) / EVENTOS.length);
          const p = ramp(f, at - 26, at + 6);
          return (
            <div key={e.ano} style={{ position: "absolute", top: i * PASSO, left: 0, width: "100%", opacity: p, transform: `translateX(${(1 - p) * 60}px)` }}>
              <div style={{ position: "absolute", left: 155, top: 34, width: 44, height: 44, borderRadius: "50%", background: e.cor, border: `6px solid ${PAPEL}`, transform: "translateX(-50%)" }} />
              <div style={{ position: "absolute", left: 240, top: 0 }}>
                <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 96, color: e.cor, letterSpacing: -3, lineHeight: 1 }}>{e.ano}</div>
                <div style={{ marginTop: 10, fontFamily: SANS, fontWeight: 700, fontSize: 46, color: TINTA, whiteSpace: "pre-line", lineHeight: 1.15 }}>{e.txt}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* véus pra cena não cortar seco nas bordas */}
      <div style={{ position: "absolute", top: 0, height: 340, width: "100%", background: `linear-gradient(${PAPEL} 55%, transparent)` }} />
      <div style={{ position: "absolute", bottom: 0, height: 300, width: "100%", background: `linear-gradient(transparent, ${PAPEL} 55%)` }} />

      {f > TOTAL - 62 && (
        <div style={{ position: "absolute", bottom: 190, width: "100%", textAlign: "center", opacity: ramp(f, TOTAL - 62, TOTAL - 44) }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: TINTA, background: PALETA.amarelo, padding: "10px 22px", borderRadius: 8 }}>
            salva pra revisar as datas
          </span>
        </div>
      )}
      <Assinatura />
    </AbsoluteFill>
  );
};
export const L09_TOTAL = TOTAL;
