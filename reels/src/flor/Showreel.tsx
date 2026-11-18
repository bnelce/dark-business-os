import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Quicksand";

// Showreel de apresentação — Flor de Gostosura.
//
// A trilha (scripts/gerar-trilha-flor.mjs) é sintetizada na MESMA grade desta
// composição: 100 BPM, batida a cada 18 quadros. Por isso todo elemento entra em
// múltiplo de B — a sincronia é por construção, não por ajuste no olho.
//
// Sobre o pedido de "estilo Apple": o que foi adotado é a disciplina (uma ideia por
// batida, espaço generoso, easing preciso), não a aparência. Branco frio com
// tipografia fina faria biscoito artesanal parecer produto industrial, que é o
// oposto do que a marca vende. Paleta e tipo vêm de identidade/design-guide.md.

// Fonte lida do selo impresso (identidade/referencias): geométrica, traço uniforme,
// O circular, espaçamento aberto. Quicksand é a mais próxima entre as disponíveis.
const { fontFamily: SELO } = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const CREME = "#F5EFDC";
const MARROM = "#5C4632";
const FLORES = {
  amarelo: "#E8B84D", verde: "#A8C8A0", azul: "#7FAEE8",
  marrom: "#A6835A", rosa: "#E8639E", laranja: "#F0862C",
};

const B = 18; // 1 batida a 100 BPM, 30fps
const b = (n: number) => n * B;
export const SHOWREEL_TOTAL = b(46) + 12; // 840 quadros = 28s

const mola = (f: number, at: number, fps: number, dur = 14) =>
  spring({ frame: f - at, fps, config: { damping: 200 }, durationInFrames: dur });

/** Texto de marca entrando na batida: sobe, assenta, sem piscar.
 *
 *  `estatico` existe por um motivo concreto: mola avaliada no quadro 0 vale 0, então
 *  qualquer texto animado a partir do quadro 0 deixa o PRIMEIRO QUADRO vazio — e o
 *  primeiro quadro é a miniatura na grade e o que vê quem está rolando o feed. O
 *  gancho tem que estar inteiro ali. Já custou um reel publicado com capa em branco.
 *
 *  ATENÇÃO ao escrever texto novo: cada Frase é posicionada em coordenada fixa, então
 *  uma linha que quebra sozinha invade a de baixo. A largura útil é 896px (1080 menos
 *  92 de padding em cada lado) — a 104px na Quicksand isso dá ~15 caracteres. Passou
 *  disso, quebre com "\n" explícito e abra espaço vertical. Já colidiu uma vez. */
const Frase: React.FC<{
  texto: string; at: number; y: number; tamanho?: number; peso?: number; cor?: string;
  espaco?: number; estatico?: boolean;
}> = ({ texto, at, y, tamanho = 92, peso = 600, cor = MARROM, espaco = -1, estatico = false }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = estatico ? 1 : mola(f, at, fps);
  if (p <= 0.001) return null;
  return (
    <div style={{
      position: "absolute", top: y, left: 0, width: "100%", padding: "0 92px",
      textAlign: "center", fontFamily: SELO, fontWeight: peso, fontSize: tamanho,
      lineHeight: 1.08, letterSpacing: espaco, color: cor, whiteSpace: "pre-line",
      opacity: p, transform: `translateY(${(1 - p) * 34}px)`,
    }}>{texto}</div>
  );
};

/** Florzinha da marca — gira de leve e respira, nunca fica parada. */
const Mascote: React.FC<{ cor: keyof typeof FLORES; at: number; y: number; tam: number }> = ({ cor, at, y, tam }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = mola(f, at, fps, 18);
  if (p <= 0.001) return null;
  const t = f - at;
  return (
    <div style={{
      position: "absolute", top: y, left: "50%", width: tam, height: tam,
      transform: `translateX(-50%) scale(${0.72 + 0.28 * p}) rotate(${(1 - p) * -16 + Math.sin(t / 26) * 2.2}deg)`,
      opacity: p,
    }}>
      <Img src={staticFile(`flor/mascote/flor-${cor}.png`)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
};

/** Foto com aproximação lenta e véu creme — a foto é o herói, o texto não briga com ela. */
const Foto: React.FC<{ arquivo: string; de: number; ate: number; veu?: number; zoom?: [number, number] }> = ({
  arquivo, de, ate, veu = 0.0, zoom = [1.04, 1.14],
}) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [de, ate], zoom, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${k})` }}>
        <Img src={staticFile(`flor/${arquivo}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      {veu > 0 && <AbsoluteFill style={{ background: `rgba(245,239,220,${veu})` }} />}
    </AbsoluteFill>
  );
};

const Selo: React.FC<{ at: number; y: number; tam: number }> = ({ at, y, tam }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = mola(f, at, fps, 20);
  if (p <= 0.001) return null;
  return (
    <div style={{
      position: "absolute", top: y, left: "50%", width: tam, height: tam,
      transform: `translateX(-50%) scale(${0.8 + 0.2 * p})`, opacity: p,
    }}>
      <Img src={staticFile("flor/logo-perfil.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
};

const Ingrediente: React.FC<{ nome: string; at: number; i: number }> = ({ nome, at, i }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = mola(f, at, fps, 12);
  if (p <= 0.001) return null;
  return (
    <div style={{
      position: "absolute", top: 940 + i * 118, left: 0, width: "100%", textAlign: "center",
      fontFamily: SELO, fontWeight: 500, fontSize: 66, color: MARROM,
      opacity: p * 0.92, transform: `translateY(${(1 - p) * 22}px)`,
    }}>{nome}</div>
  );
};

export const Showreel: React.FC = () => {
  const f = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: CREME }}>
      <Audio src={staticFile("trilha-flor.mp3")} volume={0.9} />

      {/* ── 0–3s · GANCHO: a foto real e o slogan que a marca já tem ───────── */}
      {f < b(5) + 10 && (
        <Sequence from={0} durationInFrames={b(5) + 10}>
          <Foto arquivo="produto-embalado.jpeg" de={0} ate={b(5)} zoom={[1.06, 1.16]} veu={0.12} />
          <AbsoluteFill style={{
            background: "linear-gradient(180deg, rgba(245,239,220,0.92) 0%, rgba(245,239,220,0.25) 38%, rgba(92,70,50,0.45) 100%)",
          }} />
          <Frase texto={"COMER E\nSER FELIZ"} at={0} y={240} tamanho={132} peso={600} espaco={-3} estatico />
          {/* o nome da marca já está impresso na etiqueta dentro da foto —
              repetir em texto por cima só concorre com o próprio produto */}
        </Sequence>
      )}

      {/* ── 3–12s · O QUE É: uma ideia por batida ──────────────────────────── */}
      <Sequence from={b(5)} durationInFrames={b(5)}>
        <Mascote cor="amarelo" at={2} y={620} tam={360} />
        <Frase texto="Biscoito caseiro" at={b(1)} y={1080} tamanho={104} peso={600} />
        <Frase texto="De verdade" at={b(2)} y={1230} tamanho={58} peso={500} cor="#8A7259" />
      </Sequence>

      <Sequence from={b(10)} durationInFrames={b(5)}>
        <Mascote cor="rosa" at={2} y={620} tam={360} />
        <Frase texto={"Em formato\nde flor"} at={b(1)} y={1010} tamanho={104} peso={600} />
        <Frase texto="Cortado um a um" at={b(2)} y={1320} tamanho={58} peso={500} cor="#8A7259" />
      </Sequence>

      <Sequence from={b(15)} durationInFrames={b(5)}>
        <Foto arquivo="produto-embalado.jpeg" de={0} ate={b(5)} zoom={[1.18, 1.3]} />
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(92,70,50,0.88) 0%, rgba(92,70,50,0.68) 24%, rgba(92,70,50,0) 56%)" }} />
        <Frase texto={"Feito em casa,\nnão em fábrica"} at={b(1)} y={1400} tamanho={88} peso={600} cor={CREME} />
      </Sequence>

      {/* ── 12–22s · DIFERENCIAIS: ritmo rápido, um item por batida ────────── */}
      <Sequence from={b(20)} durationInFrames={b(6)}>
        <Frase texto={"4 ingredientes."} at={2} y={560} tamanho={108} peso={600} />
        <Frase texto="Só isso" at={b(1)} y={720} tamanho={62} peso={500} cor="#8A7259" />
        {["Açúcar", "Amido de milho", "Margarina", "Farinha de trigo"].map((nome, i) => (
          <Ingrediente key={nome} nome={nome} at={b(2) + i * 9} i={i} />
        ))}
      </Sequence>

      <Sequence from={b(26)} durationInFrames={b(5)}>
        <Mascote cor="verde" at={2} y={560} tam={300} />
        <Frase texto={"Uma pessoa\nfaz tudo"} at={b(1)} y={980} tamanho={104} peso={600} />
        <Frase texto="Do corte ao laço" at={b(2)} y={1240} tamanho={58} peso={500} cor="#8A7259" />
      </Sequence>

      <Sequence from={b(31)} durationInFrames={b(6)}>
        <Foto arquivo="embalagem-template.jpeg" de={0} ate={b(6)} zoom={[1.02, 1.12]} veu={0.06} />
        {/* véu forte e alto: o texto branco caía sobre o rótulo impresso (claro, e com
            o telefone antigo visível) e ficava ilegível. A faixa escura garante contraste
            independentemente do que estiver na foto naquele ponto. */}
        <AbsoluteFill style={{
          background: "linear-gradient(0deg, rgba(92,70,50,0.93) 0%, rgba(92,70,50,0.80) 26%, rgba(92,70,50,0) 56%)",
        }} />
        <Frase texto={"Embalado à mão,\ncom laço"} at={b(1)} y={1430} tamanho={88} peso={600} cor={CREME} />
        <Frase texto="Chega como presente" at={b(3)} y={1700} tamanho={52} peso={500} cor="rgba(245,239,220,0.88)" />
      </Sequence>

      {/* ── 22–28s · FECHAMENTO ────────────────────────────────────────────── */}
      <Sequence from={b(37)} durationInFrames={b(9) + 12}>
        <Selo at={2} y={520} tam={440} />
        <Frase texto="@flordegostosura_" at={b(1)} y={1060} tamanho={82} peso={600} />
        <Frase texto="Encomendas pelo direct" at={b(2)} y={1200} tamanho={52} peso={500} cor="#8A7259" />
        <Frase texto="85 98877-5561" at={b(3)} y={1340} tamanho={64} peso={600} />
        <div style={{ position: "absolute", top: 1560, width: "100%", display: "flex", justifyContent: "center", gap: 26 }}>
          {(["amarelo", "rosa", "azul", "verde", "laranja", "marrom"] as const).map((c, i) => {
            const p = Math.max(0, Math.min(1, (f - b(37) - b(4) - i * 5) / 10));
            return (
              <Img key={c} src={staticFile(`flor/mascote/flor-${c}.png`)}
                style={{ width: 92, height: 92, objectFit: "contain", opacity: p, transform: `scale(${0.6 + 0.4 * p})` }} />
            );
          })}
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
