import { AbsoluteFill, Audio, Easing, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import dados from "./apuracao-2turno.json";
import T from "./apuracao-2turno-tempos.json";
import { COR_FLAVIO, COR_LULA, FOTO_FLAVIO, FOTO_LULA } from "./Apuracao";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, MONO, TEXTO, TEXTO_2, br } from "./tokens";

// "A liderança virou duas vezes": 2º turno de 2026, Presidente, com narração. Lula abriu
// na frente, Flávio passou às 19h44 e Lula voltou à frente às 20h23. Nenhum voto mudou de
// lado: Sul e Centro-Oeste chegaram cedo, o Nordeste bem depois. Com as mesmas urnas em
// ordem sorteada a liderança não muda nenhuma vez.
//
// Números: apuracao-2turno.json (scripts/gerar-apuracao.mjs, turno 2, confere o total
// contra o oficial). Tempos: apuracao-2turno-tempos.json (scripts/tempos-apuracao-2turno.mjs,
// a partir da duração de cada fala). A trilha lê os mesmos tempos.
//
// A divulgação ficou pausada das 17h10 às 19h (votação estendida). As seções que chegaram
// antes da pausa são 0,4% do total: a linha começa na primeira depois dela, às 19h03, e a
// pausa é explicada só na legenda.
//
// Neutralidade, como no 1º turno: mesmo traço pras duas linhas, cor do partido, foto oficial
// (TSE) no balão, sem laranja (leria como cor partidária). Viradas e pico em branco.

type Ponto = [number, number, string]; // [% Lula, % Flávio, hh:mm], um a cada 0,1% das seções
const REAL = dados.real as Ponto[];
const ALEATORIA = dados.aleatoria as Ponto[];
const ULTIMO = REAL.length - 1;
const INICIO = REAL.findIndex((p) => p[2] >= "19:00"); // primeiro ponto depois da pausa
const PICO = dados.pico.i;
const V1 = dados.acima50.de; // primeiro ponto com Flávio à frente
const V2 = dados.acima50.ate + 1; // primeiro ponto com Lula à frente de novo
export const APURACAO_2T_TOTAL = T.total;

// --- gráfico -----------------------------------------------------------------------------
const GY0 = 560, GY1 = 1290;
const YMIN = 44, YMAX = 56;
const xDe = (i: number) => X0 + ((i + 1) / REAL.length) * (X1 - X0);
const yDe = (v: number) => GY1 - ((v - YMIN) / (YMAX - YMIN)) * (GY1 - GY0);

const valorEm = (pts: Ponto[], col: 0 | 1, n: number) => {
  const i = Math.floor(n), t = n - i;
  if (i >= pts.length - 1) return pts[pts.length - 1][col];
  return pts[i][col] + (pts[i + 1][col] - pts[i][col]) * t;
};

const caminho = (pts: Ponto[], col: 0 | 1, de: number, ate: number) => {
  const fim = Math.min(ate, pts.length - 1);
  let d = "";
  for (let i = de; i <= Math.floor(fim); i++) d += `${i > de ? "L" : "M"}${xDe(i).toFixed(1)},${yDe(pts[i][col]).toFixed(1)}`;
  if (fim % 1) d += `L${xDe(fim).toFixed(1)},${yDe(valorEm(pts, col, fim)).toFixed(1)}`;
  return d;
};

/** Até onde a linha real está desenhada em cada quadro (índice fracionário). */
const cursorReal = (f: number) => {
  // Gancho: a apuração inteira de uma vez (o quadro 0, capa, já tem a linha andando)…
  if (f < 165) return 40 + (ULTIMO - 40) * entre(f, 0, 160, Easing.inOut(Easing.quad));
  // …rebobina…
  if (f < T.fala["virada-1"]) return ULTIMO + (INICIO - ULTIMO) * entre(f, 165, 185, Easing.inOut(Easing.cubic));
  // …e refaz com a narração: cada virada cai no quadro em que a voz fala dela.
  if (f < T.fala["virada-2"]) return INICIO + (V1 - INICIO) * entre(f, T.fala["virada-1"], T.virada1, Easing.out(Easing.quad));
  if (f < T.virada2) return V1 + (V2 - V1) * entre(f, T.fala["virada-2"], T.virada2, Easing.inOut(Easing.quad));
  return V2 + (ULTIMO - V2) * entre(f, T.virada2, T.fimReal, Easing.inOut(Easing.quad));
};

const CONTORNO = { stroke: FUNDO, strokeWidth: 10, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };

const Eixos: React.FC<{ nota: number }> = ({ nota }) => (
  <g>
    {[46, 48, 52, 54].map((v) => (
      <g key={v}>
        <line x1={X0} x2={X1} y1={yDe(v)} y2={yDe(v)} stroke={TEXTO_2} strokeOpacity={0.18} strokeWidth={1} />
        <text x={X0 - 18} y={yDe(v) + 9} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={26}>{v}%</text>
      </g>
    ))}
    <line x1={X0} x2={X1} y1={yDe(50)} y2={yDe(50)} stroke={TEXTO} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="10 10" />
    <text x={X0 - 18} y={yDe(50) + 9} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={26}>50%</text>
    <text x={X1} y={yDe(50) - 16} textAnchor="end" fill={TEXTO} fillOpacity={0.75 * nota} fontFamily={MONO} fontSize={24} letterSpacing={2} {...CONTORNO} strokeOpacity={nota}>
      ACIMA DISSO, LIDERA
    </text>
    <line x1={X0} x2={X1} y1={GY1} y2={GY1} stroke={TEXTO_2} strokeOpacity={0.5} strokeWidth={1} />
    {[0, 25, 50, 75, 100].map((p) => {
      const x = X0 + (p / 100) * (X1 - X0);
      return (
        <g key={p}>
          <line x1={x} x2={x} y1={GY1} y2={GY1 + 12} stroke={TEXTO_2} strokeOpacity={0.6} />
          <text x={x} y={GY1 + 46} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={26}>{p}%</text>
        </g>
      );
    })}
    <text x={(X0 + X1) / 2} y={GY1 + 96} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={4}>
      URNAS APURADAS
    </text>
  </g>
);

const R = 46;
/**
 * Balão com a foto preso à ponta da linha. `lado` vai de 1 (balão acima da linha) a -1
 * (abaixo); perto do empate fica em 0 e os dois balões passam lado a lado (`dx`), em vez
 * de um atravessar o outro. O número só aparece com os balões já empilhados.
 */
const Balao: React.FC<{ id: string; foto: string; cor: string; x: number; y: number; lado: number; dx: number; valor: number }> = ({
  id, foto, cor, x, y, lado, dx, valor,
}) => {
  const bx = Math.min(Math.max(x + dx, X0 + R), X1 - R), by = y - lado * (R + 34);
  const vx = x - bx, vy = y - by, d = Math.hypot(vx, vy);
  const ux = vx / d, uy = vy / d;
  const esquerda = x > 640;
  const numero = entre(Math.abs(lado), 0.7, 1);
  return (
    <g>
      {d > R + 10 && (
        <path fill={cor} d={`M${bx + ux * (R - 2) - uy * 12},${by + uy * (R - 2) + ux * 12} L${x - ux * 8},${y - uy * 8} L${bx + ux * (R - 2) + uy * 12},${by + uy * (R - 2) - ux * 12} Z`} />
      )}
      <clipPath id={`clip-${id}`}><circle cx={bx} cy={by} r={R} /></clipPath>
      <image href={foto} x={bx - R} y={by - R} width={2 * R} height={2 * R} clipPath={`url(#clip-${id})`} preserveAspectRatio="xMidYMid slice" />
      <circle cx={bx} cy={by} r={R} fill="none" stroke={cor} strokeWidth={5} />
      {numero > 0 && (
        <g opacity={numero}>
          <rect x={esquerda ? bx - R - 16 - 132 : bx + R + 6} y={by - 24} width={142} height={48} fill={FUNDO} opacity={0.9} />
          <text x={bx + (esquerda ? -(R + 16) : R + 16)} y={by + 12} textAnchor={esquerda ? "end" : "start"}
            fill={TEXTO} fontFamily={MONO} fontSize={36} {...CONTORNO}>
            {br(valor)}%
          </text>
        </g>
      )}
    </g>
  );
};

/** As duas linhas de uma apuração, com o balão de cada candidato na ponta. */
const Linhas: React.FC<{ pts: Ponto[]; de: number; ate: number; opacidade?: number; rotulos?: boolean }> = ({
  pts, de, ate, opacidade = 1, rotulos = true,
}) => {
  if (ate <= de) return null;
  const vL = valorEm(pts, 0, ate), vF = valorEm(pts, 1, ate);
  const x = xDe(ate);
  // Lado do balão do Lula: 1 com ele à frente por 0,2 ponto ou mais, -1 atrás, contínuo no meio.
  const lado = Math.max(-1, Math.min(1, (vL - vF) / 0.2));
  const dx = (1 - Math.abs(lado)) * (R + 10);
  const series = [
    { nome: "lula", col: 0 as const, v: vL, cor: COR_LULA, foto: FOTO_LULA, lado, dx: -dx },
    { nome: "flavio", col: 1 as const, v: vF, cor: COR_FLAVIO, foto: FOTO_FLAVIO, lado: -lado, dx },
  ];
  return (
    <g opacity={opacidade}>
      {series.map((s) => (
        <g key={s.nome}>
          <path d={caminho(pts, s.col, de, ate)} fill="none" stroke={s.cor} strokeWidth={10} strokeOpacity={0.28} filter="url(#brilho)" />
          <path d={caminho(pts, s.col, de, ate)} fill="none" stroke={s.cor} strokeWidth={3.5} strokeLinejoin="round" />
          <circle cx={x} cy={yDe(s.v)} r={7} fill={s.cor} />
        </g>
      ))}
      {rotulos && series.map((s) => (
        <Balao key={s.nome} id={`${s.nome}-${pts === REAL ? "r" : "a"}`} foto={s.foto} cor={s.cor}
          x={x} y={yDe(s.v)} lado={s.lado} dx={s.dx} valor={s.v} />
      ))}
    </g>
  );
};

/** Anel branco num ponto da linha, que acende quando a linha passa por ele. */
const Anel: React.FC<{ i: number; cursor: number; rotulo?: string }> = ({ i, cursor, rotulo }) => {
  const o = Math.max(0, Math.min(1, (cursor - i) / 6));
  if (o <= 0) return null;
  const x = xDe(i), y = yDe(REAL[i][1]);
  // O rótulo espera os balões se afastarem do ponto, senão nasce embaixo deles.
  const r = Math.max(0, Math.min(1, (cursor - i - 70) / 20));
  return (
    <g opacity={o}>
      <circle cx={x} cy={y} r={30} fill={TEXTO} opacity={0.2} filter="url(#brilho)" />
      <circle cx={x} cy={y} r={16} fill="none" stroke={TEXTO} strokeWidth={3} />
      {rotulo && r > 0 && (
        <text x={x} y={y - 40} textAnchor="middle" fill={TEXTO} fillOpacity={r} fontFamily={MONO} fontSize={28} {...CONTORNO} strokeOpacity={r}>{rotulo}</text>
      )}
    </g>
  );
};

const hora = (i: number) => REAL[i][2].replace(":", "h");

const Grafico: React.FC = () => {
  const f = useCurrentFrame();
  const fase1 = f < T.mapa;
  const visivel = fase1
    ? 1 - entre(f, T.mapa, T.mapa + 15)
    : Math.min(entre(f, T.sorteadas - 10, T.sorteadas + 5), 1 - entre(f, T.cta, T.cta + 15))
      * Math.max(1 - entre(f, T.amostras, T.amostras + 15), entre(f, T.conclusao - 10, T.conclusao + 5));
  if (visivel <= 0) return null;

  // Fase 1: a apuração real (gancho rápido, rebobina, refaz com a voz), com a linha
  // inteira apagada ao fundo depois do gancho. Fase 2: a real apagada e as mesmas urnas
  // sorteadas por cima.
  const cursor = fase1 ? cursorReal(f) : ULTIMO;
  const fantasma = fase1 ? 0.25 * entre(f, 160, 185) : 0;
  const ateSort = ULTIMO * entre(f, T.sorteadas + 20, T.sorteadas + 170, Easing.inOut(Easing.quad));
  const n = fase1 ? cursor : ateSort;
  const pctUrnas = (Math.min(n, ULTIMO) + 1) / 10;

  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda={fase1 ? `HORA ${hora(Math.max(INICIO, Math.floor(n)))}` : "URNAS SORTEADAS"} direita={`${br(pctUrnas)}% DAS URNAS`} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilho" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={7} /></filter>
        </defs>
        <Eixos nota={fase1 ? 1 - entre(f, 70, 85) : entre(f, T.sorteadas, T.sorteadas + 15)} />
        {fantasma > 0 && <Linhas pts={REAL} de={INICIO} ate={ULTIMO} opacidade={fantasma} rotulos={false} />}
        <Linhas pts={REAL} de={INICIO} ate={cursor} opacidade={fase1 ? 1 : 0.3} rotulos={fase1} />
        {fase1 && (
          <>
            <Anel i={V1} cursor={cursor} rotulo={f >= T.fala["virada-1"] ? hora(V1) : undefined} />
            <Anel i={PICO} cursor={cursor} rotulo={f >= T.fala["virada-2"] ? `${br(REAL[PICO][1])}%` : undefined} />
            <Anel i={V2} cursor={cursor} rotulo={f >= T.fala["virada-2"] ? hora(V2) : undefined} />
          </>
        )}
        {!fase1 && <Linhas pts={ALEATORIA} de={0} ate={ateSort} />}
      </svg>
    </AbsoluteFill>
  );
};

// --- mapa --------------------------------------------------------------------------------
// x, y, válidos, chegada de 25/50/75/100% dos votos, e quem liderava em cada um desses marcos
type Mun = [number, number, number, number, number, number, number, number, number, number, number];
const MUNS = dados.municipios as Mun[];
const raio = (v: number) => 1.4 + Math.sqrt(v) * 0.0058;
const COR_LIDER = [TEXTO_2, COR_LULA, COR_FLAVIO]; // 0 = empate

const REGIOES: { cod: keyof typeof dados.regioes; nome: string }[] = [
  { cod: "S", nome: "SUL" }, { cod: "CO", nome: "CENTRO-OESTE" }, { cod: "N", nome: "NORTE" },
  { cod: "NE", nome: "NORDESTE" }, { cod: "SE", nome: "SUDESTE" },
];

const Mapa: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = Math.min(entre(f, T.mapa + 10, T.mapa + 30), 1 - entre(f, T.sorteio, T.sorteio + 20));
  if (visivel <= 0) return null;
  const pontos = f < T.sorteio;
  const p = 0.4 + 99.6 * entre(f, T.mapa + 30, T.fimMapa - 10);
  const i = Math.max(INICIO, Math.min(ULTIMO, Math.round(p * 10) - 1));
  const regiao = (cod: keyof typeof dados.regioes) => {
    const s = dados.regioes[cod], k = Math.min(99, Math.floor(p));
    return s[k] + (s[k + 1] - s[k]) * (p - k);
  };
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda={`HORA ${hora(i)}`} direita={`${br((i + 1) / 10)}% DAS URNAS`} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilhoMapa" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={5} /></filter>
        </defs>
        {dados.contornos.map((d, k) => (
          <path key={k} d={d} fill="none" stroke={CIANO} strokeOpacity={0.22} strokeWidth={1.2} />
        ))}
        <g>
          {pontos && MUNS.map(([x, y], k) => <circle key={k} cx={x} cy={y} r={1.1} fill={TEXTO_2} opacity={0.22} />)}
        </g>
        {pontos && [true, false].map((halo) => (
          <g key={String(halo)} filter={halo ? "url(#brilhoMapa)" : undefined} opacity={halo ? 0.6 : 1}>
            {MUNS.map((m, k) => {
              const [x, y, v, a, b, c, d] = m;
              const chegou = (p >= a ? 1 : 0) + (p >= b ? 1 : 0) + (p >= c ? 1 : 0) + (p >= d ? 1 : 0);
              if (!chegou) return null;
              const lider = m[6 + chegou];
              return <circle key={k} cx={x} cy={y} r={raio(v) * (halo ? 1.6 : 1)} fill={COR_LIDER[lider]} opacity={0.35 + 0.1625 * chegou} />;
            })}
          </g>
        ))}
      </svg>
      <div style={{
        position: "absolute", top: 1250, left: X0, width: X1 - X0, display: "flex", alignItems: "center", gap: 14,
        fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: TEXTO_2,
      }}>
        {[[FOTO_LULA, COR_LULA], [FOTO_FLAVIO, COR_FLAVIO]].map(([foto, cor]) => (
          <Img key={cor} src={foto} style={{ width: 52, height: 52, borderRadius: "50%", border: `4px solid ${cor}`, objectFit: "cover" }} />
        ))}
        <span style={{ marginLeft: 6 }}>COR = QUEM LIDERA NO MUNICÍPIO</span>
      </div>
      <div style={{ position: "absolute", top: 1330, left: X0, width: X1 - X0 }}>
        {REGIOES.map(({ cod, nome }) => {
          const v = regiao(cod);
          return (
            <div key={cod} style={{ display: "flex", alignItems: "center", height: 50, fontFamily: MONO, fontSize: 28, color: TEXTO, letterSpacing: 2 }}>
              <div style={{ width: 270 }}>{nome}</div>
              <div style={{ flex: 1, height: 6, background: "rgba(133,146,171,0.22)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, width: `${v * 100}%`, background: CIANO, boxShadow: `0 0 12px ${CIANO}` }} />
              </div>
              <div style={{ width: 110, textAlign: "right" }}>{Math.round(v * 100)}%</div>
            </div>
          );
        })}
        <div style={{ fontFamily: MONO, fontSize: 22, color: TEXTO_2, letterSpacing: 2, marginTop: 10 }}>
          VOTOS DE CADA REGIÃO JÁ APURADOS
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- sorteio: os pontos do mapa saem do lugar e caem misturados numa grade -------------
const permutacao = (n: number, semente: number) => {
  const idx = Array.from({ length: n }, (_, i) => i);
  let a = semente;
  const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
};
const POSICAO = permutacao(MUNS.length, 2026);
const COLUNAS = 75, PASSO = 10.4, GRADE_X = 155, GRADE_Y = 575;

const Sorteio: React.FC = () => {
  const f = useCurrentFrame();
  const o = 1 - entre(f, T.sorteadas - 15, T.sorteadas + 5);
  if (f < T.sorteio || o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {MUNS.map((m, k) => {
          const pos = POSICAO[k];
          const atraso = (pos / MUNS.length) * 60;
          const t = entre(f, T.sorteio + 15 + atraso, T.sorteio + 55 + atraso, Easing.inOut(Easing.cubic));
          const gx = GRADE_X + (pos % COLUNAS) * PASSO, gy = GRADE_Y + Math.floor(pos / COLUNAS) * PASSO;
          return (
            <circle key={k} cx={m[0] + (gx - m[0]) * t} cy={m[1] + (gy - m[1]) * t}
              r={raio(m[2]) + (3.4 - raio(m[2])) * t} fill={COR_LIDER[m[10]]} opacity={0.85} />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// --- quantas urnas bastam: cada ponto é um sorteio de n urnas ----------------------------
const AX0 = 32, AX1 = 64; // % do Flávio no eixo
const xAm = (v: number) => X0 + ((Math.min(AX1, Math.max(AX0, v)) - AX0) / (AX1 - AX0)) * (X1 - X0);
const LINHA_Y = [650, 830, 1010, 1190];
const ruido = (k: number) => {
  const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const Amostras: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(entre(f, T.amostras + 5, T.amostras + 20), 1 - entre(f, T.conclusao - 15, T.conclusao));
  if (o <= 0) return null;
  const xf = xAm(dados.final.flavio), x50 = xAm(50);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="CADA PONTO = 1 SORTEIO" direita="% DO FLÁVIO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={x50} x2={x50} y1={590} y2={1270} stroke={TEXTO_2} strokeOpacity={0.35} strokeWidth={1} />
        <line x1={xf} x2={xf} y1={560} y2={1270} stroke={TEXTO} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="10 10" />
        <text x={xf} y={545} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={2}>
          RESULTADO FINAL {br(dados.final.flavio)}%
        </text>
        {dados.amostras.map((a, i) => {
          const de = T.amostras + 25 + i * 45;
          const y = LINHA_Y[i];
          return (
            <g key={a.urnas} opacity={entre(f, de, de + 10)}>
              <text x={X0} y={y - 70} fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={2}>
                {a.urnas.toLocaleString("pt-BR")} URNAS
              </text>
              <text x={X1} y={y - 70} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={2}>
                ERRO ±{br(a.erro)}
              </text>
              {a.sorteios.map((v, k) => {
                const surge = entre(f, de + (k / a.sorteios.length) * 25, de + (k / a.sorteios.length) * 25 + 4);
                if (surge <= 0) return null;
                return <circle key={k} cx={xAm(v)} cy={y + (ruido(i * 1000 + k) - 0.5) * 70} r={5} fill={COR_FLAVIO} opacity={0.7 * surge} />;
              })}
            </g>
          );
        })}
        <line x1={X0} x2={X1} y1={1290} y2={1290} stroke={TEXTO_2} strokeOpacity={0.5} />
        {[35, 40, 45, 50, 55, 60].map((v) => (
          <text key={v} x={xAm(v)} y={1336} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={26}>{v}%</text>
        ))}
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
        <Audio src={staticFile(`ciencia/apuracao-2turno/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Apuracao2Turno: React.FC = () => {
  const F = T.fala;
  return (
    <Fundo>
      <Grafico />
      <Mapa />
      <Sorteio />
      <Amostras />
      <Manchete de={-10} ate={F["virada-1"] - 4}>A liderança virou{"\n"}<Destaque>duas vezes.</Destaque></Manchete>
      <Manchete de={F["virada-1"]} ate={F["virada-2"] - 4}>
        {hora(V1)}, com {Math.round((V1 + 1) / 10)}% das urnas:{"\n"}<Destaque>Flávio passa à frente.</Destaque>
      </Manchete>
      <Manchete de={F["virada-2"]} ate={F.final - 4}>
        {hora(V2)}, com {Math.round((V2 + 1) / 10)}%:{"\n"}<Destaque>Lula volta à frente.</Destaque>
      </Manchete>
      <Manchete de={F.final} ate={T.mapa + 10}>
        Terminou {br(dados.final.lula)}% a {br(dados.final.flavio)}%.{"\n"}<Destaque>Nenhum voto{"\n"}mudou de lado.</Destaque>
      </Manchete>
      <Manchete de={F["mapa-cedo"]} ate={F["mapa-tarde"] - 4}><Destaque>Sul e Centro-Oeste</Destaque>{"\n"}chegaram antes.</Manchete>
      <Manchete de={F["mapa-tarde"]} ate={F.sorteio - 4}>O <Destaque>Nordeste</Destaque>,{"\n"}bem depois.</Manchete>
      <Manchete de={F.sorteio} ate={F.sorteadas - 4}>E se as urnas chegassem{"\n"}<Destaque>sorteadas?</Destaque></Manchete>
      <Manchete de={F.sorteadas} ate={F.amostras - 4}>Sorteadas, a liderança{"\n"}<Destaque>não muda nenhuma vez.</Destaque></Manchete>
      <Manchete de={F.amostras} ate={F["amostras-resposta"] - 4}>Quantas urnas sorteadas{"\n"}bastam pra acertar?</Manchete>
      <Manchete de={F["amostras-resposta"]} ate={F.conclusao - 4}>
        Com <Destaque>1.000 urnas</Destaque>, o erro{"\n"}já é de ±{br(dados.amostras[2].erro)} ponto.
      </Manchete>
      <Manchete de={F.conclusao} ate={F.cta - 4}>A parcial não erra os votos.{"\n"}<Destaque>Erra a amostra.</Destaque></Manchete>
      <Manchete de={F.cta} ate={T.marca} centro>Segue pra ver a ciência{"\n"}<Destaque>escondida nos dados.</Destaque></Manchete>
      <Fonte texto="FONTE: TSE · BOLETINS DE URNA · 2º TURNO 2026" ate={T.cta} />
      <Marca de={T.marca} />
      <Narracao />
      {/* scripts/gerar-trilha-apuracao-2turno.mjs: mais baixa que no 1º turno, por baixo da voz */}
      <Audio src={staticFile("ciencia/trilha-apuracao-2turno.mp3")} volume={0.22} />
    </Fundo>
  );
};
