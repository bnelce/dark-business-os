import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cena, Fundo, Rodape, Bloco, Balao, TituloCena, SetaGrossa, SANS, PRETO, PAPEL, CORES, ramp } from "./cena";

const D = [480, 480, 480, 540, 420];                 // duração de cada cena
const F = D.reduce<number[]>((a, d, i) => [...a, (a[i - 1] ?? 0) + (i ? D[i - 1] : 0)], []);
export const MARX_TOTAL = D.reduce((a, b) => a + b, 0);

const Txt: React.FC<{ children: React.ReactNode; t?: number; peso?: number; cor?: string }> =
  ({ children, t = 44, peso = 800, cor = PRETO }) => (
    <span style={{ fontFamily: SANS, fontWeight: peso, fontSize: t, color: cor, lineHeight: 1.1 }}>{children}</span>
  );

// ─────────── 1. A INVERSÃO ───────────
const C1: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Rodape capitulo="KARL MARX" n={1} total={5} />
      <TituloCena texto={"MATERIALISMO\nHISTÓRICO"} cor={CORES.roxo} at={4} />
      <Balao texto="antes de Marx, pensavam assim:" at={56} x={540} y={470} larg={640} tamanho={32} />
      <Bloco cor={CORES.rosa} at={74} x={300} y={640} seed="c1a"><Txt>A IDEIA</Txt></Bloco>
      <SetaGrossa x1={430} y1={640} x2={700} y2={640} at={88} curva={0.1} />
      <Bloco cor="#FFFDF6" at={100} x={820} y={640} seed="c1b"><Txt>o mundo</Txt></Bloco>
      {f > 160 && (
        <div style={{ position: "absolute", top: 760, width: "100%", textAlign: "center", opacity: ramp(f, 160, 176) }}>
          <Txt t={62} cor={CORES.coral}>Marx inverteu.</Txt>
        </div>
      )}
      <Bloco cor={CORES.azul} at={196} x={300} y={950} seed="c1c"><Txt>A MATÉRIA</Txt></Bloco>
      <SetaGrossa x1={430} y1={950} x2={700} y2={950} at={210} curva={-0.1} />
      <Bloco cor="#FFFDF6" at={222} x={820} y={950} seed="c1d"><Txt>a ideia</Txt></Bloco>
      <Balao at={264} x={540} y={1180} larg={840} tamanho={38} cor={CORES.amarelo}
        texto={"as condições materiais da sua vida\nvêm antes do que você pensa sobre ela"} />
      <Balao at={340} x={540} y={1400} larg={780} tamanho={34} giro={-1.5}
        texto={"quem produz, como produz e pra quem\nexplica a sociedade inteira"} />
    </>
  );
};

// ─────────── 2. AS DUAS CAMADAS ───────────
const C2: React.FC = () => (
  <>
    <Rodape capitulo="KARL MARX" n={2} total={5} />
    <TituloCena texto="AS DUAS CAMADAS" cor={CORES.verde} at={4} tamanho={82} />
    <Bloco cor={CORES.roxoEsc} at={60} x={540} y={560} larg={760} seed="c2a">
      <Txt t={46} cor="#FAFAF7">SUPERESTRUTURA</Txt>
      <div style={{ marginTop: 8 }}><Txt t={30} peso={600} cor="rgba(255,255,255,0.85)">leis · política · escola · cultura</Txt></div>
    </Bloco>
    <SetaGrossa x1={540} y1={900} x2={540} y2={700} at={150} curva={0.32} larg={14} />
    <Bloco cor={CORES.azul} at={92} x={540} y={980} larg={860} seed="c2b">
      <Txt t={46}>INFRAESTRUTURA</Txt>
      <div style={{ marginTop: 8 }}><Txt t={30} peso={600}>quem é dono do quê · como se produz</Txt></div>
    </Bloco>
    <Balao at={182} x={540} y={1230} larg={860} tamanho={38} cor={CORES.amarelo}
      texto={"a base material sustenta —\ne molda — tudo que está em cima"} />
    <Balao at={280} x={540} y={1440} larg={880} tamanho={34} giro={1.2}
      texto={"por isso a ideologia de quem manda\nvira o \"senso comum\" de todo mundo"} />
  </>
);

// ─────────── 3. AS DUAS CLASSES ───────────
const C3: React.FC = () => (
  <>
    <Rodape capitulo="KARL MARX" n={3} total={5} />
    <TituloCena texto={"LUTA DE\nCLASSES"} cor={CORES.coral} at={4} />
    <Bloco cor={CORES.roxo} at={62} x={300} y={640} larg={400} giro={-2} seed="c3a">
      <Txt t={40} cor="#FAFAF7">BURGUESIA</Txt>
      <div style={{ marginTop: 8 }}><Txt t={28} peso={600} cor="rgba(255,255,255,0.9)">é dona das fábricas,{"\n"}da terra, do capital</Txt></div>
    </Bloco>
    <Bloco cor={CORES.verde} at={96} x={790} y={640} larg={400} giro={2} seed="c3b">
      <Txt t={40}>PROLETARIADO</Txt>
      <div style={{ marginTop: 8 }}><Txt t={28} peso={600}>só tem a própria{"\n"}força de trabalho</Txt></div>
    </Bloco>
    <SetaGrossa x1={330} y1={870} x2={730} y2={870} at={150} curva={0.16} cor={CORES.coral} larg={14} />
    <SetaGrossa x1={750} y1={960} x2={350} y2={960} at={166} curva={0.16} cor={CORES.coral} larg={14} />
    <Balao at={200} x={540} y={1170} larg={800} tamanho={40} cor={CORES.amarelo}
      texto={"um quer lucro máximo\no outro quer viver com dignidade"} />
    <Balao at={280} x={540} y={1360} larg={860} tamanho={36} giro={-1}
      texto={"esse conflito não é um acidente:\né como o sistema funciona"} />
  </>
);

// ─────────── 4. MAIS-VALIA ───────────
const C4: React.FC = () => {
  const f = useCurrentFrame();
  const barra = ramp(f, 70, 110);
  const corte = ramp(f, 190, 230);
  const LX = 130, LW = 820, LY = 700, LH = 120;
  return (
    <>
      <Rodape capitulo="KARL MARX" n={4} total={5} />
      <TituloCena texto="MAIS-VALIA" cor={CORES.azul} at={4} />
      <Balao at={48} x={540} y={580} larg={760} tamanho={34} texto="valor que o trabalhador produz num dia:" />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <rect x={LX} y={LY} width={LW * barra} height={LH} fill={CORES.verde} stroke={PRETO} strokeWidth={6} rx={10} />
        {corte > 0 && (
          <>
            <rect x={LX + LW * 0.42} y={LY} width={LW * 0.58 * corte} height={LH} fill={CORES.coral} stroke={PRETO} strokeWidth={6} rx={10} />
            <line x1={LX + LW * 0.42} y1={LY - 26} x2={LX + LW * 0.42} y2={LY + LH + 26} stroke={PRETO} strokeWidth={8} strokeDasharray="14 12" />
          </>
        )}
      </svg>
      {barra > 0.9 && f < 190 && (
        <div style={{ position: "absolute", top: LY + 34, width: "100%", textAlign: "center", opacity: ramp(f, 112, 128) }}>
          <Txt t={44}>o que ele PRODUZ</Txt>
        </div>
      )}
      {corte > 0.85 && (
        <>
          <Balao at={236} x={300} y={930} larg={330} tamanho={30} cor={CORES.verde} texto={"o salário\nque ele recebe"} giro={-2} />
          <Balao at={252} x={790} y={930} larg={380} tamanho={30} cor={CORES.coral} texto={"a diferença fica\ncom o patrão"} giro={2} />
        </>
      )}
      <Balao at={310} x={540} y={1180} larg={860} tamanho={42} cor={CORES.amarelo}
        texto={"essa diferença é a mais-valia —\né dali que sai o lucro"} />
      <Balao at={400} x={540} y={1400} larg={880} tamanho={34} giro={1}
        texto={"o lucro não nasce da esperteza do dono:\nnasce de trabalho que não foi pago"} />
    </>
  );
};

// ─────────── 5. ALIENAÇÃO ───────────
const C5: React.FC = () => {
  const f = useCurrentFrame();
  const afasta = ramp(f, 130, 190);
  return (
    <>
      <Rodape capitulo="KARL MARX" n={5} total={5} />
      <TituloCena texto="ALIENAÇÃO" cor={CORES.rosa} at={4} />
      <Bloco cor={CORES.verde} at={56} x={540 - 250 * afasta} y={700} larg={330} seed="c5a"><Txt t={38}>quem faz</Txt></Bloco>
      <Bloco cor={CORES.roxo} at={70} x={540 + 250 * afasta} y={700} larg={330} seed="c5b"><Txt t={38} cor="#FAFAF7">o que é feito</Txt></Bloco>
      {afasta > 0.4 && (
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <line x1={430} y1={700} x2={650} y2={700} stroke={PRETO} strokeWidth={9} strokeDasharray="16 18" opacity={afasta} />
        </svg>
      )}
      <Balao at={200} x={540} y={900} larg={840} tamanho={38} cor={CORES.amarelo}
        texto={"o trabalhador não reconhece\nnada de si no que produziu"} />
      <Balao at={266} x={540} y={1120} larg={860} tamanho={34}
        texto={"o trabalho deixa de ser realização\ne vira só o preço de sobreviver"} giro={-1.2} />
      {f > 330 && (
        <div style={{ position: "absolute", top: 1330, width: "100%", textAlign: "center", opacity: ramp(f, 330, 350) }}>
          <Bloco cor="#FFFDF6" at={330} x={540} y={80} larg={800} seed="c5c">
            <Txt t={34} peso={700}>salva — isso cai em prova{"\n"}como "os 4 tipos de alienação"</Txt>
          </Bloco>
        </div>
      )}
    </>
  );
};

export const MarxAula: React.FC = () => (
  <AbsoluteFill style={{ background: PAPEL, overflow: "hidden" }}>
    <Fundo total={MARX_TOTAL} />
    <Cena from={F[0]} dur={D[0]}><C1 /></Cena>
    <Cena from={F[1]} dur={D[1]}><C2 /></Cena>
    <Cena from={F[2]} dur={D[2]}><C3 /></Cena>
    <Cena from={F[3]} dur={D[3]}><C4 /></Cena>
    <Cena from={F[4]} dur={D[4]}><C5 /></Cena>
  </AbsoluteFill>
);
