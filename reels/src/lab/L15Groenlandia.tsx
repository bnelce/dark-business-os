import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CORES, PRETO, SANS, ramp } from "../aula/cena";
import { paperJitter } from "../remocn/stop-motion";
import geo from "./geo-groenlandia.json";

// 15 — Geografia: a Groenlândia não é do tamanho da África.
// Geometria do Natural Earth (domínio público), gerada por scripts/gerar-geo.mjs.
// A demonstração é a troca de projeção: Mercator (infla o que está longe do equador)
// para Equal Earth (preserva área). É exato — nada de encolher a olho.
//
// Aqui NÃO se usa <Cena> do aula-reel: a varredura de apagamento cortaria a
// continuidade do mapa, que precisa atravessar as cenas pra morfagem fazer sentido.

const D = [209, 160, 230, 207, 303, 155];
const F = D.map((_, i) => D.slice(0, i).reduce((a, b) => a + b, 0));
export const L15_TOTAL = D.reduce((a, b) => a + b, 0);

const PAPEL = "#FBF7EC";
const AMARELO = CORES.amarelo;
const ROSA = CORES.coral;

/** Interpola dois caminhos SVG número a número. Só é válido porque os dois vêm da
 *  mesma geometria em projeções diferentes — mesma sequência de comandos. */
const morfar = (a: string, b: string, t: number): string => {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const nb = b.match(/-?\d+\.?\d*/g);
  if (!nb) return a;
  let i = 0;
  return a.replace(/-?\d+\.?\d*/g, (m) => {
    const va = Number(m);
    const vb = Number(nb[i++] ?? m);
    return (va + (vb - va) * t).toFixed(1);
  });
};

const Mapa: React.FC<{ t: number; destaque: boolean }> = ({ t, destaque }) => {
  const groenlandia = morfar(geo.mercator.groenlandia, geo.equalEarth.groenlandia, t);
  const africa = morfar(geo.mercator.africa, geo.equalEarth.africa, t);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {/* mundo: as duas projeções recortam diferente, então é transição de opacidade */}
      <path d={geo.mercator.mundo} fill="#E4DFD2" stroke="#C9C2B2" strokeWidth={1} opacity={1 - t} />
      <path d={geo.equalEarth.mundo} fill="#E4DFD2" stroke="#C9C2B2" strokeWidth={1} opacity={t} />
      <path d={africa} fill={destaque ? ROSA : "#E4DFD2"} stroke={PRETO} strokeWidth={3} />
      <path d={groenlandia} fill={destaque ? AMARELO : "#E4DFD2"} stroke={PRETO} strokeWidth={3} />
    </svg>
  );
};

const Rotulo: React.FC<{ texto: string; x: number; y: number; cor: string; at: number; giro?: number }> = ({
  texto, x, y, cor, at, giro = 0,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: { damping: 200 }, durationInFrames: 9 });
  if (p <= 0.001) return null;
  return (
    <div style={{
      position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${giro}deg) scale(${0.9 + 0.1 * p})`,
      opacity: p, background: cor, border: `5px solid ${PRETO}`, borderRadius: 10,
      boxShadow: `8px 9px 0 ${PRETO}`, padding: "10px 22px",
      fontFamily: SANS, fontWeight: 800, fontSize: 40, color: PRETO, whiteSpace: "nowrap",
    }}>{texto}</div>
  );
};

const Faixa: React.FC<{ texto: string; at: number; y: number; cor?: string; tamanho?: number }> = ({
  texto, at, y, cor = "#FFFDF6", tamanho = 56,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: { damping: 200 }, durationInFrames: 10 });
  if (p <= 0.001) return null;
  const jt = paperJitter(f, `fx${at}`, { amp: 1, rotAmp: 0.2 });
  return (
    <div style={{
      position: "absolute", top: y, left: 0, width: "100%", display: "flex", justifyContent: "center",
      opacity: p, transform: `translateY(${(1 - p) * 26}px) rotate(${jt.rot}deg)`,
    }}>
      <div style={{
        background: cor, border: `7px solid ${PRETO}`, borderRadius: 16, boxShadow: `11px 12px 0 ${PRETO}`,
        padding: "20px 38px", maxWidth: 940,
        fontFamily: SANS, fontWeight: 800, fontSize: tamanho, color: PRETO, lineHeight: 1.16,
        textAlign: "center", whiteSpace: "pre-line",
      }}>{texto}</div>
    </div>
  );
};

/** Título da capa: completo no quadro zero, porque é a miniatura da grade. */
const Capa: React.FC = () => {
  const f = useCurrentFrame();
  const some = ramp(f, 40, 58);
  if (some >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - some }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(251,247,236,0.82)" }} />
      <div style={{
        position: "absolute", top: 300, width: "100%", textAlign: "center", padding: "0 60px",
        fontFamily: SANS, fontWeight: 900, fontSize: 116, lineHeight: 0.96, letterSpacing: -4, color: PRETO,
      }}>
        <span style={{ background: AMARELO, boxShadow: `0 0 0 14px ${AMARELO}` }}>GROENLÂNDIA</span>
        <div style={{ marginTop: 40, fontSize: 84 }}>é do tamanho da</div>
        <div style={{ marginTop: 26 }}>
          <span style={{ background: ROSA, boxShadow: `0 0 0 14px ${ROSA}` }}>ÁFRICA?</span>
        </div>
      </div>
      <div style={{
        position: "absolute", top: 1180, width: "100%", textAlign: "center",
        fontFamily: SANS, fontWeight: 700, fontSize: 46, color: "rgba(20,17,24,0.62)",
      }}>o mapa mentiu pra você a vida toda</div>
    </div>
  );
};

const Contador: React.FC<{ n: number; at: number }> = ({ n, at }) => {
  const f = useCurrentFrame();
  if (f < at || n < 1) return null;
  return (
    <div style={{
      position: "absolute", top: 1520, left: 0, width: "100%", display: "flex", justifyContent: "center",
    }}>
      <div style={{
        background: AMARELO, border: `7px solid ${PRETO}`, borderRadius: 16, boxShadow: `11px 12px 0 ${PRETO}`,
        padding: "14px 44px", fontFamily: SANS, fontWeight: 900, fontSize: 104, color: PRETO,
        fontVariantNumeric: "tabular-nums",
      }}>{n >= 14 ? "13,7×" : `${n}×`}</div>
    </div>
  );
};

const Cabecalho: React.FC = () => (
  <div style={{
    position: "absolute", top: 104, width: "100%", textAlign: "center",
    fontFamily: SANS, fontWeight: 700, fontSize: 26, color: "rgba(20,17,24,0.45)", letterSpacing: 4,
  }}>GEOGRAFIA · CARTOGRAFIA</div>
);

export const L15Groenlandia: React.FC = () => {
  const f = useCurrentFrame();
  // A morfagem acontece dentro da cena 3, entre a fala "olha o que acontece" e o fim dela.
  const t = ramp(f, F[2] + 40, F[2] + 170);
  const destaque = f > 26;

  // Cena 4: em vez de sobrepor uma Groenlândia (que vira um pontinho escondido),
  // preenche a África com 14 cópias em tamanho real, entrando uma a uma. É a mesma
  // afirmação — "cabe quase 14 vezes" — mas visível em vez de declarada.
  const gEq = geo.caixas.equalEarth.groenlandia;
  const aEq = geo.caixas.equalEarth.africa;
  const COLS = 2, LINHAS = 7;
  const celulaL = aEq.larg / COLS, celulaA = aEq.alt / LINHAS;
  const copias = Array.from({ length: COLS * LINHAS }, (_, k) => ({
    dx: aEq.x + (k % COLS) * celulaL - gEq.x + (celulaL - gEq.larg) / 2,
    dy: aEq.y + Math.floor(k / COLS) * celulaA - gEq.y + (celulaA - gEq.alt) / 2,
  }));
  const preenche = ramp(f, F[3] + 34, F[3] + 150);
  const visiveis = Math.floor(preenche * copias.length);

  return (
    <AbsoluteFill style={{ background: PAPEL }}>
      <Mapa t={t} destaque={destaque} />

      {visiveis > 0 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <clipPath id="recorteAfrica"><path d={geo.equalEarth.africa} /></clipPath>
          <g clipPath="url(#recorteAfrica)">
            {copias.slice(0, visiveis).map((c, k) => (
              <path key={k} d={geo.equalEarth.groenlandia} fill={AMARELO} stroke={PRETO} strokeWidth={2.5}
                transform={`translate(${c.dx} ${c.dy})`} />
            ))}
          </g>
        </svg>
      )}

      <Cabecalho />
      <Capa />

      {D.map((dur, i) => (
        <Sequence key={i} from={F[i]} durationInFrames={dur}>
          <Audio src={staticFile(`narracao-geo/cena-${i + 1}.mp3`)} />
        </Sequence>
      ))}

      {/* 1 — o mapa como todo mundo conhece */}
      <Sequence from={F[0]} durationInFrames={D[0]}>
        <Rotulo texto="GROENLÂNDIA" x={300} y={470} cor={AMARELO} at={62} giro={-3} />
        <Rotulo texto="ÁFRICA" x={760} y={1190} cor={ROSA} at={92} giro={2} />
        <Faixa texto={"no mapa ela parece\naté MAIS ALTA que a África"} at={128} y={1440} tamanho={48} />
      </Sequence>

      {/* 2 — a pergunta */}
      <Sequence from={F[1]} durationInFrames={D[1]}>
        <Faixa texto="QUAL É MAIOR?" at={10} y={1380} cor={CORES.azul} tamanho={74} />
        <Faixa texto="⏸  pausa e responde" at={72} y={1580} cor={AMARELO} tamanho={42} />
      </Sequence>

      {/* 3 — a revelação: troca de projeção */}
      <Sequence from={F[2]} durationInFrames={D[2]}>
        <Faixa texto={"agora num mapa que\nrespeita a área de verdade"} at={8} y={200} tamanho={48} cor={CORES.verde} />
      </Sequence>

      {/* 4 — o número */}
      <Sequence from={F[3]} durationInFrames={D[3]}>
        <Faixa texto={"a África cabe quase\n14 Groenlândias"} at={96} y={200} tamanho={54} cor={ROSA} />
        <Contador n={visiveis} at={40} />
      </Sequence>

      {/* 5 — por quê */}
      <Sequence from={F[4]} durationInFrames={D[4]}>
        <Faixa texto={"a culpa é da projeção\nde MERCATOR"} at={10} y={200} tamanho={54} cor={CORES.roxo} />
        <Faixa texto={"ela estica tudo que fica\nlonge do equador"} at={132} y={1420} tamanho={48} />
        <Faixa texto="perto do polo, o exagero é gigante" at={216} y={1640} tamanho={40} cor={CORES.rosa} />
      </Sequence>

      {/* 6 — fechamento */}
      <Sequence from={F[5]} durationInFrames={D[5]}>
        <Faixa texto={"SALVA\npra nunca mais olhar\num mapa igual"} at={8} y={1240} tamanho={58} cor={CORES.verde} />
        <div style={{
          position: "absolute", bottom: 80, width: "100%", textAlign: "center",
          fontFamily: SANS, fontSize: 30, fontWeight: 600, color: "rgba(20,17,24,0.5)",
        }}>@revisaorapida1ano</div>
      </Sequence>
    </AbsoluteFill>
  );
};
