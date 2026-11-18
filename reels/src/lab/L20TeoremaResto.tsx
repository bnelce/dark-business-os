import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Balao, Bloco, Cena, CORES, Fundo, PRETO, SANS, SetaGrossa, TituloCena, ramp } from "../aula/cena";
import { Formula, useFontesKatex } from "./formula";

// 20 — EsPCEx 2019, questão 2 do Modelo D (verbatim; gabarito B, conferido contra o
// gabarito oficial e resolvido de forma independente: P(3)=26+3k, P(−2)=71−2k → k=9).
//
// Vídeo focado na SOLUÇÃO, não na armadilha: o enunciado parece exigir duas divisões
// de polinômio de grau 4, e a resposta inteira é não dividir nada. O prazer aqui é o
// atalho, então a estrutura privilegia o encadeamento das contas em vez do suspense.
// Por isso as cenas 4 e 5 acumulam a substituição passo a passo, com o termo que muda
// destacado — é o que a pessoa precisa conseguir repetir sozinha depois.

const CAPA = 45;
const D = [291, 115, 306, 349, 303, 219, 186, 151];
const F = D.map((_, i) => CAPA + D.slice(0, i).reduce((a, b) => a + b, 0));
export const L20_TOTAL = CAPA + D.reduce((a, b) => a + b, 0);

const Texto: React.FC<{ children: React.ReactNode; tamanho?: number; peso?: number }> = ({
  children, tamanho = 46, peso = 700,
}) => (
  <div style={{ fontFamily: SANS, fontWeight: peso, fontSize: tamanho, color: PRETO, lineHeight: 1.2, whiteSpace: "pre-line" }}>
    {children}
  </div>
);

/** Capa completa no quadro zero — miniatura da grade e primeiro quadro de quem rola. */
const Capa: React.FC = () => {
  const f = useCurrentFrame();
  const some = ramp(f, CAPA - 12, CAPA);
  if (some >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - some, background: "#FBF7EC" }}>
      <div style={{ position: "absolute", top: 250, width: "100%", textAlign: "center" }}>
        <span style={{
          background: CORES.verde, boxShadow: `0 0 0 15px ${CORES.verde}`,
          fontFamily: SANS, fontWeight: 900, fontSize: 56, color: PRETO,
        }}>EsPCEx 2019</span>
      </div>
      <div style={{ position: "absolute", top: 440, width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{
          background: "#FFFDF6", border: `7px solid ${PRETO}`, borderRadius: 16,
          boxShadow: `12px 13px 0 ${PRETO}`, padding: "26px 40px", transform: "rotate(-1deg)",
          fontFamily: SANS, fontWeight: 800, fontSize: 56, color: PRETO, textAlign: "center",
        }}>
          P(x) = 2x⁴ − 5x³ + kx − 1
        </div>
      </div>
      <div style={{
        position: "absolute", top: 700, width: "100%", textAlign: "center", padding: "0 70px",
        fontFamily: SANS, fontWeight: 900, fontSize: 96, lineHeight: 1.02, letterSpacing: -4, color: PRETO,
      }}>
        DIVIDIR ISSO<br />DUAS VEZES?
      </div>
      <div style={{ position: "absolute", top: 1030, width: "100%", textAlign: "center" }}>
        <span style={{
          background: CORES.amarelo, boxShadow: `0 0 0 15px ${CORES.amarelo}`,
          fontFamily: SANS, fontWeight: 900, fontSize: 74, color: PRETO,
        }}>NÃO PRECISA</span>
      </div>
      <div style={{
        position: "absolute", top: 1260, width: "100%", textAlign: "center",
        fontFamily: SANS, fontWeight: 700, fontSize: 42, color: "rgba(20,17,24,0.55)",
      }}>teorema do resto em 3 linhas</div>
    </div>
  );
};

export const L20TeoremaResto: React.FC = () => {
  useFontesKatex();
  const f = useCurrentFrame();
  return (
    <>
      <Fundo total={L20_TOTAL} />
      <div style={{
        position: "absolute", top: 104, width: "100%", textAlign: "center",
        fontFamily: SANS, fontWeight: 700, fontSize: 26, color: "rgba(20,17,24,0.45)", letterSpacing: 4,
        opacity: ramp(f, CAPA, CAPA + 8),
      }}>MATEMÁTICA · POLINÔMIOS · EsPCEx</div>
      <Capa />

      {/* 1 — o enunciado */}
      <Cena from={F[0]} dur={D[0]}>
        <Audio src={staticFile("narracao-resto/c1.mp3")} />
        <Formula tex={String.raw`P(x) = 2x^{4} - 5x^{3} + kx - 1`} at={16} y={300} tamanho={58} seed="p0" />
        <Balao texto={"dividido por (x − 3)\ne por (x + 2)"} at={110} x={540} y={720} larg={760} cor={CORES.azul} tamanho={50} giro={-1} />
        <Balao texto="os restos são iguais" at={180} x={540} y={960} larg={660} cor={CORES.coral} tamanho={50} giro={1.5} />
        <Bloco cor="#FFFDF6" at={232} x={540} y={1330} larg={880} seed="alt">
          <Texto tamanho={40}>k vale quanto?</Texto>
          <div style={{ marginTop: 14, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: PRETO }}>
            [A] 10 &nbsp; [B] 9 &nbsp; [C] 8 &nbsp; [D] 7 &nbsp; [E] 6
          </div>
        </Bloco>
      </Cena>

      {/* 2 — pausa */}
      <Cena from={F[1]} dur={D[1]}>
        <Audio src={staticFile("narracao-resto/c2.mp3")} />
        <Balao texto={"⏸  pausa\ne não comece a dividir"} at={6} x={540} y={420} larg={720} cor={CORES.amarelo} tamanho={54} giro={1} />
      </Cena>

      {/* 3 — a chave: o atalho que dispensa a divisão */}
      <Cena from={F[2]} dur={D[2]}>
        <Audio src={staticFile("narracao-resto/c3.mp3")} />
        <TituloCena texto={"TEOREMA\nDO RESTO"} cor={CORES.roxo} at={0} y={240} tamanho={92} />
        <Formula tex={String.raw`P(x) \div (x - a) \;\Rightarrow\; \text{resto} = P(a)`} at={34} y={700} tamanho={50} seed="t1" />
        <Bloco cor={CORES.verde} at={150} x={540} y={1180} larg={820} seed="t2">
          <Texto tamanho={52} peso={900}>{"não divide.\nsubstitui."}</Texto>
        </Bloco>
      </Cena>

      {/* 4 — primeira substituição, passo a passo */}
      <Cena from={F[3]} dur={D[3]}>
        <Audio src={staticFile("narracao-resto/c4.mp3")} />
        <Balao texto="resto na divisão por (x − 3)" at={8} x={540} y={250} larg={800} cor={CORES.azul} tamanho={42} giro={-1} />
        <Formula tex={String.raw`P(3) = 2\cdot 81 - 5\cdot 27 + 3k - 1`} at={40} y={420} tamanho={52} seed="a1" />
        <Formula tex={String.raw`= 162 - 135 + 3k - 1`} at={150} y={700} tamanho={54} seed="a2" />
        <Formula tex={String.raw`= 26 + 3k`} at={250} y={960} tamanho={64} seed="a3" fundo={CORES.verde} />
      </Cena>

      {/* 5 — segunda substituição, mesma estrutura: a repetição é o que ensina */}
      <Cena from={F[4]} dur={D[4]}>
        <Audio src={staticFile("narracao-resto/c5.mp3")} />
        <Balao texto="resto na divisão por (x + 2)" at={8} x={540} y={250} larg={800} cor={CORES.coral} tamanho={42} giro={1} />
        <Formula tex={String.raw`P(-2) = 32 + 40 - 2k - 1`} at={40} y={420} tamanho={52} seed="b1" />
        <Formula tex={String.raw`= 71 - 2k`} at={190} y={700} tamanho={64} seed="b2" fundo={CORES.coral} />
      </Cena>

      {/* 6 — igualar e resolver */}
      <Cena from={F[5]} dur={D[5]}>
        <Audio src={staticFile("narracao-resto/c6.mp3")} />
        <Balao texto="restos iguais" at={6} x={540} y={240} larg={480} cor={CORES.amarelo} tamanho={48} giro={-1.5} />
        <Formula tex={String.raw`26 + 3k = 71 - 2k`} at={30} y={400} tamanho={62} seed="c1" />
        <SetaGrossa x1={540} y1={640} x2={540} y2={740} at={110} curva={0.08} />
        <Formula tex={String.raw`5k = 45`} at={132} y={790} tamanho={68} seed="c2" />
      </Cena>

      {/* 7 — a resposta, e o que ela economizou */}
      <Cena from={F[6]} dur={D[6]}>
        <Audio src={staticFile("narracao-resto/c7.mp3")} />
        <Formula tex={String.raw`k = 9`} at={10} y={420} tamanho={112} seed="r1" fundo={CORES.amarelo} />
        <Bloco cor={CORES.verde} at={80} x={540} y={960} larg={620} seed="r2">
          <Texto tamanho={64} peso={900}>letra B</Texto>
        </Bloco>
        <Balao texto={"e você não dividiu\numa única vez"} at={130} x={540} y={1340} larg={760} cor={CORES.rosa} tamanho={50} giro={1} />
      </Cena>

      {/* 8 — fechamento */}
      <Cena from={F[7]} dur={D[7]}>
        <Audio src={staticFile("narracao-resto/c8.mp3")} />
        <TituloCena texto={"SALVA\nESSE ATALHO"} cor={CORES.coral} at={0} y={740} tamanho={92} />
        <div style={{
          position: "absolute", bottom: 82, width: "100%", textAlign: "center",
          fontFamily: SANS, fontSize: 30, fontWeight: 600, color: "rgba(20,17,24,0.5)",
        }}>@revisaorapida1ano</div>
      </Cena>
    </>
  );
};
