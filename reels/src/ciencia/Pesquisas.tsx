import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import dados from "./pesquisas.json";
import T from "./pesquisas-tempos.json";
import { COR_FLAVIO, COR_LULA } from "./Apuracao";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre } from "./base";
import { CIANO, FUNDO, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";

// "As pesquisas erraram?": na véspera do 2º turno de 2026, Datafolha e Quaest davam Flávio
// 51% × Lula 49% dos válidos, e deu Lula 51,8%. Mil pesquisas simuladas com 4.050 eleitores
// sorteados dos votos reais caem perto do resultado (só 1 em mil chega a 49%): o erro da
// véspera não é acaso, é viés. Em 2022 o erro foi pro outro lado (Bolsonaro 36% → 43,2%).
//
// Números: pesquisas.json (scripts/gerar-pesquisas.mjs, sorteios dos votos dos boletins e
// pesquisas com fonte no script). Tempos: pesquisas-tempos.json (scripts/tempos-narracao.mjs).
// Os instantes dentro das falas (`seg`) foram medidos com silencedetect: regravou, medir de novo.
//
// Neutralidade: os sorteios em ciano, sem cor de partido. As cores dos partidos só aparecem
// na comparação 2026 × 2022, uma linha pra cada lado, as duas com o mesmo traço.

export const PESQUISAS_TOTAL = T.total;
const F = T.fala;
const seg = (s: number) => Math.round(s * 30);
const CONTORNO = { stroke: FUNDO, strokeWidth: 10, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };

// --- eixo: % de Lula nos válidos ---------------------------------------------------------
const XMIN = 46, XMAX = 56;
const xP = (v: number) => X0 + ((v - XMIN) / (XMAX - XMIN)) * (X1 - X0);
const EIXO_Y = 1250, TOPO_Y = 580;
const REAL = dados.final.lula, VESPERA = dados.vespera.lula, MARGEM = dados.vespera.margem;

// Cada sorteio é um ponto empilhado na sua faixa de 0,1 ponto: a pilha vira o histograma.
const BIN = 0.1, PASSO_PILHA = 8;
const PILHA = (() => {
  const cont = new Map<number, number>();
  return (dados.sorteios as number[]).map((v) => {
    const b = Math.round(v / BIN);
    const k = cont.get(b) ?? 0;
    cont.set(b, k + 1);
    return { v, x: xP(b * BIN), y: EIXO_Y - 12 - k * PASSO_PILHA };
  });
})();
const RARO = PILHA.findIndex((p) => p.v <= VESPERA); // o único sorteio que chega ao 51 a 49
const INICIO_SORTEIO = F.sorteio + seg(5.4); // "e repetimos mil vezes"
const FIM_SORTEIO = F.nuvem + 50;

const Eixo: React.FC = () => (
  <g>
    <line x1={X0} x2={X1} y1={EIXO_Y} y2={EIXO_Y} stroke={TEXTO_2} strokeOpacity={0.6} />
    {[46, 48, 50, 52, 54, 56].map((v) => (
      <g key={v}>
        <line x1={xP(v)} x2={xP(v)} y1={EIXO_Y} y2={EIXO_Y + 12} stroke={TEXTO_2} />
        <text x={xP(v)} y={EIXO_Y + 46} textAnchor="middle" fill={v === 50 ? TEXTO : TEXTO_2} fontFamily={MONO} fontSize={26}>{v}%</text>
      </g>
    ))}
    <line x1={xP(50)} x2={xP(50)} y1={TOPO_Y + 60} y2={EIXO_Y} stroke={TEXTO_2} strokeOpacity={0.35} strokeDasharray="4 10" />
    <text x={X0} y={EIXO_Y + 100} fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2}>← FLÁVIO NA FRENTE</text>
    <text x={X1} y={EIXO_Y + 100} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2}>LULA NA FRENTE →</text>
  </g>
);

const Linha: React.FC<{ v: number; rotulo: string; o: number; tracejada?: boolean; cor?: string; rotuloO?: number }> = ({ v, rotulo, o, tracejada, cor = TEXTO, rotuloO = 1 }) => (
  <g opacity={o}>
    <line x1={xP(v)} x2={xP(v)} y1={TOPO_Y + 30} y2={EIXO_Y} stroke={cor} strokeWidth={tracejada ? 3 : 4} strokeDasharray={tracejada ? "12 10" : undefined} />
    <text x={xP(v)} y={TOPO_Y + 10} textAnchor="middle" fill={cor} fillOpacity={rotuloO} fontFamily={MONO} fontSize={28} letterSpacing={2} {...CONTORNO} strokeOpacity={rotuloO}>{rotulo}</text>
  </g>
);

const Chip: React.FC<{ y: number; o: number; children: React.ReactNode }> = ({ y, o, children }) => (
  <g opacity={o}>
    <rect x={X0} y={y - 34} width={X1 - X0} height={50} rx={6} fill={FUNDO} stroke={CIANO} strokeOpacity={0.6} strokeWidth={2} />
    <text x={X0 + 24} y={y} fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2}>{children}</text>
  </g>
);

const CenaEixo: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = 1 - entre(f, F["em-2022"], F["em-2022"] + 15);
  if (visivel <= 0) return null;
  const real = entre(f, F.resultado, F.resultado + 20, Easing.out(Easing.cubic));
  const distancia = Math.min(entre(f, F.resultado + 30, F.resultado + 45), 1 - entre(f, F.margem, F.margem + 10));
  // A margem da pesquisa (49 ± 2) entra na fala da margem e vira só contorno quando os sorteios
  // começam; aí entra a faixa de ± 2 em volta do resultado real.
  const margem = Math.min(entre(f, F.margem + 20, F.margem + 35), 1 - 0.75 * entre(f, F.sorteio, F.sorteio + 20));
  const faixaReal = Math.min(entre(f, F.nuvem + 30, F.nuvem + 45), 1 - 0.6 * entre(f, F.vies, F.vies + 15));
  const raro = entre(f, F.nenhum + 10, F.nenhum + 22);
  const vies = f >= F.vies;
  const chips = [seg(3.6), seg(5.6), seg(7.9)].map((t) => entre(f, F.vies + t, F.vies + t + 10));
  const sorteados = PILHA.filter((_, i) => f >= INICIO_SORTEIO + (i / PILHA.length) * (FIM_SORTEIO - INICIO_SORTEIO)).length;
  const fora = dados.resumo.foraDe2;

  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="% DE LULA NOS VÁLIDOS" direita={f < INICIO_SORTEIO ? "VÉSPERA × URNA" : `SORTEIOS: ${sorteados.toLocaleString("pt-BR")}`} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={6} /></filter>
        </defs>
        {margem > 0 && (
          <g opacity={margem}>
            <rect x={xP(VESPERA - MARGEM)} y={TOPO_Y + 30} width={xP(VESPERA + MARGEM) - xP(VESPERA - MARGEM)} height={EIXO_Y - TOPO_Y - 30} fill={TEXTO_2} opacity={0.14} />
            <text x={xP(VESPERA)} y={TOPO_Y + 80} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={2} {...CONTORNO}>
              MARGEM ±{MARGEM}
            </text>
          </g>
        )}
        {faixaReal > 0 && (
          <g opacity={faixaReal}>
            <rect x={xP(REAL - 2)} y={TOPO_Y + 120} width={xP(REAL + 2) - xP(REAL - 2)} height={EIXO_Y - TOPO_Y - 120} fill={CIANO} opacity={0.1} />
            {/* Embaixo do eixo: em cima, o rótulo encostaria no topo da pilha de pontos. */}
            <text x={540} y={EIXO_Y + 160} textAnchor="middle" fill={CIANO} fontFamily={MONO} fontSize={26} letterSpacing={2}>
              FAIXA DE ±2 DO RESULTADO · FORA: {fora} EM 1.000
            </text>
          </g>
        )}
        <Eixo />
        {PILHA.map((p, i) => {
          const de = INICIO_SORTEIO + (i / PILHA.length) * (FIM_SORTEIO - INICIO_SORTEIO);
          const t = entre(f, de, de + 10, Easing.in(Easing.quad));
          if (t <= 0) return null;
          const destaque = i === RARO && raro > 0;
          return <circle key={i} cx={p.x} cy={p.y - (1 - t) * 140} r={3.6} fill={destaque ? TEXTO : CIANO} opacity={(0.85 * t) * (raro > 0 && !destaque ? 1 - 0.5 * raro : 1)} />;
        })}
        {raro > 0 && RARO >= 0 && (
          <g opacity={raro}>
            <circle cx={PILHA[RARO].x} cy={PILHA[RARO].y} r={16} fill="none" stroke={TEXTO} strokeWidth={3} />
            <circle cx={PILHA[RARO].x} cy={PILHA[RARO].y} r={24} fill={TEXTO} opacity={0.25} filter="url(#brilho)" />
            <text x={PILHA[RARO].x - 26} y={PILHA[RARO].y - 30} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2} {...CONTORNO}>
              {dados.resumo.ate49} EM 1.000
            </text>
          </g>
        )}
        <Linha v={VESPERA} rotulo={`VÉSPERA ${VESPERA}%`} o={1} tracejada cor={TEXTO_2} rotuloO={vies ? 1 - entre(f, F.vies, F.vies + 10) : 1} />
        <Linha v={REAL} rotulo={`URNA ${br(REAL)}%`} o={real} rotuloO={vies ? 1 - entre(f, F.vies, F.vies + 10) : 1} />
        {distancia > 0 && (
          <g opacity={distancia}>
            <line x1={xP(VESPERA) + 8} x2={xP(REAL) - 8} y1={TOPO_Y + 200} y2={TOPO_Y + 200} stroke={TEXTO} strokeWidth={3} />
            <text x={(xP(VESPERA) + xP(REAL)) / 2} y={TOPO_Y + 185} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28} {...CONTORNO}>
              {br(REAL - VESPERA)} PONTOS
            </text>
          </g>
        )}
        {vies && (
          <>
            <Chip y={TOPO_Y + 10} o={chips[0]}>QUEM NÃO ATENDE</Chip>
            <Chip y={TOPO_Y + 80} o={chips[1]}>QUEM MUDA NO ÚLTIMO DIA</Chip>
            <Chip y={TOPO_Y + 150} o={chips[2]}>QUEM NÃO VAI VOTAR</Chip>
          </>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// --- 2026 × 2022: a pesquisa errou pros dois lados ---------------------------------------
const AX0 = 30, AX1 = 56;
const xA = (v: number) => X0 + ((v - AX0) / (AX1 - AX0)) * (X1 - X0);
const LINHAS_2022 = [
  { y: 760, titulo: "2026 · 2º TURNO · LULA", pesquisa: VESPERA, urna: REAL, cor: COR_LULA, de: 0, urnaDe: 0 },
  { y: 1060, titulo: `2022 · 1º TURNO · ${dados.em2022.candidato.toUpperCase()}`, pesquisa: dados.em2022.pesquisa, urna: dados.em2022.resultado, cor: COR_FLAVIO, de: seg(4.2), urnaDe: seg(8.1) },
];

const Cena2022: React.FC = () => {
  const f = useCurrentFrame();
  const M = F["em-2022"];
  const visivel = Math.min(entre(f, M + 5, M + 20), 1 - entre(f, F.conclusao, F.conclusao + 15));
  if (visivel <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="VÉSPERA × URNA" direita="% DOS VÁLIDOS" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {LINHAS_2022.map((l) => {
          const o = entre(f, M + 10 + l.de, M + 22 + l.de);
          const u = entre(f, M + 10 + l.urnaDe, M + 30 + l.urnaDe, Easing.out(Easing.cubic));
          if (o <= 0) return null;
          const xu = xA(l.pesquisa) + (xA(l.urna) - xA(l.pesquisa)) * u;
          return (
            <g key={l.titulo} opacity={o}>
              <text x={X0} y={l.y - 80} fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={3}>{l.titulo}</text>
              <line x1={xA(l.pesquisa)} x2={xu} y1={l.y} y2={l.y} stroke={l.cor} strokeWidth={6} strokeOpacity={0.7} />
              <circle cx={xA(l.pesquisa)} cy={l.y} r={18} fill={FUNDO} stroke={l.cor} strokeWidth={5} />
              {/* Rótulos pra fora do intervalo: em 2026 os dois pontos ficam a 87px e os textos se cruzariam. */}
              <text x={xA(l.pesquisa) + 10} y={l.y + 62} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24}>PESQUISA {l.pesquisa}%</text>
              {u > 0 && (
                <g opacity={u}>
                  <circle cx={xu} cy={l.y} r={18} fill={l.cor} />
                  <text x={xu - 10} y={l.y + 62} textAnchor="start" fill={TEXTO} fontFamily={MONO} fontSize={24}>URNA {br(l.urna)}%</text>
                  <text x={(xA(l.pesquisa) + xu) / 2} y={l.y - 30} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={30} {...CONTORNO}>
                    +{br(l.urna - l.pesquisa)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        <line x1={X0} x2={X1} y1={EIXO_Y} y2={EIXO_Y} stroke={TEXTO_2} strokeOpacity={0.6} />
        {[30, 35, 40, 45, 50, 55].map((v) => (
          <text key={v} x={xA(v)} y={EIXO_Y + 46} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={26}>{v}%</text>
        ))}
        <text x={(X0 + X1) / 2} y={EIXO_Y + 100} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={3}>
          NOS DOIS CASOS, A URNA DEU MAIS QUE A PESQUISA
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// --- a pesquisa ouve 4 mil; a urna conta todo mundo -------------------------------------
const CenaConclusao: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = Math.min(entre(f, F.conclusao + 5, F.conclusao + 20), 1 - entre(f, F.cta, F.cta + 15));
  if (visivel <= 0) return null;
  const conta = entre(f, F.conclusao + seg(2.6), F.conclusao + seg(2.6) + 45, Easing.out(Easing.cubic));
  const bloco = (rotulo: string, valor: string, y: number, o: number) => (
    <div style={{ position: "absolute", top: y, left: X0, width: X1 - X0, opacity: o, textAlign: "center" }}>
      <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 110, color: TEXTO, letterSpacing: -2 }}>{valor}</div>
      <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2, marginTop: 8 }}>{rotulo}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      {bloco("PESSOAS OUVIDAS NA PESQUISA", dados.n.toLocaleString("pt-BR"), 640, entre(f, F.conclusao + 10, F.conclusao + 25))}
      {bloco("VOTOS VÁLIDOS CONTADOS NA URNA", Math.round(dados.validos * conta).toLocaleString("pt-BR"), 980, entre(f, F.conclusao + seg(2.6), F.conclusao + seg(2.6) + 10))}
    </AbsoluteFill>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é audio/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(T.fala).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/pesquisas/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Pesquisas: React.FC = () => (
  <Fundo>
    <CenaEixo />
    <Cena2022 />
    <CenaConclusao />
    <Manchete de={-10} ate={F.resultado - 4}>Na véspera, as pesquisas{"\n"}davam <Destaque>Flávio 51 a 49.</Destaque></Manchete>
    <Manchete de={F.resultado} ate={F.margem - 4}>Deu Lula,{"\n"}<Destaque>{br(REAL)} a {br(100 - REAL)}.</Destaque></Manchete>
    <Manchete de={F.margem} ate={F.sorteio - 4}>Margem de erro do Datafolha:{"\n"}<Destaque>2 pontos pra cada lado.</Destaque></Manchete>
    <Manchete de={F.sorteio} ate={F.nuvem - 4}>Sorteamos {dados.n.toLocaleString("pt-BR")} eleitores{"\n"}<Destaque>das urnas. Mil vezes.</Destaque></Manchete>
    <Manchete de={F.nuvem} ate={F.nenhum - 4}>O acaso fica perto{"\n"}<Destaque>do resultado real.</Destaque></Manchete>
    <Manchete de={F.nenhum} ate={F.vies - 4}>51 a 49 pro Flávio:{"\n"}<Destaque>só {dados.resumo.ate49} em mil sorteios.</Destaque></Manchete>
    <Manchete de={F.vies} ate={F["em-2022"] - 4}>A margem mede o acaso.{"\n"}<Destaque>Não mede o viés.</Destaque></Manchete>
    <Manchete de={F["em-2022"]} ate={F.conclusao - 4}>Em 2022, o erro foi{"\n"}<Destaque>pro outro lado.</Destaque></Manchete>
    <Manchete de={F.conclusao} ate={F.cta - 4}>A pesquisa ouve 4 mil.{"\n"}<Destaque>A urna conta 124 milhões.</Destaque></Manchete>
    <Manchete de={F.cta} ate={T.marca} centro>Segue pra ver a ciência{"\n"}<Destaque>escondida nos dados.</Destaque></Manchete>
    <Fonte texto="FONTE: TSE · BOLETINS DE URNA 2026 · DATAFOLHA E QUAEST" ate={F.cta} />
    <Marca de={T.marca} />
    <Narracao />
    {/* scripts/gerar-trilha-narrada.mjs: por baixo da voz, como no reel da apuração */}
    <Audio src={staticFile("ciencia/trilha-pesquisas.mp3")} volume={0.22} />
  </Fundo>
);
