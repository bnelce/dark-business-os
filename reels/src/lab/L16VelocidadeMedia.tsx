import { AbsoluteFill, Audio, Sequence, Sequence as Seq, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Bloco, Balao, Cena, CORES, Fundo, PRETO, SANS, SetaGrossa, TituloCena, ramp } from "../aula/cena";
import { Formula, useFontesKatex } from "./formula";
import { steppedRamp } from "../remocn/stop-motion";

// 16 — Física: velocidade média não é a média das velocidades.
// A armadilha é de intuição pura: (60+40)/2 parece óbvio e está errado, porque você
// passa MAIS TEMPO no trecho lento. A barra de tempo da cena 4 é o argumento visual —
// sem ela, "o trecho lento pesa mais" fica sendo uma frase que a pessoa aceita sem ver.

const CAPA = 45;
const D = [382, 198, 451, 338, 309, 150];
const F = D.map((_, i) => CAPA + D.slice(0, i).reduce((a, b) => a + b, 0));
export const L16_TOTAL = CAPA + D.reduce((a, b) => a + b, 0);

const Texto: React.FC<{ children: React.ReactNode; tamanho?: number; peso?: number }> = ({
  children, tamanho = 44, peso = 700,
}) => (
  <div style={{ fontFamily: SANS, fontWeight: peso, fontSize: tamanho, color: PRETO, lineHeight: 1.2, whiteSpace: "pre-line" }}>
    {children}
  </div>
);

/** Dois traços vermelhos riscando a resposta errada — gramática de correção de prova. */
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
      {linha(cx - r, cy - r * 0.5, cx + r, cy + r * 0.5, a)}
      {b > 0 && linha(cx + r, cy - r * 0.5, cx - r, cy + r * 0.5, b)}
    </svg>
  );
};

/** Barra proporcional ao tempo gasto em cada trecho. É o "por quê" do reel:
 *  a barra lenta é visivelmente mais longa, então ela pesa mais na média. */
const BarraTempo: React.FC<{ at: number; y: number; horas: number; maxHoras: number; cor: string; rotulo: string }> = ({
  at, y, horas, maxHoras, cor, rotulo,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: { damping: 200 }, durationInFrames: 16 });
  if (p <= 0.001) return null;
  const LARG_MAX = 760;
  const larg = (horas / maxHoras) * LARG_MAX * p;
  return (
    <div style={{ position: "absolute", top: y, left: 160 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{
          width: larg, height: 84, background: cor, border: `6px solid ${PRETO}`, borderRadius: 10,
          boxShadow: `8px 9px 0 ${PRETO}`, display: "flex", alignItems: "center", paddingLeft: 22,
          fontFamily: SANS, fontWeight: 900, fontSize: 44, color: PRETO, overflow: "hidden", whiteSpace: "nowrap",
        }}>{p > 0.75 ? rotulo : ""}</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: PRETO, opacity: p > 0.8 ? 1 : 0 }}>
          {horas}h
        </div>
      </div>
    </div>
  );
};

/** Capa completa no quadro zero — é a miniatura da grade e o primeiro quadro de quem rola. */
const Capa: React.FC = () => (
  <Seq from={0} durationInFrames={CAPA}>
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 30, padding: "0 70px",
    }}>
      <div style={{
        fontFamily: SANS, fontWeight: 900, fontSize: 112, lineHeight: 0.98, letterSpacing: -4,
        color: PRETO, textAlign: "center",
      }}>
        <span style={{ background: CORES.verde, boxShadow: `0 0 0 14px ${CORES.verde}` }}>FUI A 60</span>
        <div style={{ marginTop: 34 }}>
          <span style={{ background: CORES.coral, boxShadow: `0 0 0 14px ${CORES.coral}` }}>VOLTEI A 40</span>
        </div>
      </div>
      <div style={{
        marginTop: 54, background: "#FFFDF6", border: `7px solid ${PRETO}`, borderRadius: 16,
        boxShadow: `12px 13px 0 ${PRETO}`, padding: "22px 44px", transform: "rotate(-1.4deg)",
      }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 66, color: PRETO }}>média foi 50?</div>
      </div>
    </div>
  </Seq>
);

const Cabecalho: React.FC = () => (
  <div style={{
    position: "absolute", top: 108, width: "100%", textAlign: "center",
    fontFamily: SANS, fontWeight: 700, fontSize: 26, color: "rgba(20,17,24,0.45)", letterSpacing: 4,
  }}>FÍSICA · CINEMÁTICA</div>
);

export const L16VelocidadeMedia: React.FC = () => {
  useFontesKatex();
  return (
    <>
      <Fundo total={L16_TOTAL} />
      <Cabecalho />
      <Capa />

      {/* 1 — o problema */}
      <Cena from={F[0]} dur={D[0]}>
        <Audio src={staticFile("narracao-vm/cena-1.mp3")} />
        <TituloCena texto={"IDA E VOLTA\nNA MESMA ESTRADA"} cor={CORES.amarelo} at={0} y={250} tamanho={82} />
        <Bloco cor={CORES.verde} at={40} x={540} y={720} larg={780} seed="v1">
          <Texto tamanho={56} peso={900}>{"IDA\n60 km/h"}</Texto>
        </Bloco>
        <Bloco cor={CORES.coral} at={150} x={540} y={1060} larg={780} seed="v2">
          <Texto tamanho={56} peso={900}>{"VOLTA\n40 km/h"}</Texto>
        </Bloco>
        <Balao texto={"qual foi a\nvelocidade média?"} at={250} x={540} y={1450} larg={700} cor={CORES.azul} tamanho={54} giro={-1.5} />
        <Balao texto="⏸  pausa e responde" at={310} x={540} y={1660} larg={620} cor={CORES.amarelo} tamanho={46} giro={1.5} />
      </Cena>

      {/* 2 — a armadilha */}
      <Cena from={F[1]} dur={D[1]}>
        <Audio src={staticFile("narracao-vm/cena-2.mp3")} />
        <TituloCena texto={"QUASE TODO\nMUNDO FAZ:"} cor={CORES.rosa} at={0} y={330} tamanho={84} />
        <Formula tex={String.raw`\frac{60 + 40}{2} = 50`} at={26} y={880} tamanho={82} seed="a1" />
        <Xis at={96} cx={540} cy={1010} r={380} />
      </Cena>

      {/* 3 — resolvendo: a definição, e a conta que ela obriga */}
      <Cena from={F[2]} dur={D[2]}>
        <Audio src={staticFile("narracao-vm/cena-3.mp3")} />
        <TituloCena texto="A DEFINIÇÃO" cor={CORES.roxo} at={0} y={230} tamanho={80} />
        <Formula tex={String.raw`v_m = \frac{\text{distância total}}{\text{tempo total}}`} at={20} y={470} tamanho={54} seed="d1" />
        <Balao texto="põe 120 km em cada trecho" at={130} x={540} y={760} larg={720} tamanho={40} giro={-1} />
        <Formula tex={String.raw`t_{ida} = \frac{120}{60} = 2\,\text{h}`} at={160} y={870} tamanho={58} seed="d2" fundo={CORES.verde} />
        <Formula tex={String.raw`t_{volta} = \frac{120}{40} = 3\,\text{h}`} at={230} y={1130} tamanho={58} seed="d3" fundo={CORES.coral} />
        <SetaGrossa x1={540} y1={1390} x2={540} y2={1470} at={310} curva={0.1} />
        <Formula tex={String.raw`\frac{240}{5} = \boxed{48}\ \text{km/h}`} at={340} y={1520} tamanho={66} seed="d4" fundo={CORES.amarelo} />
      </Cena>

      {/* 4 — por quê: a barra de tempo é o argumento */}
      <Cena from={F[3]} dur={D[3]}>
        <Audio src={staticFile("narracao-vm/cena-4.mp3")} />
        <TituloCena texto="POR QUÊ?" cor={CORES.azul} at={0} y={250} tamanho={92} />
        <Balao texto="você passa MAIS TEMPO devagar" at={20} x={540} y={620} larg={860} tamanho={44} giro={-1} />
        <BarraTempo at={70} y={820} horas={2} maxHoras={3} cor={CORES.verde} rotulo="a 60 km/h" />
        <BarraTempo at={130} y={990} horas={3} maxHoras={3} cor={CORES.coral} rotulo="a 40 km/h" />
        <Balao texto={"o trecho lento é mais longo\nno relógio — e pesa mais"} at={220} x={540} y={1400} larg={840} cor={CORES.amarelo} tamanho={46} giro={1} />
      </Cena>

      {/* 5 — a regra geral */}
      <Cena from={F[4]} dur={D[4]}>
        <Audio src={staticFile("narracao-vm/cena-5.mp3")} />
        <TituloCena texto={"VALE\nSEMPRE"} cor={CORES.verde} at={0} y={240} tamanho={92} />
        <Formula tex={String.raw`v_m = \frac{2\,v_1 v_2}{v_1 + v_2}`} at={30} y={680} tamanho={72} seed="g1" />
        <Formula tex={String.raw`\frac{2 \cdot 60 \cdot 40}{100} = 48`} at={120} y={1000} tamanho={64} seed="g2" fundo={CORES.amarelo} />
        <Bloco cor={CORES.rosa} at={210} x={540} y={1450} larg={820} seed="g3">
          <Texto tamanho={48} peso={800}>{"sempre dá MENOS\nque a média simples"}</Texto>
        </Bloco>
      </Cena>

      {/* 6 — fechamento */}
      <Cena from={F[5]} dur={D[5]}>
        <Audio src={staticFile("narracao-vm/cena-6.mp3")} />
        <TituloCena texto={"SALVA\nCAI EM PROVA"} cor={CORES.coral} at={0} y={720} tamanho={92} />
        <div style={{
          position: "absolute", bottom: 82, width: "100%", textAlign: "center",
          fontFamily: SANS, fontSize: 30, fontWeight: 600, color: "rgba(20,17,24,0.5)",
        }}>@revisaorapida1ano</div>
      </Cena>
    </>
  );
};
