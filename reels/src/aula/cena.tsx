import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { paperJitter, steppedRamp, hashRange } from "../remocn/stop-motion";

export const SANS = "Poppins, system-ui, sans-serif";
export const PRETO = "#141118";
export const PAPEL = "#FBF7EC";
export const CORES = {
  roxo: "#667eea", roxoEsc: "#764ba2", rosa: "#f093fb",
  azul: "#4facfe", verde: "#43e97b", coral: "#fa709a", amarelo: "#FDE047",
};

export const ramp = (f: number, de: number, ate: number) =>
  interpolate(f, [de, ate], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Bloco com borda e sombra dura — a base do vocabulário visual. */
export const Bloco: React.FC<{
  children: React.ReactNode; cor: string; at: number; x: number; y: number;
  larg?: number; giro?: number; seed?: string;
}> = ({ children, cor, at, x, y, larg, giro = 0, seed = "b" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: { damping: 190 }, durationInFrames: 10 });
  if (p <= 0.001) return null;
  const jt = paperJitter(f, seed, { amp: 1.1, rotAmp: 0.22 });
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: larg,
      transform: `translate(-50%,-50%) rotate(${giro + jt.rot}deg) scale(${0.86 + 0.14 * p})`,
      opacity: p,
    }}>
      <div style={{
        background: cor, border: `6px solid ${PRETO}`, borderRadius: 14,
        boxShadow: `10px 11px 0 ${PRETO}`, padding: "18px 26px", textAlign: "center",
      }}>{children}</div>
    </div>
  );
};

/** Balão de fala/anotação, com rabicho opcional. */
export const Balao: React.FC<{
  texto: string; at: number; x: number; y: number; larg: number;
  cor?: string; corTexto?: string; tamanho?: number; giro?: number;
}> = ({ texto, at, x, y, larg, cor = "#FFFDF6", corTexto = PRETO, tamanho = 34, giro = 0 }) => {
  const f = useCurrentFrame();
  const p = steppedRamp(f, at, at + 8);
  if (p === 0) return null;
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: larg,
      transform: `translate(-50%,-50%) rotate(${giro}deg) scale(${0.9 + 0.1 * p})`, opacity: p,
    }}>
      <div style={{
        background: cor, border: `5px solid ${PRETO}`, borderRadius: 26,
        boxShadow: `7px 8px 0 ${PRETO}`, padding: "16px 22px",
        fontFamily: SANS, fontWeight: 600, fontSize: tamanho, color: corTexto,
        lineHeight: 1.22, whiteSpace: "pre-line", textAlign: "center",
      }}>{texto}</div>
    </div>
  );
};

/** Título de cena: display pesado com sombra deslocada. */
export const TituloCena: React.FC<{ texto: string; cor: string; at: number; y?: number; tamanho?: number }> =
({ texto, cor, at, y = 210, tamanho = 92 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Quebra por linha preservando o índice global — sem isso o "\n" é engolido
  // pelos spans inline-block e as palavras grudam. Mesmo cuidado do handwrite.
  const linhas: { c: string; i: number }[][] = [[]];
  Array.from(texto).forEach((c, i) => {
    if (c === "\n") linhas.push([]);
    else linhas[linhas.length - 1].push({ c, i });
  });
  return (
    <div style={{ position: "absolute", top: y, width: "100%", textAlign: "center", padding: "0 40px" }}>
      {linhas.map((linha, li) => (
        <div key={li} style={{ fontFamily: SANS, fontWeight: 900, fontSize: tamanho, letterSpacing: -3, lineHeight: 1.02 }}>
          {linha.map(({ c, i }) => {
            const p = spring({ frame: f - at - i * 1.4, fps, config: { damping: 200 }, durationInFrames: 9 });
            return (
              <span key={i} style={{
                display: "inline-block", whiteSpace: "pre", opacity: p,
                transform: `translateY(${(1 - p) * 40}px) rotate(${hashRange(`t${texto}${i}`, -2.4, 2.4)}deg)`,
                color: cor, textShadow: `5px 5px 0 ${PRETO}`,
              }}>{c}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Seta preta grossa que se desenha. */
export const SetaGrossa: React.FC<{
  x1: number; y1: number; x2: number; y2: number; at: number; dur?: number; cor?: string; larg?: number; curva?: number;
}> = ({ x1, y1, x2, y2, at, dur = 16, cor = PRETO, larg = 12, curva = 0.25 }) => {
  const f = useCurrentFrame();
  const p = steppedRamp(f, at, at + dur);
  if (p === 0) return null;
  const mx = (x1 + x2) / 2 - (y2 - y1) * curva, my = (y1 + y2) / 2 + (x2 - x1) * curva;
  const ex = (1 - p) * ((1 - p) * x1 + p * mx) + p * ((1 - p) * mx + p * x2);
  const ey = (1 - p) * ((1 - p) * y1 + p * my) + p * ((1 - p) * my + p * y2);
  const a = Math.atan2(ey - my, ex - mx), h = 34;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", pointerEvents: "none" }}>
      <path d={`M ${x1} ${y1} Q ${mx} ${my} ${ex} ${ey}`} fill="none" stroke={cor} strokeWidth={larg} strokeLinecap="round" />
      {p > 0.92 && (
        <polygon points={`${ex},${ey} ${ex - h * Math.cos(a - 0.44)},${ey - h * Math.sin(a - 0.44)} ${ex - h * Math.cos(a + 0.44)},${ey - h * Math.sin(a + 0.44)}`} fill={cor} />
      )}
    </svg>
  );
};

/**
 * Cena com entrada e SAÍDA POR APAGAMENTO: uma faixa varre a tela de baixo pra
 * cima levando o conteúdo, como quem apaga o quadro.
 *
 * IMPORTANTE: precisa ser um <Sequence> de verdade. Sem ele, o useCurrentFrame()
 * dos filhos devolve o frame GLOBAL, e como cada cena agenda seus elementos em
 * frames pequenos (at={60}, at={190}...), a partir da segunda cena tudo já estaria
 * no passado — todos os elementos apareceriam prontos no primeiro frame da cena.
 */
const CenaInterna: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const local = useCurrentFrame();     // local, porque estamos dentro do Sequence
  const APAGA = 22;
  const saida = ramp(local, dur - APAGA, dur);
  const entrada = ramp(local, 0, 8);
  return (
    <AbsoluteFill style={{ opacity: entrada }}>
      <AbsoluteFill style={{ clipPath: `inset(0 0 ${saida * 100}% 0)` }}>{children}</AbsoluteFill>
      {saida > 0 && saida < 1 && (
        <div style={{
          position: "absolute", left: 0, width: "100%", height: 26,
          bottom: `calc(${saida * 100}% - 13px)`,
          background: PRETO, opacity: 0.85, borderRadius: 4,
        }} />
      )}
    </AbsoluteFill>
  );
};

export const Cena: React.FC<{ from: number; dur: number; children: React.ReactNode }> =
({ from, dur, children }) => (
  <Sequence from={from} durationInFrames={dur}>
    <CenaInterna dur={dur}>{children}</CenaInterna>
  </Sequence>
);

export const Fundo: React.FC<{ total: number }> = ({ total }) => {
  const f = useCurrentFrame();
  const jit = paperJitter(f, "pg", { amp: 0.8, rotAmp: 0.05 });
  const drift = interpolate(f, [0, total], [0, -20]);
  return (
    <AbsoluteFill style={{
      background: PAPEL,
      transform: `translate(${jit.x}px, ${drift + jit.y}px)`,
      backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 79px, rgba(90,120,160,0.13) 79px 80px), repeating-linear-gradient(to right, transparent 0 79px, rgba(90,120,160,0.07) 79px 80px)",
    }} />
  );
};

export const Rodape: React.FC<{ capitulo: string; n: number; total: number }> = ({ capitulo, n, total }) => (
  <>
    <div style={{ position: "absolute", top: 108, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 26, color: "rgba(20,17,24,0.45)", letterSpacing: 4 }}>
      SOCIOLOGIA · {capitulo} · {n}/{total}
    </div>
    <div style={{ position: "absolute", bottom: 82, width: "100%", textAlign: "center", fontFamily: SANS, fontSize: 27, fontWeight: 600, color: "rgba(20,17,24,0.4)" }}>
      @revisaorapida1ano
    </div>
  </>
);
