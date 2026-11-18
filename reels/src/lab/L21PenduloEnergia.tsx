import katex from "katex";
import "katex/dist/katex.min.css";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { useEffect, useState } from "react";
import { useFontesKatex } from "./formula";

// 21 — Pêndulo, energia potencial × cinética. Réplica de estudo de um reel em Manim:
// fundo quase preto, notação LaTeX, uma tela só, 3 oscilações de 4s fechando loop perfeito.
// Todas as medidas abaixo saíram dos quadros do original (1080×1920, 60fps).
const FPS = 60;
const TOTAL = 720;
const PERIODO = 4; // s
const TH0 = (55 * Math.PI) / 180;
const PIVO = { x: 540, y: 480 };
const L = 540;
const Y_REF = PIVO.y + L; // ponto mais baixo da bolinha, onde mora a linha tracejada
const R_BOLA = 54;
const SETA_MAX = 280; // da bolinha até a ponta, na velocidade máxima
const RASTRO_S = 0.3;

const BASE_Y = 1500;
const BARRA_MAX = 385;
const BARRA_W = 124;
const COLUNAS = [240, 540, 840];

const FUNDO = "#0A0A0D";
const AZUL = "#355FB5";
const VERMELHO = "#E9624B";
const CIANO = "#49BADB";

const fase = (t: number) => (2 * Math.PI * t) / PERIODO;
const theta = (t: number) => TH0 * Math.cos(fase(t));
const posBola = (t: number) => ({ x: PIVO.x + L * Math.sin(theta(t)), y: PIVO.y + L * Math.cos(theta(t)) });

const Tex: React.FC<{ tex: string; size: number; color?: string; style?: React.CSSProperties }> = ({ tex, size, color, style }) => (
  <div
    style={{ position: "absolute", fontSize: size, color, lineHeight: 1, whiteSpace: "nowrap", ...style }}
    dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { throwOnError: true, output: "html" }) }}
  />
);

/** Rótulo que acompanha o topo da barra: centrado na coluna, base encostada `gap` px acima. */
// `sobe` compensa a caixa do KaTeX (descendente, fração): no original o pé da tinta fica sempre 29px acima da barra
const RotuloBarra: React.FC<{ tex: string; x: number; topo: number; cor: string; sobe?: number }> = ({ tex, x, topo, cor, sobe = 0 }) => (
  <Tex tex={tex} size={42} color={cor} style={{ left: x, top: topo - 9 - sobe, opacity: 0.88, transform: "translate(-50%, -100%)" }} />
);

/** Título em degradê azul → vermelho → ciano. background-clip:text não pega nos spans do KaTeX,
 *  então cada letra recebe a cor do degradê na sua posição. Iniciais em blackboard bold (KaTeX_AMS). */
const TITULO = [["P", "otential "], ["E", "nergy vs. "], ["K", "inetic "], ["E", "nergy"]];
// cores medidas no título do original — mais apagadas que a paleta das barras
const PARADAS: [number, string][] = [[0, "#4C65B2"], [0.5, "#D36F78"], [1, "#69ADC8"]];
const corEm = (u: number) => {
  const i = u < PARADAS[1][0] ? 0 : 1;
  const [u0, c0] = PARADAS[i];
  const [u1, c1] = PARADAS[i + 1];
  const k = (u - u0) / (u1 - u0);
  const rgb = (c: string) => [1, 3, 5].map((j) => parseInt(c.slice(j, j + 2), 16));
  const a = rgb(c0), b = rgb(c1);
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(",")})`;
};
const Titulo: React.FC = () => {
  const letras = TITULO.flatMap(([ini, resto]) => [
    { c: ini, fonte: "KaTeX_AMS" },
    ...Array.from(resto).map((c) => ({ c, fonte: "KaTeX_Main" })),
  ]);
  return (
    <div style={{ position: "absolute", top: 178, width: 1080, textAlign: "center", transform: "translateY(-50%)", fontSize: 53.6, whiteSpace: "pre" }}>
      {letras.map((l, i) => (
        <span key={i} style={{ fontFamily: l.fonte, color: corEm(i / (letras.length - 1)) }}>{l.c}</span>
      ))}
    </div>
  );
};

const fatia = (cx: number, cy: number, r: number, frac: number) => {
  if (frac <= 0.001) return "";
  if (frac >= 0.999) return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  // começa às 12h e corre no sentido horário
  const a = frac * 2 * Math.PI;
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x} ${y} Z`;
};

export const L21PenduloEnergia: React.FC = () => {
  useFontesKatex();
  // o hook da casa não espera a KaTeX_AMS (blackboard bold do título e de ℙ𝔼/𝕂𝔼)
  const [h] = useState(() => delayRender("KaTeX_AMS"));
  useEffect(() => {
    document.fonts.load("50px KaTeX_AMS").finally(() => continueRender(h));
  }, [h]);
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;

  const th = theta(t);
  const bola = posBola(t);
  // medido no original: as barras trocam como cos²/sen² da fase, não pelo mgh exato do arco
  const pe = Math.cos(fase(t)) ** 2;
  const ke = 1 - pe;

  // velocidade angular e direção tangente (sentido de θ crescente: (cosθ, −sinθ))
  const w = -TH0 * (2 * Math.PI / PERIODO) * Math.sin(fase(t));
  const vRel = Math.abs(Math.sin(fase(t)));
  const dir = Math.sign(w) || 1;
  const tx = Math.cos(th) * dir;
  const ty = -Math.sin(th) * dir;
  const ponta = SETA_MAX * vRel;
  const CAB = Math.min(42, ponta * 0.5);

  // rastro: posições do último 0,3 s, desbotando pra trás
  const N = 24;
  const rastro = Array.from({ length: N }, (_, i) => {
    const a = posBola(t - (RASTRO_S * i) / N);
    const b = posBola(t - (RASTRO_S * (i + 1)) / N);
    return { a, b, op: 1 - i / N };
  });

  const alturaPE = BARRA_MAX * pe;
  const alturaKE = BARRA_MAX * ke;
  const topos = [BASE_Y - alturaPE, BASE_Y - alturaKE, BASE_Y - BARRA_MAX];

  return (
    <AbsoluteFill style={{ background: FUNDO }}>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {[1, 2, 3, 4].map((k) => (
          <line key={k} x1={120} x2={960} y1={BASE_Y - (BARRA_MAX * k) / 4} y2={BASE_Y - (BARRA_MAX * k) / 4}
            stroke="#1D1D21" strokeWidth={4} strokeDasharray="6 6" />
        ))}
        <line x1={180} x2={900} y1={Y_REF} y2={Y_REF} stroke="#45454B" strokeWidth={3} strokeDasharray="6 6" />

        {[
          { h: alturaPE, cor: AZUL },
          { h: alturaKE, cor: VERMELHO },
          { h: BARRA_MAX, cor: CIANO },
        ].map((b, i) => (
          <rect key={i} x={COLUNAS[i] - BARRA_W / 2} y={BASE_Y - Math.max(b.h, 3)} width={BARRA_W} height={Math.max(b.h, 3)}
            fill={b.cor} fillOpacity={0.9} stroke={b.cor} strokeWidth={2} />
        ))}
        <line x1={60} x2={1020} y1={BASE_Y} y2={BASE_Y} stroke="#FAFAFC" strokeWidth={3} />

        {bola.y + R_BOLA < Y_REF && (
          <line x1={bola.x} x2={bola.x} y1={bola.y} y2={Y_REF} stroke={AZUL} strokeWidth={6} />
        )}

        {rastro.map((s, i) => (
          <line key={i} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke="#C8C6C9" strokeOpacity={0.9 * Math.pow(s.op, 0.7)}
            strokeWidth={7} strokeLinecap="round" />
        ))}

        <line x1={PIVO.x} y1={PIVO.y} x2={bola.x} y2={bola.y} stroke="#908D8E" strokeWidth={4} />

        {ponta > 4 && (
          <g>
            <line x1={bola.x} y1={bola.y} x2={bola.x + tx * (ponta - CAB * 0.8)} y2={bola.y + ty * (ponta - CAB * 0.8)}
              stroke={VERMELHO} strokeWidth={6} />
            <polygon
              fill={VERMELHO}
              points={[
                [bola.x + tx * ponta, bola.y + ty * ponta],
                [bola.x + tx * (ponta - CAB) - ty * CAB * 0.62, bola.y + ty * (ponta - CAB) + tx * CAB * 0.62],
                [bola.x + tx * (ponta - CAB) + ty * CAB * 0.62, bola.y + ty * (ponta - CAB) - tx * CAB * 0.62],
              ].map((p) => p.join(",")).join(" ")}
            />
          </g>
        )}

        <circle cx={bola.x} cy={bola.y} r={R_BOLA} fill={AZUL} />
        <path d={fatia(bola.x, bola.y, R_BOLA, ke)} fill={VERMELHO} />
        <circle cx={bola.x} cy={bola.y} r={R_BOLA} fill="none" stroke="#FAFAFC" strokeWidth={3.5} />
        <circle cx={bola.x} cy={bola.y} r={9} fill="#FAFAFC" />
        <circle cx={PIVO.x} cy={PIVO.y} r={10} fill="#FAFAFC" />
      </svg>

      <Titulo />

      <RotuloBarra tex="mgh" x={COLUNAS[0]} topo={topos[0]} cor={AZUL} sobe={12} />
      <RotuloBarra tex={"\\dfrac{1}{2}mv^2"} x={COLUNAS[1]} topo={topos[1]} cor={VERMELHO} sobe={22} />
      <RotuloBarra tex="E" x={COLUNAS[2]} topo={topos[2]} cor={CIANO} />

      {[
        { tex: "\\mathbb{PE}", cor: AZUL },
        { tex: "\\mathbb{KE}", cor: VERMELHO },
        { tex: "\\text{Total}", cor: CIANO },
      ].map((r, i) => (
        <Tex key={i} tex={r.tex} size={37} color={r.cor} style={{ left: COLUNAS[i], top: 1554, opacity: 0.88, transform: "translate(-50%, -50%)" }} />
      ))}
    </AbsoluteFill>
  );
};
export const L21_TOTAL = TOTAL;
export const L21_FPS = FPS;
