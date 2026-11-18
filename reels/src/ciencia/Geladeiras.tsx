import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./geladeiras.json";
import T from "./geladeiras-tempos.json";
import { Fundo, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon } from "./ilustra-dolar";
import { AssinaturaCta } from "./marca";

// Geladeiras de supermercado hackeadas na França (noite de 11 para 12/10/2026), reel de 12/11/2026.
// Segundo a promotoria de Paris: ~700 locais, ~20 começos de incêndio, degelo sem fim e alarmes
// desligados. Dado nosso: as 26 falhas da Danfoss e da Copeland publicadas pela CISA antes do ataque
// (avisos ICSA-25-140-03 e ICSA-26-057-10) e nenhuma delas no catálogo KEV. 820 painéis Danfoss
// expostos em redes francesas, na conta da Coalition. Autoria: a versão da França e a resposta do
// Irã com o mesmo peso visual (mesmo cartão, mesma cor, mesmo tamanho).
//
// O quadro 0 não tem número: o termômetro do balcão já sobe (sem escala numérica) e o texto diz o
// assunto e a data real. A causa exata dos incêndios não foi divulgada, e a tela diz isso.
// Sem logos: Danfoss, Copeland e Dixell aparecem só em texto, como identificação do equipamento.
//
// Números: geladeiras.json (o tempos-geladeiras.mjs confere a fala e o kev-resumo.json contra ele).
// Tempos: geladeiras-tempos.json. A trilha (gerar-trilha-geladeiras.mjs) lê os mesmos tempos.
// O laranja é o calor: o mercúrio, a resistência, os incêndios e as palavras-chave.

export const GELADEIRAS_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const FIM = T.fim;

const STATUS_TOP = 330;
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const ioCubico = Easing.inOut(Easing.cubic);
const saida = Easing.out(Easing.cubic);
const milhar = (n: number) => Math.round(n).toLocaleString("pt-BR");

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

/** Pseudoaleatório fixo (a mesma escolha em todo render). */
const sorteio = (n: number, k: number, semente: number) => {
  let s = semente >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return new Set(idx.slice(0, k));
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

const fonteDe = (f: number) =>
  f < F.painel ? "FONTE: PROMOTORIA DE PARIS, VIA FRANCEINFO"
    : f < F.degelo ? "FONTE: CERT-FR · CERTFR-2026-ALE-012"
      : f < F.falhas ? "FONTE: PROMOTORIA DE PARIS, VIA FRANCE 24"
        : f < F.kev ? "FONTE: CISA · ICSA-25-140-03 E ICSA-26-057-10"
          : f < F.expostos ? "FONTE: CISA · CATÁLOGO KEV, CONFERIDO EM 12/11"
            : f < F.autoria ? "FONTE: COALITION · 7/9 A 6/10/2026"
              : f < F.pergunta ? "FONTES: PROMOTORIA DE PARIS · MRE DO IRÃ, VIA AL JAZEERA"
                : "FONTE: PROMOTORIA DE PARIS, VIA FRANCEINFO";

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, textShadow: "0 0 10px rgba(5,7,12,1)" }}>
      {fonteDe(f)}
    </div>
  );
};

const Tag: React.FC<{ texto: string; top: number; o?: number; cor?: string; tam?: number; x0?: number; w?: number }> = ({
  texto, top, o = 1, cor = LARANJA, tam = 34, x0 = X0, w = X1 - X0,
}) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: x0, width: w, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ border: `3px solid ${cor}`, padding: "12px 22px", fontFamily: MONO, fontSize: tam, lineHeight: 1.2, letterSpacing: 2, color: cor, background: "rgba(5,7,12,0.86)", whiteSpace: "pre", textAlign: "center", minHeight: tam * 1.2 }}>{texto || " "}</div>
    </div>
  );

const Rotulo: React.FC<{ top: number; texto: string; o?: number; cor?: string; tam?: number }> = ({ top, texto, o = 1, cor = TEXTO_2, tam = 24 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: tam, letterSpacing: 3, color: cor, opacity: o, whiteSpace: "pre-line", lineHeight: 1.35 }}>{texto}</div>
  );

// --- o termômetro do balcão (sem escala numérica: o quadro 0 não tem número) -----------------
const V0 = 0.12; // nível do quadro 0 e do último quadro (o loop emenda aqui)
/** Nível de 0 (frio) a 1 (quente) no quadro f. Sobe no gancho, segue alto e volta a V0 no fim. */
const nivel = (f: number) => {
  if (f >= FIM) return 0.9 + (V0 - 0.9) * entre(f, FIM, T.total - 1, ioCubico);
  const sobe = V0 + (0.62 - V0) * entre(f, 0, M.atingiu, Easing.out(Easing.quad));
  return sobe + 0.28 * entre(f, F.degelo, M.parar + 10, ioCubico);
};

const Termometro: React.FC<{ x: number; y: number; h: number; v: number; escala?: number }> = ({ x, y, h, v, escala = 1 }) => {
  const r = 34 * escala, tubo = 16 * escala, merc = 8 * escala;
  const yb = y + h, yTopo = y, yM = yb - r - (h - r - 10) * v;
  return (
    <g>
      <rect x={x - merc - 6} y={yM - 6} width={(merc + 6) * 2} height={yb - yM} fill={LARANJA} opacity={0.22} filter="url(#neonG)" />
      <rect x={x - merc} y={yM} width={merc * 2} height={yb - yM} fill={LARANJA} />
      <circle cx={x} cy={yb} r={r - 8 * escala} fill={LARANJA} />
      <Neon filtro="neonG" cor={CIANO} largura={2.5}>
        <path d={`M${x - tubo},${yb - Math.sqrt(r * r - tubo * tubo)} V${yTopo + tubo} A${tubo},${tubo} 0 0 1 ${x + tubo},${yTopo + tubo} V${yb - Math.sqrt(r * r - tubo * tubo)} A${r},${r} 0 1 1 ${x - tubo},${yb - Math.sqrt(r * r - tubo * tubo)} Z`} />
      </Neon>
      {Array.from({ length: 9 }, (_, i) => {
        const yy = yb - r - 20 - i * ((h - r - 40) / 8);
        return <line key={i} x1={x - tubo - 16} x2={x - tubo - 4} y1={yy} y2={yy} stroke={TEXTO_2} strokeOpacity={0.6} strokeWidth={2} />;
      })}
      {/* floco embaixo, chama em cima: frio e quente, sem número */}
      <g stroke={CIANO} strokeWidth={2.5} opacity={0.9}>
        {[0, 60, 120].map((a) => {
          const cx = x + tubo + 34, cy = yb - r - 20, l = 14;
          const rad = (a * Math.PI) / 180;
          return <line key={a} x1={cx - l * Math.cos(rad)} y1={cy - l * Math.sin(rad)} x2={cx + l * Math.cos(rad)} y2={cy + l * Math.sin(rad)} />;
        })}
      </g>
      <path d={`M${x + tubo + 34},${yTopo + 8} c 12,14 14,24 0,34 c -14,-10 -12,-20 0,-34 Z`} fill="none" stroke={LARANJA} strokeWidth={2.5} opacity={0.4 + 0.6 * v} />
    </g>
  );
};

/** O balcão refrigerado aberto, de frente: três prateleiras com produtos e gelo que derrete com o calor. */
const Balcao: React.FC<{ v: number; x?: number; y?: number; w?: number; h?: number }> = ({ v, x = 150, y = 520, w = 600, h = 640 }) => {
  const prat = [0.3, 0.55, 0.8].map((p) => y + h * p);
  const gelo = Math.max(0, 1 - (v - V0) / 0.45); // o gelo some quando o nível passa de ~0,55
  const prods = [
    // [prateleira, x relativo, largura, altura, forma]
    ...[0.08, 0.24, 0.4, 0.56, 0.72].map((px, i) => [0, px, 0.1, 0.13 - (i % 2) * 0.03, "garrafa"] as const),
    ...[0.08, 0.3, 0.52, 0.74].map((px) => [1, px, 0.17, 0.1, "caixa"] as const),
    ...[0.08, 0.38, 0.68].map((px) => [2, px, 0.24, 0.07, "bandeja"] as const),
  ];
  return (
    <g>
      {/* calor saindo de dentro, cresce com o nível */}
      <rect x={x + 20} y={y + 60} width={w - 40} height={h - 80} fill={LARANJA} opacity={0.18 * Math.max(0, (v - 0.35) / 0.6)} filter="url(#neonG)" />
      <Neon filtro="neonG" cor={CIANO} largura={3}>
        <path d={`M${x},${y + h} V${y + 40} L${x + 40},${y} H${x + w - 40} L${x + w},${y + 40} V${y + h} Z`} />
        <line x1={x} x2={x + w} y1={y + 70} y2={y + 70} />
        {prat.map((py, i) => <line key={i} x1={x + 14} x2={x + w - 14} y1={py} y2={py} />)}
      </Neon>
      {/* produtos: traço fino, sem marca */}
      {prods.map(([p, px, pw, ph, forma], i) => {
        const base = prat[p], X = x + w * px, W = w * pw, H = h * ph;
        const d = forma === "garrafa"
          ? `M${X + W * 0.3},${base} V${base - H * 0.7} L${X + W * 0.42},${base - H * 0.82} V${base - H} H${X + W * 0.58} V${base - H * 0.82} L${X + W * 0.7},${base - H * 0.7} V${base} Z`
          : `M${X},${base} V${base - H} H${X + W} V${base} Z`;
        return <path key={i} d={d} fill="none" stroke={TEXTO} strokeOpacity={0.55} strokeWidth={2} />;
      })}
      {/* gelo: cristais sob cada prateleira */}
      {gelo > 0 && prat.map((py, i) => (
        <g key={i} opacity={gelo} stroke={CIANO} strokeWidth={2}>
          {Array.from({ length: 11 }, (_, k) => {
            const cx = x + 40 + k * ((w - 80) / 10), cy = py + 10, l = 7 * gelo;
            return <g key={k}><line x1={cx - l} x2={cx + l} y1={cy} y2={cy} /><line x1={cx} x2={cx} y1={cy - l} y2={cy + l} /></g>;
          })}
        </g>
      ))}
      <Termometro x={x + w + 90} y={y + 20} h={h - 40} v={v} />
    </g>
  );
};

// --- cena 1: o balcão, e ele vira um ponto entre ~700 -----------------------------------------
const GRADE = { cols: 28, rows: 25, x0: 160, y0: 560, dx: 28.5, dy: 27 };
const N_LOCAIS = GRADE.cols * GRADE.rows;
if (N_LOCAIS !== D.locais) throw new Error("a grade tem que ter um ponto por local");
const FOGO = sorteio(N_LOCAIS, D.incendios, 1012);
const CENTRO = { c: 13, r: 12 };

const CenaBalcao: React.FC = () => {
  const f = useCurrentFrame();
  const naPergunta = f >= F.pergunta - 4;
  const o = naPergunta ? entre(f, F.pergunta - 4, F.pergunta + 6) : 1 - entre(f, M.atingiu - 2, M.n700 - 2);
  if (o <= 0) return null;
  const v = nivel(f);
  const encolhe = naPergunta ? 0 : entre(f, M.atingiu - 6, M.n700 - 2, ioCubico);
  // o balcão encolhe até virar o ponto do centro da grade
  const cx = GRADE.x0 + CENTRO.c * GRADE.dx, cy = GRADE.y0 + CENTRO.r * GRADE.dy;
  const s = 1 - 0.95 * encolhe;
  const ox = 540, oy = 840;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="BALCÃO REFRIGERADO" direita="FRANÇA" />
      <Rotulo top={1205} texto={`NOITE DE ${D.noite}`} o={(1 - encolhe) * (naPergunta ? 0 : 1)} tam={24} cor={TEXTO} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonG" desvio={6} /></defs>
        <g transform={`translate(${ox + (cx - ox) * encolhe},${oy + (cy - oy) * encolhe}) scale(${s}) translate(${-ox},${-oy})`}>
          <Balcao v={v} />
        </g>
      </svg>
      {naPergunta && (
        <Rotulo top={1225} texto="PAINEL ABERTO NA INTERNET → DEGELO SEM FIM → ALARME MUDO" o={entre(f, M.internetP - 8, M.internetP + 4) * (1 - entre(f, FIM - 8, FIM))} tam={22} cor={TEXTO} />
      )}
    </AbsoluteFill>
  );
};

// --- cena 2: ~700 locais e ~20 começos de incêndio ---------------------------------------------
const CenaLocais: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, M.atingiu - 2, F.painel + 4, 8);
  if (o <= 0) return null;
  const n = conta("c700", f);
  const fogo = entre(f, M.n20 - 4, M.n20 + 10);
  const dist = (c: number, r: number) => Math.hypot(c - CENTRO.c, r - CENTRO.r) / Math.hypot(CENTRO.c, CENTRO.r);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="LOCAIS ATINGIDOS" direita="1 NOITE" />
      <div style={{ position: "absolute", top: 395, width: "100%", textAlign: "center", fontFamily: MONO, color: TEXTO, opacity: entre(f, M.n700 - 3, M.n700 + 3), scale: `${0.9 + 0.1 * mola(f, M.n700 - 3)}` }}>
        <span style={{ fontSize: 96, letterSpacing: -2 }}>~{milhar(D.locais)}</span>
        <span style={{ fontSize: 30, letterSpacing: 3, color: TEXTO_2 }}> LOCAIS</span>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonL" desvio={5} /></defs>
        {Array.from({ length: N_LOCAIS }, (_, i) => {
          const c = i % GRADE.cols, r = Math.floor(i / GRADE.cols);
          const aparece = n >= dist(c, r) * 0.98 ? 1 : 0;
          if (!aparece) return null;
          const x = GRADE.x0 + c * GRADE.dx, y = GRADE.y0 + r * GRADE.dy;
          const quente = FOGO.has(i) && fogo > 0;
          return quente ? (
            <g key={i}>
              <circle cx={x} cy={y} r={14 * fogo} fill={LARANJA} opacity={0.35} filter="url(#neonL)" />
              <path d={`M${x},${y - 13 * fogo} c ${8 * fogo},${9 * fogo} ${9 * fogo},${16 * fogo} 0,${22 * fogo} c ${-9 * fogo},${-6 * fogo} ${-8 * fogo},${-13 * fogo} 0,${-22 * fogo} Z`} fill={LARANJA} />
            </g>
          ) : <circle key={i} cx={x} cy={y} r={5} fill={CIANO} opacity={0.75} />;
        })}
      </svg>
      <Rotulo top={1240} texto="1 PONTO = 1 LOCAL · POSIÇÕES ILUSTRATIVAS" o={entre(f, M.n700, M.n700 + 8)} tam={20} />
      <div style={{ position: "absolute", top: 1282, width: "100%", textAlign: "center", fontFamily: MONO, opacity: fogo }}>
        <div style={{ fontSize: 40, color: LARANJA, letterSpacing: 2, textShadow: `0 0 20px ${LARANJA}55` }}>~{D.incendios} COMEÇOS DE INCÊNDIO</div>
        <div style={{ fontSize: 20, color: TEXTO_2, letterSpacing: 3, marginTop: 8 }}>SEGUNDO A PROMOTORIA · CAUSA EXATA NÃO DIVULGADA</div>
      </div>
    </AbsoluteFill>
  );
};

// --- cena 3: o painel aberto na internet --------------------------------------------------------
const PAINEL = { x: 170, y: 760, w: 740, h: 330 };

const Globo: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <Neon filtro="neonP" cor={CIANO} largura={2.5}>
    <circle cx={cx} cy={cy} r={r} />
    <ellipse cx={cx} cy={cy} rx={r * 0.45} ry={r} />
    <line x1={cx - r} x2={cx + r} y1={cy} y2={cy} />
    <path d={`M${cx - r * 0.87},${cy - r * 0.5} H${cx + r * 0.87} M${cx - r * 0.87},${cy + r * 0.5} H${cx + r * 0.87}`} />
  </Neon>
);

const LINHAS_PAINEL = ["BALCÃO 01", "BALCÃO 02", "CÂMARA FRIA", "ILHA CONGELADOS"];

const CenaPainel: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.painel - 2, F.degelo + 6, 8);
  if (o <= 0) return null;
  const linha = entre(f, M.paineis - 2, M.frio, saida);
  const pacote = entre(f, M.internet - 8, M.internet + 8, ioCubico);
  const invadido = entre(f, M.internet + 6, M.internet + 12);
  const gy = 545, gx = 540;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="CONTROLE DO FRIO" direita="ACESSO REMOTO" />
      <AbsoluteFill>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <defs><FiltroNeon id="neonP" desvio={5} /></defs>
          <Globo cx={gx} cy={gy} r={70} />
          <line x1={gx} x2={gx} y1={gy + 70} y2={gy + 70 + (PAINEL.y - gy - 70) * linha} stroke={CIANO} strokeWidth={3} strokeDasharray="10 8" />
          {pacote > 0 && pacote < 1 && <circle cx={gx} cy={gy + 70 + (PAINEL.y - gy - 70) * pacote} r={12} fill={LARANJA} />}
        </svg>
        <div style={{ position: "absolute", left: gx + 100, top: gy - 20, fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: TEXTO, opacity: linha }}>INTERNET</div>
        <Tag texto={digitado("cert", f)} top={385} tam={26} cor={TEXTO} o={digitado("cert", f) ? 1 : 0} />
      </AbsoluteFill>
      {/* o painel: nomes dos equipamentos só em texto */}
      <div style={{
        position: "absolute", left: PAINEL.x, top: PAINEL.y, width: PAINEL.w, height: PAINEL.h,
        border: `3px solid ${invadido > 0.5 ? LARANJA : CIANO}`, background: "rgba(12,20,36,0.9)", fontFamily: MONO, color: TEXTO,
        boxShadow: `0 0 ${24 + 20 * invadido}px ${invadido > 0.5 ? LARANJA : CIANO}44`,
      }}>
        <div style={{ padding: "16px 24px", borderBottom: `2px solid ${TEXTO_2}`, display: "flex", justifyContent: "space-between", fontSize: 24, letterSpacing: 3 }}>
          <span>PAINEL DE REFRIGERAÇÃO</span><span style={{ color: invadido > 0.5 ? LARANJA : TEXTO_2 }}>{invadido > 0.5 ? "REMOTO" : "LOCAL"}</span>
        </div>
        {LINHAS_PAINEL.map((nome, i) => (
          <div key={nome} style={{ padding: "13px 24px", display: "flex", justifyContent: "space-between", fontSize: 26, letterSpacing: 2, borderBottom: `1px solid ${TEXTO_2}44` }}>
            <span>{nome}</span>
            <span>
              <span style={{ color: TEXTO_2 }}>DEGELO · ALARME</span>
            </span>
          </div>
        ))}
      </div>
      <AbsoluteFill style={{ opacity: entre(f, M.paineis, M.paineis + 8) }}>
        <Rotulo top={PAINEL.y + PAINEL.h + 28} texto={"DANFOSS AK-SM · AK-SC\nCOPELAND / DIXELL XWEB"} tam={26} cor={TEXTO} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// --- cena 4: degelo sem fim e alarme mudo --------------------------------------------------------
const CenaDegelo: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.degelo, F.falhas + 2, 8);
  if (o <= 0) return null;
  const liga = entre(f, M.resistencia - 2, M.resistencia + 8);
  const derrete = entre(f, M.resistencia, M.parar + 16, ioCubico);
  const pulso = 0.75 + 0.25 * Math.sin(f / 3);
  const giro = ((f - F.degelo) * 9) % 360;
  const sino = entre(f, F.alarme - 2, F.alarme + 8);
  const mudo = entre(f, M.desligado - 2, M.desligado + 6);
  const ondas = (1 - mudo) * (0.5 + 0.5 * Math.sin(f / 2.5));
  const v = nivel(f);
  // serpentina do evaporador: tubo em zigue-zague
  const SX = 170, SY = 560, SW = 560, SH = 190, voltas = 6;
  const serp = Array.from({ length: voltas + 1 }, (_, k) => `${k ? "L" : "M"}${SX + (SW / voltas) * k},${k % 2 ? SY + SH : SY}`).join(" ");
  const RY = SY + SH + 40;
  const res = Array.from({ length: 25 }, (_, k) => `${k ? "L" : "M"}${SX + (SW / 24) * k},${RY + (k % 2 ? 14 : -14)}`).join(" ");
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Tag texto={digitado("prom", f)} top={395} tam={26} o={digitado("prom", f) ? 1 : 0} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonD" desvio={7} /></defs>
        <Neon filtro="neonD" cor={CIANO} largura={3}><path d={serp} /></Neon>
        {/* gelo na serpentina: some com o calor, e cai em gotas */}
        {Array.from({ length: 14 }, (_, k) => {
          const x = SX + 20 + k * ((SW - 40) / 13), y = SY + ((k * 37) % SH);
          const l = 12 * (1 - derrete);
          const gota = derrete > 0.1 ? ((f * 4 + k * 23) % 90) : -1;
          return (
            <g key={k}>
              {l > 0.5 && <g stroke={CIANO} strokeWidth={2.5}><line x1={x - l} x2={x + l} y1={y} y2={y} /><line x1={x} x2={x} y1={y - l} y2={y + l} /></g>}
              {gota >= 0 && <circle cx={x} cy={RY + 30 + gota} r={4} fill={CIANO} opacity={0.6 * (1 - gota / 90) * Math.min(1, derrete * 3)} />}
            </g>
          );
        })}
        {/* a resistência do degelo */}
        <path d={res} fill="none" stroke={LARANJA} strokeWidth={10} opacity={0.5 * liga * pulso} filter="url(#neonD)" />
        <path d={res} fill="none" stroke={liga > 0.5 ? LARANJA : TEXTO_2} strokeWidth={3} />
        {/* ciclo sem fim */}
        <g transform={`translate(${SX + SW / 2},${RY + 140})`} opacity={entre(f, M.degelo - 2, M.degelo + 6)}>
          <g transform={`rotate(${giro})`}>
            <path d="M 0,-44 A 44,44 0 1 1 -38,-22" fill="none" stroke={LARANJA} strokeWidth={4} />
            <path d="M -38,-22 l -4,-18 M -38,-22 l 17,-6" stroke={LARANJA} strokeWidth={4} />
          </g>
        </g>
        <Termometro x={890} y={560} h={560} v={v} escala={0.9} />
        {/* o sino do alarme, que para de tocar */}
        {sino > 0 && (
          <g transform={`translate(450,1170)`} opacity={sino}>
            <Neon filtro="neonD" cor={mudo > 0.5 ? TEXTO_2 : CIANO} largura={3}>
              <path d="M -40,20 C -40,-20 -30,-48 0,-50 C 30,-48 40,-20 40,20 L 52,34 H -52 Z" />
              <path d="M -12,40 A 12,12 0 0 0 12,40" />
            </Neon>
            {[1, 2].map((k) => (
              <g key={k} stroke={CIANO} strokeWidth={3} fill="none" opacity={ondas / k}>
                <path d={`M ${62 + k * 16},-30 A ${30 + k * 16},${30 + k * 16} 0 0 1 ${62 + k * 16},20`} />
                <path d={`M ${-62 - k * 16},-30 A ${30 + k * 16},${30 + k * 16} 0 0 0 ${-62 - k * 16},20`} />
              </g>
            ))}
            {mudo > 0 && <line x1={-70} y1={-70} x2={-70 + 140 * mudo} y2={-70 + 140 * mudo} stroke={LARANJA} strokeWidth={6} />}
          </g>
        )}
      </svg>
      <div style={{ position: "absolute", left: SX + SW / 2 + 70, top: RY + 120, fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: LARANJA, opacity: entre(f, M.degelo - 2, M.degelo + 6) * (1 - sino) }}>DEGELO<br />SEM FIM</div>
      <div style={{ position: "absolute", left: SX, top: RY + 30, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: liga > 0.5 ? LARANJA : TEXTO_2, opacity: entre(f, M.resistencia - 4, M.resistencia + 4) * (1 - sino) }}>RESISTÊNCIA LIGADA</div>
      <div style={{ position: "absolute", left: SX, top: SY - 44, opacity: 0, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>SERPENTINA DO BALCÃO</div>
      <Rotulo top={1265} texto={mudo > 0.5 ? "ALARME DE TEMPERATURA: DESLIGADO" : "ALARME DE TEMPERATURA"} o={sino} tam={26} cor={mudo > 0.5 ? LARANJA : TEXTO} />
    </AbsoluteFill>
  );
};

// --- cena 5: 26 falhas publicadas antes, nenhuma no KEV -------------------------------------------
const CEL = { cols: 3, w: 262, h: 50, gx: 12, gy: 10, y0: 800 };
const CEL_X0 = 540 - (CEL.cols * CEL.w + (CEL.cols - 1) * CEL.gx) / 2;
const datas = [
  { rotulo: D.avisos[0].rotulo, t: 0 },
  { rotulo: D.avisos[1].rotulo, t: 0.55 },
  { rotulo: "ATAQUE 11/10/2026", t: 1 },
];

const CenaFalhas: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.falhas - 2, F.expostos + 2, 8);
  if (o <= 0) return null;
  const n = conta("c26", f, Easing.linear);
  const mostradas = Math.round(D.falhas * n);
  const linhaT = entre(f, F.falhas, M.publicado, saida);
  const antes = entre(f, M.antes - 2, M.antes + 8);
  const kev = entre(f, F.kev - 4, F.kev + 6, ioCubico);
  const risca = (i: number) => entre(f, M.nenhuma - 4 + i * 0.8, M.nenhuma + i * 0.8);
  const res = entre(f, M.exploradas - 2, M.exploradas + 6);
  const TY = 640;
  const nDanfoss = D.avisos[0].cves;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda={f < F.kev ? "AVISOS DA CISA" : "CATÁLOGO KEV · CISA"} direita={f < F.kev ? "ANTES DO ATAQUE" : `${milhar(D.kev.entradas)} FALHAS`} />
      {/* linha do tempo: as duas datas dos avisos e o ataque */}
      <AbsoluteFill style={{ opacity: 1 - kev }}>
        <div style={{ position: "absolute", top: 400, width: "100%", textAlign: "center", fontFamily: MONO, color: TEXTO, opacity: mostradas > 0 ? 1 : 0 }}>
          <span style={{ fontSize: 96, letterSpacing: -2 }}>{mostradas}</span>
          <span style={{ fontSize: 30, letterSpacing: 3, color: TEXTO_2 }}> FALHAS</span>
        </div>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <line x1={X0} x2={X0 + (X1 - X0) * linhaT} y1={TY} y2={TY} stroke={TEXTO} strokeOpacity={0.8} strokeWidth={2.5} />
          {datas.map((d, i) => {
            const x = X0 + (X1 - X0) * d.t, oo = linhaT >= d.t - 0.01 ? 1 : 0;
            const ataque = i === 2;
            return <circle key={i} cx={x} cy={TY} r={ataque ? 12 : 9} fill={ataque ? LARANJA : CIANO} opacity={oo * (ataque ? Math.max(0.4, antes) : 1)} />;
          })}
        </svg>
        {datas.map((d, i) => {
          const x = X0 + (X1 - X0) * d.t, ataque = i === 2;
          const sub = i < 2 ? `${D.avisos[i].produto.split(" ")[0]} · ${D.avisos[i].cves}` : "";
          return (
            <div key={i} style={{ position: "absolute", top: TY + 22, left: x - 160, width: 320, textAlign: i === 0 ? "left" : i === 2 ? "right" : "center", translate: i === 0 ? "160px 0" : i === 2 ? "-160px 0" : "0 0", fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: ataque ? LARANJA : TEXTO, opacity: linhaT >= d.t - 0.01 ? 1 : 0 }}>
              {d.rotulo}<div style={{ color: TEXTO_2, fontSize: 20 }}>{sub}</div>
            </div>
          );
        })}
      </AbsoluteFill>
      {/* a busca no KEV */}
      <AbsoluteFill style={{ opacity: kev }}>
        <div style={{ position: "absolute", top: 420, left: X0, width: X1 - X0, border: `3px solid ${CIANO}`, padding: "16px 22px", fontFamily: MONO, fontSize: 28, letterSpacing: 2, color: TEXTO, background: "rgba(12,20,36,0.9)" }}>
          <span style={{ color: TEXTO_2 }}>BUSCA: </span>{digitado("kev", f)}
        </div>
        <div style={{ position: "absolute", top: 560, width: "100%", textAlign: "center", fontFamily: MONO, opacity: res }}>
          <span style={{ fontSize: 110, color: LARANJA, letterSpacing: -2, textShadow: `0 0 28px ${LARANJA}55` }}>{D.kev.achadas}</span>
          <span style={{ fontSize: 40, color: TEXTO, letterSpacing: 2 }}> DE {D.falhas}</span>
          <div style={{ fontSize: 22, color: TEXTO_2, letterSpacing: 3 }}>NA LISTA DE FALHAS EXPLORADAS</div>
        </div>
      </AbsoluteFill>
      {/* as 26 células: CVE de verdade, na ordem dos avisos */}
      {D.cves.slice(0, mostradas).map((cve, i) => {
        const c = i % CEL.cols, r = Math.floor(i / CEL.cols);
        const max = cve === D.notaMaxima.cve;
        const rr = risca(i);
        const danfoss = i < nDanfoss;
        return (
          <div key={cve} style={{
            position: "absolute", left: CEL_X0 + c * (CEL.w + CEL.gx), top: CEL.y0 + r * (CEL.h + CEL.gy), width: CEL.w, height: CEL.h,
            border: `2px solid ${max && kev < 0.5 ? LARANJA : danfoss ? TEXTO : CIANO}`, background: "rgba(12,20,36,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 23, letterSpacing: 1,
            color: TEXTO, opacity: 1 - 0.55 * rr,
          }}>
            {cve}
            {rr > 0 && <div style={{ position: "absolute", left: 10, right: 10 + (1 - rr) * (CEL.w - 20), top: CEL.h / 2 - 1, height: 3, background: TEXTO_2 }} />}
          </div>
        );
      })}
      <Rotulo top={CEL.y0 + 9 * (CEL.h + CEL.gy) - 4} texto={f < F.kev ? `${D.avisos[0].cves} DANFOSS AK-SM · ${D.avisos[1].cves} COPELAND XWEB PRO\nEM LARANJA: NOTA ${D.notaMaxima.nota} DE 10` : "NÃO PROVA QUE ESTAS FALHAS FORAM USADAS"} o={entre(f, M.n26, M.n26 + 8)} tam={20} />
    </AbsoluteFill>
  );
};

// --- cena 6: 820 painéis Danfoss expostos em redes francesas -------------------------------------
const EXP = { cols: 41, x0: 150, y0: 640, d: 19.5 };

const CenaExpostos: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.expostos - 2, F.autoria + 2, 8);
  if (o <= 0) return null;
  const n = conta("c820", f, Easing.linear);
  const k = Math.round(D.expostos.franca * n);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="DANFOSS EXPOSTOS" direita="REDES FRANCESAS" />
      <div style={{ position: "absolute", top: 400, width: "100%", textAlign: "center", fontFamily: MONO, opacity: k > 0 ? 1 : 0 }}>
        <span style={{ fontSize: 110, color: LARANJA, letterSpacing: -2, textShadow: `0 0 28px ${LARANJA}55` }}>{k}</span>
        <span style={{ fontSize: 30, letterSpacing: 3, color: TEXTO_2 }}> PAINÉIS</span>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: k }, (_, i) => {
          const c = i % EXP.cols, r = Math.floor(i / EXP.cols);
          const x = EXP.x0 + c * EXP.d, y = EXP.y0 + r * EXP.d;
          return <rect key={i} x={x - 6} y={y - 5} width={12} height={10} fill="none" stroke={CIANO} strokeWidth={1.8} />;
        })}
      </svg>
      <Rotulo top={1060} texto={`CONTAGEM DA COALITION · ${D.expostos.de} A ${D.expostos.ate}/2026\n${D.expostos.franca} DE ${milhar(D.expostos.total)} NO MUNDO`} o={entre(f, M.n820, M.n820 + 8)} tam={22} />
      <Rotulo top={1170} texto="1 QUADRADO = 1 PAINEL EXPOSTO" o={entre(f, M.n820, M.n820 + 8)} tam={20} />
    </AbsoluteFill>
  );
};

// --- cena 7: autoria, as duas versões com o mesmo peso --------------------------------------------
const Cartao: React.FC<{ x: number; titulo: string; texto: string; o: number }> = ({ x, titulo, texto, o }) => (
  <div style={{
    position: "absolute", left: x, top: 620, width: 400, height: 380, opacity: o, translate: `0 ${(1 - o) * 16}px`,
    border: `3px solid ${CIANO}`, background: "rgba(12,20,36,0.9)", padding: "30px 28px", boxSizing: "border-box",
    display: "flex", flexDirection: "column", gap: 24,
  }}>
    <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO_2 }}>{titulo}</div>
    <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 46, lineHeight: 1.15, color: TEXTO }}>{texto}</div>
  </div>
);

const CenaAutoria: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.autoria - 2, F.pergunta + 2, 8);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="AUTORIA" direita="EM INVESTIGAÇÃO" />
      <Cartao x={120} titulo="A FRANÇA DIZ" texto="Uma unidade da Guarda Revolucionária do Irã" o={entre(f, M.franca - 4, M.franca + 6)} />
      <Cartao x={560} titulo="O IRÃ DIZ" texto="A acusação é “sem fundamento”" o={entre(f, M.ira - 4, M.ira + 6)} />
      <Rotulo top={1040} texto={"ACUSAÇÃO DO GOVERNO FRANCÊS\nNÃO JULGADA EM TRIBUNAL"} o={entre(f, M.ira, M.ira + 8)} tam={22} />
    </AbsoluteFill>
  );
};

// --- fecho -------------------------------------------------------------------------------------
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

const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/geladeiras/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Geladeiras: React.FC = () => (
  <Fundo>
    <CenaBalcao />
    <CenaLocais />
    <CenaPainel />
    <CenaDegelo />
    <CenaFalhas />
    <CenaExpostos />
    <CenaAutoria />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-geladeiras.mjs: whoosh nas trocas, impacto nos números */}
    <Audio src={staticFile("ciencia/geladeiras/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
// Padrão das capas de 12/11: rótulo mono no topo do recorte (y 300), elemento forte no meio,
// título Sora 400 de 150 px com a base em y 1600, uma palavra em laranja.
// O elemento é o balcão do vídeo (desenho próprio) com o termômetro no alto, e o número é o da
// promotoria de Paris: cerca de 700 locais em uma noite.
export const GeladeirasCapa: React.FC = () => (
  <Fundo>
    <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 34, letterSpacing: 6, color: TEXTO_2 }}>FRANÇA · 11 PARA 12/10</div>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs><FiltroNeon id="neonG" desvio={6} /></defs>
      <g transform="translate(560,640) scale(0.62) translate(-540,-840)">
        <Balcao v={0.95} />
      </g>
    </svg>
    <div style={{ position: "absolute", top: 860, width: "100%", textAlign: "center", fontFamily: MONO, color: TEXTO }}>
      <span style={{ fontSize: 64, letterSpacing: -1 }}>~{D.locais}</span>
      <span style={{ fontSize: 30, letterSpacing: 3, color: TEXTO_2 }}> LOCAIS EM 1 NOITE</span>
    </div>
    <div style={{ position: "absolute", bottom: 320, left: 40, width: 1000, textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 150, lineHeight: 1.04, letterSpacing: -4, color: TEXTO }}>
      Hackearam<br />a <span style={{ color: LARANJA, textShadow: `0 0 40px ${LARANJA}66` }}>geladeira</span>
    </div>
  </Fundo>
);
