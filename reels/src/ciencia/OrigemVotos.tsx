import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./origem-votos.json";
import T from "./origem-votos-tempos.json";
import { COR_FLAVIO, COR_LULA, FOTO_FLAVIO, FOTO_LULA } from "./Apuracao";
import { Fundo, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";

// "De onde vieram os votos do 2º turno" (31/10/2026). Em três semanas o Lula ganhou 10,4 milhões
// de votos e o Flávio 3,7. Os 14.098.232 votos que entraram na disputa fecham voto a voto em três
// torneiras (eliminados, comparecimento, branco e nulo). Quanto de cada torneira foi pra cada um é
// estimativa de saldo: o voto é secreto, e o que dá pra fazer é comparar 499 mil seções. Fecha com
// onde a margem mudou (Sudeste 43%, Nordeste 38%) e com os dois subindo quase em todo lugar.
//
// Embalagem (viralizacao.md, seção 8): o quadro 0 já tem os dois retratos com os contadores
// correndo; palco de dados no meio e todo texto no terço de baixo (y 1170–1550); legenda
// sincronizada, 2 a 4 palavras, chave em laranja; algo muda a cada 2 a 4s; uma pergunta abre a
// segunda metade; o fim volta aos contadores subindo pra emendar no quadro 0.
//
// Números: origem-votos.json (scripts/gerar-origem-votos.mjs, que confere cada número da fala).
// Tempos: origem-votos-tempos.json (scripts/tempos-origem-votos.mjs). A trilha
// (scripts/gerar-trilha-origem-votos.mjs) lê os mesmos tempos.
//
// Tema político: Lula e Flávio aparecem sempre juntos e com o mesmo tamanho (ParRetratos), com a
// convenção de cor do VotoNulo; os eliminados, com o mesmo recorte, o mesmo tamanho e o mesmo aro
// branco. Laranja é só o foco de cada cena. A tag ESTIMATIVA fica na tela durante todo o trecho
// estimado. Nenhuma causa, nenhum adjetivo sobre candidato, região ou eleitor. Fotos: origem em
// reels/public/ciencia/fotos-origem.md; a fila sai em preto e branco pra nenhuma roupa virar sinal.

export const ORIGEM_VOTOS_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const foto = (n: string) => staticFile(`ciencia/origem-votos/fotos/${n}.jpg`);

const CONTORNO = { stroke: FUNDO, strokeWidth: 8, paintOrder: "stroke" as const };
const STATUS_TOP = 330;
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const limita = (v: number) => Math.min(1, Math.max(0, v));
const ioCubico = Easing.inOut(Easing.cubic);
const G0 = T.grande[0].f; // primeira palavra da pergunta final
const VOLTA = T.total - T.retorno; // os contadores recomeçam: daqui até o fim emenda no quadro 0
const W = X1 - X0;
const milhoes = (n: number, casas = 1) => `${br(n / 1e6, casas)} MI`;
const inteiro = (n: number) => n.toLocaleString("pt-BR");

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
  // o 1º bloco já está inteiro no quadro 0
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

/** Faixa do número grande, logo acima da legenda (entre x 130 e 950, longe dos botões). */
const Heroi: React.FC<{ o: number; children: React.ReactNode; top?: number }> = ({ o, children, top = 1195 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: X0, width: 820, opacity: o, fontFamily: MONO, color: TEXTO, textAlign: "center" }}>{children}</div>
  );

const Rotulo: React.FC<{ children: React.ReactNode; cor?: string; tam?: number }> = ({ children, cor = TEXTO_2, tam = 26 }) => (
  <div style={{ fontSize: tam, letterSpacing: 2, color: cor, marginTop: 12 }}>{children}</div>
);

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  const comFotos = (f >= M.tres && f < M.secreto) || (f >= F.voltou && f < F.virada);
  const urna = f >= M.secreto && f < M.comparando;
  const texto = comFotos ? "FOTOS: TSE · PEDRO FRANÇA/AGÊNCIA SENADO (CC BY 2.0)" : urna ? "FOTO: TSE" : "FONTE: TSE · BOLETINS DE URNA · 1º E 2º TURNOS DE 2026";
  return (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: TEXTO_2 }}>
      {texto}
    </div>
  );
};

// --- retratos ---------------------------------------------------------------------------------

const Retrato: React.FC<{ src: string; cx: number; cy: number; lado: number; cor: string; aro?: number; o?: number; escala?: number }> = ({ src, cx, cy, lado, cor, aro = 5, o = 1, escala = 1 }) => (
  <Img src={src} style={{
    position: "absolute", left: cx - lado / 2, top: cy - lado / 2, width: lado, height: lado, opacity: o, scale: `${escala}`,
    borderRadius: "50%", objectFit: "cover", boxSizing: "border-box", border: `${aro}px solid ${cor}`, boxShadow: `0 0 26px ${cor}66`,
  }} />
);

/** Lula e Flávio entram sempre por aqui: juntos, com o mesmo tamanho. */
const ParRetratos: React.FC<{ cy: number; cyF?: number; lado: number; xL: number; xF: number; o?: number; escala?: number; aro?: number }> = ({ cy, cyF = cy, lado, xL, xF, o = 1, escala = 1, aro }) => (
  <>
    <Retrato src={FOTO_LULA} cx={xL} cy={cy} lado={lado} cor={COR_LULA} o={o} escala={escala} aro={aro} />
    <Retrato src={FOTO_FLAVIO} cx={xF} cy={cyF} lado={lado} cor={COR_FLAVIO} o={o} escala={escala} aro={aro} />
  </>
);

// --- placar: gancho, soma e a volta do fim ----------------------------------------------------
const PARTE_L = D.conta.dLula / D.conta.total, PARTE_F = D.conta.dFlavio / D.conta.total;
const POUSO = M.dez + 8; // os contadores chegam ao valor final quando a voz diz "10 milhões"
const XL = 300, XF = 780;
const BARRA_Y = 985, BARRA_H = 80;
const X_DIV = X0 + W * PARTE_L;

/** Contadores no instante τ: o fim usa τ de −45 a −1 e o começo de 0 em diante, então emendam. */
const conta = (tau: number) => Easing.out(Easing.quad)(limita((tau + T.retorno) / (T.retorno + POUSO)));

const BarraDisputa: React.FC<{ p: number; o: number; rotulo74: number; rotulo26: number; y?: number; h?: number }> = ({ p, o, rotulo74, rotulo26, y = BARRA_Y, h = BARRA_H }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
    <rect x={X0} y={y} width={Math.max(0, W * PARTE_L * p - 2)} height={h} fill={COR_LULA} fillOpacity={0.85} />
    <rect x={X1 - W * PARTE_F * p + 2} y={y} width={Math.max(0, W * PARTE_F * p - 2)} height={h} fill={COR_FLAVIO} fillOpacity={0.9} />
    <text x={X0 + (X_DIV - X0) / 2} y={y + h / 2 + 15} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={46} opacity={rotulo74}>74%</text>
    <text x={X_DIV + (X1 - X_DIV) / 2} y={y + h / 2 + 15} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={46} opacity={rotulo26}>26%</text>
  </svg>
);

const Placar: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= VOLTA - 6;
  if (!noFim && f > M.secreto + 8) return null;
  const tau = noFim ? Math.min(f - T.total, -T.retorno + Math.max(0, f - VOLTA)) : f;
  const p = noFim && f < VOLTA ? 0 : conta(tau);
  const oTopo = noFim ? entre(f, VOLTA - 6, VOLTA + 2) : 1 - entre(f, M.tres - 6, M.tres + 6);
  const oBarra = noFim ? oTopo : 1 - entre(f, M.secreto - 3, M.secreto + 5);
  const pulsoL = noFim ? 0 : mola(f, POUSO - 2, { damping: 8, stiffness: 240 }) * (1 - entre(f, POUSO + 4, POUSO + 18));
  const pulsoF = noFim ? 0 : mola(f, M.f37 - 2, { damping: 8, stiffness: 240 }) * (1 - entre(f, M.f37 + 6, M.f37 + 22));
  const hero14 = noFim ? 0 : Math.min(entre(f, M.t14 - 4, M.t14), 1 - entre(f, M.tres - 6, M.tres + 2));
  const titulo = noFim ? entre(f, VOLTA, VOLTA + 8) : 1 - entre(f, F.soma + 2, F.soma + 10);
  const rot74 = noFim ? 0 : entre(f, M.p74 - 3, M.p74 + 3), rot26 = noFim ? 0 : entre(f, M.p26 - 3, M.p26 + 3);
  return (
    <>
      <AbsoluteFill style={{ opacity: oTopo }}>
        <Status top={STATUS_TOP} esquerda="DO 1º PRO 2º TURNO" direita="3 SEMANAS" />
        <ParRetratos cy={590} lado={320} xL={XL} xF={XF} />
        {[
          { x: XL, nome: "LULA", v: D.conta.dLula, cor: COR_LULA, pulso: pulsoL },
          { x: XF, nome: "FLÁVIO", v: D.conta.dFlavio, cor: COR_FLAVIO, pulso: pulsoF },
        ].map((c) => (
          <div key={c.nome} style={{ position: "absolute", left: c.x - 230, top: 762, width: 460, textAlign: "center", fontFamily: MONO, color: TEXTO }}>
            <div style={{ fontSize: 34, letterSpacing: 4, color: TEXTO_2 }}>{c.nome}</div>
            <div style={{ fontSize: 86, lineHeight: 1.18, scale: `${1 + 0.1 * c.pulso}`, textShadow: `0 0 ${10 + 26 * c.pulso}px ${c.cor}` }}>+{milhoes(c.v * p)}</div>
          </div>
        ))}
      </AbsoluteFill>
      <BarraDisputa p={p} o={oBarra} rotulo74={rot74} rotulo26={rot26} />
      <Heroi o={titulo} top={1205}>
        <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 64, letterSpacing: -0.5, lineHeight: 1.1 }}>De onde vieram <span style={{ color: LARANJA }}>os votos?</span></div>
      </Heroi>
      <Heroi o={hero14}>
        <div style={{ fontSize: 96, lineHeight: 1, color: TEXTO }}>14 MILHÕES</div>
        <Rotulo>DE VOTOS ENTRARAM NA DISPUTA</Rotulo>
      </Heroi>
    </>
  );
};

// --- as três torneiras ------------------------------------------------------------------------
const CARD_W = 256, CARD_Y = 412, CARD_FOTO = 164;
const BANDA_Y = 900, BANDA_H = 44;
const PARTES = [D.conta.eliminados, D.conta.dComp, D.conta.dBN].map((v) => v / D.conta.total);
const TORNEIRAS = [
  { de: M.n93, x: X0, numero: milhoes(D.conta.eliminados), rotulo: ["DOS", "ELIMINADOS"], alfa: 0.92, a: 0 },
  { de: M.n3, x: X0 + 277, numero: milhoes(D.conta.dComp), rotulo: ["A MAIS DE", "COMPARECIMENTO"], alfa: 0.62, a: PARTES[0] },
  { de: M.n18, x: X0 + 554, numero: milhoes(D.conta.dBN), rotulo: ["A MENOS DE", "BRANCO E NULO"], alfa: 0.38, a: PARTES[0] + PARTES[1] },
];
const ELIMINADOS_2X2 = ["cury", "caiado", "renan", "zema"];

const Moldura: React.FC<{ src: string; x: number; y: number; w: number; h: number; pb?: boolean; o?: number; empurra?: number; posicao?: string }> = ({ src, x, y, w, h, pb, o = 1, empurra = 0, posicao = "50% 50%" }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden", opacity: o, boxSizing: "border-box", border: `1.5px solid ${CIANO}66` }}>
    <Img src={src} style={{
      width: "100%", height: "100%", objectFit: "cover", objectPosition: posicao, scale: `${1 + 0.07 * empurra}`,
      filter: pb ? "grayscale(1) contrast(1.08) brightness(0.86)" : undefined,
    }} />
  </div>
);

const Torneiras: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, M.tres - 4, M.secreto + 2, 6);
  if (o <= 0) return null;
  const fecha = entre(f, M.fecha - 4, M.fecha + 6);
  const hero = Math.min(entre(f, M.n14 + 2, M.n14 + 6), 1 - entre(f, M.qual - 4, M.qual + 2));
  const q = mola(f, M.qual + 2, { damping: 10, stiffness: 180 });
  const apaga = 1 - 0.72 * entre(f, M.qual - 2, M.qual + 8);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="AS TRÊS TORNEIRAS" direita={f >= M.qual ? "QUAL ENCHEU QUEM?" : "EM VOTOS"} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {TORNEIRAS.map((t, k) => {
          const p = entre(f, t.de, t.de + 22, Easing.out(Easing.cubic));
          if (p <= 0) return null;
          const a = X0 + W * t.a, b = a + W * PARTES[k] - 3;
          const cx = t.x + CARD_W / 2, w0 = 38;
          const y0 = 716, y1 = BANDA_Y, ym = (y0 + y1) / 2;
          const d = `M${cx - w0},${y0} C${cx - w0},${ym} ${a},${ym} ${a},${y1} L${b},${y1} C${b},${ym} ${cx + w0},${ym} ${cx + w0},${y0} Z`;
          const fluxo = `M${cx},${y0} C${cx},${ym} ${(a + b) / 2},${ym} ${(a + b) / 2},${y1}`;
          const fluxoE = `M${cx - w0 * 0.55},${y0} C${cx - w0 * 0.55},${ym} ${a + (b - a) * 0.22},${ym} ${a + (b - a) * 0.22},${y1}`;
          const fluxoD = `M${cx + w0 * 0.55},${y0} C${cx + w0 * 0.55},${ym} ${a + (b - a) * 0.78},${ym} ${a + (b - a) * 0.78},${y1}`;
          return (
            <g key={k} opacity={apaga}>
              <defs><clipPath id={`desce${k}`}><rect x={0} y={y0} width={1080} height={(y1 - y0) * p} /></clipPath></defs>
              <g clipPath={`url(#desce${k})`}>
                <path d={d} fill={CIANO} fillOpacity={0.13 + 0.07 * t.alfa} />
                {[fluxoE, fluxo, fluxoD].map((c) => (
                  <path key={c} d={c} fill="none" stroke={CIANO} strokeOpacity={0.75} strokeWidth={3} strokeLinecap="round" strokeDasharray="3 20" strokeDashoffset={-f * 2.6} />
                ))}
              </g>
              <rect x={a} y={BANDA_Y} width={(b - a) * entre(p, 0.55, 1)} height={BANDA_H} fill={CIANO} fillOpacity={t.alfa} />
            </g>
          );
        })}
      </svg>
      {/* "Três torneiras": as três molduras já aparecem vazias, e cada uma enche no seu número */}
      {TORNEIRAS.map((t, k) => {
        const v = mola(f, M.tres + k * 4, { damping: 14, stiffness: 200 });
        return v > 0 && (
          <div key={k} style={{ position: "absolute", left: t.x, top: CARD_Y, width: CARD_W, height: CARD_FOTO, boxSizing: "border-box", border: `1.5px dashed ${CIANO}`, opacity: Math.min(1, v * 1.6) * 0.7 * apaga, scale: `${0.9 + 0.1 * v}` }} />
        );
      })}
      {TORNEIRAS.map((t, k) => {
        const p = mola(f, t.de - 3, { damping: 15, stiffness: 170 });
        if (p <= 0) return null;
        return (
          <div key={k} style={{ position: "absolute", left: t.x, top: CARD_Y, width: CARD_W, opacity: Math.min(1, p * 1.6) * apaga, translate: `0 ${(1 - p) * 26}px` }}>
            {k === 0 ? (
              <div style={{ position: "relative", width: CARD_W, height: CARD_FOTO, boxSizing: "border-box", border: `1.5px solid ${CIANO}66` }}>
                {ELIMINADOS_2X2.map((n, j) => (
                  <Retrato key={n} src={foto(n)} cx={62 + (j % 2) * 132} cy={42 + Math.floor(j / 2) * 80} lado={74} cor={TEXTO} aro={2} />
                ))}
              </div>
            ) : (
              <Moldura src={foto(k === 1 ? "fila-card" : "urna-card")} x={0} y={0} w={CARD_W} h={CARD_FOTO} pb={k === 1} empurra={entre(f, t.de, t.de + 120)} />
            )}
            <div style={{ position: "absolute", top: CARD_FOTO, width: CARD_W, textAlign: "center", fontFamily: MONO, color: TEXTO }}>
              <div style={{ fontSize: 56, lineHeight: 1.22 }}>{t.numero}</div>
              {t.rotulo.map((l) => <div key={l} style={{ fontSize: 23, letterSpacing: 1, lineHeight: 1.18, color: TEXTO_2 }}>{l}</div>)}
            </div>
          </div>
        );
      })}
      <Heroi o={Math.max(fecha * (1 - entre(f, M.n14 - 2, M.n14 + 4)), 0)}>
        <div style={{ fontSize: 60, lineHeight: 1.2, color: TEXTO, marginTop: 20 }}>FECHA VOTO A VOTO</div>
      </Heroi>
      <Heroi o={hero}>
        <div style={{ fontSize: 104, lineHeight: 1, color: LARANJA, textShadow: `0 0 28px ${LARANJA}55` }}>{digitado("n14", f).padEnd(10, " ")}</div>
        <Rotulo tam={27}>{inteiro(D.conta.eliminados)} + {inteiro(D.conta.dComp)} + {inteiro(D.conta.dBN)}</Rotulo>
      </Heroi>
      {q > 0 && (
        <div style={{ position: "absolute", top: 480, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 320 * (0.6 + 0.4 * q), lineHeight: 1, color: LARANJA, opacity: Math.min(1, q * 1.5), textShadow: `0 0 40px ${LARANJA}66` }}>?</div>
      )}
    </AbsoluteFill>
  );
};

// --- o voto é secreto -------------------------------------------------------------------------
const Secreto: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, M.secreto - 3, M.comparando + 4, 6);
  if (o <= 0) return null;
  const empurra = entre(f, M.secreto - 3, M.comparando + 4);
  const hero2 = entre(f, M.ninguem - 2, M.ninguem + 4);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", left: 0, top: 370, width: 1080, height: 810, overflow: "hidden" }}>
        <Img src={foto("urna")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "66% 50%", scale: `${1.04 + 0.1 * empurra}` }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${FUNDO} 0%, ${FUNDO}00 12%, ${FUNDO}00 82%, ${FUNDO} 100%)` }} />
      </div>
      <Heroi o={1}>
        <div style={{ fontSize: 88, lineHeight: 1, color: TEXTO }}>VOTO SECRETO</div>
        <div style={{ opacity: hero2 }}><Rotulo tam={28}>NENHUM DADO DIZ QUEM VOTOU EM QUEM</Rotulo></div>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- método: 499 pontos, cada um com cerca de 1.000 seções ------------------------------------
const PTS = D.metodo.pontos as [number, number, number][];
const COLS = 25, PASSO = 31, GX = 540 - ((COLS - 1) * PASSO) / 2, GY = 452;
const pos = (i: number): [number, number] => [GX + (i % COLS) * PASSO, GY + Math.floor(i / COLS) * PASSO];
const YB = 1056, YT = 480, PX0 = 210, PX1 = 930, YMIN = -3, YMAX = 33;
const sx = (v: number) => PX0 + (v / D.metodo.xMax) * (PX1 - PX0);
const sy = (v: number) => YB - ((v - YMIN) / (YMAX - YMIN)) * (YB - YT);

const Metodo: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, M.comparando - 2, F.eliminados + 2, 5);
  if (o <= 0) return null;
  const Mo = M.cresceu - 8;
  const eixos = entre(f, Mo + 10, Mo + 24);
  const heroN = Math.min(entre(f, M.n499 - 4, M.n499), 1 - entre(f, M.estimativa - 8, M.estimativa - 2));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="1 PONTO = 1.000 SEÇÕES" direita={f >= Mo ? "POR % DO CURY" : "1º × 2º TURNO"} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g opacity={eixos} fontFamily={MONO}>
          {[0, 10, 20, 30].map((v) => (
            <g key={v}>
              <line x1={PX0} x2={PX1} y1={sy(v)} y2={sy(v)} stroke={TEXTO_2} strokeOpacity={v === 0 ? 0.55 : 0.16} strokeDasharray={v === 0 ? undefined : "4 8"} />
              <text x={PX0 - 16} y={sy(v) + 8} textAnchor="end" fill={TEXTO_2} fontSize={24}>{v}</text>
            </g>
          ))}
          {[0, 2, 4, 6, 8, 10].map((v) => (
            <text key={v} x={sx(v)} y={YB + 36} textAnchor="middle" fill={TEXTO_2} fontSize={24}>{v}%</text>
          ))}
          <text x={(PX0 + PX1) / 2} y={YB + 76} textAnchor="middle" fill={TEXTO} fontSize={26} letterSpacing={1}>% DO CURY NA SEÇÃO, NO 1º TURNO</text>
          <text x={PX0} y={452} fill={TEXTO} fontSize={26} letterSpacing={1}>VOTOS GANHOS POR SEÇÃO</text>
        </g>
        {PTS.map(([x, l, fl], i) => {
          const [gx, gy] = pos(i);
          const surge = entre(f, M.comparando + i * 0.11, M.comparando + 4 + i * 0.11);
          if (surge <= 0) return null;
          const t = entre(f, Mo + i * 0.05, Mo + 16 + i * 0.05, ioCubico);
          if (t <= 0) return <circle key={i} cx={gx} cy={gy} r={9} fill={CIANO} opacity={0.82 * surge} />;
          const px = gx + (sx(x) - gx) * t;
          return (
            <g key={i}>
              <circle cx={px} cy={gy + (sy(l) - gy) * t} r={9 - 3.4 * t} fill={COR_LULA} />
              <circle cx={px} cy={gy + (sy(fl) - gy) * t} r={9 - 3.4 * t} fill={COR_FLAVIO} />
            </g>
          );
        })}
      </svg>
      {/* legenda do gráfico: cada retrato perto da própria curva, os dois com o mesmo tamanho */}
      <div style={{ opacity: eixos }}>
        <ParRetratos cy={sy(31)} cyF={sy(4.5)} lado={76} xL={sx(9)} xF={sx(9)} aro={3} />
      </div>
      <Heroi o={heroN}>
        <div style={{ fontSize: 104, lineHeight: 1, color: TEXTO }}>{digitado("n499", f).padEnd(7, " ")}</div>
        <Rotulo>SEÇÕES PAREADAS NOS DOIS TURNOS</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- a tag ESTIMATIVA: fica na tela do fim do método até o fim do "quem voltou" ---------------
const TAG_ATE = F.virada + 2;

const TagEstimativa: React.FC = () => {
  const f = useCurrentFrame();
  const de = M.estimativa - 4;
  if (f < de || f > TAG_ATE) return null;
  const pop = mola(f, de, { damping: 11, stiffness: 200 });
  const sobe = entre(f, de + 26, de + 44, ioCubico);
  const y = 1215 + (318 - 1215) * sobe, s = (1.9 + (1 - 1.9) * sobe) * (0.7 + 0.3 * pop);
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: 1080, display: "flex", justifyContent: "center", opacity: Math.min(1, pop * 1.6) * (1 - entre(f, TAG_ATE - 6, TAG_ATE)) }}>
      <div style={{
        scale: `${s}`, padding: "10px 34px 8px", border: `2.5px solid ${LARANJA}`, background: "rgba(255,122,69,0.14)",
        fontFamily: MONO, fontSize: 36, letterSpacing: 7, color: LARANJA, textShadow: `0 0 18px ${LARANJA}66`,
      }}>ESTIMATIVA</div>
    </div>
  );
};

// --- barras de saldo: mesma peça pros eliminados e pra quem voltou ---------------------------
const BarraSaldo: React.FC<{ id: string; x: number; y: number; w: number; h: number; lo: number; hi: number; p: number }> = ({ id, x, y, w, h, lo, hi, p }) => {
  const xLo = x + (lo / 100) * w, xHi = x + (hi / 100) * w;
  const a = x + (xLo - x) * p, b = x + w - (x + w - xHi) * p;
  const banda = entre(p, 0.72, 1);
  return (
    <>
      <defs>
        <pattern id={`h${id}`} width={13} height={13} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={13} height={13} fill={TEXTO_2} fillOpacity={0.22} />
          <rect width={5} height={13} fill={TEXTO} fillOpacity={0.75} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={TEXTO_2} strokeOpacity={0.5} strokeWidth={1.5} />
      {a > x + 1 && <rect x={x} y={y} width={a - x} height={h} fill={COR_LULA} fillOpacity={0.88} />}
      {b < x + w - 1 && <rect x={b} y={y} width={x + w - b} height={h} fill={COR_FLAVIO} fillOpacity={0.92} />}
      {hi > lo && <rect x={xLo} y={y} width={xHi - xLo} height={h} fill={`url(#h${id})`} opacity={banda} />}
    </>
  );
};

const L = D.linhas;
const LY = [424, 606, 788, 970];
const QUANDO = [M.cury - 2, M.caiado - 2, M.renan - 2, M.zema - 2];
const NUM = [M.n70, M.n50, M.n58, M.quase];
const BX = 296, BW = X1 - BX, BH = 50;

const Eliminados: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.eliminados - 2, F.voltou + 2, 5);
  if (o <= 0) return null;
  const atual = NUM.reduce((k, n, i) => (f >= n - 3 ? i : k), -1);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {L.map((l, k) => {
        const e = mola(f, F.eliminados + k * 5, { damping: 14, stiffness: 170 });
        if (e <= 0) return null;
        const p = entre(f, NUM[k] - 6, NUM[k] + 14, Easing.out(Easing.cubic));
        const y = LY[k], ativo = atual === k;
        const acesa = entre(f, QUANDO[k] - 2, QUANDO[k] + 4);
        return (
          <div key={l.id} style={{ position: "absolute", inset: 0, opacity: Math.min(1, e * 1.6) * (0.42 + 0.58 * acesa) * (atual > k ? 0.8 : 1) }}>
            <Retrato src={foto(l.foto)} cx={X0 + 72} cy={y + 76} lado={144} cor={TEXTO} aro={3} escala={0.84 + 0.16 * e} />
            <div style={{ position: "absolute", left: BX, top: y + 2, width: BW, display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: MONO, color: TEXTO }}>
              <span style={{ fontSize: 36, letterSpacing: 2 }}>{l.nome}</span>
              <span style={{ fontSize: 24, color: TEXTO_2 }}>{milhoes(l.votos, 2)}</span>
            </div>
            <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
              <BarraSaldo id={l.id} x={BX} y={y + 54} w={BW} h={BH} lo={l.lo} hi={l.hi} p={p} />
            </svg>
            <div style={{ position: "absolute", left: BX, top: y + 112, width: BW, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 28, color: TEXTO, opacity: entre(p, 0.3, 0.8) }}>
              <span><span style={{ color: TEXTO_2, fontSize: 24 }}>LULA </span>{l.tL}</span>
              <span>{l.tF}<span style={{ color: TEXTO_2, fontSize: 24 }}> FLÁVIO</span></span>
            </div>
            {ativo && <div style={{ position: "absolute", left: X0 - 26, top: y + 4, width: 5, height: 144, background: LARANJA }} />}
          </div>
        );
      })}
      {L.map((l, k) => (
        <Heroi key={l.id} o={atual === k ? entre(f, NUM[k] - 3, NUM[k] + 2) : 0}>
          <div style={{ fontSize: 112, lineHeight: 1, color: TEXTO }}>{l.grande}</div>
          <Rotulo tam={27}>{l.rotulo}</Rotulo>
        </Heroi>
      ))}
    </AbsoluteFill>
  );
};

// --- quem voltou: mesma barra, com as fotos ---------------------------------------------------
const BLOCOS_VOLTA = [
  { id: "comp", src: "fila-larga", pb: true, de: F.voltou, acende: M.comp - 2, num: M.n63, rot: `COMPARECIMENTO A MAIS · ${milhoes(D.volta.comp.votos, 2)}`, v: D.volta.comp, y: 408, pos: "50% 50%" },
  { id: "bn", src: "urna-larga", pb: false, de: F.voltou + 6, acende: M.bn - 2, num: M.n82, rot: `BRANCO E NULO A MENOS · ${milhoes(D.volta.bn.votos, 2)}`, v: D.volta.bn, y: 776, pos: "50% 50%" },
];
const FOTO_H = 186;

const QuemVoltou: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.voltou - 2, F.virada + 2, 5);
  if (o <= 0) return null;
  const hero = entre(f, M.tambem - 2, M.tambem + 4);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {BLOCOS_VOLTA.map((b) => {
        const e = mola(f, b.de, { damping: 15, stiffness: 170 });
        if (e <= 0) return null;
        const p = entre(f, b.num - 8, b.num + 12, Easing.out(Easing.cubic));
        return (
          <div key={b.id} style={{ position: "absolute", inset: 0, opacity: Math.min(1, e * 1.6) * (0.42 + 0.58 * entre(f, b.acende - 2, b.acende + 4)), translate: `0 ${(1 - e) * 24}px` }}>
            <Moldura src={foto(b.src)} x={X0} y={b.y} w={W} h={FOTO_H} pb={b.pb} empurra={entre(f, b.de, b.de + 150)} posicao={b.pos} />
            <div style={{ position: "absolute", left: X0, top: b.y + FOTO_H + 12, width: W, fontFamily: MONO, fontSize: 28, letterSpacing: 1, color: TEXTO }}>{b.rot}</div>
            <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
              <BarraSaldo id={b.id} x={X0} y={b.y + FOTO_H + 58} w={W} h={BH} lo={b.v.lo} hi={b.v.hi} p={p} />
            </svg>
            <div style={{ position: "absolute", left: X0, top: b.y + FOTO_H + 116, width: W, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 30, color: TEXTO, opacity: entre(p, 0.3, 0.8) }}>
              <span><span style={{ color: TEXTO_2, fontSize: 24 }}>LULA </span>{b.v.tL}</span>
              <span>{b.v.tF}<span style={{ color: TEXTO_2, fontSize: 24 }}> FLÁVIO</span></span>
            </div>
          </div>
        );
      })}
      <Heroi o={hero} top={1218}>
        <div style={{ fontSize: 66, lineHeight: 1.1, color: TEXTO }}>SALDO, NÃO PESSOAS</div>
        <Rotulo tam={26}>QUEM TROCOU DE LADO SOME NA CONTA</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- virada: onde a margem mudou --------------------------------------------------------------
const CT = D.contornos;
const CAM_S = 1.75;
const P_SP: [number, number] = [640, 900], ALVO_SP: [number, number] = [470, 790];
const camera = (s: number) => {
  const k = (s - 1) / (CAM_S - 1);
  const C = [P_SP[0] + (ALVO_SP[0] - P_SP[0]) * k, P_SP[1] + (ALVO_SP[1] - P_SP[1]) * k];
  return { tr: `translate(${C[0]} ${C[1]}) scale(${s}) translate(${-P_SP[0]} ${-P_SP[1]})`, xy: (x: number, y: number) => [C[0] + s * (x - P_SP[0]), C[1] + s * (y - P_SP[1])] };
};

const RotuloMapa: React.FC<{ x: number; y: number; nome: string; pct: number; cor: string; o: number; tam?: number; ancora?: "start" | "middle" | "end" }> = ({ x, y, nome, pct, cor, o, tam = 58, ancora = "middle" }) =>
  o <= 0 ? null : (
    <g opacity={o} fontFamily={MONO} textAnchor={ancora}>
      <text x={x} y={y} fill={TEXTO} fontSize={Math.max(25, Math.round(tam * 0.46))} letterSpacing={1} {...CONTORNO}>{nome}</text>
      <text x={x} y={y + tam * 0.98} fill={cor} fontSize={tam} {...CONTORNO}>{pct}%</text>
    </g>
  );

const Virada: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.virada - 2, F.fecho + 2, 5);
  if (o <= 0) return null;
  const desenho = entre(f, F.virada - 2, F.virada + 12);
  const ne = entre(f, M.nordeste - 12, M.nordeste + 2);
  const se = entre(f, M.sudeste - 8, M.sudeste + 4);
  const sp = entre(f, M.sp - 4, M.sp + 6);
  const s = 1 + (CAM_S - 1) * mola(f, M.sp - 2, { damping: 16, stiffness: 110 });
  const cam = camera(s);
  const [xSE, ySE] = cam.xy(D.centros.SE[0], D.centros.SE[1]);
  const [xNE, yNE] = cam.xy(D.centros.NE[0], D.centros.NE[1]);
  const [xSP, ySP] = cam.xy(642, 916);
  const volta = 1 - entre(f, M.sp - 4, M.sp + 4);
  const hero = Math.min(entre(f, M.n67 - 4, M.n67), 1 - entre(f, F.fecho - 6, F.fecho + 2));
  const nHeroi = digitado("n67", f).padEnd(3, " ");
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="ONDE A MARGEM MUDOU" direita="1º → 2º TURNO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><clipPath id="palcoMapa"><rect x={0} y={380} width={1080} height={790} /></clipPath></defs>
        <g clipPath="url(#palcoMapa)">
          <g transform={cam.tr} opacity={desenho}>
            {CT.map((c) => {
              const ehNE = c.r === "NE", ehSE = c.r === "SE", ehSP = c.uf === "SP";
              const fill = ehNE ? CIANO : ehSE ? LARANJA : "none";
              const alfa = ehNE ? 0.34 * ne : ehSE ? (ehSP ? 0.32 + 0.5 * sp : 0.32) * se : 0;
              return <path key={c.uf} d={c.d} fill={fill} fillOpacity={alfa} stroke={ehSE && se > 0.5 ? LARANJA : CIANO} strokeOpacity={ehSE || ehNE ? 0.9 : 0.34} strokeWidth={ehSP ? 2.4 : 1.3} vectorEffect="non-scaling-stroke" />;
            })}
          </g>
        </g>
        <RotuloMapa x={xNE + 12} y={yNE - 4} nome="NORDESTE" pct={D.pct.NE} cor={TEXTO} o={entre(f, M.p38 - 4, M.p38 + 2) * volta} />
        <RotuloMapa x={xSE + 104} y={ySE + 72} nome="SUDESTE" pct={D.pct.SE} cor={LARANJA} o={entre(f, M.p43 - 4, M.p43 + 2) * volta} />
        <RotuloMapa x={D.centros.S[0] - 16} y={D.centros.S[1] + 36} nome="SUL" pct={D.pct.S} cor={TEXTO} tam={44} o={entre(f, M.p38 + 10, M.p38 + 16) * volta} />
        <RotuloMapa x={D.centros.N[0]} y={D.centros.N[1] - 28} nome="NORTE" pct={D.pct.N} cor={TEXTO} tam={44} o={entre(f, M.p38 + 13, M.p38 + 19) * volta} />
        <RotuloMapa x={D.centros.CO[0] - 10} y={D.centros.CO[1] - 16} nome="CENTRO-OESTE" pct={D.pct.CO} cor={TEXTO} tam={44} o={entre(f, M.p38 + 16, M.p38 + 22) * volta} />
        <RotuloMapa x={xSP} y={ySP - 16} nome="SÃO PAULO" pct={D.pct.SP} cor={TEXTO} tam={72} o={entre(f, M.sp + 2, M.sp + 10)} />
      </svg>
      <Heroi o={hero}>
        <div style={{ fontSize: 112, lineHeight: 1, color: LARANJA, textShadow: `0 0 28px ${LARANJA}55` }}>{nHeroi} MI</div>
        <Rotulo tam={26}>NA MARGEM: DE FLÁVIO +{milhoes(D.margem.de)} A LULA +{milhoes(D.margem.ate)}</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- fecho: os dois subiram -------------------------------------------------------------------
const P_G = 30, R_G = 11, GR_Y = 656;
const GRADES = [
  { nome: "LULA", x: 300, cor: COR_LULA, v: D.secoes.lula, de: M.n976 - 2, id: "n976" },
  { nome: "FLÁVIO", x: 780, cor: COR_FLAVIO, v: D.secoes.flavio, de: M.n798 - 2, id: "n798" },
];

const Fecho: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.fecho - 2, G0 + 2, 5);
  if (o <= 0) return null;
  const hero = entre(f, M.dois - 3, M.dois + 3);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="1 PONTO = 1% DAS SEÇÕES" direita="GANHOU VOTOS" />
      <ParRetratos cy={520} lado={168} xL={GRADES[0].x} xF={GRADES[1].x} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {GRADES.map((g) => Array.from({ length: 100 }, (_, i) => {
          const x = g.x - 4.5 * P_G + (i % 10) * P_G, y = GR_Y + Math.floor(i / 10) * P_G;
          const acende = entre(f, g.de + i * 0.28, g.de + 4 + i * 0.28);
          const cheio = limita(g.v - i) * acende;
          return (
            <g key={`${g.nome}${i}`}>
              <circle cx={x} cy={y} r={R_G} fill="none" stroke={TEXTO_2} strokeOpacity={0.5} strokeWidth={1.5} />
              {cheio > 0 && <circle cx={x} cy={y} r={R_G} fill={g.cor} opacity={cheio} />}
            </g>
          );
        }))}
      </svg>
      {GRADES.map((g) => (
        <div key={g.nome} style={{ position: "absolute", left: g.x - 220, top: 968, width: 440, textAlign: "center", fontFamily: MONO, color: TEXTO }}>
          <div style={{ fontSize: 76, lineHeight: 1.1, height: 84 }}>{digitado(g.id, f)}</div>
          <div style={{ fontSize: 24, letterSpacing: 2, color: TEXTO_2 }}>DAS SEÇÕES</div>
        </div>
      ))}
      <Heroi o={hero} top={1218}>
        <div style={{ fontSize: 66, lineHeight: 1.1, color: TEXTO }}>OS DOIS SUBIRAM</div>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- a pergunta do fim, grande, palavra por palavra ---------------------------------------------
const PerguntaFinal: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, G0 - 4, G0 + 2) * (1 - entre(f, VOLTA - 10, VOLTA - 2));
  if (o <= 0) return null;
  const linhas = [0, 1, 2].map((l) => T.grande.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top: 540, left: 90, width: 900, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 104, lineHeight: 1.14, letterSpacing: -1, color: TEXTO,
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
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/origem-votos/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/origem-votos/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const OrigemVotos: React.FC = () => (
  <Fundo>
    <Placar />
    <Torneiras />
    <Secreto />
    <Metodo />
    <Eliminados />
    <QuemVoltou />
    <Virada />
    <Fecho />
    <PerguntaFinal />
    <TagEstimativa />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-origem-votos.mjs: whoosh nas trocas, tiques nos números, riser no fim */}
    <Audio src={staticFile("ciencia/trilha-origem-votos.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
export const OrigemVotosCapa: React.FC = () => (
  <Fundo>
    <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2 }}>
      DO 1º PRO 2º TURNO · 2026
    </div>
    <ParRetratos cy={560} lado={330} xL={XL} xF={XF} />
    {[
      { x: XL, v: D.conta.dLula },
      { x: XF, v: D.conta.dFlavio },
    ].map((c) => (
      <div key={c.x} style={{ position: "absolute", left: c.x - 230, top: 752, width: 460, textAlign: "center", fontFamily: MONO, fontSize: 86, color: TEXTO }}>+{milhoes(c.v)}</div>
    ))}
    <div style={{
      position: "absolute", top: 930, left: 90, width: 900, textAlign: "center",
      fontFamily: SORA, fontWeight: 300, fontSize: 118, lineHeight: 1.08, letterSpacing: -1.5, color: TEXTO,
      textShadow: "0 0 30px rgba(5,7,12,0.95)",
    }}>
      De onde<br />vieram<br /><span style={{ color: LARANJA }}>os votos?</span>
    </div>
    <div style={{ position: "absolute", top: 1420, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 34, letterSpacing: 4, color: TEXTO_2 }}>
      499 MIL SEÇÕES COMPARADAS
    </div>
  </Fundo>
);
