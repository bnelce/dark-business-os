import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Papel, Titulo, Assinatura, Rotulo, SANS, TINTA, PAPEL, PALETA, ramp } from "./base";

// 03 — Trigonometria: SOH-CAH-TOA com os lados ACENDENDO conforme a razão aparece.
const TOTAL = 330;
const AX = 250, AY = 1020, BX = 850, BY = 1020, CX = 850, CY = 560;

const RAZOES = [
  { nome: "SENO", formula: "cateto oposto\n———————\nhipotenusa", cor: PALETA.coral, lados: ["oposto", "hip"], at: 60 },
  { nome: "COSSENO", formula: "cateto adjacente\n———————\nhipotenusa", cor: PALETA.azul, lados: ["adj", "hip"], at: 150 },
  { nome: "TANGENTE", formula: "cateto oposto\n———————\ncateto adjacente", cor: PALETA.verde, lados: ["oposto", "adj"], at: 240 },
];

export const L03Sohcahtoa: React.FC = () => {
  const f = useCurrentFrame();
  const atual = [...RAZOES].reverse().find((r) => f >= r.at);
  const aceso = (lado: string) => (atual?.lados.includes(lado) ? atual.cor : "rgba(31,26,23,0.35)");
  const grosso = (lado: string) => (atual?.lados.includes(lado) ? 14 : 6);

  return (
    <AbsoluteFill style={{ background: PAPEL }}>
      <Papel total={TOTAL} />
      <Titulo materia="Trigonometria" titulo="QUAL RAZÃO USAR?" />

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <line x1={AX} y1={AY} x2={BX} y2={BY} stroke={aceso("adj")} strokeWidth={grosso("adj")} strokeLinecap="round" />
        <line x1={BX} y1={BY} x2={CX} y2={CY} stroke={aceso("oposto")} strokeWidth={grosso("oposto")} strokeLinecap="round" />
        <line x1={AX} y1={AY} x2={CX} y2={CY} stroke={aceso("hip")} strokeWidth={grosso("hip")} strokeLinecap="round" />
        <rect x={BX - 34} y={BY - 34} width={34} height={34} fill="none" stroke="rgba(31,26,23,0.5)" strokeWidth={4} />
        <path d={`M ${AX + 90} ${AY} A 90 90 0 0 0 ${AX + 74} ${AY - 50}`} fill="none" stroke={PALETA.roxo} strokeWidth={5} />
      </svg>

      <Rotulo x={AX + 130} y={AY - 34} texto="θ" cor={PALETA.roxo} at={20} tamanho={46} peso={800} />
      <Rotulo x={(AX + BX) / 2} y={AY + 52} texto="adjacente" cor={aceso("adj")} at={30} tamanho={32} />
      <Rotulo x={BX + 118} y={(BY + CY) / 2} texto="oposto" cor={aceso("oposto")} at={30} tamanho={32} />
      <Rotulo x={(AX + CX) / 2 - 60} y={(AY + CY) / 2 - 60} texto="hipotenusa" cor={aceso("hip")} at={30} tamanho={32} />

      <div style={{ position: "absolute", top: 1200, width: "100%", textAlign: "center" }}>
        {RAZOES.map((r) => {
          const p = ramp(f, r.at, r.at + 14);
          const saiu = atual !== r;
          if (p === 0) return null;
          return (
            <div key={r.nome} style={{ position: "absolute", width: "100%", opacity: saiu ? 0 : p, transform: `translateY(${(1 - p) * 26}px)` }}>
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 68, color: r.cor, letterSpacing: -1 }}>{r.nome}</div>
              <div style={{ marginTop: 14, fontFamily: SANS, fontWeight: 600, fontSize: 40, color: TINTA, whiteSpace: "pre-line", lineHeight: 1.22 }}>
                {r.formula}
              </div>
            </div>
          );
        })}
      </div>

      {f > 300 && (
        <div style={{ position: "absolute", bottom: 210, width: "100%", textAlign: "center", opacity: ramp(f, 300, 316) }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: TINTA, background: PALETA.amarelo, padding: "10px 24px", borderRadius: 8 }}>
            SOH · CAH · TOA
          </span>
        </div>
      )}
      <Assinatura />
    </AbsoluteFill>
  );
};
export const L03_TOTAL = TOTAL;
