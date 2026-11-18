import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { Handwrite } from "../remocn/handwrite";
import { PaperWobble } from "../remocn/paper-wobble";
import { MarkerHighlight } from "../remocn/marker-highlight";
import { PaperSticker } from "../remocn/paper-sticker";
import { paperJitter, steppedRamp } from "../remocn/stop-motion";

// Mapa mental COMPARATIVO: um eixo, várias figuras respondendo à mesma pergunta.
// A espinha vertical ligando os retratos é o que faz o olho ler como comparação
// em vez de três blocos soltos.

const TINTA = "#1F1A17";
const PAPEL = "#FBF7EC";
const SANS = "Poppins, system-ui, sans-serif";

export type Figura = {
  nome: string;
  datas: string;
  foto: string;
  conceito: string;
  frase: string;
  eixo: string;
  cor: string;
  y: number;
  at: number;
};

export type MapaComparativoProps = {
  materia: string;
  pergunta: string;
  figuras: Figura[];
  totalFrames: number;
};

const ESPINHA_X = 176;

const Linha: React.FC<{ f: Figura }> = ({ f }) => {
  const frame = useCurrentFrame();
  const entrada = steppedRamp(frame, f.at, f.at + 9);

  return (
    <>
      {/* retrato no eixo */}
      {entrada > 0 && (
        <div style={{ position: "absolute", left: ESPINHA_X - 96, top: f.y - 96, opacity: entrada }}>
          <PaperWobble seed={`f-${f.nome}`} amp={1.3} rotAmp={0.28}>
            <div
              style={{
                width: 192, height: 192, borderRadius: "50%", overflow: "hidden",
                border: `6px solid ${TINTA}`, background: "#fff",
                boxShadow: `0 12px 30px rgba(0,0,0,0.22)`,
              }}
            >
              <Img src={staticFile(f.foto)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }} />
            </div>
          </PaperWobble>
        </div>
      )}

      {/* nome + datas */}
      <Sequence from={f.at + 8}>
        <div style={{ position: "absolute", left: 306, top: f.y - 104, width: 700 }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: TINTA, letterSpacing: -1 }}>{f.nome}</div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 27, color: "rgba(31,26,23,0.5)", marginTop: 2 }}>{f.datas}</div>
        </div>
      </Sequence>

      {/* conceito-chave em adesivo colorido */}
      <Sequence from={f.at + 20}>
        <div style={{ position: "absolute", left: 306, top: f.y - 22 }}>
          <PaperSticker at={0} seed={f.conceito} padding="11px 20px" background={f.cor} borderColor="rgba(0,0,0,0.3)">
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 33, color: TINTA, whiteSpace: "nowrap" }}>{f.conceito}</span>
          </PaperSticker>
        </div>
      </Sequence>

      {/* frase manuscrita */}
      <Sequence from={f.at + 32}>
        <div style={{ position: "absolute", left: 296, top: f.y + 34, width: 720, height: 150 }}>
          <Handwrite text={f.frase} delay={0} fontSize={44} color={TINTA} align="left" perStep={3.0} />
        </div>
      </Sequence>
    </>
  );
};

export const MapaComparativo: React.FC<MapaComparativoProps> = ({ materia, pergunta, figuras, totalFrames }) => {
  const frame = useCurrentFrame();
  const jit = paperJitter(frame, "pagina", { amp: 0.9, rotAmp: 0.07 });
  const drift = interpolate(frame, [0, totalFrames], [0, -34]);

  const primeiro = figuras[0], ultimo = figuras[figuras.length - 1];
  // a espinha cresce até alcançar a última figura já revelada
  const espinha = interpolate(frame, [primeiro.at, ultimo.at + 10], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const fechamento = ultimo.at + 105;

  return (
    <AbsoluteFill style={{ background: PAPEL, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${jit.x}px, ${drift + jit.y}px)`,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 79px, rgba(90,120,160,0.18) 79px 80px), repeating-linear-gradient(to right, transparent 0 79px, rgba(90,120,160,0.09) 79px 80px)",
        }}
      />

      <div style={{ position: "absolute", top: 108, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: "rgba(31,26,23,0.5)", letterSpacing: 4 }}>
          {materia.toUpperCase()}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 58, color: TINTA, marginTop: 4, letterSpacing: -1.5 }}>
          OS 3 PILARES
        </div>
      </div>

      {/* a pergunta que os três respondem diferente */}
      <Sequence from={10}>
        <div style={{ position: "absolute", top: 236, left: 0, width: "100%", height: 120 }}>
          <Handwrite text={pergunta} delay={0} fontSize={54} color="rgba(31,26,23,0.78)" align="center" perStep={3.2} />
        </div>
      </Sequence>

      {/* espinha vertical ligando os retratos */}
      <div
        style={{
          position: "absolute", left: ESPINHA_X - 3, top: primeiro.y,
          width: 6, height: (ultimo.y - primeiro.y) * espinha,
          background: "rgba(31,26,23,0.30)", borderRadius: 3,
        }}
      />

      {figuras.map((f) => <Linha key={f.nome} f={f} />)}

      {/* fechamento: o eixo que separa os três */}
      <Sequence from={fechamento}>
        <div style={{ position: "absolute", top: 1432, left: 0, width: "100%", height: 130 }}>
          <MarkerHighlight
            before="cada um parte de um "
            highlight="lugar diferente"
            after=""
            markerColor="#FDE047" baseColor={TINTA} highlightedTextColor={TINTA}
            fontSize={50} fontWeight={700}
          />
        </div>
      </Sequence>
      <Sequence from={fechamento + 22}>
        <div style={{ position: "absolute", top: 1548, width: "100%", display: "flex", justifyContent: "center", gap: 18 }}>
          {figuras.map((f, i) => (
            <PaperSticker key={f.eixo} at={i * 7} seed={`eixo-${f.eixo}`} padding="10px 18px" background={f.cor} borderColor="rgba(0,0,0,0.28)">
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 31, color: TINTA, whiteSpace: "nowrap" }}>{f.eixo}</span>
            </PaperSticker>
          ))}
        </div>
      </Sequence>

      <Sequence from={totalFrames - 62}>
        <div style={{ position: "absolute", bottom: 172, width: "100%", display: "flex", justifyContent: "center" }}>
          <PaperSticker at={0} seed="cta" padding="16px 30px" background="#FFFDF6">
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: TINTA }}>salva esse mapa 📌</span>
          </PaperSticker>
        </div>
      </Sequence>

      <div style={{ position: "absolute", bottom: 88, width: "100%", textAlign: "center", fontFamily: SANS, fontSize: 29, fontWeight: 600, color: "rgba(31,26,23,0.45)" }}>
        @revisaorapida1ano
      </div>
    </AbsoluteFill>
  );
};
