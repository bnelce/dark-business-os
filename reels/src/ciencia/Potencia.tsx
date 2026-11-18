import { AbsoluteFill, Audio, Easing, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import dados from "./potencia.json";
import T from "./potencia-tempos.json";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre } from "./base";
import { CIANO, FUNDO, MONO, TEXTO, TEXTO_2, br } from "./tokens";

// "A reta escondida": lei de potência com os dados da eleição de 2026. O 1% mais votado dos
// candidatos a deputado federal levou 23,8% dos votos. As 5.571 cidades ordenadas por
// eleitorado formam um "L"; em escala log nos dois eixos, viram uma reta (R² 0,996 nas mil
// maiores). Os primeiros nomes dos 18.842 candidatos fazem o mesmo.
//
// Números: potencia.json (scripts/eleicoes/potencia.py, a partir dos CSV do TSE). Retratos:
// public/ciencia/potencia/retratos/ (foto oficial do TSE só recortada no rosto; origem.md
// lista quem é quem). Tempos: potencia-tempos.json (scripts/tempos-narracao.mjs). Os
// instantes dentro das falas (`seg`) foram medidos com silencedetect: regravou, medir de novo.
//
// Neutralidade: os 72 retratos são os 72 mais votados, na ordem dos votos, sem escolha, e todos
// com o mesmo aro ciano (nada de cor de partido).

export const POTENCIA_TOTAL = T.total;
const F = T.fala;
const seg = (s: number) => Math.round(s * 30);
const CONTORNO = { stroke: FUNDO, strokeWidth: 10, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
const D = dados.deputados;
const GY0 = 560, GY1 = 1250, W = X1 - X0, H = GY1 - GY0;
const milhar = (n: number) => n.toLocaleString("pt-BR");

// --- gancho: os 72 do 1% --------------------------------------------------------------------
const COLS = 9, LADO = 84, PASSO = 90;

const CenaRetratos: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = 1 - entre(f, F.cidades, F.cidades + 15);
  if (visivel <= 0) return null;
  const barra = entre(f, F.gancho + seg(5.5), F.gancho + seg(5.5) + 25, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="DEPUTADO FEDERAL" direita={`${D.topo} MAIS VOTADOS`} />
      {Array.from({ length: D.topo }, (_, i) => (
        <Img key={i} src={staticFile(`ciencia/potencia/retratos/${String(i + 1).padStart(2, "0")}.jpg`)} style={{
          position: "absolute", left: X0 + (i % COLS) * PASSO, top: GY0 + Math.floor(i / COLS) * PASSO, width: LADO, height: LADO,
          borderRadius: "50%", objectFit: "cover", boxSizing: "border-box", border: `2px solid ${CIANO}`,
        }} />
      ))}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <rect x={X0} y={1310} width={W} height={44} fill={TEXTO_2} opacity={0.35 * barra} />
        <rect x={X0} y={1310} width={W * (D.topoPct / 100) * barra} height={44} fill={CIANO} />
        <text x={X0} y={1400} fill={CIANO} fillOpacity={barra} fontFamily={MONO} fontSize={26} letterSpacing={2}>
          {D.topo} CANDIDATOS: {br(D.topoPct)}% DOS VOTOS
        </text>
        <text x={X0} y={1440} fill={TEXTO_2} fillOpacity={barra} fontFamily={MONO} fontSize={26} letterSpacing={2}>
          OS OUTROS {milhar(D.candidatos - D.topo)}: {br(100 - D.topoPct)}%
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// --- as cidades: do "L" à reta -------------------------------------------------------------
const CID = dados.cidades as number[];
const N = CID.length, VMAX = CID[0];
const L0 = 3, L1 = 7; // eixo log de 1 mil a 10 milhões de eleitores
// Os primeiros 200 pontos inteiros (é onde a curva muda rápido) e depois um a cada 8.
const AMOSTRA = CID.map((v, i) => [i, v] as const).filter(([i]) => i < 200 || i % 8 === 0 || i === N - 1);
const xLin = (i: number) => X0 + (i / (N - 1)) * W;
const yLin = (v: number) => GY1 - (v / VMAX) * H;
const xLog = (i: number) => X0 + (Math.log10(i + 1) / Math.log10(N)) * W;
const yLog = (v: number) => GY1 - ((Math.log10(v) - L0) / (L1 - L0)) * H;
const RC = dados.retaCidades;

const CenaCidades: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = Math.min(entre(f, F.cidades + 5, F.cidades + 20), 1 - entre(f, F.nomes, F.nomes + 15));
  if (visivel <= 0) return null;
  const desenha = entre(f, F.cidades + 15, F.cidades + 110, Easing.inOut(Easing.quad));
  const tx = entre(f, F.log + seg(3.6), F.log + seg(5.4), Easing.inOut(Easing.cubic));
  const ty = entre(f, F.log + seg(5.75), F.log + seg(7.2), Easing.inOut(Easing.cubic));
  const px = (i: number) => xLin(i) + (xLog(i) - xLin(i)) * tx;
  const py = (v: number) => yLin(v) + (yLog(v) - yLin(v)) * ty;
  const ate = Math.floor(AMOSTRA.length * desenha);
  let d = "";
  for (let k = 0; k < ate; k++) d += `${k ? "L" : "M"}${px(AMOSTRA[k][0]).toFixed(1)},${py(AMOSTRA[k][1]).toFixed(1)}`;
  const sp = entre(f, F.cauda + seg(0.3), F.cauda + seg(0.3) + 10);
  const cincoMil = entre(f, F.cauda + seg(3.0), F.cauda + seg(3.0) + 10);
  const cauda = Math.min(entre(f, F.cauda + seg(6.4), F.cauda + seg(6.4) + 12), 1 - entre(f, F.log, F.log + 10));
  const reta = entre(f, F.nome + 10, F.nome + 40, Easing.out(Easing.cubic));
  const rotulos = (1 - tx) * (1 - ty) > 0.5 ? 1 - entre(f, F.log + seg(3.6), F.log + seg(4.2)) : 0;
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="ELEITORES POR CIDADE" direita={ty > 0.5 ? "ESCALA LOG × LOG" : "DA MAIOR PRA MENOR"} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilho" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={6} /></filter>
        </defs>
        <line x1={X0} x2={X1} y1={GY1} y2={GY1} stroke={TEXTO_2} strokeOpacity={0.6} />
        <line x1={X0} x2={X0} y1={GY0} y2={GY1} stroke={TEXTO_2} strokeOpacity={0.6} />
        {/* Marcas do eixo: as lineares somem enquanto as de log entram, junto com a curva. */}
        <g opacity={1 - tx} fontFamily={MONO} fontSize={24} fill={TEXTO_2}>
          {[1, 1000, 2000, 3000, 4000, 5000].map((r) => <text key={r} x={xLin(r - 1)} y={GY1 + 44} textAnchor="middle">{milhar(r)}º</text>)}
        </g>
        <g opacity={tx} fontFamily={MONO} fontSize={24} fill={TEXTO_2}>
          {[1, 10, 100, 1000].map((r) => <text key={r} x={xLog(r - 1)} y={GY1 + 44} textAnchor="middle">{milhar(r)}º</text>)}
        </g>
        <g opacity={1 - ty} fontFamily={MONO} fontSize={24} fill={TEXTO_2} textAnchor="end">
          {[3e6, 6e6, 9e6].map((v) => <text key={v} x={X0 - 14} y={yLin(v) + 8}>{v / 1e6} MI</text>)}
        </g>
        <g opacity={ty} fontFamily={MONO} fontSize={24} fill={TEXTO_2} textAnchor="end">
          {[[1e3, "1 MIL"], [1e4, "10 MIL"], [1e5, "100 MIL"], [1e6, "1 MI"]].map(([v, t]) => <text key={t} x={X0 - 14} y={yLog(v as number) + 8}>{t}</text>)}
        </g>
        <text x={(X0 + X1) / 2} y={GY1 + 96} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={3}>POSIÇÃO NO RANKING</text>
        {d && (
          <>
            <path d={d} fill="none" stroke={CIANO} strokeWidth={10} strokeOpacity={0.35} filter="url(#brilho)" />
            <path d={d} fill="none" stroke={CIANO} strokeWidth={3.5} strokeLinejoin="round" />
          </>
        )}
        {reta > 0 && (
          <g opacity={reta}>
            <line x1={xLog(0)} y1={yLog(10 ** RC.intercepto)} x2={xLog(N - 1)} y2={yLog(10 ** (RC.intercepto + RC.inclinacao * Math.log10(N)))}
              stroke={TEXTO} strokeWidth={2.5} strokeDasharray="14 10" />
            <text x={X1} y={GY0 + 40} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2} {...CONTORNO}>LEI DE POTÊNCIA</text>
            <text x={X1} y={GY0 + 80} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2} {...CONTORNO}>
              R² {br(RC.r2, 3)} NAS MIL MAIORES
            </text>
          </g>
        )}
        {sp > 0 && rotulos > 0 && (
          <g opacity={Math.min(sp, rotulos)}>
            <circle cx={px(0)} cy={py(VMAX)} r={9} fill={TEXTO} />
            <text x={px(0) + 22} y={py(VMAX) + 10} fill={TEXTO} fontFamily={MONO} fontSize={28} {...CONTORNO}>SÃO PAULO · {br(VMAX / 1e6)} MI</text>
          </g>
        )}
        {cincoMil > 0 && rotulos > 0 && (
          <g opacity={Math.min(cincoMil, rotulos)}>
            <circle cx={px(4999)} cy={py(CID[4999])} r={9} fill={TEXTO} />
            <text x={px(4999)} y={py(CID[4999]) - 30} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={28} {...CONTORNO}>
              5.000ª · {milhar(CID[4999])}
            </text>
          </g>
        )}
        {cauda > 0 && (
          <g opacity={cauda}>
            <rect x={xLin(300)} y={GY1 - 90} width={xLin(N - 1) - xLin(300)} height={90} fill={CIANO} opacity={0.1} />
            <text x={(xLin(300) + xLin(N - 1)) / 2} y={GY1 - 110} textAnchor="middle" fill={CIANO} fontFamily={MONO} fontSize={26} letterSpacing={2} {...CONTORNO}>
              {milhar(N - 300)} CIDADES COLADAS NO CHÃO
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// --- os nomes dos candidatos ---------------------------------------------------------------
const NOMES = dados.nomes as [string, number][];
const NN = NOMES.length;
const xN = (i: number) => X0 + (Math.log10(i + 1) / Math.log10(NN)) * W;
const yN = (c: number) => GY1 - (Math.log10(c) / 3) * H; // de 1 a 1.000 candidatos com o nome
const RN = dados.retaNomes;
const MARCAS_NOMES = [[0, 5.9], [1, 6.8], [2, 7.5]] as const;

const CenaNomes: React.FC = () => {
  const f = useCurrentFrame();
  const M = F.nomes;
  const visivel = Math.min(entre(f, M + 5, M + 20), 1 - entre(f, F.conclusao, F.conclusao + 15));
  if (visivel <= 0) return null;
  const reta = entre(f, M + seg(8.8), M + seg(8.8) + 25, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda={`NOMES DE ${milhar(dados.candidatos)} CANDIDATOS`} direita="LOG × LOG" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0} x2={X1} y1={GY1} y2={GY1} stroke={TEXTO_2} strokeOpacity={0.6} />
        <line x1={X0} x2={X0} y1={GY0} y2={GY1} stroke={TEXTO_2} strokeOpacity={0.6} />
        <g fontFamily={MONO} fontSize={24} fill={TEXTO_2}>
          {[1, 10, 100, 500].map((r) => <text key={r} x={xN(r - 1)} y={GY1 + 44} textAnchor="middle">{r}º</text>)}
          {[1, 10, 100, 1000].map((c) => <text key={c} x={X0 - 14} y={yN(c) + 8} textAnchor="end">{milhar(c)}</text>)}
        </g>
        <text x={(X0 + X1) / 2} y={GY1 + 96} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={3}>NOME MAIS COMUM → MAIS RARO</text>
        {NOMES.map(([, c], i) => {
          const o = entre(f, M + seg(1.0) + (Math.log10(i + 1) / Math.log10(NN)) * seg(4), M + seg(1.0) + (Math.log10(i + 1) / Math.log10(NN)) * seg(4) + 6);
          return o > 0 && <circle key={i} cx={xN(i)} cy={yN(c)} r={4} fill={CIANO} opacity={0.75 * o} />;
        })}
        {MARCAS_NOMES.map(([i, s], k) => {
          const o = entre(f, M + seg(s), M + seg(s) + 8);
          if (o <= 0) return null;
          const [nome, c] = NOMES[i];
          return (
            <g key={nome} opacity={o}>
              <circle cx={xN(i)} cy={yN(c)} r={9} fill={TEXTO} />
              <text x={xN(i) + 22} y={yN(c) - 18 + k * 44} fill={TEXTO} fontFamily={MONO} fontSize={28} {...CONTORNO}>{nome} · {c}</text>
            </g>
          );
        })}
        {reta > 0 && (
          <g opacity={reta}>
            <line x1={xN(0)} y1={yN(10 ** RN.intercepto)} x2={xN(NN - 1)} y2={yN(10 ** (RN.intercepto + RN.inclinacao * Math.log10(NN)))}
              stroke={TEXTO} strokeWidth={2.5} strokeDasharray="14 10" />
            <text x={X1} y={GY0 + 40} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2} {...CONTORNO}>A MESMA RETA</text>
            <text x={X1} y={GY0 + 80} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2} {...CONTORNO}>R² {br(RN.r2, 2)}</text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// --- conclusão: as duas retas lado a lado -------------------------------------------------
const Mini: React.FC<{ x: number; titulo: string; pontos: [number, number][]; o: number }> = ({ x, titulo, pontos, o }) => {
  const w = 360, y0 = 700, h = 420;
  const lx = pontos.map(([a]) => a), ly = pontos.map(([, b]) => b);
  const [ax, bx, ay, by] = [Math.min(...lx), Math.max(...lx), Math.min(...ly), Math.max(...ly)];
  const d = pontos.map(([a, b], k) => `${k ? "L" : "M"}${(x + ((a - ax) / (bx - ax)) * w).toFixed(1)},${(y0 + h - ((b - ay) / (by - ay)) * h).toFixed(1)}`).join("");
  return (
    <g opacity={o}>
      <text x={x + w / 2} y={y0 - 40} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={3}>{titulo}</text>
      <line x1={x} x2={x + w} y1={y0 + h} y2={y0 + h} stroke={TEXTO_2} strokeOpacity={0.6} />
      <line x1={x} x2={x} y1={y0} y2={y0 + h} stroke={TEXTO_2} strokeOpacity={0.6} />
      <path d={d} fill="none" stroke={CIANO} strokeWidth={10} strokeOpacity={0.35} filter="url(#brilhoC)" />
      <path d={d} fill="none" stroke={CIANO} strokeWidth={3.5} />
    </g>
  );
};
const LOG_CIDADES = AMOSTRA.map(([i, v]) => [Math.log10(i + 1), Math.log10(v)] as [number, number]);
const LOG_NOMES = NOMES.map(([, c], i) => [Math.log10(i + 1), Math.log10(c)] as [number, number]);

const CenaConclusao: React.FC = () => {
  const f = useCurrentFrame();
  const C = F.conclusao;
  const visivel = Math.min(entre(f, C + 5, C + 20), 1 - entre(f, F.cta, F.cta + 15));
  if (visivel <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="LOG × LOG" direita="LEI DE POTÊNCIA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><filter id="brilhoC" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={6} /></filter></defs>
        <Mini x={120} titulo="CIDADES" pontos={LOG_CIDADES} o={entre(f, C + seg(3.36), C + seg(3.36) + 12)} />
        <Mini x={600} titulo="NOMES" pontos={LOG_NOMES} o={entre(f, C + seg(5.31), C + seg(5.31) + 12)} />
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
        <Audio src={staticFile(`ciencia/potencia/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Potencia: React.FC = () => (
  <Fundo>
    <CenaRetratos />
    <CenaCidades />
    <CenaNomes />
    <CenaConclusao />
    <Manchete de={-10} ate={F.cidades - 4}>1% dos candidatos{"\n"}<Destaque>levou {Math.round(D.topoPct)}% dos votos.</Destaque></Manchete>
    <Manchete de={F.cidades} ate={F.cauda - 4}>As {milhar(N)} cidades,{"\n"}<Destaque>da maior pra menor.</Destaque></Manchete>
    <Manchete de={F.cauda} ate={F.log - 4}>São Paulo: 9 milhões.{"\n"}<Destaque>A 5.000ª: 3 mil.</Destaque></Manchete>
    <Manchete de={F.log} ate={F.nome - 4}>Em escala log,{"\n"}<Destaque>vira uma reta.</Destaque></Manchete>
    <Manchete de={F.nome} ate={F.nomes - 4}><Destaque>Lei de potência.</Destaque></Manchete>
    <Manchete de={F.nomes} ate={F.conclusao - 4}>Os nomes dos {milhar(dados.candidatos)}{"\n"}candidatos: <Destaque>a mesma reta.</Destaque></Manchete>
    <Manchete de={F.conclusao} ate={F.cta - 4}>Quando o grande{"\n"}atrai mais, <Destaque>surge a reta.</Destaque></Manchete>
    <Manchete de={F.cta} ate={T.marca} centro>Segue pra ver a ciência{"\n"}<Destaque>escondida nos dados.</Destaque></Manchete>
    <Fonte texto="FONTE: TSE · CANDIDATOS E ELEITORADO 2026" ate={F.cta} />
    <Marca de={T.marca} />
    <Narracao />
    {/* scripts/gerar-trilha-narrada.mjs: por baixo da voz, como nos outros reels de dados */}
    <Audio src={staticFile("ciencia/trilha-potencia.mp3")} volume={0.22} />
  </Fundo>
);
