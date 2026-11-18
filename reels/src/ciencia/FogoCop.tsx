import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./fogo-cop.json";
import T from "./fogo-cop-tempos.json";
import { Fundo, Status, X0, X1, entre, janela } from "./base";
import { CIANO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon } from "./ilustra-dolar";
import { Chama, FocoNaoIncendio, NeonDefs, SateliteAQUA } from "./ilustra-fogo-para";

// Desmatamento × fogo (09/11/2026, começo da COP31). O PRODES 2026 (INPE, 16/10) deu o menor
// desmatamento da série na Amazônia (estimativa) e no Cerrado (taxa consolidada). E o fogo? A conta
// é nossa: focos do satélite de referência (AQUA), janeiro a outubro de 2026. Contra a média de 2019
// a 2025, caiu nos três biomas; contra 2025, a Amazônia teve 70% a mais. Depende da régua. O Pará
// teve o maior outubro da série e o Ceará está perto da média. O PRODES vai de agosto a julho.
//
// Visual: a área desmatada encolhe em quadrados (cada um = 100 km², os que sumiram ficam
// tracejados); o fogo de 2026 é uma barra laranja, sempre a mesma, e o que muda é a régua: a marca
// branca é a média de 2019 a 2025, a ciano é 2025. Laranja é só fogo. O fim volta pros quadrados
// da abertura, pro loop emendar no quadro 0.
//
// Embalagem (viralizacao.md, seção 8): palco de dados no meio e todo texto no terço de baixo
// (y 1170–1550, longe dos botões do IG); legenda sincronizada, 2 a 4 palavras, chave em laranja;
// algo muda a cada 2 a 4s.
//
// Números: fogo-cop.json (scripts/gerar-fogo-cop.mjs, que confere a conta e o que a fala diz).
// Tempos: fogo-cop-tempos.json (scripts/tempos-fogo-cop.mjs). A trilha (gerar-trilha-fogo-cop.mjs)
// lê os mesmos tempos. Editorial: sem causa do fogo (nada de El Niño, gado ou gente), foco não é
// área queimada, o número do PRODES é sempre "do INPE" e as duas réguas aparecem com o mesmo peso.

export const FOGO_COP_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const FIM = T.fim;
const G0 = T.grande[0].f;
const PR = D.fatos;
const A = D.aqua;
const N = D.noaa;

const milhar = (n: number) => Math.round(n).toLocaleString("pt-BR");
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v))}%`;
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const ioCubico = Easing.inOut(Easing.cubic);
const saida = Easing.out(Easing.cubic);
const STATUS_TOP = 330;

// --- texto no terço de baixo ---------------------------------------------------------------
const Legenda: React.FC = () => {
  const f = useCurrentFrame();
  const bloco = T.legendas.find((l) => f >= l.de && f < l.ate);
  if (!bloco) return null;
  const s = bloco.de <= 0 ? 1 : 0.86 + 0.14 * mola(f, bloco.de, { damping: 12, stiffness: 260 });
  return (
    <div style={{
      position: "absolute", top: 1400, left: 90, width: 820, textAlign: "center",
      fontFamily: SORA, fontWeight: 400, fontSize: 68, lineHeight: 1.12, letterSpacing: -0.5, color: TEXTO,
      textShadow: "0 0 24px rgba(5,7,12,0.95), 0 3px 6px rgba(0,0,0,0.9)", scale: `${s}`,
      opacity: bloco.de <= 0 ? 1 : entre(f, bloco.de, bloco.de + 2),
    }}>
      {bloco.partes.map((p, i) => (
        <span key={i} style={{ color: p.chave ? LARANJA : TEXTO }}>{i ? " " : ""}{p.t}</span>
      ))}
    </div>
  );
};

const Heroi: React.FC<{ o: number; children: React.ReactNode; top?: number }> = ({ o, children, top = 1195 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: X0, width: 820, opacity: o, fontFamily: MONO, color: TEXTO, textAlign: "center" }}>{children}</div>
  );

const Grande: React.FC<{ tam?: number; cor?: string; children: React.ReactNode }> = ({ tam = 118, cor = LARANJA, children }) => (
  <div style={{ fontSize: tam, lineHeight: 1.04, color: cor, letterSpacing: -2, textShadow: `0 0 30px ${cor}55`, whiteSpace: "nowrap" }}>{children}</div>
);

const Rotulo: React.FC<{ children: React.ReactNode; cor?: string }> = ({ children, cor = TEXTO_2 }) => (
  <div style={{ fontSize: 24, letterSpacing: 3, color: cor, marginTop: 10, textShadow: "0 0 10px rgba(5,7,12,1), 0 0 4px rgba(5,7,12,1)" }}>{children}</div>
);

const Tag: React.FC<{ texto: string; top: number; o?: number; cor?: string; tam?: number }> = ({ texto, top, o = 1, cor = LARANJA, tam = 40 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: X0, width: 820, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ border: `3px solid ${cor}`, padding: "12px 22px", fontFamily: MONO, fontSize: tam, letterSpacing: 2, color: cor, background: "rgba(5,7,12,0.86)", whiteSpace: "nowrap" }}>{texto}</div>
    </div>
  );

const fonteDe = (f: number) =>
  f >= FIM || f < F.foco ? "FONTE: INPE · PRODES 2026 · DIVULGADO EM 16/10"
    : f < F.virada ? "FONTE: INPE · BDQUEIMADAS · SATÉLITE AQUA · CÁLCULO NOSSO"
      : "FONTE: INPE · PRODES 2026 · BDQUEIMADAS";

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, textShadow: "0 0 10px rgba(5,7,12,1)" }}>
      {fonteDe(f)}
    </div>
  );
};

// --- desmatamento: quadrados de 100 km² --------------------------------------------------------
// Pilha de baixo pra cima, 8 por linha. Os quadrados que somem viram tracejado: dá pra ver o
// tamanho do ano anterior e o quanto encolheu. O último quadrado é fracionário (33,35 → 33 e um
// terço de quadrado), pra não arredondar a área.
const CEL = 40, PASSO = 46, COLS = 8, BASE_Y = 1006;
const LARG_PILHA = COLS * PASSO - (PASSO - CEL);
const X_SO = 540 - LARG_PILHA / 2; // a pilha da Amazônia sozinha, no centro
const X_A = X0, X_C = X1 - LARG_PILHA;

const km2 = (f: number, b: { anterior: number; atual: number }, de: number, ate: number) =>
  b.anterior - (b.anterior - b.atual) * entre(f, de, ate);

const Pilha: React.FC<{ x: number; km: number; anterior: number; o?: number; filtro: string }> = ({ x, km, anterior, o = 1, filtro }) => {
  const total = Math.ceil(anterior / 100);
  const cheio = km / 100;
  return (
    <g opacity={o}>
      {Array.from({ length: total }, (_, k) => {
        const col = k % COLS, lin = Math.floor(k / COLS);
        const cx = x + col * PASSO, cy = BASE_Y - (lin + 1) * PASSO + (PASSO - CEL);
        const fr = Math.max(0, Math.min(1, cheio - k));
        const capAnterior = Math.min(1, anterior / 100 - k); // o último do ano anterior também é fração
        return (
          <g key={k}>
            <rect x={cx} y={cy} width={CEL * capAnterior} height={CEL} fill="none" stroke={TEXTO_2} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="5 5" />
            {fr > 0 && (
              <>
                <rect x={cx} y={cy} width={CEL * fr} height={CEL} fill={CIANO} fillOpacity={0.5} filter={`url(#${filtro})`} />
                <rect x={cx} y={cy} width={CEL * fr} height={CEL} fill={CIANO} fillOpacity={0.78} stroke={CIANO} strokeWidth={1.5} />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
};

const topoPilha = (anterior: number) => BASE_Y - Math.ceil(anterior / 100 / COLS) * PASSO + (PASSO - CEL);

/** Abre e fecha o vídeo: no fim, a Amazônia volta inteira pro centro, que é o quadro 0. */
const Desmatamento: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM - 8;
  if (!noFim && f >= F.foco + 2) return null;
  const o = noFim ? entre(f, FIM - 8, FIM + 4) : 1 - entre(f, F.foco - 6, F.foco + 2);
  const am = PR.amazonia, ce = PR.cerrado;
  // Na volta, os quadrados se enchem de novo até o ano anterior: o último quadro é o quadro 0.
  const kmA = noFim ? am.atual + (am.anterior - am.atual) * entre(f, FIM, T.total - 1, ioCubico) : km2(f, am, T.drenaA.de, T.drenaA.ate);
  const lado = noFim ? 0 : entre(f, M.cerrado - 10, M.cerrado + 4, ioCubico); // a Amazônia vai pro lado e o Cerrado entra
  const xA = X_SO + (X_A - X_SO) * lado;
  const kmC = km2(f, ce, T.drenaC.de, T.drenaC.ate);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="DESMATAMENTO · PRODES" direita={lado > 0.5 ? "AGO/25–JUL/26" : "CADA ■ = 100 KM²"} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonPilha" desvio={6} /></defs>
        <Pilha x={xA} km={kmA} anterior={am.anterior} filtro="neonPilha" />
        {lado > 0 && <Pilha x={X_C} km={kmC} anterior={ce.anterior} o={lado} filtro="neonPilha" />}
        <g fontFamily={MONO} letterSpacing={3}>
          <text x={xA + LARG_PILHA / 2} y={topoPilha(am.anterior) - 26} textAnchor="middle" fill={TEXTO} fontSize={30}>AMAZÔNIA</text>
          <text x={xA + LARG_PILHA / 2} y={BASE_Y + 50} textAnchor="middle" fill={CIANO} fontSize={36} opacity={lado}>{milhar(kmA)} KM²</text>
          {lado > 0 && (
            <g opacity={lado}>
              <text x={X_C + LARG_PILHA / 2} y={topoPilha(ce.anterior) - 26} textAnchor="middle" fill={TEXTO} fontSize={30}>CERRADO</text>
              <text x={X_C + LARG_PILHA / 2} y={BASE_Y + 50} textAnchor="middle" fill={CIANO} fontSize={36}>{milhar(kmC)} KM²</text>
            </g>
          )}
        </g>
      </svg>
      {/* Gancho: o número da Amazônia escorrendo, grande desde o quadro 0. Depois, a queda e o
          recorde do Cerrado. */}
      <Heroi o={noFim ? 1 : 1 - entre(f, M.p42 - 4, M.p42)} top={1070}>
        <Grande tam={100} cor={CIANO}>{milhar(kmA)} KM²</Grande>
        <Rotulo cor={TEXTO}>{noFim || f < T.drenaA.ate ? "AMAZÔNIA · AGO/24–JUL/25 → AGO/25–JUL/26" : "MENOR DA SÉRIE, QUE COMEÇA EM 1988"}</Rotulo>
        <Rotulo>{noFim || f < T.drenaA.ate ? "PRODES · INPE" : "ESTIMATIVA DO INPE · AGO/25–JUL/26"}</Rotulo>
      </Heroi>
      <Heroi o={noFim ? 0 : janela(f, M.p42 - 4, M.cerrado - 2, 6)} top={1070}>
        <Grande tam={104} cor={CIANO}>−{Math.round(100 * (1 - am.atual / am.anterior))}%</Grande>
        <Rotulo>AMAZÔNIA · ANTES: {milhar(am.anterior)} KM²</Rotulo>
      </Heroi>
      <Heroi o={noFim ? 0 : entre(f, M.cerrado + 4, M.cerrado + 12)} top={1110}>
        <Rotulo cor={TEXTO}>CERRADO: MENOR DA SÉRIE, QUE COMEÇA EM {ce.desde}</Rotulo>
        <Rotulo>TAXA CONSOLIDADA · ANTES: {milhar(ce.anterior)} KM²</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- foco: o que o satélite conta ----------------------------------------------------------------
const Foco: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.foco - 2, F.biomas + 2, 8);
  if (o <= 0) return null;
  const sat = entre(f, F.foco, F.foco + 26, ioCubico);
  const grade = entre(f, F.foco + 4, F.foco + 34, ioCubico);
  const fogo = entre(f, M.focos - 8, M.focos + 16, ioCubico);
  const pixels = entre(f, M.focos + 2, M.area - 2);
  const aqua = entre(f, M.aqua - 4, M.aqua + 6);
  const sx = 400 + 280 * entre(f, F.foco, F.biomas); // o satélite anda devagar pela órbita
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="O QUE O SATÉLITE CONTA" direita="ESQUEMA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <NeonDefs />
        <path d={`M${sx},628 L204,760 M${sx},628 L876,760`} fill="none" stroke={CIANO} strokeOpacity={0.22 * sat} strokeWidth={1} />
        {Array.from({ length: 24 }, (_, i) => {
          const x0 = 150 + (i * 780) / 24;
          return <line key={i} x1={x0} x2={x0 + 14} y1={598} y2={598} stroke={CIANO} strokeOpacity={0.3 * sat} strokeWidth={1} />;
        })}
        <SateliteAQUA x={sx} y={598} p={sat} escala={1.8} />
        <FocoNaoIncendio grade={grade} fogo={fogo} pixels={pixels} f={f} />
      </svg>
      <div style={{ position: "absolute", top: 492, left: sx + 80, fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: CIANO, opacity: aqua }}>AQUA</div>
      <div style={{ position: "absolute", top: 532, left: sx + 80, fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: aqua }}>SATÉLITE DE REFERÊNCIA</div>
      <Tag texto="1 FOCO ≠ ÁREA QUEIMADA" top={1262} o={entre(f, M.area - 3, M.area + 3)} />
    </AbsoluteFill>
  );
};

// --- fogo: a mesma barra, duas réguas ----------------------------------------------------------
// Cada linha é a sua própria escala: a média de 2019 a 2025 fica sempre no mesmo x (X_MEDIA), a
// barra laranja é 2026 e a marca de 2025 cai onde 2025 cai nessa escala. Marca branca = média;
// marca ciano = 2025.
type Id = "amazonia" | "cerrado" | "caatinga" | "para" | "ceara";
const RAZAO_MAX = Math.max(...(["amazonia", "cerrado", "caatinga", "para", "ceara"] as Id[]).flatMap((k) => [A[k].n2026 / A[k].media, A[k].anos["2025"] / A[k].media]));
const ESCALA = Math.min(0.6, 0.86 / RAZAO_MAX); // fração da largura que vale a média
const xDe = (k: Id, v: number) => X0 + ESCALA * (X1 - X0) * (v / A[k].media);
const ALT = 52;

/** Marca vertical tracejada sobre a linha, com o nome embaixo. */
const Marca: React.FC<{ x: number; y: number; cor: string; texto: string; o?: number }> = ({ x, y, cor, texto, o = 1 }) =>
  o <= 0 ? null : (
    <g opacity={o}>
      <line x1={x} x2={x} y1={y - 34} y2={y + ALT + 2} stroke={cor} strokeWidth={3} strokeDasharray="9 7" />
      <text x={x} y={y + ALT + 32} textAnchor="middle" fill={cor} fontFamily={MONO} fontSize={22} letterSpacing={2}>{texto}</text>
    </g>
  );

const BarraFogo: React.FC<{ k: Id; y: number; p: number; f: number; outubro?: number; filtro: string }> = ({ k, y, p, f, outubro = 0, filtro }) => {
  const r = A[k];
  const w = (xDe(k, r.n2026) - X0) * p;
  // No Pará, o mês de outubro se separa do resto do ano: Jan–Set apaga um pouco, outubro acende.
  const wOut = k === "para" ? (xDe(k, D.para.out2026) - X0) * p : 0;
  return (
    <g>
      <rect x={X0} y={y} width={X1 - X0} height={ALT} fill={TEXTO_2} fillOpacity={0.07} />
      {w > 0 && (
        <>
          <rect x={X0} y={y} width={w} height={ALT} fill={LARANJA} opacity={0.4} filter={`url(#${filtro})`} />
          <rect x={X0} y={y} width={w - wOut * outubro} height={ALT} fill={LARANJA} opacity={1 - 0.55 * outubro} />
          {outubro > 0 && <rect x={X0 + w - wOut} y={y} width={wOut} height={ALT} fill={LARANJA} stroke={TEXTO} strokeWidth={2 * outubro} />}
          <Chama x={X0 + w + 24} y={y + 24} escala={1.2} f={f + y} opacidade={p > 0.6 ? 1 : 0} />
        </>
      )}
    </g>
  );
};

const LINHAS_BIOMAS: { k: Id; y: number; de: number }[] = [
  { k: "amazonia", y: 540, de: M.amazonia },
  { k: "cerrado", y: 760, de: M.cerrado2 },
  { k: "caatinga", y: 980, de: M.caatinga },
];

const Biomas: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.biomas - 2, F.estados + 2, 8);
  if (o <= 0) return null;
  const tr = entre(f, T.troca.de, T.troca.ate, ioCubico); // 0 = régua da média, 1 = régua de 2025
  const flip = Math.abs(Math.cos(Math.PI * tr)); // o rótulo vira de lado no meio da troca
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda={tr < 0.5 ? "2026 × MÉDIA 2019–2025" : "2026 × 2025"} direita="JAN–OUT · AQUA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <NeonDefs />
        <defs><FiltroNeon id="neonBarra" desvio={7} /></defs>
        {LINHAS_BIOMAS.map((l) => {
          const r = A[l.k];
          const p = entre(f, l.de - 4, l.de + 20, saida);
          const acende = entre(f, l.de - 6, l.de);
          const marcaMedia = entre(f, F.biomas + 4, F.biomas + 16);
          const xRef = xDe(l.k, r.media + (r.anos["2025"] - r.media) * tr);
          const v = tr < 0.5 ? r.varPct : r.vs2025;
          return (
            <g key={l.k} opacity={0.35 + 0.65 * acende}>
              <text x={X0} y={l.y - 40} fill={TEXTO} fontFamily={SORA} fontSize={46} fontWeight={300}>{r.nome}</text>
              <BarraFogo k={l.k} y={l.y - 16} p={p} f={f} filtro="neonBarra" />
              <Marca x={xRef} y={l.y - 16} cor={tr < 0.5 ? TEXTO : CIANO} texto={tr < 0.5 ? "MÉDIA" : "2025"} o={marcaMedia} />
              <g transform={`translate(${X1} ${l.y - 40}) scale(1 ${flip})`} opacity={entre(f, l.de + 4, l.de + 12)}>
                <text x={0} y={0} textAnchor="end" fill={tr < 0.5 ? TEXTO : CIANO} fontFamily={MONO} fontSize={50}>{pct(v)}</text>
              </g>
              <text x={X1} y={l.y + 104} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2} opacity={entre(f, l.de + 8, l.de + 16)}>
                2026: {milhar(r.n2026)} · {tr < 0.5 ? `MÉDIA: ${milhar(r.media)}` : `2025: ${milhar(r.anos["2025"])}`}
              </text>
            </g>
          );
        })}
      </svg>
      <Heroi o={entre(f, M.r70 - 3, M.r70 + 2)} top={1190}>
        <Grande tam={92} cor={CIANO}>+{Math.round(A.amazonia.vs2025)}% SOBRE 2025</Grande>
        <Rotulo>AMAZÔNIA · 2025 FOI O MENOR DOS OITO ANOS</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

const LINHAS_ESTADOS: { k: Id; y: number; de: number }[] = [
  { k: "para", y: 600, de: M.para },
  { k: "ceara", y: 930, de: M.ceara },
];

const Estados: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.estados - 2, F.virada + 2, 8);
  if (o <= 0) return null;
  const outubro = entre(f, M.outubro - 4, M.outubro + 6);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="AS DUAS RÉGUAS" direita="JAN–OUT · AQUA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <NeonDefs />
        <defs><FiltroNeon id="neonEst" desvio={7} /></defs>
        {LINHAS_ESTADOS.map((l) => {
          const r = A[l.k];
          const p = entre(f, l.de - 6, l.de + 18, saida);
          const acende = entre(f, l.de - 6, l.de);
          const marcas = entre(f, l.de + 2, l.de + 12);
          return (
            <g key={l.k} opacity={0.35 + 0.65 * Math.max(acende, l.k === "para" ? 1 - entre(f, M.ceara - 6, M.ceara) * 0.5 : 0)}>
              <text x={X0} y={l.y - 46} fill={TEXTO} fontFamily={SORA} fontSize={46} fontWeight={300}>{r.nome}</text>
              <BarraFogo k={l.k} y={l.y - 16} p={p} f={f} outubro={l.k === "para" ? outubro : 0} filtro="neonEst" />
              <Marca x={xDe(l.k, r.media)} y={l.y - 16} cor={TEXTO} texto="MÉDIA" o={marcas} />
              <Marca x={xDe(l.k, r.anos["2025"])} y={l.y - 16} cor={CIANO} texto="2025" o={marcas} />
              <g fontFamily={MONO} fontSize={26} letterSpacing={1} opacity={marcas}>
                <text x={X1} y={l.y - 76} textAnchor="end" fill={TEXTO}>{pct(r.varPct)} DA MÉDIA</text>
                <text x={X1} y={l.y - 44} textAnchor="end" fill={CIANO}>{pct(r.vs2025)} SOBRE 2025</text>
              </g>
              <text x={X0} y={l.y + 112} fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2} opacity={marcas}>
                2026: {milhar(r.n2026)} · MÉDIA: {milhar(r.media)} · 2025: {milhar(r.anos["2025"])}
              </text>
            </g>
          );
        })}
        {/* rótulo do pedaço de outubro, em cima da barra do Pará */}
        <text x={xDe("para", A.para.n2026) - (xDe("para", D.para.out2026) - X0) / 2} y={LINHAS_ESTADOS[0].y + 70} textAnchor="middle"
          fill={TEXTO} fontFamily={MONO} fontSize={22} letterSpacing={2} opacity={outubro * (1 - entre(f, M.ceara - 6, M.ceara))}>OUTUBRO</text>
      </svg>
      <Heroi o={janela(f, M.outubro - 2, M.ceara - 2, 6)} top={1170}>
        <Grande tam={96}>{milhar(D.para.out2026)} FOCOS</Grande>
        <Rotulo cor={TEXTO}>PARÁ, SÓ EM OUTUBRO: {Math.round(D.para.parteOutubro)}% DE JAN–OUT</Rotulo>
        <div style={{ opacity: entre(f, M.serie - 4, M.serie + 2) }}>
          <Rotulo>MAIOR OUTUBRO DESDE 2003 · ANTES: {milhar(D.para.recordeAntes.focos)} ({D.para.recordeAntes.ano})</Rotulo>
        </div>
      </Heroi>
      <Heroi o={entre(f, M.ceara + 2, M.ceara + 8)} top={1190}>
        <Grande tam={80} cor={TEXTO}>PERTO DA MÉDIA</Grande>
        <Rotulo>CEARÁ · AQUA {pct(A.ceara.varPct)} · NOAA-20 {pct(N.ceara.varPct)}</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- virada: períodos diferentes, coisas diferentes ------------------------------------------------
// Régua de ago/2025 a out/2026: o PRODES 2026 vai de agosto a julho, então outubro de 2026 fica de
// fora; a nossa conta de fogo vai de janeiro a outubro.
const MESES_REGUA = ["AGO", "SET", "OUT", "NOV", "DEZ", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT"];
const xMes = (i: number) => X0 + ((X1 - X0) * i) / MESES_REGUA.length;
const CEL_MES = (X1 - X0) / MESES_REGUA.length;

const Virada: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.virada - 2, F.pergunta + 2, 8);
  if (o <= 0) return null;
  const regua = entre(f, F.virada, F.virada + 18, ioCubico);
  const prodes = entre(f, M.prodes - 2, M.julho + 4, ioCubico);
  const fogo = entre(f, M.outubro2 - 10, M.outubro2 + 8, ioCubico);
  const out = entre(f, M.outubro2 - 2, M.outubro2 + 6);
  const fora = entre(f, M.fora - 4, M.fora + 6);
  const tQ = entre(f, M.queimada - 6, M.queimada + 2), tD = entre(f, M.desmat - 4, M.desmat + 4);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="DOIS INSTRUMENTOS" direita="DOIS PERÍODOS" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <NeonDefs />
        <defs><FiltroNeon id="neonRegua" /></defs>
        <line x1={X0} x2={X0 + (X1 - X0) * regua} y1={780} y2={780} stroke={TEXTO_2} strokeWidth={2} />
        {MESES_REGUA.map((m, i) => (
          <g key={i} opacity={entre(f, F.virada + i, F.virada + i + 6)}>
            <line x1={xMes(i)} x2={xMes(i)} y1={772} y2={788} stroke={TEXTO_2} strokeWidth={2} />
            {(i === 0 || i === 5 || i === 11 || i === 14) && (
              <text x={xMes(i) + CEL_MES / 2} y={830} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={1}>
                {m}/{i < 5 ? 25 : 26}
              </text>
            )}
          </g>
        ))}
        <line x1={X1} x2={X1} y1={772} y2={788} stroke={TEXTO_2} strokeWidth={2} opacity={regua} />
        {/* PRODES 2026: ago/2025 a jul/2026 */}
        <rect x={xMes(0)} y={640} width={(xMes(12) - xMes(0)) * prodes} height={100} fill={CIANO} fillOpacity={0.14} />
        {prodes > 0 && (
          <Neon filtro="neonRegua" cor={CIANO} largura={3}>
            <path d={`M${xMes(0)},640 H${xMes(0) + (xMes(12) - xMes(0)) * prodes}`} />
          </Neon>
        )}
        <text x={xMes(0) + 16} y={704} fill={CIANO} fontFamily={MONO} fontSize={32} letterSpacing={2} opacity={prodes}>PRODES 2026</text>
        {/* Focos: jan a out de 2026, com outubro aceso */}
        <rect x={xMes(5)} y={870} width={(xMes(15) - xMes(5)) * fogo} height={100} fill={LARANJA} fillOpacity={0.16} />
        {fogo > 0 && (
          <Neon filtro="neonRegua" cor={LARANJA} largura={3}>
            <path d={`M${xMes(5)},970 H${xMes(5) + (xMes(15) - xMes(5)) * fogo}`} />
          </Neon>
        )}
        <text x={xMes(5) + 16} y={934} fill={LARANJA} fontFamily={MONO} fontSize={30} letterSpacing={2} opacity={fogo}>FOCOS JAN–OUT</text>
        <rect x={xMes(14) + 3} y={873} width={CEL_MES - 6} height={94} fill={LARANJA} opacity={0.85 * out} />
        <Chama x={xMes(14) + CEL_MES / 2} y={736} escala={1.2} f={f} opacidade={out} />
        {/* outubro de 2026: fora do PRODES 2026 */}
        <g opacity={fora}>
          <path d={`M${xMes(12)},630 V1000`} stroke={CIANO} strokeWidth={2} strokeDasharray="8 8" />
          <text x={(xMes(12) + X1) / 2} y={1040} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={24} letterSpacing={1}>FORA DO</text>
          <text x={(xMes(12) + X1) / 2} y={1070} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={24} letterSpacing={1}>PRODES 2026</text>
        </g>
      </svg>
      <Heroi o={tQ} top={1150}>
        <Grande tam={58} cor={TEXTO}>NEM TODA ÁREA QUEIMADA</Grande>
        <div style={{ opacity: tD }}><Grande tam={58} cor={CIANO}>VIRA DESMATAMENTO</Grande></div>
        <Rotulo>SEGUNDO O INPE · NOTA DE 16/10</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- pergunta: a mesma barra, as duas réguas --------------------------------------------------------
const PX0 = 170, PL = 700, PY = 1180;
const pX = (v: number) => PX0 + (PL * v) / A.amazonia.media;

const Pergunta: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.pergunta - 2, FIM - 4, 8);
  if (o <= 0) return null;
  const r = A.amazonia;
  const p = entre(f, F.pergunta, F.pergunta + 16, saida);
  const mM = entre(f, F.pergunta + 6, F.pergunta + 14), m25 = entre(f, F.pergunta + 12, F.pergunta + 20);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="AMAZÔNIA · JAN–OUT 2026" direita="DUAS RÉGUAS" />
      <div style={{ position: "absolute", top: 700, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 40, letterSpacing: 4, color: TEXTO, opacity: janela(f, F.pergunta, G0 + 2, 6) }}>
        A MESMA BARRA,<br />DUAS RÉGUAS
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <NeonDefs />
        <defs><FiltroNeon id="neonPerg" desvio={7} /></defs>
        <rect x={PX0} y={PY} width={(pX(r.n2026) - PX0) * p} height={ALT} fill={LARANJA} opacity={0.4} filter="url(#neonPerg)" />
        <rect x={PX0} y={PY} width={(pX(r.n2026) - PX0) * p} height={ALT} fill={LARANJA} />
        <Chama x={pX(r.n2026) + 24} y={PY + 24} escala={1.2} f={f} opacidade={p > 0.6 ? 1 : 0} />
        <g opacity={m25}>
          <line x1={pX(r.anos["2025"])} x2={pX(r.anos["2025"])} y1={PY - 40} y2={PY + ALT + 4} stroke={CIANO} strokeWidth={3} strokeDasharray="9 7" />
          <text x={pX(r.anos["2025"])} y={PY - 54} textAnchor="middle" fill={CIANO} fontFamily={MONO} fontSize={30}>2025: {pct(r.vs2025)}</text>
        </g>
        <g opacity={mM}>
          <line x1={pX(r.media)} x2={pX(r.media)} y1={PY - 4} y2={PY + ALT + 40} stroke={TEXTO} strokeWidth={3} strokeDasharray="9 7" />
          <text x={pX(r.media)} y={PY + ALT + 80} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={30}>MÉDIA: {pct(r.varPct)}</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** A pergunta do fim, grande, palavra por palavra. */
const PerguntaFinal: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, G0 - 4, G0 + 2) * (1 - entre(f, FIM - 8, FIM));
  if (o <= 0) return null;
  const nl = Math.max(...T.grande.map((w) => w.l)) + 1;
  const linhas = Array.from({ length: nl }, (_, l) => T.grande.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top: 520, left: 90, width: 900, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 100, lineHeight: 1.12, letterSpacing: -1, color: TEXTO,
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
      <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO }}>SEGUE O CIÊNCIA VISUAL</div>
    </div>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/fogo-cop/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/fogo-cop/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const FogoCop: React.FC = () => (
  <Fundo>
    <Desmatamento />
    <Foco />
    <Biomas />
    <Estados />
    <Virada />
    <Pergunta />
    <PerguntaFinal />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-fogo-cop.mjs: plic nos quadrados, crepitar nas barras, whoosh nas trocas */}
    <Audio src={staticFile("ciencia/fogo-cop/trilha.mp3")} volume={0.28} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
export const FogoCopCapa: React.FC = () => {
  const am = PR.amazonia;
  return (
    <Fundo>
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2 }}>
        AMAZÔNIA · INPE · 2026
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonCapa" desvio={6} /></defs>
        <Pilha x={X_SO} km={am.atual} anterior={am.anterior} filtro="neonCapa" />
        <text x={540} y={BASE_Y + 50} textAnchor="middle" fill={CIANO} fontFamily={MONO} fontSize={36} letterSpacing={3}>{milhar(am.atual)} KM² · −{Math.round(100 * (1 - am.atual / am.anterior))}%</text>
      </svg>
      <div style={{
        position: "absolute", top: 1130, left: 90, width: 900, textAlign: "center",
        fontFamily: SORA, fontWeight: 300, fontSize: 110, lineHeight: 1.08, letterSpacing: -1.5, color: TEXTO,
        textShadow: "0 0 30px rgba(5,7,12,0.95)",
      }}>
        Desmatamento <span style={{ color: CIANO }}>caiu</span>.<br />E o <span style={{ color: LARANJA }}>fogo</span>?
      </div>
    </Fundo>
  );
};
