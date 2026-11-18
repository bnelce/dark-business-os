import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { Handwrite } from "../remocn/handwrite";
import { PaperWobble } from "../remocn/paper-wobble";
import { InkArrow } from "../remocn/ink-arrow";
import { PaperSticker } from "../remocn/paper-sticker";
import { paperJitter, steppedRamp } from "../remocn/stop-motion";

// Mapa mental que se desenha sozinho: nó central, ramos saindo um a um,
// cada um com seta desenhando + cartão colando + legenda manuscrita.
// O ritmo vem da construção progressiva, não de cortes.

const TINTA = "#1F1A17";
const PAPEL = "#FBF7EC";
const SANS = "Poppins, system-ui, sans-serif";

export type Ramo = {
  titulo: string;
  legenda: string;
  x: number;
  y: number;
  cor: string;
  at: number;
};

export type MapaMentalProps = {
  foto: string;
  materia: string;
  tema: string;
  ramos: Ramo[];
  totalFrames: number;
};

const CENTRO = { x: 540, y: 520 };

const NoCentral: React.FC<{ foto: string; tema: string; at: number }> = ({ foto, tema, at }) => {
  const frame = useCurrentFrame();
  const p = steppedRamp(frame, at, at + 9);
  if (p === 0) return null;
  return (
    <div style={{ position: "absolute", left: CENTRO.x - 190, top: CENTRO.y - 210, opacity: p }}>
      <PaperWobble seed="centro" amp={1.4} rotAmp={0.3}>
        <div style={{ width: 380, textAlign: "center" }}>
          <div
            style={{
              width: 236, height: 236, margin: "0 auto", borderRadius: "50%", overflow: "hidden",
              border: `7px solid ${TINTA}`, boxShadow: "0 14px 34px rgba(0,0,0,0.25)", background: "#fff",
            }}
          >
            <Img src={staticFile(foto)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }} />
          </div>
          <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 800, fontSize: 52, color: TINTA, letterSpacing: -1 }}>
            {tema}
          </div>
        </div>
      </PaperWobble>
    </div>
  );
};

const NoRamo: React.FC<{ ramo: Ramo }> = ({ ramo }) => (
  <>
    {/* seta do centro até o nó */}
    <Sequence from={ramo.at}>
      <AbsoluteFill>
        <InkArrow
          from={{ x: CENTRO.x, y: CENTRO.y + 120 }}
          to={{ x: ramo.x, y: ramo.y - 46 }}
          curvature={ramo.x < CENTRO.x ? -0.42 : 0.42}
          color={ramo.cor}
          strokeWidth={8}
          drawDur={20}
          headSize={24}
          seed={`ramo-${ramo.titulo}`}
        />
      </AbsoluteFill>
    </Sequence>

    {/* cartão do ramo */}
    <Sequence from={ramo.at + 18}>
      <div style={{ position: "absolute", left: ramo.x - 230, top: ramo.y - 34, width: 460, display: "flex", justifyContent: "center" }}>
        <PaperSticker at={0} seed={ramo.titulo} padding="13px 20px" background={ramo.cor} borderColor="rgba(0,0,0,0.3)">
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: TINTA, whiteSpace: "nowrap" }}>
            {ramo.titulo}
          </span>
        </PaperSticker>
      </div>
    </Sequence>

    {/* legenda manuscrita sob o cartão */}
    <Sequence from={ramo.at + 30}>
      <div style={{ position: "absolute", left: ramo.x - 240, top: ramo.y + 30, width: 480, height: 200 }}>
        <Handwrite text={ramo.legenda} delay={0} fontSize={48} color={TINTA} align="center" perStep={2.6} />
      </div>
    </Sequence>
  </>
);

export const MapaMental: React.FC<MapaMentalProps> = ({ foto, materia, tema, ramos, totalFrames }) => {
  const frame = useCurrentFrame();
  const jit = paperJitter(frame, "pagina", { amp: 1.0, rotAmp: 0.08 });
  const drift = interpolate(frame, [0, totalFrames], [0, -40]);

  return (
    <AbsoluteFill style={{ background: PAPEL, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${jit.x}px, ${drift + jit.y}px)`,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 79px, rgba(90,120,160,0.20) 79px 80px), repeating-linear-gradient(to right, transparent 0 79px, rgba(90,120,160,0.10) 79px 80px)",
        }}
      />

      <div style={{ position: "absolute", top: 132, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: "rgba(31,26,23,0.55)", letterSpacing: 3 }}>
          {materia.toUpperCase()}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 62, color: TINTA, marginTop: 6, letterSpacing: -1.5 }}>
          MAPA MENTAL
        </div>
      </div>

      <NoCentral foto={foto} tema={tema} at={6} />
      {ramos.map((r) => <NoRamo key={r.titulo} ramo={r} />)}

      <Sequence from={totalFrames - 70}>
        <div style={{ position: "absolute", bottom: 190, width: "100%", display: "flex", justifyContent: "center" }}>
          <PaperSticker at={0} seed="cta" padding="18px 34px" background="#FFFDF6">
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: TINTA }}>salva esse mapa 📌</span>
          </PaperSticker>
        </div>
      </Sequence>

      <div style={{ position: "absolute", bottom: 96, width: "100%", textAlign: "center", fontFamily: SANS, fontSize: 30, fontWeight: 600, color: "rgba(31,26,23,0.45)" }}>
        @revisaorapida1ano
      </div>
    </AbsoluteFill>
  );
};
