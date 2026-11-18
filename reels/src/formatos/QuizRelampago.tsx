import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Cartela } from "../componentes/Cartela";
import { coresDa, FONTE, type Cor } from "../tokens";

export type Beat = { id: string; textoTela: string; narracao: string; enfase?: string };
export type ItemDeTimeline = { id: string; arquivo: string; deFrame: number; frames: number };

export type QuizProps = {
  roteiro: { disciplina: string; beats: Beat[] };
  timeline: { totalFrames: number; beats: ItemDeTimeline[] };
  baseInstrumental?: string;
};

// Trilho e marca herdam a cor de texto da disciplina: branco translúcido some
// nos fundos claros da paleta (verde, rosa, azul).
const Cronometro: React.FC<{ cor: Cor; frames: number }> = ({ cor, frames }) => {
  const frame = useCurrentFrame();
  const restante = interpolate(frame, [0, frames], [1, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", bottom: 220, left: 90, right: 90, height: 14, background: cor.trilha, borderRadius: 7 }}>
      <div style={{ width: `${restante * 100}%`, height: "100%", background: cor.destaque, borderRadius: 7 }} />
    </div>
  );
};

const Marca: React.FC<{ cor: Cor }> = ({ cor }) => (
  <div style={{ position: "absolute", bottom: 90, width: "100%", textAlign: "center", fontFamily: FONTE, fontSize: 34, fontWeight: 600, color: cor.textoSuave }}>
    @revisaorapida1ano
  </div>
);

export const QuizRelampago: React.FC<QuizProps> = ({ roteiro, timeline, baseInstrumental }) => {
  const { fps } = useVideoConfig();
  const cor = coresDa(roteiro.disciplina);
  const ultimoIndice = roteiro.beats.length - 1;

  return (
    <AbsoluteFill style={{ background: cor.fundo }}>
      {baseInstrumental ? (
        <Audio
          src={staticFile(baseInstrumental)}
          // Fade out nos últimos 500ms, pra base não cortar seco no fim do reel.
          volume={(f) =>
            interpolate(f, [timeline.totalFrames - fps / 2, timeline.totalFrames], [0.1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}

      {timeline.beats.map((item, i) => {
        const beat = roteiro.beats[i];
        return (
          <Sequence key={item.id} from={item.deFrame} durationInFrames={item.frames}>
            <Cartela texto={beat.textoTela} enfase={beat.enfase} cor={cor} />
            <Audio src={staticFile(`narracao/${item.arquivo}`)} />
            {beat.id === "pergunta" ? <Cronometro cor={cor} frames={item.frames} /> : null}
            {/* A marca só aparece no último beat — nada de branding antes do segundo 2. */}
            {i === ultimoIndice ? <Marca cor={cor} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
