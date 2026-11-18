import { Easing } from "remotion";
import { entre } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";

// Ilustrações de traço fino do reel do fogo no Ceará (ciencia/FogoCeara): satélite, sol,
// nuvem de chuva, mandacaru e caatinga, calendário de novembro. Tudo SVG desenhado em
// código, na linguagem do design guide: linha de 1,5 a 2,5 px com brilho (cópia borrada
// por baixo do traço nítido), sem preenchimento, sem canto arredondado de enfeite.
//
// Os desenhos não carregam número nem afirmação nova: explicam o que a narração já diz
// (o satélite que enxerga o foco, a seca e a quadra chuvosa no relógio do ano, o sertão,
// o domingo 1º de novembro de 2026). Nenhum desenha fogo nem gente: o vídeo não atribui
// causa às queimadas.
//
// Cada peça recebe `p` (0 a 1) e se desenha com stroke-dashoffset sobre pathLength=1, o
// que dá o mesmo ritmo a traços de comprimentos diferentes.

/** Filtro do brilho: cada <svg> que usa as peças precisa ter um destes. */
export const BrilhoIlustra: React.FC = () => (
  <filter id="brilhoIlu" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={4} /></filter>
);

type Traco = { d: string; cor?: string; w?: number; p?: number; op?: number; tracejado?: boolean };

/** Um traço neon: cópia larga e borrada por baixo, linha fina e nítida por cima. */
export const Neon: React.FC<Traco> = ({ d, cor = CIANO, w = 2, p = 1, op = 1, tracejado }) => {
  if (p <= 0 || op <= 0) return null;
  // Tracejado e draw-on brigam pelo mesmo strokeDasharray: o tracejado usa uma máscara
  // de opacidade em vez do dashoffset (aparece de uma vez, com fade).
  const dash = tracejado ? { strokeDasharray: "6 8", opacity: op * p } : { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - p, opacity: op };
  return (
    <g>
      <path d={d} fill="none" stroke={cor} strokeWidth={w * 3} filter="url(#brilhoIlu)" strokeLinecap="round" strokeLinejoin="round" {...dash} opacity={dash.opacity * 0.55} />
      <path d={d} fill="none" stroke={cor} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...dash} />
    </g>
  );
};

// --- satélite -----------------------------------------------------------------------------
/** Corpo, dois painéis com a grade das células, antena. Centro em (0,0), ~100 px de largura. */
const SATELITE = [
  "M -11 -14 L 11 -14 L 11 14 L -11 14 Z", // corpo
  "M -11 0 L -20 0 M 11 0 L 20 0", // braços dos painéis
  "M -52 -10 L -20 -10 L -20 10 L -52 10 Z", "M -41 -10 L -41 10 M -30 -10 L -30 10", // painel esquerdo
  "M 20 -10 L 52 -10 L 52 10 L 20 10 Z", "M 31 -10 L 31 10 M 42 -10 L 42 10", // painel direito
  "M 0 14 L 0 22 M -8 28 Q 0 20 8 28", // antena virada pra Terra
];

export const Satelite: React.FC<{ x: number; y: number; escala?: number; p?: number; cor?: string; w?: number }> = ({
  x, y, escala = 1, p = 1, cor = CIANO, w = 2,
}) => (
  <g transform={`translate(${x} ${y}) scale(${escala})`}>
    {SATELITE.map((d, k) => (
      <Neon key={k} d={d} cor={cor} w={w / escala} p={entre(p, k / SATELITE.length * 0.6, k / SATELITE.length * 0.6 + 0.4)} />
    ))}
  </g>
);

/** Satélite pequeno na linha de status, à esquerda do nome. Estático: é rótulo, não cena. */
export const SateliteStatus: React.FC<{ x: number; opacidade?: number }> = ({ x, opacidade = 1 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: opacidade }}>
    <defs><BrilhoIlustra /></defs>
    <Satelite x={x} y={469} escala={0.42} cor={TEXTO_2} w={1.6} />
  </svg>
);

/** Linhas de visada do satélite até alguns focos, com uma mira em cada um. */
export const Visada: React.FC<{ de: [number, number]; alvos: [number, number][]; p: number }> = ({ de, alvos, p }) => (
  <g>
    {alvos.map(([x, y], k) => {
      const pk = entre(p, k * 0.15, k * 0.15 + 0.55, Easing.out(Easing.cubic));
      const mira = entre(p, k * 0.15 + 0.45, k * 0.15 + 0.7);
      return (
        <g key={k}>
          <Neon d={`M ${de[0]} ${de[1]} L ${x} ${y}`} cor={CIANO} w={1.2} p={pk} op={0.55} />
          <Neon d={`M ${x - 22} ${y} A 22 22 0 1 0 ${x + 22} ${y} A 22 22 0 1 0 ${x - 22} ${y}`} cor={CIANO} w={1.5} p={mira} />
          <Neon d={`M ${x - 32} ${y} L ${x - 26} ${y} M ${x + 26} ${y} L ${x + 32} ${y} M ${x} ${y - 32} L ${x} ${y - 26} M ${x} ${y + 26} L ${x} ${y + 32}`}
            cor={CIANO} w={1.5} p={mira} />
        </g>
      );
    })}
  </g>
);

// --- tempo: sol e nuvem de chuva ------------------------------------------------------------
/** Sol: anel e 12 raios curtos. Em texto claro, não laranja: o laranja do reel é o fogo. */
export const Sol: React.FC<{ x: number; y: number; p: number; op?: number; escala?: number }> = ({ x, y, p, op = 1, escala = 1 }) => {
  const raios = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * 2 * Math.PI;
    return `M ${30 * Math.cos(a)} ${30 * Math.sin(a)} L ${44 * Math.cos(a)} ${44 * Math.sin(a)}`;
  }).join(" ");
  // Escala no grupo e traço dividido pela escala: o desenho cresce, a linha continua fina.
  return (
    <g opacity={op} transform={`translate(${x} ${y}) scale(${escala})`}>
      <Neon d="M -20 0 A 20 20 0 1 1 20 0 A 20 20 0 1 1 -20 0" cor={TEXTO} w={2 / escala} p={entre(p, 0, 0.6)} />
      <Neon d={raios} cor={TEXTO} w={2 / escala} p={entre(p, 0.4, 1)} />
    </g>
  );
};

/** Nuvem em arcos abertos, base reta, e cinco riscos de chuva inclinados. */
export const Nuvem: React.FC<{ x: number; y: number; p: number; op?: number; escala?: number }> = ({ x, y, p, op = 1, escala = 1 }) => {
  const contorno = "M -46 14 L 46 14 A 18 18 0 0 0 40 -12 A 26 26 0 0 0 -4 -22 A 22 22 0 0 0 -40 -6 A 14 14 0 0 0 -46 14";
  const chuva = [-32, -16, 0, 16, 32].map((dx) => `M ${dx} 26 L ${dx - 8} 46`).join(" ");
  return (
    <g opacity={op} transform={`translate(${x} ${y}) scale(${escala})`}>
      <Neon d={contorno} cor={CIANO} w={2 / escala} p={entre(p, 0, 0.6)} />
      <Neon d={chuva} cor={CIANO} w={1.8 / escala} p={entre(p, 0.5, 1)} />
    </g>
  );
};

// --- sertão: mandacaru e caatinga ------------------------------------------------------------
/** Mandacaru de perfil, base em (0,0), ~225 px de altura: tronco, um braço de cada lado. */
const MANDACARU = [
  // contorno: sobe pela esquerda passando pelo braço esquerdo, cúpula, desce pela direita
  "M -17 0 L -17 -95 L -48 -95 Q -62 -95 -62 -109 L -62 -150 Q -48 -168 -34 -150 L -34 -119 L -17 -119 L -17 -200 Q 0 -224 17 -200 L 17 -142 L 36 -142 L 36 -180 Q 50 -198 64 -180 L 64 -130 Q 64 -116 50 -116 L 17 -116 L 17 0",
  // costelas: as gomas verticais do cacto
  "M -6 -8 L -6 -204 M 6 -8 L 6 -204 M -48 -101 L -48 -156 M 50 -122 L 50 -186",
];

export const Mandacaru: React.FC<{ x: number; y: number; escala?: number; p: number }> = ({ x, y, escala = 1, p }) => (
  <g transform={`translate(${x} ${y}) scale(${escala})`}>
    <Neon d={MANDACARU[0]} cor={CIANO} w={2 / escala} p={entre(p, 0, 0.75)} op={0.85} />
    <Neon d={MANDACARU[1]} cor={CIANO} w={1.2 / escala} p={entre(p, 0.45, 1)} op={0.45} />
  </g>
);

/** Arbusto da caatinga: galhos secos que se bifurcam. Ângulos tirados de um hash da
 *  semente, nunca de Math.random: o mesmo quadro sai igual em todo render. */
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const arbusto = (x: number, y: number, h: number, semente: number) => {
  const partes: string[] = [];
  const galho = (x0: number, y0: number, a: number, c: number, nivel: number, s: number) => {
    const x1 = x0 + c * Math.cos(a), y1 = y0 + c * Math.sin(a);
    partes.push(`M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    if (nivel === 0) return;
    const abre = 0.35 + 0.3 * hash(s);
    galho(x1, y1, a - abre, c * (0.62 + 0.1 * hash(s + 1)), nivel - 1, s * 3 + 1);
    galho(x1, y1, a + abre, c * (0.62 + 0.1 * hash(s + 2)), nivel - 1, s * 3 + 2);
  };
  galho(x, y, -Math.PI / 2 + 0.2 * (hash(semente) - 0.5), h * 0.42, 3, semente);
  return partes.join(" ");
};

const CHAO = 1585;
const ARBUSTOS = [
  [150, 60, 3], [300, 46, 7], [395, 70, 11], [520, 52, 5], [615, 64, 13], [700, 44, 17], [930, 58, 19],
].map(([x, h, s]) => arbusto(x, CHAO, h, s));

/** Faixa do sertão embaixo do mapa: linha do chão, dois mandacarus, arbustos secos. */
export const Caatinga: React.FC<{ p: number }> = ({ p }) => {
  if (p <= 0) return null;
  const marcas = Array.from({ length: 30 }, (_, k) => 110 + k * 29).map((x) => `M ${x} ${CHAO + 8} L ${x + 6} ${CHAO + 8}`).join(" ");
  return (
    <g>
      <Neon d={`M 90 ${CHAO} L 990 ${CHAO}`} cor={TEXTO_2} w={1.5} p={entre(p, 0, 0.35)} op={0.8} />
      <Neon d={marcas} cor={TEXTO_2} w={1.2} p={entre(p, 0.2, 0.5)} op={0.4} />
      {ARBUSTOS.map((d, k) => <Neon key={k} d={d} cor={TEXTO_2} w={1.4} p={entre(p, 0.3 + k * 0.04, 0.7 + k * 0.04)} op={0.75} />)}
      <Mandacaru x={820} y={CHAO} escala={0.95} p={entre(p, 0.15, 0.85)} />
      <Mandacaru x={225} y={CHAO} escala={0.62} p={entre(p, 0.3, 1)} />
    </g>
  );
};

// --- calendário: novembro de 2026 --------------------------------------------------------------
// 1/11/2026 cai num domingo (conferido: new Date(2026, 10, 1).getDay() === 0). Se o reel
// for publicado em outro ano, o calendário e a manchete do fecho mudam juntos.
const CAL = { x0: 220, x1: 860, y0: 600, y1: 1300 };
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const DIAS_NOV = 30;
const PRIMEIRO = new Date(2026, 10, 1).getDay(); // 0 = domingo

export const Calendario: React.FC<{ p: number; destaque: number; pulso: number }> = ({ p, destaque, pulso }) => {
  if (p <= 0) return null;
  const { x0, x1, y0, y1 } = CAL;
  const col = (x1 - x0) / 7;
  const linhaTopo = y0 + 110, linhaSemana = y0 + 170, gy0 = linhaSemana + 22, passo = (y1 - 40 - gy0) / 5;
  const cx = (c: number) => x0 + col * (c + 0.5);
  const cy = (l: number) => gy0 + passo * (l + 0.5);
  const textoP = entre(p, 0.35, 0.6);
  const [dx, dy] = [cx(PRIMEIRO), cy(0)];
  return (
    <g>
      <Neon d={`M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z`} cor={TEXTO} w={2} p={entre(p, 0, 0.4)} op={0.8} />
      {/* argolas da folha */}
      <Neon d={[x0 + 150, x1 - 150].map((x) => `M ${x - 6} ${y0 + 22} L ${x - 6} ${y0 - 22} L ${x + 6} ${y0 - 22} L ${x + 6} ${y0 + 22}`).join(" ")}
        cor={TEXTO} w={2} p={entre(p, 0.15, 0.4)} op={0.8} />
      <Neon d={`M ${x0} ${linhaTopo} L ${x1} ${linhaTopo}`} cor={TEXTO_2} w={1.5} p={entre(p, 0.25, 0.5)} op={0.7} />
      {Array.from({ length: 4 }, (_, l) => (
        <Neon key={l} d={`M ${x0 + 24} ${gy0 + passo * (l + 1)} L ${x1 - 24} ${gy0 + passo * (l + 1)}`} cor={TEXTO_2} w={1} p={entre(p, 0.3 + l * 0.04, 0.55 + l * 0.04)} op={0.3} />
      ))}
      <g opacity={textoP}>
        <text x={(x0 + x1) / 2} y={y0 + 72} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={34} letterSpacing={6}>NOVEMBRO · 2026</text>
        {SEMANA.map((s, c) => (
          <text key={c} x={cx(c)} y={linhaSemana} textAnchor="middle" fill={c === PRIMEIRO ? LARANJA : TEXTO_2} fontFamily={MONO} fontSize={26}>{s}</text>
        ))}
      </g>
      {Array.from({ length: DIAS_NOV }, (_, k) => {
        const pos = PRIMEIRO + k, c = pos % 7, l = Math.floor(pos / 7);
        const o = entre(p, 0.45 + k * 0.012, 0.55 + k * 0.012);
        const primeiro = k === 0;
        return (
          <text key={k} x={cx(c)} y={cy(l) + 15} textAnchor="middle" opacity={primeiro ? Math.max(o, destaque) : o * 0.85}
            fill={primeiro ? (destaque > 0 ? LARANJA : TEXTO) : TEXTO} fontFamily={SORA} fontWeight={primeiro ? 400 : 300} fontSize={primeiro ? 48 : 40}>
            {k + 1}
          </text>
        );
      })}
      {/* o dia 1: quadrado de canto vivo, o único ponto quente da cena */}
      {destaque > 0 && (
        <g opacity={0.8 + 0.2 * pulso}>
          <Neon d={`M ${dx - 38} ${dy - 38} L ${dx + 38} ${dy - 38} L ${dx + 38} ${dy + 38} L ${dx - 38} ${dy + 38} Z`} cor={LARANJA} w={2.5} p={destaque} />
        </g>
      )}
      <g opacity={destaque}>
        <text x={(x0 + x1) / 2} y={y1 + 80} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={32} letterSpacing={5}
          stroke={FUNDO} strokeWidth={8} paintOrder="stroke">
          <tspan fill={LARANJA}>1 NOV</tspan> · DOMINGO
        </text>
      </g>
    </g>
  );
};
