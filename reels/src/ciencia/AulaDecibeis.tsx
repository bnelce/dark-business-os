import { AbsoluteFill, Audio, Easing, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import T from "./aula-decibeis-tempos.json";
import { Fundo, entre } from "./base";
import { CIANO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon } from "./ilustra-dolar";

// Aula narrada de INTENSIDADE E NÍVEL SONORO (decibéis), ~4,4 min. MATERIAL DE ESTUDO: não é reel pra publicar
// nem agendar. Pasta: negocios/ciencia-visual/marketing/reels/aula-decibeis-2026-11-13/ (roteiro, áudio e
// pipeline no README). Mesmo molde da AulaOndas: cada fala é uma cena em <Sequence> com relógio local, e os
// elementos entram na palavra em que a voz fala deles (aula-decibeis-tempos.json, de scripts/tempos-aula-decibeis.mjs).
//
// Tipografia da matemática: as contas vão em JetBrains Mono (com o subconjunto grego carregado aqui, pra β, π e Δ
// não caírem em fonte do sistema). Expoentes e índices são <Sup>/<Sub> montados com CSS, não os caracteres
// ⁻¹² / ₀, que nenhuma das duas fontes cobre. Seta, ≈ e ≠ também não estão nos subconjuntos: são SVG (<Simb>).

loadMono("normal", { weights: ["300", "400"], subsets: ["greek"] });

export const AULA_DECIBEIS_TOTAL = T.total;
type Id = keyof typeof T.pal;
const ORDEM = T.ordem as Id[];

const nz = (w: string) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
/** Quadro local (dentro da cena) em que a n-ésima ocorrência da palavra começa a ser falada. */
const marca = (id: Id, palavra: string, n = 1) => {
  const achadas = T.pal[id].filter((p) => p.w === nz(palavra));
  if (achadas.length < n) throw new Error(`"${palavra}" não aparece ${n}× na fala ${id}`);
  return achadas[n - 1].f;
};

const TAU = Math.PI * 2;
const io = Easing.inOut(Easing.cubic);
const ap = (f: number, de: number, d = 8) => entre(f, de - 2, de + d, Easing.out(Easing.cubic));
const mola = (f: number, de: number) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config: { damping: 14, stiffness: 150 } }));
const SOMBRA_TXT = "0 0 14px rgba(5,7,12,1), 0 0 6px rgba(5,7,12,1), 0 2px 4px rgba(0,0,0,0.9)";

// --- tipografia matemática ----------------------------------------------------------------------------------
const Sup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: "0.6em", position: "relative", top: "-0.78em", lineHeight: 0, marginLeft: "0.05em", letterSpacing: 0 }}>{children}</span>
);
const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: "0.6em", position: "relative", top: "0.32em", lineHeight: 0, marginLeft: "0.03em", letterSpacing: 0 }}>{children}</span>
);
/** 10 elevado a e (e com sinal de menos tipográfico). */
const P10: React.FC<{ e: string }> = ({ e }) => <span style={{ whiteSpace: "nowrap" }}>10<Sup>{e.replace("-", "−")}</Sup></span>;
const I0: React.FC = () => <>I<Sub>0</Sub></>;
const Wm2: React.FC = () => <>W/m<Sup>2</Sup></>;
/** Símbolos fora dos subconjuntos das fontes, desenhados em SVG na cor do texto. */
const Simb: React.FC<{ t: "seta" | "aprox" | "dif" }> = ({ t }) => (
  <svg viewBox="0 0 30 20" style={{ width: t === "seta" ? "0.95em" : "0.62em", height: "0.62em", verticalAlign: "-0.02em", margin: "0 0.18em", overflow: "visible" }}>
    <g stroke="currentColor" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {t === "seta" && <path d="M 2 10 H 27 M 19 3 L 27 10 L 19 17" />}
      {t === "aprox" && <path d="M 2 6.5 Q 8.5 1 15 6.5 T 28 6.5 M 2 15.5 Q 8.5 10 15 15.5 T 28 15.5" />}
      {t === "dif" && <path d="M 3 6.5 H 27 M 3 14 H 27 M 20 0 L 10 20" />}
    </g>
  </svg>
);
const L: React.FC<{ children: React.ReactNode; cor?: string }> = ({ children, cor = LARANJA }) => <span style={{ color: cor, fontWeight: 400 }}>{children}</span>;

// --- peças comuns ------------------------------------------------------------------------------------
const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <FiltroNeon id="adNeon" desvio={5} />
      <filter id="adBrilho" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={10} /></filter>
      <linearGradient id="adGrad" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="#4FD08A" />
        <stop offset="35%" stopColor="#C9D85A" />
        <stop offset="55%" stopColor="#F2D24B" />
        <stop offset="78%" stopColor="#FF8A4C" />
        <stop offset="100%" stopColor="#F2545B" />
      </linearGradient>
    </defs>
    {children}
  </svg>
);

/** Texto posicionado, ancorado no centro, à esquerda ou à direita de x. */
const Txt: React.FC<{
  x: number; y: number; o: number; tam?: number; cor?: string; ancora?: "c" | "l" | "r"; fonte?: string; peso?: number;
  esp?: number; children: React.ReactNode;
}> = ({ x, y, o, tam = 30, cor = TEXTO, ancora = "c", fonte = MONO, peso = 300, esp, children }) =>
  o <= 0 ? null : (
    <div style={{
      position: "absolute", left: x, top: y, opacity: o, whiteSpace: "pre", lineHeight: 1.2,
      translate: `${ancora === "c" ? "-50%" : ancora === "r" ? "-100%" : "0"} ${(1 - o) * 10}px`,
      textAlign: ancora === "c" ? "center" : ancora === "r" ? "right" : "left",
      fontFamily: fonte, fontWeight: peso, fontSize: tam, color: cor, letterSpacing: esp ?? (fonte === MONO ? 1 : 0), textShadow: SOMBRA_TXT,
    }}>{children}</div>
  );

const Topo: React.FC<{ id: Id; rotulo: string }> = ({ id, rotulo }) => {
  const k = ORDEM.indexOf(id);
  return (
    <>
      <svg width={1080} height={140} style={{ position: "absolute", top: 0 }}>
        {ORDEM.map((_, i) => (
          <rect key={i} x={90 + i * 70} y={74} width={62} height={5} fill={i === k ? LARANJA : i < k ? CIANO : TEXTO_2} opacity={i === k ? 1 : i < k ? 0.6 : 0.25} />
        ))}
      </svg>
      <div style={{ position: "absolute", top: 96, left: 90, fontFamily: MONO, fontSize: 24, letterSpacing: 4, color: TEXTO_2 }}>
        DECIBÉIS · {String(k + 1).padStart(2, "0")}/{ORDEM.length} · {rotulo}
      </div>
    </>
  );
};

const Titulo: React.FC<{ de: number; tam?: number; children: React.ReactNode }> = ({ de, tam = 88, children }) => {
  const f = useCurrentFrame();
  const p = mola(f, de);
  if (p <= 0) return null;
  return (
    <div style={{
      position: "absolute", top: 150, left: 86, right: 60, opacity: Math.min(1, p * 1.4), translate: `${(1 - p) * -30}px 0`,
      fontFamily: SORA, fontWeight: 400, fontSize: tam, lineHeight: 1.05, letterSpacing: -1, color: CIANO,
      textShadow: `0 0 28px ${CIANO}55, ${SOMBRA_TXT}`, whiteSpace: "nowrap",
    }}>{children}</div>
  );
};

/** Linhas que entram uma a uma (na palavra da voz) e ficam, com o filete ciano à esquerda. */
const Linhas: React.FC<{ linhas: [React.ReactNode, number][]; top: number; tam?: number; fonte?: string; passo?: number; left?: number }> = ({
  linhas, top, tam = 40, fonte = SORA, passo = 1.45, left = 86,
}) => {
  const f = useCurrentFrame();
  const visiveis = linhas.filter(([, de]) => f >= de - 2).length;
  if (!visiveis) return null;
  return (
    <div style={{ position: "absolute", top, left, width: 1000 - left }}>
      <div style={{ position: "absolute", left: 0, top: 4, width: 4, height: `${visiveis * tam * passo - tam * 0.35}px`, background: CIANO, boxShadow: `0 0 12px ${CIANO}` }} />
      {linhas.map(([t, de], i) => {
        const o = ap(f, de, 10);
        return (
          <div key={i} style={{
            opacity: o, translate: `${(1 - o) * 24}px 0`, marginLeft: 30, height: tam * passo, display: "flex", alignItems: "center",
            fontFamily: fonte, fontWeight: 300, fontSize: tam, color: TEXTO, whiteSpace: "nowrap", textShadow: SOMBRA_TXT, letterSpacing: fonte === MONO ? 0 : undefined,
          }}><span>{t}</span></div>
        );
      })}
    </div>
  );
};

const Seta: React.FC<{ x1: number; y1: number; x2: number; y2: number; cor?: string; o?: number; larg?: number; dupla?: boolean; cab?: number }> = ({
  x1, y1, x2, y2, cor = TEXTO, o = 1, larg = 3, dupla = false, cab = 16,
}) => {
  if (o <= 0) return null;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const ponta = (x: number, y: number, ang: number) =>
    `M ${x - cab * Math.cos(ang - 0.45)} ${y - cab * Math.sin(ang - 0.45)} L ${x} ${y} L ${x - cab * Math.cos(ang + 0.45)} ${y - cab * Math.sin(ang + 0.45)}`;
  return (
    <g opacity={o} stroke={cor} strokeWidth={larg} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <path d={ponta(x2, y2, a)} />
      {dupla && <path d={ponta(x1, y1, a + Math.PI)} />}
    </g>
  );
};

const Errado: React.FC<{ x: number; y: number; o: number; r?: number }> = ({ x, y, o, r = 22 }) =>
  o <= 0 ? null : (
    <g opacity={o} fill="none" strokeLinecap="round">
      <circle cx={x} cy={y} r={r} stroke={LARANJA} strokeWidth={3} />
      <path d={`M ${x - r * 0.4} ${y - r * 0.4} L ${x + r * 0.4} ${y + r * 0.4} M ${x + r * 0.4} ${y - r * 0.4} L ${x - r * 0.4} ${y + r * 0.4}`} stroke={LARANJA} strokeWidth={4} />
    </g>
  );

const Chip: React.FC<{ x: number; y: number; o: number; children: React.ReactNode; cor?: string; tam?: number }> = ({ x, y, o, children, cor = CIANO, tam = 28 }) =>
  o <= 0 ? null : (
    <div style={{
      position: "absolute", left: x, top: y, opacity: o, translate: `0 ${(1 - o) * 12}px`, padding: "8px 18px",
      border: `2px solid ${cor}`, color: TEXTO, fontFamily: MONO, fontSize: tam, letterSpacing: 1, whiteSpace: "nowrap", background: "rgba(5,7,12,0.75)",
      boxShadow: `0 0 14px ${cor}44`,
    }}>{children}</div>
  );

/** Fonte sonora pontual: núcleo laranja com brilho. */
const Fonte: React.FC<{ x: number; y: number; r?: number; o?: number }> = ({ x, y, r = 14, o = 1 }) => (
  <g opacity={o}>
    <circle cx={x} cy={y} r={r * 2.4} fill={LARANJA} opacity={0.35} filter="url(#adBrilho)" />
    <circle cx={x} cy={y} r={r} fill={LARANJA} />
  </g>
);

// --- régua de decibéis (0 a 120 dB, verde → vermelho, como na apostila) -------------------------------------
const PONTOS_REGUA = [
  { db: 0, nome: "LIMIAR DA AUDIÇÃO", alto: false, i: "-12" },
  { db: 30, nome: "SUSSURRO", alto: true, i: "-9" },
  { db: 60, nome: "CONVERSA", alto: false, i: "-6" },
  { db: 90, nome: "TRÂNSITO INTENSO", alto: true, i: "-3" },
  { db: 120, nome: "LIMIAR DA DOR", alto: false, i: "0" },
];
/** Régua em SVG + rótulos HTML. `revela` (0 a 1) desenha a barra da esquerda pra direita; `pts` = opacidade de cada ponto. */
const Regua: React.FC<{ x0: number; x1: number; y: number; h?: number; revela?: number; pts: number[]; intens?: number[]; tamRot?: number; clip: string; nomes?: boolean; o?: number }> = ({
  x0, x1, y, h = 56, revela = 1, pts, intens, tamRot = 24, clip, nomes = true, o = 1,
}) => {
  if (o <= 0) return null;
  const xd = (db: number) => x0 + (db / 120) * (x1 - x0);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <Svg>
        <clipPath id={clip}><rect x={x0 - 2} y={y - 4} width={(x1 - x0 + 4) * revela} height={h + 8} /></clipPath>
        <g clipPath={`url(#${clip})`}>
          <rect x={x0} y={y} width={x1 - x0} height={h} fill="url(#adGrad)" opacity={0.85} />
          <rect x={x0} y={y} width={x1 - x0} height={h} fill="none" stroke={TEXTO} strokeOpacity={0.5} strokeWidth={1.5} />
        </g>
        {PONTOS_REGUA.map((p, k) => pts[k] > 0 && (
          <g key={p.db} opacity={pts[k]}>
            <line x1={xd(p.db)} y1={nomes ? y - (p.alto ? 2.4 : 1.2) * tamRot : y - 8} x2={xd(p.db)} y2={y + h + 8} stroke={TEXTO} strokeWidth={2} />
          </g>
        ))}
      </Svg>
      {PONTOS_REGUA.map((p, k) => {
        const anc = p.db === 0 ? "l" : p.db === 120 ? "r" : "c";
        const yRot = y - (p.alto ? 2.4 : 1.2) * tamRot - tamRot * 1.25;
        return (
          <div key={p.db}>
            <Txt x={xd(p.db) + (anc === "l" ? -2 : anc === "r" ? 2 : 0)} y={yRot} o={nomes ? pts[k] : 0} ancora={anc} tam={tamRot} cor={TEXTO_2}>{p.nome}</Txt>
            <Txt x={xd(p.db)} y={y + h + 14} o={pts[k]} tam={tamRot + 4} cor={TEXTO} peso={400}>{`${p.db} dB`}</Txt>
            {intens && <Txt x={xd(p.db)} y={y + h + 14 + tamRot * 1.7} o={intens[k]} tam={tamRot} cor={CIANO}><P10 e={p.i} /></Txt>}
          </div>
        );
      })}
    </div>
  );
};

// --- 1. gancho: o som enfraquece longe da fonte ---------------------------------------------------------------
const Gancho: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("gancho", w, n);
  const fx = 190, fy = 1020; // quem grita
  const ox = 900; // quem ouve
  const oAmigo = ap(f, m("amigo")), oOuve = ap(f, m("ouve")), oEsp = ap(f, m("espalhou"));
  const oTitulo = 1 - entre(f, m("amigo") - 6, m("amigo") + 4);
  // Frentes de onda que saem de quem grita a cada 0,9 s; o traço some com a distância (a energia se espalha).
  const frentes = Array.from({ length: 10 }, (_, n) => {
    const r = ((t - m("grita") / 30) - n * 0.9) * 260;
    return r;
  }).filter((r) => r > 8 && r < 820);
  return (
    <AbsoluteFill>
      <Topo id="gancho" rotulo="INTRODUÇÃO" />
      {oTitulo > 0 && (
        <div style={{ opacity: oTitulo }}>
          <Titulo de={-20} tam={104}>Intensidade e</Titulo>
          <Txt x={86} y={270} o={1} ancora="l" fonte={SORA} peso={400} tam={104} cor={CIANO} esp={-1}>nível sonoro</Txt>
          <Txt x={90} y={410} o={1} ancora="l" tam={30} cor={TEXTO_2} esp={3}>AULA NARRADA · FÍSICA · DECIBÉIS</Txt>
        </div>
      )}
      <Txt x={86} y={170} o={ap(f, m("amigo"))} ancora="l" fonte={SORA} peso={400} tam={64} cor={CIANO} esp={-1}>{"Por que o som enfraquece\nlonge da fonte?"}</Txt>
      <Svg>
        {oAmigo > 0 && (
          <g opacity={oAmigo}>
            <defs><clipPath id="adGanchoClip"><rect x={60} y={560} width={960} height={900} /></clipPath></defs>
            <g clipPath="url(#adGanchoClip)">
              {frentes.map((r, i) => (
                <g key={i} opacity={Math.min(1, 70 / r) * (oEsp > 0 ? 1 : 1)}>
                  <Neon filtro="adNeon" largura={3}><circle cx={fx} cy={fy} r={r} fill="none" /></Neon>
                </g>
              ))}
            </g>
            {/* quem grita */}
            <circle cx={fx - 60} cy={fy - 70} r={24} fill="none" stroke={TEXTO} strokeWidth={4} />
            <path d={`M ${fx - 60} ${fy - 46} L ${fx - 60} ${fy + 40} M ${fx - 60} ${fy + 40} L ${fx - 84} ${fy + 100} M ${fx - 60} ${fy + 40} L ${fx - 36} ${fy + 100} M ${fx - 60} ${fy - 20} L ${fx - 26} ${fy - 50}`}
              stroke={TEXTO} strokeWidth={4} fill="none" strokeLinecap="round" />
            <Fonte x={fx} y={fy} r={10} />
          </g>
        )}
        {oOuve > 0 && (
          <g opacity={oOuve}>
            <circle cx={ox} cy={fy - 70} r={24} fill="none" stroke={TEXTO} strokeWidth={4} />
            <path d={`M ${ox} ${fy - 46} L ${ox} ${fy + 40} M ${ox} ${fy + 40} L ${ox - 24} ${fy + 100} M ${ox} ${fy + 40} L ${ox + 24} ${fy + 100}`}
              stroke={TEXTO} strokeWidth={4} fill="none" strokeLinecap="round" />
          </g>
        )}
      </Svg>
      <Txt x={fx - 60} y={fy + 130} o={oAmigo} tam={26}>GRITA</Txt>
      <Txt x={ox} y={fy + 130} o={oOuve} tam={26}>QUASE NÃO OUVE</Txt>
      <Txt x={ox} y={fy - 160} o={oOuve} tam={56} cor={LARANJA}>?</Txt>
      <Txt x={540} y={1300} o={ap(f, m("energia"))} fonte={SORA} tam={42}>A energia do grito <L>não sumiu</L>:</Txt>
      <Txt x={540} y={1370} o={oEsp} fonte={SORA} tam={42}>ela <L>se espalhou</L>.</Txt>
    </AbsoluteFill>
  );
};

// --- 2. intensidade: a esfera cresce de 1 m pra 10 m -------------------------------------------------------------
const Intensidade: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("intensidade", w, n);
  const cx = 540, cy = 1000, PX = 40; // 40 px por metro: r = 10 m vira 400 px
  const tCresce = m("dez"), tFim = m("maior");
  const rm = 1 + 9 * entre(f, tCresce, tFim, io);
  const R = rm * PX;
  const oEsf = ap(f, m("esfera")), oUm = ap(f, m("um"));
  const oArea = ap(f, m("área", 2)), oI = ap(f, m("cai"));
  // 60 "pacotes" de potência: os mesmos 60 sempre, espalhados por uma casca maior.
  const pacotes = Array.from({ length: 60 }, (_, i) => {
    const a = i * 2.39996 + t * 0.15;
    const z = 1 - (2 * (i + 0.5)) / 60; // distribuição uniforme na esfera (espiral de Fibonacci), vista de lado
    const rr = Math.sqrt(1 - z * z);
    return { x: cx + R * rr * Math.cos(a), y: cy + R * z * 0.98, frente: Math.sin(a) > 0 };
  });
  const brilho = 0.42 / (rm * rm); // intensidade ∝ 1/r²
  return (
    <AbsoluteFill>
      <Topo id="intensidade" rotulo="INTENSIDADE" />
      <Titulo de={0}>Intensidade sonora</Titulo>
      <Linhas top={290} tam={46} fonte={MONO} linhas={[
        [<>I = <L>P / A</L></>, m("igual")],
        [<>I = P / (4πr<Sup>2</Sup>) <span style={{ color: TEXTO_2, fontSize: "0.8em" }}>[<Wm2 />]</span></>, m("quatro")],
      ]} />
      <Txt x={980} y={312} o={ap(f, m("watts"))} ancora="r" tam={24} cor={TEXTO_2}>{"POTÊNCIA (W) POR\nMETRO QUADRADO"}</Txt>
      <Svg>
        {oEsf > 0 && (
          <g opacity={oEsf}>
            <circle cx={cx} cy={cy} r={R} fill={CIANO} opacity={brilho} />
            <Neon filtro="adNeon" largura={3}><circle cx={cx} cy={cy} r={R} fill="none" /></Neon>
            <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.28} fill="none" stroke={CIANO} strokeWidth={1.5} strokeDasharray="6 8" opacity={0.6} />
            {pacotes.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill={TEXTO} opacity={p.frente ? 0.85 : 0.3} />)}
          </g>
        )}
        <Fonte x={cx} y={cy} r={9} />
        {oUm > 0 && (
          <g opacity={oUm}>
            <line x1={cx} y1={cy} x2={cx + R} y2={cy} stroke={LARANJA} strokeWidth={3} />
            <circle cx={cx + R} cy={cy} r={6} fill={LARANJA} />
          </g>
        )}
      </Svg>
      <Txt x={cx + Math.max(R / 2, 0) + (R < 120 ? 70 : 0)} y={cy - 54} o={oUm} ancora={R < 120 ? "l" : "c"} tam={30} cor={LARANJA}>{`r = ${Math.round(rm)} m`}</Txt>
      <Txt x={540} y={cy + 52 + Math.max(0, R - 30)} o={oEsf * (1 - entre(f, tCresce, tCresce + 10))} tam={26} cor={TEXTO_2}>ESFERA DE ÁREA 4πr²</Txt>
      <Txt x={540} y={1430} o={ap(f, m("um"))} tam={32} ancora="c">{rm < 1.05 ? <>r = 1 m <Simb t="seta" /> A = 4π·1<Sup>2</Sup> = 4π m<Sup>2</Sup></> : <>r = 10 m <Simb t="seta" /> A = 4π·10<Sup>2</Sup> = 400π m<Sup>2</Sup></>}</Txt>
      <Chip x={110} y={1490} o={oArea} tam={30}>r ×10 <Simb t="seta" /> A ×100</Chip>
      <Chip x={600} y={1490} o={oI} cor={LARANJA} tam={30}>mesma P <Simb t="seta" /> I ÷100</Chip>
    </AbsoluteFill>
  );
};

// --- 3. o ouvido: 12 ordens de grandeza, escala logarítmica -------------------------------------------------------
const Escala: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("escala", w, n);
  const x0 = 120, x1 = 960;
  const oLin = ap(f, m("fraco")), oDoi = ap(f, m("dói")), oOrd = ap(f, m("ordens")), oTri = ap(f, m("trilhão"));
  const tLog = m("logarítmica");
  const yLin = 740, yLog = 1290;
  const passo = (x1 - x0) / 12;
  return (
    <AbsoluteFill>
      <Topo id="escala" rotulo="POR QUE LOG?" />
      <Titulo de={0}>O ouvido humano</Titulo>
      <Txt x={90} y={300} o={oLin} ancora="l" fonte={SORA} tam={40}>Mais fraco que se ouve: <L><P10 e="-12" /> <Wm2 /></L></Txt>
      <Txt x={90} y={370} o={oDoi} ancora="l" fonte={SORA} tam={40}>O que já dói: <L>1 <Wm2 /></L></Txt>
      {/* régua comum (linear): 10⁻¹² fica colado no zero */}
      <Txt x={x0} y={yLin - 110} o={oDoi} ancora="l" tam={24} cor={TEXTO_2} esp={3}>RÉGUA COMUM (LINEAR)</Txt>
      <Svg>
        {oDoi > 0 && (
          <g opacity={oDoi}>
            <line x1={x0} y1={yLin} x2={x1} y2={yLin} stroke={TEXTO} strokeWidth={3} />
            {Array.from({ length: 11 }, (_, i) => <line key={i} x1={x0 + i * (x1 - x0) / 10} y1={yLin - (i % 5 ? 10 : 18)} x2={x0 + i * (x1 - x0) / 10} y2={yLin + (i % 5 ? 10 : 18)} stroke={TEXTO_2} strokeWidth={2} />)}
            <circle cx={x0} cy={yLin} r={9} fill={LARANJA} />
            <circle cx={x1} cy={yLin} r={9} fill={CIANO} />
            <Seta x1={x0 + 120} y1={yLin + 90} x2={x0 + 14} y2={yLin + 16} cor={LARANJA} />
          </g>
        )}
        {f > tLog - 4 && (
          <g>
            <line x1={x0} y1={yLog} x2={x0 + (x1 - x0) * entre(f, tLog, tLog + 30)} y2={yLog} stroke={CIANO} strokeWidth={3} />
            {Array.from({ length: 13 }, (_, i) => {
              const o = ap(f, tLog + i * 3);
              return o > 0 && <line key={i} x1={x0 + i * passo} y1={yLog - 18} x2={x0 + i * passo} y2={yLog + 18} stroke={i === 0 ? LARANJA : i === 12 ? CIANO : TEXTO} strokeWidth={3} opacity={o} />;
            })}
          </g>
        )}
      </Svg>
      <Txt x={x0} y={yLin + 34} o={oDoi} tam={26} cor={TEXTO}>0</Txt>
      <Txt x={x1} y={yLin + 34} o={oDoi} tam={26} cor={TEXTO}>1 W/m²</Txt>
      <Txt x={x0 + 130} y={yLin + 80} o={oDoi} ancora="l" tam={24} cor={LARANJA}>{"O SOM MAIS FRACO FICA\nCOLADO NO ZERO"}</Txt>
      <Chip x={90} y={yLin + 190} o={oOrd} tam={30}>de <P10 e="-12" /> a 1 = 12 ordens de grandeza</Chip>
      <Chip x={90} y={yLin + 270} o={oTri} cor={LARANJA} tam={30}>1 / <P10 e="-12" /> = <P10 e="12" /> = 1 trilhão de vezes</Chip>
      <Txt x={x0} y={yLog - 110} o={ap(f, tLog)} ancora="l" tam={24} cor={TEXTO_2} esp={3}>ESCALA LOGARÍTMICA: CADA PASSO = ×10</Txt>
      {Array.from({ length: 13 }, (_, i) => (
        <Txt key={i} x={x0 + i * passo} y={yLog + 30} o={ap(f, tLog + i * 3)} tam={24} cor={i === 0 ? LARANJA : i === 12 ? CIANO : TEXTO_2}>
          {i === 12 ? "1" : <P10 e={String(i - 12)} />}
        </Txt>
      ))}
      <Txt x={540} y={yLog + 120} o={ap(f, m("potências"))} fonte={SORA} tam={38}>a escala <L>conta as potências de 10</L></Txt>
    </AbsoluteFill>
  );
};

// --- 4. β = 10·log(I/I₀) ---------------------------------------------------------------------------------------
const Formula: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("formula", w, n);
  const pecas: { s: React.ReactNode; de: number; cor?: string }[] = [
    { s: "β", de: m("beta"), cor: LARANJA },
    { s: "=", de: m("é") },
    { s: "10·", de: m("dez") },
    { s: "log", de: m("log") },
    { s: <>(I/<I0 />)</>, de: m("i") },
  ];
  const oDb = ap(f, m("decibéis"));
  const oAud = ap(f, m("limiar")), oDor = ap(f, m("limiar", 2));
  return (
    <AbsoluteFill>
      <Topo id="formula" rotulo="NÍVEL SONORO" />
      <Titulo de={0}>Nível sonoro</Titulo>
      <div style={{ position: "absolute", top: 330, left: 0, width: 1080, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 18 }}>
        {pecas.map((p, i) => {
          const o = ap(f, p.de, 10);
          return (
            <div key={i} style={{ opacity: o, translate: `0 ${(1 - o) * 30}px`, fontFamily: MONO, fontWeight: 400, fontSize: 104, color: p.cor ?? TEXTO, textShadow: `0 0 24px ${LARANJA}44, ${SOMBRA_TXT}` }}>{p.s}</div>
          );
        })}
      </div>
      <Txt x={540} y={480} o={oDb} tam={34} cor={TEXTO_2}>β em decibéis (dB)</Txt>
      <Txt x={540} y={570} o={ap(f, m("zero", 2))} tam={46} cor={CIANO}><I0 /> = <P10 e="-12" /> <Wm2 /></Txt>
      {/* cartão do limiar da audição */}
      <div style={{ position: "absolute", top: 700, left: 90, width: 900, height: 330, opacity: oAud, border: `2px solid ${TEXTO_2}`, background: "rgba(5,7,12,0.6)" }} />
      <Txt x={120} y={720} o={oAud} ancora="l" tam={26} cor={TEXTO_2} esp={3}>LIMIAR DA AUDIÇÃO</Txt>
      <Txt x={120} y={790} o={ap(f, m("audição"))} ancora="l" tam={38}>I = <I0 /> <Simb t="seta" /> I/<I0 /> = 1</Txt>
      <Txt x={120} y={870} o={ap(f, m("zero", 3))} ancora="l" tam={38}>β = 10·log 1 = 10·0</Txt>
      <Txt x={960} y={940} o={ap(f, m("decibel"))} ancora="r" tam={64} peso={400} cor={LARANJA}>0 dB</Txt>
      {/* cartão do limiar da dor */}
      <div style={{ position: "absolute", top: 1080, left: 90, width: 900, height: 400, opacity: ap(f, m("watt")), border: `2px solid ${TEXTO_2}`, background: "rgba(5,7,12,0.6)" }} />
      <Txt x={120} y={1100} o={ap(f, m("watt"))} ancora="l" tam={26} cor={TEXTO_2} esp={3}>I = 1 <Wm2 /></Txt>
      <Txt x={120} y={1170} o={ap(f, m("watt"))} ancora="l" tam={38}>I/<I0 /> = 1 / <P10 e="-12" /> = <P10 e="12" /></Txt>
      <Txt x={120} y={1250} o={ap(f, m("log", 2))} ancora="l" tam={38}>β = 10·log <P10 e="12" /> = 10·12</Txt>
      <Txt x={960} y={1330} o={ap(f, m("cento"))} ancora="r" tam={64} peso={400} cor={LARANJA}>120 dB</Txt>
      <Txt x={120} y={1410} o={oDor} ancora="l" tam={30} cor={TEXTO}>LIMIAR DA DOR</Txt>
    </AbsoluteFill>
  );
};

// --- 5. a régua de decibéis -------------------------------------------------------------------------------------
const ReguaCena: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("regua", w, n);
  const de = [m("zero"), m("sussurro"), m("conversa"), m("trânsito"), m("cento")];
  const revela = entre(f, m("régua") - 4, m("dor") + 6, Easing.inOut(Easing.quad));
  const pts = de.map((d) => ap(f, d));
  return (
    <AbsoluteFill>
      <Topo id="regua" rotulo="A RÉGUA" />
      <Titulo de={0}>A régua de decibéis</Titulo>
      <Regua clip="adReg1" x0={120} x1={960} y={800} h={70} revela={revela} pts={pts} intens={pts} tamRot={26} />
      <Txt x={90} y={1020} o={ap(f, de[0])} ancora="l" tam={22} cor={TEXTO_2} esp={2}>I (W/m²)</Txt>
      <Txt x={540} y={1160} o={ap(f, de[2])} fonte={SORA} tam={40}>de 30 em 30 dB:</Txt>
      <Txt x={540} y={1220} o={ap(f, de[2])} fonte={SORA} tam={40}>a intensidade vai <L>×1000</L> a cada passo</Txt>
      <Txt x={540} y={1300} o={ap(f, de[4])} tam={28} cor={TEXTO_2}>(conta da próxima cena: +30 dB = ×1000)</Txt>
    </AbsoluteFill>
  );
};

// --- tabela de variações (cenas 6 e 7) ---------------------------------------------------------------------------
type Linha = { a: React.ReactNode; b: React.ReactNode; c: React.ReactNode; de: number; deB?: number; destaque?: boolean };
const Tabela: React.FC<{ top: number; linhas: Linha[] }> = ({ top, linhas }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top, left: 80, width: 920, fontFamily: MONO, fontSize: 32, color: TEXTO }}>
      <div style={{ display: "flex", height: 64, alignItems: "center", borderBottom: `2px solid ${CIANO}`, color: CIANO, fontSize: 24, letterSpacing: 2 }}>
        <div style={{ width: 290, paddingLeft: 12 }}>VARIAÇÃO</div><div style={{ width: 300 }}>INTENSIDADE</div><div style={{ flex: 1 }}>POR QUÊ</div>
      </div>
      {linhas.map((r, i) => {
        const o = ap(f, r.de, 10), ob = ap(f, r.deB ?? r.de, 10);
        return (
          <div key={i} style={{ display: "flex", height: 84, alignItems: "center", borderBottom: `1px solid ${TEXTO_2}55`, opacity: o, translate: `${(1 - o) * 30}px 0`, background: r.destaque ? `${LARANJA}14` : undefined }}>
            <div style={{ width: 290, paddingLeft: 12 }}>{r.a}</div>
            <div style={{ width: 300, color: LARANJA, opacity: ob }}>{r.b}</div>
            <div style={{ flex: 1, color: TEXTO_2, fontSize: 28, opacity: ob }}>{r.c}</div>
          </div>
        );
      })}
    </div>
  );
};

// --- 6. a tabela: +10, +20, +30 dB ------------------------------------------------------------------------------
const TabelaCena: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("tabela", w, n);
  const r1 = m("mais", 2), r2 = m("mais", 3), r3 = m("mais", 4);
  return (
    <AbsoluteFill>
      <Topo id="tabela" rotulo="A TABELA DE PROVA" />
      <Titulo de={0}>A tabela de prova</Titulo>
      <Txt x={540} y={300} o={ap(f, m("diferença"))} tam={52} peso={400}>Δβ = 10·log(I<Sub>2</Sub>/I<Sub>1</Sub>)</Txt>
      <Txt x={540} y={385} o={ap(f, m("razão"))} tam={26} cor={TEXTO_2}>DIFERENÇA DE NÍVEL = 10 × LOG DA RAZÃO DAS INTENSIDADES</Txt>
      <Tabela top={490} linhas={[
        { a: "+10 dB", b: "× 10", c: <>log 10 = 1</>, de: r1, deB: m("multiplica") },
        { a: "+20 dB", b: "× 100", c: <>log 100 = 2</>, de: r2, deB: m("cem") },
        { a: "+30 dB", b: "× 1000", c: <>log 1000 = 3</>, de: r3, deB: m("mil") },
      ]} />
      <Svg>
        {[0, 1, 2].map((k) => {
          const o = ap(f, [r1, r2, r3][k] + 6);
          const x = 200 + k * 230;
          return o > 0 && <Seta key={k} x1={x} y1={1080} x2={x + 200} y2={1080} cor={k % 2 ? CIANO : TEXTO} o={o} larg={3} />;
        })}
      </Svg>
      {[0, 1, 2].map((k) => (
        <Txt key={k} x={300 + k * 230} y={1020} o={ap(f, [r1, r2, r3][k] + 6)} tam={28} cor={CIANO}>+10 dB</Txt>
      ))}
      {[0, 1, 2].map((k) => (
        <Txt key={`b${k}`} x={300 + k * 230} y={1100} o={ap(f, [r1, r2, r3][k] + 6)} tam={34} cor={LARANJA}>×10</Txt>
      ))}
      <Txt x={540} y={1230} o={ap(f, m("contar"))} fonte={SORA} tam={44}>cada <L>dezena de dB</L> = mais um fator 10</Txt>
      <Txt x={540} y={1310} o={ap(f, m("dezenas"))} tam={32} cor={TEXTO_2}>3 dezenas <Simb t="seta" /> 10·10·10 = <P10 e="3" /></Txt>
    </AbsoluteFill>
  );
};

// --- 7. +3 dB (dobrou) e distância ×10 (−20 dB) ----------------------------------------------------------------
const Dobro: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("dobro", w, n);
  const ja = -40; // as três primeiras linhas já estão na tela (vêm da cena anterior)
  return (
    <AbsoluteFill>
      <Topo id="dobro" rotulo="A TABELA DE PROVA" />
      <Titulo de={0}>Dobrou? E a distância?</Titulo>
      <Tabela top={290} linhas={[
        { a: "+10 dB", b: "× 10", c: "log 10 = 1", de: ja },
        { a: "+20 dB", b: "× 100", c: "log 100 = 2", de: ja },
        { a: "+30 dB", b: "× 1000", c: "log 1000 = 3", de: ja },
        { a: "+3 dB", b: "× 2 (dobrou)", c: <>log 2 <Simb t="aprox" /> 0,3</>, de: m("dobrar"), deB: m("dobrou"), destaque: true },
        { a: "distância×10", b: "÷ 100", c: <><Simb t="seta" /> −20 dB</>, de: m("distância"), deB: m("cem"), destaque: true },
      ]} />
      {/* contas */}
      <Linhas top={860} tam={40} fonte={MONO} passo={1.7} linhas={[
        [<>log 2 <Simb t="aprox" /> 0,3</>, m("dois")],
        [<>Δβ = 10 · 0,3 = <L>3 dB</L></>, m("dez")],
        [<>r ×10 <Simb t="seta" /> A ×100 <Simb t="seta" /> I ÷100</>, m("cai")],
        [<>Δβ = 10·log(1/100) = 10·(−2) = <L>−20 dB</L></>, m("menos")],
      ]} />
      <Txt x={540} y={1180} o={ap(f, m("dobrou"))} tam={28} cor={TEXTO_2}>INTENSIDADE ×2 <Simb t="seta" /> SÓ +3 dB</Txt>
      <Txt x={540} y={1240} o={ap(f, m("dois", 2))} tam={28} cor={TEXTO_2}>log 100 = 2 · DE 1/100 É −2</Txt>
    </AbsoluteFill>
  );
};

/** Figura da apostila: a fonte P = 4π·10⁻² W e as distâncias de 1 m e 10 m (fora de escala). */
const FiguraFonte: React.FC<{ y: number; o: number; o10: number; destaque: 1 | 10 }> = ({ y, o, o10, destaque }) => {
  const cx = 230;
  return (
    <>
      <Svg>
        <g opacity={o}>
          <circle cx={cx} cy={y} r={150} fill="none" stroke={destaque === 1 ? CIANO : TEXTO_2} strokeWidth={2.5} strokeDasharray="8 8" />
          <Fonte x={cx} y={y} r={11} />
          <line x1={cx} y1={y} x2={cx + 150} y2={y} stroke={destaque === 1 ? LARANJA : TEXTO_2} strokeWidth={2.5} />
          <circle cx={cx + 150} cy={y} r={8} fill={destaque === 1 ? LARANJA : TEXTO_2} />
        </g>
        <g opacity={o10}>
          <path d={`M ${cx + 640} ${y - 200} A 640 640 0 0 1 ${cx + 640} ${y + 200}`} transform={`translate(${-640 * (1 - Math.cos(0.31))} 0)`} fill="none" stroke={destaque === 10 ? CIANO : TEXTO_2} strokeWidth={2.5} strokeDasharray="8 8" />
          <line x1={cx + 150} y1={y} x2={cx + 620} y2={y} stroke={destaque === 10 ? LARANJA : TEXTO_2} strokeWidth={2.5} strokeDasharray="3 8" />
          <circle cx={cx + 620} cy={y} r={8} fill={destaque === 10 ? LARANJA : TEXTO_2} />
        </g>
      </Svg>
      <Txt x={cx} y={y + 30} o={o} tam={24} cor={TEXTO}>P = 4π·<P10 e="-2" /> W</Txt>
      <Txt x={cx + 150} y={y - 56} o={o} tam={26} cor={destaque === 1 ? LARANJA : TEXTO_2}>r = 1 m</Txt>
      <Txt x={cx + 620} y={y - 56} o={o10} tam={26} cor={destaque === 10 ? LARANJA : TEXTO_2}>r = 10 m</Txt>
      <Txt x={cx + 620} y={y + 210} o={o10} tam={20} cor={TEXTO_2}>(FORA DE ESCALA)</Txt>
    </>
  );
};

// --- 8. exemplo resolvido: a 1 m ---------------------------------------------------------------------------------
const Exemplo1: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("exemplo1", w, n);
  const tCancela = m("cancela");
  const risco = entre(f, tCancela, tCancela + 12);
  const Risc: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      {risco > 0 && <span style={{ position: "absolute", left: -4, top: "52%", height: 4, width: `calc(${risco * 100}% + 8px)`, background: LARANJA, rotate: "-14deg" }} />}
    </span>
  );
  return (
    <AbsoluteFill>
      <Topo id="exemplo1" rotulo="EXEMPLO RESOLVIDO" />
      <Titulo de={0}>Exemplo resolvido</Titulo>
      <Linhas top={290} tam={44} fonte={MONO} passo={1.65} linhas={[
        [<>P = 4π·<P10 e="-2" /> W</>, m("potência")],
        [<>A 1 m: I = <Risc>4π</Risc>·<P10 e="-2" /> / (<Risc>4π</Risc>·1<Sup>2</Sup>)</>, m("dividimos")],
        [<>I = <L><P10 e="-2" /> <Wm2 /></L></>, m("vale")],
        [<>I/<I0 /> = <P10 e="-2" /> / <P10 e="-12" /> = <L><P10 e="10" /></L></>, m("sobre")],
        [<>β = 10·log <P10 e="10" /> = 10·10</>, m("log")],
      ]} />
      <Txt x={980} y={680} o={ap(f, m("elevado", 5))} ancora="r" tam={28} cor={TEXTO_2}>EXPOENTES: −2 − (−12) = 10</Txt>
      <Txt x={540} y={960} o={ap(f, m("cem"))} tam={110} peso={400} cor={LARANJA}>β = 100 dB</Txt>
      <FiguraFonte y={1440} o={ap(f, m("fonte"))} o10={0} destaque={1} />
    </AbsoluteFill>
  );
};

// --- 9. a 10 m, e I = 10⁻⁶ ----------------------------------------------------------------------------------------
const Exemplo2: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("exemplo2", w, n);
  const p100 = 1, p80 = ap(f, m("oitenta")), p60 = ap(f, m("sessenta"));
  const xd = (db: number) => 120 + (db / 120) * 840;
  const yR = 1400;
  return (
    <AbsoluteFill>
      <Topo id="exemplo2" rotulo="EXEMPLO RESOLVIDO" />
      <Titulo de={0}>Agora a 10 m</Titulo>
      <Linhas top={290} tam={40} fonte={MONO} passo={1.6} linhas={[
        [<>A 10 m: A ×100 <Simb t="seta" /> I = <L><P10 e="-4" /> <Wm2 /></L></>, m("cai")],
        [<>I/<I0 /> = <P10 e="-4" /> / <P10 e="-12" /> = <P10 e="8" /></>, m("razão")],
        [<>β = 10·8 = <L>80 dB</L></>, m("oitenta")],
        [<>I = <P10 e="-6" /> <Simb t="seta" /> I/<I0 /> = <P10 e="6" /> <Simb t="seta" /> <L>60 dB</L></>, m("igual")],
      ]} />
      <Chip x={110} y={720} o={ap(f, m("distância"))} cor={LARANJA} tam={30}>distância ×10 <Simb t="seta" /> −20 dB (100 <Simb t="seta" /> 80)</Chip>
      <FiguraFonte y={960} o={1} o10={ap(f, m("metros"))} destaque={10} />
      <Regua clip="adReg2" x0={120} x1={960} y={yR} h={44} pts={[0.7, 0.7, 0.7, 0.7, 0.7]} tamRot={22} nomes={false} />
      <Svg>
        {[{ db: 100, o: p100 }, { db: 80, o: p80 }, { db: 60, o: p60 }].map(({ db, o }) => o > 0 && (
          <g key={db} opacity={o}>
            <path d={`M ${xd(db)} ${yR - 6} L ${xd(db) - 14} ${yR - 30} L ${xd(db) + 14} ${yR - 30} Z`} fill={LARANJA} />
          </g>
        ))}
      </Svg>
      {[{ db: 100, o: p100 }, { db: 80, o: p80 }, { db: 60, o: p60 }].map(({ db, o }) => (
        <Txt key={db} x={xd(db)} y={yR - 76} o={o} tam={28} cor={LARANJA} peso={400}>{`${db} dB`}</Txt>
      ))}
      <Txt x={xd(60)} y={yR + 110} o={ap(f, m("conversa"))} tam={26} cor={LARANJA}>60 dB = CONVERSA</Txt>
    </AbsoluteFill>
  );
};

// --- 10. pegadinha: escala logarítmica ----------------------------------------------------------------------------
const Pegadinha: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("pegadinha", w, n);
  const oDobro = ap(f, m("dobro")), oDez = ap(f, m("dezenas")), oMil = ap(f, m("mil"));
  const tMil = m("mil");
  const cel = 11, cols = 40, rows = 25, gx = 470, gy = 640;
  const acesos = Math.round(1000 * entre(f, tMil - 4, tMil + 26, Easing.out(Easing.quad)));
  const oMaq = ap(f, m("máquinas"));
  const vib = (k: number) => Math.sin(t * 40 + k) * 1.5;
  return (
    <AbsoluteFill>
      <Topo id="pegadinha" rotulo="PEGADINHA" />
      <Titulo de={0}>Pegadinha de prova</Titulo>
      <Txt x={90} y={290} o={ap(f, m("logarítmica"))} ancora="l" fonte={SORA} tam={42}>A escala é <L>logarítmica</L>.</Txt>
      <Txt x={150} y={370} o={oDobro} ancora="l" tam={42}>60 dB <Simb t="dif" /> 2 × 30 dB</Txt>
      <Svg><Errado x={110} y={396} o={oDobro} /></Svg>
      <Txt x={90} y={450} o={oDez} ancora="l" tam={34}>60 − 30 = 30 dB = 3 dezenas <Simb t="seta" /> <L><P10 e="3" /> = 1000×</L></Txt>
      {/* 1 quadradinho (30 dB) × 1000 quadradinhos (60 dB) */}
      <Svg>
        {oDez > 0 && (
          <g opacity={oDez}>
            <rect x={200} y={gy + rows * cel / 2 - cel / 2} width={cel - 2} height={cel - 2} fill={CIANO} />
            <circle cx={200 + cel / 2 - 1} cy={gy + rows * cel / 2 - 1} r={26} fill="none" stroke={CIANO} strokeWidth={2} opacity={0.7} />
            <rect x={gx - 2} y={gy - 2} width={cols * cel + 2} height={rows * cel + 2} fill="none" stroke={TEXTO_2} strokeWidth={1.5} opacity={0.6} />
            {Array.from({ length: acesos }, (_, k) => (
              <rect key={k} x={gx + (k % cols) * cel} y={gy + Math.floor(k / cols) * cel} width={cel - 2} height={cel - 2} fill={LARANJA} opacity={0.9} />
            ))}
          </g>
        )}
      </Svg>
      <Txt x={205} y={gy + 190} o={oDez} tam={26}>{"30 dB\nI = 1 parte"}</Txt>
      <Txt x={gx + cols * cel / 2} y={gy + rows * cel + 16} o={oMil} tam={26} cor={LARANJA}>60 dB · I = 1000 partes</Txt>
      {/* duas máquinas iguais */}
      <Svg>
        {oMaq > 0 && [0, 1].map((k) => {
          const o = k === 0 ? oMaq : ap(f, m("juntas"));
          const x = 150 + k * 230, y = 1130;
          return (
            <g key={k} opacity={o} transform={`translate(${vib(k)} 0)`}>
              <rect x={x} y={y} width={180} height={130} fill="rgba(5,7,12,0.7)" stroke={CIANO} strokeWidth={3} />
              <circle cx={x + 60} cy={y + 65} r={34} fill="none" stroke={CIANO} strokeWidth={3} />
              <circle cx={x + 60} cy={y + 65} r={8} fill={CIANO} />
              <rect x={x + 112} y={y + 30} width={46} height={12} fill={TEXTO_2} />
              <rect x={x + 112} y={y + 56} width={46} height={12} fill={TEXTO_2} />
              <rect x={x + 112} y={y + 82} width={46} height={12} fill={TEXTO_2} />
            </g>
          );
        })}
      </Svg>
      <Txt x={240} y={1290} o={oMaq} tam={26}>60 dB</Txt>
      <Txt x={470} y={1290} o={ap(f, m("juntas"))} tam={26}>60 dB</Txt>
      <Txt x={640} y={1150} o={ap(f, m("dobra"))} ancora="l" tam={34}>I × 2</Txt>
      <Txt x={640} y={1210} o={ap(f, m("três", 3))} ancora="l" tam={44} peso={400} cor={LARANJA}>= 63 dB</Txt>
      <Txt x={640} y={1275} o={ap(f, m("três", 3), 12)} ancora="l" tam={26} cor={TEXTO_2}>(NÃO 120 dB)</Txt>
      <Txt x={540} y={1380} o={ap(f, m("três", 3))} fonte={SORA} tam={38}>dobrar a intensidade soma só <L>+3 dB</L></Txt>
    </AbsoluteFill>
  );
};

// --- 11. questão 11ª, item a ------------------------------------------------------------------------------------------
const QuestaoA: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("questaoA", w, n);
  const tSus = m("sussurro");
  const xd = (db: number) => 120 + (db / 120) * 840;
  const yR = 1330;
  const oMarca = ap(f, m("trinta"));
  const pulso = 1 + 0.15 * Math.sin((f - tSus) / 4) * (f > tSus ? Math.exp(-(f - tSus) / 30) : 0);
  return (
    <AbsoluteFill>
      <Topo id="questaoA" rotulo="QUESTÃO 11ª" />
      <Titulo de={0}>Questão 11ª · item a</Titulo>
      <Txt x={90} y={280} o={ap(f, m("intensidade"))} ancora="l" fonte={SORA} tam={32} cor={TEXTO_2}>{"Nível sonoro de um som de I = "}<span style={{ color: TEXTO }}><P10 e="-9" /> <Wm2 /></span>?</Txt>
      <Txt x={90} y={330} o={ap(f, m("intensidade"))} ancora="l" fonte={SORA} tam={32} cor={TEXTO_2}>Mais perto de qual situação da escala?</Txt>
      <Linhas top={420} tam={42} fonte={MONO} passo={1.6} linhas={[
        [<>β = 10·log(<P10 e="-9" /> / <P10 e="-12" />)</>, m("beta")],
        [<>expoentes: −9 − (−12) = <L>3</L></>, m("subtraímos")],
        [<>β = 10·log <P10 e="3" /> = 10·3</>, m("log", 2)],
      ]} />
      <Txt x={540} y={800} o={oMarca} tam={110} peso={400} cor={LARANJA}>β = 30 dB</Txt>
      <Regua clip="adReg3" x0={120} x1={960} y={yR} h={56} o={ap(f, m("trinta") + 6)} pts={[1, 1, 1, 1, 1]} tamRot={22} />
      <Svg>
        {oMarca > 0 && (
          <g opacity={ap(f, m("trinta") + 8)}>
            <circle cx={xd(30)} cy={yR + 28} r={40 * pulso} fill="none" stroke={LARANJA} strokeWidth={5} />
          </g>
        )}
      </Svg>
      <Txt x={540} y={yR + 180} o={ap(f, tSus)} fonte={SORA} tam={40}>resposta: <L>30 dB, o sussurro</L></Txt>
    </AbsoluteFill>
  );
};

// --- 12. questão 11ª, item b -----------------------------------------------------------------------------------------
const QuestaoB: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("questaoB", w, n);
  const xd = (db: number) => 120 + (db / 120) * 840;
  const yR = 1000;
  const saltos = [m("dez"), m("dez", 2), m("dez", 3)];
  return (
    <AbsoluteFill>
      <Topo id="questaoB" rotulo="QUESTÃO 11ª" />
      <Titulo de={0}>Questão 11ª · item b</Titulo>
      <Txt x={90} y={280} o={ap(f, m("sala"))} ancora="l" fonte={SORA} tam={32} cor={TEXTO_2}>A sala passa de 40 dB para 70 dB. Quantas vezes</Txt>
      <Txt x={90} y={330} o={ap(f, m("sala"))} ancora="l" fonte={SORA} tam={32} cor={TEXTO_2}>a intensidade aumentou?</Txt>
      <Txt x={540} y={430} o={ap(f, m("quarenta"))} tam={64} peso={400}>40 dB <Simb t="seta" /> <span style={{ opacity: ap(f, m("setenta")) }}>70 dB</span></Txt>
      <Txt x={540} y={540} o={ap(f, m("subiu"))} tam={40}>Δβ = 70 − 40 = <L>+30 dB</L> = 3 dezenas</Txt>
      <Regua clip="adReg4" x0={120} x1={960} y={yR} h={56} pts={[0.7, 0.7, 0.7, 0.7, 0.7]} tamRot={22} nomes={false} />
      <Svg>
        <circle cx={xd(40)} cy={yR + 28} r={11} fill={TEXTO} opacity={ap(f, m("quarenta"))} />
        <circle cx={xd(70)} cy={yR + 28} r={11} fill={LARANJA} opacity={ap(f, m("setenta"))} />
        {saltos.map((de, k) => {
          const o = ap(f, de);
          const xa = xd(40 + k * 10), xb = xd(50 + k * 10);
          const p = entre(f, de - 2, de + 10);
          return o > 0 && (
            <g key={k} opacity={o}>
              <path d={`M ${xa} ${yR - 10} Q ${(xa + xb) / 2} ${yR - 110} ${xa + (xb - xa) * p} ${yR - 10 - 0 * p}`} fill="none" stroke={LARANJA} strokeWidth={3.5} />
            </g>
          );
        })}
      </Svg>
      {saltos.map((de, k) => (
        <Txt key={k} x={(xd(40 + k * 10) + xd(50 + k * 10)) / 2} y={yR - 160} o={ap(f, de)} tam={30} cor={LARANJA} peso={400}>×10</Txt>
      ))}
      <Txt x={540} y={1280} o={ap(f, m("dez"))} tam={52}>10 · 10 · 10 = <P10 e="3" /></Txt>
      <Txt x={540} y={1380} o={ap(f, m("mil"))} tam={84} peso={400} cor={LARANJA}>1000 vezes maior</Txt>
    </AbsoluteFill>
  );
};

// --- 13. resumo (fica parado no fim pra anotar) -----------------------------------------------------------------------
const Resumo: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("resumo", w, n);
  const linhas: { r: string; v: React.ReactNode; de: number }[] = [
    { r: "INTENSIDADE", v: <>I = P/A = P/(4πr<Sup>2</Sup>)  [<Wm2 />]</>, de: m("intensidade") },
    { r: "DISTÂNCIA", v: <>I cai com r<Sup>2</Sup>: r ×10 <Simb t="seta" /> I ÷100</>, de: m("quadrado") },
    { r: "NÍVEL SONORO", v: <><L>β = 10·log(I/<I0 />)</L>  [dB]</>, de: m("nível") },
    { r: "REFERÊNCIA", v: <><I0 /> = <P10 e="-12" /> <Wm2 /></>, de: m("log") },
    { r: "RÉGUA", v: <>0 dB audição · 120 dB dor</>, de: m("zero", 2) },
    { r: "+10/+20/+30 dB", v: <>I ×10 / ×100 / ×1000</>, de: m("mais") },
    { r: "+3 dB", v: <>I ×2 (dobrou) · log 2 <Simb t="aprox" /> 0,3</>, de: m("três") },
    { r: "DISTÂNCIA ×10", v: <L>−20 dB</L>, de: m("longe") },
    { r: "PEGADINHA", v: <>60 dB não é 2 × 30 dB: <L>×1000</L></>, de: m("vinte", 2) + 20 },
  ];
  return (
    <AbsoluteFill>
      <Topo id="resumo" rotulo="RESUMO" />
      <Titulo de={0}>Resumo da aula</Titulo>
      <div style={{ position: "absolute", top: 290, left: 70, width: 950 }}>
        {linhas.map((l, i) => {
          const o = ap(f, l.de, 10);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", minHeight: 124, borderTop: `1px solid ${TEXTO_2}66`, opacity: o, translate: `${(1 - o) * 30}px 0` }}>
              <div style={{ width: 280, flexShrink: 0, fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: CIANO }}>{l.r}</div>
              <div style={{ flex: 1, fontFamily: MONO, fontWeight: 300, fontSize: 34, lineHeight: 1.3, color: TEXTO, whiteSpace: "nowrap" }}>{l.v}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// --- legenda, áudio e montagem ---------------------------------------------------------------------------------
const Legenda: React.FC = () => {
  const f = useCurrentFrame();
  const bloco = T.legendas.find((l) => f >= l.de && f < l.ate);
  if (!bloco) return null;
  const s = 0.9 + 0.1 * mola(f, bloco.de);
  return (
    <div style={{
      position: "absolute", top: 1640, left: 80, width: 920, textAlign: "center",
      fontFamily: SORA, fontWeight: 400, fontSize: 54, lineHeight: 1.12, letterSpacing: -0.5, color: TEXTO,
      textShadow: "0 0 24px rgba(5,7,12,0.95), 0 3px 6px rgba(0,0,0,0.9)", scale: `${s}`, opacity: entre(f, bloco.de, bloco.de + 2),
    }}>
      {bloco.partes.map((p, i) => (
        <span key={i} style={{ color: p.chave ? LARANJA : TEXTO }}>{i ? " " : ""}{p.t}</span>
      ))}
    </div>
  );
};

const FUSAO = 10;
const Cena: React.FC<{ dur: number; primeira?: boolean; children: React.ReactNode }> = ({ dur, primeira, children }) => {
  const f = useCurrentFrame();
  const o = (primeira ? 1 : entre(f, 0, FUSAO)) * (1 - entre(f, dur - FUSAO, dur));
  return <AbsoluteFill style={{ opacity: o, background: "transparent" }}>{children}</AbsoluteFill>;
};

const CENAS: Record<Id, React.FC> = {
  gancho: Gancho, intensidade: Intensidade, escala: Escala, formula: Formula, regua: ReguaCena, tabela: TabelaCena,
  dobro: Dobro, exemplo1: Exemplo1, exemplo2: Exemplo2, pegadinha: Pegadinha, questaoA: QuestaoA, questaoB: QuestaoB, resumo: Resumo,
};

export const AulaDecibeis: React.FC = () => (
  <Fundo>
    {ORDEM.map((id, i) => {
      const { de, ate } = T.cena[id];
      const ultima = i === ORDEM.length - 1;
      const dur = ultima ? ate - de : ate - de + FUSAO;
      const C = CENAS[id];
      return (
        <Sequence key={id} from={de} durationInFrames={dur} name={id}>
          <Cena dur={ultima ? dur + FUSAO : dur} primeira={i === 0}><C /></Cena>
        </Sequence>
      );
    })}
    <Legenda />
    {ORDEM.map((id, k) => (
      <Sequence key={`a${id}`} from={T.fala[id]} name={`voz ${id}`}>
        <Audio src={staticFile(`ciencia/aula-decibeis/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
    {/* scripts/gerar-trilha-aula-decibeis.mjs: colchão discreto, whoosh e sino nas trocas de cena */}
    <Audio src={staticFile("ciencia/aula-decibeis/trilha.mp3")} volume={0.16} />
  </Fundo>
);
