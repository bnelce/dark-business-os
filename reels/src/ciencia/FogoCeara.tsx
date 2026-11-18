import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import dados from "./fogo-ceara.json";
import T from "./fogo-ceara-tempos.json";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre, janela } from "./base";
import { BrilhoIlustra, Calendario, Caatinga, Nuvem, Satelite, SateliteStatus, Sol, Visada, Neon } from "./ilustra-fogo-ceara";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";

// "O fogo do Ceará ainda nem começou", com narração: no fim de outubro, em média 72% dos
// focos do ano ainda estão por vir. 86% do fogo cai entre outubro e dezembro, o fim da
// estação seca, antes da quadra chuvosa de fevereiro a maio. Média de 2003 a 2025,
// satélite de referência do INPE (AQUA_M-T); o mapa de outubro de 2026 usa o GOES-19.
//
// Números: fogo-ceara.json (scripts/gerar-fogo-ce.mjs, que confere a série contra a conta
// feita à parte). Tempos: fogo-ceara-tempos.json (scripts/tempos-fogo-ceara.mjs, a partir
// da duração de cada fala). A trilha lê os mesmos tempos.
//
// O laranja é o fogo; o resto fica no ciano e no escuro da marca. O relógio do ano usa a
// linguagem de instrumento do design guide (anel, marcações, ponteiro), e as ilustrações
// de traço fino estão em ilustra-fogo-ceara.tsx.

export const FOGO_CEARA_TOTAL = T.total;
const F = T.fala;

const pct = (v: number) => `${Math.round(v * 100)}%`;
const milhar = (n: number) => n.toLocaleString("pt-BR");
const TOTAL = dados.total as Record<string, number>;

const BrilhoDefs: React.FC = () => (
  <defs>
    <filter id="fogoCE" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={6} /></filter>
    <BrilhoIlustra />
  </defs>
);

const Mapa: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <BrilhoDefs />
    <clipPath id="quadroCE"><rect x={0} y={500} width={1080} height={840} /></clipPath>
    <g clipPath="url(#quadroCE)">
      {dados.vizinhos.map((p, k) => <path key={k} d={p} fill="none" stroke={CIANO} strokeOpacity={0.14} strokeWidth={1} />)}
    </g>
    <path d={dados.contorno} fill="none" stroke={TEXTO} strokeOpacity={0.7} strokeWidth={1.8} />
    {children}
  </svg>
);

/** O satélite pequeno fica à esquerda de "SATÉLITE AQUA" na linha de status (JetBrains
 *  Mono 30 px + 3 de espaçamento ≈ 21 px por letra, alinhado em X1). */
const X_SAT_STATUS = X1 - 13 * 21 - 34;

// --- cenas 1 e 2: outubro de 2026 -----------------------------------------------------------
// Três focos de outubro escolhidos pela posição (o mais perto de cada ponto do interior),
// só pra ter onde a visada do satélite pousar.
const OUT = dados.outubro2026 as [number, number][];
const ALVOS = ([[470, 880], [620, 1130], [380, 1120]] as const).map(([tx, ty]) =>
  OUT.reduce((m, p) => ((p[0] - tx) ** 2 + (p[1] - ty) ** 2 < (m[0] - tx) ** 2 + (m[1] - ty) ** 2 ? p : m)));
const SAT_OUT: [number, number] = [850, 640];

const Outubro: React.FC = () => {
  const f = useCurrentFrame();
  const o = 1 - entre(f, T.relogio - 10, T.relogio + 5);
  if (o <= 0) return null;
  const pulso = 0.75 + 0.25 * Math.sin(f / 6);
  const sat = entre(f, F.foco - 6, F.foco + 40, Easing.out(Easing.cubic));
  const visada = entre(f, F.foco + 30, F.foco + 90);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="CEARÁ · OUTUBRO 2026" direita="GOES-19" />
      <Mapa>
        {[true, false].map((halo) => (
          <g key={String(halo)} filter={halo ? "url(#fogoCE)" : undefined} opacity={halo ? 0.7 : 1}>
            {OUT.map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r={halo ? 9 : 3.5} fill={LARANJA} opacity={pulso} />
            ))}
          </g>
        ))}
        {/* "É um ponto quente que o satélite enxerga do espaço" */}
        <Visada de={[SAT_OUT[0], SAT_OUT[1] + 26]} alvos={ALVOS} p={visada} />
        <Satelite x={SAT_OUT[0]} y={SAT_OUT[1]} escala={1.3} p={sat} />
      </Mapa>
    </AbsoluteFill>
  );
};

// --- cenas 3 a 6: o relógio do ano --------------------------------------------------------
const CX = 540, CY = 920, R0 = 160, RMAX = 270;
const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const INICIO_MES = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
const ang = (dia: number) => (dia / 365) * 2 * Math.PI - Math.PI / 2; // janeiro no topo
const ponto = (a: number, r: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];

// Sol e nuvem ficam dentro do anel, onde as barras são curtas: a nuvem no meio da quadra
// chuvosa (fev–mai), o sol no meio do segundo semestre seco, onde as barras começam a
// crescer. Assim o anel explica o porquê sem mais texto.
const R_TEMPO = 300;
// A nuvem um pouco mais pra dentro: o rótulo QUADRA CHUVOSA tem que acabar antes de X1.
const [NUV_X, NUV_Y] = ponto(ang((INICIO_MES[1] + INICIO_MES[5]) / 2), R_TEMPO - 22);
const [SOL_X, SOL_Y] = ponto(ang(INICIO_MES[8] + 15), R_TEMPO);
const R_CHUVA = R0 + 26;
const arco = (d0: number, d1: number, r: number) => {
  const [x0, y0] = ponto(ang(d0), r), [x1, y1] = ponto(ang(d1), r);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
};

/** Número do centro do relógio, com rótulo; troca com fade curto. */
const Centro: React.FC<{ f: number; de: number; ate: number; valor: string; rotulo: string }> = ({ f, de, ate, valor, rotulo }) => {
  const o = janela(f, de, ate, 10);
  if (o <= 0) return null;
  return (
    <div style={{
      position: "absolute", left: CX - 100, top: CY - 62, width: 200, textAlign: "center",
      fontFamily: SORA, fontWeight: 400, fontSize: 64, lineHeight: 1, color: LARANJA, opacity: o,
    }}>
      {valor}
      <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: 2, color: TEXTO_2, marginTop: 10, whiteSpace: "pre-line", lineHeight: 1.3 }}>{rotulo}</div>
    </div>
  );
};

const Relogio: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(entre(f, T.relogio - 5, T.relogio + 15), 1 - entre(f, T.mapa23 - 15, T.mapa23));
  if (o <= 0) return null;
  const maxS = Math.max(...dados.porSemana);
  // Ponteiro parado em 1/jan até "Hoje é 28 de outubro"; corre até hoje com a frase e,
  // em "só novembro e dezembro", anda de hoje a 31/dez.
  const avanca = F["nov-dez"];
  const dia = f < avanca
    ? dados.diaHoje * entre(f, F.hoje - 8, T.hojeChega, Easing.inOut(Easing.cubic))
    : dados.diaHoje + (364 - dados.diaHoje) * entre(f, avanca + 4, T.pct67 + 20, Easing.inOut(Easing.cubic));
  const fatia = entre(f, T.pct86 - 15, T.pct86 + 5); // out-dez acende com "86%"
  const aHoje = ang(dados.diaHoje), aP = ang(dia);
  const [px, py] = ponto(aP, R0 + RMAX + 30);
  const [hx, hy] = ponto(aHoje, R0 + RMAX + 62);
  const hoje = entre(f, T.hojeChega - 6, T.hojeChega + 6);
  // Some de novo depois de chegar a 31/dez, pelo mesmo motivo: a ponta volta pro topo.
  const ponteiro = Math.min(entre(f, F.hoje - 14, F.hoje - 4), 1 - entre(f, T.pct67 + 28, T.pct67 + 42));
  // Sol e nuvem: desenham com a fala da seca e ficam como pano de fundo depois.
  const tempoOp = 1 - 0.55 * entre(f, F.hoje, F.hoje + 15);
  const sol = entre(f, F.seca, F.seca + 40);
  const nuvem = entre(f, T.chuva, T.chuva + 40);
  const rotuloTempo = entre(f, F.seca + 30, F.seca + 45) * (1 - entre(f, F.hoje, F.hoje + 15));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="MÉDIA 2003–2025" direita="SATÉLITE AQUA" />
      <SateliteStatus x={X_SAT_STATUS} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <BrilhoDefs />
        <circle cx={CX} cy={CY} r={R0} fill="none" stroke={TEXTO_2} strokeOpacity={0.4} />
        <circle cx={CX} cy={CY} r={R0 + RMAX} fill="none" stroke={TEXTO_2} strokeOpacity={0.12} strokeDasharray="4 8" />
        {dados.porSemana.map((n, s) => {
          const a = ang(s * 7 + 3.5);
          const cresce = entre(f, T.relogio + 5 + s * 1.2, T.relogio + 25 + s * 1.2, Easing.out(Easing.cubic));
          const r1 = R0 + 4 + (n / maxS) * RMAX * cresce;
          const [x0, y0] = ponto(a, R0 + 4), [x1, y1] = ponto(a, r1);
          const quente = s * 7 >= INICIO_MES[9];
          const passou = s * 7 + 3.5 <= dia;
          const cor = quente ? LARANJA : TEXTO_2;
          const op = quente ? 0.35 + 0.65 * fatia * (passou || f < avanca ? 1 : 0.55) : passou ? 0.75 : 0.4;
          return <line key={s} x1={x0} y1={y0} x2={x1} y2={y1} stroke={cor} strokeWidth={9} strokeLinecap="butt" opacity={op} />;
        })}
        {MESES.map((m, i) => {
          const [x, y] = ponto(ang(INICIO_MES[i] + 15), R0 - 34);
          const [t0x, t0y] = ponto(ang(INICIO_MES[i]), R0 - 6), [t1x, t1y] = ponto(ang(INICIO_MES[i]), R0 + 6);
          return (
            <g key={m}>
              <line x1={t0x} y1={t0y} x2={t1x} y2={t1y} stroke={TEXTO_2} strokeOpacity={0.6} />
              <text x={x} y={y + 8} textAnchor="middle" fill={i >= 9 ? LARANJA : TEXTO_2} fontFamily={MONO} fontSize={22}>{m}</text>
            </g>
          );
        })}
        {/* tempo: o sol com "estação seca", a nuvem com "quadra chuvosa", o arco fev–mai com "de fevereiro a maio" */}
        <Sol x={SOL_X} y={SOL_Y} p={sol} op={tempoOp} escala={1.3} />
        <Nuvem x={NUV_X} y={NUV_Y} p={nuvem} op={tempoOp} escala={1.3} />
        <Neon d={arco(INICIO_MES[1], INICIO_MES[5], R_CHUVA)} cor={CIANO} w={2} p={entre(f, T.fevMai, T.fevMai + 45)} op={tempoOp} />
        <Neon d={[INICIO_MES[1], INICIO_MES[5]].map((d) => { const [a0, b0] = ponto(ang(d), R_CHUVA - 8), [a1, b1] = ponto(ang(d), R_CHUVA + 8); return `M ${a0} ${b0} L ${a1} ${b1}`; }).join(" ")}
          cor={CIANO} w={2} p={entre(f, T.fevMai + 35, T.fevMai + 50)} op={tempoOp} />
        <g opacity={rotuloTempo}>
          <text x={SOL_X} y={SOL_Y + 92} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={21} letterSpacing={2}
            stroke={FUNDO} strokeWidth={6} paintOrder="stroke">SECA</text>
          <text x={NUV_X} y={NUV_Y + 100} textAnchor="middle" fill={CIANO} fontFamily={MONO} fontSize={21} letterSpacing={2}
            stroke={FUNDO} strokeWidth={6} paintOrder="stroke" opacity={entre(f, T.chuva + 15, T.chuva + 30)}>QUADRA CHUVOSA</text>
        </g>
        {/* marca de hoje, fixa */}
        <line x1={ponto(aHoje, R0)[0]} y1={ponto(aHoje, R0)[1]} x2={ponto(aHoje, R0 + RMAX + 40)[0]} y2={ponto(aHoje, R0 + RMAX + 40)[1]}
          stroke={TEXTO} strokeOpacity={0.5 * hoje} strokeDasharray="6 6" />
        {/* opacidade no grupo: com fillOpacity só no texto, o contorno escuro aparece antes das letras */}
        <g opacity={hoje}>
          <text x={Math.max(X0 - 40, hx - 90)} y={hy - 14} textAnchor="start" fill={TEXTO} fontFamily={MONO} fontSize={26}
            stroke={FUNDO} strokeWidth={8} paintOrder="stroke">HOJE · 28 OUT</text>
        </g>
        {/* ponteiro: só aparece enquanto anda. Em 1/jan ou 31/dez a ponta cairia na linha de status */}
        <g opacity={ponteiro}>
          <line x1={CX} y1={CY} x2={px} y2={py} stroke={TEXTO} strokeWidth={2.5} />
          <circle cx={px} cy={py} r={9} fill={TEXTO} />
        </g>
        <circle cx={CX} cy={CY} r={R0 - 60} fill={FUNDO} />
      </svg>
      <Centro f={f} de={T.pct86 - 10} ate={T.pct72} valor={pct(dados.pctOutDez)} rotulo={"DO FOGO DO ANO\nENTRE OUT E DEZ"} />
      <Centro f={f} de={T.pct72} ate={T.pct67} valor={pct(dados.pctFalta)} rotulo={"AINDA ESTÁ\nPOR VIR"} />
      <Centro f={f} de={T.pct67} ate={T.mapa23 + 20} valor={pct(dados.pctNovDez)} rotulo={"SÓ EM NOV\nE DEZ"} />
    </AbsoluteFill>
  );
};

// --- cenas 7 e 8: 23 anos de fogo no mapa ---------------------------------------------------
type Cel = number[]; // x, y, focos em 2003..2025
const CELS = dados.mapa23 as Cel[];
// Intensidade em escala log relativa à célula mais densa dos 23 anos: em escala absoluta
// o estado inteiro satura e some a diferença entre onde queima muito e onde queima pouco.
const LOG_MAX = Math.log1p(Math.max(...CELS.map((c) => c.slice(2).reduce((x, y) => x + y, 0))));

/** Posição de cada rótulo: o primeiro lado (direita, esquerda, acima, abaixo) que não
 *  encosta em rótulo já colocado nem no ponto de outro município. */
type Caixa = { x0: number; y0: number; x1: number; y1: number };
const ROTULOS = (() => {
  const feitas: Caixa[] = [];
  return dados.topo.map((m, i) => {
    const w = (`${i + 1} ${m.nome}`.length) * 26 * 0.6 + 6, h = 30;
    const opcoes = [
      { x: m.x + 14, y: m.y + 9, ancora: "start" as const, c: { x0: m.x + 10, y0: m.y - 15, x1: m.x + 14 + w, y1: m.y + 15 } },
      { x: m.x - 14, y: m.y + 9, ancora: "end" as const, c: { x0: m.x - 14 - w, y0: m.y - 15, x1: m.x - 10, y1: m.y + 15 } },
      { x: m.x, y: m.y - 20, ancora: "middle" as const, c: { x0: m.x - w / 2, y0: m.y - 20 - h, x1: m.x + w / 2, y1: m.y - 12 } },
      { x: m.x, y: m.y + 40, ancora: "middle" as const, c: { x0: m.x - w / 2, y0: m.y + 14, x1: m.x + w / 2, y1: m.y + 44 } },
    ];
    const bate = (c: Caixa) => feitas.some((o) => c.x0 < o.x1 && c.x1 > o.x0 && c.y0 < o.y1 && c.y1 > o.y0)
      || dados.topo.some((o) => o !== m && o.x > c.x0 - 8 && o.x < c.x1 + 8 && o.y > c.y0 - 8 && o.y < c.y1 + 8);
    const escolha = opcoes.find((op) => !bate(op.c)) ?? opcoes[0];
    feitas.push(escolha.c);
    return escolha;
  });
})();

const VinteTresAnos: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(entre(f, T.mapa23 - 5, T.mapa23 + 15), 1 - entre(f, T.tendencia - 15, T.tendencia));
  if (o <= 0) return null;
  // Os 23 anos acumulam durante a fala do mapa; os municípios acendem um a um, cada um
  // quando a voz diz o nome.
  const anos = 23 * entre(f, T.mapa23 + 20, F.sertao, Easing.inOut(Easing.quad));
  const k = Math.floor(anos), resto = anos - k;
  const anoRotulo = Math.min(2025, 2003 + Math.max(0, Math.ceil(anos) - 1));
  const intensidade = CELS.map((c) => {
    let n = 0;
    for (let a = 0; a < k; a++) n += c[2 + a];
    if (k < 23) n += c[2 + k] * resto;
    return n > 0 ? Math.log1p(n) / LOG_MAX : 0;
  });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda={`2003 → ${anoRotulo}`} direita="SATÉLITE AQUA" />
      <SateliteStatus x={X_SAT_STATUS} />
      <Mapa>
        {[true, false].map((halo) => (
          <g key={String(halo)} filter={halo ? "url(#fogoCE)" : undefined} opacity={halo ? 0.4 : 1}>
            {CELS.map((c, i) => {
              const v = intensidade[i];
              if (v <= 0) return null;
              return <circle key={i} cx={c[0]} cy={c[1]} r={(halo ? 2.4 : 1) * (1.2 + 3.2 * v)} fill={v > 0.85 ? "#FFD2B0" : LARANJA} opacity={0.08 + 0.92 * v ** 2.2} />;
            })}
          </g>
        ))}
        {dados.topo.map((m, i) => (
          <g key={m.nome} opacity={entre(f, T.nomes[i] - 4, T.nomes[i] + 8)}>
            <circle cx={m.x} cy={m.y} r={7} fill={TEXTO} />
            <text x={ROTULOS[i].x} y={ROTULOS[i].y} textAnchor={ROTULOS[i].ancora} fill={TEXTO} fontFamily={MONO} fontSize={26}
              stroke={FUNDO} strokeWidth={8} paintOrder="stroke">
              {i + 1} {m.nome.toUpperCase()}
            </text>
          </g>
        ))}
        {/* o sertão em traço: chão, mandacaru, caatinga seca — entra com "onde mais queima" */}
        <Caatinga p={entre(f, F.sertao - 10, F.sertao + 80, Easing.out(Easing.quad))} />
      </Mapa>
    </AbsoluteFill>
  );
};

// --- cena 9: totais anuais ----------------------------------------------------------------
const BY0 = 600, BY1 = 1290, BMAX = 12000;
const yBar = (n: number) => BY1 - (n / BMAX) * (BY1 - BY0);

const Tendencia: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, T.tendencia, T.fecho, 12);
  if (o <= 0) return null;
  const anos = dados.anos;
  const passo = (X1 - X0) / anos.length, larg = passo * 0.68;
  const minAno = anos.reduce((m, a) => (TOTAL[a] < TOTAL[m] ? a : m), anos[0]);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="FOCOS POR ANO" direita="SATÉLITE AQUA" />
      <SateliteStatus x={X_SAT_STATUS} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <BrilhoDefs />
        {[5000, 10000].map((v) => (
          <g key={v}>
            <line x1={X0} x2={X1} y1={yBar(v)} y2={yBar(v)} stroke={TEXTO_2} strokeOpacity={0.2} />
            <text x={X0 - 14} y={yBar(v) + 9} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24}>{milhar(v)}</text>
          </g>
        ))}
        <line x1={X0} x2={X1} y1={BY1} y2={BY1} stroke={TEXTO_2} strokeOpacity={0.5} />
        {anos.map((a, i) => {
          const ultimo = i === anos.length - 1;
          const de = T.tendencia + 15 + i * 6;
          const p = entre(f, de, de + 22, Easing.out(Easing.cubic));
          const x = X0 + i * passo + (passo - larg) / 2;
          const y = yBar(TOTAL[a] * p);
          const marcado = ultimo || a === minAno || a === dados.piorDesde;
          return (
            <g key={a}>
              {ultimo && <rect x={x - 4} y={y - 4} width={larg + 8} height={BY1 - y + 4} fill={LARANJA} opacity={0.35} filter="url(#fogoCE)" />}
              <rect x={x} y={y} width={larg} height={BY1 - y} fill={ultimo ? LARANJA : TEXTO_2} opacity={ultimo ? 1 : marcado ? 0.8 : 0.45} />
              {(i === 0 || a === 2010 || a === 2015 || a === 2020 || ultimo) && (
                <text x={x + larg / 2} y={BY1 + 42} textAnchor="middle" fill={ultimo ? LARANJA : TEXTO_2} fontFamily={MONO} fontSize={24}>{a}</text>
              )}
              {marcado && p > 0.95 && (
                <text x={ultimo ? x + larg : x + larg / 2} y={y - 18} textAnchor={ultimo ? "end" : "middle"} fill={ultimo ? LARANJA : TEXTO}
                  fontFamily={MONO} fontSize={28} stroke={FUNDO} strokeWidth={8} paintOrder="stroke">
                  {milhar(TOTAL[a])}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// --- cenas 10 e 11: novembro começa domingo ---------------------------------------------------
const Fecho: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, T.fecho, T.fecho + 12);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><BrilhoIlustra /></defs>
        <Calendario p={entre(f, T.fecho + 4, F.fecho + 50, Easing.out(Easing.quad))} destaque={entre(f, F.fecho + 35, F.fecho + 50)}
          pulso={Math.sin(f / 7)} />
      </svg>
    </AbsoluteFill>
  );
};

/** Uma fala por beat do roteiro.json, cada uma no quadro calculado pelos tempos. */
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/fogo-ceara/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const FogoCeara: React.FC = () => (
  <Fundo>
    <Outubro />
    <Relogio />
    <VinteTresAnos />
    <Tendencia />
    <Fecho />
    <Manchete de={-10} ate={F.foco - 4}>O fogo do Ceará{"\n"}<Destaque cor={LARANJA}>ainda nem começou.</Destaque></Manchete>
    <Manchete de={F.foco} ate={T.relogio}>Um foco não é{"\n"}<Destaque>um incêndio.</Destaque></Manchete>
    <Manchete de={F.relogio} ate={F.seca - 4}><Destaque cor={LARANJA}>{pct(dados.pctOutDez)} do fogo do ano</Destaque>{"\n"}vem entre outubro{"\n"}e dezembro.</Manchete>
    <Manchete de={F.seca} ate={F.hoje - 4}>Fim da estação seca,{"\n"}antes da <Destaque>quadra{"\n"}chuvosa.</Destaque></Manchete>
    <Manchete de={F.hoje} ate={F["nov-dez"] - 4}>Hoje, 28 de outubro:{"\n"}<Destaque cor={LARANJA}>{pct(dados.pctFalta)} ainda está{"\n"}por vir.</Destaque></Manchete>
    <Manchete de={F["nov-dez"]} ate={T.mapa23}>Novembro e dezembro:{"\n"}<Destaque cor={LARANJA}>2 em cada 3 focos.</Destaque></Manchete>
    <Manchete de={T.mapa23 + 5} ate={F.sertao - 4}>23 anos de focos{"\n"}<Destaque cor={LARANJA}>no mesmo mapa.</Destaque></Manchete>
    <Manchete de={F.sertao} ate={T.tendencia}>Onde mais queima:{"\n"}<Destaque cor={LARANJA}>o sertão.</Destaque></Manchete>
    <Manchete de={T.tendencia + 5} ate={T.fecho}>E vem subindo: 2025 foi{"\n"}<Destaque cor={LARANJA}>o pior ano desde {dados.piorDesde}.</Destaque></Manchete>
    <Manchete de={T.fecho + 5} ate={F.cta - 4}>Novembro começa{"\n"}<Destaque cor={LARANJA}>domingo.</Destaque></Manchete>
    <Manchete de={F.cta} ate={T.marca}>Segue pra ver a ciência{"\n"}<Destaque>escondida nos dados.</Destaque></Manchete>
    <Fonte texto="FONTE: INPE · PROGRAMA QUEIMADAS · 2003–2026" ate={T.marca} />
    <Marca de={T.marca} />
    <Narracao />
    {/* scripts/gerar-trilha-fogo-ce.mjs: os eventos sonoros caem nos quadros dos tempos, por baixo da voz */}
    <Audio src={staticFile("ciencia/trilha-fogo-ce.mp3")} volume={0.22} />
  </Fundo>
);
