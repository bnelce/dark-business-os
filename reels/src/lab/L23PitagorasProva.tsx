import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { Assinatura, ramp } from "./base";

// 23 — Pitágoras DEMONSTRADO, não afirmado, na identidade escura da casa (mesma pele
// do L22: fundo #0B0C1E, brilho roxo, Poppins/Inter, cartão de vidro).
//
// O L02 faz os quadrados crescerem sobre os lados e mostra 9 + 16 = 25. Isso ilustra o
// teorema num caso particular; não prova nada. Aqui é a prova por rearranjo: um único
// quadrado de lado (a+b) e quatro cópias do mesmo triângulo, em dois arranjos. Num deles
// a área livre é a² + b², no outro é c². Mesmo quadrado, mesmas quatro peças — logo as
// duas áreas livres são iguais, e isso vale pra qualquer a e b, não só pro 3-4-5.
//
// A área livre NÃO é desenhada: o quadrado grande inteiro é pintado com o gradiente aceso
// e os triângulos são pintados OPACOS por cima (fill sólido, nunca translúcido, senão o
// brilho vaza por baixo e a figura mente). O que fica aceso é, por construção, exatamente
// o que sobrou. Se as peças não ladrilhassem, apareceria luz onde não devia.
//
// A área livre é de UMA cor só do começo ao fim, de propósito. Pintar a² e b² de cores
// diferentes de c² sugeriria que viraram outra coisa; a tese é que é a mesma quantidade
// de luz o tempo todo. Quem distingue a², b² e c² são os rótulos, não a cor.
//
// As peças andam UMA DE CADA VEZ, e a ordem não é estética. Movendo as quatro juntas elas
// se atravessam (conferido: 398 sobreposições, a primeira logo no início do percurso), e
// peça que atravessa peça faz a prova parecer truque. Das seis ordens possíveis só duas
// são livres de colisão, e as duas têm a peça de giro 0° por último — é a que viaja mais
// longe, 5 unidades, e precisa que as outras saiam da frente antes.
//
// Ladrilhamento conferido em scratchpad/verifica-pitagoras.mjs e colisões em ordem.mjs:
// zero buraco e zero sobreposição nos dois arranjos, áreas somando 49 exatos.

const { fontFamily: POPPINS } = loadPoppins("normal", { weights: ["700", "800"], subsets: ["latin"] });
const { fontFamily: INTER } = loadInter("normal", { weights: ["500", "600"], subsets: ["latin"] });

const CAPA = 50;
const D = [150, 170, 120, 260, 130, 160, 110];
const F = D.map((_, i) => CAPA + D.slice(0, i).reduce((x, y) => x + y, 0));
export const L23_TOTAL = CAPA + D.reduce((x, y) => x + y, 0); // 1150 quadros = 38,3s

const FUNDO = "#0B0C1E";
const BRANCO = "#FAFAF7";
const ROXO = "#667eea";
const AZUL = "#4facfe";
const CORAL = "#fa709a";
const VERDE = "#43e97b";
const PECA = "#161834"; // opaco: tem que tampar o brilho, não filtrar

const a = 3, b = 4, S = a + b;
const U = 104;
const X0 = (1080 - S * U) / 2;
const YB = 1348;
const sx = (mx: number) => X0 + mx * U;
const sy = (my: number) => YB - my * U;

type Pt = [number, number];
const CANON: Pt[] = [[0, 0], [b, 0], [0, a]];
const girar = ([x, y]: Pt, g: number): Pt => {
  const r = (g * Math.PI) / 180, co = Math.round(Math.cos(r)), si = Math.round(Math.sin(r));
  return [x * co - y * si, x * si + y * co];
};
const GIROS = [0, 90, 180, 270];
const PIVO_A: Record<number, Pt> = { 0: [a, b], 90: [a, 0], 180: [S, S], 270: [0, b] };
const PIVO_B: Record<number, Pt> = { 0: [0, 0], 90: [S, 0], 180: [S, S], 270: [0, S] };

/** Vértices do triângulo de giro `g` com SEU próprio deslize em `p` (0 = arranjo A, 1 = B). */
const triangulo = (g: number, p: number): Pt[] => {
  const [ax, ay] = PIVO_A[g], [bx, by] = PIVO_B[g];
  const px = ax + (bx - ax) * p, py = ay + (by - ay) * p;
  return CANON.map((q) => { const [x, y] = girar(q, g); return [px + x, py + y] as Pt; });
};
const pontos = (ps: Pt[]) => ps.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");
const suave = (t: number) => t * t * (3 - 2 * t);

// Uma etapa por peça, na ordem verificada como livre de colisão. A de giro 180° não
// aparece aqui porque sua translação é nula: já está no lugar nos dois arranjos.
const ETAPAS = [
  { giro: 90, de: F[3] + 36, ate: F[3] + 96 },
  { giro: 270, de: F[3] + 104, ate: F[3] + 164 },
  { giro: 0, de: F[3] + 172, ate: F[3] + 242 },
];
const DESLIZE_INICIO = ETAPAS[0].de;
const DESLIZE_FIM = ETAPAS[ETAPAS.length - 1].ate;

const Rotulo: React.FC<{ texto: string; mx: number; my: number; op: number; tam?: number }> = ({
  texto, mx, my, op, tam = 66,
}) => {
  if (op <= 0.001) return null;
  return (
    <div style={{
      position: "absolute", left: sx(mx), top: sy(my), transform: "translate(-50%,-50%)",
      fontFamily: POPPINS, fontWeight: 800, fontSize: tam, color: BRANCO, opacity: op,
      textShadow: "0 2px 24px rgba(11,12,30,0.75)",
    }}>{texto}</div>
  );
};

/** Bloco de texto abaixo da figura — uma ideia por cena, sempre no mesmo lugar. */
const Fala: React.FC<{ texto: string; de: number; ate: number; destaque?: string }> = ({ texto, de, ate, destaque }) => {
  const f = useCurrentFrame();
  const op = Math.min(ramp(f, de, de + 12), 1 - ramp(f, ate - 12, ate));
  if (op <= 0.001) return null;
  return (
    <div style={{
      position: "absolute", top: 1432, width: "100%", padding: "0 78px", textAlign: "center",
      fontFamily: INTER, fontWeight: 500, fontSize: 44, lineHeight: 1.26, color: "rgba(250,250,247,0.88)",
      opacity: op, whiteSpace: "pre-line",
    }}>
      {texto}
      {destaque && (
        <div style={{ marginTop: 18, fontFamily: POPPINS, fontWeight: 800, fontSize: 62, color: VERDE, letterSpacing: -1 }}>
          {destaque}
        </div>
      )}
    </div>
  );
};

/** A figura. `prog(g)` é o deslize de cada peça; `livre` acende a área que sobrou. */
const Figura: React.FC<{ prog: (g: number) => number; quadrado: number; pecas: number; livre: number }> = ({
  prog, quadrado, pecas, livre,
}) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <linearGradient id="aceso" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={ROXO} />
        <stop offset="1" stopColor={AZUL} />
      </linearGradient>
      <filter id="brilhoFig" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="16" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    {/* o gradiente é o quadrado grande INTEIRO; as peças tampam por cima, então o que
        fica aceso é a área livre — não há como desenhar uma prova errada aqui */}
    {quadrado > 0 && (
      <g filter="url(#brilhoFig)">
        <rect x={sx(0)} y={sy(S)} width={S * U} height={S * U} fill="url(#aceso)" opacity={0.92 * livre} />
      </g>
    )}

    {GIROS.map((g, i) => {
      const op = ramp(pecas * 4, i, i + 1);
      if (op <= 0.001) return null;
      return (
        <polygon key={g} points={pontos(triangulo(g, prog(g)))}
          fill={PECA} stroke="rgba(250,250,247,0.55)" strokeWidth={4} strokeLinejoin="round" opacity={op} />
      );
    })}

    {quadrado > 0 && (
      <rect x={sx(0)} y={sy(S)} width={S * U} height={S * U}
        fill="none" stroke="rgba(250,250,247,0.8)" strokeWidth={5} opacity={quadrado} />
    )}
  </svg>
);

/** Primeira cena: só o triângulo retângulo, com os lados nomeados. */
const Triangulo: React.FC<{ op: number }> = ({ op }) => {
  if (op <= 0.001) return null;
  const P: Pt[] = [[1.5, 2], [1.5 + b, 2], [1.5, 2 + a]];
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
        <polygon points={pontos(P)} fill={PECA} stroke="rgba(250,250,247,0.85)" strokeWidth={6} strokeLinejoin="round" />
        <rect x={sx(1.5)} y={sy(2.42)} width={0.42 * U} height={0.42 * U} fill="none" stroke="rgba(250,250,247,0.5)" strokeWidth={3} />
      </svg>
      <Rotulo texto="b" mx={1.5 + b / 2} my={1.66} op={op} tam={52} />
      <Rotulo texto="a" mx={1.1} my={2 + a / 2} op={op} tam={52} />
      <Rotulo texto="c" mx={1.5 + b / 2 + 0.44} my={2 + a / 2 + 0.3} op={op} tam={52} />
    </>
  );
};

const Cabecalho: React.FC<{ op: number; grande?: boolean }> = ({ op, grande }) => (
  <div style={{
    position: "absolute", top: 118, width: "100%", opacity: op,
    display: "flex", flexDirection: "column", alignItems: "center",
  }}>
    <div style={{
      fontFamily: INTER, fontWeight: 600, fontSize: 28, letterSpacing: 5, color: "rgba(250,250,247,0.85)",
      padding: "10px 26px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.05)",
    }}>
      📐 MATEMÁTICA · DEMONSTRAÇÃO
    </div>
    <div style={{
      marginTop: 26, fontFamily: POPPINS, fontWeight: 800, fontSize: grande ? 86 : 64,
      lineHeight: 1.04, letterSpacing: -1.6, textAlign: "center", color: BRANCO,
    }}>
      {grande ? (
        <>
          Por que<br />
          <span style={{ color: AZUL }}>a²</span>
          <span style={{ color: "rgba(250,250,247,0.45)" }}> + </span>
          <span style={{ color: CORAL }}>b²</span>
          <span style={{ color: "rgba(250,250,247,0.45)" }}> = </span>
          <span style={{ color: VERDE }}>c²</span>?
        </>
      ) : (
        <>Pitágoras, <span style={{ color: ROXO }}>provado</span></>
      )}
    </div>
  </div>
);

const Capa: React.FC = () => {
  const f = useCurrentFrame();
  const some = ramp(f, CAPA - 14, CAPA);
  if (some >= 1) return null;
  return (
    <AbsoluteFill style={{ opacity: 1 - some, background: FUNDO }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 700px at 50% 8%, ${ROXO}38, transparent 70%)` }} />
      <Cabecalho op={1} grande />
      {/* a capa já mostra o arranjo A montado: a miniatura tem que entregar a figura,
          não só a pergunta, senão compete com qualquer outra capa de texto */}
      <Figura prog={() => 0} quadrado={1} pecas={1} livre={1} />
      <Rotulo texto="a²" mx={a / 2} my={b + a / 2} op={1} tam={76} />
      <Rotulo texto="b²" mx={a + b / 2} my={b / 2} op={1} tam={76} />
      <div style={{
        position: "absolute", top: 1440, width: "100%", textAlign: "center",
        fontFamily: INTER, fontWeight: 500, fontSize: 46, color: "rgba(250,250,247,0.65)",
      }}>sem decorar — dá pra ver</div>
      <Assinatura claro />
    </AbsoluteFill>
  );
};

export const L23PitagorasProva: React.FC = () => {
  const f = useCurrentFrame();

  const prog = (g: number) => {
    const e = ETAPAS.find((x) => x.giro === g);
    return e ? suave(ramp(f, e.de, e.ate)) : 0;
  };

  const triOp = Math.min(ramp(f, F[0], F[0] + 16), 1 - ramp(f, F[1] - 24, F[1]));
  const quadrado = ramp(f, F[1], F[1] + 24);
  const pecas = ramp(f, F[1] + 30, F[1] + 130);
  const livre = ramp(f, F[2], F[2] + 20);

  // a² e b² saem assim que a primeira peça anda; c² entra quando a última assenta.
  const opAB = livre * (1 - ramp(f, DESLIZE_INICIO, DESLIZE_INICIO + 24));
  const opC = ramp(f, DESLIZE_FIM - 8, DESLIZE_FIM + 24);

  return (
    <AbsoluteFill style={{ background: FUNDO, overflow: "hidden" }}>
      <Audio src={staticFile("trilha-pitagoras.mp3")} volume={0.8} />
      <AbsoluteFill style={{ background: `radial-gradient(900px 700px at 50% 8%, ${ROXO}38, transparent 70%)` }} />
      <AbsoluteFill style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.6px, transparent 1.6px)",
        backgroundSize: "40px 40px",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 60%, transparent 85%)",
      }} />

      <Cabecalho op={ramp(f, CAPA, CAPA + 10)} />

      <Triangulo op={triOp} />
      {f >= F[1] && <Figura prog={prog} quadrado={quadrado} pecas={pecas} livre={livre} />}

      {f >= F[2] && (
        <>
          <Rotulo texto="a²" mx={a / 2} my={b + a / 2} op={opAB} tam={76} />
          <Rotulo texto="b²" mx={a + b / 2} my={b / 2} op={opAB} tam={76} />
          <Rotulo texto="c²" mx={S / 2} my={S / 2} op={opC} tam={82} />
        </>
      )}

      <Fala de={F[0] + 14} ate={F[1]} texto={"Um triângulo retângulo qualquer:\ncatetos a e b, hipotenusa c."} />
      <Fala de={F[1] + 10} ate={F[2]} texto={"Um quadrado de lado a + b.\nDentro dele, quatro cópias\ndesse mesmo triângulo."} />
      <Fala de={F[2] + 10} ate={DESLIZE_INICIO} texto={"O que sobra aceso é um\nquadrado a² e um quadrado b²."} />
      <Fala de={DESLIZE_INICIO + 8} ate={F[4]} texto={"Agora deslize as peças, uma de\ncada vez. Nenhuma gira, nenhuma\nsai do quadrado."} />
      <Fala de={F[4] + 10} ate={F[5]} texto={"O que sobra agora é um\nquadrado só — de lado c."} />
      <Fala de={F[5] + 10} ate={F[6]} texto={"Mesmo quadrado, mesmas quatro\npeças. Então a área que sobrou\né a mesma:"} destaque="a² + b² = c²" />
      <Fala de={F[6] + 10} ate={L23_TOTAL} texto={"E isso não depende do 3-4-5.\nVale pra qualquer a e b.\n\nSalva pra revisar."} />

      <Capa />
      <Assinatura claro />
    </AbsoluteFill>
  );
};
