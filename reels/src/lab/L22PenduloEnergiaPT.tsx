import katex from "katex";
import "katex/dist/katex.min.css";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useFontesKatex } from "./formula";
import { Assinatura } from "./base";

// 22 — Pêndulo, energia potencial × cinética, em português e na identidade da casa.
// Mesmo movimento da réplica L21 (θ = 55°·cos, período 4 s), mas com a divisão de energia
// exata em vez do cos²/sen² dela, e 8 ciclos em 32 s; muda a pele: fundo escuro com brilho roxo, Poppins/Inter,
// paleta da marca, barras arredondadas num cartão de vidro, rótulos v e h na cena.
const { fontFamily: POPPINS } = loadPoppins("normal", { weights: ["700", "800"], subsets: ["latin"] });
const { fontFamily: INTER } = loadInter("normal", { weights: ["500", "600"], subsets: ["latin"] });

// 30fps e 32s não são escolha estética: o gate de publicação (scripts/reels/validar-mp4.js)
// exige exatamente 30fps, e a faixa de duração mais curta começa em 15s. 60fps/12s não
// passava, e furar a guarda pra subir um reel era o caminho errado. 32s = 8 períodos de 4s,
// então o loop continua fechando exato no quadro 960.
const FPS = 30;
const PERIODO = 4; // s
const CICLOS = 8;
const TOTAL = FPS * PERIODO * CICLOS; // 960 quadros = 32 s
const TH0 = (55 * Math.PI) / 180;
const PIVO = { x: 540, y: 520 };
const L = 500;
const Y_REF = PIVO.y + L;
const R_BOLA = 56;
const SETA_MAX = 270;
const RASTRO_S = 0.32;

const BASE_Y = 1530;
const BARRA_MAX = 320;
const BARRA_W = 150;
const COLUNAS = [250, 540, 830];

const FUNDO = "#0B0C1E";
const BRANCO = "#FAFAF7";
const EP = "#4facfe"; // azul da paleta
const EC = "#fa709a"; // coral da paleta
const EM = "#43e97b"; // verde da paleta
const ROXO = "#667eea";

const fase = (t: number) => (2 * Math.PI * t) / PERIODO;
const theta = (t: number) => TH0 * Math.cos(fase(t));
const posBola = (t: number) => ({ x: PIVO.x + L * Math.sin(theta(t)), y: PIVO.y + L * Math.cos(theta(t)) });

const Tex: React.FC<{ tex: string; size: number; color?: string; style?: React.CSSProperties }> = ({ tex, size, color, style }) => (
  <div
    style={{ position: "absolute", fontSize: size, color, lineHeight: 1, whiteSpace: "nowrap", ...style }}
    dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { throwOnError: true, output: "html" }) }}
  />
);

const fatia = (cx: number, cy: number, r: number, frac: number) => {
  if (frac <= 0.001) return "";
  if (frac >= 0.999) return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  const a = frac * 2 * Math.PI; // começa às 12h, sentido horário
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${cx + r * Math.sin(a)} ${cy - r * Math.cos(a)} Z`;
};

const misturar = (c1: string, c2: string, k: number) => {
  const rgb = (c: string) => [1, 3, 5].map((j) => parseInt(c.slice(j, j + 2), 16));
  const a = rgb(c1), b = rgb(c2);
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(",")})`;
};

export const L22PenduloEnergiaPT: React.FC = () => {
  useFontesKatex();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;

  const th = theta(t);
  const bola = posBola(t);
  // Fração de energia potencial EXATA pra altura atual: Ep/Etot = (1−cos θ)/(1−cos θ₀).
  // Não usar cos²(fase), que é a aproximação de ângulo pequeno: a 55° ela erra até 2
  // pontos percentuais, e as barras passariam a descrever um pêndulo diferente do
  // que está desenhado na tela.
  const pe = (1 - Math.cos(th)) / (1 - Math.cos(TH0));
  const ke = 1 - pe;

  const w = -TH0 * (2 * Math.PI / PERIODO) * Math.sin(fase(t));
  const dir = Math.sign(w) || 1;
  const tx = Math.cos(th) * dir;
  const ty = -Math.sin(th) * dir;
  const ponta = SETA_MAX * Math.sqrt(ke); // v ∝ √Ec — mesma fonte de verdade das barras
  const CAB = Math.min(40, ponta * 0.5);

  const N = 28;
  const rastro = Array.from({ length: N }, (_, i) => ({
    a: posBola(t - (RASTRO_S * i) / N),
    b: posBola(t - (RASTRO_S * (i + 1)) / N),
    op: 1 - i / N,
  }));

  const barras = [
    { h: BARRA_MAX * pe, cor: EP, nome: "p", sub: "potencial", tex: "mgh", pct: pe },
    { h: BARRA_MAX * ke, cor: EC, nome: "c", sub: "cinética", tex: "\\dfrac{mv^2}{2}", pct: ke },
    { h: BARRA_MAX, cor: EM, nome: "m", sub: "mecânica", tex: "E_p + E_c", pct: 1 },
  ];

  const corBola = misturar(EP, EC, ke);
  const alturaH = Y_REF - (bola.y + R_BOLA);
  const opV = interpolate(ponta, [70, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opH = interpolate(alturaH, [30, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nx = -ty, ny = tx; // normal à seta, pro rótulo v

  return (
    <AbsoluteFill style={{ background: FUNDO, overflow: "hidden" }}>
      {/* scripts/gerar-trilha-pendulo.mjs — 32s, mesmo período de 4s da animação e
          escrita circular, então o áudio fecha o loop junto com o vídeo. */}
      <Audio src={staticFile("trilha-pendulo.mp3")} volume={0.85} />
      {/* brilho roxo no topo e reflexo da bolinha */}
      <AbsoluteFill style={{ background: `radial-gradient(900px 700px at 50% 8%, ${ROXO}38, transparent 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(420px 420px at ${bola.x}px ${bola.y}px, ${corBola.replace("rgb", "rgba").replace(")", ",0.16)")}, transparent 70%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.6px, transparent 1.6px)",
          backgroundSize: "40px 40px",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 60%, transparent 85%)",
        }}
      />

      {/* cabeçalho */}
      <div style={{ position: "absolute", top: 118, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            fontFamily: INTER, fontWeight: 600, fontSize: 28, letterSpacing: 5, color: "rgba(250,250,247,0.85)",
            padding: "10px 26px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.05)",
          }}
        >
          ⚛️ FÍSICA · ENERGIA
        </div>
        <div style={{ marginTop: 26, fontFamily: POPPINS, fontWeight: 800, fontSize: 82, lineHeight: 1.04, letterSpacing: -1.5, textAlign: "center", color: BRANCO }}>
          Energia <span style={{ color: EP }}>potencial</span>
          <br />
          <span style={{ color: "rgba(250,250,247,0.45)", fontWeight: 700 }}>vs. </span>
          <span style={{ color: EC }}>cinética</span>
        </div>
      </div>

      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <filter id="brilho" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {barras.map((b, i) => (
            <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={b.cor} />
              <stop offset="1" stopColor={b.cor} stopOpacity={0.35} />
            </linearGradient>
          ))}
        </defs>

        {/* linha de referência h = 0 */}
        <line x1={150} x2={930} y1={Y_REF} y2={Y_REF} stroke="rgba(255,255,255,0.22)" strokeWidth={3} strokeDasharray="2 12" strokeLinecap="round" />

        {/* altura h */}
        {alturaH > 4 && (
          <g opacity={0.95}>
            <line x1={bola.x} x2={bola.x} y1={bola.y + R_BOLA} y2={Y_REF} stroke={EP} strokeWidth={5} strokeLinecap="round" />
            <line x1={bola.x - 14} x2={bola.x + 14} y1={Y_REF} y2={Y_REF} stroke={EP} strokeWidth={5} strokeLinecap="round" />
          </g>
        )}

        {/* rastro */}
        {rastro.map((s, i) => (
          <line key={i} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke={BRANCO}
            strokeOpacity={0.55 * Math.pow(s.op, 1.2)} strokeWidth={10 * s.op + 2} strokeLinecap="round" />
        ))}

        {/* suporte e haste */}
        <rect x={PIVO.x - 70} y={PIVO.y - 9} width={140} height={10} rx={5} fill="rgba(255,255,255,0.22)" />
        <line x1={PIVO.x} y1={PIVO.y} x2={bola.x} y2={bola.y} stroke="rgba(250,250,247,0.5)" strokeWidth={4} strokeLinecap="round" />
        <circle cx={PIVO.x} cy={PIVO.y} r={11} fill={BRANCO} />

        {/* velocidade */}
        {ponta > 4 && (
          <g filter="url(#brilho)">
            <line x1={bola.x} y1={bola.y} x2={bola.x + tx * (ponta - CAB * 0.7)} y2={bola.y + ty * (ponta - CAB * 0.7)}
              stroke={EC} strokeWidth={8} strokeLinecap="round" />
            <polygon
              fill={EC} stroke={EC} strokeWidth={4} strokeLinejoin="round"
              points={[
                [bola.x + tx * ponta, bola.y + ty * ponta],
                [bola.x + tx * (ponta - CAB) + nx * CAB * 0.6, bola.y + ty * (ponta - CAB) + ny * CAB * 0.6],
                [bola.x + tx * (ponta - CAB) - nx * CAB * 0.6, bola.y + ty * (ponta - CAB) - ny * CAB * 0.6],
              ].map((p) => p.join(",")).join(" ")}
            />
          </g>
        )}

        {/* bolinha: pizza Ep/Ec */}
        <g filter="url(#brilho)">
          <circle cx={bola.x} cy={bola.y} r={R_BOLA} fill={EP} />
          <path d={fatia(bola.x, bola.y, R_BOLA, ke)} fill={EC} />
        </g>
        <circle cx={bola.x} cy={bola.y} r={R_BOLA} fill="none" stroke={BRANCO} strokeWidth={5} />
        <circle cx={bola.x} cy={bola.y} r={10} fill={BRANCO} />

        {/* cartão das barras */}
        <rect x={56} y={1100} width={968} height={600} rx={36} fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.10)" strokeWidth={2} />
        {[1, 2, 3].map((k) => (
          <line key={k} x1={110} x2={970} y1={BASE_Y - (BARRA_MAX * k) / 4} y2={BASE_Y - (BARRA_MAX * k) / 4}
            stroke="rgba(255,255,255,0.07)" strokeWidth={2} strokeDasharray="4 10" strokeLinecap="round" />
        ))}
        {barras.map((b, i) => {
          const h = Math.max(b.h, 6);
          return (
            <g key={i}>
              <rect x={COLUNAS[i] - BARRA_W / 2} y={BASE_Y - h} width={BARRA_W} height={h} rx={Math.min(18, h / 2)}
                fill={`url(#g${i})`} />
              <rect x={COLUNAS[i] - BARRA_W / 2} y={BASE_Y - h} width={BARRA_W} height={Math.min(6, h)} rx={3}
                fill={b.cor} filter="url(#brilho)" />
            </g>
          );
        })}
        <line x1={96} x2={984} y1={BASE_Y} y2={BASE_Y} stroke="rgba(250,250,247,0.55)" strokeWidth={3} strokeLinecap="round" />
      </svg>

      {/* rótulos v e h na cena */}
      <div style={{
        position: "absolute", left: bola.x + tx * (ponta * 0.55) + nx * 42, top: bola.y + ty * (ponta * 0.55) + ny * 42,
        transform: "translate(-50%,-50%)", opacity: opV, fontFamily: INTER, fontWeight: 600, fontStyle: "italic", fontSize: 40, color: EC,
      }}>v</div>
      <div style={{
        position: "absolute", left: bola.x + (bola.x > PIVO.x ? -34 : 34), top: (bola.y + R_BOLA + Y_REF) / 2,
        transform: "translate(-50%,-50%)", opacity: opH, fontFamily: INTER, fontWeight: 600, fontStyle: "italic", fontSize: 40, color: EP,
      }}>h</div>
      <div style={{ position: "absolute", left: 936, top: Y_REF, transform: "translate(0,-50%)", fontFamily: INTER, fontWeight: 500, fontSize: 24, color: "rgba(250,250,247,0.4)" }}>
        h = 0
      </div>

      {/* fórmulas acompanhando o topo das barras */}
      {barras.map((b, i) => (
        <Tex key={i} tex={b.tex} size={i === 1 ? 38 : 42} color={b.cor}
          style={{ left: COLUNAS[i], top: BASE_Y - Math.max(b.h, 6) - 18, transform: "translate(-50%, -100%)" }} />
      ))}

      {/* nomes e porcentagens */}
      {barras.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: COLUNAS[i], top: BASE_Y + 22, transform: "translateX(-50%)", textAlign: "center", width: 260 }}>
          <div style={{ fontFamily: POPPINS, fontWeight: 800, fontSize: 46, color: b.cor, lineHeight: 1 }}>
            E<span style={{ fontSize: 28, verticalAlign: "-0.15em" }}>{b.nome}</span>
            <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 30, color: "rgba(250,250,247,0.8)", marginLeft: 12, fontVariantNumeric: "tabular-nums" }}>
              {Math.round(b.pct * 100)}%
            </span>
          </div>
          <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 26, color: "rgba(250,250,247,0.55)", marginTop: 8 }}>{b.sub}</div>
        </div>
      ))}

      {/* fecho */}
      <div style={{ position: "absolute", top: 1738, width: "100%", textAlign: "center", fontFamily: POPPINS, fontWeight: 700, fontSize: 38, color: BRANCO, letterSpacing: -0.5 }}>
        A energia muda de forma. <span style={{ color: EM }}>O total, nunca.</span>
      </div>
      <Assinatura claro />
    </AbsoluteFill>
  );
};
export const L22_TOTAL = TOTAL;
export const L22_FPS = FPS;
