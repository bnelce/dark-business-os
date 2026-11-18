import { AbsoluteFill, Audio, Easing, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import dados from "./voto-nulo.json";
import T from "./voto-nulo-tempos.json";
import { COR_FLAVIO, COR_LULA, FOTO_FLAVIO, FOTO_LULA } from "./Apuracao";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre } from "./base";
import { CIANO, FUNDO, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";

// "Pra onde vai o voto branco e nulo": 2º turno de 2026, Presidente, narrado. 4,15 milhões
// de brancos e nulos não vão pra ninguém: a porcentagem do resultado é calculada só sobre
// os válidos. Dois mitos: mais de 50% de nulos não anula a eleição (o art. 224 do Código
// Eleitoral fala de votos anulados pela Justiça), e o branco não vai pra quem está ganhando
// (desde a Lei 9.504/1997 ele não conta como válido em eleição nenhuma).
//
// Números: voto-nulo.json (scripts/gerar-voto-nulo.mjs, confere o total contra o oficial).
// Tempos: voto-nulo-tempos.json (scripts/tempos-narracao.mjs). Os instantes dentro das
// falas (`seg`) foram medidos no áudio da cedar com silencedetect: regravou, medir de novo.
//
// A eleição de 100 eleitores usa A e B em ciano (cheio e vazado), nunca as cores dos
// partidos: é o exemplo da regra, não um palpite sobre ninguém.

export const VOTO_NULO_TOTAL = T.total;
const F = T.fala;
const seg = (s: number) => Math.round(s * 30);
const ruido = (k: number) => {
  const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const CONTORNO = { stroke: FUNDO, strokeWidth: 10, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
const milhoes = (n: number, casas = 2) => `${br(n / 1e6, casas)} MI`;

// --- a eleição real: um ponto = 100 mil votos ------------------------------------------
const G = dados.grade;
const VALIDOS = G.lula + G.flavio;
const N = VALIDOS + G.branco + G.nulo;
const COLS = 33, LINHAS = 39, PASSO = 23, RAIO = 8.5;
const GX = 540 - ((COLS - 1) * PASSO) / 2, GY = 590;
const COR = [COR_LULA, COR_FLAVIO, TEXTO, TEXTO_2]; // lula, flávio, branco, nulo
const categoria = (i: number) => (i < G.lula ? 0 : i < VALIDOS ? 1 : i < VALIDOS + G.branco ? 2 : 3);
// Leitura em linhas (como na urna: todo mundo junto) e em colunas (só os válidos, cada
// candidato num bloco, pra metade virar uma linha vertical).
const emLinha = (p: number) => [GX + (p % COLS) * PASSO, GY + Math.floor(p / COLS) * PASSO];
const emColuna = (p: number) => [GX + Math.floor(p / LINHAS) * PASSO, GY + (p % LINHAS) * PASSO];
const X_METADE = GX + (VALIDOS / 2 / LINHAS) * PASSO - PASSO / 2;
const CENTRO_LULA = GX + (G.lula / 2 / LINHAS) * PASSO - PASSO / 2;
const CENTRO_FLAVIO = GX + ((G.lula + G.flavio / 2) / LINHAS) * PASSO - PASSO / 2;

const Ponto: React.FC<{ cor: string; x: number; y: number; r?: number; o?: number }> = ({ cor, x, y, r = RAIO, o = 1 }) => (r > 0 ? <circle cx={x} cy={y} r={r} fill={cor} opacity={o} /> : null);

// Cores das bolinhas, texto e, pros candidatos, a foto oficial (no lugar da bolinha, com o aro na cor).
type Item = [string[], string, string[]?];
const LinhaLegenda: React.FC<{ itens: Item[]; o?: number }> = ({ itens, o = 1 }) => (
  <div style={{ display: "flex", gap: 40, opacity: o, height: 56, alignItems: "center" }}>
    {itens.map(([cores, texto, fotos]) => (
      <span key={texto} style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "flex", gap: 6 }}>
          {cores.map((cor, k) => fotos?.[k]
            ? <Img key={cor} src={fotos[k]} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", boxSizing: "border-box", border: `3px solid ${cor}` }} />
            : <span key={cor} style={{ width: 20, height: 20, borderRadius: "50%", background: cor }} />)}
        </span>
        {texto}
      </span>
    ))}
  </div>
);

const CenaGrade: React.FC = () => {
  const f = useCurrentFrame();
  const conclusao = f >= F.conclusao;
  const visivel = conclusao
    ? Math.min(entre(f, F.conclusao, F.conclusao + 15), 1 - entre(f, F.cta, F.cta + 15))
    : 1 - entre(f, F["mito-1"], F["mito-1"] + 15);
  if (visivel <= 0) return null;

  const pulso = 0.45 + 0.25 * Math.sin(f / 6);
  const metade = !conclusao ? entre(f, F.validos + 55, F.validos + 70) : 0;
  const pct = entre(f, F.validos + seg(3.3), F.validos + seg(3.3) + 12);
  const pontos = Array.from({ length: N }, (_, i) => {
    const c = categoria(i);
    if (c < 2) {
      // Válidos: na fala dos válidos saem da leitura em linha pros dois blocos.
      const t = conclusao ? 0 : entre(f, F.validos + 10 + ruido(i) * 20, F.validos + 50 + ruido(i) * 20, Easing.inOut(Easing.cubic));
      const [ax, ay] = emLinha(i), [bx, by] = emColuna(i);
      return { c, x: ax + (bx - ax) * t, y: ay + (by - ay) * t, o: 1, r: RAIO };
    }
    // Brancos e nulos: somem da grade em "pra lugar nenhum" (descem um pouco e encolhem,
    // sem atravessar a legenda) e voltam na conclusão.
    const t = conclusao
      ? 1 - entre(f, F.conclusao + 10 + ruido(i) * 10, F.conclusao + 45 + ruido(i) * 10, Easing.out(Easing.cubic))
      : entre(f, F.resposta + 5 + ruido(i) * 10, F.resposta + 40 + ruido(i) * 10, Easing.in(Easing.quad));
    const [x, y] = emLinha(i);
    return { c, x, y: y + 60 * t, o: 1 - t, r: RAIO * (1 - t) };
  });

  let l1: Item[], l2: Item[], o2 = 1;
  if (conclusao) {
    l1 = [[[COR_LULA, COR_FLAVIO], "VÁLIDOS: DECIDEM", [FOTO_LULA, FOTO_FLAVIO]]];
    l2 = [[[TEXTO, TEXTO_2], "BRANCOS E NULOS: CONTADOS"]];
  } else if (f < F.validos) {
    l1 = [[[COR_LULA], "LULA", [FOTO_LULA]], [[COR_FLAVIO], "FLÁVIO", [FOTO_FLAVIO]]];
    l2 = [[[TEXTO], `BRANCO ${milhoes(dados.branco)}`], [[TEXTO_2], `NULO ${milhoes(dados.nulo)}`]];
    o2 = 1 - entre(f, F.resposta + 5, F.resposta + 30);
  } else {
    l1 = pct > 0
      ? [[[COR_LULA], `LULA ${br(dados.dosValidos.lula)}%`, [FOTO_LULA]], [[COR_FLAVIO], `FLÁVIO ${br(dados.dosValidos.flavio)}%`, [FOTO_FLAVIO]]]
      : [[[COR_LULA], "LULA", [FOTO_LULA]], [[COR_FLAVIO], "FLÁVIO", [FOTO_FLAVIO]]];
    l2 = [[[], "DOS VOTOS VÁLIDOS"]];
    o2 = pct;
  }

  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="1 PONTO = 100 MIL VOTOS" direita={f >= F.validos && !conclusao ? "VÁLIDOS" : "2º TURNO"} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={5} /></filter>
        </defs>
        {pontos.map((p, i) => p.c >= 2 && p.o > 0 && (
          <circle key={`h${i}`} cx={p.x} cy={p.y} r={p.r * 1.8} fill={COR[p.c]} opacity={pulso * p.o} filter="url(#brilho)" />
        ))}
        {pontos.map((p, i) => p.o > 0 && <Ponto key={i} cor={COR[p.c]} x={p.x} y={p.y} r={p.r} o={p.o} />)}
        {metade > 0 && (
          <g opacity={metade}>
            <line x1={X_METADE} x2={X_METADE} y1={GY - 24} y2={GY + (LINHAS - 1) * PASSO + 24} stroke={TEXTO} strokeWidth={3} strokeDasharray="12 10" />
            <text x={X_METADE} y={GY - 40} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={3} {...CONTORNO}>METADE</text>
          </g>
        )}
      </svg>
      {/* Na divisão dos válidos, a foto de cada candidato em cima do próprio bloco. */}
      {!conclusao && pct > 0 && [[FOTO_LULA, COR_LULA, CENTRO_LULA], [FOTO_FLAVIO, COR_FLAVIO, CENTRO_FLAVIO]].map(([foto, cor, cx]) => (
        <Img key={foto as string} src={foto as string} style={{
          position: "absolute", left: (cx as number) - 32, top: GY - 96, width: 64, height: 64, opacity: pct,
          borderRadius: "50%", objectFit: "cover", boxSizing: "border-box", border: `4px solid ${cor}`,
        }} />
      ))}
      <div style={{ position: "absolute", top: 1490, left: X0, width: X1 - X0, fontFamily: MONO, fontSize: 28, letterSpacing: 2, color: TEXTO }}>
        <LinhaLegenda itens={l1} />
        <LinhaLegenda itens={l2} o={o2} />
      </div>
    </AbsoluteFill>
  );
};

// --- uma eleição de 100 eleitores -------------------------------------------------------
const MINI_PASSO = 66, MINI_R = 24, MX = 540 - 4.5 * MINI_PASSO, MY = 640;
const NULOS = 60, A = 22, B = 18;

const CenaCem: React.FC = () => {
  const f = useCurrentFrame();
  const M = F["mito-1"], S = F.simulacao;
  const visivel = Math.min(entre(f, M + 5, M + 20), 1 - entre(f, F.origem, F.origem + 15));
  if (visivel <= 0) return null;
  // Na pergunta os nulos sobem até passar da metade; no exemplo vão a 60.
  const nulos = f < S ? 51 * entre(f, M + 40, M + 100) : 51 + (NULOS - 51) * entre(f, S + seg(2.79), S + seg(2.79) + 15);
  const resultado = entre(f, S + seg(7.36), S + seg(7.36) + 15);
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="100 ELEITORES" direita={resultado > 0 ? `VÁLIDOS: ${A + B}` : `NULOS: ${Math.floor(nulos)}%`} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 100 }, (_, i) => {
          const x = MX + (i % 10) * MINI_PASSO, y = MY + Math.floor(i / 10) * MINI_PASSO;
          const surge = entre(f, M + 5 + i * 0.25, M + 15 + i * 0.25);
          if (i < Math.floor(nulos)) return <circle key={i} cx={x} cy={y} r={MINI_R} fill={TEXTO_2} opacity={1 - 0.85 * resultado} />;
          const a = i >= NULOS && i < NULOS + A ? entre(f, S + seg(4.12) + (i - NULOS), S + seg(4.12) + (i - NULOS) + 6) : 0;
          const b = i >= NULOS + A ? entre(f, S + seg(5.76) + (i - NULOS - A), S + seg(5.76) + (i - NULOS - A) + 6) : 0;
          if (a > 0) return <circle key={i} cx={x} cy={y} r={MINI_R} fill={CIANO} opacity={a} />;
          if (b > 0) return <circle key={i} cx={x} cy={y} r={MINI_R - 3} fill="none" stroke={CIANO} strokeWidth={6} opacity={b} />;
          return <circle key={i} cx={x} cy={y} r={MINI_R - 1} fill="none" stroke={TEXTO_2} strokeWidth={2} opacity={0.6 * surge} />;
        })}
        {resultado > 0 && (
          <g opacity={resultado} fontFamily={MONO} fontSize={32} letterSpacing={2}>
            <circle cx={X0 + 16} cy={1340} r={16} fill={CIANO} />
            <text x={X0 + 50} y={1351} fill={TEXTO}>A: {A} DE {A + B} VÁLIDOS = <tspan fill={CIANO}>{Math.round((100 * A) / (A + B))}%</tspan></text>
            <circle cx={X0 + 16} cy={1405} r={13} fill="none" stroke={CIANO} strokeWidth={5} />
            <text x={X0 + 50} y={1416} fill={TEXTO}>B: {B} DE {A + B} VÁLIDOS = {Math.round((100 * B) / (A + B))}%</text>
            <circle cx={X0 + 16} cy={1470} r={16} fill={TEXTO_2} opacity={0.4} />
            <text x={X0 + 50} y={1481} fill={TEXTO_2}>NULOS: FORA DA CONTA</text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// --- de onde vem o boato ----------------------------------------------------------------
const Cartao: React.FC<{ o: number; rotulo: string; titulo: string; nota: string; cor: string }> = ({ o, rotulo, titulo, nota, cor }) => (
  <div style={{
    opacity: o, translate: `0 ${(1 - o) * 20}px`, borderLeft: `5px solid ${cor}`, background: "rgba(232,244,255,0.04)",
    padding: "30px 36px", display: "flex", flexDirection: "column", gap: 14,
  }}>
    <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: TEXTO_2 }}>{rotulo}</div>
    <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 52, lineHeight: 1.15, color: TEXTO, whiteSpace: "pre-line" }}>{titulo}</div>
    <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 2, color: cor }}>{nota}</div>
  </div>
);

const CenaOrigem: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = Math.min(entre(f, F.origem + 5, F.origem + 20), 1 - entre(f, F["mito-2"], F["mito-2"] + 15));
  if (visivel <= 0) return null;
  const lei = entre(f, F.origem + seg(1.39), F.origem + seg(1.39) + 12);
  const urna = entre(f, F.origem + seg(6.7), F.origem + seg(6.7) + 12);
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="DE ONDE VEM O BOATO" />
      <div style={{ position: "absolute", top: 600, left: X0 - 30, width: X1 - X0 + 60, display: "flex", flexDirection: "column", gap: 30 }}>
        <Cartao o={lei} rotulo="CÓDIGO ELEITORAL, ART. 224" titulo={"Votos anulados\npela Justiça"} nota="POR FRAUDE OU CASSAÇÃO" cor={TEXTO} />
        <div style={{ opacity: urna, textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 80, lineHeight: 1, color: CIANO }}>≠</div>
        <Cartao o={urna} rotulo="NA URNA" titulo={"O nulo que\nvocê digita"} nota="NÃO ANULA NADA" cor={CIANO} />
      </div>
    </AbsoluteFill>
  );
};

// --- o branco não vai pra quem está ganhando ------------------------------------------
const BLOCO_PASSO = 52, BLOCO_R = 19, BLOCO_Y = 700;
const BLOCOS = [
  { n: A, x: 196, cheio: true, nome: "A", pct: Math.round((100 * A) / (A + B)) },
  { n: B, x: 676, cheio: false, nome: "B", pct: Math.round((100 * B) / (A + B)) },
];
const BRANCO_DE = [540, 1180], BRANCO_ATE = [300, 1000];

const CenaBranco: React.FC = () => {
  const f = useCurrentFrame();
  const M = F["mito-2"];
  const visivel = Math.min(entre(f, M + 5, M + 20), 1 - entre(f, F.conclusao, F.conclusao + 15));
  if (visivel <= 0) return null;
  // Anda 70% do caminho até o bloco de quem lidera e para: não chega.
  const anda = 0.7 * entre(f, M + seg(1.07), M + seg(2.88), Easing.inOut(Easing.cubic));
  const corta = entre(f, M + seg(3.44), M + seg(3.44) + 10, Easing.out(Easing.cubic));
  const x = BRANCO_DE[0] + (BRANCO_ATE[0] - BRANCO_DE[0]) * anda, y = BRANCO_DE[1] + (BRANCO_ATE[1] - BRANCO_DE[1]) * anda;
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="VOTOS VÁLIDOS" direita="A LIDERA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {BLOCOS.map((b) => (
          <g key={b.nome}>
            {Array.from({ length: b.n }, (_, i) => {
              const cx = b.x + (i % 5) * BLOCO_PASSO, cy = BLOCO_Y + Math.floor(i / 5) * BLOCO_PASSO;
              return b.cheio
                ? <circle key={i} cx={cx} cy={cy} r={BLOCO_R} fill={CIANO} />
                : <circle key={i} cx={cx} cy={cy} r={BLOCO_R - 3} fill="none" stroke={CIANO} strokeWidth={5} />;
            })}
            <text x={b.x + 2 * BLOCO_PASSO} y={BLOCO_Y + 5 * BLOCO_PASSO + 30} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={32} letterSpacing={2}>
              {b.nome} · {b.pct}%
            </text>
          </g>
        ))}
        <line x1={BRANCO_DE[0]} y1={BRANCO_DE[1]} x2={x} y2={y} stroke={TEXTO} strokeOpacity={0.5} strokeWidth={3} strokeDasharray="8 10" />
        <circle cx={x} cy={y} r={26} fill={TEXTO} opacity={1 - 0.7 * corta} />
        {corta > 0 && (
          <g stroke={TEXTO} strokeWidth={6} strokeLinecap="round" opacity={corta}>
            <line x1={x - 38 * corta} y1={y - 38 * corta} x2={x + 38 * corta} y2={y + 38 * corta} />
            <line x1={x - 38 * corta} y1={y + 38 * corta} x2={x + 38 * corta} y2={y - 38 * corta} />
          </g>
        )}
        <text x={540} y={1300} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={3} opacity={1 - corta}>BRANCO</text>
        <text x={540} y={1300} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={2} opacity={corta}>
          DESDE 1997, NÃO É VOTO VÁLIDO
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é audio/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(T.fala).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/voto-nulo/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const VotoNulo: React.FC = () => (
  <Fundo>
    <CenaGrade />
    <CenaCem />
    <CenaOrigem />
    <CenaBranco />
    <Manchete de={-10} ate={F.resposta - 4}>
      {br((dados.branco + dados.nulo) / 1e6)} milhões votaram{"\n"}<Destaque>branco ou nulo.</Destaque>
    </Manchete>
    <Manchete de={F.resposta} ate={F.validos - 4}><Destaque>Pra lugar nenhum.</Destaque></Manchete>
    <Manchete de={F.validos} ate={F["mito-1"] - 4}>
      Só os válidos entram{"\n"}na conta: <Destaque>{br(dados.dosValidos.lula)}% a {br(dados.dosValidos.flavio)}%.</Destaque>
    </Manchete>
    <Manchete de={F["mito-1"]} ate={F.simulacao - 4}>Mais de 50% de nulos{"\n"}<Destaque>anula a eleição?</Destaque></Manchete>
    <Manchete de={F.simulacao} ate={F.origem - 4}>100 eleitores, 60 nulos:{"\n"}<Destaque>A vence com 55%.</Destaque></Manchete>
    <Manchete de={F.origem} ate={F["mito-2"] - 4}>A lei fala de votos{"\n"}<Destaque>anulados pela Justiça.</Destaque></Manchete>
    <Manchete de={F["mito-2"]} ate={F.conclusao - 4}>E o branco não vai{"\n"}<Destaque>pra quem está ganhando.</Destaque></Manchete>
    <Manchete de={F.conclusao} ate={F.cta - 4}>Branco e nulo são contados.{"\n"}<Destaque>Quem decide{"\n"}são os válidos.</Destaque></Manchete>
    <Manchete de={F.cta} ate={T.marca} centro>Segue pra ver a ciência{"\n"}<Destaque>escondida nos dados.</Destaque></Manchete>
    <Fonte texto="FONTE: TSE · BOLETINS DE URNA · 2º TURNO 2026" ate={F.cta} />
    <Marca de={T.marca} />
    <Narracao />
    {/* scripts/gerar-trilha-narrada.mjs: por baixo da voz, como no reel da apuração */}
    <Audio src={staticFile("ciencia/trilha-voto-nulo.mp3")} volume={0.22} />
  </Fundo>
);
