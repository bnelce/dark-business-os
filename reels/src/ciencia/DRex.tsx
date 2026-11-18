import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import T from "./drex-tempos.json";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre, janela } from "./base";
import {
  Asteroide, CHAO_CV, Carvalho, Celular, Impacto, Laranja, Lente, Levedura, Neon, Penicillium, TRex, Traco,
  colunaDRex, pao, raizAteFungo, ruido,
} from "./ilustra-drex";
import { CIANO, LARANJA, MONO, TEXTO, TEXTO_2 } from "./tokens";

// "D-rex": Dianjunus rex, fungo descrito em 2026 em Yunnan (China), família nova
// (Dianjunaceae) na ordem Xylariales. Fontes:
//   - Song et al., "Unearthing a fungal giant...", Frontiers in Fungal Biology (2026);
//     preprint bioRxiv 10.64898/2026.07.05.697275
//   - Nota da Frontiers (13/10/2026) e ScienceDaily (26/10/2026)
// Números usados: estromas eretos de até 50 cm e 2,2 kg, os maiores entre os ascomicetos
// (os recordistas anteriores tinham 20-30 cm); a família surgiu há ~65 milhões de anos
// (relógio molecular), ~1 milhão de anos depois da extinção K-Pg (66 Ma); parente mais
// próximo: Graphostroma platystoma (Graphostromataceae); cresce de raízes lenhosas do
// carvalho-chinês (Quercus variabilis).
//
// Com narração (roteiro.json da pasta do reel). Os tempos saem de drex-tempos.json
// (scripts/tempos-drex.mjs, a partir da duração de cada fala); a trilha lê o mesmo arquivo.
//
// Ilustrações em traço fino (ilustra-drex.tsx). O artigo não dá diâmetro nem forma do
// estroma, então o fungo é sempre uma coluna genérica: na régua é uma barra de medida, e
// nas cenas do carvalho e do fecho aparece com o rótulo de ilustração. A hipótese do vento
// é dos autores e aparece rotulada como hipótese.

const F = T.fala;
export const DREX_TOTAL = T.total;

// Eixo desde 120 Ma: o asteroide cai perto do meio da tela em vez de colado na borda.
const ASTEROIDE_MA = 66, ORIGEM_MA = 65, INICIO_MA = 120;

// --- cena 1: linha do tempo, asteroide e a árvore ------------------------------------------
const xMa = (ma: number) => X0 + ((INICIO_MA - ma) / INICIO_MA) * (X1 - X0);
const Y_TRONCO = 900, Y_DREX = 820, Y_IRMA = 980, EIXO = 1330;
const XA = xMa(ASTEROIDE_MA);
// O asteroide entra pela direita, no alto, e cai no eixo bem em 66 Ma: o chão do gráfico
// é o chão do tiranossauro.
const PEDRA_DE = { x: 920, y: 600 };
const DIR = (() => { const dx = XA - PEDRA_DE.x, dy = EIXO - PEDRA_DE.y, d = Math.hypot(dx, dy); return { x: dx / d, y: dy / d }; })();

/** Cursor do tempo em milhões de anos: chega ao asteroide no impacto, espera a voz dizer
 * "surgiu" e então corre até hoje. */
const cursorMa = (f: number) => {
  if (f < T.impacto) return 95 - 29 * entre(f, 0, T.impacto);
  if (f < T.separa) return ASTEROIDE_MA;
  return ASTEROIDE_MA * (1 - entre(f, T.separa, F.altura - 30, Easing.inOut(Easing.quad)));
};

const Tempo: React.FC = () => {
  const f = useCurrentFrame();
  const o = 1 - entre(f, T.escala - 15, T.escala);
  if (o <= 0) return null;
  const ma = cursorMa(f);
  const xc = xMa(ma);
  const passouOrigem = ma <= ORIGEM_MA;
  const xo = xMa(ORIGEM_MA);
  // Pedra: devagar no começo (a capa já mostra ela vindo), acelera até o chão.
  const u = entre(f, 0, T.impacto, Easing.in(Easing.cubic));
  const px = PEDRA_DE.x + (XA - PEDRA_DE.x) * u, py = PEDRA_DE.y + (EIXO - PEDRA_DE.y) * u;
  // O tiranossauro se apaga traço a traço logo depois do impacto.
  const fimDino = entre(f, T.impacto + 4, T.impacto + 40, Easing.in(Easing.quad));
  const marco = entre(f, T.impacto + 8, T.impacto + 28);
  const ramoD = (y: number) => `M${xo},${Y_TRONCO} C${xo + 30},${Y_TRONCO} ${xo + 20},${y} ${xo + 60},${y} L${Math.max(xo + 60, xc)},${y}`;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="MILHÕES DE ANOS" direita="RELÓGIO MOLECULAR" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonDR1" /></defs>
        {/* eixo */}
        <line x1={X0} x2={X1} y1={EIXO} y2={EIXO} stroke={TEXTO_2} strokeOpacity={0.5} />
        {[120, 100, 80, 60, 40, 20, 0].map((m) => (
          <g key={m}>
            <line x1={xMa(m)} x2={xMa(m)} y1={EIXO} y2={EIXO + 12} stroke={TEXTO_2} strokeOpacity={0.6} />
            <text x={xMa(m)} y={EIXO + 46} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24}>{m === 0 ? "HOJE" : m}</text>
          </g>
        ))}
        {/* tiranossauro de pé no eixo, olhando pro lugar onde a pedra vai cair */}
        <TRex x={150} y={EIXO - 220} s={1.1} p={1 - fimDino} o={1 - 0.4 * fimDino} filtro="neonDR1" />
        {/* marco do asteroide, depois do impacto */}
        <g opacity={marco}>
          <line x1={XA} x2={XA} y1={620} y2={EIXO} stroke={LARANJA} strokeOpacity={0.5} strokeDasharray="6 8" />
          <text x={XA + 22} y={628} fill={LARANJA} fontFamily={MONO} fontSize={28}>ASTEROIDE</text>
          <text x={XA + 22} y={664} fill={TEXTO_2} fontFamily={MONO} fontSize={24}>FIM DOS DINOSSAUROS · 66</text>
        </g>
        {/* tronco ancestral até a separação, depois os dois ramos até o cursor */}
        <line x1={X0} x2={Math.min(xc, xo)} y1={Y_TRONCO} y2={Y_TRONCO} stroke={TEXTO_2} strokeWidth={3} />
        {passouOrigem && (
          <g>
            <path d={ramoD(Y_IRMA)} fill="none" stroke={TEXTO_2} strokeWidth={3} />
            <Traco d={ramoD(Y_DREX)} filtro="neonDR1" cor={CIANO} w={3.5} brilho={0.45} />
            <circle cx={xo} cy={Y_TRONCO} r={6} fill={TEXTO} />
          </g>
        )}
        <g opacity={entre(f, T.separa + 50, T.separa + 70)}>
          <text x={X1} y={Y_DREX - 22} textAnchor="end" fill={CIANO} fontFamily={MONO} fontSize={30}>D-REX · DIANJUNACEAE</text>
          <text x={X1} y={Y_IRMA - 22} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={26}>PARENTE MAIS PRÓXIMO</text>
          <text x={X1} y={Y_IRMA + 40} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22} fontStyle="italic">GRAPHOSTROMA</text>
        </g>
        <text x={xo - 10} y={Y_TRONCO + 44} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={24} opacity={entre(f, T.separa + 15, T.separa + 35)}>SEPARAÇÃO · ~65</text>
        {/* "A idade é da linhagem, não do fungo encontrado" */}
        <text x={xo - 10} y={Y_TRONCO + 78} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22} opacity={entre(f, F.ramo + 200, F.ramo + 220)}>IDADE DA LINHAGEM</text>
        {/* cursor: curto enquanto o tiranossauro está de pé, pra não cortar o desenho */}
        <line x1={xc} x2={xc} y1={760} y2={1060 + (EIXO - 1060) * fimDino} stroke={TEXTO} strokeOpacity={0.35} />
        {f < T.impacto && <Asteroide x={px} y={py} dx={DIR.x} dy={DIR.y} giro={f * 0.03} filtro="neonDR1" rastro={260 + 140 * u} />}
        <Impacto x={XA} y={EIXO} t={f - T.impacto} filtro="neonDR1" />
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 2: régua de alturas -----------------------------------------------------------
const CM = (1290 - 600) / 60; // px por centímetro
const yCm = (cm: number) => 1290 - cm * CM;
const retangulo = (x: number, w: number, de: number, ate: number) => `M${x - w / 2},${yCm(de)}L${x - w / 2},${yCm(ate)}L${x + w / 2},${yCm(ate)}L${x + w / 2},${yCm(de)}`;

const Escala: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, T.escala, T.carvalho, 12);
  if (o <= 0) return null;
  // Na ordem da fala: "estruturas de até meio metro…", depois "os recordistas anteriores…".
  const celular = entre(f, T.escala + 5, T.escala + 30, Easing.out(Easing.cubic));
  const drex = entre(f, F.altura + 10, F.altura + 110, Easing.inOut(Easing.cubic));
  const recorde = entre(f, T.recorde, T.recorde + 35, Easing.out(Easing.cubic));
  const XR = 590, XD = 800;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="ALTURA" direita="CENTÍMETROS" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonDR2" /></defs>
        {/* régua */}
        <line x1={X0 + 70} x2={X0 + 70} y1={yCm(60)} y2={yCm(0)} stroke={TEXTO_2} strokeOpacity={0.7} />
        {Array.from({ length: 61 }, (_, cm) => (
          <line key={cm} x1={X0 + 70 - (cm % 10 === 0 ? 22 : cm % 5 === 0 ? 14 : 7)} x2={X0 + 70} y1={yCm(cm)} y2={yCm(cm)}
            stroke={TEXTO_2} strokeOpacity={cm % 10 === 0 ? 0.8 : 0.4} />
        ))}
        {[0, 10, 20, 30, 40, 50, 60].map((cm) => (
          <text key={cm} x={X0 + 30} y={yCm(cm) + 8} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24}>{cm}</text>
        ))}
        <line x1={X0 + 70} x2={X1} y1={yCm(0)} y2={yCm(0)} stroke={TEXTO_2} strokeOpacity={0.5} />
        {/* celular de 15 cm, só referência de tamanho */}
        <g opacity={Math.min(1, celular * 3)}>
          <Celular x={400} base={yCm(0)} altura={15 * CM} p={celular} filtro="neonDR2" />
          <text x={400} y={yCm(15) - 24} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28} opacity={celular > 0.95 ? 1 : 0}>15 CM</text>
          <text x={400} y={yCm(0) + 44} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24}>CELULAR</text>
        </g>
        {/* recorde anterior: uma faixa, contorno cheio até 20 cm e tracejado de 20 a 30 */}
        <g opacity={Math.min(1, recorde * 3)}>
          <Traco d={retangulo(XR, 110, 0, 20 * recorde)} filtro="neonDR2" cor={TEXTO} w={2} brilho={0.25} preenche={0.08} />
          {recorde > 0.66 && <Traco d={retangulo(XR, 110, 20, 20 + 10 * (recorde - 0.66) / 0.34)} filtro="neonDR2" cor={TEXTO} w={1.5} brilho={0} tracejado="6 6" />}
          <text x={XR} y={yCm(30 * recorde) - 24} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28} opacity={recorde > 0.95 ? 1 : 0}>20–30 CM</text>
          <text x={XR} y={yCm(0) + 44} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24}>RECORDE ANTERIOR</text>
        </g>
        {/* D-rex: barra de medida, não desenho do fungo */}
        <g opacity={Math.min(1, drex * 3)}>
          <Traco d={`${retangulo(XD, 130, 0, 50 * drex)}Z`} filtro="neonDR2" cor={LARANJA} w={3} brilho={0.8} preenche={0.14} />
          <text x={XD} y={yCm(50 * drex) - 24} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={28} opacity={drex > 0.95 ? 1 : 0}>50 CM · 2,2 KG</text>
          <text x={XD} y={yCm(0) + 44} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={24}>D-REX</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 3: onde cresce (carvalho com raízes) -------------------------------------------
const X_FUNGO = 760, ALTO_FUNGO = 170; // fora de escala: em escala, o fungo some ao lado da árvore

const Raiz: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, T.carvalho, T.porque, 12);
  if (o <= 0) return null;
  const t = f - T.carvalho;
  const fungo = entre(t, 75, 105, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="YUNNAN · CHINA" direita="ONDE CRESCE" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonDR3" /></defs>
        <Traco d={`M${X0 - 30},${CHAO_CV}L${X1 + 30},${CHAO_CV}`} filtro="neonDR3" cor={TEXTO_2} w={1.5} p={entre(t, 0, 15)} brilho={0} />
        <Carvalho tronco={entre(t, 5, 25)} copa={entre(t, 18, 80)} raiz={entre(t, 30, 80)} folhas={entre(t, 70, 95)} filtro="neonDR3" />
        {/* a raiz lenhosa de onde sai o fungo */}
        <Traco d={raizAteFungo(X_FUNGO)} filtro="neonDR3" cor={TEXTO_2} w={2} p={entre(t, 50, 78)} brilho={0.25} />
        {fungo > 0 && (
          <Traco d={colunaDRex(X_FUNGO, CHAO_CV, ALTO_FUNGO * fungo, 46)} filtro="neonDR3" cor={LARANJA} w={2.5} brilho={0.8} preenche={0.14} />
        )}
        <g opacity={entre(t, 100, 115)}>
          <text x={X_FUNGO} y={CHAO_CV - ALTO_FUNGO - 26} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={28}>D-REX</text>
        </g>
        <g opacity={entre(t, 80, 95)}>
          <text x={X0} y={1430} fill={TEXTO} fontFamily={MONO} fontSize={24}>RAIZ DE CARVALHO-CHINÊS</text>
          <text x={X0} y={1464} fill={TEXTO_2} fontFamily={MONO} fontSize={22} fontStyle="italic">QUERCUS VARIABILIS</text>
          <text x={X1} y={1530} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2}>ILUSTRAÇÃO · FORA DE ESCALA</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 4: por que tão alto? (hipótese dos autores) -----------------------------------
const CHAO = 1290, MATO = 25; // cm de vegetação rasteira, só ilustrativo

/** Esporo: ponto com halo, sem círculo cheio grande. */
const Esporo: React.FC<{ x: number; y: number; cor: string; o: number }> = ({ x, y, cor, o }) => (
  <g opacity={o}>
    <circle cx={x} cy={y} r={7} fill={cor} opacity={0.45} filter="url(#neonDR4)" />
    <circle cx={x} cy={y} r={3} fill={cor} />
  </g>
);

const Porque: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, T.porque, T.grupo, 12);
  if (o <= 0) return null;
  const t = f - T.porque;
  const vento = entre(f, T.esporosAlto - 20, T.esporosAlto + 5);
  const fontes = [
    { x: 330, alto: 12, rotulo: "BAIXO", nasce: T.esporosBaixo, n: 24, passo: 5 },
    { x: 700, alto: 50, rotulo: "ALTO (D-REX)", nasce: T.esporosAlto, n: 30, passo: 4 },
  ];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="HIPÓTESE DOS AUTORES" direita="ESQUEMA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonDR4" /></defs>
        {/* vento: fios tracejados correndo pra direita, só acima do mato */}
        <g opacity={vento}>
          {[0, 1, 2].map((k) => {
            const y = yCm(46 + k * 5);
            return <path key={k} d={`M${X0},${y} C${X0 + 250},${y - 18} ${X0 + 520},${y + 18} ${X1 + 60},${y - 6}`} fill="none" stroke={CIANO}
              strokeWidth={1.5} strokeOpacity={0.55} strokeDasharray="70 50" strokeDashoffset={-(f - T.esporosAlto) * 7 - k * 40} />;
          })}
          <text x={X1} y={yCm(60) - 10} textAnchor="end" fill={CIANO} fontFamily={MONO} fontSize={28} letterSpacing={2}>VENTO →</text>
        </g>
        {/* mato */}
        {Array.from({ length: 80 }, (_, i) => {
          const x = X0 + (i / 79) * (X1 - X0);
          const h = (MATO * (0.75 + 0.25 * ruido(i))) * CM;
          return <line key={i} x1={x} x2={x + 6 * Math.sin(i + t / 15)} y1={CHAO} y2={CHAO - h} stroke={TEXTO_2} strokeOpacity={0.45} strokeWidth={1.5} />;
        })}
        <line x1={X0} x2={X1} y1={CHAO} y2={CHAO} stroke={TEXTO_2} strokeOpacity={0.6} />
        <text x={X1} y={yCm(MATO) - 12} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2}>VEGETAÇÃO</text>
        {fontes.map((fo, j) => {
          const topo = yCm(fo.alto);
          const acima = fo.alto > MATO;
          return (
            <g key={fo.rotulo}>
              <Traco d={colunaDRex(fo.x, CHAO, CHAO - topo, 48)} filtro="neonDR4" cor={acima ? LARANJA : TEXTO} w={2.5} brilho={acima ? 0.8 : 0.25} preenche={acima ? 0.14 : 0.06} />
              <text x={fo.x} y={CHAO + 44} textAnchor="middle" fill={acima ? LARANJA : TEXTO_2} fontFamily={MONO} fontSize={24}>{fo.rotulo}</text>
              {/* esporos: do baixo caem dentro do mato; do alto o vento leva */}
              {Array.from({ length: fo.n }, (_, k) => {
                const idade = f - (fo.nasce + k * fo.passo);
                if (idade < 0) return null;
                const vida = Math.min(1, idade / (acima ? 110 : 80));
                const x = acima ? fo.x + vida * (260 + 140 * ruido(k + j * 50)) : fo.x + (ruido(k) - 0.5) * 160 * Math.sqrt(vida);
                const y = acima ? topo - 10 + (ruido(k + 7) - 0.5) * 120 * vida + 30 * vida : topo + vida * (CHAO - topo - 10);
                return <Esporo key={k} x={x} y={y} cor={acima ? CIANO : TEXTO} o={1 - 0.5 * vida} />;
              })}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 5: parentes de mesmo filo -------------------------------------------------------
const XP = 235, XL = 535, XF = 835, BASE_IC = 1080, Y_LENTE = 770;

const Grupo: React.FC = () => {
  const f = useCurrentFrame();
  // Sai junto com a entrada da marca: a cartela é 85% opaca e os rótulos vazariam por baixo.
  const o = entre(f, T.grupo, T.grupo + 12) * (1 - entre(f, T.marca, T.marca + 20));
  if (o <= 0) return null;
  const t = f - T.grupo;
  // Na ordem da fala: o D-rex já está lá, depois "da levedura do pão", "e do mofo da laranja".
  const chave = entre(t, 0, 20), fungo = entre(t, 10, 50, Easing.out(Easing.cubic));
  const paoP = entre(t, 88, 112), lenteP = entre(t, 108, 125), levedura = entre(t, 122, 150);
  const laranja = entre(t, 135, 160), lenteL = entre(t, 152, 168), penic = entre(t, 165, 192), mofo = entre(t, 158, 195);
  const P = pao(XP, BASE_IC);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="ASCOMICETOS" direita="MESMO FILO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonDR5" /></defs>
        {/* chave que junta os três no mesmo grupo */}
        <Traco d={`M${XP},${650}L${XP},${620}L${XF},${620}L${XF},${650}M${XL},${620}L${XL},${650}`} filtro="neonDR5" cor={TEXTO_2} w={1.5} p={chave} brilho={0} />
        {/* pão + levedura */}
        <Traco d={P.corpo} filtro="neonDR5" cor={TEXTO} w={2} p={paoP} brilho={0.3} />
        <Traco d={P.cortes} filtro="neonDR5" cor={TEXTO_2} w={1.5} p={paoP} brilho={0} />
        <Lente x={XP} y={Y_LENTE} r={78} ate={[XP, BASE_IC - 116]} p={lenteP} filtro="neonDR5">
          <Levedura x={XP} y={Y_LENTE} p={levedura} filtro="neonDR5" />
        </Lente>
        {/* laranja + mofo */}
        <Laranja x={XL} y={1000} r={80} p={laranja} mofo={mofo} filtro="neonDR5" />
        <Lente x={XL} y={Y_LENTE} r={78} ate={[XL, 900]} p={lenteL} filtro="neonDR5">
          <Penicillium x={XL} y={Y_LENTE} p={penic} filtro="neonDR5" />
        </Lente>
        {/* D-rex: a mesma coluna genérica da cena do carvalho */}
        {fungo > 0 && <Traco d={colunaDRex(XF, BASE_IC, 200 * fungo, 54)} filtro="neonDR5" cor={LARANJA} w={2.5} brilho={0.8} preenche={0.14} />}
        {[
          { x: XP, nome: "LEVEDURA DO PÃO", latim: "SACCHAROMYCES", p: paoP, cor: TEXTO },
          { x: XL, nome: "MOFO DA LARANJA", latim: "PENICILLIUM", p: laranja, cor: TEXTO },
          { x: XF, nome: "D-REX", latim: "DIANJUNUS REX", p: fungo, cor: LARANJA },
        ].map((r) => (
          <g key={r.nome} opacity={entre(r.p, 0.6, 1)}>
            <text x={r.x} y={BASE_IC + 50} textAnchor="middle" fill={r.cor} fontFamily={MONO} fontSize={24}>{r.nome}</text>
            <text x={r.x} y={BASE_IC + 82} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={20} fontStyle="italic">{r.latim}</text>
          </g>
        ))}
        <text x={540} y={1250} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={20} letterSpacing={2} opacity={entre(t, 150, 170)}>
          ILUSTRAÇÕES ESQUEMÁTICAS · FORA DE ESCALA
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é audio/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/drex/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const DRex: React.FC = () => (
  <Fundo>
    <Tempo />
    <Escala />
    <Raiz />
    <Porque />
    <Grupo />
    <Manchete de={-10} ate={F.asteroide - 4}>Esse fungo surgiu quando{"\n"}<Destaque cor={LARANJA}>os dinossauros sumiram.</Destaque></Manchete>
    <Manchete de={F.asteroide} ate={F.ramo - 4}>Há 66 milhões de anos,{"\n"}<Destaque cor={LARANJA}>o fim dos dinossauros.</Destaque></Manchete>
    <Manchete de={F.ramo} ate={T.escala}>Logo depois, surge{"\n"}<Destaque>a família do D-rex.</Destaque></Manchete>
    <Manchete de={T.escala + 5} ate={T.carvalho}><Destaque cor={LARANJA}>Meio metro de altura:</Destaque>{"\n"}o maior já visto{"\n"}no seu grupo.</Manchete>
    <Manchete de={T.carvalho + 5} ate={T.porque}>Cresce de raízes{"\n"}de <Destaque>carvalho</Destaque>, na China.</Manchete>
    <Manchete de={T.porque + 5} ate={T.grupo}>Por que tão alto?{"\n"}Talvez pra soltar esporos{"\n"}<Destaque>acima do mato.</Destaque></Manchete>
    <Manchete de={T.grupo + 5} ate={F.cta - 4}>Do mesmo grupo{"\n"}da levedura do pão{"\n"}<Destaque cor={LARANJA}>e do mofo da laranja.</Destaque></Manchete>
    <Manchete de={F.cta} ate={T.marca}>Segue pra ver a ciência{"\n"}<Destaque>das novas descobertas.</Destaque></Manchete>
    <Fonte texto="FONTE: SONG ET AL. · FRONTIERS IN FUNGAL BIOLOGY · 2026" ate={T.marca} />
    <Marca de={T.marca} />
    <Narracao />
    {/* scripts/gerar-trilha-drex.mjs: por baixo da voz, os eventos caem nos quadros das cenas */}
    <Audio src={staticFile("ciencia/trilha-drex.mp3")} volume={0.22} />
  </Fundo>
);
