import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./apagao.json";
import T from "./apagao-tempos.json";
import { Fundo, Status, X0, entre, janela } from "./base";
import { CIANO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon } from "./ilustra-dolar";

// "Vai faltar luz em dezembro?" (12/11/2026). Começa pelo medo (a mensagem no celular) e responde
// logo: o apagão de 90 dias é boato (Lupa, Boatos.org, Exame). Depois, o estoque de verdade: a água
// dos reservatórios na base aberta do ONS em 10/11 (Sudeste/Centro-Oeste 55,2%, 43,9% um ano antes,
// 18,6% em 2021; Norte 57,2% contra 69,0%, mas com só 5% da capacidade). O ONS diz que o El Niño,
// sozinho, não ameaça o fornecimento; o que pode pesar é a bandeira, que a ANEEL decide em 27/11.
//
// O quadro 0 não tem número: só o celular vibrando com "Vai faltar luz em dezembro?". O "90 dias"
// entra digitado depois, e o carimbo FALSO cai em cima dele na palavra "falso".
//
// Números: apagao.json (gerar-apagao.py confere a fala contra os CSVs do ONS). Tempos:
// apagao-tempos.json. A trilha (gerar-trilha-apagao.mjs) lê os mesmos tempos.
// O laranja é o nível de hoje e as palavras-chave; o ciano é o vidro, a água e as marcas antigas.

export const APAGAO_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const FIM = T.fim;

const br = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");
const STATUS_TOP = 330;
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const ioCubico = Easing.inOut(Easing.cubic);
const saida = Easing.out(Easing.cubic);

const conta = (id: string, f: number, easing = saida) => {
  const c = T.contas.find((x) => x.id === id)!;
  return entre(f, c.de, c.ate, easing);
};
const digitado = (id: string, f: number) => {
  const d = T.digita.find((x) => x.id === id)!;
  if (f < d.de) return "";
  const passo = (d.ate - d.de) / d.texto.length;
  return d.texto.slice(0, Math.min(d.texto.length, Math.floor((f - d.de) / passo) + 1));
};

const SE = D.se as Record<string, number>;
const N = D.n as Record<string, number>;

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

const fonteDe = (f: number) => {
  if (f < F.origem - 2 || f >= FIM) return "";
  if (f < F.sudeste) return "CHECAGEM: LUPA · BOATOS.ORG · EXAME · MIDR";
  if (f < F.ons) return "DADOS: ONS · ENERGIA ARMAZENADA · 10/11 DE CADA ANO";
  if (f < F.bolso) return "FONTES: ONS · CMSE/MME (22/7/2026)";
  if (f < F.pergunta) return "FONTE: ANEEL · CALENDÁRIO DAS BANDEIRAS 2026";
  return "DADOS: ONS · 10/11/2026";
};

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  const t = fonteDe(f);
  if (!t) return null;
  return (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, textShadow: "0 0 10px rgba(5,7,12,1)" }}>
      {t}
    </div>
  );
};

const Tag: React.FC<{ texto: string; top: number; o?: number; cor?: string; tam?: number; x0?: number; w?: number }> = ({
  texto, top, o = 1, cor = LARANJA, tam = 40, x0 = X0, w = 820,
}) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: x0, width: w, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ border: `3px solid ${cor}`, padding: "14px 24px", fontFamily: MONO, fontSize: tam, lineHeight: 1.2, letterSpacing: 2, color: cor, background: "rgba(5,7,12,0.86)", whiteSpace: "pre", textAlign: "center", minHeight: tam * 1.2 }}>{texto || " "}</div>
    </div>
  );

// --- o celular (gancho, origem e o fim, que emenda no quadro 0) -----------------------------
// Mensagem genérica, sem marca de aplicativo nem perfil real: só um balão encaminhado.
const CW = 560, CH = 1000, CX = 540 - CW / 2, CY = 300;

const Celular: React.FC<{ f: number; volta?: boolean }> = ({ f, volta }) => {
  const treme = volta ? (f - FIM < 14 ? Math.sin((f - FIM) * 2.6) * 7 * (1 - (f - FIM) / 14) : 0)
    : f < 16 ? Math.sin(f * 2.6) * 7 * (1 - f / 16) : 0;
  const boato = volta ? "" : digitado("boato", f);
  const carimbo = volta ? 0 : mola(f, M.falso - 1, { damping: 9, stiffness: 220 });
  // na origem o celular sobe e encolhe pra dar lugar às três peças do boato
  const sobe = volta ? 0 : entre(f, F.origem - 4, F.origem + 10, ioCubico);
  return (
    <AbsoluteFill style={{ translate: `${treme}px ${24 * sobe}px`, scale: `${1 - 0.48 * sobe}`, transformOrigin: "540px 300px" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonCel" desvio={6} /></defs>
        <rect x={CX} y={CY} width={CW} height={CH} rx={44} fill="rgba(12,20,36,0.85)" />
        <Neon filtro="neonCel" cor={CIANO} largura={2.5}>
          <rect x={CX} y={CY} width={CW} height={CH} rx={44} />
          <line x1={540 - 60} x2={540 + 60} y1={CY + 30} y2={CY + 30} />
        </Neon>
        {/* ondas de vibração nas laterais */}
        {[0, 1, 2].map((k) => {
          const o = volta ? janela(f, FIM + k * 3, FIM + 18 + k * 3, 4) : janela(f, k * 3, 18 + k * 3, 4);
          return o > 0 ? (
            <g key={k} opacity={o} stroke={CIANO} strokeWidth={3} fill="none">
              <path d={`M${CX - 24 - k * 18},${CY + 180} q-14,40 0,80`} />
              <path d={`M${CX + CW + 24 + k * 18},${CY + 180} q14,40 0,80`} />
            </g>
          ) : null;
        })}
      </svg>
      <div style={{ position: "absolute", top: CY + 70, left: CX + 40, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>↪ ENCAMINHADA COM FREQUÊNCIA</div>
      <div style={{ position: "absolute", top: CY + 120, left: CX + 40, width: CW - 120, padding: "22px 26px", background: "rgba(232,244,255,0.08)", border: `2px solid ${TEXTO_2}`, fontFamily: SORA, fontSize: 46, lineHeight: 1.15, color: TEXTO }}>
        Vai faltar luz em dezembro?
      </div>
      {boato && (
        <div style={{ position: "absolute", top: CY + 330, left: CX + 80, width: CW - 120, padding: "22px 26px", background: "rgba(232,244,255,0.08)", border: `2px solid ${TEXTO_2}`, fontFamily: MONO, fontSize: 36, lineHeight: 1.25, color: TEXTO, whiteSpace: "pre-line", minHeight: 120 }}>
          ⚠ {boato}
        </div>
      )}
      {carimbo > 0 && (
        <div style={{
          position: "absolute", top: CY + 560, left: 0, width: 1080, display: "flex", justifyContent: "center",
          opacity: Math.min(1, carimbo * 2), scale: `${2.2 - 1.2 * carimbo}`, rotate: "-8deg",
        }}>
          <div style={{ border: `8px solid ${LARANJA}`, padding: "10px 40px", fontFamily: MONO, fontSize: 120, letterSpacing: 12, color: LARANJA, background: "rgba(5,7,12,0.7)", textShadow: `0 0 30px ${LARANJA}66` }}>FALSO</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const CenaCelular: React.FC = () => {
  const f = useCurrentFrame();
  const o = 1 - entre(f, F.sudeste - 6, F.sudeste + 2);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o }}><Celular f={f} /></AbsoluteFill>;
};

// As três peças que o boato juntou.
const PECAS = [
  { quando: "simpsons", titulo: "OS SIMPSONS", sub: "EPISÓDIO DE 2023 · APAGÃO SÓ EM SPRINGFIELD" },
  { quando: "teste", titulo: "TESTE DE ALERTA · EUA · 17/11", sub: "MENSAGEM DE TESTE · NÃO CORTA ENERGIA" },
  { quando: "kit", titulo: "KIT DE 72 HORAS · DEFESA CIVIL", sub: "SÓ PREVENÇÃO · SEM ALERTA NACIONAL (MIDR)" },
] as const;

const Origem: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.origem - 2, F.sudeste + 2, 8);
  if (o <= 0) return null;
  const prev = entre(f, M.prevencao - 2, M.prevencao + 6);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {PECAS.map((p, k) => {
          const e = entre(f, M[p.quando] - 3, M[p.quando] + 6, saida);
          const y = 860 + k * 165;
          // fio da peça até o celular
          return e > 0 ? <path key={k} d={`M${k % 2 ? 960 : 120},${y + 60} C${k % 2 ? 1010 : 70},${y - 120} ${540},${820} ${540},${790}`} fill="none" stroke={CIANO} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="6 8" opacity={e} /> : null;
        })}
      </svg>
      {PECAS.map((p, k) => {
        const e = entre(f, M[p.quando] - 3, M[p.quando] + 6, saida);
        if (e <= 0) return null;
        const quente = k === 2 && prev > 0;
        return (
          <div key={k} style={{
            position: "absolute", top: 860 + k * 165, left: 150, width: 780, padding: "18px 26px", opacity: e, translate: `${(1 - e) * (k % 2 ? 60 : -60)}px 0`,
            border: `2.5px solid ${quente ? CIANO : TEXTO_2}`, background: quente ? "rgba(92,225,255,0.10)" : "rgba(5,7,12,0.86)",
            fontFamily: MONO,
          }}>
            <div style={{ fontSize: 36, letterSpacing: 2, color: TEXTO }}>{p.titulo}</div>
            <div style={{ fontSize: 22, letterSpacing: 2, color: quente ? CIANO : TEXTO_2, marginTop: 8 }}>{p.sub}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// --- o reservatório ---------------------------------------------------------------------------
// Corte de um reservatório: de 0 a 100% da energia armazenável (EAR), sem cortar o eixo.
const RX = 200, RW = 680, RY = 560, RH = 620;
const yNivel = (pct: number) => RY + RH - (pct / 100) * RH;

const Agua: React.FC<{ f: number; pct: number; id: string; foto?: number }> = ({ f, pct, id, foto = 0 }) => {
  const y = yNivel(pct);
  const onda = Array.from({ length: 35 }, (_, i) => {
    const x = RX + (i / 34) * RW;
    return `${x},${y + Math.sin(i * 0.7 + f * 0.18) * 5}`;
  }).join(" ");
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <FiltroNeon id={`neon${id}`} desvio={6} />
        <clipPath id={`clip${id}`}><rect x={RX} y={RY - 20} width={RW} height={RH + 20} /></clipPath>
        <linearGradient id={`agua${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={CIANO} stopOpacity={0.34} />
          <stop offset="1" stopColor={CIANO} stopOpacity={0.12} />
        </linearGradient>
      </defs>
      {foto > 0 && (
        <image href={staticFile("ciencia/apagao/img/sobradinho.jpg")} x={RX} y={RY - 20} width={RW} height={RH + 20} preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip${id})`} opacity={0.62 * foto} />
      )}
      <polygon points={`${RX},${RY + RH} ${onda} ${RX + RW},${RY + RH}`} fill={`url(#agua${id})`} clipPath={`url(#clip${id})`} />
      <Neon filtro={`neon${id}`} cor={CIANO} largura={3}>
        <polyline points={onda} />
      </Neon>
      {/* paredes da represa */}
      <Neon filtro={`neon${id}`} cor={TEXTO} largura={2.5} opacidade={0.85}>
        <polyline points={`${RX - 6},${RY - 30} ${RX - 6},${RY + RH + 6} ${RX + RW + 6},${RY + RH + 6} ${RX + RW + 6},${RY - 30}`} />
      </Neon>
      {/* régua: 0, 25, 50, 75, 100% */}
      {[0, 25, 50, 75, 100].map((p) => (
        <g key={p}>
          <line x1={RX - 30} x2={RX - 10} y1={yNivel(p)} y2={yNivel(p)} stroke={TEXTO_2} strokeWidth={2} />
          <text x={RX - 38} y={yNivel(p) + 8} textAnchor="end" fontFamily={MONO} fontSize={22} fill={TEXTO_2}>{p}</text>
        </g>
      ))}
    </svg>
  );
};

/** Marca tracejada de um ano antigo, com rótulo dentro do reservatório, à direita. */
const Marca: React.FC<{ pct: number; texto: string; o: number; cor?: string }> = ({ pct, texto, o, cor = CIANO }) =>
  o <= 0 ? null : (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
        <line x1={RX + RW * 0.55} x2={RX + RW} y1={yNivel(pct)} y2={yNivel(pct)} stroke={cor} strokeWidth={3} strokeDasharray="12 9" />
      </svg>
      <div style={{ position: "absolute", top: yNivel(pct) - 44, right: 1080 - RX - RW + 14, opacity: o, fontFamily: MONO, fontSize: 30, letterSpacing: 2, color: cor, textShadow: "0 0 12px rgba(5,7,12,1)" }}>{texto}</div>
    </>
  );

/** Leitura grande do nível de hoje. */
const Leitura: React.FC<{ pct: number; rotulo: string; o?: number }> = ({ pct, rotulo, o = 1 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: RX + 30, top: Math.min(yNivel(pct) - 178, RY + RH - 200), opacity: o, fontFamily: MONO, whiteSpace: "nowrap" }}>
      <div style={{ fontSize: 120, lineHeight: 1, color: LARANJA, letterSpacing: -3, textShadow: `0 0 30px ${LARANJA}55` }}>{br(pct)}%</div>
      <div style={{ fontSize: 22, letterSpacing: 3, color: TEXTO_2, marginTop: 8 }}>{rotulo}</div>
    </div>
  );

/** Nível do Sudeste/Centro-Oeste no quadro f. */
const nivelSE = (f: number) => {
  const hoje = SE["2026"], v21 = SE["2021"];
  let v = hoje * conta("enche55", f, ioCubico);
  v -= (hoje - v21) * conta("desce21", f, ioCubico);
  v += (hoje - v21) * conta("volta55", f, ioCubico);
  return v;
};

const CenaSudeste: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.max(janela(f, F.sudeste - 2, F.norte + 4, 8), janela(f, F.pergunta - 4, FIM + 2, 8));
  if (o <= 0) return null;
  const naPergunta = f >= F.pergunta - 4;
  const pct = naPergunta ? SE["2026"] : nivelSE(f);
  const em21 = naPergunta ? 0 : janela(f, M.a2021 - 4, F.norte - 10, 8);
  const foto = naPergunta ? 0 : janela(f, M.crise - 6, F.norte - 12, 10);
  const m25 = naPergunta ? entre(f, M.vazios - 4, M.vazios + 6) : entre(f, M.ano - 2, M.ano + 6) * (1 - entre(f, F.norte - 8, F.norte));
  // a leitura grande só aparece com o nível parado no valor de hoje: nada de número intermediário com "HOJE"
  const leitura = naPergunta ? 1 : Math.abs(pct - SE["2026"]) < 0.05 ? entre(f, M.p55 - 2, M.p55 + 4) * (1 - em21) : 0;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="SUDESTE/CENTRO-OESTE" direita="10/11" />
      <div style={{ position: "absolute", top: 400, left: X0, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>% DA ÁGUA QUE CABE NOS RESERVATÓRIOS</div>
      <div style={{ position: "absolute", top: 470, left: X0, fontFamily: MONO, fontSize: 28, letterSpacing: 2, color: CIANO, opacity: entre(f, M.hidreletricas - 4, M.hidreletricas + 6) * (naPergunta ? 0 : 1) }}>
        {f < M.p70 ? "HIDRELÉTRICAS" : `${br(D.fatia.SE, 0)}% DA CAPACIDADE DO PAÍS`}
      </div>
      <Agua f={f} pct={pct} id="se" foto={foto} />
      <Leitura pct={pct} rotulo={naPergunta ? "10/11/2026" : "HOJE · 10/11/2026"} o={leitura} />
      <Marca pct={SE["2025"]} texto={`2025 · ${br(SE["2025"])}%`} o={m25} />
      <Marca pct={SE["2021"]} texto={`2021 · ${br(SE["2021"])}%`} o={em21} cor={LARANJA} />
      {em21 > 0 && (
        <div style={{ position: "absolute", top: yNivel(55) - 30, left: RX + 30, opacity: em21, fontFamily: MONO, fontSize: 34, letterSpacing: 2, color: TEXTO, textShadow: "0 0 14px rgba(5,7,12,1)" }}>
          CRISE HÍDRICA
        </div>
      )}
      {foto > 0 && (
        <div style={{ position: "absolute", top: RY + RH + 22, left: RX - 6, width: RW + 12, opacity: foto, fontFamily: MONO, fontSize: 18, lineHeight: 1.5, letterSpacing: 1.5, color: TEXTO_2 }}>
          FOTO: SOBRADINHO (BA), SECA DE DEZ/2015 · MARCELLO CASAL JR/<br />AGÊNCIA BRASIL · CC BY 3.0 BR · ILUSTRA UM RESERVATÓRIO BAIXO
        </div>
      )}
      {naPergunta && (
        <div style={{ position: "absolute", top: yNivel(SE["2025"]) + 20, right: 1080 - RX - RW + 14, fontFamily: MONO, fontSize: 64, color: CIANO, opacity: mola(f, M.passado - 2, { damping: 10, stiffness: 200 }) }}>?</div>
      )}
    </AbsoluteFill>
  );
};

// --- o Norte -------------------------------------------------------------------------------
const CenaNorte: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.norte - 4, F.ons + 2, 8);
  if (o <= 0) return null;
  const pct = N["2025"] + (N["2026"] - N["2025"]) * conta("norte57", f, ioCubico);
  const m25 = entre(f, M.p69 - 2, M.p69 + 6);
  const serie = entre(f, M.cheio - 6, M.cheio + 6) * (1 - entre(f, M.p5 - 8, M.p5));
  // em "5%": os dois reservatórios lado a lado, com área proporcional à capacidade
  const enc = entre(f, M.p5 - 6, M.p5 + 10, ioCubico);
  const kSE = 0.62, kN = kSE * Math.sqrt(D.fatia.N / D.fatia.SE);
  const escN = 1 - (1 - kN) * enc;
  const cxN = 540 + (800 - 540) * enc;
  const anos = ["2021", "2022", "2023", "2024", "2025", "2026"];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="NORTE" direita="10/11" />
      {/* o Norte: escala e posição animadas em torno do centro do reservatório */}
      <AbsoluteFill style={{ scale: `${escN}`, translate: `${cxN - 540}px ${(RY + RH - 1180) * enc}px`, transformOrigin: `540px ${RY + RH}px` }}>
        <Agua f={f} pct={pct} id="n" />
        <Marca pct={N["2025"]} texto={`2025 · ${br(N["2025"])}%`} o={m25 * (1 - enc)} />
        <Leitura pct={pct} rotulo="HOJE · 10/11/2026" o={Math.abs(pct - N["2026"]) < 0.05 ? entre(f, M.p57, M.p57 + 6) * (1 - enc) : 0} />
      </AbsoluteFill>
      {/* o Sudeste entra do lado, na mesma escala de área */}
      {enc > 0 && (
        <AbsoluteFill style={{ opacity: enc, scale: `${kSE}`, translate: `${330 - 540}px 0px`, transformOrigin: `540px ${RY + RH}px` }}>
          <Agua f={f} pct={SE["2026"]} id="se2" />
        </AbsoluteFill>
      )}
      {enc > 0 && (
        <>
          <div style={{ position: "absolute", top: RY + RH + 26, left: 330 - 220, width: 440, textAlign: "center", opacity: enc, fontFamily: MONO, color: TEXTO }}>
            <div style={{ fontSize: 34 }}>SE/CO · {br(D.fatia.SE, 0)}%</div>
            <div style={{ fontSize: 20, letterSpacing: 2, color: TEXTO_2, marginTop: 6 }}>DA CAPACIDADE</div>
          </div>
          <div style={{ position: "absolute", top: RY + RH + 26, left: 800 - 160, width: 320, textAlign: "center", opacity: enc, fontFamily: MONO, color: LARANJA }}>
            <div style={{ fontSize: 34 }}>NORTE · {br(D.fatia.N, 0)}%</div>
            <div style={{ fontSize: 20, letterSpacing: 2, color: TEXTO_2, marginTop: 6 }}>DA CAPACIDADE</div>
          </div>
        </>
      )}
      {/* os seis anos do Norte em 10/11 */}
      {serie > 0 && (
        <div style={{ position: "absolute", top: RY + RH + 30, left: RX, width: RW, display: "flex", justifyContent: "space-between", alignItems: "flex-end", opacity: serie }}>
          {anos.map((a, k) => {
            const v = N[a], h = (v / 70) * 110 * entre(f, M.cheio - 6 + k * 2, M.cheio + 4 + k * 2, saida);
            const cor = a === "2025" ? CIANO : a === "2026" ? LARANJA : TEXTO_2;
            return (
              <div key={a} style={{ width: 92, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: MONO }}>
                <div style={{ fontSize: 22, color: cor, marginBottom: 6 }}>{br(v, 0)}</div>
                <div style={{ width: 52, height: h, background: cor, opacity: a === "2025" || a === "2026" ? 0.9 : 0.5 }} />
                <div style={{ fontSize: 20, color: TEXTO_2, marginTop: 6 }}>{a}</div>
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

// --- ONS: El Niño e as térmicas ---------------------------------------------------------------
const CenaOns: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.ons - 2, F.bolso + 2, 8);
  if (o <= 0) return null;
  const gw = 1.8 * conta("gw", f);
  const g = entre(f, M.g18 - 6, M.g18 + 2);
  const raio = entre(f, M.queda - 4, M.queda + 6);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="OPERADOR DO SISTEMA" direita="ONS" />
      <Tag texto={digitado("ons", f)} top={420} tam={36} cor={TEXTO} />
      {g > 0 && (
        <div style={{ position: "absolute", top: 640, width: "100%", textAlign: "center", opacity: g, fontFamily: MONO }}>
          <div style={{ fontSize: 150, lineHeight: 1, color: LARANJA, letterSpacing: -4, textShadow: `0 0 30px ${LARANJA}55` }}>+{br(gw)} GW</div>
          <div style={{ fontSize: 26, letterSpacing: 3, color: TEXTO, marginTop: 18 }}>TÉRMICAS ANTECIPADAS PARA 1º/9</div>
          <div style={{ fontSize: 20, letterSpacing: 2, color: TEXTO_2, marginTop: 10 }}>CMSE, POR RECOMENDAÇÃO DO ONS · 5 USINAS</div>
        </div>
      )}
      {raio > 0 && (
        <>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: raio }}>
            <defs><FiltroNeon id="neonRaio" desvio={5} /></defs>
            <Neon filtro="neonRaio" cor={CIANO} largura={4}>
              <polyline points="560,1010 515,1095 555,1095 505,1190" strokeDasharray={300} strokeDashoffset={300 * (1 - raio)} />
            </Neon>
          </svg>
          <Tag texto={digitado("queda", f)} top={1215} tam={30} cor={CIANO} />
        </>
      )}
    </AbsoluteFill>
  );
};

// --- a conta de luz ---------------------------------------------------------------------------
const CenaBolso: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.bolso - 2, F.pergunta + 2, 8);
  if (o <= 0) return null;
  const card = entre(f, F.bolso - 2, F.bolso + 8, saida);
  const nov = entre(f, M.aneel - 4, M.aneel + 6);
  const dez = entre(f, M.dezembroB - 4, M.dezembroB + 6);
  const dia = Math.round(12 + (27 - 12) * conta("dias", f, ioCubico));
  const fim27 = mola(f, M.d27 - 2, { damping: 10, stiffness: 200 });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="CONTA DE LUZ" direita="ANEEL" />
      <div style={{ position: "absolute", top: 450, left: 150, width: 780, height: 620, border: `2.5px solid ${TEXTO_2}`, background: "rgba(12,20,36,0.7)", opacity: card, translate: `0 ${(1 - card) * 30}px`, fontFamily: MONO }}>
        <div style={{ padding: "28px 36px", fontSize: 26, letterSpacing: 3, color: TEXTO_2, borderBottom: `2px dashed ${TEXTO_2}` }}>BANDEIRA TARIFÁRIA</div>
        <div style={{ padding: "34px 36px 0", display: "flex", justifyContent: "space-between", opacity: nov }}>
          <span style={{ fontSize: 40, color: TEXTO }}>NOVEMBRO</span>
          <span style={{ fontSize: 40, color: CIANO }}>VERDE</span>
        </div>
        <div style={{ padding: "8px 36px 0", fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: nov }}>SEM CUSTO EXTRA · ANEEL, 30/10</div>
        <div style={{ padding: "50px 36px 0", display: "flex", justifyContent: "space-between", opacity: dez }}>
          <span style={{ fontSize: 40, color: TEXTO }}>DEZEMBRO</span>
          <span style={{ fontSize: 40, color: LARANJA }}>?</span>
        </div>
        <div style={{ padding: "8px 36px 0", fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: dez }}>A ANEEL DECIDE NO DIA</div>
        <div style={{ position: "absolute", bottom: 40, width: "100%", textAlign: "center", opacity: dez }}>
          <span style={{ display: "inline-block", fontSize: 110, color: LARANJA, scale: `${1 + 0.08 * fim27}`, textShadow: `0 0 26px ${LARANJA}55` }}>{String(dia).padStart(2, "0")}/11</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- fecho: o celular volta (loop) e o CTA escrito ----------------------------------------------
const Volta: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, FIM - 6, FIM + 4);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o, background: `rgba(5,7,12,${0.9 * o})` }}><Celular f={f} volta /></AbsoluteFill>;
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

const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/apagao/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Apagao: React.FC = () => (
  <Fundo>
    <CenaCelular />
    <Origem />
    <CenaSudeste />
    <CenaNorte />
    <CenaOns />
    <CenaBolso />
    <Volta />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-apagao.mjs: vibração, carimbo, gotas, whoosh nas trocas */}
    <Audio src={staticFile("ciencia/apagao/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
// Padrão das capas de 12/11: rótulo mono no topo do recorte (y 300), elemento forte no meio,
// título Sora 400 de 150 px com a base em y 1600, uma palavra em laranja.
// O elemento é o mesmo carimbo FALSO do vídeo, sobre o boato do apagão mundial de 90 dias.
export const ApagaoCapa: React.FC = () => (
  <Fundo>
    <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 34, letterSpacing: 6, color: TEXTO_2 }}>BOATO DO APAGÃO MUNDIAL</div>
    <div style={{ position: "absolute", top: 470, width: "100%", display: "flex", justifyContent: "center", rotate: "-8deg" }}>
      <div style={{ border: `14px solid ${LARANJA}`, padding: "18px 56px", fontFamily: MONO, fontSize: 210, letterSpacing: 18, color: LARANJA, background: "rgba(5,7,12,0.7)", textShadow: `0 0 40px ${LARANJA}77`, boxShadow: `0 0 50px ${LARANJA}44, inset 0 0 40px ${LARANJA}22` }}>FALSO</div>
    </div>
    <div style={{ position: "absolute", top: 940, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: TEXTO_2 }}>CHECAGEM: LUPA · BOATOS.ORG · EXAME · MIDR</div>
    <div style={{ position: "absolute", bottom: 320, left: 40, width: 1000, textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 150, lineHeight: 1.04, letterSpacing: -4, color: TEXTO }}>
      Apagão de<br /><span style={{ color: LARANJA, textShadow: `0 0 40px ${LARANJA}66` }}>90 dias?</span>
    </div>
  </Fundo>
);
