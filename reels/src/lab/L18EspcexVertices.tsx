import { Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Balao, Bloco, Cena, CORES, Fundo, PRETO, SANS, TituloCena, ramp } from "../aula/cena";
import { Formula, useFontesKatex } from "./formula";

// 18 — EsPCEx 2019, questão 3 do Modelo D (verbatim da prova oficial; gabarito B,
// conferido contra o gabarito oficial do Exército e resolvido de forma independente).
//
// Por que essa questão e não outra das 20: é a única que se RESOLVE no olho. Variando c,
// a parábola sobe e desce e o vértice percorre uma vertical — dá pra ver a resposta antes
// da álgebra justificar. As outras são manipulação, e manipulação em vídeo vira slide.

const CAPA = 45;
const D = [395, 130, 290, 189, 297, 127];
const F = D.map((_, i) => CAPA + D.slice(0, i).reduce((a, b) => a + b, 0));
export const L18_TOTAL = CAPA + D.reduce((a, b) => a + b, 0);

// Plano cartesiano: x de -6 a 3, y de -6 a 8.
const PX = 96, PY = 700, PW = 888, PH = 760;
const X0 = -6, X1 = 3, Y0 = -6, Y1 = 8;
const sx = (x: number) => PX + ((x - X0) / (X1 - X0)) * PW;
const sy = (y: number) => PY + PH - ((y - Y0) / (Y1 - Y0)) * PH;

const XV = -1.5; // -b/2a = -3/2, independente de c — é a resposta

const parabola = (c: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 90; i++) {
    const x = X0 + ((X1 - X0) * i) / 90;
    const y = x * x + 3 * x + c;
    if (y >= Y0 - 2 && y <= Y1 + 2) pts.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
  }
  return pts.join(" ");
};

const Plano: React.FC<{ cs: number[]; mostraVertices: boolean; mostraReta: number }> = ({
  cs, mostraVertices, mostraReta,
}) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    {/* grade */}
    {Array.from({ length: X1 - X0 + 1 }, (_, i) => X0 + i).map((x) => (
      <line key={`v${x}`} x1={sx(x)} y1={PY} x2={sx(x)} y2={PY + PH} stroke="#D8D2C2" strokeWidth={2} />
    ))}
    {Array.from({ length: Y1 - Y0 + 1 }, (_, i) => Y0 + i).map((y) => (
      <line key={`h${y}`} x1={PX} y1={sy(y)} x2={PX + PW} y2={sy(y)} stroke="#D8D2C2" strokeWidth={2} />
    ))}
    {/* eixos */}
    <line x1={PX} y1={sy(0)} x2={PX + PW} y2={sy(0)} stroke={PRETO} strokeWidth={5} />
    <line x1={sx(0)} y1={PY} x2={sx(0)} y2={PY + PH} stroke={PRETO} strokeWidth={5} />

    {/* a reta dos vértices, revelada no fim */}
    {mostraReta > 0 && (
      <line
        x1={sx(XV)} y1={PY + PH} x2={sx(XV)} y2={PY + PH - PH * mostraReta}
        stroke={CORES.amarelo} strokeWidth={16} strokeLinecap="round" opacity={0.95}
      />
    )}

    {cs.map((c, i) => (
      <polyline key={i} points={parabola(c)} fill="none" stroke={CORES.azul} strokeWidth={7}
        strokeLinecap="round" opacity={i === cs.length - 1 ? 1 : 0.28} />
    ))}

    {mostraVertices &&
      cs.map((c, i) => (
        <circle key={i} cx={sx(XV)} cy={sy(XV * XV + 3 * XV + c)} r={13}
          fill={CORES.coral} stroke={PRETO} strokeWidth={5} />
      ))}
  </svg>
);

const Capa: React.FC = () => {
  const f = useCurrentFrame();
  const some = ramp(f, CAPA - 12, CAPA);
  if (some >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - some, background: "#FBF7EC" }}>
      <div style={{ position: "absolute", top: 380, width: "100%", textAlign: "center" }}>
        <span style={{
          background: CORES.verde, boxShadow: `0 0 0 16px ${CORES.verde}`,
          fontFamily: SANS, fontWeight: 900, fontSize: 64, color: PRETO, letterSpacing: -1,
        }}>EsPCEx 2019</span>
      </div>
      <div style={{
        position: "absolute", top: 560, width: "100%", textAlign: "center", padding: "0 64px",
        fontFamily: SANS, fontWeight: 900, fontSize: 104, lineHeight: 1.0, letterSpacing: -4, color: PRETO,
      }}>
        VARIANDO O <span style={{ color: CORES.coral }}>c</span>,<br />ONDE FICAM<br />OS VÉRTICES?
      </div>
      <div style={{ position: "absolute", top: 1100, width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{
          background: "#FFFDF6", border: `7px solid ${PRETO}`, borderRadius: 16,
          boxShadow: `12px 13px 0 ${PRETO}`, padding: "20px 46px", transform: "rotate(-1.2deg)",
          fontFamily: SANS, fontWeight: 900, fontSize: 72, color: PRETO,
        }}>f(x) = x² + 3x + c</div>
      </div>
      <div style={{
        position: "absolute", top: 1380, width: "100%", textAlign: "center",
        fontFamily: SANS, fontWeight: 700, fontSize: 42, color: "rgba(20,17,24,0.55)",
      }}>questão que cai em colégio militar</div>
    </div>
  );
};

export const L18EspcexVertices: React.FC = () => {
  useFontesKatex();
  const f = useCurrentFrame();

  // O c varre um intervalo; as parábolas anteriores ficam esmaecidas pra formar o rastro.
  const inicioVarre = F[2] + 60;
  const varre = ramp(f, inicioVarre, inicioVarre + 150);
  const passos = Math.max(1, Math.round(varre * 9));
  const cs = Array.from({ length: passos }, (_, i) => -4 + (i * 9) / 8);
  const mostraVertices = f > inicioVarre + 20;
  const mostraReta = ramp(f, F[4] + 30, F[4] + 70);

  return (
    <>
      <Fundo total={L18_TOTAL} />
      <div style={{
        position: "absolute", top: 104, width: "100%", textAlign: "center",
        fontFamily: SANS, fontWeight: 700, fontSize: 26, color: "rgba(20,17,24,0.45)", letterSpacing: 4,
        opacity: ramp(f, CAPA, CAPA + 8),
      }}>MATEMÁTICA · EsPCEx 2019 · Q3</div>

      {f > CAPA && <Plano cs={cs} mostraVertices={mostraVertices} mostraReta={mostraReta} />}
      <Capa />

      {/* 1 — o enunciado, verbatim */}
      <Cena from={F[0]} dur={D[0]}>
        <Audio src={staticFile("narracao-espcex/c1.mp3")} />
        <Formula tex={String.raw`f(x) = x^{2} + 3x + c`} at={20} y={220} tamanho={66} seed="e1" />
        <Balao texto={"variando c, os vértices\nficam sobre qual reta?"} at={120} x={540} y={520} larg={820} cor={CORES.azul} tamanho={46} giro={-1} />
        <Bloco cor="#FFFDF6" at={250} x={540} y={1620} larg={900} seed="alt">
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: PRETO, lineHeight: 1.5 }}>
            [A] y = 2x − 9/2 &nbsp; [B] x = −3/2 &nbsp; [C] x = −9/2<br />[D] y = −9/2 &nbsp; [E] x = 3/2
          </div>
        </Bloco>
      </Cena>

      {/* 2 — pausa */}
      <Cena from={F[1]} dur={D[1]}>
        <Audio src={staticFile("narracao-espcex/c2.mp3")} />
        <Balao texto="⏸  pausa e tenta" at={8} x={540} y={300} larg={560} cor={CORES.amarelo} tamanho={54} giro={1.5} />
      </Cena>

      {/* 3 — a chave: c não mexe em a nem em b */}
      <Cena from={F[2]} dur={D[2]}>
        <Audio src={staticFile("narracao-espcex/c3.mp3")} />
        <Balao texto={"o c não mexe no a nem no b"} at={10} x={540} y={250} larg={760} cor={CORES.verde} tamanho={46} giro={-1} />
        <Formula tex={String.raw`x_v = -\frac{b}{2a}`} at={60} y={400} tamanho={62} seed="e3" />
      </Cena>

      {/* 4 — o valor, que não depende de c */}
      <Cena from={F[3]} dur={D[3]}>
        <Audio src={staticFile("narracao-espcex/c4.mp3")} />
        <Formula tex={String.raw`x_v = -\frac{3}{2}\quad\text{sempre}`} at={14} y={300} tamanho={64} seed="e4" fundo={CORES.amarelo} />
      </Cena>

      {/* 5 — a reta aparece por cima dos vértices */}
      <Cena from={F[4]} dur={D[4]}>
        <Audio src={staticFile("narracao-espcex/c5.mp3")} />
        <Balao texto={"o vértice sobe e desce,\nmas não sai da vertical"} at={10} x={540} y={300} larg={800} cor={CORES.rosa} tamanho={46} giro={1} />
        <Bloco cor={CORES.amarelo} at={110} x={540} y={1700} larg={720} seed="resp">
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 62, color: PRETO }}>
            [B] &nbsp; x = −3/2
          </div>
        </Bloco>
      </Cena>

      {/* 6 — fechamento */}
      <Cena from={F[5]} dur={D[5]}>
        <Audio src={staticFile("narracao-espcex/c6.mp3")} />
        <TituloCena texto={"SALVA\nCAI EM MILITAR"} cor={CORES.coral} at={0} y={760} tamanho={88} />
        <div style={{
          position: "absolute", bottom: 82, width: "100%", textAlign: "center",
          fontFamily: SANS, fontSize: 30, fontWeight: 600, color: "rgba(20,17,24,0.5)",
        }}>@revisaorapida1ano</div>
      </Cena>
    </>
  );
};
