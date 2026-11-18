import { AbsoluteFill, Audio, Easing, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import dados from "./benford.json";
import T from "./benford-tempos.json";
import { COR_FLAVIO, COR_LULA, FOTO_FLAVIO, FOTO_LULA } from "./Apuracao";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, MONO, TEXTO, TEXTO_2, br } from "./tokens";

// "A Lei de Benford não detecta fraude em urna": 2º turno de 2026, Presidente, narrado.
// O primeiro dígito dos votos de cada candidato por seção começa com 1 em 61% e 62% das
// vezes (Benford prevê 30%): os dois reprovam. Uma seção tem uns 250 votos, então o voto
// de um candidato cai quase sempre entre 100 e 199. Somando os mesmos votos por
// município (de 200 a 3,9 milhões, várias escalas), os dois seguem a curva.
//
// Números: benford.json (scripts/gerar-benford.mjs, confere o total contra o oficial).
// Tempos: benford-tempos.json (scripts/tempos-narracao.mjs). Os instantes dentro das falas
// (`seg`) foram medidos no áudio da cedar com silencedetect: regravou, medir de novo.
//
// Neutralidade: os dois candidatos sempre juntos, mesmo traço, mesmo selo ao mesmo tempo.
// "Fraude" na tela só entre aspas ou negada. Nada sobre a extensão do horário de votação.

export const BENFORD_TOTAL = T.total;
const F = T.fala;
const seg = (s: number) => Math.round(s * 30);

type Serie = "lula" | "flavio";
const SERIES: { c: Serie; cor: string; foto: string; nome: string }[] = [
  { c: "lula", cor: COR_LULA, foto: FOTO_LULA, nome: "LULA" },
  { c: "flavio", cor: COR_FLAVIO, foto: FOTO_FLAVIO, nome: "FLÁVIO" },
];
const CONTORNO = { stroke: FUNDO, strokeWidth: 10, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
const ruido = (k: number) => {
  const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const Brilho: React.FC = () => (
  <defs>
    <filter id="brilho" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={6} /></filter>
  </defs>
);

// --- primeiro dígito: barras dos dois candidatos e a curva de Benford -------------------
type Caixa = { x0: number; x1: number; y0: number; y1: number };
const TOPO = 65; // % no alto do eixo: cabe o 62% do Flávio
const GY0 = 560, GY1 = 1250;
const PRINCIPAL: Caixa = { x0: X0, x1: X1, y0: GY0, y1: GY1 };

const geometria = (c: Caixa) => {
  const w = (c.x1 - c.x0) / 9;
  return {
    w,
    xd: (d: number) => c.x0 + (d + 0.5) * w,
    yp: (p: number) => c.y1 - (p / TOPO) * (c.y1 - c.y0),
  };
};

const Digitos: React.FC<{ caixa: Caixa; valores: Record<Serie, number[]>; curva?: number; compacto?: boolean; children?: React.ReactNode }> = ({
  caixa, valores, curva = 1, compacto, children,
}) => {
  const { w, xd, yp } = geometria(caixa);
  const barra = compacto ? w * 0.36 : 30;
  // Curva desenhada até o dígito `curva * 8` (fracionário), pra entrar da esquerda pra direita.
  const ate = curva * 8;
  let d = "";
  for (let i = 0; i <= Math.floor(ate); i++) d += `${i ? "L" : "M"}${xd(i).toFixed(1)},${yp(dados.benford[i]).toFixed(1)}`;
  if (ate % 1) {
    const i = Math.floor(ate), t = ate - i;
    d += `L${(xd(i) + w * t).toFixed(1)},${yp(dados.benford[i] + (dados.benford[i + 1] - dados.benford[i]) * t).toFixed(1)}`;
  }
  return (
    <g>
      {!compacto && [20, 40, 60].map((p) => (
        <g key={p}>
          <line x1={caixa.x0} x2={caixa.x1} y1={yp(p)} y2={yp(p)} stroke={TEXTO_2} strokeOpacity={0.16} />
          <text x={caixa.x0 - 18} y={yp(p) + 9} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={26}>{p}%</text>
        </g>
      ))}
      <line x1={caixa.x0} x2={caixa.x1} y1={caixa.y1} y2={caixa.y1} stroke={TEXTO_2} strokeOpacity={0.5} />
      {SERIES.map((s, k) => valores[s.c].map((v, i) => {
        const x = k === 0 ? xd(i) - barra - 2 : xd(i) + 2;
        return <rect key={`${s.c}${i}`} x={x} y={yp(v)} width={barra} height={caixa.y1 - yp(v)} fill={s.cor} opacity={0.92} />;
      }))}
      {curva > 0 && (
        <>
          <path d={d} fill="none" stroke={TEXTO} strokeWidth={compacto ? 6 : 10} strokeOpacity={0.3} filter="url(#brilho)" />
          <path d={d} fill="none" stroke={TEXTO} strokeWidth={compacto ? 2.5 : 4} strokeLinejoin="round" />
          {dados.benford.map((p, i) => i <= ate && (
            <circle key={i} cx={xd(i)} cy={yp(p)} r={compacto ? 4 : 7} fill={FUNDO} stroke={TEXTO} strokeWidth={compacto ? 2 : 3} />
          ))}
        </>
      )}
      {dados.benford.map((_, i) => (
        <text key={i} x={xd(i)} y={caixa.y1 + (compacto ? 34 : 50)} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={compacto ? 24 : 34}>{i + 1}</text>
      ))}
      {children}
    </g>
  );
};

const misturar = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

const CenaDigitos: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = Math.max(
    1 - entre(f, F.porque, F.porque + 15),
    Math.min(entre(f, F.passa - 15, F.passa), 1 - entre(f, F.conclusao, F.conclusao + 15)),
  );
  if (visivel <= 0) return null;

  // Capa (quadro 0) já com as barras por urna; na regra elas descem e fica só a curva;
  // na fala das urnas sobem de novo; na volta, viram as barras por cidade.
  const urna = dados.urna as Record<Serie, number[]>, cidade = dados.cidade as Record<Serie, number[]>;
  const valores = {} as Record<Serie, number[]>;
  for (const { c } of SERIES) {
    if (f < F.regra) valores[c] = urna[c];
    else if (f < F.urnas) valores[c] = urna[c].map((v) => v * (1 - entre(f, F.regra, F.regra + 20, Easing.in(Easing.quad))));
    else if (f < F.passa - 15) valores[c] = urna[c].map((v, i) => v * entre(f, F.urnas + 10 + i * 4, F.urnas + 50 + i * 4, Easing.out(Easing.cubic)));
    else valores[c] = misturar(urna[c], cidade[c], entre(f, F.passa + 5, F.passa + 45, Easing.inOut(Easing.cubic)));
  }
  const porCidade = f >= F.passa + 25;

  const { xd, yp } = geometria(PRINCIPAL);
  const rotulo1 = f < F.regra ? 1 - entre(f, F.regra, F.regra + 10) : entre(f, F.urnas + 55, F.urnas + 70);
  // 30% e 5% só na primeira passagem: na volta por cidade as barras encostam na curva e
  // o rótulo empilharia com os números do dígito 1.
  const primeira = f < F.porque + 15;
  const r30 = primeira ? entre(f, F.regra + seg(1.6), F.regra + seg(1.6) + 10) : 0;
  const r5 = primeira ? entre(f, F.regra + seg(4.5), F.regra + seg(4.5) + 10) : 0;

  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="1º DÍGITO DOS VOTOS" direita={f >= F.regra && f < F.urnas ? "LEI DE BENFORD" : porCidade ? "POR CIDADE" : "POR URNA"} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Brilho />
        <Digitos caixa={PRINCIPAL} valores={valores}>
          {rotulo1 > 0 && SERIES.map((s, k) => {
            const v = valores[s.c][0];
            return (
              <text key={s.c} x={k === 0 ? xd(0) - 6 : xd(0) + 6} y={yp(v) - 16} textAnchor={k === 0 ? "end" : "start"}
                fill={TEXTO} fillOpacity={rotulo1} fontFamily={MONO} fontSize={30} {...CONTORNO} strokeOpacity={rotulo1}>
                {Math.round(v)}%
              </text>
            );
          })}
          {r30 > 0 && (
            <text x={xd(0) + 40} y={yp(dados.benford[0]) - 14} fill={CIANO} fillOpacity={r30} fontFamily={MONO} fontSize={36} {...CONTORNO} strokeOpacity={r30}>
              30%
            </text>
          )}
          {r5 > 0 && (
            <text x={xd(8)} y={yp(dados.benford[8]) - 75} textAnchor="middle" fill={CIANO} fillOpacity={r5} fontFamily={MONO} fontSize={36} {...CONTORNO} strokeOpacity={r5}>
              5%
            </text>
          )}
        </Digitos>
        <text x={(X0 + X1) / 2} y={GY1 + 100} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={4}>
          PRIMEIRO DÍGITO
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// --- por quê: quantas urnas têm cada número de votos ------------------------------------
const PASSO = dados.hist.passo, NBINS = dados.hist.lula.length;
const HX = (v: number) => X0 + (v / (PASSO * NBINS)) * (X1 - X0);
const HMAX = Math.max(...dados.hist.lula, ...dados.hist.flavio);
const HY = (p: number) => GY1 - (p / HMAX) * (GY1 - GY0 - 240); // sobra espaço em cima pro rótulo da faixa

const CenaHistograma: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = Math.min(entre(f, F.porque + 5, F.porque + 20), 1 - entre(f, F.escala, F.escala + 15));
  if (visivel <= 0) return null;
  const faixa = entre(f, F.porque + seg(7.1), F.porque + seg(7.1) + 12);
  const largura = HX(PASSO) - HX(0);
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="URNAS POR Nº DE VOTOS" direita="DE CADA CANDIDATO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <rect x={HX(100)} y={GY0 + 20} width={HX(200) - HX(100)} height={GY1 - GY0 - 20} fill={CIANO} opacity={0.13 * faixa} />
        {SERIES.map((s, k) => (dados.hist[s.c] as number[]).map((p, i) => {
          const cresce = entre(f, F.porque + 20 + i * 0.8, F.porque + 50 + i * 0.8, Easing.out(Easing.cubic));
          const dentro = i * PASSO >= 100 && i * PASSO < 200;
          const y = HY(p * cresce);
          return (
            <rect key={`${s.c}${i}`} x={HX(i * PASSO) + 1 + k * (largura / 2)} y={y} width={largura / 2 - 1.5} height={GY1 - y}
              fill={s.cor} opacity={0.92 * (dentro ? 1 : 1 - 0.6 * faixa)} />
          );
        }))}
        <line x1={X0} x2={X1} y1={GY1} y2={GY1} stroke={TEXTO_2} strokeOpacity={0.5} />
        {[0, 100, 200, 300, 400].map((v) => (
          <text key={v} x={HX(v)} y={GY1 + 46} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={26}>{v}</text>
        ))}
        <text x={(X0 + X1) / 2} y={GY1 + 100} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={4}>
          VOTOS DO CANDIDATO NA URNA
        </text>
        {faixa > 0 && (
          <g opacity={faixa}>
            {["100 A 199", "COMEÇA COM 1", `${Math.round(dados.faixa1.lula)}% DAS URNAS`].map((t, i) => (
              <text key={t} x={(HX(100) + HX(200)) / 2} y={GY0 + 40 + i * 38} textAnchor="middle" fill={i === 2 ? TEXTO : CIANO}
                fontFamily={MONO} fontSize={30} letterSpacing={2} {...CONTORNO}>{t}</text>
            ))}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// --- escala log: as urnas amontoadas, as cidades espalhadas por seis ordens de grandeza --
const LOG_MAX = 7; // de 1 a 10 milhões
const xLog = (l: number) => X0 + (Math.max(0, Math.min(LOG_MAX, l)) / LOG_MAX) * (X1 - X0);
const DECADAS = ["1", "10", "100", "1 mil", "10 mil", "100 mil", "1 mi", "10 mi"];
const URNAS_Y = 770, URNAS_H = 150, CIDADES_Y = 1010, CIDADES_H = 190, EIXO_Y = 1150;
const LOG2 = Math.log10(2);

const CenaEscala: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = Math.min(entre(f, F.escala + 5, F.escala + 20), 1 - entre(f, F.passa - 15, F.passa));
  if (visivel <= 0) return null;
  const faixas = entre(f, F.escala + 30, F.escala + 50);
  const urnas = entre(f, F.escala + 10, F.escala + 25);
  const rotuloCidades = entre(f, F.cidades, F.cidades + 15);
  const menor = entre(f, F.cidades + seg(3.6), F.cidades + seg(3.6) + 10);
  const maior = entre(f, F.cidades + seg(4.8), F.cidades + seg(4.8) + 10);
  const minimo = Math.min(dados.extremos.lula.min, dados.extremos.flavio.min);
  const maximo = Math.max(dados.extremos.lula.max, dados.extremos.flavio.max);
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="VOTOS DE CADA CANDIDATO" direita="ESCALA LOG" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: LOG_MAX }, (_, k) => (
          <rect key={k} x={xLog(k)} y={640} width={xLog(k + LOG2) - xLog(k)} height={EIXO_Y - 640} fill={CIANO} opacity={0.12 * faixas} />
        ))}
        <text x={X1} y={612} textAnchor="end" fill={CIANO} fillOpacity={faixas} fontFamily={MONO} fontSize={24} letterSpacing={2}>
          ▮ COMEÇA COM 1
        </text>
        <text x={X0} y={URNAS_Y - URNAS_H / 2 - 18} fill={TEXTO} fillOpacity={urnas} fontFamily={MONO} fontSize={26} letterSpacing={3}>URNAS</text>
        <g opacity={urnas}>
          {SERIES.map((s, k) => (dados.log.urnas[s.c] as number[]).map((l, i) => (
            <circle key={`${s.c}${i}`} cx={xLog(l)} cy={URNAS_Y + (ruido(k * 10000 + i) - 0.5) * URNAS_H} r={3} fill={s.cor} opacity={0.55} />
          )))}
        </g>
        {f >= F.cidades && (
          <g>
            <text x={X0} y={CIDADES_Y - CIDADES_H / 2 - 18} fill={TEXTO} fillOpacity={rotuloCidades} fontFamily={MONO} fontSize={26} letterSpacing={3}>CIDADES</text>
            {SERIES.map((s, k) => (dados.log.cidades[s.c] as number[]).map((l, i) => {
              // Saem do amontoado das urnas (~250 votos) e se espalham até o próprio total.
              const atraso = ruido(k * 10000 + i + 50000) * 60;
              const t = entre(f, F.cidades + 10 + atraso, F.cidades + 55 + atraso, Easing.inOut(Easing.cubic));
              if (t <= 0) return null;
              const x0 = xLog(2.4);
              return (
                <circle key={`${s.c}${i}`} cx={x0 + (xLog(l) - x0) * t} cy={CIDADES_Y + (ruido(k * 10000 + i + 20000) - 0.5) * CIDADES_H}
                  r={2.6} fill={s.cor} opacity={0.5 * Math.min(1, t * 3)} />
              );
            }))}
            {menor > 0 && (
              <text x={xLog(Math.log10(minimo))} y={CIDADES_Y - CIDADES_H / 2 - 18} textAnchor="middle" fill={TEXTO} fillOpacity={menor}
                fontFamily={MONO} fontSize={26} {...CONTORNO} strokeOpacity={menor}>≈ {Math.round(minimo / 10) * 10} VOTOS</text>
            )}
            {maior > 0 && (
              <text x={X1} y={CIDADES_Y - CIDADES_H / 2 - 18} textAnchor="end" fill={TEXTO} fillOpacity={maior}
                fontFamily={MONO} fontSize={26} {...CONTORNO} strokeOpacity={maior}>{br(maximo / 1e6)} MILHÕES</text>
            )}
          </g>
        )}
        <line x1={X0} x2={X1} y1={EIXO_Y} y2={EIXO_Y} stroke={TEXTO_2} strokeOpacity={0.6} />
        {DECADAS.map((t, k) => {
          const aceso = 0.35 + 0.65 * entre(f, F.escala + 10 + k * 12, F.escala + 20 + k * 12);
          return (
            <g key={t} opacity={aceso}>
              <line x1={xLog(k)} x2={xLog(k)} y1={EIXO_Y} y2={EIXO_Y + 12} stroke={TEXTO} />
              <text x={xLog(k)} y={EIXO_Y + 46} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={k > 2 ? 22 : 26}>{t}</text>
            </g>
          );
        })}
        <text x={(X0 + X1) / 2} y={EIXO_Y + 100} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={4}>
          VOTOS DO CANDIDATO
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// --- conclusão: as duas escalas lado a lado --------------------------------------------
const MINI: { caixa: Caixa; titulo: string; valores: Record<Serie, number[]>; selo: string }[] = [
  { caixa: { x0: 120, x1: 500, y0: 700, y1: 1150 }, titulo: "POR URNA", valores: dados.urna as Record<Serie, number[]>, selo: "REPROVA" },
  { caixa: { x0: 580, x1: 960, y0: 700, y1: 1150 }, titulo: "POR CIDADE", valores: dados.cidade as Record<Serie, number[]>, selo: "PASSA" },
];

const CenaConclusao: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = Math.min(entre(f, F.conclusao + 5, F.conclusao + 20), 1 - entre(f, F.cta, F.cta + 15));
  if (visivel <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="1º DÍGITO DOS VOTOS" direita="MESMOS VOTOS" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Brilho />
        {MINI.map((m) => (
          <g key={m.titulo}>
            <text x={(m.caixa.x0 + m.caixa.x1) / 2} y={m.caixa.y0 - 60} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={3}>{m.titulo}</text>
            <Digitos caixa={m.caixa} valores={m.valores} compacto />
            <rect x={(m.caixa.x0 + m.caixa.x1) / 2 - 85} y={m.caixa.y1 + 70} width={170} height={52} fill="none" stroke={TEXTO} strokeWidth={3} rx={6} />
            <text x={(m.caixa.x0 + m.caixa.x1) / 2} y={m.caixa.y1 + 106} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={3}>{m.selo}</text>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// --- legenda dos candidatos, com o selo do teste -------------------------------------------
const Legenda: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = 1 - entre(f, F.cta, F.cta + 15);
  if (visivel <= 0) return null;
  // Os dois selos sempre juntos: reprova na fala das urnas, passa na volta por cidade.
  // Na conclusão o selo sai daqui e fica embaixo de cada gráfico.
  const reprova = Math.min(entre(f, F.reprova + 3, F.reprova + 11), 1 - entre(f, F.porque, F.porque + 10));
  const passa = Math.min(entre(f, F.passa + 45, F.passa + 53), 1 - entre(f, F.conclusao, F.conclusao + 10));
  const selo = reprova > 0 ? { texto: "REPROVA", o: reprova, t: f - F.reprova - 3 } : passa > 0 ? { texto: "PASSA", o: passa, t: f - F.passa - 45 } : null;
  const escala = selo ? 1 + 0.25 * (1 - entre(selo.t, 0, 8, Easing.out(Easing.cubic))) : 1;
  return (
    <div style={{ position: "absolute", top: 1415, left: X0, width: X1 - X0, display: "flex", justifyContent: "space-between", opacity: visivel }}>
      {SERIES.map((s) => (
        <div key={s.c} style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: MONO, fontSize: 28, letterSpacing: 2, color: TEXTO }}>
          <Img src={s.foto} style={{ width: 80, height: 80, borderRadius: "50%", border: `4px solid ${s.cor}`, objectFit: "cover" }} />
          <span>{s.nome}</span>
          {selo && (
            <span style={{ border: `3px solid ${TEXTO}`, borderRadius: 6, padding: "4px 12px", opacity: selo.o, scale: String(escala), letterSpacing: 3 }}>
              {selo.texto}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é audio/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(T.fala).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/benford/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Benford: React.FC = () => (
  <Fundo>
    <CenaDigitos />
    <CenaHistograma />
    <CenaEscala />
    <CenaConclusao />
    <Legenda />
    <Manchete de={-10} ate={F.regra - 4}>O teste que viralizou{"\n"}como <Destaque>“prova de fraude”</Destaque>.</Manchete>
    <Manchete de={F.regra} ate={F.urnas - 4}>Lei de Benford:{"\n"}<Destaque>30% dos números</Destaque>{"\n"}começam com 1.</Manchete>
    <Manchete de={F.urnas} ate={F.reprova - 4}>
      Votos por urna:{"\n"}<Destaque>{Math.round(dados.urna.lula[0])}% e {Math.round(dados.urna.flavio[0])}%</Destaque> começam com 1.
    </Manchete>
    <Manchete de={F.reprova} ate={F.porque - 4}>Os dois candidatos{"\n"}<Destaque>reprovam no teste.</Destaque></Manchete>
    <Manchete de={F.porque} ate={F.escala - 4}>Uma urna tem{"\n"}<Destaque>uns 250 votos.</Destaque></Manchete>
    <Manchete de={F.escala} ate={F.cidades - 4}>Benford só vale quando{"\n"}<Destaque>os números variam muito.</Destaque></Manchete>
    <Manchete de={F.cidades} ate={F.passa - 4}>Os mesmos votos,{"\n"}<Destaque>somados por cidade.</Destaque></Manchete>
    <Manchete de={F.passa} ate={F.conclusao - 4}>Por cidade,{"\n"}<Destaque>os dois passam.</Destaque></Manchete>
    <Manchete de={F.conclusao} ate={F.cta - 4}>Benford mede o tamanho{"\n"}dos números.{"\n"}<Destaque>Não mede fraude.</Destaque></Manchete>
    <Manchete de={F.cta} ate={T.marca} centro>Segue pra ver a ciência{"\n"}<Destaque>escondida nos dados.</Destaque></Manchete>
    <Fonte texto="FONTE: TSE · BOLETINS DE URNA · 2º TURNO 2026" ate={F.cta} />
    <Marca de={T.marca} />
    <Narracao />
    {/* scripts/gerar-trilha-narrada.mjs: por baixo da voz, como no reel da apuração */}
    <Audio src={staticFile("ciencia/trilha-benford.mp3")} volume={0.22} />
  </Fundo>
);
