import { Audio, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Balao, Bloco, Cena, CORES, Fundo, PRETO, SANS, TituloCena, ramp } from "../aula/cena";
import { Formula, useFontesKatex } from "./formula";

// 19 — EsPCEx 2019, questão 13 do Modelo D (verbatim da prova oficial; gabarito C,
// conferido contra o gabarito do Exército e resolvido de forma independente:
// aresta encolhe por √3, área por 3, soma = 6 · 1/(1−1/3) = 9).
//
// Escolhida entre as quatro de geometria da prova porque é a única em que a figura
// CONTA a história: o aninhamento infinito é visível, e o choque é a soma dar 9.
//
// A esfera é desenhada como círculo de diâmetro igual à aresta — isso é honesto em
// qualquer projeção, porque a silhueta de uma esfera é sempre um círculo. Os cubos
// vão em isometria, com a aresta encolhendo pelo fator real 1/√3.

const CAPA = 45;
const D = [398, 215, 320, 284, 283, 171, 124];
const F = D.map((_, i) => CAPA + D.slice(0, i).reduce((a, b) => a + b, 0));
export const L19_TOTAL = CAPA + D.reduce((a, b) => a + b, 0);

const CX = 540, CY = 1010;
const RAZAO = 1 / Math.sqrt(3);

/** Cubo em isometria: projeta os 8 vértices e liga as 12 arestas. */
const Cubo: React.FC<{ a: number; cor: string; op: number; larg?: number }> = ({ a, cor, op, larg = 6 }) => {
  const h = a / 2;
  const iso = (x: number, y: number, z: number): [number, number] => [
    CX + (x - z) * Math.cos(Math.PI / 6),
    CY + y + (x + z) * Math.sin(Math.PI / 6) * 0.58,
  ];
  const v = [
    iso(-h, -h, -h), iso(h, -h, -h), iso(h, -h, h), iso(-h, -h, h),
    iso(-h, h, -h), iso(h, h, -h), iso(h, h, h), iso(-h, h, h),
  ];
  const arestas: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  return (
    <g opacity={op}>
      {arestas.map(([i, j], k) => (
        <line key={k} x1={v[i][0]} y1={v[i][1]} x2={v[j][0]} y2={v[j][1]}
          stroke={cor} strokeWidth={larg} strokeLinecap="round" />
      ))}
    </g>
  );
};

/** Aninhamento: cubo, esfera inscrita, cubo inscrito nela, e assim por diante.
 *  `niveis` controla quantos já entraram. */
const Aninhado: React.FC<{ niveis: number; base: number }> = ({ niveis, base }) => {
  const itens = [];
  for (let n = 0; n < niveis; n++) {
    const a = base * Math.pow(RAZAO, n);
    // o cubo de fora é o que o enunciado nomeia ("aresta 1"), então é ele que fica
    // sólido; os internos desbotam progressivamente pra sugerir a repetição infinita
    const op = Math.max(0.2, 1 - n * 0.22);
    itens.push(<Cubo key={`c${n}`} a={a} cor={n === 0 ? CORES.azul : PRETO} op={op} larg={n === 0 ? 8 : 5} />);
    // esfera inscrita: silhueta é círculo de diâmetro igual à aresta, em qualquer vista
    itens.push(
      <circle key={`e${n}`} cx={CX} cy={CY} r={a / 2} fill="none"
        stroke={CORES.coral} strokeWidth={n === 0 ? 7 : 5} opacity={op * 0.9} />,
    );
  }
  return <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>{itens}</svg>;
};

const Capa: React.FC = () => {
  const f = useCurrentFrame();
  const some = ramp(f, CAPA - 12, CAPA);
  if (some >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - some, background: "#FBF7EC" }}>
      <div style={{ position: "absolute", top: 260, width: "100%", textAlign: "center" }}>
        <span style={{
          background: CORES.verde, boxShadow: `0 0 0 16px ${CORES.verde}`,
          fontFamily: SANS, fontWeight: 900, fontSize: 60, color: PRETO,
        }}>EsPCEx 2019</span>
      </div>
      <div style={{
        position: "absolute", top: 420, width: "100%", textAlign: "center", padding: "0 60px",
        fontFamily: SANS, fontWeight: 900, fontSize: 96, lineHeight: 1.0, letterSpacing: -4, color: PRETO,
      }}>
        CUBO, ESFERA,<br />CUBO, ESFERA...<br />
        <span style={{ color: CORES.coral }}>PRA SEMPRE</span>
      </div>
      <svg width={1080} height={560} style={{ position: "absolute", top: 780, left: 0 }}>
        <g transform={`translate(0, ${-CY + 280})`}>
          {[0, 1, 2, 3].map((n) => {
            const a = 330 * Math.pow(RAZAO, n);
            return (
              <g key={n}>
                <circle cx={CX} cy={CY} r={a / 2} fill="none" stroke={CORES.coral} strokeWidth={5} opacity={0.85} />
              </g>
            );
          })}
        </g>
        <g transform={`translate(0, ${-CY + 280})`}>
          {[0, 1, 2, 3].map((n) => (
            <Cubo key={n} a={330 * Math.pow(RAZAO, n)} cor={PRETO} op={n === 0 ? 1 : 0.5} larg={n === 0 ? 7 : 4} />
          ))}
        </g>
      </svg>
      <div style={{
        position: "absolute", top: 1420, width: "100%", textAlign: "center",
        fontFamily: SANS, fontWeight: 800, fontSize: 52, color: PRETO,
      }}>a soma das áreas é infinita?</div>
    </div>
  );
};

export const L19EspcexCubos: React.FC = () => {
  useFontesKatex();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // O aninhamento cresce ao longo da primeira cena e permanece.
  const cresce = ramp(f, CAPA + 40, CAPA + 300);
  const niveis = Math.max(1, Math.round(cresce * 5));
  const entrada = spring({ frame: f - CAPA, fps, config: { damping: 200 }, durationInFrames: 14 });

  return (
    <>
      <Fundo total={L19_TOTAL} />
      <div style={{
        position: "absolute", top: 104, width: "100%", textAlign: "center",
        fontFamily: SANS, fontWeight: 700, fontSize: 26, color: "rgba(20,17,24,0.45)", letterSpacing: 4,
        opacity: ramp(f, CAPA, CAPA + 8),
      }}>MATEMÁTICA · EsPCEx 2019 · Q13</div>

      {f > CAPA && f < F[3] && (
        <div style={{ opacity: entrada }}>
          <Aninhado niveis={niveis} base={430} />
        </div>
      )}
      <Capa />

      {/* 1 — a construção */}
      <Cena from={F[0]} dur={D[0]}>
        <Audio src={staticFile("narracao-geo13/c1.mp3")} />
        <Balao texto="cubo de aresta 1" at={20} x={540} y={430} larg={480} cor={CORES.azul} tamanho={46} giro={-2} />
        <Balao texto="esfera inscrita" at={110} x={540} y={1560} larg={480} cor={CORES.coral} tamanho={46} giro={2} />
        <Balao texto="cubo dentro dela… e repete" at={230} x={540} y={1700} larg={720} cor={CORES.amarelo} tamanho={44} giro={-1} />
      </Cena>

      {/* 2 — a pergunta */}
      <Cena from={F[1]} dur={D[1]}>
        <Audio src={staticFile("narracao-geo13/c2.mp3")} />
        <Balao texto={"somando a área de\nTODOS os cubos:\ndá infinito?"} at={10} x={540} y={420} larg={740} cor={CORES.rosa} tamanho={50} giro={1} />
        <Balao texto="⏸  pausa e responde" at={120} x={540} y={1700} larg={560} cor={CORES.amarelo} tamanho={46} giro={-1.5} />
      </Cena>

      {/* 3 — a razão de encolhimento */}
      <Cena from={F[2]} dur={D[2]}>
        <Audio src={staticFile("narracao-geo13/c3.mp3")} />
        <Balao texto={"diagonal do cubo de dentro\n= diâmetro da esfera"} at={10} x={540} y={400} larg={840} cor={CORES.verde} tamanho={44} giro={-1} />
        <Formula tex={String.raw`a\sqrt{3} = 1 \;\Rightarrow\; a = \frac{1}{\sqrt{3}}`} at={90} y={1640} tamanho={58} seed="r1" />
      </Cena>

      {/* 4 — a área encolhe por 3 */}
      <Cena from={F[3]} dur={D[3]}>
        <Audio src={staticFile("narracao-geo13/c4.mp3")} />
        <TituloCena texto="A ÁREA" cor={CORES.roxo} at={0} y={260} tamanho={88} />
        <Formula tex={String.raw`A = 6a^{2}`} at={20} y={520} tamanho={70} seed="a1" />
        <Formula tex={String.raw`a^{2} \to \frac{a^{2}}{3} \quad\text{a cada passo}`} at={110} y={800} tamanho={54} seed="a2" fundo={CORES.amarelo} />
        <Balao texto={"razão da PG: 1/3"} at={200} x={540} y={1180} larg={560} cor={CORES.verde} tamanho={52} giro={1.5} />
      </Cena>

      {/* 5 — a soma */}
      <Cena from={F[4]} dur={D[4]}>
        <Audio src={staticFile("narracao-geo13/c5.mp3")} />
        <TituloCena texto={"SOMA DA PG\nINFINITA"} cor={CORES.azul} at={0} y={250} tamanho={80} />
        <Formula tex={String.raw`S = 6 \cdot \frac{1}{1 - \frac{1}{3}}`} at={26} y={620} tamanho={64} seed="s1" />
        <Formula tex={String.raw`= 6 \cdot \frac{3}{2}`} at={150} y={980} tamanho={64} seed="s2" />
      </Cena>

      {/* 6 — a resposta */}
      <Cena from={F[5]} dur={D[5]}>
        <Audio src={staticFile("narracao-geo13/c6.mp3")} />
        <TituloCena texto={"INFINITOS CUBOS"} cor={CORES.rosa} at={0} y={420} tamanho={74} />
        <Bloco cor={CORES.amarelo} at={22} x={540} y={900} larg={620} seed="resp">
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 132, color: PRETO }}>9</div>
        </Bloco>
        <Balao texto="área total finita — letra C" at={90} x={540} y={1280} larg={720} cor={CORES.verde} tamanho={48} giro={-1} />
      </Cena>

      {/* 7 — fechamento */}
      <Cena from={F[6]} dur={D[6]}>
        <Audio src={staticFile("narracao-geo13/c7.mp3")} />
        <TituloCena texto={"SALVA\nCAI EM MILITAR"} cor={CORES.coral} at={0} y={760} tamanho={86} />
        <div style={{
          position: "absolute", bottom: 82, width: "100%", textAlign: "center",
          fontFamily: SANS, fontSize: 30, fontWeight: 600, color: "rgba(20,17,24,0.5)",
        }}>@revisaorapida1ano</div>
      </Cena>
    </>
  );
};
