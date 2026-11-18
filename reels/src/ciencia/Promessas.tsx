import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./promessas.json";
import T from "./promessas-tempos.json";
import { Fundo, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon } from "./ilustra-dolar";

// O termômetro das promessas (abertura da COP31, 9/11/2026). Pelo Emissions Gap Report 2026 do
// Pnuma ("The Point of Return", 21/10): 2,6 °C com todas as NDCs cumpridas (o gancho), 2,8 °C com
// as políticas atuais, 2,1 °C com NDCs e metas de neutralidade, contra o 1,5 °C de Paris. A OMM
// entra numa frase (os últimos 12 anos são os mais quentes já medidos, atualização de 9/11).
// Os cortes de 18% e 45% só aparecem dentro do "cenário de menor ultrapassagem de 1,5 °C", com a
// tag na tela o tempo todo, nunca como meta geral.
//
// Embalagem (viralizacao.md, seção 8): um objeto só que se mexe (o mercúrio), texto no terço de
// baixo (legenda em y 1400, longe dos botões do IG); algo muda a cada 2 a 4s; o fim drena o
// mercúrio até o nível do quadro 0 pro loop emendar.
//
// Números: promessas.json (o tempos-promessas.mjs confere a fala contra ele). Tempos:
// promessas-tempos.json. A trilha (gerar-trilha-promessas.mjs) lê os mesmos tempos.
// O laranja é o mercúrio, a marca onde ele está e as palavras-chave; o ciano é o 1,5 de Paris.

export const PROMESSAS_TOTAL = T.total;
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
/** Quantos caracteres de um texto digitado já apareceram no quadro f. */
const digitado = (id: string, f: number) => {
  const d = T.digita.find((x) => x.id === id)!;
  if (f < d.de) return "";
  const passo = (d.ate - d.de) / d.texto.length;
  return d.texto.slice(0, Math.min(d.texto.length, Math.floor((f - d.de) / passo) + 1));
};

const cen = (id: string) => D.cenarios.find((c) => c.id === id)!;

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

const fonteDe = (f: number) =>
  f >= M.omm - 4 && f < F.atual ? "FONTE: OMM · ATUALIZAÇÃO DE 9/11/2026"
    : "FONTE: PNUMA/ONU · EMISSIONS GAP REPORT 2026";

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, textShadow: "0 0 10px rgba(5,7,12,1)" }}>
      {fonteDe(f)}
    </div>
  );
};

/** Tag de instrumento, centrada entre x0 e x0 + w. */
const Tag: React.FC<{ texto: string; top: number; o?: number; cor?: string; tam?: number; x0?: number; w?: number }> = ({
  texto, top, o = 1, cor = LARANJA, tam = 40, x0 = X0, w = 820,
}) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: x0, width: w, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ border: `3px solid ${cor}`, padding: "14px 24px", fontFamily: MONO, fontSize: tam, lineHeight: 1.2, letterSpacing: 2, color: cor, background: "rgba(5,7,12,0.86)", whiteSpace: "pre", textAlign: "center", minHeight: tam * 1.2 }}>{texto || " "}</div>
    </div>
  );

// --- o termômetro ---------------------------------------------------------------------------
// Escala de 0 a 3 °C acima de 1850–1900, sem cortar o eixo: o 0 é a era pré-industrial.
const TX = 250, YT = 470, Y0 = 1130, PX = (Y0 - YT) / 3;
const yDe = (c: number) => Y0 - c * PX;
const BULBO_Y = 1185, BULBO_R = 58, TUBO = 30, MERC = 14;
const V0 = 0.6; // nível do quadro 0 e do último quadro (o loop emenda aqui)
const LX = 410; // começo dos rótulos
const ROTULO_Y: Record<string, number> = { atual: 480, ndc: 595, otimista: 712, paris: 840 };
const DESCR: Record<string, string> = {
  atual: "POLÍTICAS ATUAIS · E SOBE DEPOIS",
  ndc: "TODAS AS PROMESSAS CUMPRIDAS",
  otimista: "PROMESSAS + NEUTRALIDADE",
  paris: "ACORDO DE PARIS",
};
// Quadro em que cada marca entra (a voz diz o número).
const ENTRA: Record<string, number> = { ndc: M.g26, atual: M.g28, otimista: M.g21, paris: M.g15 };

/** O nível do mercúrio no quadro f. */
const nivel = (f: number) => {
  const ndc = cen("ndc").c, atual = cen("atual").c, otim = cen("otimista").c;
  if (f >= FIM) return ndc + (V0 - ndc) * entre(f, FIM, T.total - 1, ioCubico);
  if (f >= F.pergunta - 6) return ndc; // a pergunta é sobre as promessas
  let v = V0 + (ndc - V0) * conta("sobe26", f);
  v += (atual - ndc) * conta("sobe28", f, ioCubico);
  v -= (atual - ndc) * entre(f, M.promessas - 2, M.promessas + 10, ioCubico);
  v -= (ndc - otim) * entre(f, M.neutralidade - 6, M.g21 + 4, ioCubico);
  return v;
};

/** A cena da OMM: o termômetro quase some atrás da grade dos 12 anos. */
const naOmm = (f: number) => janela(f, M.omm - 8, F.atual + 2, 10);

/** Opacidade do termômetro inteiro: some atrás da grade da OMM e na cena dos cortes. */
const presenca = (f: number) => {
  const omm = 1 - 0.94 * naOmm(f);
  const corte = 1 - janela(f, F.corte - 4, F.pergunta + 2, 10);
  return Math.min(omm, corte);
};

const Termometro: React.FC<{ f: number; capa?: boolean }> = ({ f, capa }) => {
  const v = capa ? cen("ndc").c : nivel(f);
  const yM = yDe(v);
  const yJ = BULBO_Y - Math.sqrt(BULBO_R ** 2 - TUBO ** 2); // onde o tubo encontra o bulbo
  const sai = capa ? 0 : entre(f, FIM - 8, FIM);
  const vis = (id: string) => (capa ? 1 : entre(f, ENTRA[id] - 2, ENTRA[id] + 6) * (1 - sai));
  const ativo = (c: number) => Math.abs(v - c) < 0.04;
  const linha15 = vis("paris");
  const chave = capa ? 0 : entre(f, M.otimista - 3, M.otimista + 6) * (1 - entre(f, F.corte - 6, F.corte)); // a distância até Paris
  const fantasma = capa ? 0 : entre(f, M.seguravam - 2, M.seguravam + 10) * (1 - sai);
  const interroga = capa ? 0 : mola(f, M.q15 - 2, { damping: 10, stiffness: 200 }) * (1 - sai);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonTermo" desvio={6} /></defs>
        {/* escala: marca a cada 0,1 °C, maior a cada 0,5 */}
        {Array.from({ length: 31 }, (_, i) => {
          const y = yDe(i / 10), longo = i % 5 === 0;
          return <line key={i} x1={TX - TUBO - (longo ? 24 : 12)} x2={TX - TUBO - 4} y1={y} y2={y} stroke={TEXTO_2} strokeOpacity={longo ? 0.8 : 0.45} strokeWidth={longo ? 2.5 : 1.5} />;
        })}
        {[0, 1, 2, 3].map((c) => (
          <text key={c} x={TX - TUBO - 34} y={yDe(c) + 9} textAnchor="end" fontFamily={MONO} fontSize={26} fill={TEXTO_2}>{c === 3 ? "3 °C" : c}</text>
        ))}
        {/* mercúrio: coluna e bulbo, com brilho */}
        <rect x={TX - MERC - 8} y={yM - 8} width={(MERC + 8) * 2} height={BULBO_Y - yM} fill={LARANJA} opacity={0.22} filter="url(#neonTermo)" />
        <rect x={TX - MERC} y={yM} width={MERC * 2} height={BULBO_Y - yM} fill={LARANJA} />
        <circle cx={TX} cy={BULBO_Y} r={BULBO_R - 14} fill={LARANJA} />
        <circle cx={TX} cy={BULBO_Y} r={BULBO_R - 4} fill={LARANJA} opacity={0.25} filter="url(#neonTermo)" />
        {/* o vidro */}
        <Neon filtro="neonTermo" cor={CIANO} largura={2.5}>
          <path d={`M${TX - TUBO},${yJ} V${YT - 30} A${TUBO},${TUBO} 0 0 1 ${TX + TUBO},${YT - 30} V${yJ} A${BULBO_R},${BULBO_R} 0 1 1 ${TX - TUBO},${yJ} Z`} />
        </Neon>
        {/* a pergunta: e se as promessas segurassem em 1,5? */}
        {/* o trecho acima de 1,5 vira contorno tracejado, de cima pra baixo: o que faltaria cortar */}
        {fantasma > 0 && yDe(cen("paris").c) > yM && (
          <rect x={TX - MERC - 3} y={yM - 3} width={(MERC + 3) * 2} height={(yDe(cen("paris").c) - yM) * fantasma + 3} fill={FUNDO} fillOpacity={0.62} stroke={CIANO} strokeWidth={2.5} strokeDasharray="8 7" opacity={fantasma} />
        )}
        {/* 1,5 de Paris: linha tracejada ciano atravessando o tubo */}
        {linha15 > 0 && (
          <line x1={TX - TUBO - 30} x2={TX + TUBO + 30} y1={yDe(1.5)} y2={yDe(1.5)} stroke={CIANO} strokeWidth={3} strokeDasharray="10 8" opacity={linha15} />
        )}
        {/* chaves de ligação: da marca no tubo até o rótulo */}
        {D.cenarios.map((c) => {
          const o = vis(c.id);
          if (o <= 0) return null;
          const y = yDe(c.c), yr = ROTULO_Y[c.id];
          const cor = c.id === "paris" ? CIANO : ativo(c.c) ? LARANJA : TEXTO_2;
          return <polyline key={c.id} points={`${TX + TUBO + 4},${y} ${TX + 62},${y} ${LX - 18},${yr} ${LX - 6},${yr}`} fill="none" stroke={cor} strokeWidth={2.5} opacity={o} />;
        })}
        {/* a distância do cenário mais otimista até Paris */}
        {chave > 0 && (
          <g opacity={chave} stroke={LARANJA} strokeWidth={3} fill="none">
            <path d={`M${TX + 64},${yDe(2.1) + 6} h10 V${yDe(1.5) - 6} h-10`} />
          </g>
        )}
      </svg>
      {chave > 0 && (
        <div style={{ position: "absolute", left: TX + 80, top: (yDe(2.1) + yDe(1.5)) / 2 - 18, opacity: chave, fontFamily: MONO, fontSize: 28, color: LARANJA, textShadow: "0 0 10px rgba(5,7,12,1)" }}>
          +{br(cen("otimista").c - cen("paris").c)}
        </div>
      )}
      {D.cenarios.map((c) => {
        const o = vis(c.id);
        if (o <= 0) return null;
        const quente = ativo(c.c) && c.id !== "paris";
        const cor = c.id === "paris" ? CIANO : quente ? LARANJA : TEXTO;
        const pulo = c.id === "paris" ? 1 + 0.12 * interroga : 1;
        return (
          <div key={c.id} style={{ position: "absolute", left: LX, top: ROTULO_Y[c.id] - 30, opacity: o, fontFamily: MONO, translate: `${(1 - entre(f, ENTRA[c.id] - 2, ENTRA[c.id] + 8, saida)) * (capa ? 0 : 24)}px 0` }}>
            <div style={{ fontSize: 58, lineHeight: "60px", color: cor, letterSpacing: -1, textShadow: quente ? `0 0 26px ${LARANJA}66` : "none", scale: `${pulo}`, transformOrigin: "left center", whiteSpace: "nowrap" }}>
              {br(c.c)} °C{c.id === "paris" && interroga > 0.05 ? <span style={{ opacity: Math.min(1, interroga) }}> ?</span> : null}
            </div>
            <div style={{ fontSize: 22, lineHeight: "30px", letterSpacing: 2, color: TEXTO_2, whiteSpace: "nowrap" }}>{DESCR[c.id]}</div>
          </div>
        );
      })}
      {/* leitura do instrumento, ao lado do bulbo (na capa, o título já diz o número) */}
      <div style={{ position: "absolute", left: 360, top: 1092, fontFamily: MONO, whiteSpace: "nowrap", opacity: capa ? 0 : 1 }}>
        <div style={{ fontSize: 112, lineHeight: 1, color: LARANJA, letterSpacing: -3, textShadow: `0 0 30px ${LARANJA}55` }}>{br(v)} °C</div>
        <div style={{ fontSize: 22, letterSpacing: 3, color: TEXTO_2, marginTop: 10 }}>AQUECIMENTO ATÉ 2100</div>
      </div>
    </>
  );
};

const CenaTermometro: React.FC = () => {
  const f = useCurrentFrame();
  const o = presenca(f);
  if (o <= 0) return null;
  const cop = janela(f, M.cop31 - 4, M.omm - 2, 6);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="TERMÔMETRO DAS PROMESSAS" direita="ATÉ 2100" opacidade={1 - naOmm(f)} />
      <div style={{ position: "absolute", top: 400, left: LX, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, opacity: 1 - naOmm(f) }}>°C ACIMA DE 1850–1900</div>
      <Termometro f={f} />
      <Tag texto={digitado("cop", f)} top={950} o={cop} tam={34} x0={360} w={580} cor={TEXTO} />
    </AbsoluteFill>
  );
};

// --- OMM: os 12 anos mais quentes já medidos -------------------------------------------------
const Omm: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, M.omm - 4, F.atual + 2, 8);
  if (o <= 0) return null;
  const { de, ate } = D.omm;
  const anos = Array.from({ length: ate - de + 1 }, (_, k) => de + k);
  const W = 180, H = 92, GAP = 14, COLS = 4, X = 540 - (COLS * W + (COLS - 1) * GAP) / 2, Y = 700;
  const todos = entre(f, M.quentes - 2, M.quentes + 8);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="OMM · ABERTURA DA COP31" direita="9/11/2026" />
      <Tag texto={digitado("omm", f)} top={540} tam={34} cor={TEXTO} />
      {anos.map((ano, k) => {
        const acende = entre(f, M.n12 - 6 + k * 2, M.n12 - 6 + k * 2 + 5);
        if (acende <= 0) return null;
        const col = k % COLS, lin = Math.floor(k / COLS);
        return (
          <div key={ano} style={{
            position: "absolute", left: X + col * (W + GAP), top: Y + lin * (H + GAP), width: W, height: H, opacity: acende,
            border: `2px solid ${CIANO}`, background: `rgba(92,225,255,${0.06 + 0.16 * todos})`, boxShadow: todos > 0 ? `0 0 ${18 * todos}px ${CIANO}55` : "none",
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 44, color: TEXTO, translate: `0 ${(1 - acende) * -12}px`,
          }}>{ano}</div>
        );
      })}
      <div style={{ position: "absolute", top: 1036, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: TEXTO, opacity: entre(f, M.n12, M.n12 + 8) }}>
        OS {D.omm.anos} MAIS QUENTES JÁ MEDIDOS
      </div>
    </AbsoluteFill>
  );
};

// --- os cortes, só dentro do cenário de menor ultrapassagem ------------------------------------
const BASE_Y = 650, ESC = 430 / 45; // px por ponto percentual
const GRUPOS = [{ cx: 335 }, { cx: 745 }];

const Cortes: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.corte - 2, F.pergunta + 2, 8);
  if (o <= 0) return null;
  const base = entre(f, M.emissoes - 4, M.emissoes + 8, saida);
  const sub = entre(f, M.ultrapassagem + 6, M.ultrapassagem + 14);
  const ndc = conta("ndc", f, ioCubico);
  const metade = entre(f, M.metade - 8, M.metade + 2);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="CORTE DE EMISSÕES" direita="SOBRE 2025" />
      <Tag texto={digitado("esc", f)} top={385} tam={38} />
      <div style={{ position: "absolute", top: 532, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: TEXTO_2, opacity: sub }}>
        PICO DE {br(D.pico[0])}–{br(D.pico[1])} °C · VOLTA A 1,5 ATÉ 2100
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0} x2={X0 + (X1 - X0) * base} y1={BASE_Y} y2={BASE_Y} stroke={TEXTO} strokeOpacity={0.8} strokeWidth={2.5} />
        {D.cortes.map((k, i) => {
          const { cx } = GRUPOS[i];
          const cresce = conta(i === 0 ? "b18" : "b45", f, ioCubico);
          const h = k.cenario * ESC * cresce;
          const h0 = k.ndc[0] * ESC * ndc, h1 = k.ndc[1] * ESC * ndc;
          const hm = (k.cenario / 2) * ESC;
          return (
            <g key={k.ano}>
              {h > 0 && <rect x={cx - 100} y={BASE_Y} width={92} height={h} fill={LARANJA} fillOpacity={0.24} stroke={LARANJA} strokeWidth={2.5} />}
              {ndc > 0 && (
                <>
                  <rect x={cx + 8} y={BASE_Y} width={92} height={h0} fill={CIANO} fillOpacity={0.5} />
                  <rect x={cx + 8} y={BASE_Y} width={92} height={h1} fill="none" stroke={CIANO} strokeWidth={2} strokeDasharray="6 6" />
                </>
              )}
              {metade > 0 && (
                <g opacity={metade}>
                  <line x1={cx - 108} x2={cx + 108} y1={BASE_Y + hm} y2={BASE_Y + hm} stroke={TEXTO} strokeWidth={2.5} strokeDasharray="5 6" />
                  <text x={cx - 114} y={BASE_Y + hm + 7} textAnchor="end" fontFamily={MONO} fontSize={20} letterSpacing={2} fill={TEXTO}>METADE</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", top: BASE_Y - 40, left: X0, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, opacity: base }}>NÍVEL DE 2025</div>
      {D.cortes.map((k, i) => {
        const { cx } = GRUPOS[i];
        const cresce = conta(i === 0 ? "b18" : "b45", f, ioCubico);
        const h = k.cenario * ESC * cresce;
        return (
          <div key={k.ano}>
            {cresce > 0 && (
              <div style={{ position: "absolute", left: cx - 54 - 100, width: 200, top: BASE_Y + h + 10, textAlign: "center", fontFamily: MONO, color: LARANJA, opacity: Math.min(1, cresce * 3) }}>
                <div style={{ fontSize: 52, lineHeight: 1, textShadow: `0 0 20px ${LARANJA}55` }}>−{Math.round(k.cenario * cresce)}%</div>
                <div style={{ fontSize: 20, letterSpacing: 2, color: TEXTO_2, marginTop: 6 }}>CENÁRIO</div>
              </div>
            )}
            {ndc > 0 && (
              // abaixo da linha da metade (que entra depois), pra nunca cruzar com ela
              <div style={{ position: "absolute", left: cx + 8, top: BASE_Y + (k.cenario / 2) * ESC + 14, fontFamily: MONO, color: CIANO, opacity: ndc, whiteSpace: "nowrap" }}>
                <div style={{ fontSize: 34, lineHeight: 1 }}>−{k.ndc[0]} A {k.ndc[1]}%</div>
                <div style={{ fontSize: 20, letterSpacing: 2, color: TEXTO_2, marginTop: 6 }}>PROMESSAS</div>
              </div>
            )}
            <div style={{ position: "absolute", left: cx - 150, width: 300, top: 1190, textAlign: "center", fontFamily: MONO, fontSize: 40, letterSpacing: 2, color: TEXTO, opacity: entre(f, (i === 0 ? M.a2030 : M.a2035) - 4, (i === 0 ? M.a2030 : M.a2035) + 4) }}>
              ATÉ {k.ano}
            </div>
          </div>
        );
      })}
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
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/promessas/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/promessas/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Promessas: React.FC = () => (
  <Fundo>
    <CenaTermometro />
    <Omm />
    <Cortes />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-promessas.mjs: whoosh nas trocas, tiques no mercúrio e nos números */}
    <Audio src={staticFile("ciencia/promessas/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
export const PromessasCapa: React.FC = () => (
  <Fundo>
    <div style={{ position: "absolute", top: 290, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2 }}>
      COP31 · EMISSIONS GAP 2026
    </div>
    <AbsoluteFill style={{ scale: "0.74", transformOrigin: "540px 380px" }}>
      <Termometro f={0} capa />
    </AbsoluteFill>
    <div style={{
      position: "absolute", top: 1080, left: 40, width: 1000, textAlign: "center",
      fontFamily: SORA, fontWeight: 300, fontSize: 88, lineHeight: 1.1, letterSpacing: -1.5, color: TEXTO,
      textShadow: "0 0 30px rgba(5,7,12,0.95)", whiteSpace: "nowrap",
    }}>
      <span style={{ color: LARANJA, fontSize: 132 }}>2,6 °C</span><br />mesmo com todas<br />as promessas
    </div>
  </Fundo>
);
