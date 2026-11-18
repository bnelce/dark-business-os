import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./salario-cesta.json";
import T from "./salario-cesta-tempos.json";
import { Fundo, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon, traco } from "./ilustra-dolar";
import { AssinaturaCta } from "./marca";

// "O mínimo bateu recorde e compra menos comida que em 2017" (29/10/2026). Descontada a
// inflação (INPC), o salário mínimo de hoje vale 3 vezes o do começo de 1995 e o recorde é
// jan/2026; mas a cesta básica de SP, também descontada a inflação, saiu de perto de 570
// (1995–2011) para 918 reais. Em cestas por mínimo: 1,02 (1995), 2,16 (2017, o melhor ano),
// 1,59 (2022, o menor desde 2004), 1,79 (2026). Arroz no menor custo em minutos de trabalho
// (36 min/kg), carne em 7h23 (5h36 em 2018). O maior aumento real é de 1995; o melhor ano em
// cestas, 2017.
//
// Embalagem (viralizacao.md, seção 8, a mesma do BrasilMiniatura): o quadro 0 já tem a pilha
// de cestas de 2026 descendo e o "1,79 CESTAS" com o "2,16" riscado; palco de dados no meio e
// todo texto no terço de baixo (y 1170–1550); legenda sincronizada com a voz, 2 a 4 palavras,
// chave em laranja; algo muda a cada 2 a 4s; números digitados com tique; uma pergunta abre a
// segunda metade; o fim volta pra pilha descendo, que emenda no quadro 0.
//
// Números: salario-cesta.json (scripts/gerar-salario.mjs, que confere cada número da fala).
// Tempos: salario-cesta-tempos.json (scripts/tempos-salario.mjs). A trilha
// (scripts/gerar-trilha-salario.mjs) lê os mesmos tempos.
// Neutralidade: os mandatos aparecem só como faixas de data, todas com o mesmo cinza; nenhum
// nome, nenhuma causa, nenhum adjetivo. Laranja é só o foco de cada cena.

export const SALARIO_TOTAL = T.total;
const F = T.fala;
const M = T.m;

const br = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");
const mil = (n: number) => Math.round(n).toLocaleString("pt-BR");
const CONTORNO = { stroke: FUNDO, strokeWidth: 8, paintOrder: "stroke" as const };
const STATUS_TOP = 330;
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const limita = (v: number) => Math.min(1, Math.max(0, v));
const ioCubico = Easing.inOut(Easing.cubic);
const GF = T.grande.filter((w) => w.g === "final");
const GP = T.grande.filter((w) => w.g === "pergunta");
const G0 = GF[0].f; // primeira palavra da pergunta final
const FIM = T.total - T.loop.fim; // o gancho volta

/** Câmera: escala `s` em volta de P, levando P até `alvo` quando s chega em `sMax`. */
const camera = (s: number, sMax: number, P: [number, number], alvo: [number, number]) => {
  const k = sMax === 1 ? 0 : (s - 1) / (sMax - 1);
  const C = [P[0] + (alvo[0] - P[0]) * k, P[1] + (alvo[1] - P[1]) * k];
  return `translate(${C[0]} ${C[1]}) scale(${s}) translate(${-P[0]} ${-P[1]})`;
};

const naTela = (s: number, sMax: number, P: [number, number], alvo: [number, number], x: number, y: number): [number, number] => {
  const k = sMax === 1 ? 0 : (s - 1) / (sMax - 1);
  const C = [P[0] + (alvo[0] - P[0]) * k, P[1] + (alvo[1] - P[1]) * k];
  return [C[0] + s * (x - P[0]), C[1] + s * (y - P[1])];
};

const digitado = (id: string, f: number) => {
  const d = T.digita.find((x) => x.id === id)!;
  if (f < d.de) return "";
  const passo = (d.ate - d.de) / d.texto.length;
  return d.texto.slice(0, Math.min(d.texto.length, Math.floor((f - d.de) / passo) + 1));
};

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
    <div style={{ position: "absolute", top, left: X0, width: 820, opacity: o, fontFamily: MONO, color: TEXTO, textAlign: "center", whiteSpace: "pre" }}>{children}</div>
  );

const Rotulo: React.FC<{ children: React.ReactNode; cor?: string }> = ({ children, cor = TEXTO_2 }) => (
  <div style={{ fontSize: 24, letterSpacing: 3, color: cor, marginTop: 8 }}>{children}</div>
);

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  const texto =
    f >= F.real && f < F.cesta ? "FONTE: BCB SGS 1619 · IBGE, INPC"
      : f >= F.relogio && f < F.historia ? "FONTE: DIEESE, PREÇOS EM SP · BCB SGS 1619"
        : "FONTE: DIEESE, CESTA BÁSICA · BCB SGS 1619 · IBGE, INPC";
  return (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>
      {texto}
    </div>
  );
};

// --- eixo do tempo comum: 1995 a 2026, e as faixas de mandato (só datas, o mesmo cinza) ------
const N_ANOS = D.anos.length; // 32
const LA = (X1 - X0) / N_ANOS;
const xMes = (i: number) => X0 + (i / 12) * LA; // i = meses desde jan/1995
const xData = (ym: string) => xMes((+ym.slice(0, 4) - 1995) * 12 + (+ym.slice(5, 7) - 1));
const xAno = (k: number) => X0 + (k + 0.5) * LA; // k = índice do ano (0 = 1995)
const FAIXAS = D.faixas.map((fx) => ({ x0: xData(fx.de), x1: xData(fx.ate) + LA / 12, rot: fx.de.slice(2, 4) }));

/** As 9 faixas de mandato: mesmo cinza, separadas por um vão, com o ano de início (2 dígitos). */
const Faixas: React.FC<{ y0: number; y1: number; o: number; rotulos?: number }> = ({ y0, y1, o, rotulos = 1 }) => (
  <g opacity={o}>
    {FAIXAS.map((fx, k) => (
      <g key={k}>
        <rect x={fx.x0 + 1.5} y={y0} width={fx.x1 - fx.x0 - 3} height={y1 - y0} fill={TEXTO_2} fillOpacity={0.1} />
        {rotulos > 0 && <text x={(fx.x0 + fx.x1) / 2} y={y0 + 26} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={19} opacity={rotulos}>{fx.rot}</text>}
      </g>
    ))}
  </g>
);

const NotaFaixas: React.FC<{ y: number; o: number }> = ({ y, o }) => (
  <text x={540} y={y} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={20} letterSpacing={2} opacity={o}>
    FAIXAS CINZA: MANDATOS PRESIDENCIAIS (ANO DE INÍCIO)
  </text>
);

const AnosEixo: React.FC<{ y: number; o: number }> = ({ y, o }) => (
  <g opacity={o} fontFamily={MONO} fontSize={24} fill={TEXTO_2}>
    <text x={X0} y={y}>1995</text>
    <text x={X1} y={y} textAnchor="end">2026</text>
  </g>
);

// --- a pilha de cestas (gancho e fim) -----------------------------------------------------------
const C17 = D.cestas.sp[22], C26 = D.cestas.sp[31];
const UH = 175, BW = 262, BH = 150;
/** Uma cesta em traço fino: corpo trapezoidal, trama e alça baixa. `fr` corta de cima (0 a 1). */
const Cesta: React.FC<{ x: number; yBase: number; fr: number; cor: string; id: string }> = ({ x, yBase, fr, cor, id }) => {
  if (fr <= 0) return null;
  const top = yBase - BH;
  return (
    <g>
      <defs><clipPath id={id}><rect x={x - BW} y={yBase - (BH + 20) * fr} width={BW * 2} height={(BH + 20) * fr + 4} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <Neon filtro="neonG" cor={cor} largura={2.6}>
          <path d={`M${x - BW / 2},${top + 0.14 * BH} L${x + BW / 2},${top + 0.14 * BH} L${x + BW / 2 - 0.1 * BW},${yBase} L${x - BW / 2 + 0.1 * BW},${yBase} Z`} />
          <path d={`M${x - BW / 2 + 0.03 * BW},${top + 0.41 * BH} L${x + BW / 2 - 0.03 * BW},${top + 0.41 * BH} M${x - BW / 2 + 0.065 * BW},${top + 0.66 * BH} L${x + BW / 2 - 0.065 * BW},${top + 0.66 * BH}`} strokeOpacity={0.55} />
          {[-2, -1, 0, 1, 2].map((k) => <line key={k} x1={x + k * 0.165 * BW} x2={x + k * 0.143 * BW} y1={top + 0.14 * BH} y2={yBase} strokeOpacity={0.4} />)}
          <path d={`M${x - BW / 2 + 0.13 * BW},${top + 0.14 * BH} Q${x},${top - 0.23 * BH} ${x + BW / 2 - 0.13 * BW},${top + 0.14 * BH}`} />
        </Neon>
      </g>
    </g>
  );
};
const Pilha: React.FC<{ x: number; v: number; cor: string; id: string; yBase?: number }> = ({ x, v, cor, id, yBase = 1080 }) => (
  <g>
    {[0, 1, 2].map((k) => <Cesta key={k} id={`${id}${k}`} x={x} yBase={yBase - k * UH} fr={limita(v - k)} cor={cor} />)}
  </g>
);

/** Progresso do loop no instante τ (quadros): uma curva só de τ = −fim até τ = +inicio. */
const loopP = (tau: number) => ioCubico(limita((tau + T.loop.fim) / (T.loop.fim + T.loop.inicio)));

const Gancho: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM - 6;
  const noGancho = f < F.real + 6;
  if (!noFim && !noGancho) return null;
  const o = noFim ? entre(f, FIM - 6, FIM + 6) : 1 - entre(f, F.real - 4, F.real + 4);
  const u = noFim ? loopP(f - T.total) : loopP(f);
  const v26 = C17 - (C17 - C26) * u;
  const hero = noFim ? entre(f, T.total - 34, T.total - 20) : 1;
  const pulso = noFim ? 0 : mola(f, M.recorde - 2, { damping: 9, stiffness: 220 }) * (1 - entre(f, M.recorde + 4, M.recorde + 16));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="CESTAS POR SALÁRIO MÍNIMO" direita="SÃO PAULO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonG" desvio={5} /></defs>
        <line x1={X0} x2={X1} y1={1084} y2={1084} stroke={TEXTO_2} strokeOpacity={0.4} />
        {[1, 2].map((k) => (
          <g key={k}>
            <line x1={X0} x2={X1} y1={1080 - k * UH + 6} y2={1080 - k * UH + 6} stroke={TEXTO_2} strokeOpacity={0.18} strokeDasharray="4 8" />
            <text x={X0} y={1080 - k * UH - 2} fill={TEXTO_2} fontFamily={MONO} fontSize={22}>{k}</text>
          </g>
        ))}
        <Pilha x={330} v={C17} cor={TEXTO} id="p17" />
        <Pilha x={750} v={v26} cor={LARANJA} id="p26" />
        <line x1={750} x2={750} y1={1080 - C17 * UH} y2={1080 - v26 * UH} stroke={LARANJA} strokeWidth={2} strokeDasharray="4 6" opacity={0.7 * (v26 < C17 - 0.01 ? 1 : 0)} />
        <g fontFamily={MONO} fontSize={30} letterSpacing={2}>
          <text x={330} y={1080 - C17 * UH - 70} textAnchor="middle" fill={TEXTO}>2017</text>
          <text x={750} y={1080 - C17 * UH - 70} textAnchor="middle" fill={LARANJA}>2026</text>
        </g>
      </svg>
      <Heroi o={hero} top={1172}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 22 }}>
          <span style={{ fontSize: 132, lineHeight: 1, color: LARANJA, textShadow: `0 0 34px ${LARANJA}66`, scale: `${1 + 0.06 * pulso}` }}>{br(C26, 2)}</span>
          <span style={{ fontSize: 52, color: TEXTO, letterSpacing: 2 }}>CESTAS</span>
          <span style={{ position: "relative", fontSize: 76, color: TEXTO_2 }}>
            {br(C17, 2)}
            <span style={{ position: "absolute", left: -6, top: "52%", height: 6, width: `${(100 + 12) * u}%`, background: LARANJA, rotate: "-8deg", transformOrigin: "left center" }} />
          </span>
        </div>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- salário mínimo real, mês a mês -------------------------------------------------------------
const YB = 1040, HT = 500;
const SM = D.sm.mensal;
const yR = (v: number) => YB - (v / 1800) * HT;
const caminhoSM = SM.map((v, i) => `${i ? "L" : "M"}${xMes(i).toFixed(1)},${yR(v).toFixed(1)}`).join("");
const S_REAL = 1.9;

const Real: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.real - 2, F.cesta + 2, 6);
  if (o <= 0) return null;
  const eixos = entre(f, F.real - 2, F.real + 10);
  const linha = entre(f, F.real + 2, M.hoje, Easing.inOut(Easing.quad));
  // "o mínimo de hoje": punch-in no fim da linha; "três vezes": volta pra ver as duas pontas
  const s = 1 + (S_REAL - 1) * mola(f, M.hoje - 6, { damping: 16, stiffness: 120 }) * (1 - entre(f, M.tres - 4, M.tres + 10, ioCubico));
  const P: [number, number] = [xMes(SM.length - 1), yR(D.sm.fim)], ALVO: [number, number] = [760, 640];
  const rec = entre(f, M.hoje - 4, M.hoje + 6);
  const ini = entre(f, M.r1995 - 8, M.r1995 + 2);
  const chave = entre(f, M.tres - 2, M.tres + 8);
  const xR = xMes(D.sm.iRecorde), xF = xMes(SM.length - 1), x0 = xMes(0);
  const [rx, ry] = naTela(s, S_REAL, P, ALVO, xR, yR(D.sm.recorde));
  const [fx, fy] = naTela(s, S_REAL, P, ALVO, xF, yR(D.sm.fim));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="SALÁRIO MÍNIMO SEM INFLAÇÃO" direita="INPC" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <FiltroNeon id="neonR" />
          <clipPath id="palcoR"><rect x={0} y={400} width={1080} height={760} /></clipPath>
        </defs>
        <g clipPath="url(#palcoR)">
          <g transform={camera(s, S_REAL, P, ALVO)}>
            <Faixas y0={YB - HT - 20} y1={YB} o={eixos} rotulos={1 - entre(s, 1.03, 1.15)} />
            {[500, 1000, 1500].map((v) => (
              <g key={v} opacity={eixos}>
                <line x1={X0} x2={X1} y1={yR(v)} y2={yR(v)} stroke={TEXTO_2} strokeOpacity={0.18} strokeDasharray="4 8" vectorEffect="non-scaling-stroke" />
                <text x={X0 - 12} y={yR(v) + 8} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={20}>{mil(v)}</text>
              </g>
            ))}
            <line x1={X0} x2={X1} y1={YB} y2={YB} stroke={TEXTO_2} strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />
            <Neon filtro="neonR" cor={CIANO} largura={2.6 / Math.sqrt(s)}><path d={caminhoSM} {...traco(linha)} /></Neon>
            <g opacity={rec}>
              <circle cx={xR} cy={yR(D.sm.recorde)} r={9 / Math.sqrt(s)} fill={LARANJA} />
              <circle cx={xF} cy={yR(D.sm.fim)} r={7 / Math.sqrt(s)} fill={TEXTO} />
            </g>
          </g>
        </g>
        {/* rótulos fora da câmera, sempre do mesmo tamanho, presos ao ponto na tela */}
        <g opacity={rec * entre(s, 1.3, 1.7)} fontFamily={MONO}>
          <text x={rx - 24} y={ry - 64} textAnchor="end" fill={LARANJA} fontSize={30} letterSpacing={1} {...CONTORNO}>RECORDE · JAN/2026</text>
          <text x={rx - 24} y={ry - 22} textAnchor="end" fill={LARANJA} fontSize={40} {...CONTORNO}>{br(D.sm.recorde, 2).replace(/^(\d)(\d{3})/, "$1.$2")}</text>
          <text x={fx + 18} y={fy + 14} fill={TEXTO} fontSize={34} {...CONTORNO}>{mil(D.sm.fim)}</text>
          <text x={fx + 18} y={fy + 46} fill={TEXTO_2} fontSize={22} letterSpacing={1} {...CONTORNO}>SET/2026</text>
        </g>
        <g opacity={Math.max(ini, chave)} fontFamily={MONO}>
          <circle cx={x0} cy={yR(D.sm.inicio)} r={8} fill={LARANJA} />
          <text x={x0 + 16} y={yR(D.sm.inicio) + 50} fill={TEXTO} fontSize={30} {...CONTORNO}>JAN/1995 · {mil(D.sm.inicio)}</text>
        </g>
        <NotaFaixas y={YB + 50} o={eixos} />
        <AnosEixo y={YB + 92} o={eixos} />
        <text x={X0} y={470} fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2} opacity={eixos * (1 - entre(s, 1.05, 1.2))}>REAIS DE SET/2026</text>
      </svg>
      <Heroi o={chave}>
        <div style={{ fontSize: 132, lineHeight: 1, color: LARANJA, textShadow: `0 0 30px ${LARANJA}55`, scale: `${1 + 0.05 * mola(f, M.tres, { damping: 9, stiffness: 220 }) * (1 - entre(f, M.tres + 6, M.tres + 16))}` }}>
          {digitado("x3", f) || " "} <span style={{ fontSize: 72 }}>VEZES</span>
        </div>
        <Rotulo>{mil(D.sm.fim)} EM SET/2026 ÷ {mil(D.sm.inicio)} EM JAN/1995</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- cesta de SP, sem inflação, média do ano ------------------------------------------------
const CE = D.cesta.anual;
const yC = (v: number) => YB - (v / 1000) * HT;
const caminhoC = (de: number, ate: number) => CE.slice(de, ate + 1).map((v, i) => `${i ? "L" : "M"}${xAno(de + i).toFixed(1)},${yC(v).toFixed(1)}`).join("");
const I2011 = 16;
const S_CESTA = 1.8;

const Cesta2: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.cesta - 2, F.cestas + 2, 6);
  if (o <= 0) return null;
  const eixos = entre(f, F.cesta - 2, F.cesta + 10);
  const l1 = entre(f, F.cesta + 4, M.c570, Easing.inOut(Easing.quad));
  const media = entre(f, M.c570 - 6, M.c570 + 8);
  const l2 = entre(f, M.c2011 - 4, M.c918, Easing.inOut(Easing.quad));
  const fimP = entre(f, M.c918 - 4, M.c918 + 4);
  const s = 1 + (S_CESTA - 1) * mola(f, M.c918 + 6, { damping: 16, stiffness: 110 });
  const P: [number, number] = [xAno(31), yC(D.cesta.hoje)], ALVO: [number, number] = [700, 700];
  const hero570 = Math.min(entre(f, M.c570 - 2, M.c570 + 2), 1 - entre(f, M.hoje2 - 6, M.hoje2));
  const hero918 = entre(f, M.c918 - 2, M.c918 + 2);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="CESTA BÁSICA DE SÃO PAULO" direita="SEM INFLAÇÃO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <FiltroNeon id="neonC" />
          <clipPath id="palcoC"><rect x={0} y={400} width={1080} height={760} /></clipPath>
        </defs>
        <g clipPath="url(#palcoC)">
          <g transform={camera(s, S_CESTA, P, ALVO)}>
            <Faixas y0={YB - HT - 20} y1={YB} o={eixos} rotulos={1 - entre(s, 1.03, 1.15)} />
            {[250, 500, 750, 1000].map((v) => (
              <g key={v} opacity={eixos}>
                <line x1={X0} x2={X1} y1={yC(v)} y2={yC(v)} stroke={TEXTO_2} strokeOpacity={0.18} strokeDasharray="4 8" vectorEffect="non-scaling-stroke" />
                <text x={X0 - 12} y={yC(v) + 8} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={20}>{mil(v)}</text>
              </g>
            ))}
            <line x1={X0} x2={X1} y1={YB} y2={YB} stroke={TEXTO_2} strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />
            <g opacity={media}>
              <line x1={xAno(0) - 6} x2={xAno(I2011) + 6} y1={yC(D.cesta.media2011)} y2={yC(D.cesta.media2011)} stroke={TEXTO} strokeWidth={2.5} strokeDasharray="8 7" vectorEffect="non-scaling-stroke" />
            </g>
            <Neon filtro="neonC" cor={CIANO} largura={2.6 / Math.sqrt(s)}><path d={caminhoC(0, I2011)} {...traco(l1)} /></Neon>
            <Neon filtro="neonC" cor={LARANJA} largura={2.8 / Math.sqrt(s)}><path d={caminhoC(I2011, 31)} {...traco(l2)} /></Neon>
            <g opacity={entre(l1, 0.9, 1)}>{CE.slice(0, I2011 + 1).map((v, i) => <circle key={i} cx={xAno(i)} cy={yC(v)} r={4.5 / Math.sqrt(s)} fill={CIANO} />)}</g>
            <g opacity={fimP}><circle cx={xAno(31)} cy={yC(D.cesta.hoje)} r={9 / Math.sqrt(s)} fill={LARANJA} /></g>
          </g>
        </g>
        <g opacity={media * (1 - entre(f, M.c918, M.c918 + 8))} fontFamily={MONO}>
          <text x={xAno(4)} y={yC(D.cesta.media2011) - 64} fill={TEXTO} fontSize={30} {...CONTORNO}>~570 ATÉ 2011</text>
        </g>
        <g opacity={entre(s, 1.4, 1.75)} fontFamily={MONO}>
          <text x={ALVO[0] - 28} y={ALVO[1] - 30} textAnchor="end" fill={LARANJA} fontSize={44} {...CONTORNO}>{digitado("c918", f)}</text>
          <text x={ALVO[0] - 28} y={ALVO[1] + 10} textAnchor="end" fill={LARANJA} fontSize={24} letterSpacing={2} {...CONTORNO}>2026 (JAN–SET)</text>
        </g>
        <NotaFaixas y={YB + 50} o={eixos * (1 - entre(s, 1.05, 1.2))} />
        <AnosEixo y={YB + 92} o={eixos * (1 - entre(s, 1.05, 1.2))} />
        <text x={X0} y={470} fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2} opacity={eixos * (1 - entre(s, 1.05, 1.2))}>REAIS DE SET/2026 · MÉDIA DO ANO</text>
      </svg>
      <Heroi o={hero570}>
        <div style={{ fontSize: 120, lineHeight: 1, color: TEXTO }}>~{digitado("c570", f).padEnd(3, " ")} <span style={{ fontSize: 64 }}>REAIS</span></div>
        <Rotulo>MÉDIA DE 1995 A 2011, SEM INFLAÇÃO</Rotulo>
      </Heroi>
      <Heroi o={hero918}>
        <div style={{ fontSize: 132, lineHeight: 1, color: LARANJA, textShadow: `0 0 30px ${LARANJA}55` }}>{digitado("c918", f).padEnd(3, " ")} <span style={{ fontSize: 64 }}>REAIS</span></div>
        <Rotulo>A CESTA DE SP HOJE, SEM INFLAÇÃO</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- cestas por salário mínimo, ano a ano (pilhas de cestas) -----------------------------------
const CS = D.cestas.sp;
const KB = 1040, KU = 150, KW = 17;
const I = { a1995: 0, a2004: 9, a2017: 22, a2022: 27, a2026: 31 };
/** Até que ano as colunas já subiram, no quadro f (acompanha a voz). */
const revela = (f: number) => {
  const pts: [number, number][] = [[M.k1995 - 4, 0], [M.k2017 - 2, I.a2017], [M.k2022 - 2, I.a2022], [M.hoje3 - 2, I.a2026]];
  if (f < pts[0][0]) return -1;
  for (let k = 1; k < pts.length; k++) {
    if (f < pts[k][0]) return pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * ioCubico((f - pts[k - 1][0]) / (pts[k][0] - pts[k - 1][0]));
  }
  return I.a2026;
};
const Colunas: React.FC<{ f: number; ate: number; destaque: (k: number) => string | null; base?: number; unidade?: number; o?: number }> = ({ f, ate, destaque, base = KB, unidade = KU, o = 1 }) => (
  <g opacity={o}>
    {CS.map((v, k) => {
      const p = limita(ate - k + 1);
      if (p <= 0) return null;
      const cor = destaque(k);
      const h = v * ioCubico(p);
      return (
        <g key={k}>
          {[0, 1, 2].map((u) => {
            const fr = limita(h - u);
            if (fr <= 0) return null;
            const y1 = base - u * unidade - 2, y0 = base - (u + fr) * unidade + (fr >= 1 ? 2 : 0);
            return <rect key={u} x={xAno(k) - KW / 2} y={y0} width={KW} height={Math.max(0, y1 - y0)} fill={cor ?? CIANO} fillOpacity={cor ? 0.85 : 0.42} />;
          })}
        </g>
      );
    })}
  </g>
);

const Cestas: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.cestas - 2, F.relogio + 2, 6);
  if (o <= 0) return null;
  const eixos = entre(f, F.cestas - 2, F.cestas + 10);
  const ate = revela(f);
  const naPergunta = entre(f, F.pergunta - 4, F.pergunta + 6);
  const pior = entre(f, M.pior - 4, M.pior + 8);
  const destaque = (k: number) =>
    k === I.a2026 && f >= M.hoje3 - 2 ? LARANJA
      : (k === I.a1995 && f >= M.k1995 && f < M.k2017) || (k === I.a2017 && f >= M.k2017) || (k === I.a2022 && f >= M.k2022) ? TEXTO
        : k === I.a2004 && pior > 0.5 ? TEXTO : null;
  const rot = (k: number, de: number, txt: string, cor: string) => {
    const p = entre(f, de - 2, de + 6);
    return p <= 0 ? null : (
      <text x={xAno(k)} y={KB - CS[k] * KU - 18} textAnchor="middle" fill={cor} fontFamily={MONO} fontSize={30} opacity={p} {...CONTORNO}>{txt}</text>
    );
  };
  const h102 = Math.min(entre(f, M.uma - 2, M.uma + 2), 1 - entre(f, M.k2017 - 2, M.k2017 + 2));
  const h216 = Math.min(entre(f, M.duas - 2, M.duas + 2), 1 - entre(f, M.k2022 - 2, M.k2022 + 2));
  const h159 = Math.min(entre(f, M.k16 - 2, M.k16 + 2), 1 - entre(f, M.hoje3 - 2, M.hoje3 + 2));
  const h179 = Math.min(entre(f, M.k18 - 2, M.k18 + 2), 1 - entre(f, F.pergunta - 4, F.pergunta + 2));
  return (
    <AbsoluteFill style={{ opacity: o * (1 - 0.92 * naPergunta) }}>
      <Status top={STATUS_TOP} esquerda="CESTAS POR SALÁRIO MÍNIMO" direita="SP" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Faixas y0={KB - 2.4 * KU - 50} y1={KB} o={eixos} />
        {[1, 2].map((u) => (
          <g key={u} opacity={eixos}>
            <line x1={X0} x2={X1} y1={KB - u * KU} y2={KB - u * KU} stroke={TEXTO_2} strokeOpacity={0.22} strokeDasharray="4 8" />
            <text x={X0 - 12} y={KB - u * KU + 8} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22}>{u}</text>
          </g>
        ))}
        <line x1={X0} x2={X1} y1={KB} y2={KB} stroke={TEXTO_2} strokeOpacity={0.5} />
        <Colunas f={f} ate={ate} destaque={destaque} />
        {/* "o pior desde 2004": a linha de 2022 só encosta numa coluna mais baixa em 2004 */}
        <g opacity={pior}>
          <line x1={xAno(I.a2004)} x2={xAno(I.a2022)} y1={KB - CS[I.a2022] * KU} y2={KB - CS[I.a2022] * KU} stroke={TEXTO} strokeWidth={2} strokeDasharray="6 6" />
        </g>
        {rot(I.a1995, M.k1995, br(CS[0], 2), TEXTO)}
        {rot(I.a2017, M.k2017, br(CS[I.a2017], 2), TEXTO)}
        {rot(I.a2022, M.k2022, br(CS[I.a2022], 2), TEXTO)}
        {rot(I.a2004, M.k2004, "2004", TEXTO_2)}
        {rot(I.a2026, M.hoje3, br(CS[I.a2026], 2), LARANJA)}
        <NotaFaixas y={KB + 50} o={eixos} />
        <AnosEixo y={KB + 92} o={eixos} />
      </svg>
      <Heroi o={h102}>
        <div style={{ fontSize: 120, lineHeight: 1, color: TEXTO }}>{digitado("k102", f).padEnd(4, " ")} <span style={{ fontSize: 60 }}>CESTA</span></div>
        <Rotulo>1995</Rotulo>
      </Heroi>
      <Heroi o={h216}>
        <div style={{ fontSize: 120, lineHeight: 1, color: TEXTO }}>{digitado("k216", f).padEnd(4, " ")} <span style={{ fontSize: 60 }}>CESTAS</span></div>
        <Rotulo>2017 · O MELHOR ANO DA SÉRIE</Rotulo>
      </Heroi>
      <Heroi o={h159}>
        <div style={{ fontSize: 120, lineHeight: 1, color: TEXTO }}>{digitado("k159", f).padEnd(4, " ")} <span style={{ fontSize: 60 }}>CESTA</span></div>
        <Rotulo>2022 · O MENOR DESDE 2004</Rotulo>
      </Heroi>
      <Heroi o={h179}>
        <div style={{ fontSize: 132, lineHeight: 1, color: LARANJA, textShadow: `0 0 30px ${LARANJA}55` }}>{digitado("k179", f).padEnd(4, " ")} <span style={{ fontSize: 60 }}>CESTA</span></div>
        <Rotulo>2026 (MÉDIA DE JAN A SET)</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- as perguntas grandes, palavra por palavra -----------------------------------------------------
const PerguntaGrande: React.FC<{ ws: typeof T.grande; o: number; top: number; tam: number }> = ({ ws, o, top, tam }) => {
  const f = useCurrentFrame();
  if (o <= 0) return null;
  const nL = Math.max(...ws.map((w) => w.l)) + 1;
  const linhas = Array.from({ length: nL }, (_, l) => ws.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top, left: 90, width: 900, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: tam, lineHeight: 1.14, letterSpacing: -1, color: TEXTO,
      textShadow: "0 0 30px rgba(5,7,12,0.95)",
    }}>
      {linhas.map((l, k) => (
        <div key={k}>
          {l.map((w, i) => {
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

const Perguntas: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <PerguntaGrande ws={GP} o={entre(f, GP[0].f - 4, GP[0].f + 2) * (1 - entre(f, F.relogio - 4, F.relogio + 4))} top={600} tam={124} />
      <PerguntaGrande ws={GF} o={entre(f, G0 - 4, G0 + 2) * (1 - entre(f, FIM - 4, FIM + 8))} top={520} tam={100} />
    </>
  );
};

// --- relógio de trabalho por 1 kg ----------------------------------------------------------------
const MN = D.minutos;
const RC: [number, number] = [540, 650], RR = 175;
const HPX = (X1 - X0) / 8; // 0 a 8 horas
const ponteiro = (ang: number, comp: number) => [RC[0] + comp * Math.sin((ang * Math.PI) / 180), RC[1] - comp * Math.cos((ang * Math.PI) / 180)];
const setor = (ang: number, r: number) => {
  if (ang <= 0.1) return "";
  const a = Math.min(ang, 359.9);
  const [x, y] = ponteiro(a, r);
  return `M${RC[0]},${RC[1]} L${RC[0]},${RC[1] - r} A${r},${r} 0 ${a > 180 ? 1 : 0} 1 ${x},${y} Z`;
};

const Relogio: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.relogio - 2, F.historia + 2, 6);
  if (o <= 0) return null;
  const aparece = entre(f, F.relogio, F.relogio + 12);
  const pA = entre(f, M.arroz + 4, M.m36 + 4, Easing.inOut(Easing.quad)); // arroz: o minuto anda 36
  const pC = entre(f, M.carne - 2, M.m23 + 4, Easing.inOut(Easing.quad)); // carne: a hora anda 7h23
  const p18 = entre(f, M.r2018 - 4, M.h5 + 6);
  const fase = f < M.carne - 4 ? "arroz" : "carne";
  const minA = MN.arroz * pA, minC = MN.carne * pC;
  const minutos = fase === "arroz" ? minA : minC;
  const angMin = (minutos % 60) * 6 + (fase === "carne" ? Math.floor(minutos / 60) * 360 : 0);
  const angHora = fase === "carne" ? (minC / 60) * 30 : (minA / 60) * 30;
  const [mx, my] = ponteiro(angMin, RR - 26);
  const [hx, hy] = ponteiro(angHora, RR - 70);
  const ang18 = (MN.carne2018 / 60) * 30;
  const [gx, gy] = ponteiro(ang18, RR - 10);
  const barA = (MN.arroz / 60) * HPX * pA, barC = (MN.carne / 60) * HPX * pC;
  const h36 = Math.min(entre(f, M.m36 - 2, M.m36 + 2), 1 - entre(f, M.carne - 4, M.carne));
  const h723 = Math.min(entre(f, M.h7 - 2, M.h7 + 2), 1 - entre(f, M.h5 - 4, M.h5));
  const h536 = entre(f, M.h5 - 2, M.h5 + 2);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="TRABALHO POR 1 KG" direita="SÃO PAULO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonRel" desvio={4} /></defs>
        <g opacity={aparece}>
          <Neon filtro="neonRel" cor={CIANO} largura={2}><circle cx={RC[0]} cy={RC[1]} r={RR} /></Neon>
          {Array.from({ length: 60 }, (_, k) => {
            const [x1, y1] = ponteiro(k * 6, RR - (k % 5 ? 10 : 22));
            const [x2, y2] = ponteiro(k * 6, RR - 3);
            return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={k % 5 ? TEXTO_2 : TEXTO} strokeOpacity={k % 5 ? 0.5 : 0.8} strokeWidth={k % 5 ? 1.5 : 2.5} />;
          })}
          {/* setor do tempo: minutos do arroz (ciano), horas da carne (laranja, na volta de 12 h) */}
          {fase === "arroz" ? <path d={setor((minA % 60) * 6, RR - 30)} fill={CIANO} fillOpacity={0.18} />
            : <path d={setor(angHora, RR - 30)} fill={LARANJA} fillOpacity={0.2} />}
          {p18 > 0 && (
            <g opacity={p18}>
              <path d={setor(ang18, RR - 30)} fill="none" stroke={TEXTO} strokeWidth={2} strokeDasharray="6 6" />
              <line x1={RC[0]} y1={RC[1]} x2={gx} y2={gy} stroke={TEXTO} strokeWidth={3} strokeDasharray="6 6" />
            </g>
          )}
          <line x1={RC[0]} y1={RC[1]} x2={hx} y2={hy} stroke={fase === "carne" ? LARANJA : TEXTO} strokeWidth={7} strokeLinecap="round" />
          <line x1={RC[0]} y1={RC[1]} x2={mx} y2={my} stroke={fase === "arroz" ? CIANO : TEXTO} strokeWidth={3.5} strokeLinecap="round" />
          <circle cx={RC[0]} cy={RC[1]} r={8} fill={TEXTO} />
        </g>
        {/* régua de horas: 0 a 8 h */}
        <g opacity={aparece} fontFamily={MONO}>
          {Array.from({ length: 9 }, (_, h) => (
            <g key={h}>
              <line x1={X0 + h * HPX} x2={X0 + h * HPX} y1={890} y2={1080} stroke={TEXTO_2} strokeOpacity={h % 2 ? 0.12 : 0.3} strokeDasharray="3 7" />
              {h % 2 === 0 && <text x={X0 + h * HPX} y={1112} textAnchor="middle" fill={TEXTO_2} fontSize={22}>{h}H</text>}
            </g>
          ))}
          <text x={540} y={1150} textAnchor="middle" fill={TEXTO_2} fontSize={20} letterSpacing={2}>QUEM GANHA 1 SALÁRIO MÍNIMO · JORNADA DE 220 H/MÊS</text>
          <text x={X0} y={912} fill={CIANO} fontSize={26} letterSpacing={2}>ARROZ</text>
          <rect x={X0} y={926} width={Math.max(0, barA)} height={40} fill={CIANO} fillOpacity={0.75} />
          {pA > 0.9 && <text x={X0 + barA + 14} y={958} fill={CIANO} fontSize={30}>36 MIN</text>}
          <text x={X0} y={1012} fill={pC > 0 ? LARANJA : TEXTO_2} fontSize={26} letterSpacing={2}>CARNE DE PRIMEIRA</text>
          <rect x={X0} y={1026} width={Math.max(0, barC)} height={40} fill={LARANJA} fillOpacity={0.8} />
          {p18 > 0 && (
            <g opacity={p18}>
              <line x1={X0 + (MN.carne2018 / 60) * HPX} x2={X0 + (MN.carne2018 / 60) * HPX} y1={1016} y2={1076} stroke={TEXTO} strokeWidth={3} strokeDasharray="5 5" />
              <text x={X0 + (MN.carne2018 / 60) * HPX} y={1004} textAnchor="middle" fill={TEXTO} fontSize={24} {...CONTORNO}>2018</text>
            </g>
          )}
        </g>
      </svg>
      <Heroi o={h36}>
        <div style={{ fontSize: 132, lineHeight: 1, color: CIANO }}>{digitado("m36", f).padEnd(2, " ")} <span style={{ fontSize: 64 }}>MIN</span></div>
        <Rotulo>1 KG DE ARROZ · O MENOR DA SÉRIE (1995–2026)</Rotulo>
      </Heroi>
      <Heroi o={h723}>
        <div style={{ fontSize: 132, lineHeight: 1, color: LARANJA, textShadow: `0 0 30px ${LARANJA}55` }}>{digitado("h723", f).padEnd(4, " ")}</div>
        <Rotulo>1 KG DE CARNE DE PRIMEIRA · 2026</Rotulo>
      </Heroi>
      <Heroi o={h536}>
        <div style={{ fontSize: 132, lineHeight: 1, color: TEXTO }}>{digitado("h536", f).padEnd(4, " ")}</div>
        <Rotulo>A MESMA CARNE EM 2018</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- a série não conta uma história simples: 1995 e 2017 -------------------------------------
const RJ = D.reajustes;
const HB = 712, HK = 7.5; // ganho real: 0 em y 712, 7,5 px por ponto percentual
const CB = 1050, CK = 100; // cestas: 0 em y 1050, 100 px por cesta

const Historia: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.historia - 2, G0 + 4, 6);
  if (o <= 0) return null;
  const sobe = entre(f, F.historia, F.historia + 22, Easing.out(Easing.cubic));
  const l95 = entre(f, M.h1995 - 4, M.h1995 + 4);
  const l17 = entre(f, M.h2017 - 4, M.h2017 + 4);
  const saida = entre(f, G0 - 6, G0 + 6);
  const h226 = Math.min(entre(f, M.h1995 - 2, M.h1995 + 2), 1 - entre(f, M.h2017 - 4, M.h2017));
  const h216 = Math.min(entre(f, M.h2017 - 2, M.h2017 + 2), 1 - entre(f, G0 - 6, G0));
  return (
    <AbsoluteFill style={{ opacity: o * (1 - 0.82 * saida) }}>
      <Status top={STATUS_TOP} esquerda="A MESMA SÉRIE, DUAS RÉGUAS" direita="1995–2026" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Faixas y0={438} y1={CB} o={sobe} />
        <g fontFamily={MONO} opacity={sobe}>
          <text x={X0} y={508} fill={TEXTO} fontSize={24} letterSpacing={2} {...CONTORNO}>GANHO REAL EM CADA REAJUSTE (%)</text>
          <line x1={X0} x2={X1} y1={HB} y2={HB} stroke={TEXTO_2} strokeOpacity={0.5} />
          <text x={X0} y={806} fill={TEXTO} fontSize={24} letterSpacing={2} {...CONTORNO}>CESTAS POR SALÁRIO MÍNIMO</text>
          <line x1={X0} x2={X1} y1={CB} y2={CB} stroke={TEXTO_2} strokeOpacity={0.5} />
        </g>
        {RJ.map((r, k) => {
          const h = r.v * HK * sobe;
          const foco = k === 0 && l95 > 0;
          return <rect key={k} x={xAno(k) - KW / 2} y={h >= 0 ? HB - h : HB} width={KW} height={Math.abs(h)} fill={foco ? LARANJA : CIANO} fillOpacity={foco ? 0.9 : 0.42} />;
        })}
        {CS.map((v, k) => {
          const h = v * CK * sobe;
          const foco = k === I.a2017 && l17 > 0;
          return <rect key={k} x={xAno(k) - KW / 2} y={CB - h} width={KW} height={h} fill={foco ? LARANJA : CIANO} fillOpacity={foco ? 0.9 : 0.42} />;
        })}
        <g fontFamily={MONO}>
          <text x={xAno(0) + 18} y={HB - RJ[0].v * HK + 22} fill={LARANJA} fontSize={30} opacity={l95} {...CONTORNO}>MAIO/1995 · +{br(RJ[0].v)}%</text>
          <text x={xAno(I.a2017)} y={CB - CS[I.a2017] * CK - 16} textAnchor="middle" fill={LARANJA} fontSize={30} opacity={l17} {...CONTORNO}>2017 · {br(CS[I.a2017], 2)}</text>
        </g>
        <NotaFaixas y={CB + 50} o={sobe} />
        <AnosEixo y={CB + 92} o={sobe} />
      </svg>
      <Heroi o={h226}>
        <div style={{ fontSize: 120, lineHeight: 1, color: LARANJA, textShadow: `0 0 30px ${LARANJA}55` }}>{digitado("g226", f).padEnd(6, " ")}</div>
        <Rotulo>MAIO/1995 · O MAIOR AUMENTO REAL DO MÍNIMO</Rotulo>
      </Heroi>
      <Heroi o={h216}>
        <div style={{ fontSize: 120, lineHeight: 1, color: LARANJA, textShadow: `0 0 30px ${LARANJA}55` }}>{digitado("h216", f).padEnd(4, " ")} <span style={{ fontSize: 60 }}>CESTAS</span></div>
        <Rotulo>2017 · O MELHOR ANO EM CESTAS</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- fecho: CTA escrito, pequeno ------------------------------------------------------------
const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, T.cta, T.cta + 8);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 1432, left: 0, width: 1080, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, opacity: o }}>
      <AssinaturaCta />
    </div>
  );
};

// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/salario/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/salario/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const SalarioCesta: React.FC = () => (
  <Fundo>
    <Gancho />
    <Real />
    <Cesta2 />
    <Cestas />
    <Relogio />
    <Historia />
    <Perguntas />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-salario.mjs: riser no loop, whoosh nas trocas, tiques nos números */}
    <Audio src={staticFile("ciencia/trilha-salario.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
export const SalarioCestaCapa: React.FC = () => (
  <Fundo>
    <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2 }}>
      CESTAS POR SALÁRIO MÍNIMO · SP
    </div>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs><FiltroNeon id="neonG" desvio={5} /></defs>
      <g transform="translate(0 -60)">
        <Pilha x={330} v={C17} cor={TEXTO} id="c17" />
        <Pilha x={750} v={C26} cor={LARANJA} id="c26" />
        <g fontFamily={MONO} fontSize={30} letterSpacing={2}>
          <text x={330} y={1080 - C17 * UH - 70} textAnchor="middle" fill={TEXTO}>2017 · {br(C17, 2)}</text>
          <text x={750} y={1080 - C17 * UH - 70} textAnchor="middle" fill={LARANJA}>2026 · {br(C26, 2)}</text>
        </g>
      </g>
    </svg>
    <div style={{
      position: "absolute", top: 1110, left: 90, width: 900, textAlign: "center",
      fontFamily: SORA, fontWeight: 300, fontSize: 112, lineHeight: 1.08, letterSpacing: -1.5, color: TEXTO,
      textShadow: "0 0 30px rgba(5,7,12,0.95)",
    }}>
      Mínimo recorde,<br /><span style={{ color: LARANJA }}>menos comida</span>
    </div>
  </Fundo>
);
