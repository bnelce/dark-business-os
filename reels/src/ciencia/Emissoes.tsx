import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import dados from "./emissoes.json";
import T from "./emissoes-tempos.json";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, TEXTO, TEXTO_2, br } from "./tokens";

// "O Brasil polui diferente": emissões brutas de 2024 (SEEG 13). No mundo, três quartos vêm
// da energia; no Brasil, 20%. A maior fatia (42%) é mudança no uso da terra, quase toda
// desmatamento, e emitiu o dobro de todo o combustível queimado no país. Com a agropecuária,
// 71% saem do campo. As emissões caíram 16,7% e praticamente toda a queda foi na floresta.
// Os incêndios (241 Mt, recorde) ficam fora do inventário. Gancho: COP31, 9 a 20/11.
//
// Números: emissoes.json, transcritos do relatório do SEEG 13 e do Climate Watch / Our World in
// Data (fontes no arquivo). Tempos: emissoes-tempos.json (scripts/tempos-narracao.mjs). Os
// instantes dentro das falas (`seg`) foram medidos com silencedetect: regravou, medir de novo.
// O laranja (o único ponto quente da identidade) é só dos incêndios.

export const EMISSOES_TOTAL = T.total;
const F = T.fala;
const seg = (s: number) => Math.round(s * 30);
const CONTORNO = { stroke: FUNDO, strokeWidth: 10, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
const B = dados.brasil2024;
const SOMA_BR = Object.values(B).reduce((a, b) => a + b, 0);

// --- a grade: 100 quadrados, cada um 1% das emissões ------------------------------------
type Cat = "energia" | "processos" | "residuos" | "agropecuaria" | "usoDaTerra" | "campoMundo";
const COR: Record<Cat, [string, number]> = {
  energia: [TEXTO, 0.9], processos: [TEXTO_2, 0.9], residuos: [TEXTO_2, 0.45],
  agropecuaria: [CIANO, 0.42], usoDaTerra: [CIANO, 1], campoMundo: [CIANO, 0.7],
};
const NOME: Record<Cat, string> = {
  energia: "ENERGIA", processos: "PROCESSOS INDUSTRIAIS", residuos: "RESÍDUOS",
  agropecuaria: "AGROPECUÁRIA", usoDaTerra: "USO DA TERRA (DESMATAMENTO)", campoMundo: "AGROPECUÁRIA E USO DA TERRA",
};

/** Maiores restos: as fatias viram quadrados inteiros que somam 100. Ordem = de cima pra baixo. */
const grade = (partes: [Cat, number][]) => {
  const total = partes.reduce((s, [, v]) => s + v, 0);
  const q = partes.map(([c, v]) => ({ c, n: Math.floor((100 * v) / total), resto: ((100 * v) / total) % 1 }));
  [...q].sort((a, b) => b.resto - a.resto).slice(0, 100 - q.reduce((s, x) => s + x.n, 0)).forEach((x) => x.n++);
  return q.flatMap(({ c, n }) => Array<Cat>(n).fill(c));
};
const PARTES_BR: [Cat, number][] = [["energia", B.energia], ["processos", B.processos], ["residuos", B.residuos], ["agropecuaria", B.agropecuaria], ["usoDaTerra", B.usoDaTerra]];
const PARTES_MUNDO: [Cat, number][] = [["energia", dados.mundo.energia], ["processos", dados.mundo.processos], ["residuos", dados.mundo.residuos], ["campoMundo", dados.mundo.campo]];
const BRASIL = grade(PARTES_BR), MUNDO = grade(PARTES_MUNDO);
const LADO = 64, VAO = 8, GX = 540 - (10 * (LADO + VAO) - VAO) / 2, GY = 580;

/** Quanto cada categoria fica apagada (0 = normal, 1 = apagada), por fase da narração. */
const apagado = (f: number, c: Cat) => {
  const fases: [number, number, Cat[]][] = [
    [F.brasil + 40, F.floresta, ["energia"]],
    [F.floresta, F.dobro, ["usoDaTerra"]],
    [F.campo, F.queda, ["usoDaTerra", "agropecuaria"]],
    [F.conclusao, F.cta + 15, ["usoDaTerra", "agropecuaria"]],
  ];
  let a = 0;
  for (const [de, ate, aceso] of fases) if (!aceso.includes(c)) a = Math.max(a, 0.72 * janela(f, de, ate, 10));
  return a;
};

const CenaGrade: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = Math.max(
    1 - entre(f, F.dobro, F.dobro + 15),
    Math.min(entre(f, F.campo, F.campo + 15), 1 - entre(f, F.queda, F.queda + 15)),
    Math.min(entre(f, F.conclusao, F.conclusao + 15), 1 - entre(f, F.cta, F.cta + 15)),
  );
  if (visivel <= 0) return null;
  // Mundo na fala do mundo; volta pro Brasil na fala seguinte. Cada quadrado vira com um atraso,
  // de cima pra baixo, pra a troca de fatia se ver acontecendo.
  const mundo = (i: number) => Math.min(
    entre(f, F.mundo + 15 + i * 0.5, F.mundo + 27 + i * 0.5),
    1 - entre(f, F.brasil + 5 + i * 0.5, F.brasil + 17 + i * 0.5),
  );
  const noMundo = mundo(50) > 0.5;
  const legenda = (noMundo ? PARTES_MUNDO : PARTES_BR).slice().sort((a, b) => b[1] - a[1]);
  const totalLegenda = legenda.reduce((s, [, v]) => s + v, 0);
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda={noMundo ? "MUNDO" : "BRASIL · 2024"} direita="1 QUADRADO = 1%" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={8} /></filter>
        </defs>
        {BRASIL.map((cb, i) => {
          const x = GX + (i % 10) * (LADO + VAO), y = GY + Math.floor(i / 10) * (LADO + VAO);
          const w = mundo(i), cm = MUNDO[i];
          const [corB, oB] = COR[cb], [corM, oM] = COR[cm];
          const aB = 1 - apagado(f, cb), aM = 1 - apagado(f, cm);
          return (
            <g key={i}>
              <rect x={x} y={y} width={LADO} height={LADO} rx={6} fill={corB} opacity={oB * aB * (1 - w)} />
              {w > 0 && <rect x={x} y={y} width={LADO} height={LADO} rx={6} fill={corM} opacity={oM * aM * w} />}
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", top: 1330, left: X0, width: X1 - X0, fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: TEXTO }}>
        {legenda.map(([c, v]) => {
          const [cor, o] = COR[c];
          return (
            <div key={c} style={{ display: "flex", alignItems: "center", height: 44, opacity: 1 - apagado(f, c) * 0.8 }}>
              <span style={{ width: 22, height: 22, borderRadius: 4, background: cor, opacity: o, marginRight: 16 }} />
              <span style={{ flex: 1 }}>{NOME[c]}</span>
              <span>{br((100 * v) / totalLegenda)}%</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// --- barras: o desmatamento × todo o combustível do país -------------------------------
const BASE_Y = 1250, ALTURA = 600;
const COLUNAS = [{ x: 220, w: 220 }, { x: 640, w: 220 }];

const CenaDobro: React.FC = () => {
  const f = useCurrentFrame();
  const D = F.dobro;
  const visivel = Math.min(entre(f, D + 5, D + 20), 1 - entre(f, F.campo, F.campo + 15));
  if (visivel <= 0) return null;
  const escala = ALTURA / B.usoDaTerra;
  const barras = [
    { valor: B.usoDaTerra, nome: "USO DA TERRA", cor: CIANO, t: entre(f, D + seg(0.8), D + seg(0.8) + 25, Easing.out(Easing.cubic)) },
    { valor: B.energia, nome: "ENERGIA", cor: TEXTO, t: entre(f, D + seg(3.8), D + seg(3.8) + 25, Easing.out(Easing.cubic)) },
  ];
  const usos = [["CARROS", 6.23], ["CAMINHÕES", 6.96], ["USINAS", 7.83], ["INDÚSTRIAS", 8.65]] as const;
  const razao = entre(f, D + seg(4.6), D + seg(4.6) + 12);
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="BRASIL · 2024" direita="MILHÕES DE T DE CO₂e" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0} x2={X1} y1={BASE_Y} y2={BASE_Y} stroke={TEXTO_2} strokeOpacity={0.6} />
        {barras.map((b, k) => {
          const h = b.valor * escala * b.t, { x, w } = COLUNAS[k];
          if (b.t <= 0) return null;
          return (
            <g key={b.nome}>
              <rect x={x} y={BASE_Y - h} width={w} height={h} fill={b.cor} opacity={k === 0 ? 1 : 0.9} />
              <text x={x + w / 2} y={BASE_Y - h - 24} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={40}>{Math.round(b.valor * b.t)}</text>
              <text x={x + w / 2} y={BASE_Y + 46} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={2}>{b.nome}</text>
            </g>
          );
        })}
        {usos.map(([nome, s], i) => {
          const o = entre(f, D + seg(s), D + seg(s) + 8);
          return o > 0 && (
            <text key={nome} x={COLUNAS[1].x + COLUNAS[1].w / 2} y={BASE_Y - B.energia * escala + 50 + i * 54} textAnchor="middle" fill={FUNDO} fillOpacity={o}
              fontFamily={MONO} fontSize={26} letterSpacing={1}>{nome}</text>
          );
        })}
        {razao > 0 && (
          <text x={540} y={BASE_Y - ALTURA / 2} textAnchor="middle" fill={CIANO} fillOpacity={razao} fontFamily={MONO} fontSize={56} {...CONTORNO}>
            {br(B.usoDaTerra / B.energia)}×
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// --- 2023 × 2024: a queda foi na floresta, e os incêndios ficam fora --------------------
const TOTAL_2023 = Math.round(dados.total2024 / (1 - dados.quedaPct / 100));
const OUTROS_2023 = TOTAL_2023 - dados.usoDaTerra2023, OUTROS_2024 = dados.total2024 - B.usoDaTerra;

const CenaQueda: React.FC = () => {
  const f = useCurrentFrame();
  const Q = F.queda;
  const visivel = Math.min(entre(f, Q + 5, Q + 20), 1 - entre(f, F.conclusao, F.conclusao + 15));
  if (visivel <= 0) return null;
  const escala = 560 / TOTAL_2023;
  const t24 = entre(f, Q + seg(1.66), Q + seg(1.66) + 30, Easing.inOut(Easing.cubic));
  const floresta = janela(f, Q + seg(5.42), F.fogo, 10);
  const fogo = f >= F.fogo;
  const fogoO = entre(f, F.fogo + seg(2.8), F.fogo + seg(2.8) + 15);
  const fogoNum = entre(f, F.fogo + seg(5.1), F.fogo + seg(5.1) + 10);
  const fora = entre(f, F.fogo + seg(9.36), F.fogo + seg(9.36) + 10);
  const coluna = (k: number, outros: number, uso: number, ano: string, total: number, o: number) => {
    const { x, w } = COLUNAS[k];
    const hO = outros * escala, hU = uso * escala;
    return (
      <g opacity={o}>
        <rect x={x} y={BASE_Y - hO} width={w} height={hO} fill={TEXTO_2} opacity={0.75} />
        <rect x={x} y={BASE_Y - hO - hU} width={w} height={hU} fill={CIANO} />
        {floresta > 0 && <rect x={x - 6} y={BASE_Y - hO - hU - 6} width={w + 12} height={hU + 12} fill="none" stroke={TEXTO} strokeWidth={3} opacity={floresta} />}
        <text x={x + w / 2} y={BASE_Y - hO - hU - 26} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={36}>{br(total / 1000, 2)} BI</text>
        <text x={x + w / 2} y={BASE_Y + 46} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2}>{ano}</text>
      </g>
    );
  };
  const uso24 = dados.usoDaTerra2023 + (B.usoDaTerra - dados.usoDaTerra2023) * t24;
  const total24 = OUTROS_2023 + (OUTROS_2024 - OUTROS_2023) * t24 + uso24;
  const { x: x24, w: w24 } = COLUNAS[1];
  // O bloco dos incêndios fica acima do rótulo do total de 2024, pra não cobrir o número.
  const topo24 = BASE_Y - (OUTROS_2024 + B.usoDaTerra) * escala - 70;
  const hFogo = dados.incendios2024 * escala;
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda={fogo ? "BRASIL · 2024" : "BRASIL · BRUTAS"} direita="T DE CO₂e" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0} x2={X1} y1={BASE_Y} y2={BASE_Y} stroke={TEXTO_2} strokeOpacity={0.6} />
        {coluna(0, OUTROS_2023, dados.usoDaTerra2023, "2023", TOTAL_2023, fogo ? 1 - 0.7 * entre(f, F.fogo, F.fogo + 15) : 1)}
        {t24 > 0 && coluna(1, OUTROS_2023 + (OUTROS_2024 - OUTROS_2023) * t24, uso24, "2024", total24, 1)}
        {t24 >= 1 && !fogo && (
          <text x={540} y={BASE_Y - 640} textAnchor="middle" fill={CIANO} fontFamily={MONO} fontSize={44} {...CONTORNO}>−{br(dados.quedaPct)}%</text>
        )}
        {fogoO > 0 && (
          <g opacity={fogoO}>
            <rect x={x24} y={topo24 - hFogo} width={w24} height={hFogo} fill={LARANJA} opacity={0.3} />
            <rect x={x24} y={topo24 - hFogo} width={w24} height={hFogo} fill="none" stroke={LARANJA} strokeWidth={4} strokeDasharray="12 8" />
            <text x={x24 + w24 / 2} y={topo24 - hFogo - 56} textAnchor="middle" fill={LARANJA} fillOpacity={fogoNum} fontFamily={MONO} fontSize={32} {...CONTORNO}>
              INCÊNDIOS: {dados.incendios2024} MI T
            </text>
            <text x={x24 + w24 / 2} y={topo24 - hFogo - 18} textAnchor="middle" fill={TEXTO} fillOpacity={fora} fontFamily={MONO} fontSize={26} letterSpacing={2} {...CONTORNO}>
              FORA DO TOTAL
            </text>
          </g>
        )}
      </svg>
      <div style={{ position: "absolute", top: 1330, left: X0, width: X1 - X0, fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: TEXTO }}>
        {[[CIANO, 1, "USO DA TERRA (DESMATAMENTO)"], [TEXTO_2, 0.75, "OUTROS SETORES"]].map(([cor, o, nome]) => (
          <div key={nome as string} style={{ display: "flex", alignItems: "center", height: 44 }}>
            <span style={{ width: 22, height: 22, borderRadius: 4, background: cor as string, opacity: o as number, marginRight: 16 }} />
            <span>{nome as string}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é audio/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(T.fala).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/emissoes/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Emissoes: React.FC = () => (
  <Fundo>
    <CenaGrade />
    <CenaDobro />
    <CenaQueda />
    <Manchete de={-10} ate={F.mundo - 4}>O Brasil polui diferente{"\n"}<Destaque>do resto do mundo.</Destaque></Manchete>
    <Manchete de={F.mundo} ate={F.brasil - 4}>No mundo,{"\n"}3 de cada 4 toneladas{"\n"}<Destaque>vêm da energia.</Destaque></Manchete>
    <Manchete de={F.brasil} ate={F.floresta - 4}>No Brasil, a energia{"\n"}<Destaque>é só {Math.round((100 * B.energia) / SOMA_BR)}%.</Destaque></Manchete>
    <Manchete de={F.floresta} ate={F.dobro - 4}><Destaque>{Math.round((100 * B.usoDaTerra) / SOMA_BR)}% vêm de{"\n"}derrubar floresta.</Destaque></Manchete>
    <Manchete de={F.dobro} ate={F.campo - 4}>Desmatamento: <Destaque>o dobro</Destaque>{"\n"}de todo o combustível{"\n"}do país.</Manchete>
    <Manchete de={F.campo} ate={F.queda - 4}>Com a agropecuária,{"\n"}<Destaque>{Math.round((100 * (B.usoDaTerra + B.agropecuaria)) / SOMA_BR)}% vêm do campo.</Destaque></Manchete>
    <Manchete de={F.queda} ate={F.fogo - 4}>Em 2024, as emissões{"\n"}<Destaque>caíram {br(dados.quedaPct)}%.</Destaque></Manchete>
    <Manchete de={F.fogo} ate={F.conclusao - 4}>Incêndios: {dados.incendios2024} milhões de t,{"\n"}<Destaque cor={LARANJA}>fora da conta.</Destaque></Manchete>
    <Manchete de={F.conclusao} ate={F.cta - 4}>Na COP31, a chaminé{"\n"}<Destaque>do Brasil é a floresta.</Destaque></Manchete>
    <Manchete de={F.cta} ate={T.marca} centro>Segue pra ver a ciência{"\n"}<Destaque>escondida nos dados.</Destaque></Manchete>
    <Fonte texto="FONTE: SEEG 13 · CLIMATE WATCH / OUR WORLD IN DATA" ate={F.cta} />
    <Marca de={T.marca} />
    <Narracao />
    {/* scripts/gerar-trilha-narrada.mjs: por baixo da voz, como no reel da apuração */}
    <Audio src={staticFile("ciencia/trilha-emissoes.mp3")} volume={0.22} />
  </Fundo>
);
