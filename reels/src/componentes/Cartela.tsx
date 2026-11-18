import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTE, type Cor } from "../tokens";

export type CartelaProps = {
  texto: string;
  enfase?: string;
  cor: Cor;
  tamanho?: number;
};

// Divide o texto preservando o \n literal do roteiro: quem escreve controla o ritmo visual.
function emLinhas(texto: string) {
  return texto.split("\n");
}

// Comparar a palavra crua com a ênfase crua faz "90%" e "Salva." nunca casarem.
// Os dois lados passam pela mesma normalização — a mesma de
// scripts/reels/roteiro.js, que valida a ênfase antes de gastar TTS.
function normalizarPalavra(texto: string) {
  return texto.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
}

export const Cartela: React.FC<CartelaProps> = ({ texto, enfase, cor, tamanho = 96 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });
  const escala = interpolate(entrada, [0, 1], [0.92, 1]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 90,
        background: cor.fundo,
      }}
    >
      <div style={{ opacity: entrada, transform: `scale(${escala})`, textAlign: "center" }}>
        {emLinhas(texto).map((linha, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONTE,
              fontSize: tamanho,
              fontWeight: 800,
              lineHeight: 1.15,
              color: cor.texto,
              letterSpacing: -1,
            }}
          >
            {linha.split(" ").map((palavra, j) => {
              const destacada = Boolean(enfase) && normalizarPalavra(palavra) === normalizarPalavra(enfase!);
              return (
                <span key={j} style={{ color: destacada ? cor.destaque : undefined }}>
                  {palavra}{j < linha.split(" ").length - 1 ? " " : ""}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
