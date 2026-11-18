import { useEffect, useState } from "react";
import { Audio, continueRender, delayRender, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Bloco, Balao, Cena, CORES, Fundo, PRETO, SANS, SetaGrossa, TituloCena } from "../aula/cena";
import { paperJitter, steppedRamp } from "../remocn/stop-motion";

// 14 — Matemática: resolução de questão em passos, com notação de verdade (KaTeX).
// Spike: responde se KaTeX renderiza limpo no Remotion e se convive com a estética de caderno.
// Os labs L06/L11-13 escrevem fórmula com Unicode (²), que não monta fração empilhada.

const CAPA = 45;
const D = [349, 150, 375, 369, 363, 111];
const F = D.map((_, i) => CAPA + D.slice(0, i).reduce((a, b) => a + b, 0));
export const L14_TOTAL = CAPA + D.reduce((a, b) => a + b, 0);

/** Fórmula KaTeX que entra no mesmo vocabulário dos blocos: mola, escala e tremor de papel. */
const Formula: React.FC<{ tex: string; at: number; y: number; tamanho?: number; cor?: string; seed?: string }> = ({
  tex,
  at,
  y,
  tamanho = 76,
  cor = PRETO,
  seed = "f",
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: { damping: 200 }, durationInFrames: 10 });
  if (p <= 0.001) return null;
  const jt = paperJitter(f, seed, { amp: 0.9, rotAmp: 0.18 });
  const html = katex.renderToString(`\\displaystyle ${tex}`, { throwOnError: true, displayMode: false, output: "html" });
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px) scale(${0.9 + 0.1 * p}) rotate(${jt.rot}deg)`,
        color: cor,
        fontSize: tamanho,
      }}
    >
      <div
        style={{
          background: "#FFFDF6",
          border: `6px solid ${PRETO}`,
          borderRadius: 14,
          boxShadow: `10px 11px 0 ${PRETO}`,
          padding: "18px 44px",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

/** Dois traços vermelhos que riscam uma resposta errada — gramática de correção de prova. */
const Xis: React.FC<{ at: number; cx: number; cy: number; r: number }> = ({ at, cx, cy, r }) => {
  const f = useCurrentFrame();
  const a = steppedRamp(f, at, at + 7);
  const b = steppedRamp(f, at + 6, at + 13);
  if (a === 0) return null;
  const linha = (x1: number, y1: number, x2: number, y2: number, t: number) => (
    <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * t} y2={y1 + (y2 - y1) * t} stroke="#E0322B" strokeWidth={22} strokeLinecap="round" />
  );
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", pointerEvents: "none" }}>
      {linha(cx - r, cy - r * 0.55, cx + r, cy + r * 0.55, a)}
      {b > 0 && linha(cx + r, cy - r * 0.55, cx - r, cy + r * 0.55, b)}
    </svg>
  );
};

const Texto: React.FC<{ children: React.ReactNode; tamanho?: number; peso?: number }> = ({ children, tamanho = 44, peso = 700 }) => (
  <div style={{ fontFamily: SANS, fontWeight: peso, fontSize: tamanho, color: PRETO, lineHeight: 1.2, whiteSpace: "pre-line" }}>
    {children}
  </div>
);

const Cabecalho: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 108,
      width: "100%",
      textAlign: "center",
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: 26,
      color: "rgba(20,17,24,0.45)",
      letterSpacing: 4,
    }}
  >
    MATEMÁTICA · PORCENTAGEM
  </div>
);


const Capa: React.FC = () => (
  <Sequence from={0} durationInFrames={CAPA}>
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34, padding: "0 70px" }}>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 118, lineHeight: 0.98, letterSpacing: -4, color: PRETO, textAlign: "center" }}>
        <span style={{ background: CORES.amarelo, boxShadow: `0 0 0 14px ${CORES.amarelo}`, borderRadius: 2 }}>SOBE 20%</span>
        <br />
        <span style={{ display: "inline-block", marginTop: 30 }}>DEPOIS</span>
        <br />
        <span style={{ display: "inline-block", marginTop: 12, background: CORES.coral, boxShadow: `0 0 0 14px ${CORES.coral}`, borderRadius: 2 }}>CAI 20%</span>
      </div>
      <div style={{ marginTop: 46, background: "#FFFDF6", border: `7px solid ${PRETO}`, borderRadius: 16, boxShadow: `12px 13px 0 ${PRETO}`, padding: "22px 40px", transform: "rotate(-1.4deg)" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, color: PRETO }}>voltou ao mesmo preço?</div>
      </div>
    </div>
  </Sequence>
);

export const L14Porcentagem: React.FC = () => {
  // As fontes do KaTeX vêm de CSS, e o Remotion não espera fonte de CSS sozinho.
  // Sem isso os primeiros frames saem com fonte de fallback e a fórmula "pula" no meio do vídeo.
  const [handle] = useState(() => delayRender("fontes do KaTeX"));
  useEffect(() => {
    Promise.all([
      document.fonts.load("76px KaTeX_Main"),
      document.fonts.load("italic 76px KaTeX_Math"),
      document.fonts.load("bold 76px KaTeX_Main"),
    ])
      .then(() => continueRender(handle))
      .catch((err) => {
        // Falha de fonte não pode travar o render inteiro em silêncio — deixa explícito.
        console.error("KaTeX: fontes não carregaram", err);
        continueRender(handle);
      });
  }, [handle]);

  return (
    <>
      <Fundo total={L14_TOTAL} />
      <Cabecalho />
      <Capa />

      {/* 1 — a pergunta */}
      <Cena from={F[0]} dur={D[0]}>
        <Audio src={staticFile("narracao-l14/cena-1.mp3")} />
        <TituloCena texto={"SOBE 20%\nDEPOIS CAI 20%"} cor={CORES.amarelo} at={0} y={250} tamanho={96} />
        <Bloco cor="#FFFDF6" at={20} x={540} y={820} larg={900} seed="p1">
          <Texto>{"Um tênis de R$ 100 sobe 20%.\nDepois entra em promoção\ncom 20% de desconto."}</Texto>
        </Bloco>
        <Balao texto="Voltou pra R$ 100?" at={199} x={540} y={1150} larg={640} cor={CORES.azul} tamanho={52} giro={-2} />
        <Balao texto="⏸  pausa e responde" at={270} x={540} y={1400} larg={660} tamanho={52} giro={1.5} cor={CORES.amarelo} />
      </Cena>

      {/* 2 — a armadilha */}
      <Cena from={F[1]} dur={D[1]}>
        <Audio src={staticFile("narracao-l14/cena-2.mp3")} />
        <TituloCena texto={"QUASE TODO\nMUNDO DIZ:"} cor={CORES.rosa} at={0} y={330} tamanho={88} />
        <Bloco cor={CORES.verde} at={28} x={540} y={960} larg={760} seed="p2">
          <Texto tamanho={92} peso={900}>
            SIM, VOLTOU
          </Texto>
        </Bloco>
        <Xis at={80} cx={540} cy={960} r={400} />
      </Cena>

      {/* 3 — resolução em passos: cada linha constrói sobre a anterior */}
      <Cena from={F[2]} dur={D[2]}>
        <Audio src={staticFile("narracao-l14/cena-3.mp3")} />
        <TituloCena texto="RESOLVENDO" cor={CORES.roxo} at={0} y={250} tamanho={84} />
        <Balao texto="sobe 20%" at={12} x={540} y={520} larg={330} cor={CORES.verde} tamanho={38} giro={-2} />
        <Formula tex={String.raw`100 \times 1{,}20 = 120`} at={25} y={600} seed="r1" />
        <SetaGrossa x1={540} y1={790} x2={540} y2={940} at={119} />
        <Balao texto="cai 20%" at={129} x={540} y={1010} larg={300} cor={CORES.coral} tamanho={38} giro={2} />
        <Formula tex={String.raw`120 \times 0{,}80 = \boxed{96}`} at={150} y={1090} seed="r2" />
        <Balao texto={"perdeu R$ 4!"} at={281} x={540} y={1470} larg={520} cor={CORES.amarelo} tamanho={62} giro={-1.5} />
      </Cena>

      {/* 4 — por quê: o desconto incide sobre outra base */}
      <Cena from={F[3]} dur={D[3]}>
        <Audio src={staticFile("narracao-l14/cena-4.mp3")} />
        <TituloCena texto="POR QUÊ?" cor={CORES.azul} at={0} y={250} tamanho={96} />
        <Formula tex={String.raw`20\% = \frac{20}{100}`} at={20} y={520} seed="q1" />
        <Formula tex={String.raw`\frac{20}{100} \times 100 = 20`} at={82} y={800} tamanho={66} seed="q2" />
        <Formula tex={String.raw`\frac{20}{100} \times 120 = 24`} at={174} y={1040} tamanho={66} seed="q3" />
        <Balao texto={"o desconto é sobre 120,\nnão sobre 100"} at={282} x={540} y={1450} larg={760} tamanho={46} giro={-1} />
      </Cena>

      {/* 5 — regra geral: aqui a notação tipografada é indispensável */}
      <Cena from={F[4]} dur={D[4]}>
        <Audio src={staticFile("narracao-l14/cena-5.mp3")} />
        <TituloCena texto={"REGRA\nGERAL"} cor={CORES.verde} at={0} y={230} tamanho={96} />
        <Formula tex={String.raw`(1+x)(1-x) = 1 - x^{2}`} at={50} y={660} tamanho={72} seed="g1" />
        <Formula tex={String.raw`1 - 0{,}2^{2} = 0{,}96`} at={200} y={930} tamanho={72} seed="g2" />
        <Bloco cor={CORES.rosa} at={295} x={540} y={1400} larg={780} seed="g3">
          <Texto tamanho={52} peso={800}>
            {"sobe e cai o mesmo %\nsempre perde x²"}
          </Texto>
        </Bloco>
      </Cena>

      {/* 6 — fechamento */}
      <Cena from={F[5]} dur={D[5]}>
        <Audio src={staticFile("narracao-l14/cena-6.mp3")} />
        <TituloCena texto={"SALVA PRA NÃO\nCAIR NESSA"} cor={CORES.coral} at={0} y={680} tamanho={92} />
        <div
          style={{
            position: "absolute",
            bottom: 82,
            width: "100%",
            textAlign: "center",
            fontFamily: SANS,
            fontSize: 30,
            fontWeight: 600,
            color: "rgba(20,17,24,0.5)",
          }}
        >
          @revisaorapida1ano
        </div>
      </Cena>
    </>
  );
};
