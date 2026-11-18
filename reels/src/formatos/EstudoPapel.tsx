import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Handwrite } from "../remocn/handwrite";
import { PaperWobble } from "../remocn/paper-wobble";
import { MarkerHighlight } from "../remocn/marker-highlight";
import { paperJitter } from "../remocn/stop-motion";

// Formato "estudo em papel" — estética studygram gerada em código.
// Fundo: foto de mesa/caderno (Unsplash, uso comercial livre, ver identidade/fotos/creditos.md).
// Texto: manuscrito em Caveat, entrando caractere a caractere em relógio stop-motion.

export type BeatPapel =
  | { tipo: "escrito"; texto: string; frames: number; tamanho?: number }
  | { tipo: "marcado"; antes?: string; destaque: string; depois?: string; frames: number };

export type EstudoPapelProps = {
  foto: string;
  beats: BeatPapel[];
  totalFrames: number;
};

const TINTA = "#1F1A17";
const MARCA_TEXTO = "#FAFAF7";

// Cartão de papel creme, levemente torto, que segura o texto e garante legibilidade
// sobre a foto. O tremor por pose vem do paper-wobble: faz parecer posto à mão na mesa.
const Cartao: React.FC<{ children: React.ReactNode; seed: string }> = ({ children, seed }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 50 }}>
    <PaperWobble seed={seed} amp={2.5} rotAmp={0.5}>
      <div
        style={{
          position: "relative",
          width: 980,
          minHeight: 1080,
          background: "#FDFBF4",
          borderRadius: 6,
          boxShadow: "0 30px 70px rgba(0,0,0,0.45), 0 2px 0 rgba(255,255,255,0.6) inset",
          transform: "rotate(-1.2deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // linhas de caderno
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 77px, rgba(90,120,160,0.20) 77px 78px)",
        }}
      >
        {children}
      </div>
    </PaperWobble>
  </AbsoluteFill>
);

const Marca: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 70,
      width: "100%",
      textAlign: "center",
      fontFamily: "Poppins, system-ui, sans-serif",
      fontSize: 32,
      fontWeight: 600,
      color: MARCA_TEXTO,
      textShadow: "0 2px 12px rgba(0,0,0,0.7)",
    }}
  >
    @revisaorapida1ano
  </div>
);

export const EstudoPapel: React.FC<EstudoPapelProps> = ({ foto, beats, totalFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Deriva muito lento na foto — dá vida ao fundo sem competir com o texto.
  const zoom = interpolate(frame, [0, totalFrames], [1.06, 1.14]);
  const jit = paperJitter(frame, "fundo", { amp: 1.2, rotAmp: 0.12 });

  let cursor = 0;
  const ultimo = beats.length - 1;

  return (
    <AbsoluteFill style={{ background: "#14110F" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom}) translate(${jit.x}px, ${jit.y}px)` }}>
        <Img
          src={staticFile(foto)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            // foto original é escura (YAVG 54/255); sem ganho o fundo some
            filter: "brightness(1.45) saturate(0.92) contrast(0.97) sepia(0.12)",
          }}
        />
      </AbsoluteFill>
      {/* véu quente: escurece a foto e puxa pro tom de abajur */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 35%, rgba(18,12,6,0.45) 100%)",
        }}
      />

      {beats.map((b, i) => {
        const from = cursor;
        cursor += b.frames;
        return (
          <Sequence key={i} from={from} durationInFrames={b.frames}>
            <Cartao seed={`beat-${i}`}>
              {b.tipo === "escrito" ? (
                <Handwrite text={b.texto} fontSize={b.tamanho ?? 104} color={TINTA} weight={600} perStep={2.1} />
              ) : (
                <MarkerHighlight
                  before={b.antes}
                  highlight={b.destaque}
                  after={b.depois}
                  markerColor="#FDE047"
                  baseColor={TINTA}
                  highlightedTextColor={TINTA}
                  fontSize={96}
                  fontWeight={700}
                />
              )}
            </Cartao>
            {i === ultimo ? <Marca /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
