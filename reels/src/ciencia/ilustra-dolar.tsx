import React from "react";
import { CIANO, TEXTO } from "./tokens";

// Ilustrações em traço fino do reel do dólar (ciencia/Dolar). Tudo é SVG desenhado em
// código, com o brilho de neon da identidade (uma cópia borrada e mais grossa por baixo
// do traço nítido), e anima só pelo quadro: quem chama passa o progresso `p` (0 a 1),
// calculado com entre() a partir de useCurrentFrame. Nada de transição CSS nem
// Math.random: o render é quadro a quadro e precisa sair igual em toda máquina.
//
// Cada ícone é desenhado em pixels, centrado em (0, 0), numa caixa de ~70 px, e se
// posiciona com <g transform="translate(...)">. Os ícones são abstratos de propósito:
// dizem "câmbio fixo acaba", "crise bancária", "urna", "gravação", sem fingir ser foto
// de nada.

/** Traço que se desenha: com pathLength 1, o tracejado corre de 1 (nada) a 0 (inteiro). */
export const traco = (p: number) => ({ pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - Math.max(0, Math.min(1, p)) });

/** Ruído com semente: a mesma entrada dá sempre o mesmo número entre 0 e 1. */
export const hash = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const FiltroNeon: React.FC<{ id: string; desvio?: number }> = ({ id, desvio = 5 }) => (
  <filter id={id} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={desvio} /></filter>
);

/**
 * Desenha os filhos duas vezes: halo borrado e grosso por baixo, traço nítido por cima.
 * Os filhos não definem stroke (herdam daqui); o que tiver preenchimento usa
 * fill="currentColor".
 */
export const Neon: React.FC<{ filtro: string; cor?: string; largura?: number; opacidade?: number; children: React.ReactNode }> = ({
  filtro, cor = CIANO, largura = 2.5, opacidade = 1, children,
}) => (
  <g opacity={opacidade} color={cor} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <g stroke={cor} strokeWidth={largura * 3.2} strokeOpacity={0.4} filter={`url(#${filtro})`}>{children}</g>
    <g stroke={cor} strokeWidth={largura}>{children}</g>
  </g>
);

// --- ícones do ranking ---------------------------------------------------------------------

/** 15/01/1999, o real sai do câmbio fixo: cadeado que abre (`abre` de 0 a 1). */
export const Cadeado: React.FC<{ p: number; abre: number }> = ({ p, abre }) => (
  <g>
    <rect x={-20} y={-4} width={40} height={30} {...traco(p)} />
    {/* A haste sobe e gira em torno da perna esquerda, que fica no corpo. */}
    <g transform={`translate(0 ${-9 * abre}) rotate(${-32 * abre} -12 -4)`}>
      <path d="M-12,-4 V-15 A12,12 0 0 1 12,-15 V-4" {...traco(p)} />
    </g>
    <g opacity={Math.max(0, p * 2 - 1)}>
      <circle cx={0} cy={8} r={3.5} />
      <line x1={0} y1={11.5} x2={0} y2={18} />
    </g>
  </g>
);

/** 08/10/2008, crise financeira global: fachada de banco com uma rachadura (`racha`). */
export const Banco: React.FC<{ p: number; racha: number }> = ({ p, racha }) => (
  <g>
    <path d="M-34,-12 L0,-31 L34,-12 Z" {...traco(p)} />
    <line x1={-31} x2={31} y1={-6} y2={-6} {...traco(p)} />
    {[-22, -8, 8, 22].map((x) => <line key={x} x1={x} x2={x} y1={-2} y2={17} {...traco(p)} />)}
    <line x1={-36} x2={36} y1={21} y2={21} {...traco(p)} />
    <line x1={-39} x2={39} y1={27} y2={27} {...traco(p)} />
    {racha > 0 && (
      <polyline points="3,-29 -3,-19 5,-10 -4,0 4,9 -2,18 2,27" stroke={TEXTO} strokeWidth={2} {...traco(racha)} />
    )}
  </g>
);

/**
 * 26/10/2026, 1º pregão após o 2º turno: uma urna eletrônica genérica (tela à esquerda,
 * teclado à direita). Neutra: sem número, sem cor de partido.
 */
export const Urna: React.FC<{ p: number }> = ({ p }) => {
  const teclas = Math.max(0, Math.min(1, (p - 0.6) / 0.4));
  return (
    <g>
      <rect x={-35} y={-23} width={70} height={46} {...traco(p)} />
      <rect x={-29} y={-17} width={30} height={23} {...traco(p)} />
      <line x1={-29} x2={1} y1={13} y2={13} {...traco(p)} />
      <g opacity={teclas}>
        {[0, 1, 2, 3].map((l) => [0, 1, 2].map((c) => (
          <rect key={`${l}${c}`} x={9 + c * 8} y={-16 + l * 7} width={5} height={3.5} strokeWidth={1.4} />
        )))}
        <rect x={9} y={13} width={21} height={4} strokeWidth={1.4} />
      </g>
    </g>
  );
};

/**
 * 13/01/1999, a banda cambial muda: duas linhas-limite com o preço andando entre elas;
 * com `muda`, o limite de cima abre e o preço sai pra cima.
 */
export const Banda: React.FC<{ p: number; muda: number }> = ({ p, muda }) => (
  <g>
    <line x1={-34} x2={34} y1={14} y2={14} {...traco(p)} />
    <line x1={-34} x2={2} y1={-10} y2={-10} {...traco(p)} />
    <line x1={2} x2={34} y1={-10} y2={-10 - 16 * muda} {...traco(p)} />
    <polyline points={`-34,6 -26,0 -18,7 -10,-2 -2,4 6,-4 ${14},${-6 - 10 * muda} ${24},${-12 - 12 * muda}`} strokeWidth={1.6} {...traco(p)} />
  </g>
);

/** 18/05/2017, "Joesley Day" (o caso de uma gravação): fita cassete, com os carretéis girando. */
export const Fita: React.FC<{ p: number; giro: number }> = ({ p, giro }) => (
  <g>
    <rect x={-35} y={-23} width={70} height={46} {...traco(p)} />
    <rect x={-23} y={-14} width={46} height={20} {...traco(p)} />
    <path d="M-20,23 L-15,13 L15,13 L20,23" {...traco(p)} />
    {[-11, 11].map((cx) => (
      <g key={cx} transform={`translate(${cx} -4)`} opacity={Math.max(0, p * 2 - 1)}>
        <circle r={6} />
        {[0, 120, 240].map((a) => {
          const r = ((a + giro) * Math.PI) / 180;
          return <line key={a} x1={0} y1={0} x2={Math.cos(r) * 6} y2={Math.sin(r) * 6} strokeWidth={1.4} />;
        })}
      </g>
    ))}
  </g>
);

// --- curva do sino ---------------------------------------------------------------------------

/**
 * Um sino cujo perfil é a própria curva normal (mesma fórmula, só em escala de ícone):
 * o apelido "curva do sino" virando desenho. Coroa em cima, badalo embaixo.
 */
const PERFIL_SINO = (() => {
  const pts: string[] = [];
  for (let x = -46; x <= 46; x += 2) pts.push(`${x},${(-68 * Math.exp(-((x / 17) ** 2) / 2)).toFixed(1)}`);
  return `M-52,0 L${pts.join(" L")} L52,0 Z`;
})();

export const Sino: React.FC<{ p: number }> = ({ p }) => (
  <g>
    <path d={PERFIL_SINO} {...traco(p)} />
    <circle cx={0} cy={-75} r={6} {...traco(p)} />
    <g opacity={Math.max(0, p * 2 - 1)}>
      <line x1={0} y1={0} x2={0} y2={7} />
      <circle cx={0} cy={12} r={5} />
    </g>
  </g>
);

// --- galáxia (idade do universo) -------------------------------------------------------------

const BRACOS = 2, VOLTAS = 1.6, B = 0.24;
/** Braço em espiral logarítmica, achatado como uma galáxia vista de lado. */
const braco = (k: number, fase: number, R: number) => {
  const tMax = VOLTAS * 2 * Math.PI;
  const pts: [number, number][] = [];
  for (let t = 0; t <= tMax + 1e-9; t += 0.08) {
    const r = R * Math.exp(B * (t - tMax));
    const a = t + fase + (k * 2 * Math.PI) / BRACOS;
    pts.push([r * Math.cos(a), r * Math.sin(a) * 0.48]);
  }
  return pts;
};

/** Galáxia em espiral: os braços se desenham, as estrelas acendem ao longo deles e giram devagar. */
export const Galaxia: React.FC<{ p: number; giro: number; R?: number }> = ({ p, giro, R = 95 }) => {
  const bracos = Array.from({ length: BRACOS }, (_, k) => braco(k, giro, R));
  return (
    <g transform="rotate(-18)">
      {bracos.map((pts, k) => (
        <path key={k} d={`M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")}`} {...traco(p)} />
      ))}
      <ellipse rx={12} ry={6} opacity={Math.min(1, p * 3)} />
      <circle r={3.5} fill="currentColor" stroke="none" opacity={Math.min(1, p * 3)} />
      {Array.from({ length: 46 }, (_, i) => {
        // Estrela i: um ponto ao longo de um braço, com desvio pseudoaleatório fixo.
        const pts = bracos[i % BRACOS];
        const u = 0.15 + 0.85 * hash(i);
        const [x, y] = pts[Math.floor(u * (pts.length - 1))];
        const acende = Math.max(0, Math.min(1, (p - u * 0.9) / 0.1));
        if (acende <= 0) return null;
        const dx = (hash(i + 100) - 0.5) * 16, dy = (hash(i + 200) - 0.5) * 8;
        return <circle key={i} cx={x + dx} cy={y + dy} r={0.9 + hash(i + 300) * 1.4} fill="currentColor" stroke="none" opacity={acende * (0.5 + 0.5 * hash(i + 400))} />;
      })}
    </g>
  );
};

/** "29.000.000.000.000.000.000": o número com dois algarismos significativos e todos os zeros. */
export const comZeros = (v: number) => {
  if (v < 10) return String(Math.round(v));
  let e = Math.floor(Math.log10(v));
  let m = Math.round(v / 10 ** (e - 1));
  if (m >= 100) { m = 10; e += 1; }
  return `${m}${"0".repeat(e - 1)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

