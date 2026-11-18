import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Papel, Titulo, Assinatura, SANS, TINTA, PAPEL, PALETA, ramp } from "./base";

// 08 — Dados que se desenham. Barras crescendo + número rolando em odômetro.
// Destrava as disciplinas com dado numérico, que nenhum formato anterior servia.
const TOTAL = 300;
const DADOS = [
  { nome: "Sudeste", valor: 84.8, cor: PALETA.roxo },
  { nome: "Nordeste", valor: 54.6, cor: PALETA.coral },
  { nome: "Sul", valor: 29.9, cor: PALETA.azul },
  { nome: "Norte", valor: 18.7, cor: PALETA.verde },
  { nome: "Centro-Oeste", valor: 16.3, cor: PALETA.rosa },
];
const MAX = 90, ROTX = 96, X0 = 400, LARG = 520, ALT = 92, GAP = 30, Y0 = 640;

export const L08Grafico: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: PAPEL }}>
      <Papel total={TOTAL} />
      <Titulo materia="Geografia" titulo={"ONDE MORA\nO BRASIL"} />

      {DADOS.map((d, i) => {
        const at = 44 + i * 34;
        const p = ramp(f, at, at + 30);
        const w = LARG * (d.valor / MAX) * p;
        const y = Y0 + i * (ALT + GAP);
        return (
          <div key={d.nome}>
            <div style={{ position: "absolute", left: X0, top: y, width: w, height: ALT, background: d.cor, borderRadius: 6, opacity: 0.9 }} />
            <div style={{ position: "absolute", left: ROTX, top: y + 26, width: X0 - ROTX - 26, textAlign: "right", fontFamily: SANS, fontWeight: 700, fontSize: 36, color: TINTA, opacity: p }}>
              {d.nome}
            </div>
            <div style={{ position: "absolute", left: X0 + w + 22, top: y + 20, fontFamily: SANS, fontWeight: 800, fontSize: 44, color: TINTA, opacity: p }}>
              {(d.valor * p).toFixed(1).replace(".", ",")}
              <span style={{ fontSize: 26, fontWeight: 600, color: "rgba(31,26,23,0.55)" }}> mi</span>
            </div>
          </div>
        );
      })}

      <div style={{ position: "absolute", top: 1330, width: "100%", textAlign: "center", padding: "0 80px" }}>
        {f > 210 && (
          <div style={{ opacity: ramp(f, 210, 230), fontFamily: SANS, fontWeight: 700, fontSize: 50, color: TINTA, lineHeight: 1.3 }}>
            o Sudeste sozinho tem<br />mais gente que Sul + Norte + Centro-Oeste
          </div>
        )}
        {f > 262 && (
          <div style={{ marginTop: 34, opacity: ramp(f, 262, 280) }}>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: TINTA, background: PALETA.amarelo, padding: "10px 22px", borderRadius: 8 }}>
              concentração populacional cai em prova
            </span>
          </div>
        )}
      </div>
      <Assinatura />
    </AbsoluteFill>
  );
};
export const L08_TOTAL = TOTAL;
