import { CIANO, LARANJA, TEXTO, TEXTO_2 } from "./tokens";
import { Traco, ruido } from "./ilustra-drex";

// Ilustrações em traço do reel do Roadster (ciencia/Roadster), redesenhadas a partir dos
// quadros dos vídeos oficiais da Tesla (marketing/reels/roadster-voador-2026-10-28/referencia):
// perfil em cunha com teto de vidro caindo até a traseira, traseira larga com a barra de luz
// na largura toda e os 4 bicos redondos em fila sob a placa. Nenhum quadro da Tesla entra
// no reel. Coordenadas locais sempre positivas: o filtro de brilho (Neon) é userSpaceOnUse
// e cortaria o que ficasse em coordenada negativa.

// --- perfil, olhando pra direita. Caixa 610 x 172, chão em y = 170 ------------------------
export const PERFIL = {
  w: 610, h: 170,
  corpo: "M8,128 L4,96 L12,84 L42,80 C140,66 250,36 330,30 C372,27 402,40 442,62 L560,86 C586,92 600,102 603,112 L597,126 L572,134 L546,134 A66,66 0 0 0 414,134 L186,134 A66,66 0 0 0 54,134 L30,134 Z",
  janela: "M74,82 C160,70 250,46 326,40 C360,37 388,47 416,64 C340,70 250,74 160,78 Z",
  vinco: "M598,114 L430,104 C320,100 200,100 14,98",
  rodas: [[120, 124], [480, 124]] as [number, number][],
  raio: 46,
  // tanques de fibra de carbono, posição esquemática (a Tesla só disse "dois, 600 L")
  tanques: ["M210,92 L370,84 A16,16 0 0 1 372,116 L212,122 A15,15 0 0 1 210,92 Z", "M34,104 L150,100 A13,13 0 0 1 152,126 L36,128 A12,12 0 0 1 34,104 Z"],
  // saída dos jatos de sustentação: perto dos cantos, por baixo
  bocaTras: [62, 134] as [number, number], bocaFrente: [552, 134] as [number, number],
};

const roda = (cx: number, cy: number, r: number, giro: number) => {
  let d = `M${cx - r},${cy}A${r},${r} 0 1 0 ${cx + r},${cy}A${r},${r} 0 1 0 ${cx - r},${cy}`;
  const ri = r * 0.72;
  d += `M${cx - ri},${cy}A${ri},${ri} 0 1 0 ${cx + ri},${cy}A${ri},${ri} 0 1 0 ${cx - ri},${cy}`;
  for (let k = 0; k < 5; k++) {
    const a = giro + (k * 2 * Math.PI) / 5;
    d += `M${cx + 7 * Math.cos(a)},${cy + 7 * Math.sin(a)}L${cx + ri * Math.cos(a)},${cy + ri * Math.sin(a)}`;
  }
  return d;
};

/**
 * Roadster de perfil. (x, y) é o meio do carro na altura do chão; `ang` gira em torno do
 * centro do corpo. `raioX` acende os tanques por dentro.
 */
export const Carro: React.FC<{
  x: number; y: number; s?: number; ang?: number; p?: number; o?: number; giroRoda?: number; filtro: string;
  cor?: string; raioX?: number;
}> = ({ x, y, s = 1, ang = 0, p = 1, o = 1, giroRoda = 0, filtro, cor = CIANO, raioX = 0 }) => {
  if (o <= 0 || p <= 0) return null;
  const tx = x - (PERFIL.w / 2) * s, ty = y - PERFIL.h * s;
  return (
    <g opacity={o} transform={`translate(${tx} ${ty}) scale(${s}) rotate(${ang} ${PERFIL.w / 2} 100)`}>
      <Traco d={PERFIL.corpo} filtro={filtro} cor={cor} w={2.4} p={p} brilho={0.55} preenche={0.05} />
      <Traco d={PERFIL.janela} filtro={filtro} cor={cor} w={1.4} p={p} brilho={0.2} />
      <Traco d={PERFIL.vinco} filtro={filtro} cor={TEXTO_2} w={1.2} p={p} brilho={0} />
      {PERFIL.rodas.map(([cx, cy]) => (
        <Traco key={cx} d={roda(cx, cy, PERFIL.raio, giroRoda)} filtro={filtro} cor={TEXTO} w={1.6} p={p} brilho={0.2} />
      ))}
      {raioX > 0 && PERFIL.tanques.map((d, k) => (
        <Traco key={k} d={d} filtro={filtro} cor={TEXTO} w={2} p={raioX} brilho={0.6} preenche={0.18} />
      ))}
    </g>
  );
};

/** Converte um ponto local do perfil pra tela, com a mesma conta do <Carro>. */
export const noPerfil = (pt: [number, number], x: number, y: number, s = 1): [number, number] =>
  [x - (PERFIL.w / 2) * s + pt[0] * s, y - PERFIL.h * s + pt[1] * s];

// --- traseira. Caixa 520 x 232, chão em y = 230 ---------------------------------------------
export const TRASEIRA = {
  w: 520, h: 230, cx: 260, cy: 150,
  corpo: "M44,204 L32,146 L52,114 L150,102 L198,60 L322,60 L370,102 L468,114 L488,146 L476,204 Z",
  vidro: "M208,68 L312,68 L352,100 L168,100 Z",
  luz: "M56,126 L464,126",
  placa: "M226,140 L294,140 L294,162 L226,162 Z",
  difusor: "M150,200 L150,216 M194,200 L194,218 M238,200 L238,218 M282,200 L282,218 M326,200 L326,218 M370,200 L370,216",
  pneus: "M50,176 L50,228 L94,228 L94,176 M426,176 L426,228 L470,228 L470,176",
  bicos: [179, 233, 287, 341].map((x) => [x, 184]) as [number, number][],
};

const circulo = (cx: number, cy: number, r: number) => `M${cx - r},${cy}A${r},${r} 0 1 0 ${cx + r},${cy}A${r},${r} 0 1 0 ${cx - r},${cy}`;

/** Traseira do Roadster. (x, y) é o centro de giro na tela; `ang` em graus. */
export const Traseira: React.FC<{
  x: number; y: number; s?: number; ang?: number; p?: number; o?: number; bicos?: number; filtro: string;
}> = ({ x, y, s = 1, ang = 0, p = 1, o = 1, bicos = 0, filtro }) => {
  if (o <= 0 || p <= 0) return null;
  const tx = x - TRASEIRA.cx * s, ty = y - TRASEIRA.cy * s;
  return (
    <g opacity={o} transform={`translate(${tx} ${ty}) scale(${s}) rotate(${ang} ${TRASEIRA.cx} ${TRASEIRA.cy})`}>
      <Traco d={TRASEIRA.corpo} filtro={filtro} cor={CIANO} w={2.4} p={p} brilho={0.55} preenche={0.05} />
      <Traco d={TRASEIRA.vidro} filtro={filtro} cor={CIANO} w={1.4} p={p} brilho={0.2} />
      <Traco d={TRASEIRA.luz} filtro={filtro} cor={TEXTO} w={3} p={p} brilho={0.5} />
      <Traco d={TRASEIRA.placa} filtro={filtro} cor={TEXTO_2} w={1.4} p={p} brilho={0} />
      <Traco d={TRASEIRA.difusor} filtro={filtro} cor={TEXTO_2} w={1.4} p={p} brilho={0} />
      <Traco d={TRASEIRA.pneus} filtro={filtro} cor={TEXTO} w={1.6} p={p} brilho={0.15} />
      {TRASEIRA.bicos.map(([bx, by], k) => {
        const b = Math.min(1, Math.max(0, bicos * 4 - k));
        return b > 0 ? <Traco key={k} d={circulo(bx, by, 14)} filtro={filtro} cor={LARANJA} w={2.4} p={b} brilho={0.9} preenche={0.25} /> : null;
      })}
    </g>
  );
};

// --- jato de ar com discos de Mach -----------------------------------------------------------
/**
 * Jato saindo de (x, y) na direção `ang` (graus, 0 = pra direita, 90 = pra baixo).
 * `forca` 0 a 1 controla comprimento e brilho; `mach` acende os losangos de choque, que só
 * aparecem com jato supersônico.
 */
export const Jato: React.FC<{
  x: number; y: number; ang: number; comp: number; forca: number; f: number; filtro: string; mach?: number; larg?: number; cor?: string;
}> = ({ x, y, ang, comp, forca, f, filtro, mach = 0, larg = 26, cor = LARANJA }) => {
  if (forca <= 0) return null;
  const a = (ang * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const L = comp * forca;
  const ponto = (t: number, lado: number): [number, number] => [x + ux * L * t + nx * lado, y + uy * L * t + ny * lado];
  const fios = [-1, -0.5, 0, 0.5, 1].map((k, i) => {
    const tremor = 0.85 + 0.15 * ruido(Math.floor(f / 2) * 7 + i);
    const [x2, y2] = ponto(tremor, k * larg * (0.6 + 0.9 * tremor));
    return `M${x + nx * k * larg * 0.25},${y + ny * k * larg * 0.25}L${x2},${y2}`;
  }).join("");
  const losangos = [0.16, 0.36, 0.55, 0.72].map((t, i) => {
    const meio = 0.09 * L * (1 - i * 0.18), w = larg * 0.42 * (1 - i * 0.18);
    const [cx, cy] = ponto(t, 0);
    return `M${cx - ux * meio},${cy - uy * meio}L${cx + nx * w},${cy + ny * w}L${cx + ux * meio},${cy + uy * meio}L${cx - nx * w},${cy - ny * w}Z`;
  }).join("");
  return (
    <g opacity={Math.min(1, forca * 1.5)}>
      <Traco d={fios} filtro={filtro} cor={cor} w={1.6} brilho={0.7} />
      {mach > 0 && <Traco d={losangos} filtro={filtro} cor={TEXTO} w={1.6} o={mach} brilho={0.8} preenche={0.25} />}
    </g>
  );
};

// --- nuvem de condensação ---------------------------------------------------------------------
/** Bolhas que crescem a partir de (x, y) durante `t` quadros e depois se desfazem. */
export const Nuvem: React.FC<{ x: number; y: number; t: number; filtro: string; n?: number; espalha?: number; dur?: number; semente?: number }> = ({
  x, y, t, filtro, n = 9, espalha = 220, dur = 90, semente = 0,
}) => {
  if (t <= 0 || t > dur * 1.6) return null;
  const u = Math.min(1, t / dur), some = 1 - Math.max(0, (t - dur) / (dur * 0.6));
  return (
    <g opacity={some}>
      {Array.from({ length: n }, (_, k) => {
        const ang = Math.PI + (k / (n - 1)) * Math.PI; // meia-lua pra cima, saindo do chão
        const d = espalha * (0.3 + 0.7 * ruido(k + semente)) * Math.sqrt(u);
        const r = (24 + 46 * ruido(k + 31 + semente)) * (0.4 + 0.6 * u);
        const cx = x + Math.cos(ang) * d, cy = y + Math.sin(ang) * d * 0.45 - r * 0.4;
        return <Traco key={k} d={circulo(cx, cy, r)} filtro={filtro} cor={TEXTO} w={1.4} brilho={0.3} preenche={0.1} o={0.85} />;
      })}
    </g>
  );
};

// --- frota estacionada, vista de frente (caixa com a base em y = 0) ----------------------------
// Proporções a 60 px por metro: Semi 2,6 x 3,4 m, Cybertruck 2,2 x 1,9 m, Model Y 1,95 x 1,62 m,
// Model 3 1,93 x 1,44 m.
export const FROTA: { nome: string; w: number; d: string }[] = [
  { nome: "MODEL Y", w: 118, d: "M2,0 L2,-36 C4,-48 14,-53 24,-55 C34,-82 52,-93 59,-93 C66,-93 84,-82 94,-55 C104,-53 114,-48 116,-36 L116,0 M10,-40 L108,-40" },
  { nome: "SEMI", w: 156, d: "M8,0 L8,-150 C8,-186 40,-204 78,-204 C116,-204 148,-186 148,-150 L148,0 M24,-160 L132,-160 L126,-108 L30,-108 Z M14,-56 L142,-56" },
  { nome: "CYBERTRUCK", w: 132, d: "M0,0 L2,-50 L34,-58 L52,-112 L80,-112 L98,-58 L130,-50 L132,0 M8,-48 L124,-48" },
  { nome: "MODEL 3", w: 116, d: "M2,0 L2,-30 C4,-40 14,-45 24,-47 C34,-72 50,-84 58,-84 C66,-84 82,-72 92,-47 C102,-45 112,-40 114,-30 L114,0 M10,-34 L106,-34" },
];

// --- miudezas -----------------------------------------------------------------------------------
export const Seta: React.FC<{ x1: number; y1: number; x2: number; y2: number; filtro: string; cor?: string; w?: number; p?: number; ponta?: number; brilho?: number }> = ({
  x1, y1, x2, y2, filtro, cor = CIANO, w = 3, p = 1, ponta = 22, brilho = 0.6,
}) => {
  if (p <= 0) return null;
  const ex = x1 + (x2 - x1) * p, ey = y1 + (y2 - y1) * p;
  const a = Math.atan2(ey - y1, ex - x1);
  const c1 = [ex - ponta * Math.cos(a - 0.45), ey - ponta * Math.sin(a - 0.45)];
  const c2 = [ex - ponta * Math.cos(a + 0.45), ey - ponta * Math.sin(a + 0.45)];
  return <Traco d={`M${x1},${y1}L${ex},${ey}M${c1[0]},${c1[1]}L${ex},${ey}L${c2[0]},${c2[1]}`} filtro={filtro} cor={cor} w={w} brilho={brilho} />;
};

export const Ventoinha: React.FC<{ x: number; y: number; r: number; giro: number; filtro: string; o?: number }> = ({ x, y, r, giro, filtro, o = 1 }) => {
  let d = circulo(x, y, r);
  for (let k = 0; k < 5; k++) {
    const a = giro + (k * 2 * Math.PI) / 5, b = a + 0.9;
    d += `M${x + 4 * Math.cos(a)},${y + 4 * Math.sin(a)}Q${x + r * 0.9 * Math.cos(a)},${y + r * 0.9 * Math.sin(a)} ${x + r * 0.85 * Math.cos(b)},${y + r * 0.85 * Math.sin(b)}`;
  }
  return <Traco d={d} filtro={filtro} cor={TEXTO} w={1.4} o={o} brilho={0.3} />;
};

/** Cubo em perspectiva isométrica de aresta `a`, com (x, y) no vértice de baixo da frente. */
export const cubo = (x: number, y: number, a: number) => {
  const c = Math.cos(Math.PI / 6) * a, m = a / 2;
  const f0 = [x, y], fe = [x - c, y - m], fd = [x + c, y - m];
  const t0 = [x, y - a], te = [x - c, y - m - a], td = [x + c, y - m - a], tt = [x, y - 2 * m - a];
  const L = (p: number[], q: number[]) => `M${p[0]},${p[1]}L${q[0]},${q[1]}`;
  return {
    frente: [L(f0, fe), L(f0, fd), L(f0, t0), L(fe, te), L(fd, td), L(t0, te), L(t0, td), L(te, tt), L(td, tt)].join(""),
    fundo: [L([x, y - 2 * m], fe), L([x, y - 2 * m], fd), L([x, y - 2 * m], tt)].join(""),
    meio: [x, y - m - a / 2] as [number, number],
  };
};

export const arco = (cx: number, cy: number, r: number, de: number, ate: number) => {
  const a0 = (de * Math.PI) / 180, a1 = (ate * Math.PI) / 180;
  const grande = Math.abs(ate - de) > 180 ? 1 : 0, sentido = ate > de ? 1 : 0;
  return `M${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)}A${r},${r} 0 ${grande} ${sentido} ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`;
};

export { circulo };
