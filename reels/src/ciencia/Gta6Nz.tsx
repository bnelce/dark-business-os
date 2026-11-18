import { AbsoluteFill, Audio, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./gta6-nz.json";
import T from "./gta6-nz-tempos.json";
import D6 from "./gta6.json";
import { Fundo, Status, X0, X1, entre, janela } from "./base";
import { CIANO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon } from "./ilustra-dolar";

// "GTA VI pelo fuso da Nova Zelândia" (18/11/2026), reel irmão do Gta6.tsx (download).
// Gancho: tem brasileiro jogando desde as 8h e o jogo só libera aqui à 0h. A ciência: a meia-noite anda
// 15° por hora de leste para oeste; a Nova Zelândia (UTC+13, horário de verão) vira o dia às 11:00 UTC,
// 8h de Brasília, 16 horas antes do Brasil (03:00 UTC). A loja libera pela região. Como fazem, segundo
// as reportagens: Xbox (local do console → Nova Zelândia, reiniciar) e PS5 (conta nova da NZ, comprar de
// novo, cartão-presente, compartilhamento do console). Os riscos com o mesmo peso visual dos passos.
//
// Imagens: artes oficiais de divulgação da Rockstar (rockstargames.com/VI), escurecidas, com crédito na
// tela. As telas do Xbox são desenho nosso, genérico, sem logo nem interface copiada.
//
// Números: gta6-nz.json (gerar-gta6-nz.mjs confere a fala contra a conta). Tempos: gta6-nz-tempos.json.
// A trilha (gerar-trilha-gta6-nz.mjs) lê os mesmos tempos.

export const GTA6NZ_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const FIM = T.fim;
const CREDITO = "IMAGENS: ROCKSTAR GAMES (DIVULGAÇÃO)";

const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const hm = (h: number) => {
  const min = Math.round((((h % 24) + 24) % 24) * 60);
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
};

// --- arte oficial de fundo ------------------------------------------------------------------
const Arte: React.FC<{ src: string; w: number; h: number; fx?: number; fy?: number; zoom?: number; escuro?: number; topo?: number; base?: number; dy?: number }> = ({
  src, w, h, fx = 0.5, fy = 0.5, zoom = 1, escuro = 0.55, topo = 0.85, base = 0.92, dy = 0,
}) => {
  const s = Math.max(1080 / w, 1920 / h) * zoom;
  const W = w * s, H = h * s;
  const left = Math.min(0, Math.max(1080 - W, 540 - fx * W));
  const top = Math.min(0, Math.max(1920 - H, 960 - fy * H)) + dy;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={staticFile(`ciencia/gta6-nz/arte/${src}`)} style={{
        position: "absolute", left, top, width: W, height: H,
        ...(dy > 0 ? { maskImage: "linear-gradient(180deg, transparent 0, black 280px)", WebkitMaskImage: "linear-gradient(180deg, transparent 0, black 280px)" } : {}),
      }} />
      <AbsoluteFill style={{
        background: `linear-gradient(180deg, rgba(5,7,12,${topo}) 0%, rgba(5,7,12,${escuro}) 30%, rgba(5,7,12,${escuro}) 58%, rgba(5,7,12,${base}) 78%, rgba(5,7,12,${base}) 100%)`,
      }} />
    </AbsoluteFill>
  );
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

/** Fonte da cena e crédito das imagens, no topo da área segura. */
const fonteDe = (f: number): [string, string] => {
  if (f < F.ciencia - 2 || f >= FIM) return ["LIVE: OMELETE, 18/11 · RELATOS: O LIBERAL, TECHTUDO", CREDITO];
  if (f < F.regiao) return ["FUSOS DE NOVEMBRO DE 2026 · CONTA NOSSA", CREDITO];
  if (f < F.xbox) return ["ROCKSTAR: \"MEIA-NOITE LOCAL, EM TODAS AS REGIÕES\"", ""];
  if (f < F.ps5) return ["PASSOS: TECHTUDO, VICE, GAMERANT, INSIDER GAMING", ""];
  if (f < F.riscos) return ["GUIAS: TECHTUDO, GAMERANT, VICE, UNILAD TECH", ""];
  if (f < F.fecho) return ["XBOX: PADRÕES DA COMUNIDADE · PSN: TERMOS · IXBT", ""];
  return ["GTA V: 17/9/2013 · GTA VI: 19/11/2026", CREDITO];
};

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  const [t, c] = fonteDe(f);
  const st = { position: "absolute", width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, textShadow: "0 0 10px rgba(5,7,12,1), 0 0 4px rgba(5,7,12,1)" } as const;
  return (
    <>
      {t && <div style={{ ...st, top: 238 }}>{t}</div>}
      {c && <div style={{ ...st, top: 268, color: "rgba(232,244,255,0.75)" }}>{c}</div>}
    </>
  );
};

// --- cena 1 (e a volta do fim): 8:00 × 0:00 sobre a arte -----------------------------------
const Relogio: React.FC<{ hora: string; dia: string; nota: string; cor: string; aceso: number; x: number; seg?: number }> = ({ hora, dia, nota, cor, aceso, x, seg }) => (
  <div style={{ position: "absolute", top: 385, left: x, width: 430, textAlign: "center", fontFamily: MONO, opacity: 0.35 + 0.65 * aceso }}>
    <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 150, letterSpacing: -6, lineHeight: 1, color: cor, textShadow: `0 0 36px ${cor}55, 0 4px 18px rgba(0,0,0,0.8)` }}>{hora}</div>
    {seg !== undefined && (
      <div style={{ margin: "14px auto 0", width: 300, height: 4, background: "rgba(133,146,171,0.35)" }}>
        <div style={{ width: `${seg * 100}%`, height: 4, background: cor, boxShadow: `0 0 10px ${cor}` }} />
      </div>
    )}
    <div style={{ fontSize: 26, letterSpacing: 3, color: TEXTO, marginTop: 18, textShadow: "0 0 10px rgba(5,7,12,1)" }}>{dia}</div>
    <div style={{ fontSize: 24, letterSpacing: 2, color: cor, marginTop: 8, textShadow: "0 0 10px rgba(5,7,12,1)" }}>{nota}</div>
  </div>
);

const Gancho: React.FC<{ lf: number; f: number }> = ({ lf, f }) => {
  const zoom = 1.04 + 0.05 * entre(lf, 0, 200);
  const br = lf === f ? entre(f, M.meianoiteG - 4, M.meianoiteG + 4) : 0;
  const live = lf === f ? janela(f, M.brasileiro + 4, F.ciencia, 6) : 0;
  return (
    <>
      <Arte src="casal-carro.jpg" w={3840} h={1920} fx={0.53} zoom={zoom} escuro={0.4} topo={0.92} dy={330} />
      <div style={{ position: "absolute", top: 322, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 5, color: TEXTO, textShadow: "0 0 12px rgba(5,7,12,1)" }}>
        GTA VI · HORÁRIO DE BRASÍLIA
      </div>
      <Relogio x={80} hora="8:00" dia="QUA · 18/11" nota="JÁ TEM GENTE JOGANDO" cor={LARANJA} aceso={1} seg={(lf % 30) / 30} />
      <div style={{ position: "absolute", top: 425, left: 515, width: 50, textAlign: "center", fontFamily: MONO, fontSize: 64, color: TEXTO_2 }}>›</div>
      <Relogio x={570} hora="0:00" dia="QUI · 19/11" nota="LIBERA NO BRASIL" cor={TEXTO} aceso={br} />
      {live > 0 && (
        <div style={{
          position: "absolute", top: 1215, left: 140, width: 800, padding: "16px 0", textAlign: "center", fontFamily: MONO, fontSize: 25, letterSpacing: 2,
          color: TEXTO, background: "rgba(5,7,12,0.82)", border: `2px solid ${CIANO}88`, opacity: live,
        }}>
          LIVE DO ALANZOKA ÀS 8H: <span style={{ color: CIANO }}>PICO DE 293 MIL</span>
        </div>
      )}
    </>
  );
};

const CenaGancho: React.FC = () => {
  const f = useCurrentFrame();
  const o = 1 - entre(f, F.ciencia - 6, F.ciencia + 2);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o }}><Gancho lf={f} f={f} /></AbsoluteFill>;
};

// --- cena 2: a meia-noite andando pelo mapa -----------------------------------------------------
const tDe = (f: number) => {
  const k = T.meianoite;
  if (f <= k[0].f) return k[0].t;
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i].f) return k[i - 1].t + (k[i].t - k[i - 1].t) * entre(f, k[i - 1].f, k[i].f, (x) => (i === k.length - 1 ? x * x * (3 - 2 * x) : x));
  }
  return k.at(-1)!.t;
};
const xLon = (lon: number) => D.mapa.a + D.mapa.b * lon;

const CenaCiencia: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.ciencia - 2, F.regiao + 2, 8);
  if (o <= 0) return null;
  const mp = D.mapa;
  const t = tDe(f);
  const xl = Math.min(mp.x1, xLon(15 * (24 - t)));
  const mapa = entre(f, F.ciencia - 2, F.ciencia + 10);
  const nz = entre(f, M.zelandiaC - 3, M.zelandiaC + 5);
  const linha = entre(f, M.linha - 3, M.linha + 5);
  const br = entre(f, M.brasiliaC - 4, M.brasiliaC + 3);
  const n16 = entre(f, M.n16 - 4, M.n16 + 4);
  const seta = entre(f, M.leste - 3, M.leste + 6);
  const utc = t >= 24 ? `${hm(t)} · 19/11` : `${hm(t)} · 18/11`;
  const bsb = t - 3 >= 24 ? `${hm(t - 3)} · 19/11` : `${hm(t - 3)} · 18/11`;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Arte src="vice-city-noite.jpg" w={3840} h={2160} fx={0.6} escuro={0.8} topo={0.9} zoom={1.05} />
      <Status top={322} esquerda="A MEIA-NOITE ANDA" direita={`${D.grausHora}° POR HORA`} />
      {/* os dois relógios */}
      <div style={{ position: "absolute", top: 400, left: X0, width: X1 - X0, display: "flex", justifyContent: "space-between", fontFamily: MONO }}>
        <div>
          <div style={{ fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>HORA UNIVERSAL</div>
          <div style={{ fontSize: 50, color: TEXTO, marginTop: 6 }}>{utc}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>EM BRASÍLIA</div>
          <div style={{ fontSize: 50, color: t >= 26.99 ? LARANJA : TEXTO, marginTop: 6 }}>{bsb}</div>
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: mapa }}>
        <defs>
          <FiltroNeon id="neonNz" desvio={5} />
          <clipPath id="faixaNz"><rect x={mp.x0} y={mp.y0} width={mp.x1 - mp.x0} height={mp.y1 - mp.y0} /></clipPath>
        </defs>
        <g clipPath="url(#faixaNz)">
          {/* o lado que já é 19/11 */}
          <rect x={xl} y={mp.y0} width={Math.max(0, mp.x1 - xl)} height={mp.y1 - mp.y0} fill={LARANJA} fillOpacity={0.12} />
          <path d={mp.terra} fill={CIANO} fillOpacity={0.2} stroke={CIANO} strokeOpacity={0.55} strokeWidth={1.2} />
          <path d={mp.nz} fill={CIANO} fillOpacity={0.15 + 0.6 * nz} stroke={CIANO} strokeWidth={1 + 2 * nz} />
          <path d={mp.br} fill={LARANJA} fillOpacity={0.08 + 0.5 * br} stroke={br > 0 ? LARANJA : TEXTO_2} strokeOpacity={0.6 + 0.4 * br} strokeWidth={1.2 + 1.5 * br} />
        </g>
        <rect x={mp.x0} y={mp.y0} width={mp.x1 - mp.x0} height={mp.y1 - mp.y0} fill="none" stroke={TEXTO_2} strokeOpacity={0.4} />
        {/* Linha Internacional da Data */}
        <line x1={mp.linhaData} x2={mp.linhaData} y1={mp.y0} y2={mp.y1} stroke={TEXTO} strokeOpacity={0.25 + 0.55 * linha} strokeDasharray="6 7" strokeWidth={2} />
        {/* o traço da meia-noite */}
        <Neon filtro="neonNz" cor={LARANJA} largura={4}>
          <line x1={xl} x2={xl} y1={mp.y0 - 16} y2={mp.y1 + 16} />
        </Neon>
        {mp.cidades.map((c) => {
          const passou = t >= c.vira - 0.01;
          return <circle key={c.id} cx={c.xy[0]} cy={c.xy[1]} r={passou ? 9 : 6} fill={passou ? LARANJA : TEXTO_2} />;
        })}
      </svg>
      <div style={{ position: "absolute", top: mp.y0 - 46, left: Math.min(1080 - 250, Math.max(10, xl - 120)), width: 240, textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: LARANJA, opacity: mapa, textShadow: "0 0 10px rgba(5,7,12,1)" }}>
        MEIA-NOITE
      </div>
      <div style={{ position: "absolute", top: mp.y1 + 22, left: X0, width: X1 - X0, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: TEXTO_2, opacity: seta }}>
        <span>‹ OESTE</span><span style={{ color: LARANJA }}>← 15° POR HORA ←</span><span>LESTE ›</span>
      </div>
      <div style={{ position: "absolute", top: mp.y0 + 14, left: mp.linhaData - 300, width: 290, textAlign: "right", fontFamily: MONO, fontSize: 19, letterSpacing: 2, color: TEXTO, opacity: linha, textShadow: "0 0 8px rgba(5,7,12,1)" }}>
        LINHA DA DATA ›
      </div>
      {/* cidades que viram o dia quando o traço passa */}
      {mp.cidades.map((c) => {
        const a = entre(t, c.vira - 0.01, c.vira + 0.6);
        if (a <= 0 || c.id === "auckland" || c.id === "brasilia") return null;
        return (
          <div key={c.id} style={{ position: "absolute", top: c.xy[1] - 52, left: c.xy[0] - 120, width: 240, textAlign: "center", fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO, opacity: a, textShadow: "0 0 8px rgba(5,7,12,1)" }}>
            {c.nome} 0:00
          </div>
        );
      })}
      {/* Nova Zelândia */}
      <div style={{ position: "absolute", top: 1105, right: 1080 - X1, width: 520, textAlign: "right", fontFamily: MONO, opacity: nz }}>
        <div style={{ fontSize: 28, letterSpacing: 2, color: CIANO }}>NOVA ZELÂNDIA · 0:00</div>
        <div style={{ fontSize: 20, letterSpacing: 2, color: TEXTO_2, marginTop: 6 }}>UTC+{D.nzUtc} (HORÁRIO DE VERÃO)</div>
        <div style={{ fontSize: 20, letterSpacing: 2, color: TEXTO, marginTop: 4 }}>= {D.nzEmBrasilia}H EM BRASÍLIA</div>
      </div>
      {/* Brasil */}
      <div style={{ position: "absolute", top: 1105, left: X0, width: 420, fontFamily: MONO, opacity: br }}>
        <div style={{ fontSize: 28, letterSpacing: 2, color: LARANJA }}>BRASÍLIA · 0:00</div>
        <div style={{ fontSize: 20, letterSpacing: 2, color: TEXTO_2, marginTop: 6 }}>UTC{D.brUtc} · 19/11</div>
      </div>
      <div style={{ position: "absolute", top: 1225, width: "100%", textAlign: "center", opacity: n16, scale: `${0.85 + 0.15 * mola(f, M.n16 - 4, { damping: 11, stiffness: 220 })}` }}>
        <span style={{ fontFamily: SORA, fontWeight: 300, fontSize: 150, letterSpacing: -5, color: LARANJA, lineHeight: 1, textShadow: `0 0 34px ${LARANJA}55` }}>{D.antes}</span>
        <span style={{ fontFamily: MONO, fontSize: 40, letterSpacing: 4, color: LARANJA, marginLeft: 16 }}>HORAS ANTES</span>
      </div>
    </AbsoluteFill>
  );
};

// --- cartão (passos e riscos têm o mesmo peso visual) ---------------------------------------------
const Cartao: React.FC<{ y: number; marca: string; titulo: string; sub?: string; cor: string; de: number; h?: number; risco?: boolean }> = ({
  y, marca, titulo, sub, cor, de, h = 140, risco = false,
}) => {
  const f = useCurrentFrame();
  const p = entre(f, de - 4, de + 6);
  if (p <= 0) return null;
  const s = mola(f, de - 4, { damping: 13, stiffness: 200 });
  return (
    <div style={{
      position: "absolute", top: y, left: 90, width: 900, height: h, display: "flex", alignItems: "center", gap: 26,
      background: "rgba(12,20,36,0.88)", border: `2px solid ${cor}`, boxShadow: `0 0 22px ${cor}33`, opacity: p, translate: `${(1 - s) * 60}px 0`,
    }}>
      <div style={{
        flex: "0 0 auto", width: 84, height: h, display: "flex", alignItems: "center", justifyContent: "center",
        borderRight: `2px solid ${cor}`, fontFamily: MONO, fontSize: risco ? 54 : 46, color: cor, background: `${cor}1A`,
      }}>{marca}</div>
      <div style={{ paddingRight: 24 }}>
        <div style={{ fontFamily: SORA, fontWeight: 400, fontSize: 40, lineHeight: 1.1, color: TEXTO, letterSpacing: -0.5 }}>{titulo}</div>
        {sub && <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 1, color: TEXTO_2, marginTop: 10, lineHeight: 1.3 }}>{sub}</div>}
      </div>
    </div>
  );
};

// --- cena 3: a loja decide pela região --------------------------------------------------------------
const CenaRegiao: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.regiao - 2, F.xbox + 2, 8);
  if (o <= 0) return null;
  const nao = entre(f, M.adianta - 3, M.adianta + 4);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={322} esquerda="QUEM DECIDE A HORA" direita="PS5 · XBOX" />
      <Cartao y={470} marca="✓" titulo="A REGIÃO DA LOJA" sub="A ROCKSTAR LIBERA À MEIA-NOITE LOCAL, REGIÃO POR REGIÃO" cor={CIANO} de={M.regiao} h={170} />
      <Cartao y={700} marca="✗" titulo="O RELÓGIO DO CONSOLE" sub="MUDAR A HORA OU O FUSO DO APARELHO" cor={nao > 0 ? LARANJA : TEXTO_2} de={M.relogio} h={170} risco />
      <div style={{
        position: "absolute", top: 940, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 46, letterSpacing: 6, color: LARANJA, opacity: nao,
        scale: `${1.3 - 0.3 * mola(f, M.adianta - 3, { damping: 10, stiffness: 240 })}`, textShadow: `0 0 24px ${LARANJA}66`,
      }}>NÃO ADIANTA</div>
    </AbsoluteFill>
  );
};

// --- cena 4: Xbox, tela por tela (desenho nosso, genérico) ----------------------------------------
type Tela = { titulo: string; itens: { t: string; v?: string }[]; sel: number };
const TELAS: Tela[] = [
  { titulo: "CONFIGURAÇÕES", itens: [{ t: "GERAL" }, { t: "CONTA" }, { t: "SISTEMA" }, { t: "ACESSIBILIDADE" }], sel: 2 },
  { titulo: "SISTEMA", itens: [{ t: "ARMAZENAMENTO" }, { t: "ATUALIZAÇÕES" }, { t: "IDIOMA E LOCALIZAÇÃO" }, { t: "BACKUP" }], sel: 2 },
  { titulo: "IDIOMA E LOCALIZAÇÃO", itens: [{ t: "IDIOMA", v: "PORTUGUÊS (NÃO MUDA)" }, { t: "LOCAL", v: "BRASIL" }], sel: 1 },
  { titulo: "IDIOMA E LOCALIZAÇÃO", itens: [{ t: "IDIOMA", v: "PORTUGUÊS (NÃO MUDA)" }, { t: "LOCAL", v: "NOVA ZELÂNDIA" }], sel: 1 },
  { titulo: "IDIOMA E LOCALIZAÇÃO", itens: [{ t: "LOCAL", v: "NOVA ZELÂNDIA" }, { t: "REINICIAR AGORA" }], sel: 1 },
];
const TRILHA = ["CONFIGURAÇÕES", "SISTEMA", "IDIOMA E LOCALIZAÇÃO", "LOCAL: NOVA ZELÂNDIA", "REINICIAR"];

const CenaXbox: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.xbox - 2, F.ps5 + 2, 8);
  if (o <= 0) return null;
  const marcos = [M.config, M.sistema, M.idioma, M.nzX, M.reiniciar];
  const passo = marcos.filter((g) => f >= g - 3).length; // 0..5
  const k = Math.max(0, passo - 1);
  const tela = TELAS[k];
  const troca = mola(f, marcos[k] - 3, { damping: 16, stiffness: 260 });
  const liberado = entre(f, M.destrava - 4, M.destrava + 4);
  const PY = 560, PH = 470;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={322} esquerda="XBOX" direita="COM O JOGO JÁ BAIXADO" />
      {/* o caminho, montado passo a passo */}
      <div style={{ position: "absolute", top: 395, left: 90, width: 900, display: "flex", flexWrap: "wrap", gap: "10px 12px", fontFamily: MONO, fontSize: 23, letterSpacing: 1.5 }}>
        {TRILHA.map((t, i) => (
          <span key={t} style={{ opacity: i < passo ? 1 : 0.25, color: i === passo - 1 ? LARANJA : i < passo ? TEXTO : TEXTO_2, whiteSpace: "nowrap" }}>
            {i + 1}. {t}{i < TRILHA.length - 1 ? "  ›" : ""}
          </span>
        ))}
      </div>
      {/* a tela desenhada */}
      <div style={{ position: "absolute", top: PY, left: 120, width: 840, height: PH, border: `2px solid ${TEXTO_2}`, background: "rgba(12,20,36,0.9)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        <div style={{ height: 70, borderBottom: `1.5px solid ${TEXTO_2}66`, display: "flex", alignItems: "center", padding: "0 30px", fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: TEXTO }}>
          {passo === 0 ? "INÍCIO" : tela.titulo}
        </div>
        {passo > 0 && liberado < 1 && (
          <div style={{ padding: "26px 30px", opacity: 1 - liberado, translate: `${(1 - troca) * 40}px 0` }}>
            {tela.itens.map((it, i) => {
              const sel = i === tela.sel;
              const nz = it.v === "NOVA ZELÂNDIA";
              return (
                <div key={it.t + i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", height: 78, marginBottom: 14, padding: "0 24px",
                  border: `2px solid ${sel ? CIANO : "rgba(133,146,171,0.3)"}`, background: sel ? "rgba(92,225,255,0.14)" : "transparent",
                  fontFamily: MONO, fontSize: 27, letterSpacing: 1.5, color: sel ? TEXTO : TEXTO_2,
                }}>
                  <span>{it.t}</span>
                  {it.v && <span style={{ color: nz ? LARANJA : TEXTO_2, fontSize: it.v.length > 14 ? 21 : 27 }}>{it.v}</span>}
                </div>
              );
            })}
          </div>
        )}
        {passo === 0 && (
          <div style={{ padding: 30, fontFamily: MONO, fontSize: 26, color: TEXTO_2, letterSpacing: 2 }}>
            <div style={{ height: 120, border: `2px solid ${CIANO}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px", color: TEXTO }}>
              <span>GTA VI</span><span style={{ color: TEXTO_2 }}>INSTALADO · TRAVADO ATÉ 0:00</span>
            </div>
          </div>
        )}
        {liberado > 0 && (
          <div style={{ position: "absolute", inset: "70px 0 0 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: liberado }}>
            <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 96, color: TEXTO, letterSpacing: -2 }}>GTA VI</div>
            <div style={{ marginTop: 22, padding: "14px 46px", border: `2.5px solid ${LARANJA}`, fontFamily: MONO, fontSize: 38, letterSpacing: 6, color: LARANJA, boxShadow: `0 0 26px ${LARANJA}55` }}>JOGAR</div>
            <div style={{ marginTop: 20, fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: TEXTO_2 }}>DESTRAVOU, SEGUNDO RELATOS (VICE, TECHTUDO)</div>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", top: PY + PH + 12, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 18, letterSpacing: 2, color: TEXTO_2 }}>
        TELA ILUSTRATIVA, NÃO É A INTERFACE REAL
      </div>
      <Cartao y={1100} marca="↺" titulo="DEPOIS DO LANÇAMENTO AQUI" sub="VOLTAR O LOCAL PARA BRASIL" cor={CIANO} de={M.depois} h={120} />
    </AbsoluteFill>
  );
};

// --- cena 5: PS5, o que os guias descrevem -----------------------------------------------------------
const CenaPs5: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.ps5 - 2, F.riscos + 2, 8);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={322} esquerda="PS5" direita="A REGIÃO É DA CONTA" />
      <div style={{ position: "absolute", top: 380, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: TEXTO_2, opacity: entre(f, M.daConta - 3, M.daConta + 5) }}>
        DEFINIDA NA CRIAÇÃO, NÃO MUDA DEPOIS
      </div>
      {f < M.contaNova + 6 && (
        <div style={{ position: "absolute", top: 560, width: "100%", textAlign: "center", opacity: entre(f, F.ps5, F.ps5 + 8) * (1 - entre(f, M.contaNova - 6, M.contaNova + 2)) }}>
          <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 96, lineHeight: 1.05, letterSpacing: -3, color: TEXTO }}>a região é<br /><span style={{ color: CIANO }}>da conta</span></div>
          <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: TEXTO_2, marginTop: 26, opacity: entre(f, M.daConta, M.daConta + 8) }}>TROCAR O FUSO DO PS5 NÃO LIBERA</div>
        </div>
      )}
      <Cartao y={440} marca="1" titulo="CONTA NOVA DA NOVA ZELÂNDIA" sub="O CADASTRO PEDE DADOS DE LÁ" cor={CIANO} de={M.contaNova} />
      <Cartao y={600} marca="2" titulo="O JOGO COMPRADO DE NOVO" sub={`NA LOJA NEOZELANDESA · NZ$ ${D.nzd} (PADRÃO)`} cor={CIANO} de={M.novo} />
      <Cartao y={760} marca="3" titulo="CARTÃO-PRESENTE EM DÓLAR NEOZELANDÊS" sub="A LOJA DE LÁ COSTUMA RECUSAR CARTÃO DE FORA" cor={CIANO} de={M.cartao} />
      <Cartao y={920} marca="4" titulo="COMPARTILHAMENTO DO CONSOLE LIGADO" sub="PARA JOGAR NO PERFIL PRINCIPAL" cor={CIANO} de={M.compart} />
      <div style={{ position: "absolute", top: 1100, left: 90, width: 900, textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 1.5, color: TEXTO, opacity: entre(f, M.ligado - 2, M.ligado + 8) }}>
        À 0H, A CÓPIA DA CONTA BRASILEIRA LIBERA NORMALMENTE
      </div>
    </AbsoluteFill>
  );
};

// --- cena 6: os riscos, com o mesmo peso dos passos --------------------------------------------------
const CenaRiscos: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.riscos - 2, F.fecho + 2, 8);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={322} esquerda="OS RISCOS" direita="SEM COMENTÁRIO OFICIAL" />
      <Cartao y={420} marca="!" titulo="XBOX: CONTRA AS REGRAS" sub="PROIBIDO CONTORNAR TRAVA REGIONAL · NENHUMA PUNIÇÃO RELATADA" cor={LARANJA} de={M.regras} risco />
      <Cartao y={590} marca="!" titulo="PS5: DADO FALSO VIOLA OS TERMOS" sub="RELATOS DE CONTA SUSPENSA, SEM CONFIRMAÇÃO DA SONY · SUSPENSA PERDE A BIBLIOTECA" cor={LARANJA} de={M.falso} h={150} risco />
      <Cartao y={770} marca="!" titulo="PAGA O JOGO DUAS VEZES" sub={`PS5: NZ$ ${D.nzd} ALÉM DA CÓPIA BRASILEIRA`} cor={LARANJA} de={M.duas} risco />
      <Cartao y={940} marca="!" titulo={"\"CONTA PRONTA\" DE TERCEIROS"} sub="VENDIDAS COM O JOGO · RELATOS DE BANIMENTO (IXBT)" cor={LARANJA} de={M.pronta} risco />
    </AbsoluteFill>
  );
};

// --- cena 7: 13 anos × 16 horas ---------------------------------------------------------------------
const CenaFecho: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.fecho - 4, FIM + 4, 8);
  if (o <= 0) return null;
  const a13 = entre(f, M.n13 - 4, M.n13 + 4), a16 = entre(f, M.n16F - 4, M.n16F + 4), q = entre(f, M.vale - 4, M.vale + 6);
  const zoom = 1.04 + 0.04 * entre(f, F.fecho, FIM);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Arte src="por-do-sol.jpg" w={3840} h={2160} fx={0.36} zoom={zoom} escuro={0.5} topo={0.88} />
      <div style={{ position: "absolute", top: 390, width: "100%", textAlign: "center", opacity: a13 }}>
        <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2, textShadow: "0 0 10px rgba(5,7,12,1)" }}>GTA V → GTA VI</div>
        <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 150, letterSpacing: -5, lineHeight: 1.05, color: TEXTO, textShadow: "0 4px 24px rgba(0,0,0,0.8)" }}>{D.anos} anos</div>
      </div>
      <div style={{ position: "absolute", top: 640, width: "100%", textAlign: "center", opacity: a16, scale: `${0.85 + 0.15 * mola(f, M.n16F - 4, { damping: 11, stiffness: 220 })}` }}>
        <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2, textShadow: "0 0 10px rgba(5,7,12,1)" }}>DE VANTAGEM</div>
        <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 150, letterSpacing: -5, lineHeight: 1.05, color: LARANJA, textShadow: `0 0 34px ${LARANJA}55` }}>{D.antes} horas</div>
      </div>
      <div style={{ position: "absolute", top: 960, width: "100%", textAlign: "center", opacity: q, translate: `0 ${(1 - q) * 16}px`, fontFamily: SORA, fontWeight: 400, fontSize: 70, color: TEXTO, letterSpacing: -1, textShadow: "0 4px 24px rgba(0,0,0,0.9)" }}>
        Vale arriscar a conta?
      </div>
    </AbsoluteFill>
  );
};

const Volta: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, FIM - 6, FIM + 4);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o, background: `rgba(5,7,12,${0.9 * o})` }}><Gancho lf={f - FIM} f={f} /></AbsoluteFill>;
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, T.cta, T.cta + 8);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 1432, left: 0, width: 1080, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, opacity: o }}>
      <Img src={staticFile("ciencia/icone.png")} style={{ width: 64, height: 64 }} />
      <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO, textShadow: "0 0 12px rgba(5,7,12,1)" }}>SEGUE O CIÊNCIA VISUAL</div>
    </div>
  );
};

const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/gta6-nz/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Gta6Nz: React.FC = () => (
  <Fundo>
    <CenaGancho />
    <CenaCiencia />
    <CenaRegiao />
    <CenaXbox />
    <CenaPs5 />
    <CenaRiscos />
    <CenaFecho />
    <Volta />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-gta6-nz.mjs: tiques do traço, cliques nos menus, sinos e graves nos passos e riscos */}
    <Audio src={staticFile("ciencia/gta6-nz/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capas da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
// Arte oficial em destaque, título curto e enorme, um número forte. Legível em 200 px de largura.
const Selo: React.FC<{ top: number; children: React.ReactNode; cor?: string }> = ({ top, children, cor = LARANJA }) => (
  <div style={{ position: "absolute", top, width: "100%", display: "flex", justifyContent: "center" }}>
    <div style={{ padding: "12px 34px", background: cor, color: "#05070C", fontFamily: MONO, fontWeight: 400, fontSize: 66, letterSpacing: 4, boxShadow: `0 0 40px ${cor}88` }}>{children}</div>
  </div>
);
const Titulo: React.FC<{ base: number; tam?: number; children: React.ReactNode }> = ({ base, tam = 150, children }) => (
  <div style={{
    position: "absolute", bottom: 1920 - base, left: 30, width: 1020, textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: tam,
    lineHeight: 0.98, letterSpacing: -5, color: TEXTO, textShadow: "0 6px 30px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1)",
  }}>{children}</div>
);
const CreditoCapa: React.FC = () => (
  <div style={{ position: "absolute", top: 1626, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 18, letterSpacing: 2, color: "rgba(232,244,255,0.7)" }}>{CREDITO}</div>
);

/** Capa A: o casal no telhado de Vice City, "JOGAR GTA 6 ANTES?" e o selo de 16 horas. */
export const Gta6NzCapa: React.FC = () => (
  <Fundo>
    <Arte src="rooftop.jpg" w={2160} h={3840} fx={0.5} fy={0.42} zoom={1.08} escuro={0.05} topo={0.55} base={0.95} />
    <Selo top={290}>16 HORAS ANTES</Selo>
    <Titulo base={1590}>Jogar <span style={{ color: LARANJA }}>GTA 6</span><br />antes?</Titulo>
    <CreditoCapa />
  </Fundo>
);

/** Capa B: o casal no carro, "O TRUQUE DA NOVA ZELÂNDIA" e o 8h × 0h. */
export const Gta6NzCapaB: React.FC = () => (
  <Fundo>
    <Arte src="casal-carro.jpg" w={3840} h={1920} fx={0.53} zoom={1.0} escuro={0.08} topo={0.95} base={0.95} dy={330} />
    <div style={{ position: "absolute", top: 280, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 210, letterSpacing: -8, lineHeight: 1, color: LARANJA, textShadow: `0 0 40px ${LARANJA}66, 0 6px 26px rgba(0,0,0,0.9)` }}>
      16H
    </div>
    <div style={{ position: "absolute", top: 500, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 40, letterSpacing: 5, color: TEXTO, textShadow: "0 0 14px rgba(5,7,12,1), 0 0 4px rgba(5,7,12,1)" }}>ANTES DO BRASIL</div>
    <Titulo base={1590} tam={124}>O truque da<br /><span style={{ color: LARANJA }}>Nova Zelândia</span></Titulo>
    <CreditoCapa />
  </Fundo>
);

/** Capa alternativa do reel irmão (Gta6.tsx, download): "212 GB: quanto tempo pra baixar?". */
export const Gta6CapaB: React.FC = () => (
  <Fundo>
    <Arte src="lock-and-load.jpg" w={1080} h={1920} fx={0.5} fy={0.5} zoom={1.0} escuro={0.06} topo={0.95} base={0.95} dy={300} />
    <div style={{ position: "absolute", top: 270, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 230, letterSpacing: -9, lineHeight: 1, color: LARANJA, textShadow: `0 0 40px ${LARANJA}66, 0 6px 26px rgba(0,0,0,0.9)` }}>
      {D6.gb} GB
    </div>
    <div style={{ position: "absolute", top: 510, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 40, letterSpacing: 5, color: TEXTO, textShadow: "0 0 14px rgba(5,7,12,1), 0 0 4px rgba(5,7,12,1)" }}>GTA 6 · PRÉ-LOAD</div>
    <Titulo base={1590} tam={136}>Quanto tempo<br />pra <span style={{ color: LARANJA }}>baixar?</span></Titulo>
    <CreditoCapa />
  </Fundo>
);
