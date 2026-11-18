import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./patrimonio.json";
import T from "./patrimonio-tempos.json";
import { Fundo, entre } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";

// "O patrimônio de quem te representa": bens declarados ao TSE pelos 586 eleitos de 2026 que têm
// resultado na base (505 deputados federais, 54 senadores, 27 governadores; os 8 deputados do Amapá
// ainda estão sem situação no arquivo de 12/11).
//   gancho    62 de 100 eleitos com 1 milhão ou mais × 7 de 100 declarantes do IR (já no quadro 0)
//   mediana   586 eleitos sobre a foto do Congresso; mediana de 1,45 milhão
//   renda     81 anos da renda domiciliar per capita mediana (IBGE), um quadrado por ano
//   aviso     valor declarado ≠ valor de mercado (imóvel entra pelo preço de compra)
//   extremos  os 586 em escada, do menor ao maior, em escala log; o maior com nome e número exato; os 8 sem bens
//   partidos  a mediana dos 20 partidos, todos na mesma cor, ordenados pelo valor
//   reeleitos 289 reeleitos cruzados pelo CPF: 219 declararam mais, 68 menos; +39,4% na mediana; IPCA +19,5%
//   pergunta  os 27 estados, "e os eleitos do teu estado?", e volta pro quadro 0
//
// Números: patrimonio.json (scripts/gerar-patrimonio.mjs, que confere cada número da fala contra a conta).
// Tempos: patrimonio-tempos.json (scripts/tempos-patrimonio.mjs). Nome só no extremo de cima.

export const PATRIMONIO_TOTAL = T.total;
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
const reais = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 4292000 → "4,29 MI"; 171787 → "172 MIL". */
const curto = (v: number) => (v >= 1e6 ? `${br(v / 1e6, 2)} MI` : `${Math.round(v / 1000)} MIL`);

const Etiqueta: React.FC<{ texto: string; o: number; top?: number; cor?: string }> = ({ texto, o, top = 250, cor = TEXTO_2 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: 60, width: 960, textAlign: "center", opacity: o, fontFamily: MONO, fontSize: 28, letterSpacing: 3, color: cor, whiteSpace: "pre-line", lineHeight: 1.4 }}>{texto}</div>
  );

// --- 1. 62 de 100 × 7 de 100 (quadro 0 e o fim, pro loop) ------------------------------------------------
const COL = [290, 790];
const Grade100: React.FC<{ cx: number; top: number; acesos: number; cor: string; f: number; fase: number; passo?: number; r?: number }> = ({ cx, top, acesos, cor, f, fase, passo = 36, r = 12 }) => (
  <>
    {Array.from({ length: 100 }, (_, k) => {
      const ok = k < acesos, x = cx - 4.5 * passo + (k % 10) * passo, y = top + Math.floor(k / 10) * passo;
      const pulso = ok ? 0.6 + 0.4 * Math.max(0, Math.sin(f / 7 - (k % 10) * 0.5 - Math.floor(k / 10) * 0.25 + fase)) : 1;
      return <circle key={k} cx={x} cy={y} r={r} fill={ok ? cor : "none"} fillOpacity={ok ? pulso : 0} stroke={ok ? cor : TEXTO_2} strokeOpacity={ok ? 1 : 0.4} strokeWidth={2} />;
    })}
  </>
);

const Grade: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM;
  const o = noFim ? entre(f, FIM, FIM + 10) : visivel(f, 0, C.grade.ate, 4);
  if (o <= 0) return null;
  const pA = noFim ? 0 : mola(f, M.seis - 2, { damping: 10, stiffness: 220 });
  const pB = noFim ? 0 : mola(f, M.n7 - 2, { damping: 10, stiffness: 220 });
  const big = (p: number, de: number) => `${1 + 0.1 * p * (1 - entre(f, de + 8, de + 20))}`;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"ELEITOS 2026 · DEP. FEDERAIS,\nSENADORES E GOVERNADORES"} o={1} top={232} />
      <div style={{ position: "absolute", top: 350, left: COL[0] - 250, width: 500, textAlign: "center", fontFamily: MONO, fontSize: 150, letterSpacing: -6, color: LARANJA, scale: big(pA, M.seis), textShadow: `0 0 40px ${LARANJA}88` }}>{Math.round(D.pctMil)}%</div>
      <div style={{ position: "absolute", top: 350, left: COL[1] - 250, width: 500, textAlign: "center", fontFamily: MONO, fontSize: 150, letterSpacing: -6, color: CIANO, scale: big(pB, M.n7), textShadow: `0 0 30px ${CIANO}55` }}>{Math.round(D.pctIR)}%</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Grade100 cx={COL[0]} top={580} acesos={Math.round(D.pctMil)} cor={LARANJA} f={f} fase={0} r={11} passo={42} />
        <Grade100 cx={COL[1]} top={580} acesos={Math.round(D.pctIR)} cor={CIANO} f={f} fase={1} r={11} passo={42} />
      </svg>
      <div style={{ position: "absolute", top: 1010, left: COL[0] - 250, width: 500, textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 2, lineHeight: 1.35, color: TEXTO }}>DOS ELEITOS<br />DECLARARAM<br />R$ 1 MILHÃO OU MAIS</div>
      <div style={{ position: "absolute", top: 1010, left: COL[1] - 250, width: 500, textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 2, lineHeight: 1.35, color: TEXTO }}>DOS DECLARANTES<br />DO IR 2026 TÊM<br />+ DE R$ 1 MILHÃO</div>
    </AbsoluteFill>
  );
};

// --- 2. os 586 e a mediana ---------------------------------------------------------------------------
const Mediana: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.mediana.de, C.mediana.ate);
  if (o <= 0) return null;
  const zoom = 1.04 + 0.06 * entre(f, C.mediana.de, C.mediana.ate);
  const n = Math.round(D.n * entre(f, C.mediana.de, M.n586 + 4, saida));
  const med = entre(f, M.tipico - 2, M.tipico + 6);
  const pm = mola(f, M.mi - 4, { damping: 11, stiffness: 200 });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1500, overflow: "hidden" }}>
        <Img src={staticFile("ciencia/patrimonio/congresso.jpg")} style={{ width: 1080, height: 1500, objectFit: "cover", opacity: 0.32, scale: `${zoom}` }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${FUNDO}cc 0%, ${FUNDO}55 35%, ${FUNDO}88 70%, ${FUNDO} 100%)` }} />
      </div>
      <div style={{ position: "absolute", top: 250, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 150, letterSpacing: -4, color: TEXTO, textShadow: SOMBRA_TXT }}>{milhar(n)}</div>
      <div style={{ position: "absolute", top: 440, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 34, letterSpacing: 6, color: TEXTO, textShadow: SOMBRA_TXT }}>ELEITOS EM OUTUBRO</div>
      <div style={{ position: "absolute", top: 510, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 2, lineHeight: 1.5, color: TEXTO_2, textShadow: SOMBRA_TXT }}>
        {D.cargos.dep} DEPUTADOS FEDERAIS · {D.cargos.sen} SENADORES<br />{D.cargos.gov} GOVERNADORES
      </div>
      <div style={{ position: "absolute", top: 700, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 32, letterSpacing: 6, color: TEXTO_2, opacity: med, textShadow: SOMBRA_TXT }}>O TÍPICO (MEDIANA) DECLAROU</div>
      <div style={{ position: "absolute", top: 760, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 140, letterSpacing: -4, color: LARANJA, opacity: entre(f, M.mi - 6, M.mi), scale: `${0.85 + 0.15 * pm}`, textShadow: `0 0 40px ${LARANJA}88, ${SOMBRA_TXT}` }}>R$ {br(D.mediana / 1e6, 2)} MI</div>
      <div style={{ position: "absolute", top: 940, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: TEXTO, opacity: entre(f, M.mi + 6, M.mi + 14), textShadow: SOMBRA_TXT }}>METADE DECLAROU MAIS, METADE MENOS</div>
      <div style={{ position: "absolute", top: 1230, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, lineHeight: 1.5 }}>
        SEM OS 8 DEPUTADOS FEDERAIS DO AMAPÁ: SEM SITUAÇÃO NA BASE DO TSE (12/11)<br />FOTO: AGÊNCIA SENADO · CC BY 2.0 · EM PRETO E BRANCO
      </div>
    </AbsoluteFill>
  );
};

// --- 3. 81 anos de renda -------------------------------------------------------------------------------
const Renda: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.renda.de, C.renda.ate);
  if (o <= 0) return null;
  const conta = T.contas.find((c) => c.id === "c81")!;
  const v = D.anos * entre(f, conta.de, conta.ate, saida);
  const cheios = Math.floor(v);
  const LADO = 62, GAP = 12, NC = 9, X0 = 540 - (NC * (LADO + GAP) - GAP) / 2, Y0 = 590;
  const cab = entre(f, C.renda.de, C.renda.de + 10);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={`RENDA MEDIANA DO BRASILEIRO: R$ ${milhar(D.renda)}\nPOR PESSOA, POR MÊS · IBGE, 2025`} o={cab} top={232} />
      <div style={{ position: "absolute", top: 340, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 170, letterSpacing: -4, color: LARANJA, opacity: entre(f, conta.de - 6, conta.de), textShadow: `0 0 40px ${LARANJA}77` }}>
        {Math.round(v)}<span style={{ fontSize: 70, letterSpacing: 2 }}> ANOS</span>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: D.anos }, (_, k) => {
          const x = X0 + (k % NC) * (LADO + GAP), y = Y0 + Math.floor(k / NC) * (LADO + GAP);
          const ok = k < cheios;
          const ent = entre(f, C.renda.de + k * 0.12, C.renda.de + 6 + k * 0.12);
          return <rect key={k} x={x} y={y} width={LADO} height={LADO} fill={ok ? CIANO : "none"} fillOpacity={ok ? 0.75 : 0} stroke={ok ? CIANO : TEXTO_2} strokeOpacity={ok ? 1 : 0.45} strokeWidth={2} opacity={ent} />;
        })}
      </svg>
      <div style={{ position: "absolute", top: Y0 + 9 * (LADO + GAP) + 6, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: TEXTO_2, opacity: cab }}>
        CADA QUADRADO: 1 ANO DE RENDA (R$ {milhar(D.renda * 12)}), SEM GASTAR NADA
      </div>
    </AbsoluteFill>
  );
};

// --- 4. declarado ≠ mercado -------------------------------------------------------------------------------
const Aviso: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.aviso.de, C.aviso.ate);
  if (o <= 0) return null;
  const a = entre(f, C.aviso.de, C.aviso.de + 8);
  const b = entre(f, M.mercado - 6, M.mercado + 2);
  const casa = entre(f, M.imovel - 6, M.imovel + 10, saida);
  const tag = entre(f, M.imovel + 8, M.imovel + 16);
  const HX = 540, HY = 1000;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", top: 290, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 92, letterSpacing: -2, color: CIANO, opacity: a }}>Valor declarado</div>
      <div style={{ position: "absolute", top: 400, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 110, color: LARANJA, opacity: b, textShadow: `0 0 30px ${LARANJA}88` }}>≠</div>
      <div style={{ position: "absolute", top: 540, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 92, letterSpacing: -2, color: TEXTO, opacity: b }}>valor de mercado</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g opacity={casa} style={{ filter: `drop-shadow(0 0 8px ${CIANO}88)` }}>
          <path d={`M ${HX - 150} ${HY} L ${HX} ${HY - 130} L ${HX + 150} ${HY} M ${HX - 115} ${HY - 30} L ${HX - 115} ${HY + 150} L ${HX + 115} ${HY + 150} L ${HX + 115} ${HY - 30}`} fill="none" stroke={CIANO} strokeWidth={4} strokeDasharray={1100} strokeDashoffset={1100 * (1 - casa)} strokeLinejoin="round" />
          <rect x={HX - 30} y={HY + 60} width={60} height={90} fill="none" stroke={CIANO} strokeWidth={3} opacity={casa} />
        </g>
      </svg>
      <div style={{ position: "absolute", top: HY - 40, left: 60, width: 300, textAlign: "right", fontFamily: MONO, fontSize: 26, letterSpacing: 2, lineHeight: 1.35, color: CIANO, opacity: tag }}>NA DECLARAÇÃO:<br />PREÇO DE COMPRA</div>
      <div style={{ position: "absolute", top: HY - 40, left: 720, width: 300, fontFamily: MONO, fontSize: 26, letterSpacing: 2, lineHeight: 1.35, color: TEXTO, opacity: tag }}>HOJE:<br />PODE VALER MAIS<br />OU MENOS</div>
    </AbsoluteFill>
  );
};

// --- 5. os 586 em escada (escala log) ---------------------------------------------------------------------
const EX0 = 150, EX1 = 930, EBASE = 1240, EALT = 640, LOG0 = 3, LOG1 = 9;
const yLog = (v: number) => EBASE - (v < 10 ** LOG0 ? 0 : ((Math.log10(v) - LOG0) / (LOG1 - LOG0)) * EALT);

const Extremos: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.extremos.de, C.extremos.ate);
  if (o <= 0) return null;
  const N = D.valores.length, bw = (EX1 - EX0) / N;
  const cresce = (i: number) => entre(f, C.extremos.de + 2 + i * 0.03, C.extremos.de + 10 + i * 0.03, saida);
  const conta = T.contas.find((c) => c.id === "c575")!;
  const vTop = D.maior.valor * entre(f, conta.de, conta.ate, saida);
  const topo = entre(f, M.governador - 4, M.governador + 6);
  const zeros = entre(f, M.oito - 4, M.oito + 6);
  const xTop = EX1 - bw / 2;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"OS 586 ELEITOS, DO MENOR AO MAIOR\nPATRIMÔNIO DECLARADO · ESCALA LOG"} o={entre(f, C.extremos.de, C.extremos.de + 8)} top={232} />
      <div style={{ position: "absolute", top: 350, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 76, letterSpacing: -2, color: LARANJA, opacity: entre(f, conta.de - 6, conta.de), textShadow: `0 0 30px ${LARANJA}88` }}>R$ {reais(vTop)}</div>
      {/* foto oficial de candidatura (TSE, CC BY; foto_cand2026_MT_div.zip, SQ 110002551480) */}
      <div style={{ position: "absolute", top: 448, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 28, opacity: topo, translate: `0 ${(1 - topo) * 16}px` }}>
        <Img src={staticFile("ciencia/patrimonio/fotos/pivetta.jpg")} style={{ width: 118, height: 165, objectFit: "cover", border: `2px solid ${LARANJA}`, boxShadow: `0 0 22px ${LARANJA}55` }} />
        <div style={{ fontFamily: MONO, letterSpacing: 3, lineHeight: 1.4 }}>
          <div style={{ fontSize: 34, color: TEXTO }}>OTAVIANO PIVETTA</div>
          <div style={{ fontSize: 26, color: TEXTO }}>GOVERNADOR ELEITO (MT)</div>
          <div style={{ fontSize: 18, color: TEXTO_2, marginTop: 6 }}>FOTO: TSE (CC BY)</div>
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[4, 5, 6, 7, 8].map((d) => (
          <g key={d}>
            <line x1={EX0} x2={EX1} y1={yLog(10 ** d)} y2={yLog(10 ** d)} stroke={TEXTO_2} strokeWidth={1} opacity={d === 6 ? 0.8 : 0.3} strokeDasharray={d === 6 ? "8 8" : undefined} />
            <text x={EX0 - 12} y={yLog(10 ** d) + 8} textAnchor="end" fontFamily={MONO} fontSize={22} fill={d === 6 ? TEXTO : TEXTO_2}>{["10 MIL", "100 MIL", "1 MI", "10 MI", "100 MI"][d - 4]}</text>
          </g>
        ))}
        <line x1={EX0} x2={EX1} y1={EBASE} y2={EBASE} stroke={TEXTO_2} strokeWidth={2} />
        {D.valores.map((v, i) => {
          const h = (EBASE - yLog(v)) * cresce(i);
          const ehTop = i === N - 1;
          return h > 0.5 ? <rect key={i} x={EX0 + i * bw} y={EBASE - h} width={Math.max(1, bw - 0.3)} height={h} fill={ehTop ? LARANJA : CIANO} opacity={ehTop ? 0.4 + 0.6 * topo : 0.55} /> : null;
        })}
        {/* os 8 sem bens declarados: no chão, à esquerda */}
        <g opacity={zeros}>
          {Array.from({ length: D.zero }, (_, i) => <circle key={i} cx={EX0 + (i + 0.5) * bw * 3} cy={EBASE + 14} r={4} fill={TEXTO} />)}
          <path d={`M ${EX0} ${EBASE + 30} L ${EX0} ${EBASE + 40} L ${EX0 + D.zero * bw * 3} ${EBASE + 40} L ${EX0 + D.zero * bw * 3} ${EBASE + 30}`} fill="none" stroke={TEXTO} strokeWidth={2} />
        </g>
        <g opacity={topo}>
          <circle cx={xTop} cy={yLog(D.maior.valor)} r={10} fill="none" stroke={LARANJA} strokeWidth={3} />
        </g>
      </svg>
      <div style={{ position: "absolute", top: EBASE + 52, left: EX0 - 10, width: 600, fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: TEXTO, opacity: zeros }}>{D.zero} ELEITOS: NENHUM BEM DECLARADO</div>
      <div style={{ position: "absolute", top: yLog(1e6) - 40, left: EX0 + 8, fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: entre(f, C.extremos.de + 14, C.extremos.de + 22) }}>R$ 1 MILHÃO</div>
    </AbsoluteFill>
  );
};

// --- 6. os 20 partidos -------------------------------------------------------------------------------------
const PY0 = 345, PDY = 45, PBX = 330, PBW = 470;
const Partidos: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.partidos.de, C.partidos.ate);
  if (o <= 0) return null;
  const max = Math.max(...D.partidos.map((p) => p.med));
  const ult = D.partidos.length - 1;
  const destaque = (i: number) => (i === ult ? entre(f, M.n172 - 4, M.n172 + 4) * (1 - entre(f, M.n4 - 2, M.n4 + 4)) : i === 0 ? entre(f, M.n4 - 4, M.n4 + 4) * (1 - entre(f, M.aqui - 2, M.aqui + 4)) : 0);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"MEDIANA DO PATRIMÔNIO DECLARADO\nPOR PARTIDO · TODOS OS 20 COM ELEITOS"} o={entre(f, C.partidos.de, C.partidos.de + 8)} top={226} />
      <div style={{ position: "absolute", top: PY0 - 34, left: 262, width: 60, textAlign: "center", fontFamily: MONO, fontSize: 16, letterSpacing: 1, color: TEXTO_2 }}>ELEITOS</div>
      {D.partidos.map((p, i) => {
        const y = PY0 + i * PDY;
        const g = entre(f, C.partidos.de + 4 + i * 1.2, C.partidos.de + 16 + i * 1.2, saida);
        const d = destaque(i);
        const w = (p.med / max) * PBW * g;
        return (
          <div key={p.p} style={{ position: "absolute", top: y, left: 0, width: 1080, height: PDY - 8, opacity: entre(f, C.partidos.de + 2 + i * 1.2, C.partidos.de + 8 + i * 1.2) }}>
            <div style={{ position: "absolute", left: 40, width: 220, textAlign: "right", fontFamily: MONO, fontSize: 24, lineHeight: `${PDY - 8}px`, letterSpacing: 1, color: TEXTO }}>{p.p}</div>
            <div style={{ position: "absolute", left: 262, width: 60, textAlign: "center", fontFamily: MONO, fontSize: 22, lineHeight: `${PDY - 8}px`, color: TEXTO_2 }}>{p.n}</div>
            <div style={{ position: "absolute", left: PBX, top: 6, width: w, height: PDY - 20, background: CIANO, opacity: 0.7 + 0.3 * d, boxShadow: d > 0 ? `0 0 ${18 * d}px ${CIANO}` : undefined }} />
            <div style={{ position: "absolute", left: PBX + w + 12, fontFamily: MONO, fontSize: 22, lineHeight: `${PDY - 8}px`, color: d > 0 ? TEXTO : TEXTO_2, opacity: g }}>{curto(p.med)}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// --- 7. os 289 reeleitos -------------------------------------------------------------------------------------
const Reeleitos: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.reeleitos.de, C.reeleitos.ate);
  if (o <= 0) return null;
  const NC = 17, P = 36, X0 = 540 - ((NC - 1) * P) / 2, Y0 = 640;
  const pv = mola(f, M.n39 - 4, { damping: 11, stiffness: 200 });
  const infl = entre(f, M.inflacao - 4, M.inflacao + 4);
  const menos = entre(f, M.n68 - 4, M.n68 + 6);
  const mais = entre(f, M.subiu - 4, M.subiu + 6) * (1 - 0.5 * menos);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"REELEITOS PARA O MESMO CARGO\nTSE 2022 × 2026, CRUZADOS PELO CPF"} o={entre(f, C.reeleitos.de, C.reeleitos.de + 8)} top={226} />
      <div style={{ position: "absolute", top: 330, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 130, letterSpacing: -4, color: LARANJA, opacity: entre(f, M.n39 - 6, M.n39), scale: `${0.85 + 0.15 * pv}`, textShadow: `0 0 36px ${LARANJA}88` }}>+{br(D.re.var)}%</div>
      <div style={{ position: "absolute", top: 490, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: TEXTO_2, opacity: entre(f, M.n39, M.n39 + 8) }}>MEDIANA DA VARIAÇÃO DO VALOR DECLARADO · NOMINAL</div>
      <div style={{ position: "absolute", top: 540, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: TEXTO, opacity: infl }}>IPCA AGO/2022–AGO/2026: +{br(D.ipca)}%</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: D.re.n }, (_, k) => {
          const x = X0 + (k % NC) * P, y = Y0 + Math.floor(k / NC) * P;
          const tipo = k < D.re.mais ? "mais" : k < D.re.mais + D.re.iguais ? "igual" : "menos";
          const ent = entre(f, C.reeleitos.de + 2 + k * 0.05, C.reeleitos.de + 8 + k * 0.05);
          if (tipo === "mais") return <circle key={k} cx={x} cy={y} r={12} fill={CIANO} fillOpacity={0.25 + 0.65 * mais} stroke={CIANO} strokeWidth={2} opacity={ent} />;
          if (tipo === "igual") return <circle key={k} cx={x} cy={y} r={12} fill="none" stroke={TEXTO_2} strokeWidth={2} opacity={ent * 0.6} />;
          return <circle key={k} cx={x} cy={y} r={12} fill={TEXTO} fillOpacity={0.15 + 0.8 * menos} stroke={TEXTO} strokeWidth={2} opacity={ent} />;
        })}
      </svg>
      <div style={{ position: "absolute", top: Y0 + 17 * P - 4, left: 120, width: 420, fontFamily: MONO, fontSize: 24, letterSpacing: 2, lineHeight: 1.4, color: CIANO, opacity: entre(f, M.subiu - 4, M.subiu + 6) }}>■ {D.re.mais} DECLARARAM MAIS</div>
      <div style={{ position: "absolute", top: Y0 + 17 * P - 4, left: 560, width: 420, textAlign: "right", fontFamily: MONO, fontSize: 24, letterSpacing: 2, lineHeight: 1.4, color: TEXTO, opacity: menos }}>■ {D.re.menos} DECLARARAM MENOS</div>
    </AbsoluteFill>
  );
};

// --- 8. os 27 estados -------------------------------------------------------------------------------------
// Mapa em ladrilhos (coluna, linha), um por estado, só pra situar: nenhum valor no ladrilho (a mediana de
// cada estado vai no comentário fixado).
const LADRILHOS: [string, number, number][] = [
  ["RR", 2, 0], ["AP", 4, 0],
  ["AM", 1, 1], ["PA", 3, 1], ["MA", 4, 1], ["CE", 5, 1], ["RN", 6, 1],
  ["AC", 0, 2], ["RO", 1, 2], ["MT", 2, 2], ["TO", 3, 2], ["PI", 4, 2], ["PE", 5, 2], ["PB", 6, 2],
  ["MS", 2, 3], ["GO", 3, 3], ["DF", 4, 3], ["BA", 5, 3], ["AL", 6, 3],
  ["PR", 2, 4], ["SP", 3, 4], ["MG", 4, 4], ["ES", 5, 4], ["SE", 6, 4],
  ["SC", 2, 5], ["RJ", 4, 5],
  ["RS", 2, 6],
];
const Estados: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.pergunta.de, C.pergunta.ate);
  if (o <= 0) return null;
  const L = 96, G = 10, X0 = 540 - (7 * (L + G) - G) / 2, Y0 = 290;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {LADRILHOS.map(([uf, c, l], i) => {
        const ent = entre(f, C.pergunta.de + i * 0.6, C.pergunta.de + 8 + i * 0.6);
        const pulso = 0.5 + 0.5 * Math.max(0, Math.sin(f / 6 - i * 0.7));
        const aceso = entre(f, M.estado - 4, M.estado + 6) * pulso;
        return (
          <div key={uf} style={{ position: "absolute", left: X0 + c * (L + G), top: Y0 + l * (L + G), width: L, height: L, border: `2px solid ${CIANO}`, background: `rgba(92,225,255,${0.06 + 0.3 * aceso})`, opacity: ent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 1, color: TEXTO, boxShadow: aceso > 0.1 ? `0 0 ${16 * aceso}px ${CIANO}88` : undefined }}>{uf}</div>
        );
      })}
    </AbsoluteFill>
  );
};

// --- legenda, pergunta, aviso fixo e fonte -------------------------------------------------------------
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

const PerguntaFinal: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, G0 - 4, G0 + 2) * (1 - entre(f, FIM - 8, FIM));
  if (o <= 0) return null;
  const nLinhas = Math.max(...T.grande.map((w) => w.l)) + 1;
  const linhas = Array.from({ length: nLinhas }, (_, l) => T.grande.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top: 1062, left: 60, width: 960, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 74, lineHeight: 1.12, letterSpacing: -1, color: TEXTO,
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

/** O aviso que o pedido exige na tela: fica do quadro 0 ao fim. */
const AvisoFixo: React.FC = () => (
  <div style={{ position: "absolute", top: 172, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>
    VALOR DECLARADO AO TSE · NÃO É VALOR DE MERCADO
  </div>
);

const FONTES: [keyof typeof C, string][] = [
  ["grade", "TSE, CANDIDATURAS 2026 · RECEITA FEDERAL, IRPF 2026 (DIVULGADO EM 30/10)"],
  ["mediana", "TSE, BENS DE CANDIDATOS 2026 · CÁLCULO NOSSO"],
  ["renda", "IBGE, PNAD CONTÍNUA 2025 · RENDA DOMICILIAR PER CAPITA, MEDIANA"],
  ["aviso", "TSE · BENS DECLARADOS NO REGISTRO DA CANDIDATURA"],
  ["extremos", "TSE, BENS DE CANDIDATOS 2026 · CÁLCULO NOSSO"],
  ["partidos", "TSE 2026 · PARTIDO DO ELEITO · NÚMERO DE ELEITOS À ESQUERDA"],
  ["reeleitos", "TSE 2022 E 2026 · IPCA (IBGE) · CÁLCULO NOSSO"],
  // na pergunta, sem linha de fonte: as 4 linhas da pergunta grande ocupam o lugar dela
];
const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  if (f >= FIM) return null;
  const atual = FONTES.find(([k]) => f >= C[k].de && f < C[k].ate);
  if (!atual || atual[0] === "mediana") return null; // a cena da foto tem crédito próprio
  const o = 0.8 * Math.min(entre(f, C[atual[0]].de, C[atual[0]].de + 6), 1 - entre(f, C[atual[0]].ate - 6, C[atual[0]].ate));
  return (
    <div style={{ position: "absolute", top: 1330, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: atual[0] === "grade" ? 0.8 : o }}>
      {atual[1]}
    </div>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/patrimonio/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/patrimonio/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Patrimonio: React.FC = () => (
  <Fundo>
    <Mediana />
    <Renda />
    <Aviso />
    <Extremos />
    <Partidos />
    <Reeleitos />
    <Estados />
    <Grade />
    <AvisoFixo />
    <Fonte />
    <PerguntaFinal />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-patrimonio.mjs: colchão, whoosh nas cenas, tiques nas grades e nas barras */}
    <Audio src={staticFile("ciencia/patrimonio/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
// Padrão das capas de 12/11 (como CVEnemTriCapa): rótulo mono no topo do recorte (y 300), elemento forte
// no meio, título Sora 400 de 150 px com a base em y 1600, uma palavra em laranja. As duas grades são os
// números reais (62 de 100 eleitos e 7 de 100 declarantes do IR).
export const PatrimonioCapa: React.FC = () => {
  const P = 34, R = 10;
  const G: React.FC<{ cx: number; acesos: number; cor: string }> = ({ cx, acesos, cor }) => (
    <>
      {Array.from({ length: 100 }, (_, k) => {
        const ok = k < acesos;
        return <circle key={k} cx={cx - 4.5 * P + (k % 10) * P} cy={560 + Math.floor(k / 10) * P} r={R} fill={ok ? cor : "none"} stroke={ok ? cor : TEXTO_2} strokeOpacity={ok ? 1 : 0.45} strokeWidth={2} style={ok ? { filter: `drop-shadow(0 0 6px ${cor})` } : undefined} />;
      })}
    </>
  );
  return (
    <Fundo>
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 34, letterSpacing: 6, color: TEXTO_2 }}>ELEITOS 2026 · BENS NO TSE</div>
      <div style={{ position: "absolute", top: 390, left: 290 - 220, width: 440, textAlign: "center", fontFamily: MONO, fontSize: 96, letterSpacing: -3, color: LARANJA }}>{Math.round(D.pctMil)}%</div>
      <div style={{ position: "absolute", top: 390, left: 790 - 220, width: 440, textAlign: "center", fontFamily: MONO, fontSize: 96, letterSpacing: -3, color: CIANO }}>{Math.round(D.pctIR)}%</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <G cx={290} acesos={Math.round(D.pctMil)} cor={LARANJA} />
        <G cx={790} acesos={Math.round(D.pctIR)} cor={CIANO} />
      </svg>
      <div style={{ position: "absolute", top: 905, left: 290 - 220, width: 440, textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: TEXTO, lineHeight: 1.35 }}>ELEITOS COM<br />R$ 1 MI OU MAIS</div>
      <div style={{ position: "absolute", top: 905, left: 790 - 220, width: 440, textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: TEXTO, lineHeight: 1.35 }}>DECLARANTES DO IR<br />COM + DE R$ 1 MI</div>
      <div style={{ position: "absolute", top: 1020, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>VALOR DECLARADO, NÃO DE MERCADO</div>
      <div style={{ position: "absolute", bottom: 320, left: 40, width: 1000, textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 150, lineHeight: 1.04, letterSpacing: -4, color: TEXTO }}>
        O <span style={{ color: LARANJA, textShadow: `0 0 40px ${LARANJA}66` }}>patrimônio</span><br />dos eleitos
      </div>
    </Fundo>
  );
};
