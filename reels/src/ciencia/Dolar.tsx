import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import dados from "./dolar.json";
import T from "./dolar-tempos.json";
import { Fundo, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { Banco, Cadeado, FiltroNeon, Galaxia, Neon, Sino, Urna, comZeros, traco } from "./ilustra-dolar";

// "O dia impossível do dólar" v2 (29/10/2026). Em 26/10/2026, 1º pregão depois do 2º
// turno, a PTAX subiu 9,2%: acima de todos os 112 palpites do Focus da sexta, o maior
// salto de um 1º pregão pós-2º turno desde 2002 e a 3ª maior alta diária desde 1999.
// Pela curva normal, um dia assim viria uma vez a cada ~29 quintilhões de anos; desde
// 1999 houve 18 dias além de 5 desvios-padrão, contra 0,004 previstos. É cauda pesada.
//
// Embalagem (pesquisa-virais.md): gancho de 2,5s com o número gigante e a pena já subindo
// no quadro 0; palco de dados no meio e todo texto no terço de baixo (y 1200–1550, longe
// da legenda do IG e dos botões); legenda sincronizada com a voz, 2 a 4 palavras, chave em
// laranja; algo muda a cada 2 a 4s; números digitados com tique; o fim volta pro quadro do
// gancho pra emendar o loop.
//
// Números: dolar.json (scripts/gerar-dolar.mjs, que confere os valores). Tempos:
// dolar-tempos.json (scripts/tempos-dolar.mjs, a partir da duração e das palavras da
// narração). A trilha (scripts/gerar-trilha-dolar.mjs) lê os mesmos tempos.
// Tema político: só a data ("1º pregão após o 2º turno"), nenhuma causa, nenhum nome, e
// todas as eleições na mesma cor.

export const DOLAR_TOTAL = T.total;
const F = T.fala;
const M = T.m;

const br = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");
const sinal = (n: number, casas = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${br(Math.abs(n), casas)}%`;
const CONTORNO = { stroke: FUNDO, strokeWidth: 8, paintOrder: "stroke" as const };
const STATUS_TOP = 330;
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));

/** Zoom de câmera: escala `s` em volta de P, levando P até `alvo` quando s chega em `sMax`. */
const camera = (s: number, sMax: number, P: [number, number], alvo: [number, number]) => {
  const k = (s - 1) / (sMax - 1);
  const C = [P[0] + (alvo[0] - P[0]) * k, P[1] + (alvo[1] - P[1]) * k];
  return {
    transform: `translate(${C[0]} ${C[1]}) scale(${s}) translate(${-P[0]} ${-P[1]})`,
    ponto: (x: number, y: number): [number, number] => [C[0] + s * (x - P[0]), C[1] + s * (y - P[1])],
  };
};

/** Quantos caracteres de um número digitado já apareceram no quadro f. */
const digitado = (id: string, f: number) => {
  const d = T.digita.find((x) => x.id === id)!;
  if (f < d.de) return "";
  const passo = (d.ate - d.de) / d.texto.length;
  return d.texto.slice(0, Math.min(d.texto.length, Math.floor((f - d.de) / passo) + 1));
};

// --- texto no terço de baixo ---------------------------------------------------------------

/** Legenda da fala: um bloco de 2 a 4 palavras por vez, a chave em laranja. */
const Legenda: React.FC = () => {
  const f = useCurrentFrame();
  const bloco = T.legendas.find((l) => f >= l.de && f < l.ate);
  if (!bloco) return null;
  const s = 0.86 + 0.14 * mola(f, bloco.de, { damping: 12, stiffness: 260 });
  return (
    <div style={{
      position: "absolute", top: 1400, left: 90, width: 820, textAlign: "center",
      fontFamily: SORA, fontWeight: 400, fontSize: 68, lineHeight: 1.12, letterSpacing: -0.5, color: TEXTO,
      textShadow: "0 0 24px rgba(5,7,12,0.95), 0 3px 6px rgba(0,0,0,0.9)", scale: `${s}`, opacity: entre(f, bloco.de, bloco.de + 2),
    }}>
      {bloco.partes.map((p, i) => (
        <span key={i} style={{ color: p.chave ? LARANJA : TEXTO }}>{i ? " " : ""}{p.t}</span>
      ))}
    </div>
  );
};

/** Faixa do número grande, logo acima da legenda. */
const Heroi: React.FC<{ o: number; children: React.ReactNode; top?: number }> = ({ o, children, top = 1195 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: 0, width: 1080, opacity: o, fontFamily: MONO, color: TEXTO }}>{children}</div>
  );

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  const focus = (f >= F.focus - 4 && f < F.sismografo) || (f >= F.palpite - 4 && f < T.loop);
  const o = 1 - entre(f, T.loop - 4, T.loop + 4);
  return (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", opacity: o, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>
      {focus ? "FONTE: BANCO CENTRAL · BOLETIM FOCUS 23/10 · PTAX" : "FONTE: BANCO CENTRAL · PTAX (SGS 1) · 1999–2026"}
    </div>
  );
};

// --- sismógrafo: gancho, varredura, punch-in no pico e volta no fim -------------------------
type Dia = [string, number]; // ano, variação %
const DIAS = dados.sismografo as Dia[];
const YC = 800, KPCT = 30;
const xDia = (i: number) => X0 + (i / (DIAS.length - 1)) * (X1 - X0);
const I_ALVO = DIAS.length - 2; // 26/10 é o penúltimo (27/10 é o último)
const CAMINHO = DIAS.map(([, p], i) => (i === I_ALVO ? "" : `M${xDia(i).toFixed(2)},${YC}L${xDia(i).toFixed(2)},${(YC - p * KPCT).toFixed(1)}`)).join("");
const ANOS_MARCA = [2000, 2008, 2016, 2024].map((a) => ({ a, i: DIAS.findIndex(([y]) => +y === a) }));
const XA = xDia(I_ALVO), YA = YC - dados.alvo.pct * KPCT;
const S_PUNCH = 2.5;

/** A pena do sismógrafo, com a ponta no topo do traço de 26/10 (sobe com `pico`). */
const Pena: React.FC<{ y: number }> = ({ y }) => {
  const x = XA, px = 1000, py = YC - 380;
  const ang = Math.atan2(y - py, x - px), c = Math.cos(ang), s = Math.sin(ang);
  return (
    <Neon filtro="neonDolar" cor={TEXTO} largura={2}>
      <line x1={px - 26} x2={px + 26} y1={py - 16} y2={py - 16} />
      {[-20, -8, 4, 16].map((d) => <line key={d} x1={px + d} y1={py - 16} x2={px + d + 10} y2={py - 28} strokeWidth={1.4} />)}
      <line x1={px} y1={py - 16} x2={px} y2={py - 10} />
      <circle cx={px} cy={py} r={10} />
      <circle cx={px} cy={py} r={3.5} fill="currentColor" />
      <line x1={px + c * 10} y1={py + s * 10} x2={x - c * 18} y2={y - s * 18} />
      <path d={`M${x},${y} L${x - c * 20 - s * 6},${y - s * 20 + c * 6} L${x - c * 20 + s * 6},${y - s * 20 - c * 6} Z`} fill="currentColor" />
    </Neon>
  );
};

const Sismografo: React.FC = () => {
  const f = useCurrentFrame();
  const noLoop = f >= T.loop - 4;
  const oGancho = 1 - entre(f, F.promessa, F.promessa + 8);
  const oVarre = entre(f, F.sismografo - 6, F.sismografo + 4) * (1 - entre(f, M.pregao, M.pregao + 8));
  const oLoop = entre(f, T.loop - 4, T.loop + 4);
  const o = Math.max(oGancho, oVarre, oLoop);
  if (o <= 0) return null;
  const emGancho = f < F.promessa + 8 || noLoop;
  // O quadro 0 já tem a pena no meio da subida; no loop ela está parada no topo.
  const pico = noLoop || f > F.promessa ? 1 : entre(f, -6, M.pico + 4, Easing.out(Easing.back(1.4)));
  const ya = YC + (YA - YC) * pico;
  // "Cada traço é um dia...": um cursor varre 1999 → 2026 em 2s.
  const varre = entre(f, F.sismografo + 2, F.sismografo + 62, Easing.inOut(Easing.quad));
  const cursor = noLoop ? 0 : janela(f, F.sismografo, F.sismografo + 70, 6);
  const iCursor = Math.round(varre * (DIAS.length - 1));
  // "Esse é segunda": punch-in com mola no pico.
  const s = noLoop ? 1 : 1 + (S_PUNCH - 1) * mola(f, M.segunda - 3, { damping: 15, stiffness: 120 });
  const cam = camera(s, S_PUNCH, [XA, YC - 4.6 * KPCT], [600, 760]);
  const [lx, ly] = cam.ponto(XA, ya);
  const anos = 1 - entre(f, M.segunda - 3, M.segunda + 5);
  const rotuloPunch = noLoop ? 0 : entre(f, M.segunda + 6, M.segunda + 14);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="DÓLAR · VARIAÇÃO EM UM DIA" direita="1999–2026" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilhoUS" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation={8} /></filter>
          <FiltroNeon id="neonDolar" />
          <clipPath id="palcoSismo"><rect x={0} y={380} width={1080} height={800} /></clipPath>
        </defs>
        <g clipPath="url(#palcoSismo)">
          <g transform={cam.transform}>
            <line x1={X0} x2={X1} y1={YC} y2={YC} stroke={TEXTO_2} strokeOpacity={0.4} vectorEffect="non-scaling-stroke" />
            {[-5, 5].map((v) => (
              <g key={v} opacity={anos}>
                <line x1={X0} x2={X1} y1={YC - v * KPCT} y2={YC - v * KPCT} stroke={TEXTO_2} strokeOpacity={0.15} strokeDasharray="4 8" vectorEffect="non-scaling-stroke" />
                <text x={X0 - 12} y={YC - v * KPCT + 8} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22}>{v > 0 ? "+" : "−"}{Math.abs(v)}%</text>
              </g>
            ))}
            {/* o resto da série a 30%: o olho vai pro traço laranja, não pro de 1999 */}
            <path d={CAMINHO} stroke={CIANO} strokeWidth={1} strokeOpacity={0.3} vectorEffect="non-scaling-stroke" />
            <line x1={XA} x2={XA} y1={YC} y2={ya} stroke={LARANJA} strokeWidth={14} strokeOpacity={0.45} filter="url(#brilhoUS)" />
            <line x1={XA} x2={XA} y1={YC} y2={ya} stroke={LARANJA} strokeWidth={5} />
            <circle cx={XA} cy={ya} r={8} fill={LARANJA} />
            <g opacity={anos}>
              {ANOS_MARCA.map(({ a, i }) => (
                <text key={a} x={xDia(i)} y={YC + 330} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24}>{a}</text>
              ))}
            </g>
          </g>
        </g>
        {cursor > 0 && (
          <g opacity={cursor}>
            <Neon filtro="neonDolar" cor={TEXTO} largura={1.5}>
              <line x1={xDia(iCursor)} x2={xDia(iCursor)} y1={440} y2={1140} />
            </Neon>
            <text x={Math.min(Math.max(xDia(iCursor), X0 + 40), X1 - 40)} y={428} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={34} {...CONTORNO}>
              {DIAS[iCursor][0]}
            </text>
          </g>
        )}
        {/* selo do pico, fora do zoom pra não escalar */}
        <g opacity={emGancho ? entre(f, -4, M.pico + 2) : 0}>
          <rect x={lx - 262} y={ly - 22} width={236} height={84} fill={FUNDO} stroke={LARANJA} strokeWidth={2} />
          <text x={lx - 144} y={ly + 40} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={60}>+{br(dados.alvo.pct)}%</text>
          <text x={lx - 144} y={ly + 100} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={26} {...CONTORNO}>{dados.alvo.data}</text>
        </g>
        <g opacity={rotuloPunch}>
          <text x={lx - 40} y={ly + 30} textAnchor="end" fill={LARANJA} fontFamily={MONO} fontSize={56} {...CONTORNO}>+{br(dados.alvo.pct)}%</text>
          <text x={lx - 40} y={ly + 78} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={28} {...CONTORNO}>SEGUNDA, {dados.alvo.data}</text>
          <text x={lx - 40} y={ly + 116} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={1} {...CONTORNO}>1º PREGÃO APÓS O 2º TURNO</text>
        </g>
        {emGancho && <Pena y={ya} />}
      </svg>
      {/* gancho: o número gigante; a cotação sobe junto com a pena */}
      <Heroi o={emGancho ? 1 : 0} top={1170}>
        <div style={{ textAlign: "center", fontSize: 124, color: LARANJA, letterSpacing: -2, textShadow: `0 0 30px ${LARANJA}55` }}>
          {br(dados.alvo.de, 2)} → {br(dados.alvo.de + (dados.alvo.para - dados.alvo.de) * Math.min(1, pico), 2)}
        </div>
      </Heroi>
    </AbsoluteFill>
  );
};

/** "...o primeiro pregão depois do segundo turno": os últimos 12 pregões, em reais. */
const ULT = dados.ultimos;
const I26 = ULT.findIndex((d) => d.data === dados.alvo.data);
const ux = (i: number) => 170 + (i / (ULT.length - 1)) * 720;
const uy = (v: number) => 1060 - ((v - 4.95) / 0.6) * 520;
const CAMINHO_ULT = ULT.map((d, i) => `${i ? "L" : "M"}${ux(i)},${uy(d.v).toFixed(1)}`).join("");

const Ultimos: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(entre(f, M.pregao, M.pregao + 8), 1 - entre(f, F.eleicoes - 6, F.eleicoes + 2));
  if (o <= 0) return null;
  const linha = entre(f, M.pregao + 2, M.pregao + 26, Easing.inOut(Easing.quad));
  const rot = entre(f, M.pregao + 18, M.pregao + 26);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="ÚLTIMOS 12 PREGÕES" direita="REAIS POR DÓLAR" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonUlt" /></defs>
        {[5.0, 5.5].map((v) => (
          <g key={v}>
            <line x1={X0} x2={X1} y1={uy(v)} y2={uy(v)} stroke={TEXTO_2} strokeOpacity={0.15} strokeDasharray="4 8" />
            <text x={X0 - 12} y={uy(v) + 8} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22}>{br(v, 2)}</text>
          </g>
        ))}
        <Neon filtro="neonUlt" cor={CIANO} largura={3}>
          <path d={CAMINHO_ULT} {...traco(linha)} />
        </Neon>
        <g opacity={rot}>
          <line x1={ux(I26 - 1)} y1={uy(ULT[I26 - 1].v)} x2={ux(I26)} y2={uy(ULT[I26].v)} stroke={LARANJA} strokeWidth={5} />
          <circle cx={ux(I26)} cy={uy(ULT[I26].v)} r={9} fill={LARANJA} />
          <circle cx={ux(I26 - 1)} cy={uy(ULT[I26 - 1].v)} r={6} fill={TEXTO} />
          <circle cx={ux(I26 + 1)} cy={uy(ULT[I26 + 1].v)} r={6} fill={TEXTO} />
          <text x={ux(I26 - 1) - 16} y={uy(ULT[I26 - 1].v) + 52} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={34} {...CONTORNO}>{br(dados.alvo.de, 2)}</text>
          <text x={ux(I26) - 18} y={uy(ULT[I26].v) - 22} textAnchor="end" fill={LARANJA} fontFamily={MONO} fontSize={52} {...CONTORNO}>{br(dados.alvo.para, 2)}</text>
          <text x={ux(I26 + 1) + 10} y={uy(ULT[I26 + 1].v) + 56} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={34} {...CONTORNO}>{br(dados.dia27.para, 2)}</text>
          {[0, I26].map((i) => (
            <text key={i} x={ux(i)} y={1120} textAnchor="middle" fill={i === I26 ? LARANJA : TEXTO_2} fontFamily={MONO} fontSize={24}>{ULT[i].data.slice(0, 5)}</text>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// --- promessa: o sino e a idade do universo -------------------------------------------------
const IDADE_UNIVERSO = dados.anosEspera / dados.vezesUniverso; // 13,8 bilhões de anos
/** Vezes esperadas na idade do universo, com dois algarismos: 0,00000000047. */
const VEZES_NO_UNIVERSO = (() => {
  const v = 1 / dados.vezesUniverso;
  const e = Math.floor(Math.log10(v));
  return v.toFixed(-e + 1).replace(".", ",");
})();

const Promessa: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(entre(f, F.promessa - 2, F.promessa + 6), 1 - entre(f, F.focus - 4, F.focus + 4));
  if (o <= 0) return null;
  const sino = entre(f, F.promessa, F.promessa + 18, Easing.out(Easing.quad));
  const vai = entre(f, M.universo - 6, M.universo + 8, Easing.inOut(Easing.quad)); // o sino vai pro canto
  const gal = entre(f, M.universo - 4, M.universo + 40, Easing.out(Easing.quad));
  const zero = mola(f, M.vez - 2, { damping: 12, stiffness: 200 });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="PELA CURVA DO SINO" direita="QUANTAS VEZES?" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonProm" /></defs>
        <g transform={`translate(${540 - 330 * vai} ${800 - 300 * vai}) scale(${2.8 - 1.8 * vai})`}>
          <Neon filtro="neonProm" cor={TEXTO} largura={2.2 / (2.8 - 1.8 * vai)}><Sino p={sino} /></Neon>
        </g>
        <text x={540 - 330 * vai} y={(800 - 300 * vai) + 100 - 30 * vai} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={26 - 4 * vai} letterSpacing={2} opacity={entre(sino, 0.5, 1)}>CURVA DO SINO</text>
        {gal > 0 && (
          <g opacity={gal}>
            <g transform="translate(560 800) scale(2.7)">
              <Neon filtro="neonProm" cor={CIANO} largura={0.9}><Galaxia p={gal} giro={(f - M.universo) * 0.01} /></Neon>
            </g>
            <text x={540} y={1030} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={26} letterSpacing={2}>IDADE DO UNIVERSO</text>
            <text x={540} y={1080} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={36}>{br(IDADE_UNIVERSO / 1e9)} BILHÕES DE ANOS</text>
          </g>
        )}
      </svg>
      <Heroi o={Math.min(1, zero * 1.5)}>
        <div style={{ textAlign: "center", fontSize: 24, letterSpacing: 3, color: TEXTO_2 }}>VEZES ESPERADAS NESSE TEMPO</div>
        <div style={{ textAlign: "center", fontSize: 92, color: LARANJA, scale: `${0.8 + 0.2 * zero}`, marginTop: 6 }}>{VEZES_NO_UNIVERSO}</div>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- régua do Focus (e a volta dela no palpite) --------------------------------------------
const FO = dados.focus;
const RMIN = 4.4, RMAX = 5.6, RY = 830;
const rx = (v: number) => 130 + ((v - RMIN) / (RMAX - RMIN)) * 820;

const Focus: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.max(
    janela(f, F.focus - 2, F.sismografo + 2, 6),
    Math.min(entre(f, F.palpite - 4, F.palpite + 4), 1 - entre(f, T.loop - 6, T.loop + 2)),
  );
  if (o <= 0) return null;
  const palp = f >= F.palpite - 4;
  const regua = palp ? 1 : entre(f, F.focus, F.focus + 16, Easing.out(Easing.quad));
  const med = palp ? 1 : mola(f, M.f505 - 4);
  const banda = palp ? 1 : entre(f, M.alto - 2, M.alto + 22, Easing.inOut(Easing.cubic));
  const maxi = palp ? 1 : mola(f, M.f540 - 3);
  const ptax = palp ? 1 : mola(f, M.f550 - 5, { damping: 11, stiffness: 160 });
  // no palpite: a PTAX desliza de 5,50 pra 5,33 (27/10) e a mediana pisca com um "?"
  const desliza = palp ? entre(f, M.f533 - 6, M.f533 + 10, Easing.inOut(Easing.cubic)) : 0;
  const pergunta = palp ? mola(f, M.p505 - 4, { damping: 10, stiffness: 180 }) : 0;
  const pulso = palp && f > M.p505 ? 0.5 + 0.5 * Math.cos((f - M.p505) / 5) : 0;
  const vPtax = dados.alvo.para + (dados.dia27.para - dados.alvo.para) * desliza;
  const xm = rx(FO.mediana), xb0 = rx(FO.mediana) + (rx(FO.min) - rx(FO.mediana)) * banda, xb1 = rx(FO.mediana) + (rx(FO.max) - rx(FO.mediana)) * banda;
  const xp = rx(vPtax), yp = RY - 40 - 360 * (1 - ptax);
  const dezembro = palp ? mola(f, M.palpite - 4) : 0;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda={`FOCUS · ${FO.data.slice(0, 5)}`} direita="DÓLAR NO FIM DE 2026" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonFocus" /><filter id="brilhoFocus" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={8} /></filter></defs>
        {/* régua */}
        <Neon filtro="neonFocus" cor={TEXTO_2} largura={2}>
          <line x1={rx(RMIN)} x2={rx(RMIN) + (rx(RMAX) - rx(RMIN)) * regua} y1={RY} y2={RY} />
        </Neon>
        {Array.from({ length: 25 }, (_, k) => RMIN + k * 0.05).map((v, k) => (
          <line key={k} x1={rx(v)} x2={rx(v)} y1={RY} y2={RY + (k % 2 ? 12 : 24)} stroke={TEXTO_2} strokeWidth={1.5} opacity={entre(regua, k / 25, k / 25 + 0.1)} />
        ))}
        <text x={rx(5)} y={RY + 64} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={28} opacity={regua}>5,00</text>
        {/* faixa dos 112 palpites */}
        {banda > 0 && (
          <g>
            <rect x={xb0} y={RY - 34} width={xb1 - xb0} height={68} fill={CIANO} fillOpacity={0.14} stroke={CIANO} strokeWidth={1.5} />
            <g opacity={entre(banda, 0.6, 1)}>
              <text x={rx(FO.min)} y={RY + 64} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28}>{br(FO.min, 2)}</text>
              <text x={(rx(FO.min) + rx(FO.max)) / 2 - 40} y={RY + 130} textAnchor="middle" fill={CIANO} fontFamily={MONO} fontSize={28} letterSpacing={2}>{FO.respostas} PALPITES</text>
              <text x={(rx(FO.min) + rx(FO.max)) / 2 - 40} y={RY + 166} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2}>BANCOS E CONSULTORIAS</text>
            </g>
          </g>
        )}
        {/* mediana */}
        {med > 0 && (
          <g opacity={Math.min(1, med * 1.4)}>
            <line x1={xm} x2={xm} y1={RY} y2={RY - 150 * med} stroke={CIANO} strokeWidth={3} />
            <circle cx={xm} cy={RY} r={9 + 8 * pulso} fill={CIANO} opacity={1 - 0.4 * pulso} />
            <text x={xm} y={RY - 214} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2}>MEDIANA</text>
            <text x={xm} y={RY - 164} textAnchor="middle" fill={CIANO} fontFamily={MONO} fontSize={48}>{br(FO.mediana, 2)}</text>
          </g>
        )}
        {pergunta > 0 && (
          <text x={xm} y={RY - 260} textAnchor="middle" fill={LARANJA} fontFamily={SORA} fontSize={120 * (0.6 + 0.4 * pergunta)} opacity={Math.min(1, pergunta * 1.5)}>?</text>
        )}
        {/* maior palpite */}
        {maxi > 0 && (
          <g opacity={Math.min(1, maxi * 1.4)}>
            <line x1={rx(FO.max)} x2={rx(FO.max)} y1={RY} y2={RY - 90 * maxi} stroke={TEXTO} strokeWidth={2.5} />
            <text x={rx(FO.max) - 6} y={RY - 150} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={1}>MAIOR</text>
            <text x={rx(FO.max) - 6} y={RY - 104} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={40}>{br(FO.max, 2)}</text>
          </g>
        )}
        {/* a cotação oficial cai fora da faixa */}
        {ptax > 0 && (
          <g>
            {desliza > 0 && (
              <g opacity={0.6}>
                <line x1={rx(dados.alvo.para)} x2={rx(dados.alvo.para)} y1={RY - 300} y2={RY} stroke={TEXTO_2} strokeWidth={2} strokeDasharray="5 7" />
                <text x={rx(dados.alvo.para) + 8} y={RY + 64} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24}>26/10</text>
              </g>
            )}
            <line x1={xp} x2={xp} y1={yp - 260} y2={yp + 40} stroke={LARANJA} strokeWidth={14} strokeOpacity={0.4} filter="url(#brilhoFocus)" />
            <line x1={xp} x2={xp} y1={yp - 260} y2={yp + 40} stroke={LARANJA} strokeWidth={4.5} />
            <circle cx={xp} cy={yp + 40} r={11} fill={LARANJA} />
            <text x={Math.min(xp + 60, 950)} y={yp - 330} textAnchor="end" fill={LARANJA} fontFamily={MONO} fontSize={64} {...CONTORNO}>{br(vPtax, 2)}</text>
            <text x={950} y={yp - 290} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={22} letterSpacing={1} {...CONTORNO}>
              {desliza > 0.5 ? "PTAX · TERÇA, 27/10" : "COTAÇÃO OFICIAL (PTAX, BC)"}
            </text>
          </g>
        )}
      </svg>
      <Heroi o={dezembro}>
        <div style={{ textAlign: "center", fontSize: 84, color: TEXTO, scale: `${0.85 + 0.15 * dezembro}` }}>
          DEZEMBRO: <span style={{ color: LARANJA }}>?</span>
        </div>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- 1º pregão depois de cada 2º turno: todas as eleições na mesma cor ----------------------
const EL = dados.eleicoes;
const EY = 930, EK = 52, SLOT = (X1 - X0) / EL.length, EW = 64;
const ex = (i: number) => X0 + SLOT * i + (SLOT - EW) / 2;

const Eleicoes: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.eleicoes - 2, F.ranking + 2, 6);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="1º PREGÃO APÓS O 2º TURNO" direita="PTAX" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0} x2={X1} y1={EY} y2={EY} stroke={TEXTO_2} strokeOpacity={0.6} />
        <text x={X0 - 12} y={EY + 8} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22}>0%</text>
        {EL.map((e, i) => {
          const hoje = i === EL.length - 1;
          const p = hoje ? mola(f, M.e2026 - 8, { damping: 10, stiffness: 150 }) : entre(f, F.eleicoes + 16 + i * 8, F.eleicoes + 30 + i * 8, Easing.out(Easing.cubic));
          const h = e.pct * EK * p;
          const y = h >= 0 ? EY - h : EY;
          const rot = hoje ? entre(f, M.e2026 - 2, M.e2026 + 6) : entre(p, 0.7, 1);
          return (
            <g key={e.ano}>
              <rect x={ex(i)} y={y} width={EW} height={Math.abs(h)} fill={CIANO} opacity={0.75} />
              <text x={ex(i) + EW / 2} y={e.pct >= 0 ? EY - e.pct * EK - 18 : EY - e.pct * EK + 36} textAnchor="middle"
                fill={hoje ? TEXTO : TEXTO_2} fontFamily={MONO} fontSize={hoje ? 46 : 26} opacity={rot}>{sinal(e.pct)}</text>
              <text x={ex(i) + EW / 2} y={1110} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={28} opacity={Math.min(1, p * 3)}>{e.ano}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// --- ranking geral: só dois dias foram piores -----------------------------------------------
const TOP3 = dados.top5.slice(0, 3);

const Ranking: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.ranking - 2, F.pergunta + 2, 6);
  if (o <= 0) return null;
  const max = TOP3[0].pct;
  const abre = entre(f, M.fixo, M.fixo + 12, Easing.out(Easing.back(1.6)));
  const racha = entre(f, M.crise, M.crise + 10);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="MAIORES ALTAS EM UM DIA" direita="DESDE 1999" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonRanking" desvio={4} /></defs>
        {TOP3.map((d, i) => {
          const y = 520 + i * 200;
          const alvo = d.data === dados.alvo.data;
          const p = entre(f, F.ranking + 4 + i * 8, F.ranking + 26 + i * 8, Easing.out(Easing.cubic));
          const desenho = entre(f, F.ranking + 12 + i * 8, F.ranking + 40 + i * 8);
          const larg = (d.pct / max) * 560 * p;
          return (
            <g key={d.data} opacity={Math.min(1, p * 2)}>
              <text x={X0} y={y} fill={alvo ? LARANJA : TEXTO} fontFamily={MONO} fontSize={36}>{i + 1}. {d.data}</text>
              <text x={X0} y={y + 40} fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={1}>{d.contexto}</text>
              <rect x={X0} y={y + 62} width={larg} height={18} fill={alvo ? LARANJA : TEXTO_2} opacity={alvo ? 1 : 0.6} />
              <text x={X0 + larg + 16} y={y + 80} fill={alvo ? LARANJA : TEXTO} fontFamily={MONO} fontSize={32}>+{br(d.pct)}%</text>
              <g transform={`translate(${X1 - 50} ${y + 26}) scale(1.6)`}>
                <Neon filtro="neonRanking" cor={alvo ? LARANJA : CIANO} largura={1.8}>
                  {i === 0 && <Cadeado p={desenho} abre={abre} />}
                  {i === 1 && <Banco p={desenho} racha={racha} />}
                  {alvo && <Urna p={desenho} />}
                </Neon>
              </g>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// --- histograma, curva normal, e a cauda em escala log --------------------------------------
const XMIN = -10, XMAX = 10, HY0 = 1110, HALT = 560;
const xPct = (v: number) => X0 + ((v - XMIN) / (XMAX - XMIN)) * (X1 - X0);
const BINS = dados.bins;
const NMAX = Math.max(...BINS.map((b) => b.n));
const LOG_PISO = 0.1;
const altura = (n: number, log: number) => {
  const lin = (n / NMAX) * HALT;
  const lg = n <= LOG_PISO ? 0 : ((Math.log10(n) - Math.log10(LOG_PISO)) / (Math.log10(NMAX) - Math.log10(LOG_PISO))) * HALT;
  return lin + (lg - lin) * log;
};
const normalEsperado = (v: number) =>
  dados.nRegime * dados.bin * Math.exp(-(((v - dados.media) / dados.dp) ** 2) / 2) / (dados.dp * Math.sqrt(2 * Math.PI));
const LIMITE = dados.limiteZ * dados.dp;
const CAUDA_ESQ = BINS.filter((b) => b.n > 0 && b.de + dados.bin / 2 < dados.media - LIMITE);
const CAUDA_DIR = BINS.filter((b) => b.n > 0 && b.de + dados.bin / 2 > dados.media + LIMITE);
const S_CAUDA = 2.1;

const Chave: React.FC<{ bins: typeof BINS; p: number }> = ({ bins, p }) => {
  const x0 = xPct(bins[0].de), x1 = xPct(bins[bins.length - 1].de + dados.bin);
  const y = HY0 - Math.max(...bins.map((b) => altura(b.n, 1))) - 30;
  return (
    <g>
      <Neon filtro="neonCurva" cor={LARANJA} largura={2}>
        <path d={`M${x0},${y + 14} V${y} H${x1} V${y + 14}`} {...traco(p)} />
      </Neon>
      <text x={(x0 + x1) / 2} y={y - 16} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={26} letterSpacing={3}
        opacity={entre(p, 0.6, 1)} {...CONTORNO}>CAUDA</text>
    </g>
  );
};

const Curva: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.pergunta - 2, F.palpite + 2, 6);
  if (o <= 0) return null;
  const barras = entre(f, F.pergunta, F.pergunta + 26, Easing.out(Easing.cubic));
  const curva = entre(f, M.chance - 4, M.chance + 34, Easing.inOut(Easing.quad));
  const sino = entre(f, M.chance, M.chance + 30) * (1 - entre(f, F.extremos - 6, F.extremos + 4));
  const marco = entre(f, M.normal - 4, M.normal + 8);
  const log = entre(f, F.extremos, F.extremos + 36, Easing.inOut(Easing.cubic));
  const destacaCauda = entre(f, M.impossiveis - 6, M.impossiveis + 6);
  const chaves = entre(f, M.pesada - 4, M.pesada + 18, Easing.out(Easing.quad));
  // "Modelo de risco...": a câmera entra na cauda da direita, onde a curva já está no chão.
  const s = 1 + (S_CAUDA - 1) * mola(f, M.modelo - 2, { damping: 16, stiffness: 110 });
  const cam = camera(s, S_CAUDA, [xPct(7.2), HY0 - 120], [520, 900]);
  const pontosCurva: string[] = [];
  for (let v = XMIN; v <= XMAX + 1e-9; v += 0.05) {
    const y = HY0 - altura(normalEsperado(v + dados.bin / 2), log);
    pontosCurva.push(`${xPct(v + dados.bin / 2).toFixed(1)},${y.toFixed(1)}`);
  }
  const passo = ((X1 - X0) / (XMAX - XMIN)) * dados.bin;
  const xa = xPct(dados.alvo.pct);
  const fCauda = f >= F.extremos;
  // números no terço de baixo
  const oEspera = Math.min(entre(f, M.normal + 2, M.normal + 8), 1 - entre(f, F.extremos - 4, F.extremos + 2));
  const anos = digitado("anos", f);
  const estoura = mola(f, M.quint - 1, { damping: 9, stiffness: 220 });
  const oExtremos = Math.min(entre(f, M.n18 - 4, M.n18), 1 - entre(f, F.palpite - 6, F.palpite));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP}
        esquerda={!fCauda ? "DIAS POR VARIAÇÃO" : `ALÉM DE ${dados.limiteZ} DESVIOS: ${dados.extremos}`}
        direita={!fCauda ? "- - CURVA NORMAL" : `PREVISTO: ${br(dados.esperadoNormal, 3)}`}
      />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilhoUS2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={8} /></filter>
          <FiltroNeon id="neonCurva" />
          <clipPath id="quadroCurva"><rect x={X0} y={HY0 - HALT - 20} width={(X1 - X0) * curva} height={HALT + 20} /></clipPath>
          <clipPath id="palcoCurva"><rect x={0} y={380} width={1080} height={810} /></clipPath>
        </defs>
        <g clipPath="url(#palcoCurva)">
          <g transform={cam.transform}>
            <g opacity={log}>
              {[1, 10, 100, 1000].map((n) => (
                <g key={n}>
                  <line x1={X0} x2={X1} y1={HY0 - altura(n, 1)} y2={HY0 - altura(n, 1)} stroke={TEXTO_2} strokeOpacity={0.15} vectorEffect="non-scaling-stroke" />
                  <text x={X0 - 10} y={HY0 - altura(n, 1) + 7} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={20 / s}>{n.toLocaleString("pt-BR")}</text>
                </g>
              ))}
            </g>
            {BINS.map((b) => {
              const centro = b.de + dados.bin / 2;
              const cauda = Math.abs(centro - dados.media) > LIMITE;
              const h = altura(b.n, log) * barras;
              if (h <= 0) return null;
              return <rect key={b.de} x={xPct(b.de) + 1} y={HY0 - h} width={passo - 2} height={h}
                fill={cauda && destacaCauda > 0 ? LARANJA : CIANO} opacity={cauda ? 0.55 + 0.45 * destacaCauda : 0.55} />;
            })}
            {curva > 0 && (
              <polyline points={pontosCurva.join(" ")} fill="none" stroke={TEXTO} strokeWidth={2.5} strokeDasharray="10 8" clipPath="url(#quadroCurva)" vectorEffect="non-scaling-stroke" />
            )}
            <line x1={X0} x2={X1} y1={HY0} y2={HY0} stroke={TEXTO_2} strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />
            {[-10, -5, 0, 5, 10].map((v) => (
              <text key={v} x={xPct(v)} y={HY0 + 40 / s} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24 / s}>{v > 0 ? "+" : v < 0 ? "−" : ""}{Math.abs(v)}%</text>
            ))}
            <g opacity={marco * (1 - entre(f, F.extremos, F.extremos + 10))}>
              <circle cx={xa} cy={HY0} r={24} fill={LARANJA} opacity={0.35} filter="url(#brilhoUS2)" />
              <circle cx={xa} cy={HY0} r={9} fill={LARANJA} />
              <line x1={xa} x2={xa} y1={HY0 - 12} y2={HY0 - 170} stroke={LARANJA} strokeWidth={2} strokeDasharray="4 6" />
              <text x={xa + 10} y={HY0 - 182} textAnchor="end" fill={LARANJA} fontFamily={MONO} fontSize={30} {...CONTORNO}>26/10</text>
            </g>
            {chaves > 0 && (
              <g>
                <Chave bins={CAUDA_ESQ} p={chaves} />
                <Chave bins={CAUDA_DIR} p={chaves} />
              </g>
            )}
          </g>
        </g>
        {sino > 0 && (
          <g opacity={sino}>
            <g transform={`translate(255 ${HY0 - 420})`}>
              <Neon filtro="neonCurva" cor={TEXTO} largura={2}><Sino p={sino} /></Neon>
            </g>
            <text x={255} y={HY0 - 360} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2}>CURVA DO SINO</text>
          </g>
        )}
        {s > 1.3 && (
          <g opacity={entre(s, 1.3, 1.8)} fontFamily={MONO} fontSize={26} letterSpacing={2}>
            <rect x={X0} y={420} width={22} height={22} fill={LARANJA} />
            <text x={X0 + 38} y={440} fill={TEXTO} {...CONTORNO}>DIAS QUE ACONTECERAM</text>
            <line x1={X0} x2={X0 + 24} y1={482} y2={482} stroke={TEXTO} strokeWidth={2.5} strokeDasharray="8 6" />
            <text x={X0 + 38} y={490} fill={TEXTO} {...CONTORNO}>CURVA NORMAL: QUASE ZERO</text>
          </g>
        )}
      </svg>
      <Heroi o={oEspera}>
        <div style={{ textAlign: "center", fontSize: 24, letterSpacing: 3, color: TEXTO_2 }}>PELA CURVA NORMAL, UMA VEZ A CADA</div>
        <div style={{
          textAlign: "center", fontSize: 56, marginTop: 8, color: estoura > 0 ? LARANJA : TEXTO, scale: `${1 + 0.14 * (1 - estoura) * (estoura > 0 ? 1 : 0)}`,
          textShadow: estoura > 0 ? `0 0 26px ${LARANJA}66` : undefined,
        }}>{anos.padEnd(26, " ")}</div>
        <div style={{ textAlign: "center", fontSize: 24, letterSpacing: 3, color: TEXTO_2, marginTop: 6, opacity: entre(f, M.quint, M.quint + 4) }}>ANOS</div>
      </Heroi>
      <Heroi o={oExtremos} top={1180}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 34 }}>
          <div style={{ fontSize: 150, lineHeight: 1, color: LARANJA, width: 190, textAlign: "right", textShadow: `0 0 30px ${LARANJA}55` }}>{digitado("18", f)}</div>
          <div style={{ fontSize: 30, letterSpacing: 2, lineHeight: 1.5 }}>
            <div>DIAS ALÉM DE 5 DESVIOS</div>
            <div style={{ color: TEXTO_2 }}>A CURVA PREVIA <span style={{ color: TEXTO }}>{digitado("previsto", f).padEnd(5, " ")}</span></div>
          </div>
        </div>
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
      <Img src={staticFile("ciencia/icone.png")} style={{ width: 64, height: 64 }} />
      <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO }}>SEGUE O CIÊNCIA VISUAL</div>
    </div>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/dolar/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/dolar/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Dolar: React.FC = () => (
  <Fundo>
    <Sismografo />
    <Ultimos />
    <Promessa />
    <Focus />
    <Eleicoes />
    <Ranking />
    <Curva />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-dolar.mjs: whoosh nas trocas, tiques nos números, riser no "quintilhões" */}
    <Audio src={staticFile("ciencia/trilha-dolar.mp3")} volume={0.3} />
  </Fundo>
);
