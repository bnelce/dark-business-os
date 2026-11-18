import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { paperJitter, steppedRamp } from "../remocn/stop-motion";

export const SANS = "Poppins, system-ui, sans-serif";
export const TINTA = "#1F1A17";
export const PAPEL = "#FBF7EC";
export const PALETA = {
  roxo: "#667eea", roxoEsc: "#764ba2", rosa: "#f093fb",
  azul: "#4facfe", verde: "#43e97b", coral: "#fa709a", amarelo: "#FDE047",
};

/** Rampa 0→1 entre dois frames, com clamp. */
export const ramp = (f: number, de: number, ate: number) =>
  interpolate(f, [de, ate], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Papel de caderno com grade e tremor de pose. */
export const Papel: React.FC<{ total: number; grade?: boolean }> = ({ total, grade = true }) => {
  const frame = useCurrentFrame();
  const jit = paperJitter(frame, "pg", { amp: 0.9, rotAmp: 0.06 });
  const drift = interpolate(frame, [0, total], [0, -26]);
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${jit.x}px, ${drift + jit.y}px)`,
        backgroundImage: grade
          ? "repeating-linear-gradient(to bottom, transparent 0 79px, rgba(90,120,160,0.16) 79px 80px), repeating-linear-gradient(to right, transparent 0 79px, rgba(90,120,160,0.08) 79px 80px)"
          : undefined,
      }}
    />
  );
};

export const Titulo: React.FC<{ materia: string; titulo: string }> = ({ materia, titulo }) => (
  <div style={{ position: "absolute", top: 104, width: "100%", textAlign: "center" }}>
    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 27, color: "rgba(31,26,23,0.5)", letterSpacing: 4 }}>
      {materia.toUpperCase()}
    </div>
    <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: TINTA, marginTop: 4, letterSpacing: -1.4, padding: "0 60px", lineHeight: 1.05 }}>
      {titulo}
    </div>
  </div>
);

export const Assinatura: React.FC<{ claro?: boolean }> = ({ claro }) => (
  <div style={{ position: "absolute", bottom: 84, width: "100%", textAlign: "center", fontFamily: SANS, fontSize: 28, fontWeight: 600, color: claro ? "rgba(255,255,255,0.55)" : "rgba(31,26,23,0.42)" }}>
    @revisaorapida1ano
  </div>
);

/** Traço SVG que se desenha (usa stroke-dash). */
export const Traco: React.FC<{
  d: string; cor: string; largura?: number; de: number; ate: number; comprimento: number; tracejado?: boolean;
}> = ({ d, cor, largura = 7, de, ate, comprimento, tracejado }) => {
  const frame = useCurrentFrame();
  const p = steppedRamp(frame, de, ate);
  if (p === 0) return null;
  return (
    <path
      d={d} fill="none" stroke={cor} strokeWidth={largura} strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray={tracejado ? "14 14" : comprimento}
      strokeDashoffset={tracejado ? 0 : comprimento * (1 - p)}
      opacity={tracejado ? p : 1}
    />
  );
};

/** Rótulo que entra com leve escala. */
export const Rotulo: React.FC<{
  x: number; y: number; texto: string; cor?: string; at: number; tamanho?: number; peso?: number; fundo?: string;
}> = ({ x, y, texto, cor = TINTA, at, tamanho = 40, peso = 700, fundo }) => {
  const frame = useCurrentFrame();
  const p = steppedRamp(frame, at, at + 7);
  if (p === 0) return null;
  return (
    <div style={{
      position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${0.88 + 0.12 * p})`,
      opacity: p, fontFamily: SANS, fontWeight: peso, fontSize: tamanho, color: cor,
      background: fundo, padding: fundo ? "6px 14px" : undefined, borderRadius: fundo ? 8 : undefined,
      whiteSpace: "nowrap",
    }}>{texto}</div>
  );
};
