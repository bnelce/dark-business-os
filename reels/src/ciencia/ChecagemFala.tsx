import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./checagem-fala.json";
import T from "./checagem-fala-tempos.json";
import { Fundo, entre } from "./base";
import { CIANO, LARANJA, MONO, SORA, TEXTO, TEXTO_2, FUNDO } from "./tokens";

// "Ele disse. Os dados mostram.": o post de Nikolas Ferreira no X (25/10/2026, 23h18) checado ponto a ponto
// com os boletins de urna dos dois turnos de 2026.
//   gancho   a citação em tela, com a foto oficial de candidatura (TSE, CC BY), nome, data e fonte; a voz lê junto
//            (a fala é um post no X, não discurso nem entrevista: por isso a foto do TSE, não uma foto do momento)
//   pontos   os 4 pontos do post, literais, com o carimbo vazio
//   p1       ">11 milhões": 10.376.694 (EXAGERADO)
//   p2       "TODOS OS ESTADOS": dois mapas de 27 UFs, Lula 27, Flávio 21 (VERDADE)
//   p3       "abstenção não explica": 21,08% → 19,22%, +2.960.239 contra o ganho do Lula (VERDADE)
//   p4/soma  "todos os votos dos outros": eliminados 9,3 mi < ganho; + comparecimento + branco e nulo = 14,1 mi;
//            Lula 74%, Flávio 26% (FALSO); sozinha nenhuma fonte explica, juntas fecham voto a voto
//   pergunta os 4 carimbos e "Qual frase da eleição você quer ver nos dados?"; volta pra citação (loop)
//
// Neutralidade (viralizacao.md 4.4): Lula e Flávio na mesma régua e no mesmo tipo de número, sem cor de partido
// (Lula em ciano, Flávio em branco). O laranja é só dos carimbos e das palavras-chave.
// Números: checagem-fala.json (scripts/gerar-checagem-fala.mjs, que confere cada número da fala contra a conta).
// Tempos: checagem-fala-tempos.json (scripts/tempos-checagem-fala.mjs).

export const CHECAGEM_FALA_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const C = T.cena;
const FIM = T.fim;
const G0 = T.grande[0].f;

const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const saida = Easing.out(Easing.cubic);
const SOMBRA_TXT = "0 0 14px rgba(5,7,12,1), 0 0 6px rgba(5,7,12,1)";
const visivel = (f: number, de: number, ate: number, fade = 6) => (f < de - fade || f >= ate + fade ? 0 : Math.min(entre(f, de - fade, de), 1 - entre(f, ate, ate + fade)));
const milhar = (n: number) => Math.round(n).toLocaleString("pt-BR");

// O post, literal, com os ">" e os espaços do original (x.com/nikolas_dm/status/2114542235731796011).
// O ">" do 1º ponto importa: diz "mais de 11 milhões".
const POST = [
  ">11 milhões de votos a mais",
  "> crescimento em TODOS OS ESTADOS",
  ">Redução na abstenção não explica o fenômeno",
  "> todos os votos dos outros candidatos teriam que ir pro Lula. Qual a chance?",
];
const VEREDITOS = ["EXAGERADO", "VERDADE", "VERDADE", "FALSO"];
const QUEM = "NIKOLAS FERREIRA · DEPUTADO FEDERAL (PL-MG)";
const ONDE = "POST NO X · 25/10/2026, 23H18 · x.com/nikolas_dm";
const FOTO = "ciencia/checagem-fala/fotos/nikolas.jpg"; // TSE, foto_cand2026_MG_div.zip, SQ 130002542026 (161x225)
const CREDITO = "FOTO: TSE (CC BY)";

/** Rosto de quem disse: retângulo 5:7 com borda fina. */
const Rosto: React.FC<{ w: number; style?: React.CSSProperties }> = ({ w, style }) => (
  <Img src={staticFile(FOTO)} style={{ width: w, height: Math.round(w * 1.4), objectFit: "cover", border: `2px solid ${TEXTO_2}88`, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", ...style }} />
);

const Etiqueta: React.FC<{ texto: string; o: number; top?: number; cor?: string }> = ({ texto, o, top = 236, cor = TEXTO_2 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: 60, width: 960, textAlign: "center", opacity: o, fontFamily: MONO, fontSize: 28, letterSpacing: 3, color: cor, whiteSpace: "pre-line", lineHeight: 1.4 }}>{texto}</div>
  );

/** Carimbo do veredito: entra grande e assenta, levemente torto. */
const Carimbo: React.FC<{ texto: string; de: number; x: number; y: number; tam?: number; rot?: number; o?: number }> = ({ texto, de, x, y, tam = 56, rot = -7, o = 1 }) => {
  const f = useCurrentFrame();
  if (f < de - 1 || o <= 0) return null;
  const p = mola(f, de - 1, { damping: 12, stiffness: 260 });
  return (
    <div style={{
      position: "absolute", left: x, top: y, translate: "-50% -50%", rotate: `${rot}deg`, scale: `${1.7 - 0.7 * p}`, opacity: Math.min(1, p * 1.6) * o,
      border: `${Math.max(3, tam / 12)}px solid ${LARANJA}`, padding: `${tam * 0.12}px ${tam * 0.36}px`, fontFamily: MONO, fontSize: tam, letterSpacing: tam * 0.1,
      color: LARANJA, background: "rgba(5,7,12,0.82)", boxShadow: `0 0 24px ${LARANJA}55`, textShadow: `0 0 16px ${LARANJA}66`, whiteSpace: "nowrap",
    }}>{texto}</div>
  );
};

/** A linha citada do post, no alto de cada cena de ponto. */
const Citada: React.FC<{ n: number; o: number; tam?: number }> = ({ n, o, tam = 50 }) => (
  <>
    <div style={{ position: "absolute", top: 210, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 20, opacity: o }}>
      <Img src={staticFile(FOTO)} style={{ width: 68, height: 68, borderRadius: 34, objectFit: "cover", objectPosition: "50% 20%", border: `2px solid ${CIANO}` }} />
      <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 3, color: TEXTO_2 }}>PONTO {n} DE 4 · NIKOLAS DISSE</div>
    </div>
    <div style={{ position: "absolute", top: 296, left: 90, width: 900, textAlign: "center", opacity: o, fontFamily: SORA, fontWeight: 300, fontSize: tam, lineHeight: 1.18, color: TEXTO }}>
      “{POST[n - 1]}”
    </div>
  </>
);

// --- 1. a citação (quadro 0 e o fim, pro loop) ---------------------------------------------------------------
const PALAVRAS_CIT = POST[3].replace(/^>\s*/, "").split(" ");

const Cartao: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM;
  const o = noFim ? entre(f, FIM, FIM + 10) : visivel(f, 0, C.cartao.ate, 5);
  if (o <= 0) return null;
  // o sublinhado anda pela citação junto com a voz: do quadro 0 até "chance?" (as 13 primeiras palavras do gancho)
  // no fim (loop) o cartão volta igual ao quadro 0: sublinhado em "todos", sem laranja
  const idx = noFim ? 0 : Math.floor((f / Math.max(1, M.chance)) * (PALAVRAS_CIT.length - 1));
  const caret = Math.floor(f / 15) % 2 === 0;
  const chance = noFim ? 0 : entre(f, M.chance - 10, M.chance - 2);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"ELE DISSE. OS DADOS MOSTRAM."} o={1} top={250} cor={TEXTO} />
      <div style={{ position: "absolute", top: 360, left: 70, width: 940, border: `2px solid ${TEXTO_2}66`, background: "rgba(12,20,36,0.55)", padding: "40px 46px 36px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <Rosto w={150} />
          <div>
            <div style={{ fontFamily: SORA, fontWeight: 400, fontSize: 52, lineHeight: 1.05, letterSpacing: -1, color: TEXTO }}>Nikolas<br />Ferreira</div>
            <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: CIANO }}>DEPUTADO FEDERAL (PL-MG)</div>
            <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 18, letterSpacing: 2, color: TEXTO_2 }}>{CREDITO}</div>
          </div>
        </div>
        <div style={{ marginTop: 30, fontFamily: SORA, fontWeight: 300, fontSize: 70, lineHeight: 1.16, letterSpacing: -1, color: TEXTO }}>
          <span style={{ color: TEXTO_2 }}>“</span>
          {PALAVRAS_CIT.map((w, i) => {
            const naChance = i >= PALAVRAS_CIT.length - 3;
            const atual = i === idx;
            return (
              <span key={i} style={{ color: naChance ? (chance > 0.5 ? LARANJA : TEXTO) : TEXTO, textDecoration: atual ? `underline ${CIANO} 5px` : "none", textUnderlineOffset: 12, textShadow: naChance && chance > 0.5 ? `0 0 26px ${LARANJA}66` : undefined }}>
                {i ? " " : ""}{w}
              </span>
            );
          })}
          <span style={{ color: TEXTO_2 }}>”</span>
          <span style={{ display: "inline-block", width: 6, height: 62, marginLeft: 10, background: CIANO, opacity: caret ? 0.9 : 0, translate: "0 8px" }} />
        </div>
        <div style={{ marginTop: 30, fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: TEXTO_2 }}>{ONDE}</div>
      </div>
      {/* os 4 pontos ainda sem veredito */}
      <div style={{ position: "absolute", top: 1100, width: "100%", display: "flex", justifyContent: "center", gap: 26 }}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{ width: 86, height: 86, border: `2px dashed ${TEXTO_2}99`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 40, color: TEXTO_2 }}>{n}</div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 1210, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: TEXTO_2 }}>4 PONTOS · CHECADOS COM OS BOLETINS DE URNA</div>
    </AbsoluteFill>
  );
};

// --- 2. os 4 pontos (lista) e os vereditos (fim) --------------------------------------------------------------
const Lista: React.FC<{ comVeredito: boolean }> = ({ comVeredito }) => {
  const f = useCurrentFrame();
  const cn = comVeredito ? C.veredito : C.lista;
  const o = visivel(f, cn.de, cn.ate);
  if (o <= 0) return null;
  const top0 = comVeredito ? 300 : 360, passo = comVeredito ? 170 : 200;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={comVeredito ? "O POST × OS BOLETINS DE URNA" : `${QUEM}\nPOST NO X · 25/10/2026`} o={1} top={comVeredito ? 236 : 220} />
      {POST.map((linha, i) => {
        const e = entre(f, cn.de + 2 + i * 5, cn.de + 10 + i * 5, saida);
        const top = top0 + i * passo;
        return (
          <div key={i} style={{ opacity: e, translate: `${(1 - e) * 30}px 0` }}>
            <div style={{ position: "absolute", top: top - 4, left: 76, width: 70, fontFamily: MONO, fontSize: 56, color: TEXTO_2 }}>{i + 1}</div>
            <div style={{ position: "absolute", top, left: 160, width: comVeredito ? 560 : 840, fontFamily: SORA, fontWeight: 300, fontSize: comVeredito ? 36 : 44, lineHeight: 1.2, color: TEXTO }}>“{linha}”</div>
            {!comVeredito && <div style={{ position: "absolute", top: top + (i === 3 ? 118 : 62), left: 160, width: 840, height: 1, background: `${TEXTO_2}44` }} />}
            {comVeredito && <Carimbo texto={VEREDITOS[i]} de={cn.de + 4 + i * 3} x={868} y={top + 30} tam={34} rot={-6} />}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// --- 3. ponto 1: >11 milhões × 10.376.694 ----------------------------------------------------------------------
const BX0 = 110, BX1 = 970; // régua horizontal: 0 a 12 milhões
const xMi = (v: number, max = 12e6) => BX0 + (v / max) * (BX1 - BX0);

const P1: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.p1.de, C.p1.ate);
  if (o <= 0) return null;
  const post = entre(f, M.n11 - 4, M.n11 + 8, saida);
  const conta = T.contas.find((c) => c.id === "c104")!;
  const v = D.dLula * entre(f, conta.de, conta.ate, saida);
  const tse = entre(f, conta.de - 4, conta.de);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Citada n={1} o={1} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[0, 5e6, 10e6].map((t) => (
          <g key={t}>
            <line x1={xMi(t)} x2={xMi(t)} y1={540} y2={900} stroke={TEXTO_2} strokeWidth={1.5} strokeDasharray="4 8" opacity={0.6} />
            <text x={xMi(t)} y={940} textAnchor="middle" fontFamily={MONO} fontSize={26} fill={TEXTO_2}>{t / 1e6} MI</text>
          </g>
        ))}
        {/* o post: mais de 11 milhões (contorno) */}
        <rect x={BX0} y={580} width={(xMi(11e6) - BX0) * post} height={70} fill="none" stroke={TEXTO_2} strokeWidth={3} strokeDasharray="10 8" />
        <text x={BX0} y={560} fontFamily={MONO} fontSize={28} letterSpacing={2} fill={TEXTO_2} opacity={post}>O POST: MAIS DE 11 MILHÕES</text>
        {/* o TSE: 10.376.694 */}
        <rect x={BX0} y={760} width={Math.max(0, xMi(v) - BX0)} height={70} fill={CIANO} opacity={0.85} style={{ filter: `drop-shadow(0 0 10px ${CIANO}88)` }} />
        <text x={BX0} y={740} fontFamily={MONO} fontSize={28} letterSpacing={2} fill={CIANO} opacity={tse}>BOLETINS DE URNA: GANHO DO LULA</text>
      </svg>
      <div style={{ position: "absolute", top: 980, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 116, letterSpacing: -3, color: TEXTO, opacity: tse }}>+{milhar(v)}</div>
      <div style={{ position: "absolute", top: 1120, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: TEXTO_2, opacity: tse }}>53.879.538 → 64.256.232 VOTOS</div>
      <Carimbo texto="EXAGERADO" de={M.exag} x={760} y={640} tam={54} />
    </AbsoluteFill>
  );
};

// --- 4. ponto 2: os dois mapas de 27 UFs ------------------------------------------------------------------------
// Mosaico do Brasil: uma casa por UF, na posição aproximada.
const GRADE: Record<string, [number, number]> = {
  RR: [0, 1], AP: [0, 3],
  AC: [1, 0], AM: [1, 1], PA: [1, 2], MA: [1, 3], CE: [1, 4], RN: [1, 5],
  RO: [2, 1], MT: [2, 2], TO: [2, 3], PI: [2, 4], PB: [2, 5],
  MS: [3, 1], GO: [3, 2], DF: [3, 3], BA: [3, 4], PE: [3, 5], AL: [3, 6],
  PR: [4, 2], SP: [4, 3], MG: [4, 4], ES: [4, 5], SE: [4, 6],
  SC: [5, 2], RJ: [5, 4],
  RS: [6, 2],
};
// Ordem em que as casas acendem: de cima pra baixo, da esquerda pra direita.
const ORDEM_UF = Object.entries(GRADE).sort((a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1]).map(([u]) => u);
const CASA = 58, VAO = 6;

const Mosaico: React.FC<{ x0: number; y0: number; cor: string; campo: "dL" | "dF"; de: number; nome: string; total: number; nDe: number }> = ({ x0, y0, cor, campo, de, nome, total, nDe }) => {
  const f = useCurrentFrame();
  const ufs = new Map(D.ufs.map((u) => [u.uf, u]));
  const subiram = ORDEM_UF.filter((u) => (ufs.get(u)![campo] as number) > 0);
  const acesas = ORDEM_UF.filter((u) => {
    const k = subiram.indexOf(u);
    return k >= 0 && f >= de + k * 0.8;
  }).length;
  const n = mola(f, nDe - 2, { damping: 11, stiffness: 200 });
  return (
    <>
      <div style={{ position: "absolute", top: y0 - 60, left: x0, width: 7 * (CASA + VAO), textAlign: "center", fontFamily: MONO, fontSize: 32, letterSpacing: 4, color: cor }}>{nome}</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {ORDEM_UF.map((u) => {
          const [r, c] = GRADE[u];
          const x = x0 + c * (CASA + VAO), y = y0 + r * (CASA + VAO);
          const subiu = (ufs.get(u)![campo] as number) > 0;
          const k = subiram.indexOf(u);
          const a = subiu ? entre(f, de + k * 0.8, de + k * 0.8 + 5) : 0;
          return (
            <g key={u}>
              <rect x={x} y={y} width={CASA} height={CASA} fill={cor} fillOpacity={0.82 * a} stroke={subiu ? cor : TEXTO_2} strokeOpacity={subiu ? 0.4 + 0.6 * a : 0.55} strokeWidth={2} strokeDasharray={subiu ? undefined : "4 4"} />
              <text x={x + CASA / 2} y={y + CASA / 2 + 8} textAnchor="middle" fontFamily={MONO} fontSize={22} fill={a > 0.5 ? FUNDO : TEXTO_2}>{u}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", top: y0 + 7 * (CASA + VAO) + 16, left: x0, width: 7 * (CASA + VAO), textAlign: "center", fontFamily: MONO, color: cor }}>
        <span style={{ fontSize: 74, letterSpacing: -2, display: "inline-block", scale: `${1 + 0.18 * n * (1 - entre(f, nDe + 8, nDe + 22))}` }}>{acesas}</span>
        <span style={{ fontSize: 34, color: TEXTO_2 }}> DE {total}</span>
      </div>
    </>
  );
};

const P2: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.p2.de, C.p2.ate);
  if (o <= 0) return null;
  const W = 7 * (CASA + VAO);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Citada n={2} o={1} />
      <Mosaico x0={540 - W - 22} y0={560} cor={CIANO} campo="dL" de={M.todos} nome="LULA" total={27} nDe={M.n27} />
      <Mosaico x0={540 + 22} y0={560} cor={TEXTO} campo="dF" de={M.flavio2} nome="FLÁVIO" total={27} nDe={M.n21} />
      <div style={{ position: "absolute", top: 1150, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: TEXTO_2, opacity: entre(f, M.flavio2, M.flavio2 + 10) }}>
        ACESA = MAIS VOTOS NO 2º TURNO QUE NO 1º · 26 ESTADOS + DF
      </div>
      <Carimbo texto="VERDADE" de={M.verdade2} x={540} y={1200} tam={50} rot={-5} o={1 - entre(f, M.flavio2 - 4, M.flavio2 + 6)} />
    </AbsoluteFill>
  );
};

// --- 5. ponto 3: abstenção --------------------------------------------------------------------------------------
const P3: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.p3.de, C.p3.ate);
  if (o <= 0) return null;
  const ab = entre(f, M.abst - 6, M.abst + 4);
  const seta = entre(f, M.abst, M.abst + 14, saida);
  const linha = entre(f, M.abst + 4, M.abst + 18, saida);
  const conta = T.contas.find((c) => c.id === "c3")!;
  const v = D.dComp * entre(f, conta.de, conta.ate, saida);
  const max = D.dLula * 1.08;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Citada n={3} o={1} tam={46} />
      <div style={{ position: "absolute", top: 470, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: TEXTO_2, opacity: ab }}>ABSTENÇÃO</div>
      <div style={{ position: "absolute", top: 510, width: "100%", display: "flex", justifyContent: "center", alignItems: "baseline", gap: 30, fontFamily: MONO, opacity: ab }}>
        <span style={{ fontSize: 88, color: TEXTO_2 }}>{D.abst1.toFixed(2).replace(".", ",")}%</span>
        <span style={{ fontSize: 64, color: TEXTO_2, opacity: seta }}>→</span>
        <span style={{ fontSize: 88, color: TEXTO, opacity: seta }}>{D.abst2.toFixed(2).replace(".", ",")}%</span>
      </div>
      <div style={{ position: "absolute", top: 618, width: "100%", display: "flex", justifyContent: "center", gap: 250, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, opacity: ab }}>
        <span>1º TURNO</span><span>2º TURNO</span>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {/* o ganho do Lula, de referência */}
        <rect x={BX0} y={760} width={(xMi(D.dLula, max) - BX0) * linha} height={64} fill="none" stroke={CIANO} strokeWidth={3} />
        <text x={BX0} y={740} fontFamily={MONO} fontSize={26} letterSpacing={2} fill={CIANO} opacity={linha}>GANHO DO LULA · {milhar(D.dLula)}</text>
        {/* quem a mais foi votar */}
        <rect x={BX0} y={900} width={Math.max(0, xMi(v, max) - BX0)} height={64} fill={TEXTO} opacity={0.88} />
        <text x={BX0} y={880} fontFamily={MONO} fontSize={26} letterSpacing={2} fill={TEXTO} opacity={entre(f, conta.de - 4, conta.de)}>ELEITORES A MAIS NAS URNAS</text>
      </svg>
      <div style={{ position: "absolute", top: 990, left: BX0, width: 860, fontFamily: MONO, fontSize: 96, letterSpacing: -3, color: TEXTO, opacity: entre(f, conta.de - 4, conta.de) }}>+{milhar(v)}</div>
      <Carimbo texto="VERDADE" de={M.verdade3} x={540} y={1190} tam={50} rot={-6} />
    </AbsoluteFill>
  );
};

// --- 6. ponto 4: as três fontes, a soma e a divisão ------------------------------------------------------------
const MAXF = 14.6e6;
const xF = (v: number) => BX0 + (v / MAXF) * (BX1 - BX0);

const Fontes: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.fontes.de, C.fontes.ate);
  if (o <= 0) return null;
  const alvo = entre(f, M.resto - 4, M.resto + 10, saida);
  const eE = entre(f, M.elim - 2, M.n93 + 4, saida);
  const eC = entre(f, M.s3 - 4, M.s3 + 8, saida);
  const eB = entre(f, M.n18 - 4, M.n18 + 8, saida);
  const menos = entre(f, M.menos - 3, M.menos + 5) * (1 - entre(f, M.s3 - 6, M.s3));
  const total = entre(f, M.n141 - 4, M.n141 + 4);
  const div = entre(f, M.n74 - 4, M.n74 + 10, saida);
  const divF = entre(f, M.flavioS - 4, M.flavioS + 8, saida);
  // "Sozinha, nenhuma fonte explica": as três se separam em linhas; "Juntas": voltam pra uma só.
  const sep = entre(f, M.sozinha - 2, M.sozinha + 10, saida) * (1 - entre(f, M.juntas - 2, M.juntas + 10, saida));
  const somDiv = 1 - entre(f, M.sozinha - 4, M.sozinha + 4);
  const eq = entre(f, M.juntas + 2, M.juntas + 10);
  const vav = entre(f, M.voto - 4, M.voto + 4);
  const Y = 640, H = 66;
  const segs = [
    { de: 0, v: D.eliminados, e: eE, cor: TEXTO_2, rot: "ELIMINADOS", n: D.eliminados, y: 0 },
    { de: D.eliminados, v: D.dComp, e: eC, cor: CIANO, rot: "+ URNAS", n: D.dComp, y: 1 },
    { de: D.eliminados + D.dComp, v: D.dBN, e: eB, cor: TEXTO, rot: "− BRANCO/NULO", n: D.dBN, y: 2 },
  ];
  const opac = [0.55, 0.45, 0.6];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto="PONTO 4 DE 4 · O POST DIZ" o={1} />
      <div style={{ position: "absolute", top: 292, left: 90, width: 900, textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 44, lineHeight: 1.18, color: TEXTO }}>
        “&gt; <span style={{ color: f >= M.todos4 - 2 && f < M.s3 ? LARANJA : TEXTO }}>todos</span> os votos dos outros candidatos teriam que ir pro Lula”
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {/* a linha do ganho do Lula */}
        <g opacity={alvo}>
          <line x1={xF(D.dLula)} x2={xF(D.dLula)} y1={500} y2={1000} stroke={CIANO} strokeWidth={3} strokeDasharray="10 8" />
          <text x={xF(D.dLula)} y={488} textAnchor="middle" fontFamily={MONO} fontSize={26} letterSpacing={2} fill={CIANO}>GANHO DO LULA</text>
          <text x={xF(D.dLula)} y={1036} textAnchor="middle" fontFamily={MONO} fontSize={26} fill={CIANO}>{milhar(D.dLula)}</text>
        </g>
        {segs.map((s, i) => {
          const dy = sep * s.y * 120;
          const x = BX0 + (xF(s.de) - BX0) * (1 - sep);
          const w = (xF(s.v) - BX0) * s.e;
          if (w <= 0) return null;
          return (
            <g key={i}>
              <rect x={x} y={Y + dy} width={w} height={H} fill={s.cor} fillOpacity={opac[i] + 0.3} stroke={FUNDO} strokeWidth={2} />
              {sep > 0.5 && (
                <text x={x + w + 16} y={Y + dy + 44} fontFamily={MONO} fontSize={26} fill={TEXTO_2}>{s.rot} {milhar(s.n)}</text>
              )}
            </g>
          );
        })}
        {/* rótulos das fontes, na fila */}
        <g opacity={(1 - sep) * somDiv}>
          <text x={BX0} y={Y - 16} fontFamily={MONO} fontSize={24} letterSpacing={1} fill={TEXTO_2} opacity={eE}>ELIMINADOS {milhar(D.eliminados)}</text>
          <text x={xF(D.eliminados) + 4} y={Y + H + 34} fontFamily={MONO} fontSize={22} fill={CIANO} opacity={eC}>+URNAS</text>
          <text x={xF(D.eliminados + D.dComp) + 4} y={Y + H + 64} fontFamily={MONO} fontSize={22} fill={TEXTO} opacity={eB}>−BRANCO/NULO</text>
        </g>
        {/* faltou pouco: os eliminados sozinhos não chegam na linha */}
        {menos > 0 && (
          <g opacity={menos}>
            <rect x={xF(D.eliminados)} y={Y - 6} width={xF(D.dLula) - xF(D.eliminados)} height={H + 12} fill="none" stroke={LARANJA} strokeWidth={3} />
            <text x={xF(D.dLula) - 6} y={Y + H + 50} textAnchor="end" fontFamily={MONO} fontSize={26} letterSpacing={2} fill={LARANJA}>MENOS QUE O GANHO</text>
          </g>
        )}
        {/* a divisão: 74% Lula, 26% Flávio */}
        <g opacity={somDiv}>
          <rect x={BX0} y={840} width={(xF(D.dLula) - BX0) * div} height={H} fill={CIANO} opacity={0.88} />
          <rect x={xF(D.dLula)} y={840} width={(xF(D.fontes) - xF(D.dLula)) * divF} height={H} fill={TEXTO} opacity={0.9} />
          <text x={BX0} y={830 - 10} fontFamily={MONO} fontSize={26} letterSpacing={2} fill={CIANO} opacity={div}>LULA {Math.round(D.lulaPct)}%</text>
          <text x={xF(D.fontes)} y={830 - 10} textAnchor="end" fontFamily={MONO} fontSize={26} letterSpacing={2} fill={TEXTO} opacity={divF}>FLÁVIO {Math.round(100 - D.lulaPct)}%</text>
          <text x={xF(D.fontes)} y={840 + H + 40} textAnchor="end" fontFamily={MONO} fontSize={24} fill={TEXTO_2} opacity={divF}>+{milhar(D.dFlavio)}</text>
        </g>
      </svg>
      {/* total em jogo */}
      <div style={{ position: "absolute", top: 530, left: BX0, width: xF(D.fontes) - BX0, textAlign: "right", fontFamily: MONO, fontSize: 40, color: TEXTO, opacity: total * (1 - sep), textShadow: SOMBRA_TXT }}>
        {milhar(D.fontes)} <span style={{ fontSize: 24, color: TEXTO_2, letterSpacing: 2 }}>EM JOGO</span>
      </div>
      {/* a conta, voto a voto */}
      <div style={{ position: "absolute", top: 1080, width: "100%", textAlign: "center", fontFamily: MONO, color: TEXTO, opacity: eq, lineHeight: 1.5 }}>
        <div style={{ fontSize: 30 }}>{milhar(D.eliminados)} + {milhar(D.dComp)} + {milhar(D.dBN)}</div>
        <div style={{ fontSize: 30 }}>= <span style={{ color: TEXTO }}>{milhar(D.fontes)}</span></div>
        <div style={{ fontSize: 30 }}>= <span style={{ color: CIANO }}>{milhar(D.dLula)}</span> + {milhar(D.dFlavio)}</div>
        <div style={{ fontSize: 30, letterSpacing: 4, color: LARANJA, opacity: vav, marginTop: 8 }}>VOTO A VOTO</div>
      </div>
      <Carimbo texto="FALSO" de={M.precisou} x={540} y={1090} tam={56} rot={-6} o={1 - entre(f, M.sozinha - 6, M.sozinha)} />
      <div style={{ position: "absolute", top: 1160, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: TEXTO_2, opacity: entre(f, M.precisou + 4, M.precisou + 12) * (1 - entre(f, M.sozinha - 6, M.sozinha)) }}>
        SALDO DAS URNAS, NÃO QUEM TROCOU DE LADO
      </div>
    </AbsoluteFill>
  );
};

// --- legenda e pergunta ------------------------------------------------------------------------------------------
const Legenda: React.FC = () => {
  const f = useCurrentFrame();
  if (f < M.nikolas - 2) return null; // a citação já está no cartão, palavra por palavra
  const bloco = T.legendas.find((l) => f >= l.de && f < l.ate);
  if (!bloco) return null;
  const s = 0.86 + 0.14 * mola(f, bloco.de, { damping: 12, stiffness: 260 });
  return (
    <div style={{
      position: "absolute", top: 1400, left: 90, width: 820, textAlign: "center",
      fontFamily: SORA, fontWeight: 400, fontSize: 68, lineHeight: 1.12, letterSpacing: -0.5, color: TEXTO,
      textShadow: "0 0 24px rgba(5,7,12,0.95), 0 3px 6px rgba(0,0,0,0.9)", scale: `${s}`,
      opacity: entre(f, bloco.de, bloco.de + 2),
    }}>
      {bloco.partes.map((p, i) => (
        <span key={i} style={{ color: p.chave ? LARANJA : TEXTO }}>{i ? " " : ""}{p.t}</span>
      ))}
    </div>
  );
};

const PerguntaFinal: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, G0 - 4, G0 + 2) * (1 - entre(f, FIM - 8, FIM));
  if (o <= 0) return null;
  const nLinhas = Math.max(...T.grande.map((w) => w.l)) + 1;
  const linhas = Array.from({ length: nLinhas }, (_, l) => T.grande.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top: 1010, left: 60, width: 960, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 84, lineHeight: 1.12, letterSpacing: -1, color: TEXTO,
      textShadow: "0 0 30px rgba(5,7,12,0.95)",
    }}>
      {linhas.map((ws, l) => (
        <div key={l}>
          {ws.map((w, i) => {
            const p = entre(f, w.f - 3, w.f + 3);
            return (
              <span key={i} style={{ color: w.chave ? LARANJA : TEXTO, opacity: p, display: "inline-block", marginLeft: i ? "0.26em" : 0, translate: `0 ${(1 - p) * 16}px` }}>
                {w.t}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, T.cta, T.cta + 8);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 1432, left: 0, width: 1080, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, opacity: o }}>
      <Img src={staticFile("ciencia/icone.png")} style={{ width: 64, height: 64 }} />
      <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO, textShadow: SOMBRA_TXT }}>SEGUE O CIÊNCIA VISUAL</div>
    </div>
  );
};

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, C.p1.de - 6, C.p1.de) * (1 - entre(f, C.veredito.de - 6, C.veredito.de));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 1316, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: 0.85 * o }}>
      BOLETINS DE URNA · TSE · 1º E 2º TURNOS DE 2026 · SOMA NOSSA
    </div>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/checagem-fala/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/checagem-fala/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const ChecagemFala: React.FC = () => (
  <Fundo>
    <Lista comVeredito={false} />
    <P1 />
    <P2 />
    <P3 />
    <Fontes />
    <Lista comVeredito />
    <Cartao />
    <Fonte />
    <PerguntaFinal />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-checagem-fala.mjs: colchão, whoosh nas cenas, carimbos nos vereditos */}
    <Audio src={staticFile("ciencia/checagem-fala/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
// Padrão das capas de 12/11 (como a CVEnemTriCapa): rótulo mono no topo do recorte (y 300), elemento forte no
// meio, título Sora 400 com a base em y 1600, uma palavra em laranja. O meio são os 4 pontos do post com o
// veredito de cada um; nenhum número solto sem o carimbo ao lado.
export const ChecagemFalaCapa: React.FC = () => (
  <Fundo>
    <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 32, letterSpacing: 5, color: TEXTO_2 }}>ELE DISSE. OS DADOS MOSTRAM.</div>
    <div style={{ position: "absolute", top: 380, left: 90, display: "flex", alignItems: "center", gap: 40 }}>
      <Rosto w={230} />
      <div>
        <div style={{ fontFamily: SORA, fontWeight: 400, fontSize: 84, lineHeight: 1.0, letterSpacing: -2, color: TEXTO }}>Nikolas<br />Ferreira</div>
        <div style={{ marginTop: 20, fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: CIANO }}>POST NO X · 25/10</div>
        <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: CIANO }}>× BOLETINS DE URNA</div>
        <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 18, letterSpacing: 2, color: TEXTO_2 }}>{CREDITO}</div>
      </div>
    </div>
    {POST.map((linha, i) => {
      const top = 760 + i * 128;
      return (
        <div key={i}>
          <div style={{ position: "absolute", top: top - 4, left: 70, fontFamily: MONO, fontSize: 52, color: TEXTO_2 }}>{i + 1}</div>
          <div style={{ position: "absolute", top, left: 140, width: 560, fontFamily: SORA, fontWeight: 300, fontSize: i === 3 ? 28 : 34, lineHeight: 1.18, color: TEXTO }}>“{linha}”</div>
          <div style={{
            position: "absolute", left: 870, top: top + 28, translate: "-50% -50%", rotate: "-6deg", border: `4px solid ${LARANJA}`, padding: "4px 14px",
            fontFamily: MONO, fontSize: 36, letterSpacing: 4, color: LARANJA, background: "rgba(5,7,12,0.82)", boxShadow: `0 0 20px ${LARANJA}55`, whiteSpace: "nowrap",
          }}>{VEREDITOS[i]}</div>
        </div>
      );
    })}
    <div style={{ position: "absolute", bottom: 320, left: 40, width: 1000, textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 140, lineHeight: 1.04, letterSpacing: -4, color: TEXTO }}>
      4 pontos,<br />4 <span style={{ color: LARANJA, textShadow: `0 0 40px ${LARANJA}66` }}>vereditos</span>
    </div>
  </Fundo>
);
