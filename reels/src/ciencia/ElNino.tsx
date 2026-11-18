import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./elnino.json";
import T from "./elnino-tempos.json";
import { Fundo, X0, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";
import { FiltroNeon, Neon } from "./ilustra-dolar";

// El Niño de 2026, versão 2: começa pelo que o fenômeno faz com o Brasil e só depois mostra o tamanho.
//   rio       o rio Negro em Manaus encolhendo no satélite (Landsat, out/2022 → out/2023) e o porto seco:
//             12,70 m em 26/10/2023, o menor desde 1902
//   sul       Porto Alegre alagada em maio de 2024 (184 mortes, 2,4 milhões de afetados no RS)
//   elo       seca em cima, enchente embaixo, "EL NIÑO" no meio; o Pacífico quente no satélite (NOAA CRW)
//   mecanismo sobre o mapa apagado: os alísios enfraquecem, a água quente escorre pro leste, a chuva muda
//   agora     o satélite volta em cor; o gráfico: a maior subida de dez–fev a ago–out desde 1950
//   noaa      83% de chance de evento histórico (NOAA, boletim de 8/10)
//   brasil    o alerta do Painel El Niño: seca e fogo no centro-norte, chuva no Sul; a pergunta
// O fim volta pro rio no satélite, pro loop emendar no quadro 0.
//
// Imagens em public/ciencia/elnino/img/ (recortes; originais e licenças em public/ciencia/fotos-origem.md).
// Números: elnino.json (scripts/gerar-elnino.mjs). Tempos: elnino-tempos.json (scripts/tempos-elnino.mjs).
// Editorial: El Niño "tem o dedo" nos extremos (contribui), nunca "causou sozinho"; nada de "maior da
// história"; "superar todos desde 1950" só como chance calculada pela NOAA.

export const ELNINO_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const C = T.cena;
const FT = D.fatos;
const FIM = T.fim;
const G0 = T.grande[0].f;

const CONTORNO = { stroke: FUNDO, strokeWidth: 8, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const io = Easing.inOut(Easing.cubic);
const saida = Easing.out(Easing.cubic);
const sinal = (v: number, casas = 2) => `${v < 0 ? "−" : "+"}${br(Math.abs(v), casas)}`;
const foto = (n: string) => staticFile(`ciencia/elnino/img/${n}`);
const SOMBRA_TXT = "0 0 14px rgba(5,7,12,1), 0 0 6px rgba(5,7,12,1), 0 2px 4px rgba(0,0,0,0.9)";

/** Quanto uma cena está visível: entra e sai com fusão curta. */
const visivel = (f: number, de: number, ate: number, fade = 6) => (f < de - fade || f >= ate + fade ? 0 : Math.min(entre(f, de - fade, de), 1 - entre(f, ate, ate + fade)));

// --- peças comuns ---------------------------------------------------------------------------------

/** Foto de tela inteira (recorte 1215×2160) com zoom lento de câmera. */
const Foto: React.FC<{ src: string; o: number; s: number; origem?: string; filtro?: string }> = ({ src, o, s, origem = "50% 50%", filtro }) =>
  o <= 0 ? null : (
    <AbsoluteFill style={{ opacity: o, overflow: "hidden" }}>
      <Img src={foto(src)} style={{ position: "absolute", left: -67.5, top: -120, width: 1215, height: 2160, scale: `${s}`, transformOrigin: origem, filter: filtro }} />
    </AbsoluteFill>
  );

/** Escurece o alto e a base da foto, pra o texto ler em cima de qualquer imagem. */
const Sombras: React.FC<{ o?: number }> = ({ o = 1 }) => (
  <AbsoluteFill style={{
    opacity: o,
    background: "linear-gradient(180deg, rgba(5,7,12,0.92) 0px, rgba(5,7,12,0.55) 430px, rgba(5,7,12,0) 640px, rgba(5,7,12,0) 1080px, rgba(5,7,12,0.7) 1260px, rgba(5,7,12,0.94) 1700px)",
  }} />
);

/** Crédito e fonte, no alto (acima da etiqueta). */
const Credito: React.FC<{ texto: string; o: number }> = ({ texto, o }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", opacity: o, fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: TEXTO_2, textShadow: SOMBRA_TXT, whiteSpace: "nowrap" }}>{texto}</div>
  );

/** Onde e quando: a etiqueta da cena. */
const Etiqueta: React.FC<{ texto: string; o: number; cor?: string; top?: number }> = ({ texto, o, cor = TEXTO, top = 318 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: 60, width: 960, textAlign: "center", opacity: o, fontFamily: MONO, fontSize: 32, letterSpacing: 3, color: cor, textShadow: SOMBRA_TXT, whiteSpace: "pre-line", lineHeight: 1.35 }}>{texto}</div>
  );

const Heroi: React.FC<{ o: number; children: React.ReactNode; top?: number }> = ({ o, children, top = 1172 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: X0, width: 820, opacity: o, fontFamily: MONO, color: TEXTO, textAlign: "center" }}>{children}</div>
  );

const Grande: React.FC<{ tam?: number; cor?: string; children: React.ReactNode }> = ({ tam = 112, cor = LARANJA, children }) => (
  <div style={{ fontSize: tam, lineHeight: 1.04, color: cor, letterSpacing: -2, textShadow: `0 0 30px ${cor}55, ${SOMBRA_TXT}`, whiteSpace: "nowrap" }}>{children}</div>
);

const Rotulo: React.FC<{ children: React.ReactNode; cor?: string }> = ({ children, cor = TEXTO }) => (
  <div style={{ fontSize: 25, letterSpacing: 3, color: cor, marginTop: 10, lineHeight: 1.45, whiteSpace: "pre-line", textShadow: SOMBRA_TXT }}>{children}</div>
);

// --- 1. o rio no satélite (e o fim, que volta pra ele) -----------------------------------------------
const W0 = 0.1; // a cortina já correndo no quadro 0

const Rio: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM;
  const o = noFim ? entre(f, FIM, FIM + 12) : visivel(f, 0, C.landsat.ate, 4);
  if (o <= 0) return null;
  const w = noFim ? W0 : W0 + (1 - W0) * entre(f, 0, M.ano + 4, io);
  const s = noFim ? 1 : 1 + 0.08 * entre(f, 0, C.landsat.ate);
  const x = w * 1080;
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, o) }}>
      <Foto src="landsat-2022.jpg" o={1} s={s} />
      <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - w) * 100}% 0 0)` }}>
        <Foto src="landsat-2023.jpg" o={1} s={s} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: x - 2, top: 0, width: 4, height: 1920, background: LARANJA, boxShadow: `0 0 24px ${LARANJA}` }} />
      <Sombras />
      <div style={{ position: "absolute", top: 470, left: Math.max(40, Math.min(x - 220, 820)), width: 180, textAlign: "right", fontFamily: MONO, fontSize: 40, color: LARANJA, textShadow: SOMBRA_TXT, opacity: entre(w, 0.18, 0.3) }}>2023</div>
      <div style={{ position: "absolute", top: 470, left: Math.min(860, x + 40), width: 180, fontFamily: MONO, fontSize: 40, color: TEXTO, textShadow: SOMBRA_TXT, opacity: 1 - entre(w, 0.7, 0.82) }}>2022</div>
      <Etiqueta texto={"RIO NEGRO · MANAUS\nVISTO DO SATÉLITE, EM OUTUBRO"} o={1} />
      <Credito texto="IMAGENS: NASA EARTH OBSERVATORY / LANDSAT (USGS)" o={1} />
    </AbsoluteFill>
  );
};

const Porto: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.porto.de, C.porto.ate);
  if (o <= 0) return null;
  const num = mola(f, M.menor, { damping: 12, stiffness: 200 });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Foto src="manaus-porto.jpg" o={1} s={1 + 0.1 * entre(f, C.porto.de, C.porto.ate + 6)} origem="35% 70%" />
      <Sombras />
      <Etiqueta texto={"PORTO DE MANAUS\n4/10/2023"} o={1} />
      <Credito texto="FOTO: CADU GOMES/VPR · CC BY 2.0 · RECORTADA" o={1} />
      <Heroi o={num}>
        <div style={{ scale: `${0.85 + 0.15 * num}` }}><Grande>{br(FT.manaus.cota, 2)} m</Grande></div>
        <Rotulo>{`26/10/2023 · O MENOR DESDE ${FT.manaus.inicioSerie}\nPORTO DE MANAUS · SGB`}</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- 2. o Sul alagado ---------------------------------------------------------------------------------
const Enchente: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.enchente.de, C.enchente.ate);
  if (o <= 0) return null;
  const troca = M.a2024 - 2;
  const num = mola(f, M.enchentes, { damping: 12, stiffness: 200 });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Foto src="poa-ruas.jpg" o={1} s={1.12 - 0.12 * entre(f, C.enchente.de, troca)} origem="50% 40%" />
      <Foto src="poa-bairro.jpg" o={entre(f, troca, troca + 5)} s={1 + 0.08 * entre(f, troca, C.enchente.ate + 6)} origem="60% 50%" />
      <Sombras />
      <Etiqueta texto={"PORTO ALEGRE (RS)\n17/5/2024"} o={1} />
      <Credito texto="FOTOS: GIULIAN SERAFIM/PMPA" o={1} />
      <Heroi o={num}>
        <div style={{ scale: `${0.85 + 0.15 * num}` }}><Grande cor={TEXTO}>{FT.rs2024.obitos} MORTES</Grande></div>
        <Rotulo>{"2,4 MILHÕES DE AFETADOS NO RS\nABR–MAI/2024 · DEFESA CIVIL RS"}</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- 3. o elo: os dois extremos e o nome ---------------------------------------------------------------
const Painel: React.FC<{ src: string; top: number; altura: number; s: number; origem: string }> = ({ src, top, altura, s, origem }) => (
  <div style={{ position: "absolute", left: 0, top, width: 1080, height: altura, overflow: "hidden" }}>
    <Img src={foto(src)} style={{ position: "absolute", left: 0, top: (altura - 1920) / 2, width: 1080, height: 1920, objectFit: "cover", scale: `${s}`, transformOrigin: origem }} />
  </div>
);

const Dois: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.dois.de, C.dois.ate, 5);
  if (o <= 0) return null;
  const abre = entre(f, C.dois.de - 4, C.dois.de + 10, saida);
  const nome = mola(f, M.elnino - 2, { damping: 11, stiffness: 160 });
  const s = 1 + 0.06 * entre(f, C.dois.de, C.dois.ate);
  return (
    <AbsoluteFill style={{ opacity: o, background: FUNDO }}>
      <div style={{ translate: `${(1 - abre) * -1080}px 0` }}><Painel src="santarem.jpg" top={0} altura={958} s={s} origem="55% 60%" /></div>
      <div style={{ translate: `${(1 - abre) * 1080}px 0` }}><Painel src="poa-bairro.jpg" top={962} altura={958} s={s} origem="50% 40%" /></div>
      <div style={{ position: "absolute", top: 958, left: 0, width: 1080, height: 4, background: LARANJA, boxShadow: `0 0 30px ${LARANJA}`, opacity: abre }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,12,0.85) 0px, rgba(5,7,12,0.2) 420px, rgba(5,7,12,0.45) 960px, rgba(5,7,12,0.2) 1300px, rgba(5,7,12,0.9) 1750px)" }} />
      <Etiqueta texto="SECA · SANTARÉM (PA), 14/10/2023" o={abre} top={330} />
      <div style={{ position: "absolute", top: 1090, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 32, letterSpacing: 3, color: TEXTO, textShadow: SOMBRA_TXT, opacity: abre }}>ENCHENTE · PORTO ALEGRE, 17/5/2024</div>
      <div style={{
        position: "absolute", top: 838, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 168, letterSpacing: 2, color: LARANJA,
        textShadow: `0 0 40px ${LARANJA}aa, 0 0 12px rgba(5,7,12,1)`, opacity: Math.min(1, nome * 1.4), scale: `${0.7 + 0.3 * nome}`,
      }}>EL NIÑO</div>
      <Credito texto="FOTOS: JUDISON G. DE SOUSA, CC BY 4.0 / GIULIAN SERAFIM/PMPA" o={abre} />
    </AbsoluteFill>
  );
};

// --- 4. o Pacífico no satélite (NOAA Coral Reef Watch) e o mecanismo por cima ------------------------
// O PNG é equirretangular: x = x0 + (lonE − lon0)·k, y = y0 + (lat0 − lat)·k. A faixa mostra de 120°E a
// 35°W (escala 1080/941) e de 70°N a 70°S, com o equador em y=800 da tela.
const CR = D.crw;
const S_MAPA = 1080 / ((295 - 90) * CR.k);
const X_IMG0 = CR.x0 + (120 - CR.lon0) * CR.k; // 120°E na borda esquerda
const Y_EQ = CR.y0 + CR.lat0 * CR.k;
const TOPO_MAPA = 431, ALT_MAPA = 738, EQ_TELA = 800 - TOPO_MAPA;
/** lon em graus leste (0–360), lat em graus; devolve a posição dentro da caixa do mapa. */
const geo = (lonE: number, lat: number): [number, number] => [
  (CR.x0 + (lonE - CR.lon0) * CR.k - X_IMG0) * S_MAPA,
  (CR.y0 + (CR.lat0 - lat) * CR.k - Y_EQ) * S_MAPA + EQ_TELA,
];

/** Câmera do mapa: escala `s` em torno de (lonE, lat), que vai pro centro da caixa conforme `s` cresce. */
const camera = (s: number, lonE: number, lat: number) => {
  const [px, py] = geo(lonE, lat);
  return { scale: `${s}`, transformOrigin: `${px}px ${py}px` };
};

const LEGENDA_CRW: [string, string][] = [["#f7e600", "+0,5"], ["#f0aa00", "+1,5"], ["#f76900", "+2,5"], ["#ef1e00", "+3,5"], ["#911400", "+4,5"]];

const Seta: React.FC<{ x: number; y: number; comp: number; o: number; fase: number }> = ({ x, y, comp, o, fase }) => (
  <g opacity={o} stroke={TEXTO} strokeWidth={5} strokeLinecap="round" fill="none">
    <line x1={x + comp / 2} x2={x - comp / 2} y1={y} y2={y} strokeDasharray="22 14" strokeDashoffset={fase} />
    <path d={`M${x - comp / 2 + 18},${y - 14} L${x - comp / 2},${y} L${x - comp / 2 + 18},${y + 14}`} strokeLinejoin="round" />
  </g>
);

const Nuvem: React.FC<{ x: number; y: number; o: number; f: number }> = ({ x, y, o, f }) => (
  <g transform={`translate(${x} ${y})`} opacity={o}>
    <path d="M-52,10 a26,26 0 0 1 8,-44 a34,34 0 0 1 62,-6 a24,24 0 0 1 36,26 a22,22 0 0 1 -6,24 Z" fill="rgba(232,244,255,0.92)" stroke={FUNDO} strokeWidth={3} />
    {[-34, -12, 10, 32].map((dx, i) => {
      const u = ((f * 2 + i * 9) % 26) / 26;
      return <line key={dx} x1={dx - 4 * u} x2={dx - 4 * u - 6} y1={20 + 40 * u} y2={36 + 40 * u} stroke={CIANO} strokeWidth={4} strokeLinecap="round" opacity={1 - u} />;
    })}
  </g>
);

const Mapa: React.FC = () => {
  const f = useCurrentFrame();
  const naCena = Math.max(visivel(f, C.mapa.de, C.mapa.ate, 6), visivel(f, C.chance.de, C.chance.ate, 6));
  if (naCena <= 0) return null;
  const mec = janela(f, F.mecanismo - 6, F.agora + 4, 10); // o mapa apaga e o esquema entra por cima
  const emChance = f >= C.chance.de - 6;
  // câmera: abre no detalhe da língua quente e se afasta; no "agora", volta a chegar perto
  const sAbre = 1 + 0.9 * (1 - entre(f, C.mapa.de, Math.min(M.demais + 8, F.mecanismo - 8), io));
  const sAgora = 1 + 0.55 * entre(f, F.agora - 2, F.agora + 40, io);
  const s = emChance ? 1 : f >= F.agora - 2 ? sAgora : sAbre;
  const cam = camera(s, 245, -2);

  // o esquema do mecanismo
  const forca = 1 - 0.7 * entre(f, M.enfraquecem - 2, M.enfraquecem + 18, io);
  const anda = entre(f, M.escorre - 4, M.leste + 14, io);
  const [bx, by] = geo(150 + 95 * anda, 0);
  const brx = 120 + 170 * anda, bry = 70 - 22 * anda;
  const chuvaAnda = entre(f, M.chuva - 4, M.lugar + 10, io);
  const [nx, ny] = geo(132 + 70 * chuvaAnda, 13);
  const fase = -(f * 3) * forca;
  const ventos = [180, 205, 230, 255];
  const estado = f < M.enfraquecem ? "NORMAL" : "EL NIÑO";
  const rotuloSat = emChance ? "SATÉLITE · 7/11/2026" : f >= F.agora ? "O EL NIÑO DE 2026, VISTO DO SATÉLITE" : "A ÁGUA DO MAR ACIMA DO NORMAL, HOJE";

  return (
    <AbsoluteFill style={{ opacity: naCena }}>
      <div style={{ position: "absolute", left: 0, top: TOPO_MAPA, width: 1080, height: ALT_MAPA, overflow: "hidden", borderTop: `1px solid ${TEXTO_2}55`, borderBottom: `1px solid ${TEXTO_2}55` }}>
        <div style={{ position: "absolute", inset: 0, ...cam }}>
          <Img src={foto("crw-2026-11-07.png")} style={{
            position: "absolute", left: -X_IMG0 * S_MAPA, top: EQ_TELA - Y_EQ * S_MAPA, width: CR.largura * S_MAPA, height: CR.altura * S_MAPA,
            filter: `grayscale(${mec}) brightness(${1 - 0.6 * mec})`,
          }} />
          <svg width={1080} height={ALT_MAPA} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <defs>
              <radialGradient id="quente">
                <stop offset="0%" stopColor="#ef1e00" stopOpacity={0.95} />
                <stop offset="55%" stopColor={LARANJA} stopOpacity={0.6} />
                <stop offset="100%" stopColor={LARANJA} stopOpacity={0} />
              </radialGradient>
            </defs>
            {mec > 0 && (
              <g opacity={mec}>
                <line x1={0} x2={1080} y1={EQ_TELA} y2={EQ_TELA} stroke={TEXTO_2} strokeDasharray="6 10" strokeWidth={2} />
                <ellipse cx={bx} cy={by} rx={brx} ry={bry} fill="url(#quente)" />
                <text x={bx} y={by + bry + 46} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={30} letterSpacing={2} {...CONTORNO}>ÁGUA QUENTE</text>
                {ventos.map((lon, i) => {
                  const [vx, vy] = geo(lon, i % 2 ? -6 : 6);
                  return <Seta key={lon} x={vx} y={vy} comp={130 * (0.35 + 0.65 * forca)} o={0.35 + 0.65 * forca} fase={fase} />;
                })}
                <text x={geo(218, 0)[0]} y={geo(0, 15)[1]} textAnchor="middle" fill={TEXTO} fillOpacity={entre(f, M.ventos - 4, M.ventos + 6)} fontFamily={MONO} fontSize={30} letterSpacing={2} {...CONTORNO}>
                  VENTOS ALÍSIOS{forca < 0.6 ? " (FRACOS)" : ""}
                </text>
                <Nuvem x={nx} y={ny} o={entre(f, M.chuva - 6, M.chuva + 2)} f={f} />
                <text x={geo(136, 0)[0]} y={geo(0, 34)[1]} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2} {...CONTORNO}>ÁSIA</text>
                <text x={geo(296, 0)[0]} y={geo(0, -12)[1]} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2} {...CONTORNO}>AMÉRICA</text>
                <text x={geo(296, 0)[0]} y={geo(0, -12)[1] + 32} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2} {...CONTORNO}>DO SUL</text>
              </g>
            )}
          </svg>
        </div>
        {/* legenda das cores do satélite */}
        <div style={{ position: "absolute", left: 24, bottom: 18, display: "flex", alignItems: "center", gap: 6, opacity: 1 - mec, fontFamily: MONO, fontSize: 20, color: TEXTO, textShadow: SOMBRA_TXT }}>
          <span style={{ marginRight: 8 }}>ACIMA DO NORMAL</span>
          {LEGENDA_CRW.map(([cor, t]) => (
            <span key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ width: 54, height: 14, background: cor }} />
              <span>{t}</span>
            </span>
          ))}
          <span style={{ marginLeft: 4 }}>°C</span>
        </div>
      </div>
      <Etiqueta texto={mec > 0.5 ? estado : rotuloSat} o={1} cor={mec > 0.5 && estado === "EL NIÑO" ? LARANJA : TEXTO} />
      <Credito texto={mec > 0.5 ? "ESQUEMA SOBRE O MAPA DO SATÉLITE · NOAA CORAL REEF WATCH" : "SATÉLITE: NOAA CORAL REEF WATCH · ANOMALIA DE 7/11/2026"} o={1} />
    </AbsoluteFill>
  );
};

// --- 5. o tamanho: a maior subida desde 1950 -----------------------------------------------------------
const GY0 = 500, GY1 = 1110, GMIN = -1.6, GMAX = 3.0;
const GY = (v: number) => GY1 - ((v - GMIN) / (GMAX - GMIN)) * (GY1 - GY0);
const GX = [290, 520, 640, 760, 880];
const GL = [124, 84, 84, 84, 84]; // largura das barras: a de 2026 é a mais larga

const Grafico: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.grafico.de, C.grafico.ate, 6);
  if (o <= 0) return null;
  const R = D.ranking;
  const cresce = (k: number) => entre(f, C.grafico.de + 4 + (k === 0 ? 14 : k * 3), C.grafico.de + 30 + (k === 0 ? 20 : k * 3), io);
  const baixo = entre(f, M.abaixo - 3, M.abaixo + 4);
  const topo = entre(f, M.v25 - 3, M.v25 + 4);
  const oito = entre(f, M.oito - 3, M.oito + 5);
  const roni = entre(f, M.oito + 8, M.oito + 16);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"QUANTO O PACÍFICO ESQUENTOU\nDE DEZ–FEV A AGO–OUT"} o={1} />
      <Credito texto="DADOS: CPC/NOAA (ONI) · CÁLCULO NOSSO · TOP 5 DESDE 1950" o={1} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonG" /></defs>
        {[-1, 0, 1, 2, 3].map((v) => (
          <g key={v}>
            <line x1={130} x2={950} y1={GY(v)} y2={GY(v)} stroke={TEXTO_2} strokeOpacity={v === 0 ? 0.8 : 0.2} strokeWidth={v === 0 ? 2.5 : 1.5} />
            <text x={118} y={GY(v) + 9} textAnchor="end" fill={v === 0 ? TEXTO : TEXTO_2} fontFamily={MONO} fontSize={v === 0 ? 20 : 26}>{v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "NORMAL"}</text>
          </g>
        ))}
        {R.map((r, k) => {
          const t = cresce(k);
          if (t <= 0) return null;
          const yTopo = GY(r.de + (r.ate - r.de) * t), yBase = GY(r.de);
          const eh26 = k === 0;
          const cor = eh26 ? LARANJA : k === 1 ? CIANO : TEXTO_2;
          return (
            <g key={r.ano}>
              {eh26 && <rect x={GX[k] - GL[k] / 2 - 6} y={yTopo} width={GL[k] + 12} height={yBase - yTopo} fill={LARANJA} opacity={0.35} filter="url(#neonG)" />}
              <rect x={GX[k] - GL[k] / 2} y={yTopo} width={GL[k]} height={yBase - yTopo} fill={cor} opacity={eh26 ? 1 : 0.75} />
              <text x={GX[k]} y={yTopo - 18} textAnchor="middle" fill={eh26 ? LARANJA : TEXTO} fillOpacity={t} fontFamily={MONO} fontSize={eh26 ? 46 : 28}>+{br(r.d * t, 2)}</text>
              <text x={GX[k]} y={GY1 + 50} textAnchor="middle" fill={eh26 ? LARANJA : TEXTO} fontFamily={MONO} fontSize={32}>{r.ano}</text>
            </g>
          );
        })}
        {baixo > 0 && (
          <g opacity={baixo}>
            <line x1={GX[0] - 76} x2={GX[0] + GL[0] / 2} y1={GY(FT.oniDjf2026)} y2={GY(FT.oniDjf2026)} stroke={TEXTO} strokeWidth={3} />
            <text x={GX[0] - 80} y={GY(FT.oniDjf2026) + 2} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={26} {...CONTORNO}>{sinal(FT.oniDjf2026)}</text>
            <text x={GX[0] - 80} y={GY(FT.oniDjf2026) + 28} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={20} {...CONTORNO}>DEZ–FEV</text>
          </g>
        )}
        {topo > 0 && (
          <g opacity={topo}>
            <line x1={GX[0] - 76} x2={GX[0] + GL[0] / 2} y1={GY(FT.oniAso2026)} y2={GY(FT.oniAso2026)} stroke={LARANJA} strokeWidth={3} />
            <text x={GX[0] - 80} y={GY(FT.oniAso2026) + 2} textAnchor="end" fill={LARANJA} fontFamily={MONO} fontSize={26} {...CONTORNO}>{sinal(FT.oniAso2026)}</text>
            <text x={GX[0] - 80} y={GY(FT.oniAso2026) + 28} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={20} {...CONTORNO}>AGO–OUT</text>
          </g>
        )}
      </svg>
      <Heroi o={oito} top={1180}>
        <Rotulo cor={LARANJA}>{`2026: +${br(FT.subidaOni, 2)} °C EM 8 MESES, A MAIOR DESDE 1950`}</Rotulo>
        <div style={{ opacity: roni }}><Rotulo cor={TEXTO_2}>{`NO RONI, O ÍNDICE OFICIAL DA NOAA, TAMBÉM:\n2026 +${br(FT.subidaRoni, 2)} × 1997 +${br(FT.subidaRoni1997, 2)}`}</Rotulo></div>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- 6. 83% -----------------------------------------------------------------------------------------------
const Chance: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.chance.de, C.chance.ate, 6);
  if (o <= 0) return null;
  const c = T.contas.find((x) => x.id === "c83")!;
  const p = entre(f, c.de, c.ate, saida);
  const n = mola(f, M.p83 - 2, { damping: 11, stiffness: 180 });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", left: 0, top: TOPO_MAPA, width: 1080, height: ALT_MAPA, background: "rgba(5,7,12,0.5)" }} />
      <div style={{ position: "absolute", top: 660, width: "100%", textAlign: "center", opacity: Math.min(1, n * 1.3), scale: `${0.8 + 0.2 * n}`,
        fontFamily: MONO, fontSize: 250, lineHeight: 1, color: LARANJA, letterSpacing: -6, textShadow: `0 0 40px ${LARANJA}88, ${SOMBRA_TXT}, 0 0 60px rgba(5,7,12,0.9)` }}>
        {Math.round(FT.chance.OND * p)}%
      </div>
      <Heroi o={Math.min(1, n * 1.3)} top={1190}>
        <Rotulo>{"DE CHANCE DE SUPERAR TODOS OS\nEL NIÑOS DESDE 1950, EM OUT–DEZ"}</Rotulo>
        <Rotulo cor={TEXTO_2}>{"NOAA · BOLETIM DE 8/10/2026 · RONI ≥ +2,5\nPRÓXIMO BOLETIM: 12/11"}</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- 7. o Brasil: o alerta oficial ---------------------------------------------------------------------
const Chama: React.FC<{ x: number; y: number; f: number; s?: number; k: number }> = ({ x, y, f, s = 1, k }) => {
  const tremor = 1 + 0.12 * Math.sin(f * 0.9 + k * 2.1);
  return (
    <g transform={`translate(${x} ${y}) scale(${s} ${s * tremor})`}>
      <path d="M0,-34 C14,-16 20,-6 16,8 C13,20 -13,20 -16,8 C-19,-4 -8,-12 -4,-22 C-2,-14 2,-12 4,-10 C6,-18 4,-26 0,-34 Z" fill={LARANJA} stroke={FUNDO} strokeWidth={2.5} />
      <path d="M0,-6 C6,2 8,8 5,13 C2,17 -5,17 -7,12 C-9,6 -3,2 0,-6 Z" fill="#f7e600" />
    </g>
  );
};

const Brasil: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.brasil.de, C.brasil.ate, 6);
  if (o <= 0) return null;
  const B = D.brasil;
  const seca = entre(f, M.seca - 4, M.seca + 8);
  const fogo = entre(f, M.fogo - 4, M.fogo + 6);
  const chuva = entre(f, M.chuvaS - 4, M.chuvaS + 8);
  const apaga = entre(f, G0 - 10, G0); // na pergunta, o mapa fica de fundo
  const cor = (r: string) => (r === "N" ? [LARANJA, 0.85 * seca] : r === "NE" ? [LARANJA, 0.35 * seca] : r === "S" ? [CIANO, 0.85 * chuva] : [TEXTO_2, 0]) as [string, number];
  const [cnx, cny] = B.centros.N, [csx, csy] = B.centros.S;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"O ALERTA OFICIAL\nPARA OS PRÓXIMOS MESES"} o={1 - apaga} />
      <Credito texto="PAINEL EL NIÑO · INMET, INPE, ANA, CEMADEN, SGB · 30/9 E 29/10" o={1} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - 0.55 * apaga }}>
        {B.estados.map((e) => {
          const [c, op] = cor(e.r);
          return (
            <g key={e.uf}>
              <path d={e.d} fill="#0f1a2c" stroke={TEXTO_2} strokeOpacity={0.6} strokeWidth={1.5} />
              {op > 0 && <path d={e.d} fill={c} fillOpacity={op} stroke={c} strokeOpacity={op} strokeWidth={1.5} />}
            </g>
          );
        })}
        {fogo > 0 && [[110, -10], [175, 50], [-130, 40], [45, 80], [-55, 110]].map(([dx, dy], k) => (
          <g key={k} opacity={entre(f, M.fogo - 4 + k * 2, M.fogo + 2 + k * 2)}><Chama x={cnx + dx} y={cny + dy} f={f} k={k} s={1.3} /></g>
        ))}
        {chuva > 0 && Array.from({ length: 14 }, (_, i) => {
          const u = ((f * 2.2 + i * 7) % 30) / 30;
          const x = csx - 90 + (i % 7) * 30, y = csy - 120 + Math.floor(i / 7) * 30 + 70 * u;
          return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 18} stroke={CIANO} strokeWidth={4} strokeLinecap="round" opacity={chuva * (1 - u)} />;
        })}
        <g opacity={seca}>
          <text x={cnx} y={cny + 160} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={34} letterSpacing={2} {...CONTORNO}>SECA</text>
          <text x={cnx} y={cny + 200} textAnchor="middle" fill={LARANJA} fillOpacity={fogo} fontFamily={MONO} fontSize={30} letterSpacing={2} {...CONTORNO}>E RISCO DE FOGO</text>
        </g>
        <g opacity={chuva}>
          <text x={csx + 140} y={csy - 60} fill={TEXTO} fontFamily={MONO} fontSize={32} letterSpacing={2} {...CONTORNO}>CHUVA ACIMA</text>
          <text x={csx + 140} y={csy - 22} fill={TEXTO} fontFamily={MONO} fontSize={32} letterSpacing={2} {...CONTORNO}>DA MÉDIA</text>
        </g>
        {[[B.manaus, "MANAUS"], [B.portoAlegre, "PORTO ALEGRE"]].map(([p, nome]) => (
          <g key={nome as string}>
            <circle cx={(p as number[])[0]} cy={(p as number[])[1]} r={8} fill={TEXTO} stroke={FUNDO} strokeWidth={3} />
            <text x={(p as number[])[0] + (nome === "MANAUS" ? -14 : 14)} y={(p as number[])[1] - 10} textAnchor={nome === "MANAUS" ? "end" : "start"} fill={TEXTO} fontFamily={MONO} fontSize={22} letterSpacing={1} {...CONTORNO}>{nome as string}</text>
          </g>
        ))}
      </svg>
      <Heroi o={entre(f, M.sulB - 2, M.sulB + 6) * (1 - apaga)} top={1196}>
        <Rotulo cor={TEXTO_2}>{"ESQUEMA POR REGIÃO · NOV/2026 A JAN/2027"}</Rotulo>
      </Heroi>
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
  const linhas = [0, 1].map((l) => T.grande.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top: 1180, left: 60, width: 960, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 96, lineHeight: 1.14, letterSpacing: -1, color: TEXTO,
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

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/elnino/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/elnino/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const ElNino: React.FC = () => (
  <Fundo>
    <Mapa />
    <Grafico />
    <Chance />
    <Brasil />
    <Porto />
    <Enchente />
    <Dois />
    <Rio />
    <PerguntaFinal />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-elnino.mjs: vento no mecanismo, chuva, fogo, whoosh nas cenas */}
    <Audio src={staticFile("ciencia/elnino/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
export const ElNinoCapa: React.FC = () => (
  <Fundo>
    <Painel src="landsat-2023.jpg" top={0} altura={958} s={1.05} origem="50% 40%" />
    <Painel src="poa-ruas.jpg" top={962} altura={958} s={1.05} origem="50% 50%" />
    <div style={{ position: "absolute", top: 958, left: 0, width: 1080, height: 4, background: LARANJA, boxShadow: `0 0 30px ${LARANJA}` }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,12,0.2) 0px, rgba(5,7,12,0.55) 700px, rgba(5,7,12,0.7) 960px, rgba(5,7,12,0.55) 1220px, rgba(5,7,12,0.2) 1920px)" }} />
    <div style={{ position: "absolute", top: 640, left: 60, width: 960, textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 104, lineHeight: 1.1, letterSpacing: -1.5, color: TEXTO, textShadow: "0 0 30px rgba(5,7,12,1), 0 0 10px rgba(5,7,12,1)" }}>
      Seca no Norte,<br />enchente no Sul
    </div>
    <div style={{ position: "absolute", top: 1000, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 132, letterSpacing: 2, color: LARANJA, textShadow: `0 0 40px ${LARANJA}aa, 0 0 12px rgba(5,7,12,1)` }}>
      EL NIÑO
    </div>
  </Fundo>
);
