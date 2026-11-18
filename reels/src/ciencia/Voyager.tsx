import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./voyager.json";
import T from "./voyager-tempos.json";
import { Fundo, entre } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";
import { FiltroNeon, Neon } from "./ilustra-dolar";

// Voyager 1 a um dia-luz da Terra (18/11/2026, 07h16min07s de Brasília, NASA). Começa pela consequência:
// uma conversa com a sonda leva dois dias. O número entra como prova.
//   gancho     o pulso de luz sobe da Terra até a Voyager e volta, e o relógio corre de quarta a sexta
//   dialuz     o relógio para em QUA 18/11 07:16:07 (Brasília); 24 h pra ir, mais 24 pra voltar
//   corrida    a mesma luz numa régua de tempo logarítmica: Lua 1,3 s, Sol 8 min 13 s, Netuno 4 h 04, Voyager 24 h
//   longe      régua linear de distância: 5,9× Netuno, 25,9 bilhões de km
//   heliopausa esquema da bolha do vento solar: lançada em 1977, cruza a heliopausa em 2012 (121 UA), está a
//              173 UA; a nuvem de Oort fica muito além (nada de "saiu do Sistema Solar")
//   ponto      o Pale Blue Dot (1990), com zoom no ponto
//   pergunta   em que ano ela chega a 2 dias-luz? (resposta no comentário fixado)
// O fim volta pro relógio do quadro 0, pro loop emendar.
//
// Imagens em public/ciencia/voyager/img/ (recortes; origem e crédito em public/ciencia/fotos-origem.md).
// Números: voyager.json (scripts/gerar-voyager.mjs, da JPL Horizons). Tempos: voyager-tempos.json.

export const VOYAGER_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const C = T.cena;
const FIM = T.fim;
const G0 = T.grande[0].f;
const K = D.contas;

const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const io = Easing.inOut(Easing.cubic);
const img = (n: string) => staticFile(`ciencia/voyager/img/${n}`);
const SOMBRA_TXT = "0 0 14px rgba(5,7,12,1), 0 0 6px rgba(5,7,12,1), 0 2px 4px rgba(0,0,0,0.9)";
const CONTORNO = { stroke: FUNDO, strokeWidth: 8, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };

const visivel = (f: number, de: number, ate: number, fade = 6) => (f < de - fade || f >= ate + fade ? 0 : Math.min(entre(f, de - fade, de), 1 - entre(f, ate, ate + fade)));

// --- peças comuns ------------------------------------------------------------------------------------

/** Estrelas fixas (sementes determinísticas). */
let sem = 18;
const rnd = () => ((sem = (sem * 1664525 + 1013904223) >>> 0) / 4294967296);
const ESTRELAS = Array.from({ length: 140 }, () => ({ x: rnd() * 1080, y: rnd() * 1920, r: 0.6 + rnd() * 1.6, a: 0.25 + rnd() * 0.6 }));
const Estrelas: React.FC<{ o?: number }> = ({ o = 1 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", opacity: o }}>
    {ESTRELAS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={TEXTO} opacity={s.a} />)}
  </svg>
);

/** Foto de tela inteira (recorte 1215×2160) com zoom lento. */
const Foto: React.FC<{ src: string; o: number; s: number; origem?: string; filtro?: string; top?: number }> = ({ src, o, s, origem = "50% 50%", filtro, top = -120 }) =>
  o <= 0 ? null : (
    <AbsoluteFill style={{ opacity: o, overflow: "hidden" }}>
      <Img src={img(src)} style={{ position: "absolute", left: -67.5, top, width: 1215, height: 2160, scale: `${s}`, transformOrigin: origem, filter: filtro }} />
    </AbsoluteFill>
  );

const Sombras: React.FC<{ o?: number }> = ({ o = 1 }) => (
  <AbsoluteFill style={{
    opacity: o,
    background: "linear-gradient(180deg, rgba(5,7,12,0.9) 0px, rgba(5,7,12,0.5) 430px, rgba(5,7,12,0) 640px, rgba(5,7,12,0) 1080px, rgba(5,7,12,0.7) 1300px, rgba(5,7,12,0.95) 1700px)",
  }} />
);

const Credito: React.FC<{ texto: string; o: number; top?: number }> = ({ texto, o, top = 262 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, width: "100%", textAlign: "center", opacity: o, fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: TEXTO_2, textShadow: SOMBRA_TXT, whiteSpace: "nowrap" }}>{texto}</div>
  );

const Etiqueta: React.FC<{ texto: string; o: number; cor?: string; top?: number; tam?: number }> = ({ texto, o, cor = TEXTO, top = 318, tam = 32 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: 60, width: 960, textAlign: "center", opacity: o, fontFamily: MONO, fontSize: tam, letterSpacing: 3, color: cor, textShadow: SOMBRA_TXT, whiteSpace: "pre-line", lineHeight: 1.35 }}>{texto}</div>
  );

/** Pulso de luz: ponto laranja com halo e rastro. */
const Pulso: React.FC<{ x: number; y: number; rastro?: number; dir?: 1 | -1; o?: number }> = ({ x, y, rastro = 120, dir = 1, o = 1 }) => (
  <g opacity={o}>
    <line x1={x} y1={y} x2={x} y2={y + dir * rastro} stroke={LARANJA} strokeWidth={6} strokeOpacity={0.35} filter="url(#vgBrilho)" />
    <line x1={x} y1={y} x2={x} y2={y + dir * rastro * 0.6} stroke={LARANJA} strokeWidth={3} strokeOpacity={0.7} />
    <circle cx={x} cy={y} r={26} fill={LARANJA} opacity={0.4} filter="url(#vgBrilhoForte)" />
    <circle cx={x} cy={y} r={11} fill={LARANJA} />
    <circle cx={x} cy={y} r={5} fill="#FFE3D4" />
  </g>
);

const Terra: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 30 }) => (
  <g>
    <circle cx={x} cy={y} r={r * 2} fill={CIANO} opacity={0.18} filter="url(#vgBrilhoForte)" />
    <circle cx={x} cy={y} r={r} fill="#0F3B57" stroke={CIANO} strokeWidth={3} />
    <path d={`M ${x - r * 0.6} ${y - r * 0.3} q ${r * 0.4} ${-r * 0.5} ${r * 0.9} ${-r * 0.2} q ${-r * 0.1} ${r * 0.5} ${-r * 0.5} ${r * 0.6} z`} fill={CIANO} opacity={0.55} />
  </g>
);

const Filtros: React.FC = () => (
  <defs>
    <FiltroNeon id="vgNeon" desvio={5} />
    <filter id="vgBrilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={6} /></filter>
    <filter id="vgBrilhoForte" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={14} /></filter>
  </defs>
);

// --- 1. o relógio: o "oi" sobe, a resposta volta (gancho, dia-luz e a volta do fim) ---------------------
const XL = 800; // a linha Terra–Voyager
const Y_TERRA = 1250, Y_VOY = 520;
const DIAS = ["QUA 18/11", "QUI 19/11", "SEX 20/11"];
const ANTES = 16; // quadros "antes" do quadro 0: o pulso já está no ar quando o vídeo começa
const P0 = ANTES / (M.quarta + 6 + ANTES);

/** Progresso da conversa (0 = sai da Terra, 1 = chega à Voyager, 2 = volta à Terra). */
const conversa = (f: number) => {
  // A luz anda em velocidade constante: subida e descida lineares. No quadro 0 o pulso já saiu (P0).
  if (f >= FIM) return P0 * entre(f, FIM, T.total - 1); // o loop: o último quadro emenda no quadro 0
  if (f < F.dialuz) {
    return entre(f, -ANTES, M.quarta + 6) + entre(f, M.resposta - 6, M.sexta + 4);
  }
  return entre(f, M.h24 - 8, M.chegar + 8, io) + entre(f, M.mais24 - 6, M.voltar + 10, io);
};
/** Hora no relógio: 07:16:07 de quarta + 24 h por trecho da conversa. */
const hora = (p: number) => {
  const s = 7 * 3600 + 16 * 60 + 7 + p * 86400;
  const d = Math.min(2, Math.floor(s / 86400)), r = s - d * 86400;
  const hh = Math.floor(r / 3600), mm = Math.floor((r % 3600) / 60), ss = Math.floor(r % 60);
  return { dia: DIAS[d], txt: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` };
};

const Relogio: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM;
  const o = noFim ? 1 : visivel(f, 0, C.relogio.ate, 5);
  if (o <= 0) return null;
  const p = conversa(f);
  const subindo = p <= 1;
  const y = subindo ? Y_TERRA - (Y_TERRA - Y_VOY) * p : Y_VOY + (Y_TERRA - Y_VOY) * (p - 1);
  const h = hora(p);
  const noDialuz = !noFim && f >= F.dialuz;
  const oDiaLuz = noDialuz ? entre(f, M.dialuz - 4, M.dialuz + 6) : 0;
  const chegou = p >= 1.995 && !noFim;
  const ida = noDialuz ? entre(f, M.h24 - 4, M.h24 + 4) : 0;
  const volta = noDialuz ? entre(f, M.mais24 - 4, M.mais24 + 4) : 0;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Foto src="voyager-conceito.jpg" o={0.5} s={1.04 + 0.04 * (noFim ? 0 : entre(f, 0, C.relogio.ate))} top={-560} origem="60% 40%" />
      <Sombras />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Filtros />
        <line x1={XL} y1={Y_VOY} x2={XL} y2={Y_TERRA} stroke={CIANO} strokeWidth={2} strokeDasharray="4 14" strokeOpacity={0.6} />
        <Neon filtro="vgNeon" largura={3}><circle cx={XL} cy={Y_VOY} r={22} /></Neon>
        <circle cx={XL} cy={Y_VOY} r={6} fill={CIANO} />
        <text x={XL} y={Y_VOY - 46} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={3} {...CONTORNO}>VOYAGER 1</text>
        <Terra x={XL} y={Y_TERRA} />
        <text x={XL} y={Y_TERRA + 72} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={3} {...CONTORNO}>TERRA</text>
        {p > 0.005 && p < 1.995 ? <Pulso x={XL} y={y} dir={subindo ? 1 : -1} /> : null}
        {/* rótulo que viaja com o pulso */}
        {p > 0.02 && p < 1.98 ? (
          <text x={XL - 40} y={y + 10} textAnchor="end" fill={LARANJA} fontFamily={MONO} fontSize={34} letterSpacing={3} {...CONTORNO}>{subindo ? "“OI” ↑" : "RESPOSTA ↓"}</text>
        ) : null}
        {/* 24 h pra ir, 24 h pra voltar (no dia-luz) */}
        <g opacity={ida}>
          <text x={XL + 46} y={(Y_TERRA + Y_VOY) / 2 - 30} fill={TEXTO} fontFamily={MONO} fontSize={40} {...CONTORNO}>24 H</text>
          <text x={XL + 46} y={(Y_TERRA + Y_VOY) / 2 + 6} fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2} {...CONTORNO}>IDA</text>
        </g>
        <g opacity={volta}>
          <text x={XL + 46} y={(Y_TERRA + Y_VOY) / 2 + 80} fill={TEXTO} fontFamily={MONO} fontSize={40} {...CONTORNO}>+24 H</text>
          <text x={XL + 46} y={(Y_TERRA + Y_VOY) / 2 + 116} fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2} {...CONTORNO}>VOLTA</text>
        </g>
      </svg>
      {/* o relógio */}
      <div style={{ position: "absolute", left: 70, top: 740, width: 640, fontFamily: MONO, color: TEXTO, textShadow: SOMBRA_TXT }}>
        <div style={{ fontSize: 46, letterSpacing: 4, color: h.dia.startsWith("SEX") ? LARANJA : TEXTO }}>{h.dia}</div>
        <div style={{ fontSize: 118, letterSpacing: -2, lineHeight: 1.05, color: chegou ? LARANJA : TEXTO }}>{h.txt}</div>
        <div style={{ fontSize: 26, letterSpacing: 3, color: TEXTO_2, marginTop: 8 }}>HORÁRIO DE BRASÍLIA</div>
      </div>
      <Etiqueta texto={"VOYAGER 1 · 1 DIA-LUZ DA TERRA"} o={1 - oDiaLuz} top={200} />
      <Etiqueta texto={"1 DIA-LUZ"} o={oDiaLuz} top={180} tam={64} cor={TEXTO} />
      <Etiqueta texto={"25,9 BILHÕES DE KM · NASA"} o={oDiaLuz} top={268} tam={26} cor={TEXTO_2} />
      <Credito texto="ILUSTRAÇÃO: NASA/JPL-CALTECH" o={1} top={1660} />
    </AbsoluteFill>
  );
};

// --- 2. a corrida da luz, numa régua de tempo logarítmica -----------------------------------------------
const XC = 540, YC0 = 1320, YC1 = 700; // Terra embaixo, Voyager em cima
const LOG0 = Math.log10(0.3), LOG1 = Math.log10(86400);
const yDoTempo = (s: number) => YC0 - (YC0 - YC1) * (Math.log10(Math.max(0.3, s)) - LOG0) / (LOG1 - LOG0);
const PARADAS = D.paradas;
// Quando o pulso chega em cada parada (a voz diz o tempo).
const CHEGA = [M.segundo, M.minutos, M.horas, C.corrida.ate - 8];
const tempoLuz = (f: number) => {
  const ks = [M.luz, ...CHEGA];
  const vs = [0.3, ...PARADAS.map((p) => p.s)];
  if (f <= ks[0]) return 0.3;
  for (let i = 0; i < ks.length - 1; i++) {
    if (f <= ks[i + 1]) {
      const u = entre(f, ks[i], ks[i + 1], i === 0 ? Easing.out(Easing.quad) : io);
      return 10 ** (Math.log10(vs[i]) + (Math.log10(vs[i + 1]) - Math.log10(vs[i])) * u);
    }
  }
  return 86400;
};
const fmtTempo = (s: number) => {
  if (s < 60) return `${br(s, 1)} S`;
  if (s < 3600) return `${Math.floor(s / 60)} MIN ${String(Math.floor(s % 60)).padStart(2, "0")} S`;
  return `${Math.floor(s / 3600)} H ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")} MIN`;
};

const Janela: React.FC<{ o: number; children: React.ReactNode; legenda: string }> = ({ o, children, legenda }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: 90, top: 270, width: 300, opacity: o }}>
      <div style={{ width: 300, height: 260, overflow: "hidden", border: `1.5px solid ${CIANO}66`, background: FUNDO, position: "relative" }}>{children}</div>
      <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: 1.5, color: TEXTO_2, marginTop: 8, lineHeight: 1.35, whiteSpace: "pre-line", textShadow: SOMBRA_TXT }}>{legenda}</div>
    </div>
  );

const Corrida: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.corrida.de, C.corrida.ate, 5);
  if (o <= 0) return null;
  const t = tempoLuz(f);
  const y = yDoTempo(t);
  const chegou = (k: number) => f >= CHEGA[k] - 2;
  const quando = (k: number) => entre(f, CHEGA[k] - 3, CHEGA[k] + 5);
  // Ao alcançar a parada k, a janela de cima mostra a foto dela.
  const jan = (k: number) => Math.min(quando(k), k < 3 ? 1 - entre(f, CHEGA[k + 1] - 6, CHEGA[k + 1] - 1) : 1);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Estrelas o={0.6} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Filtros />
        <line x1={XC} y1={YC1} x2={XC} y2={YC0} stroke={CIANO} strokeWidth={2} strokeOpacity={0.55} />
        {/* marcas da régua: 1 s, 1 min, 1 h */}
        {[[60, "1 MIN"], [3600, "1 H"]].map(([s, r]) => (
          <g key={r as string}>
            <line x1={XC - 10} x2={XC + 10} y1={yDoTempo(s as number)} y2={yDoTempo(s as number)} stroke={TEXTO_2} strokeWidth={2} />
            <text x={XC + 18} y={yDoTempo(s as number) + 7} fill={TEXTO_2} fontFamily={MONO} fontSize={20} letterSpacing={1}>{r as string}</text>
          </g>
        ))}
        {/* trecho já percorrido */}
        <line x1={XC} y1={YC0} x2={XC} y2={y} stroke={LARANJA} strokeWidth={3} strokeOpacity={0.55} />
        <Terra x={XC} y={YC0 + 4} r={22} />
        <text x={XC - 44} y={YC0 + 14} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={3} {...CONTORNO}>TERRA</text>
        {PARADAS.map((p, k) => {
          const yp = yDoTempo(p.s);
          const a = quando(k);
          return (
            <g key={p.id}>
              <circle cx={XC} cy={yp} r={chegou(k) ? 10 : 7} fill={chegou(k) ? CIANO : FUNDO} stroke={CIANO} strokeWidth={2.5} />
              {p.id === "sol" ? <circle cx={XC} cy={yp} r={28} fill="#FFD27A" opacity={0.35 * a} filter="url(#vgBrilhoForte)" /> : null}
              <g opacity={0.35 + 0.65 * a}>
                <text x={XC - 34} y={yp + 11} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={32} letterSpacing={3} {...CONTORNO}>{p.nome}</text>
              </g>
              <text x={XC + 34} y={yp + 13} fill={CIANO} fontFamily={MONO} fontSize={38} opacity={a} {...CONTORNO}>{p.rotulo}</text>
            </g>
          );
        })}
        <Pulso x={XC} y={y} rastro={90} />
      </svg>
      {/* o cronômetro da luz */}
      <div style={{ position: "absolute", left: 470, top: 300, width: 540, textAlign: "right", fontFamily: MONO, color: TEXTO, textShadow: SOMBRA_TXT }}>
        <div style={{ fontSize: 24, letterSpacing: 3, color: TEXTO_2 }}>TEMPO DA LUZ</div>
        <div style={{ fontSize: 72, letterSpacing: -1, color: LARANJA }}>{fmtTempo(t)}</div>
      </div>
      <Janela o={jan(0)} legenda={"TERRA E LUA\nFOTO DA VOYAGER 1, 1977\nNASA/JPL"}>
        <Img src={img("terra-lua-1977.jpg")} style={{ position: "absolute", left: 57, top: 0, width: 186, height: 260, filter: "brightness(1.9) contrast(1.1)" }} />
      </Janela>
      <Janela o={jan(1)} legenda={"SOL\n(ESQUEMA)"}>
        <div style={{ position: "absolute", left: 90, top: 60, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, #FFF2C8 0%, #FFC25A 45%, #FF7A4500 72%)" }} />
      </Janela>
      <Janela o={jan(2)} legenda={"NETUNO\nFOTO DA VOYAGER 2, 1989\nNASA/JPL"}>
        <Img src={img("netuno.jpg")} style={{ position: "absolute", left: 20, top: -10, width: 260, height: 260 }} />
      </Janela>
      <Janela o={jan(3)} legenda={"VOYAGER 1\nILUSTRAÇÃO\nNASA/JPL-CALTECH"}>
        <Img src={img("voyager-conceito.jpg")} style={{ position: "absolute", left: -40, top: -140, width: 380, height: 675 }} />
      </Janela>
      <Etiqueta texto="QUANTO A LUZ LEVA, SAINDO DA TERRA" o={1} top={186} tam={28} />
      <Credito texto="JPL HORIZONS · 18/11/2026, 07H16 · CONTA NOSSA · ESCALA LOG" o={1} top={1660} />
    </AbsoluteFill>
  );
};

// --- 3. a distância, em escala linear ---------------------------------------------------------------------
const XD0 = 110, XD1 = 970, YD = 860;
const Longe: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.longe.de, C.longe.ate, 5);
  if (o <= 0) return null;
  const xN = XD0 + (XD1 - XD0) / K.voyager_sobre_netuno;
  const estica = entre(f, M.seis - 14, M.seis + 10, io);
  const xFim = xN + (XD1 - xN) * estica;
  const num = mola(f, M.bilhoes - 4, { damping: 12, stiffness: 180 });
  const conta = entre(f, M.bilhoes - 6, M.bilhoes + 14, Easing.out(Easing.cubic));
  const nNet = Math.floor((xFim - XD0) / (xN - XD0));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Estrelas o={0.5} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Filtros />
        <Neon filtro="vgNeon" largura={3}><line x1={XD0} y1={YD} x2={xFim} y2={YD} /></Neon>
        {/* uma "distância de Netuno" por marca */}
        {Array.from({ length: nNet }, (_, i) => (
          <g key={i}>
            <line x1={XD0 + (xN - XD0) * (i + 1)} x2={XD0 + (xN - XD0) * (i + 1)} y1={YD - 22} y2={YD + 22} stroke={i === 0 ? TEXTO : TEXTO_2} strokeWidth={2} />
            <text x={XD0 + (xN - XD0) * (i + 1)} y={YD + 58} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} {...CONTORNO}>{i + 1}×</text>
          </g>
        ))}
        <Terra x={XD0} y={YD} r={16} />
        <text x={XD0} y={YD - 44} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={2} {...CONTORNO}>TERRA</text>
        <text x={XD0} y={YD - 78} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={20} letterSpacing={1} {...CONTORNO}>(E O SOL)</text>
        <circle cx={xN} cy={YD} r={9} fill="#6E8CFF" />
        <text x={xN} y={YD - 44} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={2} {...CONTORNO}>NETUNO</text>
        <g opacity={entre(f, M.seis + 4, M.seis + 12)}>
          <circle cx={XD1} cy={YD} r={9} fill={LARANJA} />
          <text x={XD1} y={YD - 44} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={2} {...CONTORNO}>VOYAGER 1</text>
          <text x={XD1 - 8} y={YD + 58} textAnchor="end" fill={LARANJA} fontFamily={MONO} fontSize={34} {...CONTORNO}>{br(K.voyager_sobre_netuno, 1)}×</text>
        </g>
      </svg>
      <div style={{ position: "absolute", top: 1020, width: "100%", textAlign: "center", fontFamily: MONO, color: TEXTO, opacity: num, textShadow: SOMBRA_TXT }}>
        <div style={{ fontSize: 108, letterSpacing: -2, color: LARANJA, scale: `${0.85 + 0.15 * num}` }}>{br((K.voyager_km / 1e9) * conta, 1)} BI KM</div>
        <div style={{ fontSize: 26, letterSpacing: 3, color: TEXTO_2, marginTop: 8 }}>{`${br(K.voyager_ua, 0)} UA · 1 DIA-LUZ · JPL HORIZONS`}</div>
      </div>
      <Etiqueta texto={"DISTÂNCIA DA TERRA\nESCALA LINEAR"} o={1} top={200} tam={30} />
    </AbsoluteFill>
  );
};

// --- 4. a bolha do vento solar: heliopausa em 2012, Oort muito além -----------------------------------------
const XS = 170, YS = 860, KUA = 4; // px por UA
const RX = D.fatos.heliopausa.ua * KUA, RY = 400;
const Bolha: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.bolha.de, C.bolha.ate, 5);
  if (o <= 0) return null;
  // a sonda: sai do Sol em "1977", cruza a borda em "2012", chega aos 173 UA em "dados"
  const ua = entre(f, M.a1977 - 4, M.a2012, io) * D.fatos.heliopausa.ua + entre(f, M.a2012 + 4, M.dados + 4, io) * (K.voyager_ua_sol - D.fatos.heliopausa.ua);
  const xv = XS + ua * KUA;
  const borda = entre(f, M.heliopausa - 6, M.heliopausa + 8);
  const cruzou = entre(f, M.a2012 - 2, M.a2012 + 6);
  const fim = entre(f, M.dados - 4, M.dados + 6);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 90% 50%, rgba(255,122,69,0.16) 0%, rgba(255,122,69,0) 55%)" }} />
      <Estrelas o={0.5} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Filtros />
        <ellipse cx={XS} cy={YS} rx={RX} ry={RY} fill={CIANO} fillOpacity={0.06} />
        <Neon filtro="vgNeon" largura={2.5} opacidade={0.4 + 0.6 * borda}><ellipse cx={XS} cy={YS} rx={RX} ry={RY} /></Neon>
        <circle cx={XS} cy={YS} r={34} fill="#FFD27A" opacity={0.45} filter="url(#vgBrilhoForte)" />
        <circle cx={XS} cy={YS} r={16} fill="#FFE7A8" />
        <text x={XS} y={YS + 62} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={2} {...CONTORNO}>SOL</text>
        <text x={XS + 150} y={YS - 200} fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2} {...CONTORNO}>VENTO SOLAR</text>
        <text x={XS + RX + 30} y={YS - 300} fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2} opacity={cruzou} {...CONTORNO}>ESPAÇO</text>
        <text x={XS + RX + 30} y={YS - 268} fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2} opacity={cruzou} {...CONTORNO}>INTERESTELAR</text>
        {/* a borda */}
        <g opacity={borda}>
          <text x={XS + RX - 14} y={YS + 120} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2} {...CONTORNO}>HELIOPAUSA</text>
          <text x={XS + RX - 14} y={YS + 156} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2} {...CONTORNO}>{`${D.fatos.heliopausa.ua} UA`}</text>
        </g>
        <g opacity={cruzou}>
          <line x1={XS + RX} x2={XS + RX} y1={YS - 30} y2={YS + 30} stroke={TEXTO} strokeWidth={2} />
          <text x={XS + RX} y={YS - 44} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={34} {...CONTORNO}>2012</text>
        </g>
        {/* trajetória e sonda */}
        <line x1={XS} y1={YS} x2={xv} y2={YS} stroke={LARANJA} strokeWidth={2.5} strokeOpacity={0.6} strokeDasharray="6 8" />
        {f >= M.a1977 - 4 ? <>
          <circle cx={xv} cy={YS} r={22} fill={LARANJA} opacity={0.35} filter="url(#vgBrilhoForte)" />
          <circle cx={xv} cy={YS} r={9} fill={LARANJA} />
        </> : null}
        <g opacity={entre(f, M.a1977 - 2, M.a1977 + 6) * (1 - entre(f, M.heliopausa, M.heliopausa + 8))}>
          <text x={XS + 40} y={YS - 40} fill={TEXTO} fontFamily={MONO} fontSize={34} {...CONTORNO}>1977</text>
        </g>
        <g opacity={fim}>
          <text x={xv} y={YS + 68} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={30} {...CONTORNO}>{`${br(K.voyager_ua_sol, 0)} UA`}</text>
        </g>
        {/* a nuvem de Oort: muito além da tela */}
        <g opacity={fim}>
          <text x={1030} y={YS + 250} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={2} {...CONTORNO}>NUVEM DE OORT →</text>
          <text x={1030} y={YS + 286} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={1} {...CONTORNO}>COMEÇA A ~2.000 UA, FORA DA TELA</text>
          <text x={1030} y={YS + 318} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={1} {...CONTORNO}>(TAMBÉM É SISTEMA SOLAR)</text>
        </g>
      </svg>
      <Etiqueta texto={"A BOLHA DO VENTO SOLAR\nESQUEMA, DISTÂNCIAS DO SOL EM UA"} o={1} top={200} tam={28} />
      <Etiqueta texto={"AINDA MANDA DADOS\n2 INSTRUMENTOS LIGADOS"} o={fim} top={1250} tam={26} cor={TEXTO_2} />
    </AbsoluteFill>
  );
};

// --- 5. o Pale Blue Dot ------------------------------------------------------------------------------------------
// No recorte (1215×2160) o ponto está em (607, 1122): na tela, (539,5, 1002).
const PX = 539.5, PY = 1002;
const Ponto: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.ponto.de, C.ponto.ate, 6);
  if (o <= 0) return null;
  const s = 1 + 0.9 * entre(f, C.ponto.de, C.ponto.ate + 6, Easing.inOut(Easing.quad));
  const anel = entre(f, M.terraP - 6, M.terraP + 6);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Foto src="pale-blue-dot.jpg" o={1} s={s} origem={`${PX + 67.5}px ${PY + 120}px`} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,12,0.85) 0px, rgba(5,7,12,0) 520px, rgba(5,7,12,0) 1250px, rgba(5,7,12,0.8) 1700px)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Filtros />
        <g opacity={anel}>
          <Neon filtro="vgNeon" largura={2.5}><circle cx={PX} cy={PY} r={46 + 10 * (1 - anel)} /></Neon>
          <text x={PX + 66} y={PY + 10} fill={TEXTO} fontFamily={MONO} fontSize={34} letterSpacing={3} {...CONTORNO}>TERRA</text>
        </g>
      </svg>
      <Etiqueta texto={"PALE BLUE DOT · 14/2/1990\nA CERCA DE 6 BILHÕES DE KM"} o={1} />
      <Credito texto="FOTO: NASA/JPL-CALTECH · VERSÃO DE 2020" o={1} />
    </AbsoluteFill>
  );
};

// --- 6. a pergunta: 1 dia-luz hoje, 2 dias-luz quando? -----------------------------------------------------------
const Pergunta: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.pergunta.de, FIM, 6);
  if (o <= 0) return null;
  const y1 = 860, y2 = 380, y0 = 1080;
  const sobe = entre(f, M.dois - 4, M.dois + 10, io);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Estrelas o={0.6} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Filtros />
        <line x1={XL} y1={y0} x2={XL} y2={y1} stroke={CIANO} strokeWidth={2} strokeOpacity={0.6} />
        <line x1={XL} y1={y1} x2={XL} y2={y1 - (y1 - y2) * sobe} stroke={LARANJA} strokeWidth={3} strokeDasharray="6 12" />
        <Terra x={XL} y={y0} r={18} />
        <text x={XL - 40} y={y0 + 10} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={2} {...CONTORNO}>TERRA</text>
        <circle cx={XL} cy={y1} r={9} fill={CIANO} />
        <text x={XL - 34} y={y1 + 10} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={2} {...CONTORNO}>1 DIA-LUZ · 2026</text>
        <g opacity={sobe}>
          <circle cx={XL} cy={y2} r={14} fill="none" stroke={LARANJA} strokeWidth={3} />
          <text x={XL - 34} y={y2 + 10} textAnchor="end" fill={LARANJA} fontFamily={MONO} fontSize={30} letterSpacing={2} {...CONTORNO}>2 DIAS-LUZ · ?</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// --- legenda e pergunta grande ---------------------------------------------------------------------------------
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
      position: "absolute", top: 1170, left: 60, width: 960, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 90, lineHeight: 1.12, letterSpacing: -1, color: TEXTO,
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

const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/voyager/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Voyager: React.FC = () => (
  <Fundo>
    <Corrida />
    <Longe />
    <Bolha />
    <Ponto />
    <Pergunta />
    <Relogio />
    <PerguntaFinal />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-voyager.mjs: pings do pulso, tique do relógio, whoosh nas cenas */}
    <Audio src={staticFile("ciencia/voyager/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------------------------
// Padrão das capas de 12/11: rótulo mono no topo do recorte (y 300), elemento forte no meio,
// título Sora 400 de 150 px com a base em y 1600, uma palavra em laranja.
// O elemento é a ilustração da sonda (PIA17462, marcada como ILUSTRAÇÃO, como no vídeo). As 24 h são
// a ida do sinal em 18/11 (voyager_lt_s = 86400 s; a ida exata dá 24 h e 5 s).
export const VoyagerCapa: React.FC = () => (
  <Fundo>
    <Foto src="voyager-conceito.jpg" o={0.85} s={1.0} top={-250} origem="60% 40%" />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,12,0.75) 0px, rgba(5,7,12,0.15) 420px, rgba(5,7,12,0.2) 800px, rgba(5,7,12,0.9) 1150px, rgba(5,7,12,1) 1500px)" }} />
    <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 34, letterSpacing: 6, color: TEXTO_2, textShadow: SOMBRA_TXT }}>VOYAGER 1 · 18/11/2026</div>
    <Credito texto="ILUSTRAÇÃO: NASA/JPL-CALTECH" o={1} top={1010} />
    <div style={{ position: "absolute", bottom: 320, left: 40, width: 1000, textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 150, lineHeight: 1.04, letterSpacing: -4, color: TEXTO, textShadow: "0 0 30px rgba(5,7,12,1)" }}>
      Um “oi” leva<br /><span style={{ color: LARANJA, textShadow: `0 0 40px ${LARANJA}66, 0 0 30px rgba(5,7,12,1)` }}>24 horas</span>
    </div>
  </Fundo>
);
