import { CIANO, FUNDO, LARANJA, MONO, TEXTO, TEXTO_2 } from "./tokens";

// Ilustrações em traço fino do reel do fogo no Pará (ciencia/Fogo). Tudo desenhado em SVG
// no código, no estilo do design guide: linha de 1 a 3 px com brilho de neon (uma cópia
// borrada por baixo do traço nítido), ciano pro instrumento, laranja só pro fogo.
//
// Nada aqui carrega número: os desenhos explicam o método (quem fotografa, o que é um
// foco, que hora do dia é). Os números continuam saindo só de fogo-para.json.
//
// Cada peça recebe o progresso já calculado pela composição (0 a 1): o desenho não lê o
// quadro sozinho, pra que a linha do tempo fique toda num lugar só (fogo-para-tempos.json).

/** Filtro do brilho. Vai uma vez em cada <svg> que usa <Neon>. */
export const NeonDefs: React.FC = () => (
  <defs>
    <filter id="neonFP" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={4} /></filter>
  </defs>
);

/** Desenha o conteúdo duas vezes: borrado (o brilho) e nítido por cima. */
export const Neon: React.FC<{ children: React.ReactNode; forca?: number }> = ({ children, forca = 0.75 }) => (
  <>
    <g filter="url(#neonFP)" opacity={forca}>{children}</g>
    {children}
  </>
);

/**
 * Traço que se desenha: com pathLength=1 o dasharray vale pra qualquer forma, e `p` vai de
 * 0 (nada) a 1 (traço inteiro). Ver `tr()` abaixo.
 */
const tr = (p: number) => ({ pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - Math.max(0, Math.min(1, p)) });
/** Fatia o progresso entre várias peças do mesmo desenho: a k-ésima de n começa depois da anterior. */
const parte = (p: number, k: number, n: number) => Math.max(0, Math.min(1, p * n - k));

// --- GOES-19 -------------------------------------------------------------------------------
// Silhueta da série GOES-R: corpo, um único painel solar num braço, antena e o braço do
// magnetômetro; a abertura dos instrumentos aponta pra Terra (pra baixo, pro mapa).
export const SateliteGOES: React.FC<{ x: number; y: number; p: number; rotulo: number; escala?: number }> = ({ x, y, p, rotulo, escala = 1 }) => {
  const s = { fill: "none", stroke: CIANO, strokeWidth: 2 / escala, strokeLinejoin: "miter" as const };
  const desenho = (
    <g transform={`translate(${x},${y}) scale(${escala})`}>
      <rect x={-78} y={-24} width={48} height={48} {...s} {...tr(parte(p, 0, 4))} />
      {[-62, -46].map((gx) => <line key={gx} x1={gx} x2={gx} y1={-24} y2={24} {...s} strokeWidth={1 / escala} {...tr(parte(p, 1, 4))} />)}
      {[-8, 8].map((gy) => <line key={gy} x1={-78} x2={-30} y1={gy} y2={gy} {...s} strokeWidth={1 / escala} {...tr(parte(p, 1, 4))} />)}
      <line x1={-30} x2={-15} y1={0} y2={0} {...s} {...tr(parte(p, 1, 4))} />
      <rect x={-15} y={-18} width={30} height={36} {...s} {...tr(parte(p, 2, 4))} />
      <line x1={-15} x2={15} y1={-6} y2={-6} {...s} strokeWidth={1 / escala} {...tr(parte(p, 2, 4))} />
      <rect x={-8} y={18} width={16} height={7} {...s} {...tr(parte(p, 3, 4))} />
      <path d="M15,-10 L22,-10 M22,-21 Q31,-10 22,1" {...s} {...tr(parte(p, 3, 4))} />
      <path d="M8,-18 L22,-46 M18,-46 L26,-46" {...s} strokeWidth={1.5 / escala} {...tr(parte(p, 3, 4))} />
    </g>
  );
  return (
    <g>
      <Neon>{desenho}</Neon>
      <text x={x - 24 * escala} y={y + 52 * escala + 12} textAnchor="middle" fill={CIANO} opacity={rotulo} fontFamily={MONO} fontSize={24} letterSpacing={2}>
        GOES-19
      </text>
    </g>
  );
};

/**
 * Uma passada do GOES-19: a linha de varredura desce pelo mapa de norte a sul e o leque
 * sai da abertura do satélite até as pontas dela. `t` de 0 a 1 é a posição da passada.
 */
export const Varredura: React.FC<{ ox: number; oy: number; t: number; x0: number; x1: number; y0: number; y1: number; opacidade: number }> = ({
  ox, oy, t, x0, x1, y0, y1, opacidade,
}) => {
  if (opacidade <= 0 || t <= 0 || t >= 1) return null;
  const y = y0 + (y1 - y0) * t;
  const o = opacidade * Math.sin(Math.PI * t); // nasce e some nas pontas, sem corte seco
  return (
    <g opacity={o}>
      <path d={`M${ox},${oy} L${x0},${y} M${ox},${oy} L${x1},${y}`} stroke={CIANO} strokeOpacity={0.4} strokeWidth={1} fill="none" />
      <Neon forca={0.9}>
        <line x1={x0} x2={x1} y1={y} y2={y} stroke={CIANO} strokeWidth={1.5} />
      </Neon>
    </g>
  );
};

// --- AQUA ----------------------------------------------------------------------------------
// Outra silhueta de propósito (é outro satélite): corpo baixo, um painel comprido, a antena
// redonda em cima. Passa numa órbita tracejada, que é o que o distingue do GOES parado.
export const SateliteAQUA: React.FC<{ x: number; y: number; p: number; escala?: number }> = ({ x, y, p, escala = 1 }) => {
  const s = { fill: "none", stroke: CIANO, strokeWidth: 2 / escala };
  return (
    <Neon>
      <g transform={`translate(${x},${y}) scale(${escala})`}>
        <rect x={-13} y={-10} width={26} height={20} {...s} {...tr(parte(p, 0, 3))} />
        <line x1={13} x2={20} y1={0} y2={0} {...s} {...tr(parte(p, 1, 3))} />
        <rect x={20} y={-12} width={46} height={24} {...s} {...tr(parte(p, 1, 3))} />
        <line x1={43} x2={43} y1={-12} y2={12} {...s} strokeWidth={1 / escala} {...tr(parte(p, 1, 3))} />
        <path d="M-9,-10 A9,9 0 0 1 9,-10 M0,-10 L0,-19" {...s} {...tr(parte(p, 2, 3))} />
        <line x1={-5} x2={5} y1={10} y2={10} {...s} strokeWidth={4 / escala} {...tr(parte(p, 2, 3))} />
      </g>
    </Neon>
  );
};

// --- foco não é incêndio ---------------------------------------------------------------------
// Esquema sem escala: um incêndio só (contorno laranja irregular) sobre a grade de pixels do
// satélite. Cada pixel que o fogo toca vira um foco, o mesmo ponto laranja dos mapas.
export const GRADE = { x: 204, y: 760, cols: 7, lins: 5, lado: 96 };
const CENTRO_FOGO = { x: 548, y: 1004 };
const raioFogo = (a: number) => 150 * (1 + 0.16 * Math.sin(3 * a + 0.8) + 0.09 * Math.sin(5 * a + 2.1) + 0.05 * Math.sin(8 * a));
const CONTORNO_FOGO = (() => {
  let d = "";
  for (let k = 0; k <= 96; k++) {
    const a = (k / 96) * 2 * Math.PI, r = raioFogo(a);
    d += `${k ? "L" : "M"}${(CENTRO_FOGO.x + r * Math.cos(a)).toFixed(1)},${(CENTRO_FOGO.y + r * 0.78 * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
})();
const dentroDoFogo = (x: number, y: number) => {
  const dx = x - CENTRO_FOGO.x, dy = (y - CENTRO_FOGO.y) / 0.78;
  return Math.hypot(dx, dy) < raioFogo(Math.atan2(dy, dx));
};
/** Pixels que o fogo toca (amostra 5x5 dentro de cada um), do centro pra fora. */
const PIXELS_ACESOS = (() => {
  const lista: { c: number; l: number; dist: number }[] = [];
  for (let l = 0; l < GRADE.lins; l++) for (let c = 0; c < GRADE.cols; c++) {
    let toca = 0;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      if (dentroDoFogo(GRADE.x + (c + (i + 0.5) / 5) * GRADE.lado, GRADE.y + (l + (j + 0.5) / 5) * GRADE.lado)) toca++;
    }
    // Pixel com fogo em pelo menos 3 de 25 amostras: o sensor vê o calor mesmo de um canto.
    if (toca >= 3) {
      const cx = GRADE.x + (c + 0.5) * GRADE.lado, cy = GRADE.y + (l + 0.5) * GRADE.lado;
      lista.push({ c, l, dist: Math.hypot(cx - CENTRO_FOGO.x, cy - CENTRO_FOGO.y) });
    }
  }
  return lista.sort((a, b) => a.dist - b.dist);
})();

export const FocoNaoIncendio: React.FC<{ grade: number; fogo: number; pixels: number; f: number }> = ({ grade, fogo, pixels, f }) => {
  const { x, y, cols, lins, lado } = GRADE;
  return (
    <g>
      {/* A grade é o "olho" do satélite: cada quadrado é o menor pedaço de chão que ele separa. */}
      <g stroke={TEXTO_2} strokeOpacity={0.5} strokeWidth={1} fill="none">
        {Array.from({ length: cols + 1 }, (_, c) => (
          <line key={`c${c}`} x1={x + c * lado} x2={x + c * lado} y1={y} y2={y + lins * lado} {...tr(grade * 1.4 - c * 0.05)} />
        ))}
        {Array.from({ length: lins + 1 }, (_, l) => (
          <line key={`l${l}`} x1={x} x2={x + cols * lado} y1={y + l * lado} y2={y + l * lado} {...tr(grade * 1.4 - l * 0.07)} />
        ))}
      </g>
      {PIXELS_ACESOS.map((px, k) => {
        const o = Math.max(0, Math.min(1, pixels * PIXELS_ACESOS.length - k));
        if (o <= 0) return null;
        const cx = x + (px.c + 0.5) * lado, cy = y + (px.l + 0.5) * lado;
        return (
          <g key={k} opacity={o}>
            <rect x={x + px.c * lado + 3} y={y + px.l * lado + 3} width={lado - 6} height={lado - 6} fill={LARANJA} fillOpacity={0.1} stroke={LARANJA} strokeWidth={2} />
            <circle cx={cx} cy={cy} r={16} fill={LARANJA} opacity={0.45} filter="url(#neonFP)" />
            <circle cx={cx} cy={cy} r={7} fill={LARANJA} />
          </g>
        );
      })}
      <Neon forca={0.9}>
        <path d={CONTORNO_FOGO} fill="none" stroke={LARANJA} strokeWidth={2.5} {...tr(fogo)} />
      </Neon>
      {/* Três chamas dentro do contorno dizem "isto é um fogo só, grande". */}
      {[[-70, 10], [40, -30], [80, 45]].map(([dx, dy], k) => (
        <Chama key={k} x={CENTRO_FOGO.x + dx} y={CENTRO_FOGO.y + dy} escala={1.3} f={f + k * 17} opacidade={Math.max(0, Math.min(1, fogo * 2 - 1))} />
      ))}
    </g>
  );
};
export const N_PIXELS_ACESOS = PIXELS_ACESOS.length;

// --- chama -----------------------------------------------------------------------------------
// Ícone de traço do fogo: contorno de gota com a língua de dentro. Tremula com seno do
// quadro (nada de aleatório), cada uma com a sua fase.
export const Chama: React.FC<{ x: number; y: number; escala?: number; f: number; opacidade?: number }> = ({
  x, y, escala = 1, f, opacidade = 1,
}) => {
  if (opacidade <= 0) return null;
  const sy = 1 + 0.07 * Math.sin(f * 0.45) + 0.03 * Math.sin(f * 1.3);
  const sx = 1 - 0.04 * Math.sin(f * 0.45 + 1);
  return (
    <g opacity={opacidade} transform={`translate(${x},${y + 14 * escala}) scale(${escala * sx},${escala * sy}) translate(0,-14)`}>
      <Neon forca={0.9}>
        <path d="M0,-18 C5,-10 10,-6 10,2 C10,9 5,14 0,14 C-5,14 -10,9 -10,2 C-10,-4 -5,-7 -4,-12 C-2,-8 0,-8 0,-18 Z"
          fill="none" stroke={LARANJA} strokeWidth={2 / escala} strokeLinejoin="round" />
        <path d="M0,-1 C3,3 4,6 4,8.5 C4,11.5 2,13 0,13 C-2,13 -4,11.5 -4,8.5 C-4,6 -2,3 0,-1 Z"
          fill="none" stroke={LARANJA} strokeWidth={1.5 / escala} strokeLinejoin="round" />
      </Neon>
    </g>
  );
};

// --- céu das 24 horas --------------------------------------------------------------------------
// Um mostrador de instrumento logo acima do relógio: o sol corre o arco das 6h às 18h e a lua
// das 18h às 6h. Nascer às 6h e pôr às 18h é a aproximação do equador, onde fica o Pará;
// o desenho só diz se é dia ou noite, não marca hora exata de nascer do sol.
const ESTRELAS = [[-0.62, -0.5], [0.3, -0.72], [0.66, -0.3], [-0.2, -0.82], [-0.8, -0.18], [0.08, -0.42], [0.45, -0.58]];

export const CeuDia: React.FC<{ cx: number; cy: number; rx: number; ry: number; minuto: number; p: number }> = ({ cx, cy, rx, ry, minuto, p }) => {
  const dia = minuto >= 360 && minuto < 1080;
  // Progresso no arco: 0 no nascer (esquerda), 1 no pôr (direita).
  const prog = dia ? (minuto - 360) / 720 : (((minuto - 1080 + 1440) % 1440) / 720);
  const a = Math.PI * (1 - prog);
  const ax = cx + rx * Math.cos(a), ay = cy - ry * Math.sin(a);
  // Some perto do horizonte em vez de atravessar a linha.
  const borda = Math.min(1, Math.min(prog, 1 - prog) / 0.06);
  const noite = dia ? 0 : 1;
  return (
    <g opacity={p}>
      <path d={`M${cx - rx},${cy} A${rx},${ry} 0 0 1 ${cx + rx},${cy}`} fill="none" stroke={TEXTO_2} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="3 7" />
      <line x1={cx - rx - 10} x2={cx + rx + 10} y1={cy} y2={cy} stroke={TEXTO_2} strokeOpacity={0.8} strokeWidth={1.5} />
      {/* Marcas de régua no 6h, 12h e 18h, como num mostrador. */}
      {[0, 0.5, 1].map((t) => {
        const ta = Math.PI * (1 - t), ux = Math.cos(ta), uy = Math.sin(ta);
        return <line key={t} x1={cx + (rx - 7) * ux} y1={cy - (ry - 7) * uy} x2={cx + (rx + 7) * ux} y2={cy - (ry + 7) * uy} stroke={TEXTO_2} strokeWidth={1.5} />;
      })}
      {ESTRELAS.map(([dx, dy], k) => (
        <circle key={k} cx={cx + dx * rx} cy={cy + dy * ry} r={1.8} fill={CIANO} opacity={noite * (0.45 + 0.3 * Math.sin(minuto / 40 + k))} />
      ))}
      <g opacity={borda}>
        {dia ? (
          <Neon forca={0.9}>
            <circle cx={ax} cy={ay} r={12} fill={FUNDO} stroke={TEXTO} strokeWidth={2} />
            {Array.from({ length: 8 }, (_, k) => {
              const ra = (k / 8) * 2 * Math.PI;
              return <line key={k} x1={ax + 18 * Math.cos(ra)} y1={ay + 18 * Math.sin(ra)} x2={ax + 26 * Math.cos(ra)} y2={ay + 26 * Math.sin(ra)} stroke={TEXTO} strokeWidth={2} />;
            })}
          </Neon>
        ) : (
          <Neon forca={0.9}>
            <path d={`M${ax + 5},${ay - 14} A14,14 0 1 0 ${ax + 5},${ay + 14} A10.5,10.5 0 1 1 ${ax + 5},${ay - 14} Z`} fill={FUNDO} stroke={CIANO} strokeWidth={2} />
          </Neon>
        )}
      </g>
      <text x={cx} y={cy - 14} textAnchor="middle" fill={dia ? TEXTO : CIANO} fontFamily={MONO} fontSize={22} letterSpacing={3}>
        {dia ? "DIA" : "NOITE"}
      </text>
    </g>
  );
};
