import { CIANO, LARANJA, TEXTO, TEXTO_2 } from "./tokens";

// Ilustrações em traço fino do reel do D-rex (ciencia/DRex): tiranossauro, asteroide,
// carvalho com raízes, celular, levedura, mofo e a coluna do fungo. Tudo é SVG desenhado
// aqui, com o brilho de neon do design-guide (cópia borrada por baixo do traço nítido).
// Nada de Math.random: o "acaso" (pedras, galhos, mofo) vem de um hash com semente fixa,
// então todo render sai igual.
//
// O artigo não descreve a forma do estroma (só "ereto e esbranquiçado", até 50 cm), então
// a coluna do D-rex é genérica e a cena que a mostra traz o rótulo "ilustração".

/** Hash determinístico em [0, 1). */
export const ruido = (k: number) => { const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

/**
 * Filtro do brilho. Em `userSpaceOnUse` de propósito: com a caixa do próprio elemento, uma
 * linha horizontal tem altura zero e o filtro faz o traço sumir.
 */
export const Neon: React.FC<{ id: string; desvio?: number }> = ({ id, desvio = 6 }) => (
  <filter id={id} filterUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
    <feGaussianBlur stdDeviation={desvio} />
  </filter>
);

/**
 * Um traço com brilho. `p` (0 a 1) desenha o caminho do começo ao fim (dashoffset com
 * pathLength 1); `tracejado` só vale com o traço inteiro, porque os dois usam o dasharray.
 */
export const Traco: React.FC<{
  d: string; filtro: string; cor?: string; w?: number; p?: number; o?: number; brilho?: number; tracejado?: string; preenche?: number;
}> = ({ d, filtro, cor = CIANO, w = 2, p = 1, o = 1, brilho = 0.55, tracejado, preenche = 0 }) => {
  if (p <= 0 || o <= 0) return null;
  const desenho = p < 1 ? { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - p } : { strokeDasharray: tracejado };
  return (
    <g opacity={o}>
      {preenche > 0 && <path d={d} fill={cor} fillOpacity={preenche * p} stroke="none" />}
      <path d={d} fill="none" stroke={cor} strokeWidth={w * 3} strokeOpacity={brilho} filter={`url(#${filtro})`} strokeLinecap="round" strokeLinejoin="round" {...desenho} />
      <path d={d} fill="none" stroke={cor} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...desenho} />
    </g>
  );
};

type P = [number, number, boolean?]; // [x, y, canto?]

/**
 * Curva suave pelos pontos (Catmull-Rom em Bézier). Um ponto marcado como canto quebra a
 * suavização ali: boca, dedos e calcanhar do tiranossauro ficam com quina.
 */
export const curva = (pts: P[], fechada = false) => {
  const n = pts.length;
  const at = (i: number) => (fechada ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const fim = fechada ? n : n - 1;
  for (let i = 0; i < fim; i++) {
    const p1 = at(i), p2 = at(i + 1);
    const p0 = p1[2] ? p1 : at(i - 1), p3 = p2[2] ? p2 : at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return fechada ? `${d}Z` : d;
};

/** Elipse como caminho (dois arcos), pra poder desenhar com dashoffset como os outros traços. */
const elipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx},${cy}A${rx},${ry} 0 1 0 ${cx + rx},${cy}A${rx},${ry} 0 1 0 ${cx - rx},${cy}`;

const escala = (pts: P[], x: number, y: number, s: number): P[] => pts.map(([a, b, c]) => [x + a * s, y + b * s, c]);

// --- tiranossauro ---------------------------------------------------------------------------
// Silhueta de perfil olhando pra direita, numa caixa de 302 x 200 com os pés em y = 200.
// Postura horizontal (cauda pra trás, cabeça à frente), como a reconstrução atual.
const TREX: P[] = [
  [0, 92, true], [40, 78], [85, 62], [125, 50], [160, 48], [195, 56], [215, 52],
  [228, 36], [250, 28], [278, 30], [296, 36], [302, 46, true], [300, 54], [262, 58, true],
  [298, 62], [292, 72], [262, 78], [238, 80], [222, 92], [214, 108], [200, 122], [178, 130],
  [172, 138], [182, 160], [170, 182], [168, 192, true], [196, 200, true], [150, 200, true],
  [150, 186], [146, 166], [128, 146], [110, 128], [90, 118], [50, 106],
];
const TREX_BRACO: P[] = [[212, 110], [226, 118], [233, 130, true], [224, 126, true], [214, 124]];
const TREX_PERNA_LONGE: P[] = [[132, 146], [134, 172], [126, 194, true], [146, 200, true]];

/** Tiranossauro em traço fino. `p` desenha (ou apaga, ao voltar a 0) o contorno. */
export const TRex: React.FC<{ x: number; y: number; s: number; p: number; o: number; filtro: string }> = ({ x, y, s, p, o, filtro }) => (
  <g>
    <Traco d={curva(escala(TREX_PERNA_LONGE, x, y, s))} filtro={filtro} cor={TEXTO_2} w={1.5} p={p} o={o * 0.7} brilho={0.3} />
    <Traco d={curva(escala(TREX, x, y, s), true)} filtro={filtro} cor={TEXTO} w={2} p={p} o={o} brilho={0.35} />
    <Traco d={curva(escala(TREX_BRACO, x, y, s))} filtro={filtro} cor={TEXTO} w={1.5} p={p} o={o} brilho={0.3} />
    <circle cx={x + 262 * s} cy={y + 40 * s} r={2.5} fill={TEXTO} opacity={o * (p >= 1 ? 1 : 0)} />
  </g>
);

// --- asteroide --------------------------------------------------------------------------------
/** Pedra irregular (polígono com raio sorteado por hash) com rastro brilhando atrás. */
export const Asteroide: React.FC<{ x: number; y: number; dx: number; dy: number; giro: number; filtro: string; rastro?: number }> = ({
  x, y, dx, dy, giro, filtro, rastro = 300,
}) => {
  const vertices = Array.from({ length: 9 }, (_, k) => {
    const a = giro + (k / 9) * 2 * Math.PI, r = 22 * (0.72 + 0.4 * ruido(k + 3));
    return `${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`;
  });
  // O rastro sai de trás da pedra, contra o sentido do movimento (dx, dy normalizado).
  const fx = x - dx * rastro, fy = y - dy * rastro;
  const nx = -dy, ny = dx; // perpendicular, pra abrir o rastro em três fios
  return (
    <g>
      <defs>
        <linearGradient id="rastroDR" gradientUnits="userSpaceOnUse" x1={fx} y1={fy} x2={x} y2={y}>
          <stop offset="0" stopColor={LARANJA} stopOpacity={0} />
          <stop offset="1" stopColor={LARANJA} stopOpacity={1} />
        </linearGradient>
      </defs>
      {[-1, 0, 1].map((k) => (
        <g key={k}>
          <line x1={fx + nx * k * 14} y1={fy + ny * k * 14} x2={x + nx * k * 9} y2={y + ny * k * 9} stroke="url(#rastroDR)" strokeWidth={k ? 4 : 9} filter={`url(#${filtro})`} opacity={0.6} />
          <line x1={fx + nx * k * 14 + dx * (k ? 90 : 0)} y1={fy + ny * k * 14 + dy * (k ? 90 : 0)} x2={x + nx * k * 9} y2={y + ny * k * 9}
            stroke="url(#rastroDR)" strokeWidth={k ? 1.2 : 2.5} />
        </g>
      ))}
      <Traco d={`M${vertices.join("L")}Z`} filtro={filtro} cor={LARANJA} w={2.5} brilho={0.8} preenche={0.15} />
    </g>
  );
};

/** Clarão e ondas do impacto no chão (elipses achatadas: é o chão visto de lado). */
export const Impacto: React.FC<{ x: number; y: number; t: number; filtro: string }> = ({ x, y, t, filtro }) => {
  if (t < 0 || t > 60) return null;
  const clarao = Math.max(0, 1 - t / 22);
  return (
    <g>
      <circle cx={x} cy={y} r={30 + 90 * (1 - clarao)} fill={LARANJA} opacity={0.7 * clarao} filter={`url(#${filtro})`} />
      {[0, 10].map((atraso) => {
        const u = Math.max(0, Math.min(1, (t - atraso) / 45));
        if (u <= 0 || u >= 1) return null;
        return <ellipse key={atraso} cx={x} cy={y} rx={30 + 230 * u} ry={(30 + 230 * u) * 0.28} fill="none" stroke={LARANJA} strokeWidth={2} opacity={1 - u} />;
      })}
      {Array.from({ length: 9 }, (_, k) => {
        // Faíscas pra cima (o chão segura a metade de baixo).
        const a = -Math.PI * (0.1 + 0.8 * (k / 8)) + (ruido(k + 40) - 0.5) * 0.2;
        const u = Math.min(1, t / 18), r0 = 20 + 60 * u, r1 = r0 + 40 * (1 - u * 0.5);
        return <line key={k} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * r1} y2={y + Math.sin(a) * r1}
          stroke={LARANJA} strokeWidth={2} opacity={clarao} />;
      })}
    </g>
  );
};

// --- celular (régua) --------------------------------------------------------------------------
export const Celular: React.FC<{ x: number; base: number; altura: number; p: number; filtro: string }> = ({ x, base, altura, p, filtro }) => {
  const w = altura * 0.47, x0 = x - w / 2, y0 = base - altura;
  // Contorno de aparelho de canto vivo (cantos de 6 px, não arredondado "fofo"), tela e fenda.
  const r = 6;
  const corpo = `M${x0 + r},${y0}L${x0 + w - r},${y0}L${x0 + w},${y0 + r}L${x0 + w},${base - r}L${x0 + w - r},${base}L${x0 + r},${base}L${x0},${base - r}L${x0},${y0 + r}Z`;
  const tela = `M${x0 + 7},${y0 + 16}L${x0 + w - 7},${y0 + 16}L${x0 + w - 7},${base - 16}L${x0 + 7},${base - 16}Z`;
  return (
    <g>
      <Traco d={corpo} filtro={filtro} cor={TEXTO} w={2} p={p} brilho={0.3} />
      <Traco d={tela} filtro={filtro} cor={TEXTO_2} w={1} p={p} brilho={0} />
      <line x1={x - 10} x2={x + 10} y1={y0 + 8} y2={y0 + 8} stroke={TEXTO_2} strokeWidth={1.5} opacity={p >= 1 ? 1 : 0} />
    </g>
  );
};

// --- coluna do D-rex --------------------------------------------------------------------------
/**
 * O estroma como coluna ereta genérica: lados quase retos que afinam um pouco e um topo
 * levemente irregular. É só o "ereto, até 50 cm" do artigo, sem inventar forma.
 */
export const colunaDRex = (x: number, base: number, altura: number, largura: number) => {
  const a = largura / 2, b = largura * 0.4, topo = base - altura;
  return `M${x - a},${base}L${x - b},${topo + 10}L${x - b * 0.5},${topo + 2}L${x + b * 0.2},${topo}L${x + b},${topo + 8}L${x + a},${base}`;
};

// --- carvalho ---------------------------------------------------------------------------------
type Galho = { x1: number; y1: number; x2: number; y2: number; nivel: number };

/** Ramificação recursiva com semente: copa (pra cima) e raízes (pra baixo) usam a mesma. */
const ramificar = (x: number, y: number, ang: number, comp: number, nivel: number, max: number, semente: number, abre: number, out: Galho[]) => {
  const x2 = x + Math.cos(ang) * comp, y2 = y + Math.sin(ang) * comp;
  out.push({ x1: x, y1: y, x2, y2, nivel });
  if (nivel >= max) return;
  const filhos = ruido(semente) > 0.6 ? 3 : 2;
  for (let i = 0; i < filhos; i++) {
    const lado = filhos === 2 ? (i === 0 ? -1 : 1) : i - 1;
    const a = ang + lado * abre * (0.75 + 0.5 * ruido(semente * 3 + i)) + (ruido(semente * 7 + i) - 0.5) * 0.25;
    ramificar(x2, y2, a, comp * (0.66 + 0.14 * ruido(semente * 5 + i)), nivel + 1, max, semente * 3 + i + 1, abre, out);
  }
};

export const CHAO_CV = 1150; // chão da cena do carvalho
export const TRONCO_X = 330, TRONCO_TOPO = 990;
// Copa de carvalho: tronco curto e três pernadas abertas logo no topo, em vez de um eixo
// central comprido (que lia como pinheiro ou brócolis).
const COPA: Galho[] = [];
[-0.75, -0.05, 0.7].forEach((d, k) => ramificar(TRONCO_X, TRONCO_TOPO, -Math.PI / 2 + d, 95 - 15 * Math.abs(d), 0, 5, 11 + k * 13, 0.48, COPA));
const RAIZES: Galho[] = [];
[-0.9, -0.35, 0.3].forEach((d, k) => ramificar(TRONCO_X + d * 20, CHAO_CV, Math.PI / 2 + d, 70, 0, 3, 31 + k * 17, 0.5, RAIZES));
export const NIVEIS_COPA = 6, NIVEIS_RAIZ = 4;

/** Galhos de um nível já crescidos até a fração `p` (o filho só nasce na ponta do pai). */
const caminhoGalhos = (galhos: Galho[], nivel: number, p: number) =>
  galhos.filter((g) => g.nivel === nivel).map((g) =>
    `M${g.x1.toFixed(1)},${g.y1.toFixed(1)}L${(g.x1 + (g.x2 - g.x1) * p).toFixed(1)},${(g.y1 + (g.y2 - g.y1) * p).toFixed(1)}`).join("");

/** Folhas estreitas e compridas nas pontas: a folha do Quercus variabilis é lanceolada, não lobada. */
const FOLHAS = COPA.filter((g) => g.nivel >= 4).map((g, k) => {
  const ang = Math.atan2(g.y2 - g.y1, g.x2 - g.x1) + (ruido(k + 90) - 0.5) * 1.2;
  const c = 15, l = 3.5, ux = Math.cos(ang), uy = Math.sin(ang);
  const px = g.x2 + ux * c, py = g.y2 + uy * c, mx = g.x2 + ux * c * 0.5, my = g.y2 + uy * c * 0.5;
  return `M${g.x2.toFixed(1)},${g.y2.toFixed(1)}Q${(mx - uy * l).toFixed(1)},${(my + ux * l).toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}Q${(mx + uy * l).toFixed(1)},${(my - ux * l).toFixed(1)} ${g.x2.toFixed(1)},${g.y2.toFixed(1)}`;
}).join("");

/** A raiz lenhosa que leva até o fungo, por baixo do chão. */
export const raizAteFungo = (xFungo: number) =>
  curva([[TRONCO_X + 14, CHAO_CV + 4], [TRONCO_X + 120, CHAO_CV + 40], [xFungo - 150, CHAO_CV + 52], [xFungo - 30, CHAO_CV + 34], [xFungo, CHAO_CV + 4]]);

/**
 * Carvalho com raízes. `copa`, `raiz` e `folhas` vão de 0 a 1 e crescem nível a nível. A
 * casca grossa do sobreiro-chinês (é dele a cortiça) vira as fissuras do tronco.
 */
export const Carvalho: React.FC<{ tronco: number; copa: number; raiz: number; folhas: number; filtro: string }> = ({ tronco, copa, raiz, folhas, filtro }) => {
  const nivelDe = (p: number, n: number, k: number) => Math.max(0, Math.min(1, p * n - k));
  const topo = CHAO_CV - (CHAO_CV - TRONCO_TOPO) * tronco;
  const troncoD = `M${TRONCO_X - 24},${CHAO_CV}L${TRONCO_X - 24 + 12 * tronco},${topo}M${TRONCO_X + 24},${CHAO_CV}L${TRONCO_X + 24 - 12 * tronco},${topo}`;
  const fissuras = [-12, -3, 7, 15].map((dx, k) => {
    const y0 = CHAO_CV - 20 - 50 * ruido(k + 60), y1 = y0 - 60 - 60 * ruido(k + 70);
    return `M${TRONCO_X + dx},${y0}L${TRONCO_X + dx * 0.85 + 3},${y1}`;
  }).join("");
  return (
    <g>
      <Traco d={troncoD} filtro={filtro} cor={CIANO} w={2.2} o={tronco > 0 ? 1 : 0} />
      <path d={fissuras} stroke={CIANO} strokeOpacity={0.45 * tronco} strokeWidth={1.2} fill="none" />
      {Array.from({ length: NIVEIS_COPA }, (_, k) => {
        const p = nivelDe(copa, NIVEIS_COPA, k);
        return p > 0 && <Traco key={k} d={caminhoGalhos(COPA, k, p)} filtro={filtro} cor={CIANO} w={Math.max(1, 2.4 - k * 0.3)} brilho={0.4} />;
      })}
      {folhas > 0 && <path d={FOLHAS} fill="none" stroke={CIANO} strokeWidth={1} strokeOpacity={0.7 * folhas} />}
      {Array.from({ length: NIVEIS_RAIZ }, (_, k) => {
        const p = nivelDe(raiz, NIVEIS_RAIZ, k);
        return p > 0 && <Traco key={k} d={caminhoGalhos(RAIZES, k, p)} filtro={filtro} cor={TEXTO_2} w={Math.max(1, 2 - k * 0.3)} brilho={0.25} />;
      })}
    </g>
  );
};

// --- ícones do fecho --------------------------------------------------------------------------
/** Lente de aumento: círculo fino com uma linha de chamada até o objeto. */
export const Lente: React.FC<{ x: number; y: number; r: number; ate: [number, number]; p: number; filtro: string; children?: React.ReactNode }> = ({
  x, y, r, ate, p, filtro, children,
}) => {
  const circ = elipse(x, y, r, r);
  return (
    <g>
      <Traco d={circ} filtro={filtro} cor={TEXTO_2} w={1.5} p={p} brilho={0.2} />
      <line x1={x} y1={y + r} x2={ate[0]} y2={ate[1]} stroke={TEXTO_2} strokeWidth={1} strokeDasharray="4 6" opacity={p >= 1 ? 0.8 : 0} />
      <g opacity={p >= 1 ? 1 : 0}>{children}</g>
    </g>
  );
};

/** Pão de forma em perfil, com os cortes na casca. */
export const pao = (x: number, base: number) => ({
  corpo: `M${x - 105},${base}L${x + 105},${base}C${x + 112},${base - 40} ${x + 105},${base - 92} ${x + 62},${base - 104}C${x + 30},${base - 113} ${x - 30},${base - 113} ${x - 62},${base - 104}C${x - 105},${base - 92} ${x - 112},${base - 40} ${x - 105},${base}Z`,
  cortes: [-50, 0, 50].map((dx) => `M${x + dx - 18},${base - 82}L${x + dx + 18},${base - 100}`).join(""),
});

/** Levedura brotando (Saccharomyces): célula oval com um broto menor colado. */
export const Levedura: React.FC<{ x: number; y: number; p: number; filtro: string }> = ({ x, y, p, filtro }) => {
  const celula = elipse(x - 4, y + 6, 32, 26);
  const broto = elipse(x + 33, y - 18, 14, 12);
  return (
    <g transform={`rotate(-20 ${x} ${y})`}>
      <Traco d={celula} filtro={filtro} cor={CIANO} w={1.8} p={p} />
      <Traco d={broto} filtro={filtro} cor={CIANO} w={1.8} p={Math.max(0, p * 2 - 1)} />
      <circle cx={x - 10} cy={y + 8} r={7} fill="none" stroke={CIANO} strokeOpacity={0.6} strokeWidth={1.2} opacity={p >= 1 ? 1 : 0} />
    </g>
  );
};

/**
 * Pincel do Penicillium (é de onde vem o nome: "pincelzinho"): haste que se ramifica e
 * termina em cadeias de esporos redondos.
 */
export const Penicillium: React.FC<{ x: number; y: number; p: number; filtro: string }> = ({ x, y, p, filtro }) => {
  const base = y + 56, ramo = y + 8;
  const pontas = [-26, -9, 9, 26];
  const haste = `M${x},${base}L${x},${ramo}` + pontas.map((dx) => `M${x},${ramo}L${x + dx},${ramo - 18}`).join("");
  return (
    <g>
      <Traco d={haste} filtro={filtro} cor={CIANO} w={1.6} p={p} />
      {pontas.map((dx) => Array.from({ length: 4 }, (_, k) => (
        <circle key={`${dx}-${k}`} cx={x + dx * (1.1 + k * 0.12)} cy={ramo - 26 - k * 11} r={4.2} fill="none" stroke={CIANO} strokeWidth={1.2}
          opacity={Math.max(0, Math.min(1, p * 5 - 4 + (3 - k) * 0.2))} />
      )))}
    </g>
  );
};

/** Laranja com uma mancha de mofo (pontos e fiapos curtos sorteados por hash). */
export const Laranja: React.FC<{ x: number; y: number; r: number; p: number; mofo: number; filtro: string }> = ({ x, y, r, p, mofo, filtro }) => {
  const casca = elipse(x, y, r, r);
  const cabo = `M${x},${y - r}L${x + 4},${y - r - 14}M${x + 3},${y - r - 9}Q${x + 22},${y - r - 24} ${x + 36},${y - r - 14}Q${x + 20},${y - r - 4} ${x + 3},${y - r - 9}`;
  const cx = x + r * 0.35, cy = y + r * 0.3; // a mancha fica embaixo, à direita
  return (
    <g>
      <Traco d={casca} filtro={filtro} cor={TEXTO} w={2} p={p} brilho={0.3} />
      <Traco d={cabo} filtro={filtro} cor={TEXTO_2} w={1.4} p={p} brilho={0} />
      {Array.from({ length: 34 }, (_, k) => {
        const a = ruido(k + 120) * 2 * Math.PI, d = 36 * Math.sqrt(ruido(k + 160));
        const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.8;
        const o = Math.max(0, Math.min(1, mofo * 34 - k * 0.6));
        return k % 3 ? (
          <circle key={k} cx={px} cy={py} r={1.5 + 1.5 * ruido(k + 200)} fill={CIANO} opacity={0.85 * o} />
        ) : (
          <line key={k} x1={px} y1={py} x2={px + Math.cos(a) * 7} y2={py + Math.sin(a) * 7} stroke={CIANO} strokeWidth={1} opacity={0.7 * o} />
        );
      })}
    </g>
  );
};
