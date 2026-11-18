import { AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CORES, Fundo, PRETO, SANS, ramp } from "../aula/cena";
import { paperJitter } from "../remocn/stop-motion";

// 17 — Matemática: cartão de consulta dos gráficos das 6 funções.
//
// Formato diferente dos anteriores: aqui NADA é apagado. O valor é ter tudo junto
// no fim — a pessoa salva ou dá print. Por isso os itens se acumulam e o último
// quadro mostra o cartão completo. Reel de discussão quer comentário; este quer
// salvamento, e são construções opostas.
//
// As curvas são plotadas a partir da função, não desenhadas à mão: num quadro branco
// a logarítmica é um chute, aqui ela é a curva.

const CAPA = 40;
const D = [123, 59, 84, 62, 84, 99, 98, 95];
const CAUDA = 70; // segura o cartão completo no fim, pro print
const F = D.map((_, i) => CAPA + D.slice(0, i).reduce((a, b) => a + b, 0));
export const L17_TOTAL = CAPA + D.reduce((a, b) => a + b, 0) + CAUDA;

type Fn = (x: number) => number;

/** Cada função em coordenadas normalizadas: x e y de 0 a 1, y pra cima. */
const FUNCOES: { nome: string; cor: string; f: Fn; dominio?: [number, number] }[] = [
  { nome: "AFIM", cor: CORES.azul, f: (x) => 0.12 + 0.78 * x },
  { nome: "CONSTANTE", cor: CORES.verde, f: () => 0.52 },
  { nome: "QUADRÁTICA", cor: CORES.coral, f: (x) => Math.pow((x - 0.5) * 2, 2) * 0.88 },
  { nome: "EXPONENCIAL", cor: CORES.roxo, f: (x) => (Math.pow(2, 4 * x) - 1) / 15 * 0.9 },
  { nome: "LOGARÍTMICA", cor: CORES.rosa, f: (x) => (Math.log(1 + 12 * x) / Math.log(13)) * 0.88, dominio: [0.02, 1] },
  { nome: "MODULAR", cor: CORES.amarelo, f: (x) => Math.abs(x - 0.5) * 2 * 0.88 },
];

const LARG = 300, ALT = 152, AMOSTRAS = 64;

/** Mini sistema de eixos com a curva se desenhando. O traçado usa dasharray sobre
 *  pathLength normalizado — assim a velocidade do desenho não depende do comprimento
 *  da curva, e todas terminam juntas. */
const Grafico: React.FC<{ f: Fn; cor: string; at: number; dominio?: [number, number] }> = ({
  f, cor, at, dominio = [0, 1],
}) => {
  const frame = useCurrentFrame();
  const p = ramp(frame, at, at + 26);
  const px = (x: number) => 26 + x * (LARG - 40);
  const py = (y: number) => ALT - 22 - y * (ALT - 44);
  const [x0, x1] = dominio;
  const pts = Array.from({ length: AMOSTRAS }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / (AMOSTRAS - 1);
    return `${px(x).toFixed(1)},${py(Math.min(1, Math.max(0, f(x)))).toFixed(1)}`;
  });
  return (
    <svg width={LARG} height={ALT}>
      {/* eixos em L, como no caderno */}
      <path d={`M 26 12 L 26 ${ALT - 22} L ${LARG - 14} ${ALT - 22}`} fill="none" stroke={PRETO} strokeWidth={5} strokeLinecap="round" />
      <polygon points={`26,6 20,18 32,18`} fill={PRETO} />
      <polygon points={`${LARG - 8},${ALT - 22} ${LARG - 20},${ALT - 28} ${LARG - 20},${ALT - 16}`} fill={PRETO} />
      <polyline
        points={pts.join(" ")}
        fill="none" stroke={cor} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p}
      />
    </svg>
  );
};

const Linha: React.FC<{ i: number; at: number }> = ({ i, at }) => {
  const { nome, cor, f, dominio } = FUNCOES[i];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: 10 });
  if (p <= 0.001) return null;
  const jt = paperJitter(frame, `l${i}`, { amp: 0.8, rotAmp: 0.14 });
  const y = 402 + i * 208;
  return (
    <div style={{
      position: "absolute", top: y, left: 62, width: 956, height: 186,
      display: "flex", alignItems: "center", gap: 20,
      opacity: p, transform: `translateX(${(1 - p) * -28}px) rotate(${jt.rot}deg)`,
    }}>
      <div style={{
        width: 560, background: cor, border: `6px solid ${PRETO}`, borderRadius: 14,
        boxShadow: `9px 10px 0 ${PRETO}`, padding: "16px 20px",
        fontFamily: SANS, fontWeight: 900, fontSize: 52, color: PRETO, letterSpacing: -1,
      }}>{nome}</div>
      <div style={{
        background: "#FFFDF6", border: `6px solid ${PRETO}`, borderRadius: 14,
        boxShadow: `9px 10px 0 ${PRETO}`, padding: "8px 10px 4px", lineHeight: 0,
      }}>
        <Grafico f={f} cor={cor} at={at + 8} dominio={dominio} />
      </div>
    </div>
  );
};

/** Capa completa no quadro zero: é a miniatura da grade e o primeiro quadro de quem rola. */
const Capa: React.FC = () => {
  const f = useCurrentFrame();
  const some = ramp(f, CAPA - 12, CAPA);
  if (some >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - some, background: "#FBF7EC" }}>
      <div style={{
        position: "absolute", top: 430, width: "100%", textAlign: "center", padding: "0 60px",
        fontFamily: SANS, fontWeight: 900, fontSize: 124, lineHeight: 0.95, letterSpacing: -5, color: PRETO,
      }}>
        GRÁFICOS<br />DE FUNÇÕES
      </div>
      <div style={{ position: "absolute", top: 830, width: "100%", textAlign: "center" }}>
        <span style={{
          background: CORES.amarelo, boxShadow: `0 0 0 16px ${CORES.amarelo}`,
          fontFamily: SANS, fontWeight: 900, fontSize: 76, color: PRETO,
        }}>AS 6 QUE CAEM</span>
      </div>
      {/* prévia dos gráficos: a miniatura precisa mostrar o que está prometendo,
          senão é só uma capa de texto disputando com outras capas de texto */}
      <div style={{
        position: "absolute", top: 1090, left: "50%", transform: "translateX(-50%)",
        width: 640, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap",
      }}>
        {FUNCOES.map((fn, i) => (
          <div key={i} style={{
            background: "#FFFDF6", border: `5px solid ${PRETO}`, borderRadius: 12,
            boxShadow: `7px 8px 0 ${PRETO}`, padding: "6px 8px 2px", lineHeight: 0,
            transform: `rotate(${i % 2 ? 1.4 : -1.4}deg)`,
          }}>
            <svg width={148} height={92}>
              <path d={`M 16 8 L 16 74 L 138 74`} fill="none" stroke={PRETO} strokeWidth={4} strokeLinecap="round" />
              <polyline
                points={Array.from({ length: 40 }, (_, k) => {
                  const [a, b] = fn.dominio ?? [0, 1];
                  const x = a + ((b - a) * k) / 39;
                  return `${(16 + x * 118).toFixed(1)},${(74 - Math.min(1, Math.max(0, fn.f(x))) * 62).toFixed(1)}`;
                }).join(" ")}
                fill="none" stroke={fn.cor} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
        ))}
      </div>

      <div style={{
        position: "absolute", top: 1420, width: "100%", textAlign: "center",
        fontFamily: SANS, fontWeight: 700, fontSize: 44, color: "rgba(20,17,24,0.55)",
      }}>salva antes da prova</div>
    </div>
  );
};

export const L17GraficosFuncoes: React.FC = () => {
  const f = useCurrentFrame();
  const fimCta = ramp(f, F[7], F[7] + 12);
  return (
    <>
      <Fundo total={L17_TOTAL} />

      <div style={{
        position: "absolute", top: 150, width: "100%", textAlign: "center",
        fontFamily: SANS, fontWeight: 900, fontSize: 74, letterSpacing: -3, color: PRETO,
        opacity: ramp(f, CAPA, CAPA + 10),
      }}>
        GRÁFICOS DE FUNÇÕES
      </div>

      {/* os seis itens se acumulam — nada some */}
      {FUNCOES.map((_, i) => (
        <Linha key={i} i={i} at={F[i + 1]} />
      ))}

      {/* fechamento sobre o cartão completo, sem cobrir os gráficos */}
      {fimCta > 0 && (
        <div style={{
          position: "absolute", bottom: 74, width: "100%", display: "flex",
          flexDirection: "column", alignItems: "center", gap: 10, opacity: fimCta,
        }}>
          <div style={{
            background: CORES.amarelo, border: `7px solid ${PRETO}`, borderRadius: 14,
            boxShadow: `10px 11px 0 ${PRETO}`, padding: "12px 34px",
            fontFamily: SANS, fontWeight: 900, fontSize: 48, color: PRETO,
          }}>SALVA — É TUA COLA</div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: "rgba(20,17,24,0.5)" }}>
            @revisaorapida1ano
          </div>
        </div>
      )}

      <Capa />

      {D.map((dur, i) => (
        <Sequence key={i} from={F[i]} durationInFrames={dur}>
          <Audio src={staticFile(`narracao-gf/b${i + 1}.mp3`)} />
        </Sequence>
      ))}
    </>
  );
};
