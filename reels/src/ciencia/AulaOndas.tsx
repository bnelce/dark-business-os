import { AbsoluteFill, Audio, Easing, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import T from "./aula-ondas-tempos.json";
import { Fundo, entre } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon } from "./ilustra-dolar";

// Aula narrada de ONDAS (física), ~4,4 min. MATERIAL DE ESTUDO: não é reel pra publicar nem agendar.
// Pasta: negocios/ciencia-visual/marketing/reels/aula-ondas-2026-11-12/ (roteiro, áudio e pipeline no README).
//
// Cada fala do roteiro é uma cena em <Sequence> com relógio próprio: dentro da cena, `useCurrentFrame()`
// é local e as marcas (`marca(id, "palavra")`) vêm do Whisper por palavra, já em quadros locais
// (aula-ondas-tempos.json, gerado por scripts/tempos-aula-ondas.mjs). Os elementos entram na palavra
// em que a voz fala deles: título, definição escrita e o exemplo animado.
//
// Física das animações (conferida no README): ondas progressivas y = A·sen(kx − ωt) andando pra direita;
// na mola, o deslocamento é no eixo da propagação; na mudança de meio a fase é contínua na fronteira
// (mesma ω, k maior na água → λ menor); na destrutiva a onda 2 é exatamente −onda 1 (soma zero).

export const AULA_ONDAS_TOTAL = T.total;
type Id = keyof typeof T.pal;
const ORDEM = T.ordem as Id[];

const nz = (w: string) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
/** Quadro local (dentro da cena) em que a n-ésima ocorrência da palavra começa a ser falada. */
const marca = (id: Id, palavra: string, n = 1) => {
  const achadas = T.pal[id].filter((p) => p.w === nz(palavra));
  if (achadas.length < n) throw new Error(`"${palavra}" não aparece ${n}× na fala ${id}`);
  return achadas[n - 1].f;
};
/** Fim da n-ésima ocorrência. */
const marcaFim = (id: Id, palavra: string, n = 1) => {
  const achadas = T.pal[id].filter((p) => p.w === nz(palavra));
  if (achadas.length < n) throw new Error(`"${palavra}" não aparece ${n}× na fala ${id}`);
  return achadas[n - 1].fe;
};

const TAU = Math.PI * 2;
const io = Easing.inOut(Easing.cubic);
const ap = (f: number, de: number, d = 8) => entre(f, de - 2, de + d, Easing.out(Easing.cubic));
const mola = (f: number, de: number) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config: { damping: 14, stiffness: 150 } }));
const mod = (a: number, b: number) => ((a % b) + b) % b;
const SOMBRA_TXT = "0 0 14px rgba(5,7,12,1), 0 0 6px rgba(5,7,12,1), 0 2px 4px rgba(0,0,0,0.9)";

/** Caminho SVG de uma função y(x). */
const curva = (x0: number, x1: number, y: (x: number) => number, passo = 4) => {
  let d = "";
  for (let x = x0; x <= x1 + 0.001; x += passo) d += `${x === x0 ? "M" : "L"}${x.toFixed(1)} ${y(x).toFixed(1)} `;
  return d;
};
/** Posição de x em [xa, xa+per) da família x = base + n·per. */
const naJanela = (base: number, xa: number, per: number) => xa + mod(base - xa, per);

/** Texto rico: *assim* sai em laranja. */
const rico = (s: string) =>
  s.split("*").map((parte, i) => (
    <span key={i} style={i % 2 ? { color: LARANJA, fontWeight: 400 } : undefined}>{parte}</span>
  ));

// --- peças comuns ------------------------------------------------------------------------------------

const Defs: React.FC = () => (
  <defs>
    <FiltroNeon id="aoNeon" desvio={5} />
    <filter id="aoBrilho" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={10} /></filter>
  </defs>
);

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <Defs />
    {children}
  </svg>
);

/** Rótulo de texto posicionado (HTML), ancorado no centro, à esquerda ou à direita de x. */
const Txt: React.FC<{
  x: number; y: number; o: number; tam?: number; cor?: string; ancora?: "c" | "l" | "r"; fonte?: string; peso?: number;
  esp?: number; children: React.ReactNode;
}> = ({ x, y, o, tam = 30, cor = TEXTO, ancora = "c", fonte = MONO, peso = 300, esp, children }) =>
  o <= 0 ? null : (
    <div style={{
      position: "absolute", left: x, top: y, opacity: o, whiteSpace: "pre", lineHeight: 1.2,
      translate: `${ancora === "c" ? "-50%" : ancora === "r" ? "-100%" : "0"} ${(1 - o) * 10}px`,
      textAlign: ancora === "c" ? "center" : ancora === "r" ? "right" : "left",
      fontFamily: fonte, fontWeight: peso, fontSize: tam, color: cor, letterSpacing: esp ?? (fonte === MONO ? 2 : 0), textShadow: SOMBRA_TXT,
    }}>{children}</div>
  );

/** Faixa de progresso da aula (15 conceitos) e rótulo da cena. */
const Topo: React.FC<{ id: Id; rotulo: string }> = ({ id, rotulo }) => {
  const k = ORDEM.indexOf(id);
  return (
    <>
      <svg width={1080} height={140} style={{ position: "absolute", top: 0 }}>
        {ORDEM.map((_, i) => {
          const x = 90 + i * 61;
          return <rect key={i} x={x} y={74} width={52} height={5} fill={i === k ? LARANJA : i < k ? CIANO : TEXTO_2} opacity={i === k ? 1 : i < k ? 0.6 : 0.25} />;
        })}
      </svg>
      <div style={{ position: "absolute", top: 96, left: 90, fontFamily: MONO, fontSize: 24, letterSpacing: 4, color: TEXTO_2 }}>
        ONDAS · {String(k + 1).padStart(2, "0")}/15 · {rotulo}
      </div>
    </>
  );
};

const Titulo: React.FC<{ de: number; tam?: number; children: React.ReactNode }> = ({ de, tam = 96, children }) => {
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

/** Definição escrita: cada linha entra na palavra em que a voz chega nela, e fica. */
const Def: React.FC<{ linhas: [string, number][]; top?: number; tam?: number }> = ({ linhas, top = 300, tam = 42 }) => {
  const f = useCurrentFrame();
  const visiveis = linhas.filter(([, de]) => f >= de - 2).length;
  if (!visiveis) return null;
  return (
    <div style={{ position: "absolute", top, left: 86, width: 930 }}>
      <div style={{ position: "absolute", left: 0, top: 6, width: 4, height: `${visiveis * tam * 1.28 - 10}px`, background: CIANO, boxShadow: `0 0 12px ${CIANO}` }} />
      {linhas.map(([t, de], i) => {
        const o = ap(f, de, 10);
        return (
          <div key={i} style={{
            opacity: o, translate: `${(1 - o) * 24}px 0`, marginLeft: 30, fontFamily: SORA, fontWeight: 300, fontSize: tam,
            lineHeight: 1.28, color: TEXTO, whiteSpace: "nowrap", textShadow: SOMBRA_TXT,
          }}>{rico(t)}</div>
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

/** Chave horizontal (medida) entre x1 e x2. */
const Medida: React.FC<{ x1: number; x2: number; y: number; o: number; cor?: string; tracejado?: boolean }> = ({ x1, x2, y, o, cor = LARANJA, tracejado }) =>
  o <= 0 ? null : (
    <g opacity={o} stroke={cor} strokeWidth={3} fill="none" strokeDasharray={tracejado ? "8 8" : undefined}>
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1} y1={y - 14} x2={x1} y2={y + 14} strokeDasharray="none" />
      <line x1={x2} y1={y - 14} x2={x2} y2={y + 14} strokeDasharray="none" />
    </g>
  );

const Certo: React.FC<{ x: number; y: number; o: number; r?: number }> = ({ x, y, o, r = 22 }) =>
  o <= 0 ? null : (
    <g opacity={o} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx={x} cy={y} r={r} stroke={CIANO} strokeWidth={3} />
      <path d={`M ${x - r * 0.45} ${y + r * 0.02} L ${x - r * 0.1} ${y + r * 0.38} L ${x + r * 0.5} ${y - r * 0.35}`} stroke={CIANO} strokeWidth={4} />
    </g>
  );
const Errado: React.FC<{ x: number; y: number; o: number; r?: number }> = ({ x, y, o, r = 22 }) =>
  o <= 0 ? null : (
    <g opacity={o} fill="none" strokeLinecap="round">
      <circle cx={x} cy={y} r={r} stroke={LARANJA} strokeWidth={3} />
      <path d={`M ${x - r * 0.4} ${y - r * 0.4} L ${x + r * 0.4} ${y + r * 0.4} M ${x + r * 0.4} ${y - r * 0.4} L ${x - r * 0.4} ${y + r * 0.4}`} stroke={LARANJA} strokeWidth={4} />
    </g>
  );

const Chip: React.FC<{ x: number; y: number; o: number; children: React.ReactNode; cor?: string }> = ({ x, y, o, children, cor = CIANO }) =>
  o <= 0 ? null : (
    <div style={{
      position: "absolute", left: x, top: y, opacity: o, translate: `0 ${(1 - o) * 12}px`, padding: "8px 18px",
      border: `2px solid ${cor}`, color: TEXTO, fontFamily: MONO, fontSize: 28, letterSpacing: 2, whiteSpace: "nowrap", background: "rgba(5,7,12,0.7)",
      boxShadow: `0 0 14px ${cor}44`,
    }}>{children}</div>
  );

// --- 1. abertura: a ola do estádio e a definição -------------------------------------------------------
const Abertura: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("abertura", w, n);
  const cx = 540, cy = 1080, rx = 410, ry = 230;
  const pico = -Math.PI / 2 + t * (TAU / 7); // a ola dá uma volta a cada 7 s
  const aneis = [{ s: 1, n: 46 }, { s: 0.86, n: 40 }, { s: 0.72, n: 34 }];
  const oTorcedor = ap(f, m("torcedor"));
  const ALVO_I = Math.round(46 / 4); // o torcedor laranja: anel de fora, na frente (perto de π/2)
  const pessoas = aneis.flatMap(({ s, n }, ai) => Array.from({ length: n }, (_, i) => {
    const a = (TAU * i) / n;
    const bx = cx + rx * s * Math.cos(a), by = cy + ry * s * Math.sin(a);
    const d = Math.atan2(Math.sin(a - pico), Math.cos(a - pico));
    const h = Math.exp(-(d * d) / (2 * 0.24 * 0.24));
    const ehAlvo = ai === 0 && i === ALVO_I;
    return { bx, by, h, ehAlvo, key: `${ai}-${i}` };
  }));
  const alvo = pessoas.find((p) => p.ehAlvo)!;
  const oVolta = ap(f, m("volta"));
  const arco = (() => {
    let d = "";
    for (let k = 0; k <= 30; k++) {
      const a = pico - 1.2 + (k / 30) * 1.0;
      d += `${k ? "L" : "M"}${(cx + rx * 1.16 * Math.cos(a)).toFixed(1)} ${(cy + ry * 1.2 * Math.sin(a)).toFixed(1)} `;
    }
    return d;
  })();
  const aFim = pico - 0.2;
  const pf = { x: cx + rx * 1.16 * Math.cos(aFim), y: cy + ry * 1.2 * Math.sin(aFim) };
  const pa = { x: cx + rx * 1.16 * Math.cos(aFim - 0.05), y: cy + ry * 1.2 * Math.sin(aFim - 0.05) };
  const oDef = m("definição");
  return (
    <AbsoluteFill>
      <Topo id="abertura" rotulo="DEFINIÇÃO" />
      {f < oDef + 4 && (
        <div style={{ opacity: 1 - entre(f, oDef - 4, oDef + 4) }}>
          <Titulo de={-20} tam={150}>Ondas</Titulo>
          <Txt x={90} y={330} o={1} ancora="l" tam={30} cor={TEXTO_2}>AULA NARRADA · FÍSICA</Txt>
        </div>
      )}
      <Titulo de={oDef}>Definição de onda</Titulo>
      <Def linhas={[["Perturbação que se *propaga*", m("perturbação")], ["levando *energia*,", m("energia")], ["sem levar *matéria*.", m("matéria")]]} />
      <Svg>
        <ellipse cx={cx} cy={cy} rx={rx * 0.55} ry={ry * 0.5} fill="none" stroke={CIANO} strokeOpacity={0.25} strokeWidth={2} />
        <ellipse cx={cx} cy={cy} rx={rx * 1.06} ry={ry * 1.08} fill="none" stroke={CIANO} strokeOpacity={0.18} strokeWidth={2} />
        {pessoas.sort((a, b) => a.by - b.by).map((p) => {
          const alt = 10 + 40 * p.h;
          const cor = p.ehAlvo && oTorcedor > 0 ? LARANJA : CIANO;
          return (
            <g key={p.key} opacity={p.ehAlvo && oTorcedor > 0 ? 1 : 0.35 + 0.65 * p.h}>
              <line x1={p.bx} y1={p.by} x2={p.bx} y2={p.by - alt} stroke={cor} strokeWidth={p.ehAlvo ? 5 : 3} strokeLinecap="round" />
              <circle cx={p.bx} cy={p.by - alt - 6} r={p.ehAlvo ? 7 : 5} fill={cor} />
            </g>
          );
        })}
        <Seta x1={alvo.bx + 44} y1={alvo.by - 4} x2={alvo.bx + 44} y2={alvo.by - 64} dupla cor={LARANJA} o={ap(f, m("levanta"))} />
        {oVolta > 0 && (
          <g opacity={oVolta}>
            <path d={arco} fill="none" stroke={TEXTO} strokeWidth={4} strokeLinecap="round" />
            <Seta x1={pa.x} y1={pa.y} x2={pf.x} y2={pf.y} cor={TEXTO} larg={4} cab={20} />
          </g>
        )}
      </Svg>
      <Txt x={540} y={1370} o={ap(f, m("levanta"))} cor={LARANJA} tam={32}>CADA UM SÓ LEVANTA E SENTA</Txt>
      <Txt x={540} y={1420} o={ap(f, m("ninguém"))} tam={32}>NINGUÉM SAI DO LUGAR</Txt>
      <Txt x={540} y={cy - 22} o={oVolta} tam={30}>A ONDA DÁ A VOLTA</Txt>
    </AbsoluteFill>
  );
};

// --- 2. a rolha no lago ------------------------------------------------------------------------------------
const Rolha: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("rolha", w, n);
  const yc = 1000, A = 55, lam = 380, k = TAU / lam, w = TAU / 2.2;
  const y = (x: number) => yc - A * Math.sin(k * x - w * t);
  const xr = 540, yr = y(xr);
  const superficie = curva(60, 1020, y);
  const oE = ap(f, m("energia"));
  return (
    <AbsoluteFill>
      <Topo id="rolha" rotulo="EXEMPLO" />
      <Titulo de={0}>A rolha no lago</Titulo>
      <Def linhas={[["A rolha só *sobe e desce* no lugar.", m("sobe")], ["Quem viaja é a *energia*, não a água.", m("energia")]]} />
      <Svg>
        <path d={`${superficie} L 1020 1460 L 60 1460 Z`} fill={CIANO} opacity={0.07} />
        <Neon filtro="aoNeon" largura={4}><path d={superficie} /></Neon>
        {Array.from({ length: 24 }, (_, i) => {
          const x = 90 + i * 39;
          return <circle key={i} cx={x} cy={1170 - 0.4 * A * Math.sin(k * x - w * t)} r={5} fill={CIANO} opacity={0.5} />;
        })}
        <line x1={xr} y1={yc - A - 80} x2={xr} y2={yc + A + 40} stroke={TEXTO_2} strokeWidth={2} strokeDasharray="6 8" opacity={ap(f, m("sobe"))} />
        <Seta x1={xr + 70} y1={yc - A - 30} x2={xr + 70} y2={yc + A + 10} dupla cor={TEXTO} o={ap(f, m("sobe"))} />
        <rect x={xr - 22} y={yr - 40} width={44} height={62} rx={6} fill={LARANJA} />
        <rect x={xr - 22} y={yr - 40} width={44} height={14} rx={4} fill="#FFB08F" />
        {oE > 0 && (
          <g opacity={oE}>
            <line x1={120} y1={800} x2={940} y2={800} stroke={LARANJA} strokeWidth={6} strokeDasharray="30 18" strokeDashoffset={-t * 90} />
            <Seta x1={900} y1={800} x2={960} y2={800} cor={LARANJA} larg={6} cab={26} />
          </g>
        )}
      </Svg>
      <Txt x={xr + 100} y={yc - A - 70} o={ap(f, m("sobe"))} ancora="l" tam={28}>SÓ SOBE{"\n"}E DESCE</Txt>
      <Txt x={540} y={730} o={oE} cor={LARANJA} tam={34}>ENERGIA VIAJA →</Txt>
      <Txt x={540} y={1220} o={ap(f, m("água"))} tam={30} cor={TEXTO}>A ÁGUA OSCILA E FICA NO LUGAR</Txt>
    </AbsoluteFill>
  );
};

// --- 3. natureza: mecânica × eletromagnética ---------------------------------------------------------------
const Natureza: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("natureza", w, n);
  const k = TAU / 260, w = TAU * 0.7;
  const oMec = ap(f, m("mecânica")), oEle = ap(f, m("eletromagnética")), oProva = ap(f, m("clássico"));
  const yEM = 1010;
  return (
    <AbsoluteFill>
      <Topo id="natureza" rotulo="CLASSIFICAÇÃO 1" />
      <Titulo de={m("natureza") - 6}>Pela natureza</Titulo>
      <Txt x={90} y={300} o={oMec} ancora="l" fonte={SORA} peso={400} tam={52} cor={CIANO}>Mecânica</Txt>
      <Txt x={90} y={370} o={ap(f, m("meio"))} ancora="l" fonte={SORA} tam={38}>{rico("precisa de um *meio material*")}</Txt>
      <Svg>
        {oMec > 0 && (
          <g opacity={oMec}>
            {Array.from({ length: 5 }, (_, r) => Array.from({ length: 22 }, (_, c) => {
              const x = 110 + c * 40, y0 = 470 + r * 34;
              return <circle key={`${r}-${c}`} cx={x} cy={y0 - 16 * Math.sin(k * x - w * t)} r={5} fill={CIANO} opacity={0.75} />;
            }))}
          </g>
        )}
        {oEle > 0 && (
          <g opacity={oEle}>
            {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 211) % 940 + 70} cy={930 + ((i * 97) % 170)} r={1.6} fill={TEXTO} opacity={0.5} />)}
            <Neon filtro="aoNeon" largura={4}><path d={curva(90, 990, (x) => yEM - 70 * Math.sin(TAU * x / 220 - TAU * 0.8 * t))} /></Neon>
          </g>
        )}
        {oProva > 0 && (
          <g opacity={oProva}>
            <rect x={70} y={1232} width={940} height={300} fill="rgba(5,7,12,0.6)" stroke={LARANJA} strokeWidth={2} />
            <Errado x={128} y={1330} o={ap(f, m("som", 2))} />
            <circle cx={140} cy={1460} r={34} fill={LARANJA} opacity={ap(f, m("sol"))} />
            <circle cx={140} cy={1460} r={60} fill={LARANJA} opacity={0.3 * ap(f, m("sol"))} filter="url(#aoBrilho)" />
            <circle cx={940} cy={1460} r={26} fill="#0F3B57" stroke={CIANO} strokeWidth={3} opacity={ap(f, m("sol"))} />
            <g opacity={ap(f, m("sol"))}>
              <Neon filtro="aoNeon" largura={3}><path d={curva(190, 900, (x) => 1460 - 22 * Math.sin(TAU * x / 70 - TAU * 1.2 * t))} /></Neon>
            </g>
          </g>
        )}
      </Svg>
      <Chip x={90} y={650} o={ap(f, m("som"))}>SOM NO AR</Chip>
      <Chip x={360} y={650} o={ap(f, m("mar"))}>ONDA DO MAR</Chip>
      <Chip x={650} y={650} o={ap(f, m("corda"))}>CORDA DE VIOLÃO</Chip>
      <Txt x={90} y={770} o={oEle} ancora="l" fonte={SORA} peso={400} tam={52} cor={CIANO}>Eletromagnética</Txt>
      <Txt x={90} y={840} o={ap(f, m("vácuo"))} ancora="l" fonte={SORA} tam={38}>{rico("não precisa de meio: anda no *vácuo*")}</Txt>
      <Chip x={90} y={1110} o={ap(f, m("luz"))}>LUZ</Chip>
      <Chip x={230} y={1110} o={ap(f, m("rádio"))}>RÁDIO</Chip>
      <Chip x={400} y={1110} o={ap(f, m("wifi"))}>WI-FI</Chip>
      <Chip x={580} y={1110} o={ap(f, m("raio"))}>RAIO X</Chip>
      <Txt x={90} y={1244} o={oProva} ancora="l" cor={LARANJA} tam={26} esp={4}>CLÁSSICO DE PROVA</Txt>
      <Txt x={170} y={1310} o={ap(f, m("som", 2))} ancora="l" fonte={SORA} tam={38}>No espaço não há som</Txt>
      <Txt x={540} y={1384} o={ap(f, m("sol"))} fonte={SORA} tam={36}>{rico("mas a *luz do Sol* chega até nós")}</Txt>
    </AbsoluteFill>
  );
};

// --- 4. direção da vibração: corda transversal e mola longitudinal -----------------------------------------
const Direcao: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("direcao", w, n);
  const vpx = 260, w = TAU * 0.9, k = w / vpx;
  // Corda: a mão em x0 começa a sacudir em "transversal"; a perturbação anda pra direita.
  const x0 = 110, yc = 600, A = 55;
  const tT = m("transversal") / 30;
  const arg = (x: number, t0: number) => w * (t - t0) - k * (x - x0);
  const yCorda = (x: number) => (arg(x, tT) > 0 ? yc - A * Math.sin(arg(x, tT)) : yc);
  const oT = ap(f, m("transversal"));
  const xb = 560; // a conta laranja
  // Mola: deslocamento NO EIXO da propagação, s = A sen(ω(t−t0) − k(x−x0)), a partir de "empurre".
  const tL = m("longitudinal") / 30;
  const yc2 = 1040, As = 24;
  const s = (x: number) => (arg(x, tL) > 0 ? As * Math.sin(arg(x, tL)) : 0);
  const oL = ap(f, m("longitudinal"));
  const espiras = Array.from({ length: 44 }, (_, i) => 110 + i * 20);
  const ib = 22;
  // ∂s/∂x = −k·As·cos(arg); densidade ∝ 1 − ∂s/∂x = 1 + k·As·cos(arg) → máxima em arg = 2πn.
  const comp = (() => {
    const out: number[] = [];
    for (let n = 1; n < 60; n++) {
      const x = x0 + (w * (t - tL) - TAU * n) / k; // arg = 2πn
      if (x > 200 && x < 960 && arg(x, tL) > 0) out.push(x);
    }
    return out;
  })();
  const rare = comp.map((x) => x + Math.PI / k).filter((x) => x < 960 && arg(x, tL) > 0);
  return (
    <AbsoluteFill>
      <Topo id="direcao" rotulo="CLASSIFICAÇÃO 2" />
      <Titulo de={m("direção") - 6} tam={84}>Direção da vibração</Titulo>
      <Txt x={90} y={300} o={oT} ancora="l" fonte={SORA} peso={400} tam={52} cor={CIANO}>Transversal</Txt>
      <Txt x={90} y={370} o={ap(f, m("perpendicular"))} ancora="l" fonte={SORA} tam={38}>{rico("vibração *perpendicular* à propagação")}</Txt>
      <Svg>
        {oT > 0 && (
          <g opacity={oT}>
            <Neon filtro="aoNeon" largura={3}><path d={curva(x0, 980, yCorda, 3)} /></Neon>
            {Array.from({ length: 30 }, (_, i) => {
              const x = x0 + i * 30;
              const alvo = Math.abs(x - xb) < 1;
              return <circle key={i} cx={x} cy={yCorda(x)} r={alvo ? 11 : 6} fill={alvo ? LARANJA : CIANO} />;
            })}
            <rect x={x0 - 34} y={yCorda(x0) - 26} width={34} height={52} rx={10} fill={TEXTO} opacity={0.85} />
          </g>
        )}
        <Seta x1={xb + 46} y1={yc - A - 6} x2={xb + 46} y2={yc + A + 6} dupla cor={LARANJA} o={ap(f, m("perpendicular"))} />
        <Seta x1={300} y1={705} x2={820} y2={705} cor={TEXTO} o={ap(f, m("corre"))} />
        {oL > 0 && (
          <g opacity={oL}>
            {espiras.map((x, i) => (
              <ellipse key={i} cx={x + s(x)} cy={yc2} rx={7} ry={52} fill="none" stroke={i === ib ? LARANJA : CIANO} strokeWidth={i === ib ? 5 : 2.5} opacity={i === ib ? 1 : 0.85} />
            ))}
            <rect x={110 + s(110) - 40} y={yc2 - 60} width={26} height={120} fill={TEXTO} opacity={0.85} />
            {comp.map((x, i) => <text key={`c${i}`} x={x} y={yc2 + 92} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={22} letterSpacing={1}>COMPRESSÃO</text>)}
            {rare.map((x, i) => <text key={`r${i}`} x={x} y={yc2 + 92} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={1}>RAREFAÇÃO</text>)}
          </g>
        )}
        <Seta x1={espiras[ib] + s(espiras[ib]) - 34} y1={yc2 - 84} x2={espiras[ib] + s(espiras[ib]) + 34} y2={yc2 - 84} dupla cor={LARANJA} o={ap(f, m("mesma"))} />
        <Seta x1={300} y1={1170} x2={820} y2={1170} cor={TEXTO} o={ap(f, m("anda"))} />
      </Svg>
      <Txt x={xb + 76} y={yc - 20} o={ap(f, m("perpendicular"))} ancora="l" tam={24} cor={LARANJA}>VIBRAÇÃO</Txt>
      <Txt x={540} y={725} o={ap(f, m("corre"))} tam={24}>PROPAGAÇÃO</Txt>
      <Txt x={90} y={790} o={oL} ancora="l" fonte={SORA} peso={400} tam={52} cor={CIANO}>Longitudinal</Txt>
      <Txt x={90} y={860} o={ap(f, m("mesma"))} ancora="l" fonte={SORA} tam={38}>{rico("vibração na *mesma direção* da propagação")}</Txt>
      <Txt x={espiras[ib] + s(espiras[ib]) + 50} y={yc2 - 100} o={ap(f, m("mesma"))} ancora="l" tam={24} cor={LARANJA}>VIBRAÇÃO</Txt>
      <Txt x={540} y={1190} o={ap(f, m("anda"))} tam={24}>PROPAGAÇÃO</Txt>
      <Chip x={90} y={1280} o={ap(f, m("som"))}>SOM NO AR → LONGITUDINAL</Chip>
      <Chip x={90} y={1360} o={ap(f, m("luz"))}>LUZ → TRANSVERSAL</Chip>
    </AbsoluteFill>
  );
};

// --- 5. crista, vale e amplitude ----------------------------------------------------------------------------
const Crista: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("crista", w, n);
  const yc = 860, A = 140, lam = 440, k = TAU / lam, w = TAU / 5; // anda devagar: 1 λ a cada 5 s
  const y = (x: number) => yc - A * Math.sin(k * x - w * t);
  const xc = naJanela((Math.PI / 2 + w * t) / k, 330, lam); // kx − ωt = π/2 → crista
  const xv = naJanela((3 * Math.PI / 2 + w * t) / k, 330, lam);
  const oC = ap(f, m("crista", 1)), oV = ap(f, m("vale")), oA = ap(f, m("amplitude")), oMeio = ap(f, m("meio"));
  const oVol = ap(f, m("volume"));
  const wv = TAU * 1.1, kv = TAU / 140;
  return (
    <AbsoluteFill>
      <Topo id="crista" rotulo="PARTES DA ONDA" />
      <Titulo de={m("partes") - 6} tam={84}>Crista, vale, amplitude</Titulo>
      <Def tam={40} linhas={[
        ["*Crista*: o ponto mais alto", m("crista")], ["*Vale*: o ponto mais baixo", m("vale")],
        ["*Amplitude (A)*: do meio até a crista", m("amplitude")], ["A amplitude mede a *energia*", m("energia")],
      ]} />
      <Svg>
        <line x1={70} y1={yc} x2={1010} y2={yc} stroke={TEXTO_2} strokeWidth={2} strokeDasharray="10 10" opacity={0.4 + 0.6 * oMeio} />
        <Neon filtro="aoNeon" largura={4}><path d={curva(70, 1010, y)} /></Neon>
        {oC > 0 && <circle cx={xc} cy={yc - A} r={12} fill={LARANJA} opacity={oC} />}
        {oV > 0 && <circle cx={xv} cy={yc + A} r={12} fill={TEXTO} opacity={oV} />}
        <Seta x1={xc} y1={yc} x2={xc} y2={yc - A + 14} dupla cor={LARANJA} o={oA} />
        {oVol > 0 && (
          <g opacity={oVol}>
            <rect x={70} y={1160} width={450} height={290} fill="none" stroke={TEXTO_2} strokeWidth={2} />
            <rect x={560} y={1160} width={450} height={290} fill="none" stroke={TEXTO_2} strokeWidth={2} />
            <g opacity={ap(f, m("grito"))}><Neon filtro="aoNeon" largura={3}><path d={curva(90, 500, (x) => 1325 - 85 * Math.sin(kv * x - wv * t))} /></Neon></g>
            <g opacity={ap(f, m("sussurro"))}><Neon filtro="aoNeon" largura={3}><path d={curva(580, 990, (x) => 1325 - 22 * Math.sin(kv * x - wv * t))} /></Neon></g>
          </g>
        )}
      </Svg>
      <Txt x={xc} y={yc - A - 62} o={oC} tam={28} cor={LARANJA}>CRISTA</Txt>
      <Txt x={xv} y={yc + A + 24} o={oV} tam={28}>VALE</Txt>
      <Txt x={xc + 24} y={yc - A / 2 - 20} o={oA} ancora="l" tam={34} cor={LARANJA}>A</Txt>
      <Txt x={1010} y={yc + 10} o={oMeio} ancora="r" tam={22} cor={TEXTO_2}>MEIO DA ONDA</Txt>
      <Txt x={295} y={1172} o={ap(f, m("grito"))} tam={26}>GRITO · A GRANDE</Txt>
      <Txt x={785} y={1172} o={ap(f, m("sussurro"))} tam={26}>SUSSURRO · A PEQUENA</Txt>
      <Txt x={540} y={1470} o={ap(f, m("frequência"))} fonte={SORA} tam={36}>{rico("mesma *frequência*, amplitudes diferentes")}</Txt>
      <Txt x={540} y={1110} o={oVol} tam={26} cor={TEXTO_2}>NO SOM, AMPLITUDE = VOLUME</Txt>
    </AbsoluteFill>
  );
};

// --- 6. comprimento de onda -----------------------------------------------------------------------------------
const Lambda: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("lambda", w, n);
  const yc = 840, A = 110, lam = 400, k = TAU / lam, w = TAU / 5;
  const y = (x: number) => yc - A * Math.sin(k * x - w * t);
  const xc = naJanela((Math.PI / 2 + w * t) / k, 150, lam);
  const xv = naJanela((3 * Math.PI / 2 + w * t) / k, 150, lam);
  const oL = ap(f, m("distância")), oS = ap(f, m("seguidas"));
  return (
    <AbsoluteFill>
      <Topo id="lambda" rotulo="PARTES DA ONDA" />
      <Titulo de={0} tam={84}>Comprimento de onda</Titulo>
      <Def linhas={[["*λ (lambda)*: distância entre", m("lambda")], ["duas *cristas seguidas*", m("cristas")]]} />
      <Svg>
        <Neon filtro="aoNeon" largura={4}><path d={curva(70, 1010, y)} /></Neon>
        {oL > 0 && (
          <g opacity={oL}>
            <circle cx={xc} cy={yc - A} r={11} fill={LARANJA} />
            <circle cx={xc + lam} cy={yc - A} r={11} fill={LARANJA} />
            <line x1={xc} y1={yc - A} x2={xc} y2={yc - A - 60} stroke={LARANJA} strokeWidth={2} strokeDasharray="5 6" />
            <line x1={xc + lam} y1={yc - A} x2={xc + lam} y2={yc - A - 60} stroke={LARANJA} strokeWidth={2} strokeDasharray="5 6" />
          </g>
        )}
        <Medida x1={xc} x2={xc + lam} y={yc - A - 50} o={oL} />
        <Medida x1={xv} x2={xv + lam} y={yc + A + 50} o={oS * 0.8} cor={TEXTO_2} tracejado />
        <rect x={70} y={1150} width={450} height={320} fill="none" stroke={TEXTO_2} strokeWidth={2} opacity={ap(f, m("mar"))} />
        <rect x={560} y={1150} width={450} height={320} fill="none" stroke={TEXTO_2} strokeWidth={2} opacity={ap(f, m("luz"))} />
        <g opacity={ap(f, m("mar"))}><Neon filtro="aoNeon" largura={3}><path d={curva(90, 500, (x) => 1290 - 40 * Math.sin(TAU * x / 220 - TAU * 0.25 * t))} /></Neon></g>
        <g opacity={ap(f, m("luz"))}><Neon filtro="aoNeon" largura={2}><path d={curva(580, 990, (x) => 1290 - 30 * Math.sin(TAU * x / 9 - TAU * 1.5 * t), 1)} /></Neon></g>
      </Svg>
      <Txt x={(xc + xc + lam) / 2} y={yc - A - 118} o={oL} tam={56} fonte={MONO} cor={LARANJA}>λ</Txt>
      <Txt x={xv + lam / 2} y={yc + A + 66} o={oS * 0.8} tam={24} cor={TEXTO_2}>VALE A VALE TAMBÉM É λ</Txt>
      <Txt x={295} y={1165} o={ap(f, m("mar"))} tam={26}>ONDAS DO MAR</Txt>
      <Txt x={295} y={1370} o={ap(f, m("metros"))} tam={52} cor={LARANJA}>≈ 10 m</Txt>
      <Txt x={785} y={1165} o={ap(f, m("luz"))} tam={26}>LUZ VISÍVEL</Txt>
      <Txt x={785} y={1370} o={ap(f, m("milímetro"))} tam={46} cor={LARANJA}>{"< 0,001 mm"}</Txt>
      <Txt x={785} y={1430} o={ap(f, m("milímetro"))} tam={22} cor={TEXTO_2}>400 A 700 nm</Txt>
    </AbsoluteFill>
  );
};

// --- 7. período e frequência ---------------------------------------------------------------------------------
const Frequencia: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("frequencia", w, n);
  // Oscilador de 2 Hz (T = 0,5 s): o ponto sobe e desce e o traço registra a oscilação no tempo.
  const FQ = 2, ox = 170, yc = 800, A = 105, vel = 240; // vel: px por segundo do registro
  const yEm = (tau: number) => yc - A * Math.sin(TAU * FQ * tau);
  const traco = curva(ox, 1000, (x) => yEm(t - (x - ox) / vel), 3);
  const per = vel / FQ; // 120 px = 1 período no registro
  // Crista do registro: TAU·FQ·(t − (x−ox)/vel) = π/2 + 2πn
  const xc = naJanela(ox + vel * (t - 0.25 / FQ), 420, per);
  const tF = m("frequência");
  const tc = Math.max(0, (f - tF) / 30);
  const oP = ap(f, m("completa")), oF = ap(f, tF), oInv = ap(f, m("inverso"));
  const oLa = ap(f, m("nota"));
  const cont = Math.round(440 * entre(f, m("vibra"), m("vibra") + 30, Easing.out(Easing.quad)));
  return (
    <AbsoluteFill>
      <Topo id="frequencia" rotulo="GRANDEZAS" />
      <Titulo de={0} tam={84}>Período e frequência</Titulo>
      <Def tam={40} linhas={[["*Período (T)*: tempo de 1 oscilação (s)", m("período")], ["*Frequência (f)*: oscilações em 1 s (Hz)", tF]]} />
      <Svg>
        <line x1={ox} y1={yc} x2={1000} y2={yc} stroke={TEXTO_2} strokeWidth={2} strokeDasharray="8 10" opacity={0.4} />
        <Neon filtro="aoNeon" largura={3}><path d={traco} /></Neon>
        <line x1={ox} y1={yc - A - 20} x2={ox} y2={yc + A + 20} stroke={TEXTO_2} strokeWidth={2} />
        <circle cx={ox} cy={yEm(t)} r={16} fill={LARANJA} />
        <circle cx={ox} cy={yEm(t)} r={30} fill={LARANJA} opacity={0.35} filter="url(#aoBrilho)" />
        <Medida x1={xc} x2={xc + per} y={yc - A - 36} o={oP} />
        {oLa > 0 && (
          <g opacity={oLa}>
            <rect x={70} y={1210} width={940} height={300} fill="rgba(5,7,12,0.6)" stroke={TEXTO_2} strokeWidth={2} />
            {/* diapasão */}
            <path d="M 120 1300 L 120 1400 Q 120 1430 150 1430 Q 180 1430 180 1400 L 180 1300 M 150 1430 L 150 1480" fill="none" stroke={TEXTO} strokeWidth={6} strokeLinecap="round"
              transform={`translate(${Math.sin(t * 60) * 1.5} 0)`} />
            <Neon filtro="aoNeon" largura={2}><path d={curva(220, 990, (x) => 1380 - 34 * Math.exp(-(x - 220) / 900) * Math.sin(TAU * x / 22 - TAU * 3 * t), 1.5)} /></Neon>
          </g>
        )}
      </Svg>
      <Txt x={xc + per / 2} y={yc - A - 92} o={oP} tam={30} cor={LARANJA}>T = 0,5 s</Txt>
      <Txt x={ox} y={yc + A + 40} o={1} tam={22} cor={TEXTO_2}>FONTE</Txt>
      <Txt x={300} y={955} o={oF} ancora="l" tam={30}>{`TEMPO ${tc.toFixed(1).replace(".", ",")} s  ·  OSCILAÇÕES ${Math.floor(tc * FQ)}`}</Txt>
      <Txt x={300} y={1005} o={ap(f, m("hertz"))} ancora="l" tam={30} cor={CIANO}>2 OSCILAÇÕES POR SEGUNDO = 2 Hz</Txt>
      <Txt x={540} y={1070} o={oInv} fonte={SORA} tam={88} peso={400} cor={LARANJA}>f = 1 / T</Txt>
      <Txt x={880} y={1100} o={ap(f, m("t"))} tam={26} cor={TEXTO_2}>1 / 0,5 = 2</Txt>
      <Txt x={220} y={1232} o={oLa} ancora="l" tam={30}>NOTA LÁ</Txt>
      <Txt x={990} y={1232} o={ap(f, m("vibra"))} ancora="r" tam={30} cor={LARANJA}>{`${cont} vibrações / s`}</Txt>
      <Txt x={990} y={1432} o={ap(f, m("440", 2))} ancora="r" tam={34}>{rico("f = *440 Hz*")}</Txt>
      <Txt x={220} y={1432} o={ap(f, m("período", 2))} ancora="l" tam={34}>T = 1/440 s ≈ 0,0023 s</Txt>
    </AbsoluteFill>
  );
};

// --- 8. v = λ · f ----------------------------------------------------------------------------------------------
const Equacao: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("equacao", w, n);
  const yc = 640, A = 70, lam = 300, k = TAU / lam, w = TAU * 0.4;
  const y = (x: number) => yc - A * Math.sin(k * x - w * t);
  const xc = naJanela((Math.PI / 2 + w * t) / k, 200, lam);
  const pecas: { s: string; de: number; rot?: string }[] = [
    { s: "v", de: m("velocidade"), rot: "velocidade\n(m/s)" },
    { s: "=", de: m("igual") },
    { s: "λ", de: m("comprimento"), rot: "comprimento\nde onda (m)" },
    { s: "·", de: m("vezes") },
    { s: "f", de: m("frequência"), rot: "frequência\n(Hz)" },
  ];
  const brilho = entre(f, m("v"), m("v") + 6) * (1 - entre(f, marcaFim("equacao", "f"), marcaFim("equacao", "f") + 20));
  return (
    <AbsoluteFill>
      <Topo id="equacao" rotulo="A EQUAÇÃO" />
      <Titulo de={0} tam={84}>Juntando tudo</Titulo>
      <Svg>
        <Neon filtro="aoNeon" largura={4}><path d={curva(70, 1010, y)} /></Neon>
        <circle cx={xc} cy={yc - A} r={11} fill={LARANJA} />
        <Seta x1={xc + 20} y1={yc - A - 34} x2={xc + 110} y2={yc - A - 34} cor={LARANJA} />
        <Medida x1={xc} x2={xc + lam} y={yc + A + 40} o={ap(f, m("comprimento"))} cor={TEXTO} />
      </Svg>
      <Txt x={xc + 124} y={yc - A - 56} o={1} ancora="l" tam={30} cor={LARANJA}>v</Txt>
      <Txt x={xc + lam / 2} y={yc + A + 54} o={ap(f, m("comprimento"))} tam={34}>λ</Txt>
      <div style={{ position: "absolute", top: 820, left: 0, width: 1080, display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 26 }}>
        {pecas.map((p, i) => {
          const o = ap(f, p.de, 10);
          return (
            <div key={i} style={{ opacity: o, translate: `0 ${(1 - o) * 30}px`, display: "flex", flexDirection: "column", alignItems: "center", width: p.rot ? 250 : 60 }}>
              <div style={{
                fontFamily: p.s === "λ" ? MONO : SORA, fontWeight: 400, fontSize: 150, lineHeight: 1, color: p.rot ? LARANJA : TEXTO,
                textShadow: `0 0 ${20 + 30 * brilho}px ${LARANJA}${brilho > 0.5 ? "AA" : "55"}, ${SOMBRA_TXT}`,
              }}>{p.s}</div>
              {p.rot && <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 24, letterSpacing: 1, color: TEXTO_2, textAlign: "center", whiteSpace: "pre", lineHeight: 1.25 }}>{p.rot}</div>}
            </div>
          );
        })}
      </div>
      <Txt x={150} y={1150} o={ap(f, m("340"))} ancora="l" tam={44}>{rico("v = *340 m/s*  (som no ar)")}</Txt>
      <Txt x={150} y={1220} o={ap(f, m("440"))} ancora="l" tam={44}>{rico("f = *440 Hz*  (nota lá)")}</Txt>
      <Txt x={150} y={1290} o={ap(f, m("dividindo"))} ancora="l" tam={44}>λ = v / f = 340 / 440</Txt>
      <Txt x={150} y={1370} o={ap(f, m("77"))} ancora="l" tam={64} fonte={SORA} peso={400} cor={LARANJA}>λ ≈ 0,77 m = 77 cm</Txt>
    </AbsoluteFill>
  );
};

// --- 9. pegadinha: muda de meio, f fica ------------------------------------------------------------------------
const Pegadinha: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("pegadinha", w, n);
  // Luz passando do ar pra água: mesma ω; v e λ caem na mesma razão (n = 1,33). Fase contínua em xb.
  const x0 = 130, xb = 560, yc = 820, A = 85, l1 = 240, l2 = 240 / 1.33, w = TAU * 0.6;
  const k1 = TAU / l1, k2 = TAU / l2;
  const fase = (x: number) => (x <= xb ? k1 * (x - x0) : k1 * (xb - x0) + k2 * (x - xb)) - w * t;
  const y = (x: number) => yc - A * Math.sin(fase(x));
  // Cristas: fase = π/2 + 2πn
  const c1 = naJanela(x0 + (Math.PI / 2 + w * t) / k1, 150, l1);
  const c2 = naJanela(xb + (Math.PI / 2 + w * t - k1 * (xb - x0)) / k2, 600, l2);
  const p1 = 340, p2 = 800; // pontinhos de prova: oscilam no mesmo ritmo
  const oNao = ap(f, m("não")), oV = ap(f, m("velocidade")), oL = ap(f, m("comprimento"));
  const linha = (de: number) => ap(f, de);
  return (
    <AbsoluteFill>
      <Topo id="pegadinha" rotulo="PEGADINHA" />
      <Titulo de={0} tam={84}>Pegadinha de prova</Titulo>
      <Def linhas={[["Quem define a *frequência* é a *fonte*.", m("fonte")], ["Mudou de meio: *f igual*; v e λ mudam.", m("muda")]]} />
      <Svg>
        <rect x={xb} y={640} width={450} height={360} fill={CIANO} opacity={0.08} />
        <line x1={xb} y1={640} x2={xb} y2={1000} stroke={TEXTO_2} strokeWidth={2} />
        <Neon filtro="aoNeon" largura={4}><path d={curva(x0, 1010, y, 3)} /></Neon>
        <circle cx={x0} cy={y(x0)} r={16} fill={LARANJA} />
        <circle cx={x0} cy={y(x0)} r={30} fill={LARANJA} opacity={0.35} filter="url(#aoBrilho)" />
        {[p1, p2].map((x) => <circle key={x} cx={x} cy={y(x)} r={11} fill={TEXTO} opacity={0.4 + 0.6 * oNao} />)}
        {[p1, p2].map((x) => <line key={`l${x}`} x1={x} y1={yc - A - 10} x2={x} y2={yc + A + 10} stroke={TEXTO} strokeWidth={1.5} strokeDasharray="4 6" opacity={0.7 * oNao} />)}
        <Medida x1={c1} x2={c1 + l1} y={yc - A - 36} o={oL} />
        <Medida x1={c2} x2={c2 + l2} y={yc - A - 36} o={oL} />
      </Svg>
      <Txt x={x0} y={yc + A + 50} o={1} tam={22} cor={TEXTO_2}>FONTE</Txt>
      <Txt x={345} y={950} o={1} tam={26} cor={TEXTO_2}>AR</Txt>
      <Txt x={785} y={950} o={1} tam={26} cor={TEXTO_2}>ÁGUA</Txt>
      <Txt x={540} y={1020} o={1} tam={22} cor={TEXTO_2}>LUZ PASSANDO DO AR PRA ÁGUA</Txt>
      <Txt x={c1 + l1 / 2} y={yc - A - 92} o={oL} tam={30} cor={LARANJA}>λ AR</Txt>
      <Txt x={c2 + l2 / 2} y={yc - A - 92} o={oL} tam={30} cor={LARANJA}>λ ÁGUA</Txt>
      {/* tabela */}
      <div style={{ position: "absolute", top: 1110, left: 110, width: 860, fontFamily: MONO, fontSize: 36, color: TEXTO, letterSpacing: 2 }}>
        {[
          { a: "", b: "AR", c: "ÁGUA", de: m("muda"), cor: TEXTO_2 },
          { a: "f", b: "igual", c: "igual", de: m("não"), cor: LARANJA },
          { a: "v", b: "maior", c: "menor", de: m("velocidade"), cor: TEXTO },
          { a: "λ", b: "maior", c: "menor", de: m("comprimento"), cor: TEXTO },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", height: 76, alignItems: "center", opacity: linha(r.de), borderBottom: i ? `1px solid ${TEXTO_2}55` : `2px solid ${TEXTO_2}` }}>
            <div style={{ width: 160, color: CIANO }}>{r.a}</div>
            <div style={{ width: 350, color: r.cor }}>{r.b}</div>
            <div style={{ width: 350, color: r.cor }}>{r.c}</div>
          </div>
        ))}
      </div>
      <Txt x={540} y={1430} o={oV * oL} tam={26} cor={TEXTO_2}>NA ÁGUA A LUZ É MAIS LENTA → λ MENOR, MESMA f</Txt>
    </AbsoluteFill>
  );
};

// --- 10. reflexão -------------------------------------------------------------------------------------------
const Reflexao: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("reflexao", w, n);
  const ox = 540, oy = 1060, L = 440, th = (40 * Math.PI) / 180;
  const ini = { x: ox - L * Math.sin(th), y: oy - L * Math.cos(th) };
  const fim = { x: ox + L * Math.sin(th), y: oy - L * Math.cos(th) };
  // Onda ao longo do raio: s de 0 (início) a 2L (fim), deslocamento perpendicular ao raio.
  const lam = 70, k = TAU / lam, fq = 2, v = lam * fq;
  const tR = m("reflexão") / 30;
  const frente = Math.max(0, (t - tR) * v);
  const ponto = (s: number) => {
    const ida = s <= L;
    const u = ida ? s / L : (s - L) / L;
    const px = ida ? ini.x + (ox - ini.x) * u : ox + (fim.x - ox) * u;
    const py = ida ? ini.y + (oy - ini.y) * u : oy + (fim.y - oy) * u;
    const dx = ida ? ox - ini.x : fim.x - ox, dy = ida ? oy - ini.y : fim.y - oy;
    const nrm = Math.hypot(dx, dy);
    const amp = 20 * Math.sin(TAU * fq * (t - tR) - k * s) * (s < frente ? 1 : 0);
    return { x: px + (-dy / nrm) * amp, y: py + (dx / nrm) * amp };
  };
  let d = "";
  const sMax = Math.min(2 * L, frente);
  for (let s = 0; s <= sMax; s += 3) { const p = ponto(s); d += `${s ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)} `; }
  const oAng = ap(f, m("ângulo"));
  const R = 120;
  const arco = (a0: number, a1: number) => `M ${ox + R * Math.sin(a0)} ${oy - R * Math.cos(a0)} A ${R} ${R} 0 0 ${a1 > a0 ? 1 : 0} ${ox + R * Math.sin(a1)} ${oy - R * Math.cos(a1)}`;
  const pulso = frente > 0 && frente < 2 * L ? ponto(frente - 1) : null;
  return (
    <AbsoluteFill>
      <Topo id="reflexao" rotulo="FENÔMENOS" />
      <Titulo de={m("reflexão") - 6}>Reflexão</Titulo>
      <Def linhas={[["A onda bate e *volta* pro mesmo meio.", m("volta")], ["Ângulo de ida *=* ângulo de volta.", m("igual")]]} />
      <Svg>
        <line x1={140} y1={oy} x2={940} y2={oy} stroke={TEXTO} strokeWidth={5} />
        {Array.from({ length: 27 }, (_, i) => <line key={i} x1={150 + i * 30} y1={oy + 4} x2={130 + i * 30} y2={oy + 30} stroke={TEXTO_2} strokeWidth={2} />)}
        <line x1={ox} y1={oy} x2={ox} y2={640} stroke={TEXTO_2} strokeWidth={2} strokeDasharray="8 8" opacity={ap(f, m("ângulo"))} />
        <line x1={ini.x} y1={ini.y} x2={ox} y2={oy} stroke={TEXTO_2} strokeWidth={1.5} opacity={0.4} />
        <line x1={ox} y1={oy} x2={fim.x} y2={fim.y} stroke={TEXTO_2} strokeWidth={1.5} opacity={0.4} />
        {d && <Neon filtro="aoNeon" largura={3.5}><path d={d} /></Neon>}
        {pulso && <circle cx={pulso.x} cy={pulso.y} r={10} fill={LARANJA} />}
        <Seta x1={ini.x + (ox - ini.x) * 0.3} y1={ini.y + (oy - ini.y) * 0.3 - 0} x2={ini.x + (ox - ini.x) * 0.45} y2={ini.y + (oy - ini.y) * 0.45} cor={TEXTO} o={ap(f, m("bate"))} />
        <Seta x1={ox + (fim.x - ox) * 0.55} y1={oy + (fim.y - oy) * 0.55} x2={ox + (fim.x - ox) * 0.7} y2={oy + (fim.y - oy) * 0.7} cor={TEXTO} o={ap(f, m("volta"))} />
        {oAng > 0 && (
          <g opacity={oAng} fill="none" strokeWidth={4}>
            <path d={arco(-th, 0)} stroke={LARANJA} />
            <path d={arco(0, th)} stroke={LARANJA} opacity={ap(f, m("igual"))} />
          </g>
        )}
      </Svg>
      <Txt x={ox} y={600} o={ap(f, m("ângulo"))} tam={22} cor={TEXTO_2}>NORMAL</Txt>
      <Txt x={ox - 70} y={oy - 190} o={oAng} tam={34} cor={LARANJA}>θ</Txt>
      <Txt x={ox + 70} y={oy - 190} o={ap(f, m("igual"))} tam={34} cor={LARANJA}>θ</Txt>
      <Txt x={540} y={oy + 46} o={ap(f, m("obstáculo"))} tam={22} cor={TEXTO_2}>OBSTÁCULO</Txt>
      <Chip x={110} y={1200} o={ap(f, m("eco"))}>ECO · O SOM VOLTA DA PAREDE</Chip>
      <Chip x={110} y={1290} o={ap(f, m("espelho"))}>ESPELHO · A LUZ VOLTA</Chip>
    </AbsoluteFill>
  );
};

// --- 11. refração ---------------------------------------------------------------------------------------------
const Refracao: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("refracao", w, n);
  const ox = 540, oy = 830, n2 = 1.33;
  const th1 = (45 * Math.PI) / 180, th2 = Math.asin(Math.sin(th1) / n2); // Snell: n1 sen θ1 = n2 sen θ2
  const l1 = 140, l2 = l1 / n2, w = TAU * 0.6;
  const k1 = TAU / l1, k2 = TAU / l2;
  // Frentes (cristas): k·(d·r) − ωt = 2πn; em y = oy as fases dos dois lados batem (k1 sen θ1 = k2 sen θ2).
  const frentes = (k: number, th: number, lado: "a" | "b") => {
    const d = { x: Math.sin(th), y: Math.cos(th) }, tg = { x: Math.cos(th), y: -Math.sin(th) };
    const out: string[] = [];
    for (let n = -14; n <= 14; n++) {
      const c = (TAU * n + w * t) / k - (lado === "a" ? 0 : 0);
      const cx = ox + c * d.x, cy = oy + c * d.y;
      out.push(`M ${cx - tg.x * 900} ${cy - tg.y * 900} L ${cx + tg.x * 900} ${cy + tg.y * 900}`);
    }
    return out.join(" ");
  };
  const oI = ap(f, m("inclinada"));
  const oCan = ap(f, m("canudo"));
  // canudo: reto em cima, "quebrado" na água
  const topo = { x: 360, y: 1150 }, sup = { x: 500, y: 1290 };
  const real = { x: sup.x + 0.75 * 190, y: sup.y + 190 }, apar = { x: sup.x + 1.6 * 120, y: sup.y + 120 };
  return (
    <AbsoluteFill>
      <Topo id="refracao" rotulo="FENÔMENOS" />
      <Titulo de={m("refração") - 6}>Refração</Titulo>
      <Def tam={40} linhas={[["Passa pra outro meio: muda a *velocidade*.", m("velocidade")], ["Chegou inclinada? Muda de *direção*.", m("direção")], ["A *frequência* continua a mesma.", m("frequência")]]} />
      <Svg>
        <clipPath id="aoRefA"><rect x={70} y={560} width={940} height={oy - 560} /></clipPath>
        <clipPath id="aoRefB"><rect x={70} y={oy} width={940} height={1090 - oy} /></clipPath>
        <rect x={70} y={oy} width={940} height={1090 - oy} fill={CIANO} opacity={0.08} />
        <g clipPath="url(#aoRefA)"><Neon filtro="aoNeon" largura={3} opacidade={0.9}><path d={frentes(k1, th1, "a")} /></Neon></g>
        <g clipPath="url(#aoRefB)"><Neon filtro="aoNeon" largura={3} opacidade={0.9}><path d={frentes(k2, th2, "b")} /></Neon></g>
        <line x1={70} y1={oy} x2={1010} y2={oy} stroke={TEXTO} strokeWidth={3} />
        {oI > 0 && (
          <g opacity={oI}>
            <line x1={ox} y1={590} x2={ox} y2={1070} stroke={TEXTO_2} strokeWidth={2} strokeDasharray="8 8" />
            <Seta x1={ox - 250 * Math.sin(th1)} y1={oy - 250 * Math.cos(th1)} x2={ox - 4} y2={oy - 4} cor={LARANJA} larg={5} />
            <line x1={ox} y1={oy} x2={ox + 240 * Math.sin(th1)} y2={oy + 240 * Math.cos(th1)} stroke={LARANJA} strokeWidth={2} strokeDasharray="6 8" opacity={0.5} />
          </g>
        )}
        <Seta x1={ox} y1={oy} x2={ox + 240 * Math.sin(th2)} y2={oy + 240 * Math.cos(th2)} cor={LARANJA} larg={5} o={ap(f, m("direção"))} />
        {oCan > 0 && (
          <g opacity={oCan}>
            <rect x={400} y={1170} width={300} height={320} fill="none" stroke={TEXTO_2} strokeWidth={3} />
            <rect x={402} y={sup.y} width={296} height={1488 - sup.y} fill={CIANO} opacity={0.12} />
            <line x1={402} y1={sup.y} x2={698} y2={sup.y} stroke={CIANO} strokeWidth={3} />
            <line x1={topo.x} y1={topo.y} x2={sup.x} y2={sup.y} stroke={LARANJA} strokeWidth={12} strokeLinecap="round" />
            <line x1={sup.x} y1={sup.y} x2={real.x} y2={real.y} stroke={LARANJA} strokeWidth={3} strokeDasharray="6 8" opacity={0.5 * ap(f, m("quebrado"))} />
            <line x1={sup.x} y1={sup.y} x2={apar.x} y2={apar.y} stroke={LARANJA} strokeWidth={12} strokeLinecap="round" opacity={0.85} />
          </g>
        )}
      </Svg>
      <Txt x={90} y={575} o={1} ancora="l" tam={26} cor={TEXTO_2}>AR</Txt>
      <Txt x={90} y={oy + 16} o={1} ancora="l" tam={26} cor={TEXTO_2}>ÁGUA</Txt>
      <Txt x={1000} y={oy + 200} o={ap(f, m("velocidade"))} ancora="r" tam={24}>MAIS LENTA → λ MENOR</Txt>
      <Txt x={1000} y={575} o={ap(f, m("frequência"))} ancora="r" tam={26} cor={LARANJA}>f IGUAL NOS DOIS MEIOS</Txt>
      <Txt x={730} y={1300} o={ap(f, m("quebrado"))} ancora="l" tam={28}>PARECE{"\n"}QUEBRADO</Txt>
      <Txt x={730} y={1420} o={ap(f, m("quebrado"))} ancora="l" tam={20} cor={TEXTO_2}>TRACEJADO:{"\n"}ONDE ELE ESTÁ</Txt>
    </AbsoluteFill>
  );
};

// --- 12. difração ---------------------------------------------------------------------------------------------
const Difracao: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("difracao", w, n);
  const xw = 480, g0 = 800, g1 = 880, gc = (g0 + g1) / 2, lam = 90, v = 72;
  const desl = mod(v * t, lam);
  const planas = Array.from({ length: 6 }, (_, n) => 80 + desl + n * lam - lam).filter((x) => x > 70 && x < xw);
  // Depois da fresta, a mesma frente vira arco centrado nela: raio = quanto a frente plana teria passado da parede.
  const raios = Array.from({ length: 16 }, (_, n) => 80 - lam + desl + n * lam - xw).filter((r) => r > 2 && r < 560);
  const oPorta = ap(f, m("porta")), oOuve = ap(f, m("ouve"));
  const oLuz = ap(f, m("luz"));
  return (
    <AbsoluteFill>
      <Topo id="difracao" rotulo="FENÔMENOS" />
      <Titulo de={m("difração") - 6}>Difração</Titulo>
      <Def linhas={[["A onda *contorna* obstáculos", m("contorna")], ["e passa por *frestas*.", m("frestas")]]} />
      <Svg>
        <clipPath id="aoDifA"><rect x={70} y={560} width={xw - 70} height={540} /></clipPath>
        <clipPath id="aoDifB"><rect x={xw + 10} y={560} width={1010 - xw - 10} height={540} /></clipPath>
        <g clipPath="url(#aoDifA)"><Neon filtro="aoNeon" largura={3}>{planas.map((x, i) => <line key={i} x1={x} y1={570} x2={x} y2={1090} />)}</Neon></g>
        <g clipPath="url(#aoDifB)">
          {raios.map((r, i) => (
            <g key={i} opacity={Math.min(1, 1.6 / Math.sqrt(1 + r / 40))}>
              <Neon filtro="aoNeon" largura={3}><path d={`M ${xw} ${gc - r} A ${r} ${r} 0 0 1 ${xw} ${gc + r}`} /></Neon>
            </g>
          ))}
        </g>
        <rect x={xw - 10} y={560} width={20} height={g0 - 560} fill={TEXTO_2} />
        <rect x={xw - 10} y={g1} width={20} height={1100 - g1} fill={TEXTO_2} />
        {oOuve > 0 && (
          <g opacity={oOuve}>
            <circle cx={830} cy={640} r={18} fill="none" stroke={LARANJA} strokeWidth={4} />
            <path d="M 800 700 Q 830 666 860 700" fill="none" stroke={LARANJA} strokeWidth={4} />
          </g>
        )}
        <Seta x1={xw + 40} y1={gc - 30} x2={790} y2={660} cor={LARANJA} o={ap(f, m("contorna", 2))} larg={3} />
        {oLuz > 0 && (
          <g opacity={oLuz}>
            <rect x={70} y={1170} width={940} height={330} fill="rgba(5,7,12,0.7)" stroke={TEXTO_2} strokeWidth={2} />
            {Array.from({ length: 40 }, (_, n) => 100 + mod(v * t * 0.3, 9) + n * 9).filter((x) => x < xw).map((x, i) => (
              <line key={i} x1={x} y1={1190} x2={x} y2={1480} stroke={CIANO} strokeWidth={2} opacity={0.7} />
            ))}
            {Array.from({ length: 56 }, (_, n) => xw + mod(v * t * 0.3, 9) + n * 9).filter((x) => x < 990).map((x, i) => (
              <line key={`b${i}`} x1={x} y1={1265} x2={x} y2={1405} stroke={CIANO} strokeWidth={2} opacity={0.7} />
            ))}
            <rect x={xw - 10} y={1172} width={20} height={88} fill={TEXTO_2} />
            <rect x={xw - 10} y={1410} width={20} height={88} fill={TEXTO_2} />
          </g>
        )}
      </Svg>
      <Txt x={xw - 30} y={gc - 18} o={1 - oPorta} ancora="r" tam={26} cor={TEXTO}>FRESTA</Txt>
      <Txt x={xw - 30} y={gc - 18} o={oPorta} ancora="r" tam={26} cor={TEXTO}>PORTA</Txt>
      <Txt x={830} y={720} o={oOuve} tam={24} cor={LARANJA}>VOCÊ OUVE</Txt>
      <Txt x={250} y={1040} o={ap(f, m("fala"))} tam={24} cor={TEXTO_2}>SOM DE QUEM FALA →</Txt>
      <Txt x={760} y={1040} o={ap(f, m("contorna", 2))} tam={24}>O SOM CONTORNA A PORTA</Txt>
      <Txt x={100} y={1190} o={oLuz} ancora="l" tam={28} cor={LARANJA}>LUZ</Txt>
      <Txt x={990} y={1190} o={ap(f, m("minúsculo"))} ancora="r" tam={22} cor={TEXTO_2}>λ MINÚSCULO</Txt>
      <Txt x={990} y={1440} o={ap(f, m("quase"))} ancora="r" tam={24}>QUASE NÃO CONTORNA</Txt>
    </AbsoluteFill>
  );
};

// --- 13. interferência ---------------------------------------------------------------------------------------
const Interferencia: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("interferencia", w, n);
  const x0 = 250, x1 = 1000, A = 60, lam = 260, k = TAU / lam, w = TAU * 0.5;
  const fi = Math.PI * entre(f, m("vale"), m("vale") + 24, io); // crista com vale: onda 2 defasada de π
  const b = entre(f, m("fone"), m("fone") + 30, io); // vira ruído
  const ruido = (x: number) => 0.6 * Math.sin(k * x - w * t) + 0.32 * Math.sin(2.7 * k * x - 1.9 * w * t + 1) + 0.22 * Math.sin(5.3 * k * x - 3.1 * w * t + 2);
  const y1 = (x: number) => A * ((1 - b) * Math.sin(k * x - w * t) + b * ruido(x));
  // Com fi = π, sen(θ + π) = −sen θ: a onda 2 é exatamente −onda 1 e a soma é zero.
  // (o ruído só entra depois de "fone", quando fi já é π: aí y2 = −y1 em todo x)
  const y2 = (x: number) => A * ((1 - b) * Math.sin(k * x - w * t + fi) - b * ruido(x));
  const r1 = 640, r2 = 830, r3 = 1070;
  const oCons = ap(f, m("construtiva")) * (1 - entre(f, m("vale"), m("vale") + 8));
  const oDest = ap(f, m("destrutiva")) * (1 - entre(f, m("fone"), m("fone") + 8));
  const oFone = ap(f, m("fone"));
  const somaZero = fi > Math.PI - 1e-6;
  return (
    <AbsoluteFill>
      <Topo id="interferencia" rotulo="FENÔMENOS" />
      <Titulo de={m("interferência") - 6}>Interferência</Titulo>
      <Def linhas={[["Duas ondas se encontram", m("encontram")], ["e os deslocamentos se *somam*.", m("somam")]]} />
      <Svg>
        {[r1, r2, r3].map((r) => <line key={r} x1={x0} y1={r} x2={x1} y2={r} stroke={TEXTO_2} strokeWidth={1.5} strokeDasharray="6 10" opacity={0.5} />)}
        <Neon filtro="aoNeon" largura={3.5}><path d={curva(x0, x1, (x) => r1 - y1(x))} /></Neon>
        <Neon filtro="aoNeon" largura={3.5}><path d={curva(x0, x1, (x) => r2 - y2(x))} /></Neon>
        <g opacity={ap(f, m("somam"))}>
          <Neon filtro="aoNeon" cor={LARANJA} largura={4}><path d={curva(x0, x1, (x) => (somaZero ? r3 : r3 - (y1(x) + y2(x))))} /></Neon>
        </g>
      </Svg>
      <Txt x={70} y={r1 - 16} o={1 - oFone} ancora="l" tam={26} cor={TEXTO_2}>ONDA 1</Txt>
      <Txt x={70} y={r2 - 16} o={1 - oFone} ancora="l" tam={26} cor={TEXTO_2}>ONDA 2</Txt>
      <Txt x={70} y={r1 - 16} o={oFone} ancora="l" tam={26} cor={TEXTO_2}>RUÍDO</Txt>
      <Txt x={70} y={r2 - 30} o={ap(f, m("invertida"))} ancora="l" tam={22} cor={TEXTO_2}>{"ONDA\nINVERTIDA"}</Txt>
      <Txt x={70} y={r3 - 16} o={ap(f, m("somam")) * (1 - ap(f, m("apaga")))} ancora="l" tam={26} cor={LARANJA}>SOMA</Txt>
      <Txt x={70} y={r3 - 16} o={ap(f, m("apaga"))} ancora="l" tam={26} cor={LARANJA}>SILÊNCIO</Txt>
      <Txt x={150} y={r1 + 70} o={1} tam={40} cor={TEXTO_2}>+</Txt>
      <Txt x={150} y={r2 + 90} o={ap(f, m("somam"))} tam={40} cor={TEXTO_2}>=</Txt>
      <Txt x={540} y={1240} o={oCons} fonte={SORA} tam={40}>{rico("crista com crista: *construtiva* (2A)")}</Txt>
      <Txt x={540} y={1240} o={oDest} fonte={SORA} tam={40}>{rico("crista com vale: *destrutiva* (soma 0)")}</Txt>
      <Txt x={540} y={1240} o={oFone} fonte={SORA} tam={40}>{rico("fone com *cancelamento de ruído*")}</Txt>
    </AbsoluteFill>
  );
};

// --- 14. polarização -------------------------------------------------------------------------------------------
const Polarizacao: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const m = (w: string, n = 1) => marca("polarizacao", w, n);
  const yc = 830, xf = 540, A = 110, k = TAU / 240, w = TAU * 0.5;
  const oF = ap(f, m("filtro"), 14);
  // Vibração no plano y–z, z desenhado em perspectiva oblíqua.
  const haste = (x: number, alfa: number) => {
    const L = A * Math.sin(k * x - w * t);
    return { x: x + L * Math.cos(alfa) * 0.42, y: yc - L * Math.sin(alfa) + L * Math.cos(alfa) * 0.28 };
  };
  const amostras = Array.from({ length: 46 }, (_, i) => 90 + i * 20);
  return (
    <AbsoluteFill>
      <Topo id="polarizacao" rotulo="FENÔMENOS" />
      <Titulo de={m("polarização") - 6}>Polarização</Titulo>
      <Def linhas={[["Um filtro deixa passar só", m("filtro")], ["a vibração num *plano*.", m("plano")], ["Só com onda *transversal*.", m("transversal")]]} />
      <Svg>
        <line x1={80} y1={yc} x2={1000} y2={yc} stroke={TEXTO_2} strokeWidth={2} />
        {amostras.map((x, i) => {
          const alfa = (i * 2.39996 + t * 0.6) % Math.PI; // luz natural: cada trecho num plano
          const depois = x > xf;
          const pol = depois ? oF : 0;
          const a = haste(x, alfa), b = haste(x, Math.PI / 2);
          return (
            <g key={i}>
              {pol < 1 && <line x1={x} y1={yc} x2={a.x} y2={a.y} stroke={CIANO} strokeWidth={3} opacity={0.75 * (1 - pol)} />}
              {pol > 0 && <line x1={x} y1={yc} x2={b.x} y2={b.y} stroke={CIANO} strokeWidth={3} opacity={0.8 * pol} />}
            </g>
          );
        })}
        {oF > 0 && (
          <g opacity={oF}>
            <Neon filtro="aoNeon" largura={3.5}><path d={curva(xf + 20, 1000, (x) => yc - A * Math.sin(k * x - w * t), 3)} /></Neon>
            <path d={`M ${xf - 30} 690 L ${xf + 30} 640 L ${xf + 30} 990 L ${xf - 30} 1040 Z`} fill="rgba(5,7,12,0.55)" stroke={TEXTO} strokeWidth={3} />
            {Array.from({ length: 5 }, (_, i) => {
              const xx = xf - 20 + i * 10;
              return <line key={i} x1={xx} y1={682 - i * 8.3} x2={xx} y2={1032 - i * 8.3} stroke={TEXTO} strokeWidth={2} opacity={0.8} />;
            })}
          </g>
        )}
        <Certo x={110} y={1215} o={ap(f, m("luz"))} />
        <Errado x={110} y={1315} o={ap(f, m("som"))} />
        {ap(f, m("óculos")) > 0 && (
          <g opacity={ap(f, m("óculos"))} fill="none" stroke={TEXTO} strokeWidth={4}>
            <rect x={78} y={1395} width={32} height={22} rx={8} />
            <rect x={122} y={1395} width={32} height={22} rx={8} />
            <path d="M 110 1402 Q 116 1396 122 1402" />
          </g>
        )}
      </Svg>
      <Txt x={xf} y={590} o={oF} tam={22}>FILTRO POLARIZADOR</Txt>
      <Txt x={300} y={1060} o={1} tam={24} cor={TEXTO_2}>{"LUZ NATURAL\nVIBRA EM TODOS OS PLANOS"}</Txt>
      <Txt x={780} y={1060} o={ap(f, m("plano"))} tam={24} cor={CIANO}>{"POLARIZADA\nUM PLANO SÓ"}</Txt>
      <Txt x={160} y={1192} o={ap(f, m("luz"))} ancora="l" fonte={SORA} tam={38}>{rico("Luz (transversal): *polariza*")}</Txt>
      <Txt x={160} y={1292} o={ap(f, m("som"))} ancora="l" fonte={SORA} tam={38}>{rico("Som (longitudinal): *não polariza*")}</Txt>
      <Txt x={176} y={1384} o={ap(f, m("óculos"))} ancora="l" fonte={SORA} tam={34} cor={TEXTO_2}>óculos de sol polarizados</Txt>
    </AbsoluteFill>
  );
};

// --- 15. resumo (tabela que fica parada no fim) -------------------------------------------------------------
const Resumo: React.FC = () => {
  const f = useCurrentFrame();
  const m = (w: string, n = 1) => marca("resumo", w, n);
  const linhas: { r: string; v: string; de: number }[] = [
    { r: "ONDA", v: "leva *energia*, não matéria", de: m("energia") },
    { r: "NATUREZA", v: "mecânica (precisa de meio) · eletromagnética (vácuo)", de: m("mecânica") },
    { r: "VIBRAÇÃO", v: "transversal (⊥) · longitudinal (mesma direção)", de: m("transversal") },
    { r: "GRANDEZAS", v: "A = energia · λ = crista a crista · T (s) · f (Hz)", de: m("amplitude") },
    { r: "EQUAÇÕES", v: "*v = λ · f*   e   f = 1 / T", de: m("v") },
    { r: "MUDOU DE MEIO", v: "*f igual*; v e λ mudam", de: marcaFim("resumo", "f") },
    { r: "REFLEXÃO", v: "volta pro mesmo meio · ângulos iguais", de: m("reflexão") },
    { r: "REFRAÇÃO", v: "muda de meio e de velocidade", de: m("refração") },
    { r: "DIFRAÇÃO", v: "contorna obstáculos e frestas", de: m("difração") },
    { r: "INTERFERÊNCIA", v: "as ondas se somam: construtiva · destrutiva", de: m("interferência") },
    { r: "POLARIZAÇÃO", v: "um plano só · só onda transversal", de: m("interferência") + 24 },
  ];
  return (
    <AbsoluteFill>
      <Topo id="resumo" rotulo="RESUMO" />
      <Titulo de={0}>Resumo da aula</Titulo>
      <div style={{ position: "absolute", top: 300, left: 70, width: 950 }}>
        {linhas.map((l, i) => {
          const o = ap(f, l.de, 10);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", minHeight: 104, borderTop: `1px solid ${TEXTO_2}66`, opacity: o, translate: `${(1 - o) * 30}px 0` }}>
              <div style={{ width: 270, flexShrink: 0, fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: CIANO }}>{l.r}</div>
              <div style={{ flex: 1, fontFamily: SORA, fontWeight: 300, fontSize: 34, lineHeight: 1.22, color: TEXTO }}>{rico(l.v)}</div>
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
      position: "absolute", top: 1610, left: 80, width: 920, textAlign: "center",
      fontFamily: SORA, fontWeight: 400, fontSize: 56, lineHeight: 1.12, letterSpacing: -0.5, color: TEXTO,
      textShadow: "0 0 24px rgba(5,7,12,0.95), 0 3px 6px rgba(0,0,0,0.9)", scale: `${s}`, opacity: entre(f, bloco.de, bloco.de + 2),
    }}>
      {bloco.partes.map((p, i) => (
        <span key={i} style={{ color: p.chave ? LARANJA : TEXTO }}>{i ? " " : ""}{p.t}</span>
      ))}
    </div>
  );
};

/** Cena com relógio local; entra e sai com fusão de 10 quadros (sobreposta à cena seguinte). */
const FUSAO = 10;
const Cena: React.FC<{ dur: number; primeira?: boolean; children: React.ReactNode }> = ({ dur, primeira, children }) => {
  const f = useCurrentFrame();
  const o = (primeira ? 1 : entre(f, 0, FUSAO)) * (1 - entre(f, dur - FUSAO, dur));
  return <AbsoluteFill style={{ opacity: o, background: "transparent" }}>{children}</AbsoluteFill>;
};

const CENAS: Record<Id, React.FC> = {
  abertura: Abertura, rolha: Rolha, natureza: Natureza, direcao: Direcao, crista: Crista, lambda: Lambda,
  frequencia: Frequencia, equacao: Equacao, pegadinha: Pegadinha, reflexao: Reflexao, refracao: Refracao,
  difracao: Difracao, interferencia: Interferencia, polarizacao: Polarizacao, resumo: Resumo,
};

export const AulaOndas: React.FC = () => (
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
        <Audio src={staticFile(`ciencia/aula-ondas/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
    {/* scripts/gerar-trilha-aula-ondas.mjs: colchão discreto, whoosh e sino nas trocas de cena */}
    <Audio src={staticFile("ciencia/aula-ondas/trilha.mp3")} volume={0.16} />
  </Fundo>
);
