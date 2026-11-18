import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import dados from "./apuracao-1turno.json";
import { CIANO, FUNDO, FUNDO_CENTRO, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";

// "A apuração que enganou": 1º turno de 2026, Presidente. Por mais de uma hora o painel
// mostrou Flávio acima de 50%, eleito no 1º turno, e ele terminou com 47%. Nenhum voto
// mudou de lado: o que mudou foi a ordem em que as urnas chegaram. Sul e Centro-Oeste
// chegaram antes, o Nordeste por último. Com as mesmas urnas em ordem aleatória a linha
// crava o resultado final desde o começo.
//
// Todos os números vêm de apuracao-1turno.json, gerado por scripts/gerar-apuracao.mjs a
// partir dos Boletins de Urna do TSE (o script confere o total contra o oficial).
//
// Neutralidade é regra: as duas linhas têm o mesmo traço e a mesma espessura, cada uma
// na cor do partido, com a foto oficial de candidatura (TSE) num balão na ponta.
// Exceção ao design guide: aqui não há laranja, porque ao lado do vermelho do PT ele
// leria como mais uma cor partidária. O pico é marcado em branco.

// Cores dos partidos, validadas no fundo escuro (contraste e daltonismo).
export const COR_LULA = "#F0343F"; // PT
export const COR_FLAVIO = "#3B7BFF"; // PL
export const FOTO_LULA = staticFile("ciencia/lula.jpg");
export const FOTO_FLAVIO = staticFile("ciencia/flavio.jpg");

type Ponto = [number, number, string]; // [% Lula, % Flávio, hh:mm], um a cada 0,1% das seções
const REAL = dados.real as Ponto[];
const ALEATORIA = dados.aleatoria as Ponto[];
const ULTIMO = REAL.length - 1;
const PICO = dados.pico.i;

// Linha do tempo, em quadros a 30fps.
const T = {
  sobe: 100, // linha real sai do pico
  congela: 200, // relógio para no instante em que o Flávio cai abaixo de 50%
  solta: 290, // volta a correr
  fimReal: 400, // linha real chega a 100%
  mapa: 490, // urnas acendendo no mapa
  sorteio: 880, // os pontos do mapa se misturam
  sorteadas: 1030, // gráfico das mesmas urnas em ordem sorteada
  amostras: 1420, // quantas urnas sorteadas bastam
  conclusao: 1660,
  gancho: 1870, // chamada pro 2º turno
  marca: 1960,
};
export const APURACAO_TOTAL = 2040; // 68s

// Último ponto com o Flávio acima de 50%; o seguinte é o instante em que ele cai.
const CRUZA = dados.acima50.ate + 1;

const entre = (f: number, de: number, ate: number, easing?: (t: number) => number) =>
  interpolate(f, [de, ate], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** Entra e sai com fade curto; fora da janela não renderiza. */
const janela = (f: number, de: number, ate: number, fade = 8) =>
  Math.min(entre(f, de, de + fade), 1 - entre(f, ate - fade, ate));

// --- gráfico -----------------------------------------------------------------------------
const GX0 = 130, GX1 = 940, GY0 = 560, GY1 = 1290;
const YMIN = 38, YMAX = 54;
const xDe = (i: number) => GX0 + ((i + 1) / REAL.length) * (GX1 - GX0);
const yDe = (v: number) => GY1 - ((v - YMIN) / (YMAX - YMIN)) * (GY1 - GY0);

/** Valor da série no índice fracionário `n` (interpola entre pontos vizinhos). */
const valorEm = (pts: Ponto[], col: 0 | 1, n: number) => {
  const i = Math.floor(n), t = n - i;
  if (i >= pts.length - 1) return pts[pts.length - 1][col];
  return pts[i][col] + (pts[i + 1][col] - pts[i][col]) * t;
};

const caminho = (pts: Ponto[], col: 0 | 1, ate: number) => {
  const fim = Math.min(ate, pts.length - 1);
  let d = "";
  for (let i = 0; i <= Math.floor(fim); i++) d += `${i ? "L" : "M"}${xDe(i).toFixed(1)},${yDe(pts[i][col]).toFixed(1)}`;
  if (fim % 1) d += `L${xDe(fim).toFixed(1)},${yDe(valorEm(pts, col, fim)).toFixed(1)}`;
  return d;
};

/** Contorno na cor do fundo atrás do texto: a linha pode passar por baixo sem apagar a leitura. */
const CONTORNO = { stroke: FUNDO, strokeWidth: 10, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };

const Eixos: React.FC<{ nota: number }> = ({ nota }) => (
  <g>
    {[40, 45].map((v) => (
      <g key={v}>
        <line x1={GX0} x2={GX1} y1={yDe(v)} y2={yDe(v)} stroke={TEXTO_2} strokeOpacity={0.18} strokeWidth={1} />
        <text x={GX0 - 18} y={yDe(v) + 9} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={26}>{v}%</text>
      </g>
    ))}
    <line x1={GX0} x2={GX1} y1={yDe(50)} y2={yDe(50)} stroke={TEXTO} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="10 10" />
    <text x={GX0 - 18} y={yDe(50) + 9} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={26}>50%</text>
    <text x={GX1} y={yDe(50) - 16} textAnchor="end" fill={TEXTO} fillOpacity={0.75 * nota} fontFamily={MONO} fontSize={24} letterSpacing={2} {...CONTORNO} strokeOpacity={nota}>
      ACIMA DISSO, LEVA NO 1º TURNO
    </text>
    <line x1={GX0} x2={GX1} y1={GY1} y2={GY1} stroke={TEXTO_2} strokeOpacity={0.5} strokeWidth={1} />
    {[0, 25, 50, 75, 100].map((p) => {
      const x = GX0 + (p / 100) * (GX1 - GX0);
      return (
        <g key={p}>
          <line x1={x} x2={x} y1={GY1} y2={GY1 + 12} stroke={TEXTO_2} strokeOpacity={0.6} />
          <text x={x} y={GY1 + 46} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={26}>{p}%</text>
        </g>
      );
    })}
    <text x={(GX0 + GX1) / 2} y={GY1 + 96} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={4}>
      URNAS APURADAS
    </text>
  </g>
);

/** Balão com a foto do candidato preso à ponta da linha, e o valor ao lado. */
const Balao: React.FC<{ id: string; foto: string; cor: string; x: number; y: number; acima: boolean; valor: number }> = ({
  id, foto, cor, x, y, acima, valor,
}) => {
  const R = 46;
  const bx = Math.min(Math.max(x, GX0 + R), GX1 - R), by = y + (acima ? -(R + 34) : R + 34);
  const ponta = acima ? by + R : by - R;
  const esquerda = x > 640;
  return (
    <g>
      <path d={`M${bx - 12},${ponta} L${x},${y + (acima ? -8 : 8)} L${bx + 12},${ponta} Z`} fill={cor} />
      <clipPath id={`clip-${id}`}><circle cx={bx} cy={by} r={R} /></clipPath>
      <image href={foto} x={bx - R} y={by - R} width={2 * R} height={2 * R} clipPath={`url(#clip-${id})`} preserveAspectRatio="xMidYMid slice" />
      <circle cx={bx} cy={by} r={R} fill="none" stroke={cor} strokeWidth={5} />
      {/* placa atrás do número: a linha passa por baixo dele perto da ponta */}
      <rect x={esquerda ? bx - R - 16 - 132 : bx + R + 6} y={by - 24} width={142} height={48} fill={FUNDO} opacity={0.9} />
      <text x={bx + (esquerda ? -(R + 16) : R + 16)} y={by + 12} textAnchor={esquerda ? "end" : "start"}
        fill={TEXTO} fontFamily={MONO} fontSize={36} {...CONTORNO}>
        {br(valor)}%
      </text>
    </g>
  );
};

/** As duas linhas de uma apuração, com o balão de cada candidato na ponta. */
const Linhas: React.FC<{ pts: Ponto[]; ate: number; opacidade?: number; rotulos?: boolean }> = ({
  pts, ate, opacidade = 1, rotulos = true,
}) => {
  if (ate <= 0) return null;
  const vL = valorEm(pts, 0, ate), vF = valorEm(pts, 1, ate);
  const x = xDe(ate);
  const series = [
    { nome: "lula", col: 0 as const, v: vL, cor: COR_LULA, foto: FOTO_LULA },
    { nome: "flavio", col: 1 as const, v: vF, cor: COR_FLAVIO, foto: FOTO_FLAVIO },
  ];
  return (
    <g opacity={opacidade}>
      {series.map((s) => (
        <g key={s.nome}>
          <path d={caminho(pts, s.col, ate)} fill="none" stroke={s.cor} strokeWidth={10} strokeOpacity={0.28} filter="url(#brilho)" />
          <path d={caminho(pts, s.col, ate)} fill="none" stroke={s.cor} strokeWidth={3.5} strokeLinejoin="round" />
          <circle cx={x} cy={yDe(s.v)} r={7} fill={s.cor} />
        </g>
      ))}
      {/* Quem está em cima leva o balão pra cima, o outro pra baixo: nunca se cruzam. */}
      {rotulos && series.map((s) => (
        <Balao key={s.nome} id={`${s.nome}-${pts === REAL ? "r" : "a"}`} foto={s.foto} cor={s.cor}
          x={x} y={yDe(s.v)} acima={s.v >= Math.max(vL, vF)} valor={s.v} />
      ))}
    </g>
  );
};

const Pico: React.FC<{ opacidade: number; rotulo: number }> = ({ opacidade, rotulo }) => {
  if (opacidade <= 0) return null;
  const x = xDe(PICO), y = yDe(REAL[PICO][1]);
  return (
    <g opacity={opacidade}>
      <circle cx={x} cy={y} r={26} fill={TEXTO} opacity={0.25} filter="url(#brilho)" />
      <circle cx={x} cy={y} r={13} fill="none" stroke={TEXTO} strokeWidth={3} />
      <circle cx={x} cy={y} r={5} fill={TEXTO} />
      <text x={x + 24} y={y - 34} fill={TEXTO} fillOpacity={rotulo} fontFamily={MONO} fontSize={30} {...CONTORNO} strokeOpacity={rotulo}>
        {br(REAL[PICO][1])}% · {REAL[PICO][2].replace(":", "h")}
      </text>
    </g>
  );
};

const Status: React.FC<{ esquerda: string; direita: string }> = ({ esquerda, direita }) => (
  <div style={{
    position: "absolute", top: 452, left: GX0, width: GX1 - GX0, display: "flex", justifyContent: "space-between",
    fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: TEXTO_2,
  }}>
    <span>{esquerda}</span><span>{direita}</span>
  </div>
);

/** Anel no ponto em que o Flávio cai abaixo de 50%, enquanto o relógio está parado. */
const Queda: React.FC<{ opacidade: number }> = ({ opacidade }) => {
  if (opacidade <= 0) return null;
  const x = xDe(CRUZA), y = yDe(REAL[CRUZA][1]);
  return (
    <g opacity={opacidade}>
      <circle cx={x} cy={y} r={30} fill={TEXTO} opacity={0.2} filter="url(#brilho)" />
      <circle cx={x} cy={y} r={18} fill="none" stroke={TEXTO} strokeWidth={3} />
    </g>
  );
};

const Grafico: React.FC = () => {
  const f = useCurrentFrame();
  const fase1 = f < T.mapa;
  const visivel = fase1
    ? 1 - entre(f, T.mapa, T.mapa + 15)
    : Math.min(entre(f, T.sorteadas - 10, T.sorteadas + 5), 1 - entre(f, T.gancho, T.gancho + 15))
      * Math.max(1 - entre(f, T.amostras, T.amostras + 15), entre(f, T.conclusao - 10, T.conclusao + 5));
  if (visivel <= 0) return null;

  // Fase 1, a apuração real: sobe até o pico, desce até o Flávio cair abaixo de 50%,
  // congela ali, e segue até 100%. Fase 2: a real fica apagada ao fundo e as mesmas
  // urnas sorteadas se desenham por cima.
  let ateReal = ULTIMO;
  if (fase1) {
    // O quadro 0 é a capa do reel (publicar.js usa thumb_offset 0): já abre com a linha no meio da subida.
    if (f < T.sobe) ateReal = PICO * (0.35 + 0.65 * entre(f, 0, 75, Easing.out(Easing.cubic)));
    else if (f < T.solta) ateReal = PICO + (CRUZA - PICO) * entre(f, T.sobe, T.congela, Easing.inOut(Easing.cubic));
    else ateReal = CRUZA + (ULTIMO - CRUZA) * entre(f, T.solta, T.fimReal);
  }
  const ateSort = ULTIMO * entre(f, T.sorteadas + 20, T.sorteadas + 260);

  const n = fase1 ? ateReal : ateSort;
  const pctUrnas = (Math.min(n, ULTIMO) + 1) / 10;
  const hora = REAL[Math.max(0, Math.floor(Math.min(n, ULTIMO)))][2].replace(":", "h");

  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda={fase1 ? `HORA ${hora}` : "URNAS SORTEADAS"} direita={`${br(pctUrnas)}% DAS URNAS`} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilho" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={7} /></filter>
        </defs>
        {/* A nota do 50% só aparece com o lado direito vazio, senão disputa espaço com os balões. */}
        <Eixos nota={fase1 ? 1 - entre(f, 95, 110) : entre(f, T.sorteadas, T.sorteadas + 15)} />
        <Linhas pts={REAL} ate={ateReal} opacidade={fase1 ? 1 : 0.3} rotulos={fase1} />
        <Pico opacidade={fase1 ? entre(f, 70, 80) : 0.5} rotulo={fase1 ? entre(f, 135, 145) : 1} />
        <Queda opacidade={fase1 ? janela(f, T.congela - 4, T.mapa) : 0} />
        {!fase1 && <Linhas pts={ALEATORIA} ate={ateSort} />}
      </svg>
    </AbsoluteFill>
  );
};

// --- mapa --------------------------------------------------------------------------------
// x, y, válidos, chegada de 25/50/75/100% dos votos, e quem liderava em cada um desses marcos
type Mun = [number, number, number, number, number, number, number, number, number, number, number];
const MUNS = dados.municipios as Mun[];
const raio = (v: number) => 1.4 + Math.sqrt(v) * 0.0058;
const COR_LIDER = [TEXTO_2, COR_LULA, COR_FLAVIO]; // 0 = outro candidato ou empate

const REGIOES: { cod: keyof typeof dados.regioes; nome: string }[] = [
  { cod: "S", nome: "SUL" }, { cod: "CO", nome: "CENTRO-OESTE" }, { cod: "N", nome: "NORTE" },
  { cod: "SE", nome: "SUDESTE" }, { cod: "NE", nome: "NORDESTE" },
];

const Mapa: React.FC = () => {
  const f = useCurrentFrame();
  // Os pontos somem de uma vez em T.sorteio: o <Sorteio> assume no mesmo lugar e os mistura.
  const visivel = Math.min(entre(f, T.mapa + 10, T.mapa + 30), 1 - entre(f, T.sorteio, T.sorteio + 20));
  if (visivel <= 0) return null;
  const pontos = f < T.sorteio;
  const p = 100 * entre(f, T.mapa + 30, T.mapa + 330);
  const i = Math.max(0, Math.min(ULTIMO, Math.round(p * 10) - 1));
  const regiao = (cod: keyof typeof dados.regioes) => {
    const s = dados.regioes[cod], k = Math.min(99, Math.floor(p));
    return s[k] + (s[k + 1] - s[k]) * (p - k);
  };
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda={`HORA ${REAL[i][2].replace(":", "h")}`} direita={`${br((i + 1) / 10)}% DAS URNAS`} />
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
        position: "absolute", top: 1250, left: GX0, width: GX1 - GX0, display: "flex", alignItems: "center", gap: 14,
        fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: TEXTO_2,
      }}>
        {[[FOTO_LULA, COR_LULA], [FOTO_FLAVIO, COR_FLAVIO]].map(([foto, cor]) => (
          <Img key={cor} src={foto} style={{ width: 52, height: 52, borderRadius: "50%", border: `4px solid ${cor}`, objectFit: "cover" }} />
        ))}
        <span style={{ marginLeft: 6 }}>COR = QUEM LIDERA NO MUNICÍPIO</span>
      </div>
      <div style={{ position: "absolute", top: 1330, left: GX0, width: GX1 - GX0 }}>
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
/** Permutação fixa (semente constante): o vídeo sai igual a cada render. */
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
const AX0 = 32, AX1 = 62; // % do Flávio no eixo
const xAm = (v: number) => GX0 + ((Math.min(AX1, Math.max(AX0, v)) - AX0) / (AX1 - AX0)) * (GX1 - GX0);
const LINHA_Y = [650, 830, 1010, 1190];
const ruido = (k: number) => {
  const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const Amostras: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(entre(f, T.amostras + 5, T.amostras + 20), 1 - entre(f, T.conclusao - 15, T.conclusao));
  if (o <= 0) return null;
  const xf = xAm(dados.final.flavio);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="CADA PONTO = 1 SORTEIO" direita="% DO FLÁVIO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={xf} x2={xf} y1={560} y2={1270} stroke={TEXTO} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="10 10" />
        <text x={xf} y={545} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={2}>
          RESULTADO FINAL {br(dados.final.flavio)}%
        </text>
        {dados.amostras.map((a, i) => {
          const de = T.amostras + 25 + i * 45;
          const y = LINHA_Y[i];
          return (
            <g key={a.urnas} opacity={entre(f, de, de + 10)}>
              <text x={GX0} y={y - 70} fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={2}>
                {a.urnas.toLocaleString("pt-BR")} URNAS
              </text>
              <text x={GX1} y={y - 70} textAnchor="end" fill={TEXTO} fontFamily={MONO} fontSize={30} letterSpacing={2}>
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
        <line x1={GX0} x2={GX1} y1={1290} y2={1290} stroke={TEXTO_2} strokeOpacity={0.5} />
        {[35, 40, 45, 50, 55, 60].map((v) => (
          <text key={v} x={xAm(v)} y={1336} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={26}>{v}%</text>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// --- texto -------------------------------------------------------------------------------
const Manchete: React.FC<{ de: number; ate: number; centro?: boolean; children: React.ReactNode }> = ({ de, ate, centro, children }) => {
  const f = useCurrentFrame();
  const o = janela(f, de, ate);
  if (o <= 0) return null;
  return (
    <div style={{
      position: "absolute", top: centro ? 780 : 170, left: 90, right: 90, opacity: o, textAlign: centro ? "center" : undefined, translate: `0 ${(1 - entre(f, de, de + 10)) * 14}px`,
      fontFamily: SORA, fontWeight: 300, fontSize: 64, lineHeight: 1.14, color: TEXTO, whiteSpace: "pre-line",
      letterSpacing: -0.5,
    }}>
      {children}
    </div>
  );
};

const Destaque: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: CIANO, fontWeight: 400 }}>{children}</span>
);

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{
      position: "absolute", top: 1665, width: "100%", textAlign: "center", opacity: 1 - entre(f, T.gancho, T.gancho + 15),
      fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2,
    }}>
      FONTE: TSE · BOLETINS DE URNA · 1º TURNO 2026
    </div>
  );
};

const Marca: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, T.marca, T.marca + 20);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
      <Img src={staticFile("ciencia/icone.png")} style={{ width: 300, height: 300 }} />
      <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 46, letterSpacing: "0.26em", color: TEXTO, marginTop: 24 }}>
        CIÊNCIA VISUAL
      </div>
    </AbsoluteFill>
  );
};

export const Apuracao: React.FC = () => {
  const finalF = br(dados.final.flavio);
  const aleat0 = br(ALEATORIA[0][1]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 48%, ${FUNDO_CENTRO} 0%, ${FUNDO} 70%)` }}>
      <Grafico />
      <Mapa />
      <Sorteio />
      <Amostras />
      <Manchete de={-10} ate={T.congela - 4}>Às 18h, ele estava{"\n"}<Destaque>eleito no 1º turno.</Destaque></Manchete>
      <Manchete de={T.congela} ate={T.fimReal - 4}>
        {REAL[CRUZA][2].replace(":", "h")}, com {Math.round((CRUZA + 1) / 10)}% das urnas:{"\n"}<Destaque>deixou de estar eleito.</Destaque>
      </Manchete>
      <Manchete de={T.fimReal} ate={T.mapa}>Terminou com <Destaque>{finalF.replace(/,\d$/, "")}%</Destaque>.{"\n"}Nenhum voto{"\n"}mudou de lado.</Manchete>
      <Manchete de={T.mapa + 35} ate={T.mapa + 205}><Destaque>Sul e Centro-Oeste</Destaque>{"\n"}chegaram antes.</Manchete>
      <Manchete de={T.mapa + 210} ate={T.sorteio - 4}>O <Destaque>Nordeste</Destaque>,{"\n"}por último.</Manchete>
      <Manchete de={T.sorteio + 5} ate={T.sorteadas}>E se as urnas chegassem{"\n"}sorteadas, misturando{"\n"}<Destaque>o país todo?</Destaque></Manchete>
      <Manchete de={T.sorteadas + 5} ate={T.amostras}>Com 500 urnas sorteadas:{"\n"}<Destaque>{aleat0}%</Destaque>. No fim: {finalF}%.</Manchete>
      <Manchete de={T.amostras + 5} ate={T.amostras + 115}>Quantas urnas sorteadas{"\n"}bastam pra acertar?</Manchete>
      <Manchete de={T.amostras + 120} ate={T.conclusao}>
        Com <Destaque>1.000 urnas</Destaque>, o erro{"\n"}já é de ±{br(dados.amostras[2].erro)} ponto.
      </Manchete>
      <Manchete de={T.conclusao + 5} ate={T.gancho}>A parcial não erra os votos.{"\n"}<Destaque>Erra a amostra.</Destaque></Manchete>
      <Manchete de={T.gancho + 5} ate={T.marca} centro>No 2º turno, a parcial{"\n"}também virou.{"\n"}<Destaque>Segue pra ver.</Destaque></Manchete>
      <Fonte />
      <Marca />
      {/* scripts/gerar-trilha-apuracao.mjs: os eventos sonoros caem nos quadros das cenas */}
      <Audio src={staticFile("ciencia/trilha-apuracao.mp3")} volume={0.8} />
    </AbsoluteFill>
  );
};
