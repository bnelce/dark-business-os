import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./binance.json";
import T from "./binance-tempos.json";
import { Fundo, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon, hash, traco } from "./ilustra-dolar";
import { AssinaturaCta } from "./marca";

// Roubo da Binance (31/10/2026), roteiro-v2.md. Menos de 4 minutos, US$ 2,5 bi numa transação
// (o relógio marca só essa transação, não o começo do roubo); provavelmente o maior já registrado,
// pela conta da Elliptic; mais de 60 vezes o furto ao BC em Fortaleza; carteira quente; 50
// assinaturas, 1 valeu; sem contar esse caso, 62% do dinheiro de quase 1.300 ataques saiu por chave,
// sistema ou gente; a bolha da Binance é quase 1/4 de tudo (cauda pesada); 44% travados por
// quem tem o botão, e o Bitcoin não tem; a pergunta volta pro relógio da abertura.
//
// Embalagem (viralizacao.md, seção 8): palco de dados no meio e todo texto no terço de baixo
// (y 1170–1550, longe dos botões do IG); legenda sincronizada, 2 a 4 palavras, chave em laranja;
// algo muda a cada 2 a 4s; o fim rebobina até o quadro 0 pro loop emendar.
//
// Números: binance.json (scripts/gerar-binance.mjs, que confere cada número da fala). Tempos:
// binance-tempos.json (scripts/tempos-binance.mjs). A trilha (gerar-trilha-binance.mjs) lê os
// mesmos tempos. Logos: public/ciencia/binance/logos/, sem recolorir nem distorcer, sempre sobre
// o chip neutro (origem em public/ciencia/fotos-origem.md).
// Editorial: sem conselho de investimento, sem passo a passo além do roteiro, e a Coreia do Norte
// só aparece como atribuição do FBI (alerta de 31/10/2026), com a tag ATRIBUIÇÃO DO FBI. "Travado"
// nunca é "recuperado".

export const BINANCE_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const FZ = D.fortaleza;

const br = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");
const CONTORNO = { stroke: FUNDO, strokeWidth: 8, paintOrder: "stroke" as const };
const STATUS_TOP = 330;
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const limita = (v: number) => Math.min(1, Math.max(0, v));
const ioCubico = Easing.inOut(Easing.cubic);
const saida = Easing.out(Easing.cubic);
const G0 = T.grande[0].f; // primeira palavra da pergunta final
const FIM = T.fim; // começa a volta pro quadro da abertura

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

// --- logos: sempre no chip neutro --------------------------------------------------------------
const LARGOS = new Set(["coincheck", "mtgox", "ftx"]); // sem fundo: podem ocupar a corda do círculo
const LADRILHO_LARGO = new Set(["bybit"]); // logo com fundo retangular: os cantos têm que caber no chip
const logoSrc = (logo: string) => staticFile(`ciencia/binance/logos/${logo}.png`);

const Chip: React.FC<{ logo: string; x: number; y: number; d: number; o?: number; s?: number }> = ({ logo, x, y, d, o = 1, s = 1 }) => {
  if (o <= 0 || s <= 0) return null;
  const frac = LARGOS.has(logo) ? 0.92 : LADRILHO_LARGO.has(logo) ? 0.82 : 0.66;
  return (
    <div style={{ position: "absolute", left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: "50%", background: TEXTO, opacity: o, scale: `${s}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Img src={logoSrc(logo)} style={{ width: `${frac * 100}%`, height: `${frac * 100}%`, objectFit: "contain" }} />
    </div>
  );
};

/** Chip retangular, pro logo do Banco Central (largo e com texto). */
const Placa: React.FC<{ logo: string; x: number; y: number; w: number; h: number; o?: number }> = ({ logo, x, y, w, h, o = 1 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, background: TEXTO, opacity: o, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Img src={logoSrc(logo)} style={{ width: "86%", height: "86%", objectFit: "contain" }} />
    </div>
  );

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

/** Faixa do número grande, logo acima da legenda (entre x 130 e 950, longe dos botões). */
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

/** Tag de instrumento: nunca some enquanto a fala que ela qualifica estiver no ar. */
const Tag: React.FC<{ texto: string; top: number; o?: number; cor?: string; tam?: number }> = ({ texto, top, o = 1, cor = LARANJA, tam = 44 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: X0, width: 820, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ border: `3px solid ${cor}`, padding: "14px 24px", fontFamily: MONO, fontSize: tam, letterSpacing: 2, color: cor, background: "rgba(5,7,12,0.86)", whiteSpace: "nowrap" }}>{texto}</div>
    </div>
  );

const fonteDe = (f: number) =>
  f >= FIM || f < F.fortaleza ? "FONTE: ELLIPTIC · DADOS ATÉ 31/10"
    : f < F.cofre ? "FONTE: DIÁRIO DO NORDESTE · IBGE · ELLIPTIC"
      : f < F.misterio ? "FONTE: ELLIPTIC · CHAINALYSIS"
        : f < F.padrao ? "FONTE: BINANCE · CHAINALYSIS"
          : f < F.congelar ? "FONTE: DEFILLAMA · CÁLCULO NOSSO · DÓLAR DA DATA"
            : f < F.quem ? "FONTE: ELLIPTIC · ATÉ 31/10"
              : f < F.pergunta ? "FONTE: FBI · ELLIPTIC · TRM · BINANCE"
                : "FONTE: ELLIPTIC · DADOS ATÉ 31/10";

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, textShadow: "0 0 10px rgba(5,7,12,1)" }}>
      {fonteDe(f)}
    </div>
  );
};

// --- peças de traço ---------------------------------------------------------------------------

/** Cadeado: `fecha` 1 é trancado; 0 é com a alça levantada e solta de um lado. */
const Trava: React.FC<{ x: number; y: number; s?: number; fecha: number; cor?: string }> = ({ x, y, s = 1, fecha, cor = LARANJA }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={cor} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
    <path d={`M-20,${-6 - (1 - fecha) * 20} V${-30 - (1 - fecha) * 20} a20,20 0 0 1 40,0 V${-6 - (1 - fecha) * 20}`} />
    <rect x={-32} y={-6} width={64} height={50} fill={FUNDO} />
    <circle cx={0} cy={15} r={6} fill={cor} stroke="none" />
    <path d="M0,18 V30" />
  </g>
);

/** Anel de instrumento: 60 marcas, as já percorridas em laranja. */
const Anel: React.FC<{ cx: number; cy: number; R: number; p: number; filtro: string; o?: number }> = ({ cx, cy, R, p, filtro, o = 1 }) => (
  <g opacity={o}>
    {Array.from({ length: 60 }, (_, i) => {
      const a = ((i * 6 - 90) * Math.PI) / 180, longo = i % 15 === 0, r0 = R - (longo ? 26 : 13);
      return (
        <line key={i} x1={cx + r0 * Math.cos(a)} y1={cy + r0 * Math.sin(a)} x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)}
          stroke={i / 60 < p ? LARANJA : TEXTO_2} strokeOpacity={i / 60 < p ? 1 : 0.55} strokeWidth={longo ? 3 : 2} />
      );
    })}
    {p > 0 && (
      <Neon filtro={filtro} cor={LARANJA} largura={3}>
        <circle cx={cx} cy={cy} r={R + 14} transform={`rotate(-90 ${cx} ${cy})`} {...traco(p)} />
      </Neon>
    )}
  </g>
);

// --- gancho e tamanho: o relógio, o logo e o contador -------------------------------------------
const CR: [number, number] = [540, 806];
const R_ANEL = 258;
const ATIVOS = ["bitcoin", "ethereum", "tether", "usd-coin", "ripple"];

/** Abre e fecha o vídeo: o fim usa o mesmo desenho, então o último quadro emenda no quadro 0. */
const Abertura: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM - 6;
  if (!noFim && f >= F.fortaleza + 2) return null;
  const o = noFim ? entre(f, FIM - 6, FIM + 4) : 1 - entre(f, F.fortaleza - 4, F.fortaleza + 2);
  const tau = noFim ? f - T.total : f; // no fim, conta até zero: o tremor emenda no quadro 0
  const rel = noFim ? 1 - entre(f, FIM + 6, T.total - 1, ioCubico) : entre(f, 0, T.relogio.ate);
  const min = Math.min(4, Math.floor(rel * 4 + 1e-6));
  const ate = T.relogio.ate;
  const q = noFim ? (rel * (ate + 6) + 4) / (ate + 10) : Math.min(1, (f + 4) / (ate + 10));
  const v = (D.fatos.transacao / 1e9) * q ** 1.6;

  const tam = noFim ? 0 : entre(f, F.tamanho - 2, F.tamanho + 8); // do gancho pro tamanho
  const amp = (noFim ? 7 : 7 * (1 - entre(f, M.transacao, F.tamanho))) * (1 - tam);
  const tx = amp * (Math.sin(tau * 2.3) + 0.6 * Math.sin(tau * 5.1 + 1));
  const ty = amp * 0.8 * (Math.cos(tau * 2.9) + 0.6 * Math.sin(tau * 6.7));
  const baque = noFim ? 0 : mola(f, M.transacao, { damping: 9, stiffness: 240 }) * (1 - entre(f, M.transacao + 4, M.transacao + 16));
  const cont = conta("c64", f);
  const valor = (D.fatos.transacao + (D.fatos.elliptic - D.fatos.transacao) * cont) / 1e9;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda={tam > 0.5 ? "QUINTA, 29/10" : "BINANCE · 29/10/2026"} direita={tam > 0.5 ? "ENTRE OS ATIVOS LEVADOS" : "SÓ ESTA TRANSAÇÃO"} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonAnel" /></defs>
        <Anel cx={CR[0]} cy={CR[1]} R={R_ANEL} p={rel} filtro="neonAnel" o={1 - 0.65 * tam} />
      </svg>
      <div style={{ position: "absolute", top: 390, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 104, lineHeight: 1, letterSpacing: -2, color: CIANO, textShadow: `0 0 26px ${CIANO}55`, opacity: 1 - tam, scale: `${1 + 0.04 * baque}` }}>
        17h{20 + min}
      </div>
      <div style={{ position: "absolute", top: 462, left: 712, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, opacity: 1 - tam }}>BRASÍLIA</div>
      <Chip logo="binance" x={CR[0] + tx} y={CR[1] + ty} d={300} s={1 + 0.07 * baque} />
      {ATIVOS.map((l, k) => {
        const a = ((-90 + k * 72) * Math.PI) / 180;
        const p = noFim ? 0 : mola(f, M.maior + k * 5, { damping: 11, stiffness: 200 });
        return <Chip key={l} logo={l} x={CR[0] + 318 * Math.cos(a)} y={CR[1] + 318 * Math.sin(a)} d={128} s={p} />;
      })}
      <Heroi o={1 - entre(f, F.tamanho - 2, F.tamanho + 4) + (noFim ? 1 : 0)}>
        <Grande>US$ {q >= 1 ? br(v, 1) : br(v, 2)} BI</Grande>
      </Heroi>
      <Heroi o={noFim ? 0 : entre(f, F.tamanho - 2, F.tamanho + 4)}>
        <Grande>US$ {br(valor, 1)} BI</Grande>
        <div style={{ opacity: entre(f, M.b64 - 2, M.b64 + 6) }}><Rotulo>EM DÓLARES DA ÉPOCA · CONTA DA ELLIPTIC</Rotulo></div>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- Fortaleza: 3,5 toneladas, e a régua em reais de hoje ----------------------------------------
const BASE = 1124, HMAX = 620, BW = 220, XL = 230, XR = 630;

const Fortaleza: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.fortaleza - 2, F.cofre + 2, 6);
  if (o <= 0) return null;
  const vira = entre(f, M.corrigido - 6, M.corrigido + 4);
  const cresce = entre(f, M.corrigido, M.vezes + 2, ioCubico);
  const hR = HMAX * cresce;
  const hL = Math.max(2, ((HMAX * FZ.corrigidoMi) / (FZ.binanceReaisBi * 1000)) * entre(f, M.corrigido - 2, M.corrigido + 8));
  const COLS = 11, LINS = 7, W = 62, H = 34, GAP = 8, X_N = 540 - (COLS * W + (COLS - 1) * GAP) / 2;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda={vira > 0.5 ? "REAIS DE SET/2026" : "FORTALEZA · 2005"} direita={vira > 0.5 ? "MESMA ESCALA" : "FURTO AO BC"} />
      <Placa logo="bcb" x={540} y={574} w={430} h={240} o={(1 - vira) * entre(f, F.fortaleza, F.fortaleza + 8)} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g opacity={1 - vira}>
          {Array.from({ length: COLS * LINS }, (_, i) => {
            const lin = Math.floor(i / COLS), col = i % COLS;
            const p = entre(f, M.rendeu + (lin * 5 + hash(i) * 8), M.rendeu + (lin * 5 + hash(i) * 8) + 5);
            if (p <= 0) return null;
            const x = X_N + col * (W + GAP), y = 1124 - (lin + 1) * (H + GAP);
            return (
              <g key={i} opacity={p} transform={`translate(0 ${(1 - p) * -16})`}>
                <rect x={x} y={y} width={W} height={H} fill={CIANO} fillOpacity={0.1} stroke={CIANO} strokeOpacity={0.8} strokeWidth={1.5} />
                <line x1={x + W / 2 - 7} x2={x + W / 2 - 7} y1={y} y2={y + H} stroke={CIANO} strokeOpacity={0.5} strokeWidth={6} />
              </g>
            );
          })}
        </g>
        <g opacity={vira} fontFamily={MONO}>
          <line x1={X0} x2={X1} y1={BASE} y2={BASE} stroke={TEXTO_2} strokeOpacity={0.6} />
          <rect x={XL} y={BASE - hL} width={BW} height={hL} fill={CIANO} />
          <rect x={XR} y={BASE - hR} width={BW} height={hR} fill={LARANJA} fillOpacity={0.24} stroke={LARANJA} strokeWidth={2} />
          <text x={XL + BW / 2} y={BASE - hL - 22} textAnchor="middle" fill={TEXTO} fontSize={54}>R$ {Math.round(FZ.corrigidoMi)} MI</text>
          <text x={XR + BW / 2} y={BASE - hR - 18} textAnchor="middle" fill={LARANJA} fontSize={54} {...CONTORNO}>R$ {br(FZ.binanceReaisBi * cresce)} BI</text>
          <text x={XL + BW / 2} y={BASE + 36} textAnchor="middle" fill={TEXTO_2} fontSize={24} letterSpacing={2}>FORTALEZA, 2005</text>
          <text x={XR + BW / 2} y={BASE + 36} textAnchor="middle" fill={TEXTO_2} fontSize={24} letterSpacing={2}>BINANCE, 2026</text>
        </g>
      </svg>
      <Placa logo="bcb" x={XL + BW / 2} y={BASE - 210} w={250} h={140} o={vira} />
      <Chip logo="binance" x={XR + BW / 2} y={BASE - hR + 100} d={136} o={vira * entre(cresce, 0.4, 0.55)} />
      <Heroi o={Math.min(entre(f, M.ton - 3, M.ton), 1 - vira)}>
        <Grande tam={100}>{digitado("t35", f).padEnd(13, " ")}</Grande>
        <Rotulo>DE NOTAS · R$ {br(FZ.nominalMi)} MI EM 2005</Rotulo>
      </Heroi>
      <Heroi o={entre(f, M.corrigido + 2, M.corrigido + 8)}>
        <Grande tam={100}>{digitado("x60", f).padEnd(11, " ")}</Grande>
        <Rotulo>IPCA SET/2005 A SET/2026 · DÓLAR A R$ {br(FZ.dolar, 2)}</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- cofres: o frio apaga, o quente acende -------------------------------------------------------
const Cofre: React.FC<{ cx: number; cy: number; cor: string; giro: number; filtro: string; o: number }> = ({ cx, cy, cor, giro, filtro, o }) => {
  const w = 300, h = 340;
  return (
    <g opacity={o}>
      <Neon filtro={filtro} cor={cor} largura={3}>
        <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} />
        <rect x={cx - w / 2 + 22} y={cy - h / 2 + 22} width={w - 44} height={h - 44} strokeOpacity={0.6} />
        <circle cx={cx} cy={cy} r={62} />
        <g transform={`rotate(${giro} ${cx} ${cy})`}>
          <path d={`M${cx - 44},${cy} H${cx + 44} M${cx},${cy - 44} V${cy + 44}`} />
        </g>
      </Neon>
      <rect x={cx + w / 2 - 6} y={cy - 92} width={12} height={40} fill={cor} />
      <rect x={cx + w / 2 - 6} y={cy + 52} width={12} height={40} fill={cor} />
    </g>
  );
};

const Cofres: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.cofre - 2, F.ataque + 2, 6);
  if (o <= 0) return null;
  const XF = 280, XQ = 760, CY = 690;
  const quente = entre(f, M.quente - 3, M.quente + 6);
  const cabo = entre(f, M.conectada - 2, M.conectada + 12, saida);
  const fluxo = f >= M.saques - 10 ? (f - (M.saques - 10)) / 22 : -1;
  const nos = [620, 690, 760, 830, 900];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="O ALVO" direita="DOIS TIPOS DE CARTEIRA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonCofre" /></defs>
        <text x={XF} y={488} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2} opacity={1 - 0.6 * quente}>FRIA · OFFLINE</text>
        <text x={XQ} y={488} textAnchor="middle" fill={quente > 0.5 ? LARANJA : TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2}>QUENTE · CONECTADA</text>
        <Cofre cx={XF} cy={CY} cor={CIANO} giro={0} filtro="neonCofre" o={1 - 0.75 * quente} />
        <Cofre cx={XQ} cy={CY} cor={quente > 0.5 ? LARANJA : CIANO} giro={(f - F.cofre) * 2.2} filtro="neonCofre" o={0.5 + 0.5 * quente} />
        <path d={`M${XF},860 V925 M${XF - 16},925 H${XF + 16} M${XF},945 V975`} stroke={TEXTO_2} strokeOpacity={1 - 0.5 * quente} strokeWidth={2.5} fill="none" />
        {nos.map((x) => (
          <g key={x} opacity={cabo}>
            <path d={`M${XQ},860 V950 H${x} V1020`} fill="none" stroke={LARANJA} strokeWidth={2} {...traco(cabo)} />
            <circle cx={x} cy={1034} r={14} fill="none" stroke={LARANJA} strokeWidth={2.5} />
          </g>
        ))}
        {fluxo >= 0 && nos.flatMap((x, k) => [0, 0.5].map((d) => {
          const u = (fluxo + d + k * 0.17) % 1;
          const ptY = 860 + 160 * u, ptX = u < 0.56 ? XQ : XQ + (x - XQ) * limita((u - 0.56) / 0.15);
          const y = u < 0.56 ? ptY : u < 0.71 ? 950 : 950 + 70 * ((u - 0.71) / 0.29);
          return <circle key={`${x}-${d}`} cx={ptX} cy={y} r={6} fill={LARANJA} opacity={entre(f, M.saques - 10, M.saques - 4)} />;
        }))}
        <text x={XQ} y={1098} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={28} letterSpacing={3} opacity={entre(f, M.saques - 4, M.saques + 4)}>SAQUES</text>
      </svg>
      <Heroi o={entre(f, M.quente - 3, M.quente + 3)}>
        <Grande tam={84}>CARTEIRA QUENTE</Grande>
        <Rotulo>A PARTE CONECTADA, QUE PAGA OS SAQUES</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- ataque: 50 assinaturas, 1 valeu ---------------------------------------------------------------
const CEL = 70, GAP_C = 11, X_C = 140, Y_C = 418, VALIDA = 23;

const Ataque: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.ataque - 2, F.misterio + 2, 6);
  if (o <= 0) return null;
  const apaga = entre(f, M.uma - 2, M.uma + 6);
  const anda = entre(f, M.uma + 6, M.programa + 2, ioCubico);
  const chegou = entre(f, M.programa - 4, M.programa + 4);
  const xc = 372 + (566 - 372) * anda;
  const corC = chegou > 0.5 ? LARANJA : CIANO;
  const cel = (i: number) => [X_C + (i % 10) * (CEL + GAP_C), Y_C + Math.floor(i / 10) * (CEL + GAP_C)];
  const [vx, vy] = cel(VALIDA);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda={`${D.fatos.inicio} · 1 TRANSAÇÃO`} direita="BRASÍLIA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><filter id="brilhoValida" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={14} /></filter></defs>
        {Array.from({ length: D.fatos.autorizacoes }, (_, i) => {
          const de = M.a50 - 4 + i * 0.5;
          const p = entre(f, de, de + 3);
          if (p <= 0) return null;
          const [x, y] = cel(i);
          const valida = i === VALIDA;
          return (
            <g key={i} opacity={p * (valida ? 1 : 1 - 0.76 * apaga)}>
              <rect x={x} y={y} width={CEL} height={CEL} fill={valida && apaga > 0.5 ? LARANJA : CIANO} fillOpacity={valida ? 0.08 + 0.3 * apaga : 0.07} stroke={valida && apaga > 0.5 ? LARANJA : CIANO} strokeWidth={valida ? 1.5 + 2 * apaga : 1.5} />
              {/* rabisco de assinatura, sem marca de "certo": só uma das 50 valeu */}
              <path d={`M${x + 12},${y + 46} q9,-34 17,-8 t13,-5 t16,3`} fill="none" stroke={valida && apaga > 0.5 ? LARANJA : TEXTO} strokeWidth={2.5} strokeLinecap="round" />
            </g>
          );
        })}
        {apaga > 0 && <rect x={vx - 8} y={vy - 8} width={CEL + 16} height={CEL + 16} fill={LARANJA} opacity={0.4 * apaga} filter="url(#brilhoValida)" />}
        <g opacity={entre(f, M.carteira - 6, M.carteira + 4)}>
          <line x1={302} x2={622} y1={1000} y2={1000} stroke={TEXTO_2} strokeWidth={2} strokeDasharray="6 8" />
          <rect x={630} y={930} width={300} height={140} fill={LARANJA} fillOpacity={0.08 + 0.14 * chegou} stroke={LARANJA} strokeWidth={2 + chegou} />
          <text x={780} y={990} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={30} letterSpacing={1}>PROGRAMA DOS</text>
          <text x={780} y={1030} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={30} letterSpacing={1}>INVASORES</text>
          <g transform={`translate(${xc} 1000)`}>
            <rect x={-55} y={-42} width={110} height={84} fill={FUNDO} stroke={corC} strokeWidth={3} />
            <path d="M-55,-22 H55" stroke={corC} strokeWidth={2} />
            <rect x={22} y={-6} width={33} height={26} fill={FUNDO} stroke={corC} strokeWidth={2.5} />
            <circle cx={36} cy={7} r={4} fill={corC} />
          </g>
          <text x={xc} y={1084} textAnchor="middle" fill={corC} fontFamily={MONO} fontSize={22} letterSpacing={2}>CARTEIRA</text>
        </g>
      </svg>
      <Chip logo="binance" x={230} y={1000} d={130} o={entre(f, M.carteira - 6, M.carteira + 4)} />
      <Heroi o={janela(f, F.ataque - 2, M.a50 + 2, 5)} top={640}>
        <Grande tam={190} cor={CIANO}>{D.fatos.inicio}</Grande>
        <Rotulo>UMA TRANSAÇÃO · BRASÍLIA</Rotulo>
      </Heroi>
      <Heroi o={entre(f, M.a50 - 3, M.a50)}>
        <Grande tam={84} cor={TEXTO}>{digitado("a50", f).padEnd(15, " ")}</Grande>
        <Grande tam={84}>{digitado("v1", f).padEnd(7, " ")}</Grande>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- mistério: a chave e a pergunta em aberto --------------------------------------------------
const Misterio: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.misterio - 2, F.padrao + 2, 6);
  if (o <= 0) return null;
  const des = entre(f, F.misterio, F.misterio + 26, ioCubico);
  const q = mola(f, M.como - 4, { damping: 10, stiffness: 180 });
  const onda = Math.sin((f - F.misterio) / 9) * 1.6;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="A CHAVE DA CARTEIRA" direita="ATÉ 1/11" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonChave" /></defs>
        <g transform={`rotate(${-12 + onda} 540 790)`}>
          <Neon filtro="neonChave" cor={CIANO} largura={4}>
            <circle cx={330} cy={790} r={118} {...traco(des)} />
            <circle cx={330} cy={790} r={48} {...traco(des)} />
            <path d="M448,790 H830 V870 H776 V826 H716 V880 H660 V826 H600" {...traco(des)} />
            <path d="M448,762 H830 V790" {...traco(des)} strokeOpacity={0.45} />
          </Neon>
        </g>
        {q > 0 && (
          <text x={800} y={790} textAnchor="middle" fill={LARANJA} fontFamily={SORA} fontWeight={300} fontSize={300 * (0.6 + 0.4 * q)} opacity={Math.min(1, q * 1.5)} {...CONTORNO}>?</text>
        )}
        <g fontFamily={MONO} fontSize={26} letterSpacing={2} textAnchor="middle">
          <text x={540} y={448} fill={TEXTO} opacity={entre(f, M.evidencia - 4, M.evidencia + 4)} {...CONTORNO}>BINANCE: SEM EVIDÊNCIA DE VAZAMENTO DA CHAVE</text>
          <text x={540} y={1124} fill={LARANJA} opacity={entre(f, M.como, M.como + 8)} {...CONTORNO}>COMO FORAM ASSINADAS? AINDA SEM EXPLICAÇÃO</text>
        </g>
      </svg>
      <Tag texto="EM INVESTIGAÇÃO · ATÉ 1/11" top={1232} o={entre(f, F.misterio + 2, F.misterio + 8)} />
    </AbsoluteFill>
  );
};

// --- padrão: 62% sem contar a Binance --------------------------------------------------------------
const BY = 438, BH = 110;
const PX = (pct: number) => ((X1 - X0) * pct) / 100;
const PT = D.partes;
const LINHAS = [
  { id: "chave", y: 690, logos: ["ronin", "bitget"], de: M.pchave },
  { id: "sistema", y: 840, logos: [] as string[], de: M.sistema },
  { id: "gente", y: 990, logos: ["bybit"], de: M.gente },
];

const Padrao: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.padrao - 2, F.cauda + 2, 6);
  if (o <= 0) return null;
  const enche = conta("c62", f, ioCubico);
  const fundo = entre(f, F.padrao, F.padrao + 12);
  const caso = janela(f, F.padrao, M.pchave - 2, 6);
  const risca = entre(f, M.contar - 2, M.contar + 8, saida);
  let x = X0;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="QUASE 1.300 ATAQUES" direita="SEM A BINANCE" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <rect x={X0} y={BY} width={(X1 - X0) * fundo} height={BH} fill={TEXTO_2} fillOpacity={0.14} stroke={TEXTO_2} strokeOpacity={0.6} strokeWidth={1.5} />
        {PT.filter((p) => p.id !== "resto").map((p, k) => {
          const w = PX(p.pct), xi = x;
          x += w;
          const q = limita((enche * D.pct62 - (PT[0].pct * Number(k > 0) + PT[1].pct * Number(k > 1))) / p.pct);
          return <rect key={p.id} x={xi} y={BY} width={w * q} height={BH} fill={LARANJA} fillOpacity={0.92 - k * 0.22} stroke={FUNDO} strokeWidth={2} />;
        })}
        <text x={X1} y={BY + BH + 42} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2} opacity={fundo}>OUTROS {Math.round(PT[3].pct)}%</text>
        {LINHAS.map((l) => {
          const p = PT.find((q) => q.id === l.id)!;
          const e = entre(f, l.de - 3, l.de + 6);
          return (
            <g key={l.id} opacity={e} fontFamily={MONO} transform={`translate(${(1 - e) * -18} 0)`}>
              <text x={X0} y={l.y + 22} fill={LARANJA} fontSize={64}>{Math.round(p.pct)}%</text>
              <text x={X0 + 170} y={l.y + 16} fill={TEXTO} fontSize={38} letterSpacing={1}>{p.nome}</text>
            </g>
          );
        })}
      </svg>
      <Chip logo="binance" x={540} y={820} d={280} o={caso * (1 - 0.55 * risca)} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g opacity={caso}>
          {risca > 0 && <line x1={370} y1={990} x2={370 + 340 * risca} y2={990 - 340 * risca} stroke={LARANJA} strokeWidth={8} strokeLinecap="round" />}
          <text x={540} y={1044} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2} opacity={risca}>SEM ESTE CASO</text>
        </g>
      </svg>
      {LINHAS.flatMap((l) => l.logos.map((logo, k) => (
        <Chip key={logo} logo={logo} x={X1 - 62 - k * 138} y={l.y} d={124} s={mola(f, l.de + k * 3, { damping: 11, stiffness: 200 })} />
      )))}
      <Heroi o={entre(f, M.p62 - 3, M.p62)}>
        <Grande tam={132}>{Math.round(D.pct62 * enche)}%</Grande>
        <Rotulo>DO DINHEIRO · CLASSIFICAÇÃO DA DEFILLAMA</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- cauda: as bolhas, por área, numa escala só ------------------------------------------------------
type Bolha = { a: [number, number]; b: [number, number]; r: number; d: number; logo?: string; nome?: string };
const BOLHAS = D.bolhas as unknown as Bolha[];
const [CXB, CYB] = D.centro as [number, number];
const S_ZOOM = 4.6; // a bolha passa da tela e todo o texto fica dentro dela

const Cauda: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.cauda - 2, F.congelar + 2, 6);
  if (o <= 0) return null;
  const pos = (b: Bolha): [number, number] => {
    const t0 = M.esse + (b.d / 420) * 9;
    const e = saida(limita((f - t0) / 14));
    return [b.a[0] + (b.b[0] - b.a[0]) * e, b.a[1] + (b.b[1] - b.a[1]) * e];
  };
  const pop = (i: number) => limita((f - (F.cauda + hash(i) * 20)) / 6);
  // a escala da Binance é a mesma das outras; a mola só dá o baque da chegada
  const rBin = D.rBin * Math.min(1.04, mola(f, M.esse, { damping: 11, stiffness: 170 }));
  const dentro = entre(f, M.esse + 8, M.quarto + 2, ioCubico);
  const fora = entre(f, M.cauda - 10, M.cauda + 12, ioCubico);
  const s = 1 + (S_ZOOM - 1) * dentro * (1 - fora);
  // enquanto a Binance toma a tela, o resto apaga: nada passa por trás da legenda
  // (pelo relógio, não pelo zoom: dá pra ver o empurrão, e a legenda já entra limpa)
  const resto = 1 - 0.88 * entre(f, M.esse + 10, M.esse + 20) * (1 - entre(fora, 0.5, 1));
  const tip = BOLHAS[D.tipica];
  const [tx, ty] = pos(tip);
  const oTip = janela(f, M.menos - 4, M.esse + 2, 5);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: `translate(${CXB}px, ${CYB}px) scale(${s}) translate(${-CXB}px, ${-CYB}px)` }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs><FiltroNeon id="neonBin" desvio={9} /></defs>
          <g opacity={resto}>
          {BOLHAS.map((b, i) => {
            const p = pop(i);
            if (p <= 0 || b.logo) return null;
            const [x, y] = pos(b);
            return b.r < 2.5
              ? <circle key={i} cx={x} cy={y} r={b.r * p} fill={CIANO} opacity={0.85} />
              : <circle key={i} cx={x} cy={y} r={b.r * p} fill={CIANO} fillOpacity={0.16} stroke={CIANO} strokeOpacity={0.75} strokeWidth={1} />;
          })}
          {BOLHAS.filter((b) => b.nome).map((b) => {
            const [x, y] = pos(b);
            // nome comprido quebra em linhas pra caber na bolha
            const linhas = b.nome!.split(" ");
            const maior = Math.max(...linhas.map((l) => l.length));
            const tam = Math.min(38, b.r * 0.46, (b.r * 1.7) / (maior * 0.66));
            return (
              <text key={b.nome} x={x} y={y + tam * 0.36 - ((linhas.length - 1) * tam * 1.14) / 2} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={tam} letterSpacing={1}>
                {linhas.map((l, k) => <tspan key={l} x={x} dy={k ? tam * 1.14 : 0}>{l}</tspan>)}
              </text>
            );
          })}
          </g>
          {rBin > 0 && (
            <Neon filtro="neonBin" cor={LARANJA} largura={3}>
              <circle cx={CXB} cy={CYB} r={rBin} />
            </Neon>
          )}
          {rBin > 0 && <circle cx={CXB} cy={CYB} r={rBin} fill={LARANJA} fillOpacity={0.12} />}
        </svg>
        {BOLHAS.map((b, i) => {
          if (!b.logo) return null;
          const [x, y] = pos(b);
          return <Chip key={b.logo} logo={b.logo} x={x} y={y} d={b.r * 1.94} s={pop(i)} o={resto} />;
        })}
        {/* o logo não é dado: encolhe no zoom pra não cobrir o texto. O dado é o círculo. */}
        <Chip logo="binance" x={CXB} y={CYB} d={(rBin * 1.3) / Math.max(1, s / 1.7)} />
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g opacity={oTip}>
          <line x1={tx} x2={tx} y1={ty + 30} y2={1182} stroke={LARANJA} strokeWidth={2} />
          <circle cx={tx} cy={ty} r={30} fill="none" stroke={LARANJA} strokeWidth={3} />
          <circle cx={tx} cy={ty} r={tip.r} fill={LARANJA} />
        </g>
      </svg>
      <Status top={STATUS_TOP} esquerda="SÓ ATAQUES COM VALOR INFORMADO" />
      <Heroi o={janela(f, M.menos - 3, M.esse + 2, 3)}>
        <Grande tam={80}>{digitado("m1", f).padEnd(17, " ")}</Grande>
        <Rotulo>MEDIANA</Rotulo>
      </Heroi>
      <Heroi o={Math.min(entre(f, M.esse + 2, M.esse + 8), 1 - entre(f, M.cauda - 6, M.cauda))}>
        <Grande tam={132}>{Math.round(D.pctBin)}%</Grande>
        <Rotulo cor={TEXTO}>BINANCE: US$ {br(D.binance / 1e9, 2)} BI · DEFILLAMA</Rotulo>
      </Heroi>
      <Tag texto="CAUDA PESADA" top={1196} o={entre(f, M.cauda - 2, M.cauda + 4)} tam={52} />
      <Heroi o={entre(f, M.cauda + 2, M.cauda + 8)} top={1300}>
        <Rotulo cor={TEXTO}>BINANCE: US$ {br(D.binance / 1e9, 2)} BI · DEFILLAMA</Rotulo>
        <Rotulo cor={TEXTO}>LUBIAN: US$ 3,5 BI EM 2020, REVELADO DEPOIS</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- congelar: Tether e Circle têm botão ----------------------------------------------------------------
const Congelar: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.congelar - 2, F.bitcoin + 2, 6);
  if (o <= 0) return null;
  const pT = mola(f, M.virada - 2, { damping: 12, stiffness: 180 });
  const trancaT = entre(f, M.tether + 6, M.tether + 12);
  const barra = conta("c285", f, ioCubico);
  const pC = mola(f, M.digital - 8, { damping: 12, stiffness: 180 });
  const trancaC = entre(f, M.digital + 2, M.digital + 8);
  const W = X1 - X0;
  const oB = entre(f, M.p44 - 6, M.p44);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="A VIRADA" direita="ATÉ 31/10" />
      <Chip logo="tether" x={270} y={570} d={230} s={pT} />
      <Chip logo="circle" x={270} y={1020} d={170} s={pC} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {pT > 0.5 && <Trava x={360} y={646} s={1.15} fecha={trancaT} />}
        {pC > 0.5 && <Trava x={336} y={1078} s={0.95} fecha={trancaC} />}
        <g fontFamily={MONO}>
          <text x={430} y={560} fill={LARANJA} fontSize={80} letterSpacing={-1}>{digitado("b12", f)}</text>
          <g opacity={entre(f, M.m37 - 3, M.m37 + 3)}>
            <text x={430} y={612} fill={TEXTO} fontSize={32} letterSpacing={1}>{D.fatos.minutosUsdt} MIN DEPOIS DE</text>
            <text x={430} y={652} fill={TEXTO} fontSize={32} letterSpacing={1}>O DINHEIRO CHEGAR</text>
          </g>
          <g opacity={oB}>
            <text x={X0} y={772} fill={TEXTO_2} fontSize={24} letterSpacing={2}>DOS US$ {br(D.fatos.elliptic / 1e9, 1)} BI · ELLIPTIC</text>
            <rect x={X0} y={790} width={W} height={70} fill={TEXTO_2} fillOpacity={0.14} stroke={TEXTO_2} strokeOpacity={0.6} strokeWidth={1.5} />
            <rect x={X0} y={790} width={(W * D.fatos.congelado * barra) / D.fatos.elliptic} height={70} fill={CIANO} fillOpacity={0.75} />
            <text x={X0 + 18} y={839} fill={FUNDO} fontSize={38}>{Math.round(D.fatos.pctCongelado * barra)}% TRAVADOS</text>
          </g>
          <g opacity={entre(f, M.digital - 4, M.digital + 4)}>
            <text x={400} y={1006} fill={TEXTO} fontSize={32} letterSpacing={1}>{D.fatos.pctStable}% EM DÓLAR DIGITAL</text>
            <text x={400} y={1050} fill={TEXTO_2} fontSize={26} letterSpacing={1} opacity={entre(f, M.empresa - 4, M.empresa + 4)}>TEM EMPRESA POR TRÁS</text>
          </g>
        </g>
      </svg>
      <Heroi o={oB}>
        <Grande tam={112}>US$ {br((D.fatos.congelado / 1e9) * barra, 2)} BI</Grande>
        <Rotulo>ELLIPTIC · ATÉ 31/10 · TRAVADO NÃO É RECUPERADO</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- Bitcoin: sem cadeado, 19 endereços ---------------------------------------------------------------
const BitcoinCena: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.bitcoin - 2, F.quem + 2, 6);
  if (o <= 0) return null;
  const XC = 262, YC = 770, N = D.fatos.enderecos;
  const p = mola(f, F.bitcoin - 2, { damping: 12, stiffness: 180 });
  const cai = entre(f, F.bitcoin + 8, F.bitcoin + 30, Easing.in(Easing.quad));
  const ramos = entre(f, M.m18 - 8, M.m18 + 14, ioCubico);
  const fio = (k: number) => {
    const y = 420 + (k * (1120 - 420)) / (N - 1);
    return { y, d: `M${XC + 134},${YC} C${XC + 330},${YC} ${XC + 280},${y} 915,${y}` };
  };
  const nada = entre(f, M.nenhum - 3, M.nenhum + 3);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="SEM CADEADO" direita={`${N} ENDEREÇOS`} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: N }, (_, k) => {
          const { y, d } = fio(k);
          return (
            <g key={k}>
              <path d={d} fill="none" stroke={CIANO} strokeOpacity={0.55} strokeWidth={1.5} {...traco(ramos)} />
              <circle cx={915} cy={y} r={10 * entre(ramos, 0.85, 1)} fill={LARANJA} />
            </g>
          );
        })}
      </svg>
      <Chip logo="bitcoin-800" x={XC} y={YC} d={270} s={p} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {cai < 1 && <g opacity={1 - cai}><Trava x={XC} y={YC + 110 + cai * 220} s={1.4} fecha={0} cor={TEXTO} /></g>}
      </svg>
      <Heroi o={Math.min(entre(f, M.m18 - 3, M.m18), 1 - nada)}>
        <Grande tam={104}>{digitado("btc", f).padEnd(10, " ")}</Grande>
        <Rotulo>ROUBADOS · ATÉ 31/10</Rotulo>
      </Heroi>
      <Heroi o={nada}>
        <Grande tam={92}>NENHUM TRAVADO</Grande>
        <Rotulo cor={TEXTO}>ATÉ 31/10</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- quem: atribuição do FBI e os 95% ---------------------------------------------------------
const Quem: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.quem - 2, F.pergunta + 2, 6);
  if (o <= 0) return null;
  const liga = entre(f, F.quem + 4, M.coreia, saida);
  const baixo = entre(f, M.binance2 - 4, M.binance2 + 4);
  const reposto = mola(f, M.p95 - 4, { damping: 12, stiffness: 180 });
  const caixa = (y: number, l1: string, l2?: string, op = 1) => (
    <g opacity={op} fontFamily={MONO} textAnchor="middle">
      <rect x={170} y={y} width={740} height={l2 ? 122 : 88} fill={FUNDO} stroke={TEXTO_2} strokeWidth={1.5} />
      <text x={540} y={y + (l2 ? 50 : 56)} fill={TEXTO} fontSize={38} letterSpacing={1}>{l1}</text>
      {l2 && <text x={540} y={y + 98} fill={TEXTO} fontSize={38} letterSpacing={1}>{l2}</text>}
    </g>
  );
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="QUEM FOI" direita="ATÉ 1/11" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {caixa(410, "FBI · ALERTA DE 31/10")}
        <line x1={540} x2={540} y1={498} y2={498 + 112 * liga} stroke={TEXTO_2} strokeWidth={3} strokeDasharray="8 10" />
        {caixa(610, "COREIA DO NORTE", "GRUPO TRADERTRAITOR", entre(f, M.coreia - 8, M.coreia))}
      </svg>
      <Chip logo="binance" x={236} y={916} d={150} o={baixo} />
      <div style={{ position: "absolute", top: 838, left: 340, fontFamily: MONO, fontSize: 132, lineHeight: 1, color: LARANJA, letterSpacing: -2, opacity: Math.min(1, reposto * 1.5), textShadow: `0 0 30px ${LARANJA}55` }}>{D.fatos.reposto}%</div>
      <Tag texto={`${D.fatos.reposto}%: DADO DA BINANCE`} top={1020} o={entre(f, M.p95 - 2, M.p95 + 4)} tam={40} cor={TEXTO} />
      <Tag texto="ATRIBUIÇÃO DO FBI" top={1232} o={entre(f, F.quem + 2, F.quem + 8)} />
    </AbsoluteFill>
  );
};

// --- pergunta: o botão ------------------------------------------------------------------------------------
const Pergunta: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.pergunta - 2, G0 + 2, 6);
  if (o <= 0) return null;
  const [cx, cy] = [540, 780];
  const btc = 1 - entre(f, M.dolar - 6, M.dolar + 2);
  const aviso = mola(f, F.pergunta + 2, { damping: 12, stiffness: 180 });
  const pB = mola(f, M.dolar - 2, { damping: 11, stiffness: 180 });
  const aperta = mola(f, M.travou - 2, { damping: 9, stiffness: 260 }) * (1 - entre(f, M.travou + 6, M.travou + 18));
  const onda = entre(f, M.travou, M.travou + 26, saida);
  const ladoB = entre(f, M.mas - 3, M.mas + 5);
  const trancas = entre(f, M.travou + 2, M.travou + 8);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="O BOTÃO DE TRAVAR" direita={btc > 0.5 ? "BITCOIN" : "DÓLAR DIGITAL"} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonBotao" /></defs>
        <Anel cx={cx} cy={cy} R={R_ANEL} p={0} filtro="neonBotao" />
        {btc > 0 && <circle cx={cx} cy={cy} r={170} fill="none" stroke={TEXTO_2} strokeWidth={3} strokeDasharray="10 12" opacity={btc} />}
        {pB > 0 && (
          <g transform={`translate(${cx} ${cy}) scale(${pB * (1 - 0.09 * aperta)})`}>
            <Neon filtro="neonBotao" cor={LARANJA} largura={4}><circle cx={0} cy={0} r={170} /></Neon>
            <circle r={170} fill={LARANJA} fillOpacity={0.16 + 0.2 * aperta} />
            <circle r={132} fill="none" stroke={LARANJA} strokeWidth={2} />
            <Trava x={0} y={-8} s={1.9} fecha={1} />
          </g>
        )}
        {onda > 0 && onda < 1 && <circle cx={cx} cy={cy} r={170 + 260 * onda} fill="none" stroke={LARANJA} strokeWidth={3} opacity={1 - onda} />}
      </svg>
      <Chip logo="bitcoin-800" x={cx} y={cy} d={260} o={btc} s={aviso} />
      <Chip logo="tether" x={cx - 318} y={cy} d={128} s={mola(f, M.dolar + 4, { damping: 11, stiffness: 200 })} />
      <Chip logo="usd-coin" x={cx + 318} y={cy} d={128} s={mola(f, M.dolar + 8, { damping: 11, stiffness: 200 })} />
      <Chip logo="bitcoin-800" x={cx} y={cy - 318} d={128} s={mola(f, M.mas, { damping: 11, stiffness: 200 })} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {trancas > 0 && <g opacity={trancas}><Trava x={cx - 270} y={cy + 56} s={0.72} fecha={1} /><Trava x={cx + 366} y={cy + 56} s={0.72} fecha={1} /></g>}
      </svg>
      <Heroi o={Math.min(entre(f, M.q3 - 3, M.q3 + 2), 1 - ladoB)}>
        <Grande tam={92}>QUASE US$ 3 BI</Grande>
        <Rotulo>TRAVADOS ATÉ 31/10 · ELLIPTIC</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

/** A pergunta do fim, grande, palavra por palavra. */
const PerguntaFinal: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, G0 - 4, G0 + 2) * (1 - entre(f, FIM - 8, FIM));
  if (o <= 0) return null;
  const linhas = [0, 1, 2].map((l) => T.grande.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top: 560, left: 90, width: 900, textAlign: "center", opacity: o,
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
      <AssinaturaCta />
    </div>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/binance/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/binance/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Binance: React.FC = () => (
  <Fundo>
    <Abertura />
    <Fortaleza />
    <Cofres />
    <Ataque />
    <Misterio />
    <Padrao />
    <Cauda />
    <Congelar />
    <BitcoinCena />
    <Quem />
    <Pergunta />
    <PerguntaFinal />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-binance.mjs: riser na bolha, whoosh nas trocas, tiques no relógio e nos números */}
    <Audio src={staticFile("ciencia/binance/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
export const BinanceCapa: React.FC = () => (
  <Fundo>
    <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2 }}>
      BINANCE · 29/10/2026
    </div>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs><FiltroNeon id="neonCapa" /></defs>
      <Anel cx={540} cy={690} R={R_ANEL} p={0.85} filtro="neonCapa" />
    </svg>
    <Chip logo="binance" x={540} y={690} d={300} />
    <div style={{
      position: "absolute", top: 1050, left: 90, width: 900, textAlign: "center",
      fontFamily: SORA, fontWeight: 300, fontSize: 116, lineHeight: 1.08, letterSpacing: -1.5, color: TEXTO,
      textShadow: "0 0 30px rgba(5,7,12,0.95)",
    }}>
      <span style={{ color: LARANJA }}>2,5 bilhões</span><br />em menos de<br />4 minutos
    </div>
  </Fundo>
);
