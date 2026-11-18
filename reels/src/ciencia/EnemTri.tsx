import { AbsoluteFill, Audio, Easing, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { Img } from "remotion";
import D from "./enem-tri.json";
import T from "./enem-tri-tempos.json";
import { Fundo, entre } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";

// "Mesmos acertos, notas diferentes": dois candidatos reais do ENEM 2025, na mesma prova de Matemática,
// com 10 acertos válidos cada (sem os 2 itens anulados). Um tirou 319,4, o outro 569,6.
//   gancho   os dois lado a lado: 10 acertos = 10 acertos, 319,4 ≠ 569,6 (já no quadro 0, números reais)
//   domingo  "não é quantas, é quais": as duas fileiras de 43 questões, da fácil à difícil
//   regua    a régua da TRI (como a Figura 8 do guia do INEP): as 43 questões válidas pela dificuldade
//            (parâmetro b); quem tirou 569,6 acertou as 5 mais fáceis; quem tirou 319,4 errou as 21 mais fáceis
//   tri      os acertos difíceis de quem tirou 319,4 viram "chute?" e encolhem (valem menos)
//   escala   histograma das 267.971 notas de quem fez 10 acertos: 319,3 a 569,6, 250 pontos
//   inep     o recado do guia: questão em branco é corrigida como errada; acerto sempre soma
//   pergunta "E com 15 acertos, que nota você acha que dá?" e volta pro quadro 0
//
// Números: enem-tri.json (scripts/gerar-enem-tri.mjs, que confere cada número da fala contra a conta).
// Tempos: enem-tri-tempos.json (scripts/tempos-enem-tri.mjs). Nenhum dado que identifique os candidatos.

export const ENEM_TRI_TOTAL = T.total;
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

const Etiqueta: React.FC<{ texto: string; o: number; top?: number; cor?: string }> = ({ texto, o, top = 250, cor = TEXTO_2 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: 60, width: 960, textAlign: "center", opacity: o, fontFamily: MONO, fontSize: 28, letterSpacing: 3, color: cor, whiteSpace: "pre-line", lineHeight: 1.4 }}>{texto}</div>
  );

/** Visto de acerto, desenhado em traço fino. */
const Visto: React.FC<{ x: number; y: number; s?: number; cor?: string; o?: number }> = ({ x, y, s = 1, cor = CIANO, o = 1 }) => (
  <path d={`M ${x - 11 * s} ${y} L ${x - 3 * s} ${y + 9 * s} L ${x + 13 * s} ${y - 11 * s}`} fill="none" stroke={cor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={o} style={{ filter: `drop-shadow(0 0 6px ${cor})` }} />
);

// --- 1. os dois candidatos (quadro 0 e o fim, pro loop) ----------------------------------------------------
const COL = [290, 790]; // centro das colunas: 319,4 à esquerda (dito primeiro), 569,6 à direita

const Dupla: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM;
  const o = noFim ? entre(f, FIM, FIM + 10) : visivel(f, 0, C.dupla.ate, 4);
  if (o <= 0) return null;
  const pB = noFim ? 0 : mola(f, M.n319 - 2, { damping: 10, stiffness: 220 });
  const pA = noFim ? 0 : mola(f, M.n570 - 2, { damping: 10, stiffness: 220 });
  const pulso = (k: number) => 0.55 + 0.45 * Math.max(0, Math.sin((f / 30) * 4 - k * 0.55)); // o brilho já correndo no quadro 0
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"ENEM 2025 · MATEMÁTICA\nMESMA PROVA, 2 CANDIDATOS REAIS"} o={1} />
      {[0, 1].map((c) => (
        <div key={c} style={{ position: "absolute", top: 440, left: COL[c] - 230, width: 460, textAlign: "center", fontFamily: MONO, fontSize: 44, letterSpacing: 4, color: TEXTO }}>10 ACERTOS</div>
      ))}
      <div style={{ position: "absolute", top: 440, left: 500, width: 80, textAlign: "center", fontFamily: MONO, fontSize: 52, color: TEXTO_2 }}>=</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[0, 1].map((c) => Array.from({ length: 10 }, (_, k) => {
          const x = COL[c] - 171 + (k % 5) * 85.5, y = 560 + Math.floor(k / 5) * 52;
          return <Visto key={`${c}-${k}`} x={x} y={y} o={pulso(k + c * 2)} />;
        }))}
      </svg>
      <div style={{ position: "absolute", top: 745, left: COL[0] - 260, width: 520, textAlign: "center", fontFamily: MONO, fontSize: 128, letterSpacing: -4, color: TEXTO, scale: `${1 + 0.1 * pB * (1 - entre(f, M.n319 + 8, M.n319 + 20))}`, textShadow: `0 0 30px ${TEXTO}33` }}>{br(D.notaBaixa)}</div>
      <div style={{ position: "absolute", top: 745, left: COL[1] - 260, width: 520, textAlign: "center", fontFamily: MONO, fontSize: 128, letterSpacing: -4, color: LARANJA, scale: `${1 + 0.1 * pA * (1 - entre(f, M.n570 + 8, M.n570 + 20))}`, textShadow: `0 0 34px ${LARANJA}88` }}>{br(D.notaAlta)}</div>
      <div style={{ position: "absolute", top: 755, left: 500, width: 80, textAlign: "center", fontFamily: MONO, fontSize: 90, color: TEXTO_2 }}>≠</div>
      <div style={{ position: "absolute", top: 930, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2 }}>NOTA EM MATEMÁTICA</div>
    </AbsoluteFill>
  );
};

// --- 2. domingo: não é quantas, é quais ---------------------------------------------------------------
const Fileira: React.FC<{ y: number; acertos: number[]; aceso: number; rotulo: string; cor: string }> = ({ y, acertos, aceso, rotulo, cor }) => (
  <>
    {Array.from({ length: D.nItens }, (_, k) => {
      const ok = acertos.includes(k + 1);
      return <circle key={k} cx={120 + k * 20} cy={y} r={ok ? 7 : 5} fill={ok && aceso > 0 ? cor : "none"} fillOpacity={ok ? aceso : 0} stroke={ok && aceso > 0 ? cor : TEXTO_2} strokeOpacity={ok ? 0.5 + 0.5 * aceso : 0.45} strokeWidth={2} />;
    })}
    <text x={540} y={y - 26} textAnchor="middle" fontFamily={MONO} fontSize={26} letterSpacing={3} fill={cor}>{rotulo}</text>
  </>
);

const Domingo: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.domingo.de, C.domingo.ate);
  if (o <= 0) return null;
  const q = entre(f, M.quais - 4, M.quais + 4);
  const aceso = entre(f, M.quais - 2, M.quais + 14);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"DOMINGO, 15/11 · 2º DIA DO ENEM\nNATUREZA E MATEMÁTICA"} o={1} />
      <div style={{ position: "absolute", top: 480, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 112, letterSpacing: -2, color: TEXTO, translate: `0 ${(1 - entre(f, C.domingo.de, C.domingo.de + 10, saida)) * 20}px` }}>Não é quantas.</div>
      <div style={{ position: "absolute", top: 620, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 130, letterSpacing: -2, color: LARANJA, opacity: q, scale: `${0.9 + 0.1 * q}`, textShadow: `0 0 36px ${LARANJA}77` }}>É quais.</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Fileira y={960} acertos={D.ordAlta} aceso={aceso} rotulo={`${br(D.notaAlta)} · 10 ACERTOS`} cor={CIANO} />
        <Fileira y={1090} acertos={D.ordBaixa} aceso={aceso} rotulo={`${br(D.notaBaixa)} · 10 ACERTOS`} cor={TEXTO} />
        <text x={120} y={1160} fontFamily={MONO} fontSize={24} letterSpacing={3} fill={TEXTO_2}>← MAIS FÁCEIS</text>
        <text x={960} y={1160} textAnchor="end" fontFamily={MONO} fontSize={24} letterSpacing={3} fill={TEXTO_2}>MAIS DIFÍCEIS →</text>
      </svg>
    </AbsoluteFill>
  );
};

// --- 3 e 4. a régua da TRI -------------------------------------------------------------------------------
const Y_BOT = 1280, Y_TOP = 450; // a questão mais fácil embaixo, a mais difícil em cima (como a Figura 8 do guia)
const yDe = (k: number) => Y_BOT - ((k - 1) * (Y_BOT - Y_TOP)) / (D.nItens - 1);
const XA = 330, XB = 750; // coluna de quem tirou 569,6 (A) e de quem tirou 319,4 (B)

const Regua: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.regua.de, C.regua.ate);
  if (o <= 0) return null;
  const naTri = f >= F.tri - 4;
  const linha = (k: number) => entre(f, C.regua.de + 2 + (k - 1) * 0.55, C.regua.de + 8 + (k - 1) * 0.55);
  const acendeA = (i: number) => entre(f, M.alta + 4 + i * 1.5, M.alta + 10 + i * 1.5);
  const acendeB = (i: number) => entre(f, M.baixa + 4 + i * 1.5, M.baixa + 10 + i * 1.5);
  const cincoA = entre(f, M.cinco - 2, M.cinco + 8);
  const erros = entre(f, M.errou - 2, M.errou + 10) * (1 - 0.6 * entre(f, F.tri - 4, F.tri + 6));
  const chute = entre(f, M.chute - 3, M.chute + 6);
  const menos = entre(f, M.valem - 2, M.valem + 12, saida);
  const seta = entre(f, M.sabe, M.facilT + 6, saida);
  const cab = entre(f, C.regua.de, C.regua.de + 10);
  const ordA = [...D.ordAlta].sort((a, b) => a - b), ordB = [...D.ordBaixa].sort((a, b) => a - b);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={naTri ? "COERÊNCIA DAS RESPOSTAS · GUIA DO INEP" : "AS 43 QUESTÕES VÁLIDAS · DIFICULDADE DA TRI"} o={cab} top={232} />
      {/* cabeçalho das colunas */}
      <div style={{ position: "absolute", top: 300, left: XA - 170, width: 340, textAlign: "center", fontFamily: MONO, opacity: cab }}>
        <div style={{ fontSize: 64, color: CIANO, letterSpacing: -1, textShadow: `0 0 24px ${CIANO}55` }}>{br(D.notaAlta)}</div>
        <div style={{ fontSize: 22, letterSpacing: 3, color: TEXTO_2, marginTop: 2 }}>10 ACERTOS</div>
      </div>
      <div style={{ position: "absolute", top: 300, left: XB - 170, width: 340, textAlign: "center", fontFamily: MONO, opacity: cab }}>
        <div style={{ fontSize: 64, color: TEXTO, letterSpacing: -1 }}>{br(D.notaBaixa)}</div>
        <div style={{ fontSize: 22, letterSpacing: 3, color: TEXTO_2, marginTop: 2 }}>10 ACERTOS</div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="regua" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={CIANO} stopOpacity={0.25} />
            <stop offset="1" stopColor={CIANO} stopOpacity={0.9} />
          </linearGradient>
        </defs>
        {/* a régua no meio */}
        <rect x={536} y={Y_TOP - 12} width={8} height={(Y_BOT - Y_TOP + 24) * entre(f, C.regua.de, C.regua.de + 26, saida)} fill="url(#regua)" opacity={0.5} transform={`rotate(180 540 ${(Y_TOP + Y_BOT) / 2})`} />
        <text x={540} y={Y_TOP - 26} textAnchor="middle" fontFamily={MONO} fontSize={26} letterSpacing={4} fill={TEXTO} opacity={entre(f, M.dificil - 4, M.dificil + 4)}>DIFÍCIL</text>
        <text x={540} y={Y_BOT + 50} textAnchor="middle" fontFamily={MONO} fontSize={26} letterSpacing={4} fill={TEXTO} opacity={entre(f, M.facil - 4, M.facil + 4)}>FÁCIL</text>
        {Array.from({ length: D.nItens }, (_, j) => {
          const k = j + 1, y = yDe(k), l = linha(k);
          const iA = ordA.indexOf(k), iB = ordB.indexOf(k);
          const a = iA >= 0 ? acendeA(iA) : 0, b = iB >= 0 ? acendeB(iB) : 0;
          const brilhoA = iA >= 0 && k <= 5 ? cincoA : 0;
          const sB = iB >= 0 ? 1 - 0.45 * menos : 1;
          return (
            <g key={k} opacity={l}>
              <line x1={528} x2={552} y1={y} y2={y} stroke={TEXTO_2} strokeWidth={2} opacity={0.6} />
              <circle cx={XA} cy={y} r={7 + 2 * a + 2 * brilhoA} fill={a > 0 ? CIANO : "none"} fillOpacity={a} stroke={a > 0 ? CIANO : TEXTO_2} strokeOpacity={0.4 + 0.6 * a} strokeWidth={2} style={brilhoA > 0 ? { filter: `drop-shadow(0 0 ${10 * brilhoA}px ${CIANO})` } : undefined} />
              <circle cx={XB} cy={y} r={(7 + 2 * b) * sB} fill={b > 0 ? TEXTO : "none"} fillOpacity={b * (1 - 0.5 * menos)} stroke={b > 0 ? TEXTO : TEXTO_2} strokeOpacity={0.4 + 0.6 * b * (1 - 0.4 * menos)} strokeWidth={2} />
              {k <= 21 && erros > 0 && (
                <g opacity={entre(f, M.errou - 2 + (k - 1) * 0.5, M.errou + 4 + (k - 1) * 0.5) * erros}>
                  <line x1={XB + 22} y1={y - 6} x2={XB + 34} y2={y + 6} stroke={LARANJA} strokeWidth={3} strokeLinecap="round" />
                  <line x1={XB + 34} y1={y - 6} x2={XB + 22} y2={y + 6} stroke={LARANJA} strokeWidth={3} strokeLinecap="round" />
                </g>
              )}
              {iB >= 0 && chute > 0 && (
                <text x={XB + 26} y={y + 9} fontFamily={MONO} fontSize={26} fill={LARANJA} opacity={chute}>?</text>
              )}
            </g>
          );
        })}
        {/* chave das 5 mais fáceis de A */}
        <g opacity={cincoA * (1 - entre(f, F.tri - 6, F.tri + 4))}>
          <path d={`M ${XA - 34} ${yDe(1) + 10} L ${XA - 44} ${yDe(1) + 10} L ${XA - 44} ${yDe(5) - 10} L ${XA - 34} ${yDe(5) - 10}`} fill="none" stroke={CIANO} strokeWidth={3} />
          <text x={XA - 58} y={yDe(3) - 6} textAnchor="end" fontFamily={MONO} fontSize={26} letterSpacing={2} fill={CIANO}>AS 5 MAIS</text>
          <text x={XA - 58} y={yDe(3) + 26} textAnchor="end" fontFamily={MONO} fontSize={26} letterSpacing={2} fill={CIANO}>FÁCEIS</text>
        </g>
        {/* chave das 21 mais fáceis que B errou */}
        <g opacity={erros}>
          <path d={`M ${XB + 52} ${yDe(1) + 10} L ${XB + 62} ${yDe(1) + 10} L ${XB + 62} ${yDe(21) - 10} L ${XB + 52} ${yDe(21) - 10}`} fill="none" stroke={LARANJA} strokeWidth={3} />
          {["ERROU", "AS 21", "MAIS", "FÁCEIS"].map((t, i) => (
            <text key={t} x={XB + 76} y={yDe(21) + 18 + i * 34} fontFamily={MONO} fontSize={28} letterSpacing={2} fill={LARANJA}>{t}</text>
          ))}
        </g>
        {/* TRI: quem sabe o difícil deveria saber o fácil */}
        {seta > 0 && (
          <g opacity={1 - entre(f, M.valem + 20, M.valem + 30) * 0.4}>
            <path d={`M ${XB - 40} ${yDe(26)} C ${XB - 120} ${yDe(20)}, ${XB - 120} ${yDe(12)}, ${XB - 50} ${yDe(4)}`} fill="none" stroke={TEXTO} strokeWidth={3} strokeDasharray={600} strokeDashoffset={600 * (1 - seta)} />
            <path d={`M ${XB - 50} ${yDe(4)} l -4 -22 M ${XB - 50} ${yDe(4)} l -22 -6`} stroke={TEXTO} strokeWidth={3} strokeLinecap="round" opacity={entre(seta, 0.85, 1)} />
          </g>
        )}
      </svg>
      {chute > 0 && (
        <div style={{ position: "absolute", top: yDe(42) - 22, left: XB + 70, width: 250, fontFamily: MONO, fontSize: 30, letterSpacing: 2, color: LARANJA, opacity: chute, lineHeight: 1.25 }}>CHUTE?</div>
      )}
      {menos > 0 && (
        <div style={{ position: "absolute", top: yDe(35) - 10, left: XB + 70, width: 250, fontFamily: MONO, fontSize: 28, letterSpacing: 2, color: TEXTO, opacity: menos, lineHeight: 1.3 }}>VALEM<br />MENOS</div>
      )}
    </AbsoluteFill>
  );
};

// --- 5. o histograma das 267.971 notas -------------------------------------------------------------------
const HX0 = 130, HX1 = 950, HBASE = 1230, HALT = 470;
const N0 = 310, N1 = 570;
const xNota = (n: number) => HX0 + ((n - N0) / (N1 - N0)) * (HX1 - HX0);
const NMAX = Math.max(...D.hist.map((b) => b.n));

const Hist: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.hist.de, C.hist.ate);
  if (o <= 0) return null;
  const conta = T.contas.find((c) => c.id === "c268")!;
  const v = D.pessoas10 * entre(f, conta.de, conta.ate, saida);
  const chave = entre(f, M.variou, M.n250 + 4, saida);
  const marca250 = mola(f, M.n250 - 2, { damping: 11, stiffness: 200 });
  const bw = (HX1 - HX0) / D.hist.length;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto="ENEM 2025 · MATEMÁTICA · 10 ACERTOS VÁLIDOS" o={1} top={232} />
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 120, letterSpacing: -3, color: TEXTO, opacity: entre(f, conta.de - 6, conta.de) }}>{milhar(v)}</div>
      <div style={{ position: "absolute", top: 450, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO_2, opacity: entre(f, conta.de - 6, conta.de) }}>PESSOAS · CADA BARRA, 10 PONTOS DE NOTA</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {D.hist.map((b, i) => {
          const h = (b.n / NMAX) * HALT * entre(f, C.hist.de + 2 + i * 0.7, C.hist.de + 14 + i * 0.7, saida);
          const pontas = i === 0 || i === D.hist.length - 1;
          return <rect key={b.de} x={HX0 + i * bw + 3} y={HBASE - h} width={bw - 6} height={h} fill={CIANO} opacity={pontas ? 0.95 : 0.55} />;
        })}
        <line x1={HX0} x2={HX1} y1={HBASE} y2={HBASE} stroke={TEXTO_2} strokeWidth={2} />
        {[350, 400, 450, 500, 550].map((n) => (
          <g key={n}>
            <line x1={xNota(n)} x2={xNota(n)} y1={HBASE} y2={HBASE + 12} stroke={TEXTO_2} strokeWidth={2} />
            <text x={xNota(n)} y={HBASE + 44} textAnchor="middle" fontFamily={MONO} fontSize={26} fill={TEXTO_2}>{n}</text>
          </g>
        ))}
        {/* 319,3 a 569,6: a chave dos 250 pontos */}
        <g opacity={chave}>
          <line x1={xNota(D.min10)} x2={xNota(D.min10)} y1={HBASE} y2={660} stroke={TEXTO} strokeWidth={2} strokeDasharray="6 8" />
          <line x1={xNota(D.max10)} x2={xNota(D.max10)} y1={HBASE} y2={660} stroke={LARANJA} strokeWidth={2} strokeDasharray="6 8" />
          <line x1={xNota(D.min10)} x2={xNota(D.min10) + (xNota(D.max10) - xNota(D.min10)) * chave} y1={660} y2={660} stroke={LARANJA} strokeWidth={4} style={{ filter: `drop-shadow(0 0 8px ${LARANJA})` }} />
          <text x={xNota(D.min10) + 14} y={712} fontFamily={MONO} fontSize={32} fill={TEXTO}>{br(D.min10)}</text>
          <text x={xNota(D.max10) - 14} y={712} textAnchor="end" fontFamily={MONO} fontSize={32} fill={LARANJA}>{br(D.max10)}</text>
        </g>
      </svg>
      <div style={{ position: "absolute", top: 560, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 64, color: LARANJA, opacity: entre(f, M.n250 - 3, M.n250 + 3), scale: `${0.85 + 0.15 * marca250}`, textShadow: `0 0 28px ${LARANJA}88, ${SOMBRA_TXT}` }}>250 PONTOS</div>
    </AbsoluteFill>
  );
};

// --- 6. o recado do INEP -----------------------------------------------------------------------------------
const Bolhas: React.FC<{ y: number; marcada?: number; o: number }> = ({ y, marcada, o }) => (
  <g opacity={o}>
    {["A", "B", "C", "D", "E"].map((l, i) => {
      const x = 170 + i * 104, m = marcada === i;
      return (
        <g key={l}>
          <circle cx={x} cy={y} r={34} fill={m ? CIANO : "none"} stroke={m ? CIANO : TEXTO_2} strokeWidth={3} style={m ? { filter: `drop-shadow(0 0 10px ${CIANO})` } : undefined} />
          <text x={x} y={y + 10} textAnchor="middle" fontFamily={MONO} fontSize={28} fill={m ? FUNDO : TEXTO_2}>{l}</text>
        </g>
      );
    })}
  </g>
);

const Inep: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.inep.de, C.inep.ate);
  if (o <= 0) return null;
  const l1 = entre(f, M.soma - 8, M.soma);
  const l2 = entre(f, M.branco - 4, M.branco + 4);
  const err = entre(f, M.erro - 4, M.erro + 4);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", top: 260, left: 100, width: 880, textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 58, lineHeight: 1.2, color: TEXTO, opacity: entre(f, C.inep.de, C.inep.de + 10) }}>
        “Sempre é melhor responder à questão do que a deixar <span style={{ color: LARANJA, fontWeight: 400 }}>em branco</span>.”
      </div>
      <div style={{ position: "absolute", top: 560, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: TEXTO_2, opacity: entre(f, C.inep.de + 6, C.inep.de + 16) }}>INEP · ENTENDA A SUA NOTA NO ENEM · P. 16</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Bolhas y={800} marcada={2} o={entre(f, M.branco - 10, M.branco)} />
        <Bolhas y={1000} o={l2} />
      </svg>
      <div style={{ position: "absolute", top: 770, left: 720, width: 300, fontFamily: MONO, fontSize: 30, letterSpacing: 2, color: CIANO, opacity: l1, lineHeight: 1.25 }}>ACERTO:<br />SEMPRE SOMA</div>
      <div style={{ position: "absolute", top: 970, left: 720, width: 300, fontFamily: MONO, fontSize: 30, letterSpacing: 2, color: LARANJA, opacity: err, lineHeight: 1.25 }}>EM BRANCO:<br />CONTA ERRADA</div>
    </AbsoluteFill>
  );
};

// --- 7. a pergunta -----------------------------------------------------------------------------------------
const Pergunta15: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.pergunta.de, C.pergunta.ate);
  if (o <= 0) return null;
  const p = mola(f, M.n15 - 2, { damping: 11, stiffness: 200 });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto="ENEM 2025 · MATEMÁTICA" o={1} />
      <div style={{ position: "absolute", top: 440, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 130, letterSpacing: -2, color: TEXTO, scale: `${0.85 + 0.15 * p}` }}>15 ACERTOS</div>
      <div style={{ position: "absolute", top: 640, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 64, letterSpacing: 4, color: TEXTO_2 }}>NOTA =</div>
      <div style={{ position: "absolute", top: 720, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 220, color: LARANJA, textShadow: `0 0 40px ${LARANJA}88`, opacity: 0.6 + 0.4 * Math.abs(Math.sin(f / 9)) }}>?</div>
    </AbsoluteFill>
  );
};

// --- legenda e pergunta -----------------------------------------------------------------------------------
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
      position: "absolute", top: 1060, left: 60, width: 960, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 92, lineHeight: 1.14, letterSpacing: -1, color: TEXTO,
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
  const o = f < FIM ? 1 : 0;
  return (
    <div style={{ position: "absolute", top: 1330, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: o * (f >= C.regua.de - 6 && f < C.regua.ate ? 0 : 0.8) * (1 - entre(f, C.pergunta.de - 6, C.pergunta.de)) }}>
      MICRODADOS ENEM 2025 (INEP) · CONTA NOSSA, SEM OS 2 ITENS ANULADOS
    </div>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/enem-tri/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/enem-tri/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const EnemTri: React.FC = () => (
  <Fundo>
    <Domingo />
    <Regua />
    <Hist />
    <Inep />
    <Pergunta15 />
    <Dupla />
    <Fonte />
    <PerguntaFinal />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-enem-tri.mjs: colchão, whoosh nas cenas, tiques na régua e no histograma */}
    <Audio src={staticFile("ciencia/enem-tri/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
// Padrão das capas de 12/11: rótulo mono no topo do recorte (y 300), elemento forte no meio,
// título Sora 400 de 150 px com a base em y 1600, uma palavra em laranja.
// Os números são os dois candidatos reais (319,4 e 569,6, arredondados a 319 e 570). As duas
// fileiras são as 43 questões válidas da fácil à difícil, com os 10 acertos de cada um (ordBaixa/ordAlta).
export const EnemTriCapa: React.FC = () => {
  const CEL = 22.4, L = 1080 / 2 - (D.nItens * CEL) / 2;
  const Fileira: React.FC<{ top: number; acertos: number[]; cor: string; nota: string }> = ({ top, acertos, cor, nota }) => (
    <>
      <div style={{ position: "absolute", top, left: L, fontFamily: MONO, fontSize: 32, letterSpacing: 3, color: cor }}>10 ACERTOS → NOTA {nota}</div>
      {Array.from({ length: D.nItens }, (_, i) => {
        const ok = acertos.includes(i + 1);
        return <div key={i} style={{ position: "absolute", top: top + 56, left: L + i * CEL, width: CEL - 5, height: 120, background: ok ? cor : "transparent", border: ok ? "none" : `2px solid ${TEXTO_2}55`, boxShadow: ok ? `0 0 18px ${cor}88` : undefined }} />;
      })}
    </>
  );
  return (
    <Fundo>
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 34, letterSpacing: 6, color: TEXTO_2 }}>ENEM 2025 · MATEMÁTICA</div>
      <Fileira top={430} acertos={D.ordAlta} cor={LARANJA} nota={br(D.notaAlta)} />
      <Fileira top={660} acertos={D.ordBaixa} cor={CIANO} nota={br(D.notaBaixa)} />
      <div style={{ position: "absolute", top: 860, left: L, width: D.nItens * CEL - 5, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: TEXTO_2 }}>
        <span>← QUESTÕES FÁCEIS</span><span>DIFÍCEIS →</span>
      </div>
      <div style={{ position: "absolute", bottom: 320, left: 40, width: 1000, textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 150, lineHeight: 1.04, letterSpacing: -4, color: TEXTO }}>
        10 acertos:<br />{Math.round(D.notaBaixa)} ou <span style={{ color: LARANJA, textShadow: `0 0 40px ${LARANJA}66` }}>{Math.round(D.notaAlta)}?</span>
      </div>
    </Fundo>
  );
};
