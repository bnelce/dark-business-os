import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./brasil-miniatura.json";
import T from "./brasil-miniatura-tempos.json";
import { Fundo, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon, traco } from "./ilustra-dolar";

// "Brasil em miniatura" (29/10/2026). Ananindeua (PA) ficou em média a 1,7 ponto do
// resultado nacional nos 7 segundos turnos desde 2002, 1ª de 5.563 cidades, e errou o
// vencedor só em 2022, por meio ponto. No Censo ela não se parece com o país; a que se
// parece (Mossoró) votou quase 12 pontos fora. O campeão de um ano erra no seguinte
// (Pedreira, 2002 → 2026). Minas acertou os 7, e 67 das 107 cidades que acertaram os 7
// são mineiras. Fecha com a miniatura de cada estado.
//
// Embalagem (viralizacao.md, seção 8): o quadro 0 já tem o mapa encolhendo até Ananindeua
// e o "24 ANOS" gigante; palco de dados no meio e todo texto no terço de baixo (y 1170–1550,
// longe da legenda do IG e dos botões); legenda sincronizada com a voz, 2 a 4 palavras, chave
// em laranja; algo muda a cada 2 a 4s; números digitados com tique; uma pergunta abre a
// segunda metade; o fim volta a encolher o mapa até o quadro 0 pra emendar o loop.
//
// Números: brasil-miniatura.json (scripts/gerar-miniatura.mjs, que confere cada número da
// fala). Tempos: brasil-miniatura-tempos.json (scripts/tempos-miniatura.mjs). A trilha
// (scripts/gerar-trilha-miniatura.mjs) lê os mesmos tempos.
// Tema político: os dois candidatos sempre na mesma cor e com o mesmo tratamento; laranja é
// só Ananindeua (e o foco de cada cena); nenhuma causa, nenhum adjetivo sobre região ou eleitor.

export const MINIATURA_TOTAL = T.total;
const F = T.fala;
const M = T.m;

const br = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");
const CONTORNO = { stroke: FUNDO, strokeWidth: 8, paintOrder: "stroke" as const };
const STATUS_TOP = 330;
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const limita = (v: number) => Math.min(1, Math.max(0, v));
const G0 = T.grande[0].f; // primeira palavra da pergunta final
const FIM = T.total - T.colapso.fim; // começa o mapa encolhendo de novo

/** Zoom de câmera: escala `s` em volta de P, levando P até `alvo` quando s chega em `sMax`. */
const camera = (s: number, sMax: number, P: [number, number], alvo: [number, number]) => {
  const k = sMax === 1 ? 0 : (s - 1) / (sMax - 1);
  const C = [P[0] + (alvo[0] - P[0]) * k, P[1] + (alvo[1] - P[1]) * k];
  return `translate(${C[0]} ${C[1]}) scale(${s}) translate(${-P[0]} ${-P[1]})`;
};
const naTela = (s: number, sMax: number, P: [number, number], alvo: [number, number], x: number, y: number): [number, number] => {
  const k = sMax === 1 ? 0 : (s - 1) / (sMax - 1);
  const C = [P[0] + (alvo[0] - P[0]) * k, P[1] + (alvo[1] - P[1]) * k];
  return [C[0] + s * (x - P[0]), C[1] + s * (y - P[1])];
};

/** "1ª" na Sora: na mono o "ª" fica solto, longe do número. */
const Primeira: React.FC<{ tam: number; cor: string }> = ({ tam, cor }) => (
  <span style={{ fontFamily: SORA, fontWeight: 300, fontSize: tam, lineHeight: 1, color: cor, letterSpacing: -2, textShadow: `0 0 30px ${cor}55` }}>1ª</span>
);

/** Quantos caracteres de um número digitado já apareceram no quadro f. */
const digitado = (id: string, f: number) => {
  const d = T.digita.find((x) => x.id === id)!;
  if (f < d.de) return "";
  const passo = (d.ate - d.de) / d.texto.length;
  return d.texto.slice(0, Math.min(d.texto.length, Math.floor((f - d.de) / passo) + 1));
};

// --- texto no terço de baixo ---------------------------------------------------------------

/** Legenda da fala: um bloco de 2 a 4 palavras por vez, a chave em laranja. */
const Legenda: React.FC = () => {
  const f = useCurrentFrame();
  const bloco = T.legendas.find((l) => f >= l.de && f < l.ate);
  if (!bloco) return null;
  // o 1º bloco já está inteiro no quadro 0
  const s = bloco.de <= 0 ? 1 : 0.86 + 0.14 * mola(f, bloco.de, { damping: 12, stiffness: 260 });
  return (
    <div style={{
      position: "absolute", top: 1400, left: 90, width: 820, textAlign: "center",
      fontFamily: SORA, fontWeight: 400, fontSize: 68, lineHeight: 1.12, letterSpacing: -0.5, color: TEXTO,
      textShadow: "0 0 24px rgba(5,7,12,0.95), 0 3px 6px rgba(0,0,0,0.9)", scale: `${s}`,
      opacity: bloco.de <= 0 ? 1 : entre(f, bloco.de, bloco.de + 2),
    }}>
      {bloco.partes.map((p, i) => (
        <span key={i} style={{ color: p.chave ? LARANJA : TEXTO }}>{i ? " " : ""}{p.t}</span>
      ))}
    </div>
  );
};

/** Faixa do número grande, logo acima da legenda (entre x 130 e 950, longe dos botões). */
const Heroi: React.FC<{ o: number; children: React.ReactNode; top?: number }> = ({ o, children, top = 1195 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: X0, width: 820, opacity: o, fontFamily: MONO, color: TEXTO, textAlign: "center" }}>{children}</div>
  );

const Rotulo: React.FC<{ children: React.ReactNode; cor?: string }> = ({ children, cor = TEXTO_2 }) => (
  <div style={{ fontSize: 24, letterSpacing: 3, color: cor }}>{children}</div>
);

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  const texto =
    f >= F.prova && f < F.historico ? "FONTE: TSE · 2º TURNO DE 2026"
      : f >= F.paradoxo && f < M.termometro ? "FONTE: IBGE, CENSO 2022 · TSE, 2º TURNO DE 2026"
        : f >= F.estados && f < G0 ? "FONTE: TSE · 1º E 2º TURNOS DE 2026"
          : "FONTE: TSE · 2º TURNO PRESIDENCIAL, 2002–2026";
  return (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>
      {texto}
    </div>
  );
};

// --- mapa: o Brasil encolhe até Ananindeua (gancho) e volta a encolher no fim (loop) ---------
const A = D.A as [number, number];
type Mun = [number, number, number];
const MUNS = D.muns as Mun[];
const CONT = D.contornos;
const I_PA = CONT.findIndex((c) => c.uf === "PA");
const I_MG = CONT.findIndex((c) => c.uf === "MG");
const ioCubico = Easing.inOut(Easing.cubic);
const chegada = Easing.in(Easing.quad);

/**
 * Progresso do colapso no instante τ (quadros). O fim usa τ de −45 a −1 e o começo de 0 a 40:
 * é uma curva só, então o último quadro emenda no quadro 0.
 */
const colapso = (tau: number) => ioCubico(limita((tau + T.colapso.fim) / (T.colapso.fim + T.colapso.inicio)));

const MapaQueEncolhe: React.FC<{ p: number; brilho: number; pulso: number }> = ({ p, brilho, pulso }) => {
  const s = 1 - 0.985 * p;
  return (
    <g>
      <g transform={`translate(${A[0]} ${A[1]}) scale(${s}) translate(${-A[0]} ${-A[1]})`} opacity={1 - entre(p, 0.5, 0.92)}>
        {CONT.map((c, k) => (
          <path key={k} d={c.d} fill="none" stroke={CIANO} strokeOpacity={0.34} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g opacity={brilho}>
        {MUNS.map(([x, y, k], i) => {
          // os mais perto de Ananindeua chegam primeiro
          const e = chegada(limita(p * 1.55 - k * 0.55));
          if (e >= 1) return null;
          return <circle key={i} cx={x + (A[0] - x) * e} cy={y + (A[1] - y) * e} r={1.7} fill={CIANO} opacity={0.42 + 0.4 * e} />;
        })}
      </g>
      {/* Ananindeua: o ponto que recebe o país inteiro */}
      <circle cx={A[0]} cy={A[1]} r={16 + 40 * p} fill={LARANJA} opacity={0.12 + 0.3 * p} filter="url(#brilhoMapa)" />
      <circle cx={A[0]} cy={A[1]} r={4 + 9 * p} fill={LARANJA} />
      {pulso > 0 && [0, 1].map((k) => {
        const u = (pulso + k * 0.5) % 1;
        return <circle key={k} cx={A[0]} cy={A[1]} r={14 + 90 * u} fill="none" stroke={LARANJA} strokeWidth={2} opacity={(1 - u) * 0.7} />;
      })}
    </g>
  );
};

const Mapa: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= G0 - 8;
  const noGancho = f < M.turno + 6;
  if (!noFim && !noGancho) return null;
  // no fim: os 5.571 municípios aparecem fracos atrás da pergunta e depois encolhem
  const o = noFim ? Math.max(0.24 * entre(f, G0 - 8, G0 + 14), entre(f, FIM - 6, FIM + 6)) : 1 - entre(f, M.turno - 6, M.turno + 4);
  const p = noFim ? (f < FIM ? 0 : colapso(f - T.total)) : colapso(f);
  const pulso = !noFim && f > T.colapso.inicio ? ((f - T.colapso.inicio) / 34) % 1 : 0;
  // "Ananindeua, no Pará.": o contorno dos estados volta fraco, o Pará um pouco mais forte
  const volta = noFim ? 0 : entre(f, F.prova - 2, F.prova + 14);
  const rotulo = noFim ? 0 : entre(f, F.prova + 2, F.prova + 12);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="TODOS OS MUNICÍPIOS" direita="2002–2026" opacidade={noFim ? entre(f, FIM - 6, FIM + 10) : 1} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><filter id="brilhoMapa" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={14} /></filter></defs>
        {volta > 0 && (
          <g opacity={volta}>
            {CONT.map((c, k) => (
              <path key={k} d={c.d} fill={k === I_PA ? LARANJA : "none"} fillOpacity={0.07} stroke={k === I_PA ? TEXTO : CIANO}
                strokeOpacity={k === I_PA ? 0.7 : 0.22} strokeWidth={k === I_PA ? 2 : 1.2} />
            ))}
          </g>
        )}
        <MapaQueEncolhe p={p} brilho={1 - entre(f, T.colapso.inicio - 2, T.colapso.inicio + 6) * (noFim ? 0 : 1)} pulso={pulso} />
        <g opacity={rotulo} fontFamily={MONO}>
          <text x={A[0] - 34} y={A[1] + 70} textAnchor="end" fill={TEXTO} fontSize={44} letterSpacing={2} {...CONTORNO}>ANANINDEUA</text>
          <text x={A[0] - 34} y={A[1] + 110} textAnchor="end" fill={TEXTO_2} fontSize={26} letterSpacing={2} {...CONTORNO}>PARÁ · {Math.round(D.eleitoresA / 1000)} MIL ELEITORES</text>
        </g>
      </svg>
      <Heroi o={noFim ? entre(f, T.total - 32, T.total - 18) : 1 - entre(f, F.prova + 2, F.prova + 10)} top={1170}>
        <div style={{ fontSize: 150, lineHeight: 1, color: LARANJA, letterSpacing: -2, textShadow: `0 0 34px ${LARANJA}66`,
          scale: `${1 + 0.06 * (noFim ? 0 : mola(f, M.g24 - 2, { damping: 9, stiffness: 220 }) * (1 - entre(f, M.g24 + 4, M.g24 + 16)))}` }}>
          24 ANOS
        </div>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- prova: o 2º turno de 2026, Ananindeua × Brasil -------------------------------------------
const PV = D.prova;
const bx = (pct: number) => X0 + (pct / 100) * (X1 - X0);
const BH = 84;
const BARRAS = [
  { nome: "ANANINDEUA (PA)", cor: LARANJA, y: 590, v: PV.ananindeua, de: M.a526, ids: ["a526", "a474"] },
  { nome: "BRASIL", cor: CIANO, y: 845, v: PV.brasil, de: M.b518, ids: ["b518", "b482"] },
];
const S_PROVA = 2.4;

const Prova: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, M.turno - 4, F.historico + 2, 6);
  if (o <= 0) return null;
  const contorno = entre(f, M.turno - 2, M.turno + 16, Easing.out(Easing.cubic));
  const s = 1 + (S_PROVA - 1) * mola(f, M.b482 + 10, { damping: 16, stiffness: 110 });
  const xa = bx(PV.ananindeua.lula), xb = bx(PV.brasil.lula);
  const guia = entre(f, M.b482 + 6, M.b482 + 14);
  // no punch-in os números de dentro das barras saem e cada divisória ganha o seu número
  const P_PROVA: [number, number] = [(xa + xb) / 2, 757], ALVO_PROVA: [number, number] = [540, 770];
  const textos = 1 - entre(s, 1.04, 1.25);
  const rotulos = entre(s, 1.5, 2.1);
  const [ax, ay] = naTela(s, S_PROVA, P_PROVA, ALVO_PROVA, xa, BARRAS[0].y + BH);
  const [bxx, byy] = naTela(s, S_PROVA, P_PROVA, ALVO_PROVA, xb, BARRAS[1].y);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="2º TURNO DE 2026" direita="% DOS VOTOS VÁLIDOS" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><clipPath id="palcoProva"><rect x={0} y={380} width={1080} height={790} /></clipPath></defs>
        <g clipPath="url(#palcoProva)">
          <g transform={camera(s, S_PROVA, P_PROVA, ALVO_PROVA)}>
            <line x1={bx(50)} x2={bx(50)} y1={540} y2={960} stroke={TEXTO_2} strokeWidth={1.5} strokeDasharray="6 8" vectorEffect="non-scaling-stroke" />
            <text x={bx(50)} y={1000} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24} opacity={1 - entre(s, 1, 1.2)}>50%</text>
            {BARRAS.map((b) => {
              const d = mola(f, b.de - 4, { damping: 13, stiffness: 150 });
              const xd = bx(50 + (b.v.lula - 50) * d);
              const larg = (X1 - X0) * contorno;
              const cheio = Math.min(1, d * 1.5);
              return (
                <g key={b.nome}>
                  <text x={X0} y={b.y - 26} fill={b.cor === LARANJA ? LARANJA : TEXTO} fontFamily={MONO} fontSize={36} letterSpacing={2} opacity={contorno}>{b.nome}</text>
                  <rect x={X0} y={b.y} width={larg} height={BH} fill="none" stroke={b.cor} strokeOpacity={0.5} strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={1 - cheio} />
                  {cheio > 0 && (
                    <g opacity={cheio}>
                      {/* os dois candidatos com a mesma cor e o mesmo traço */}
                      <rect x={X0} y={b.y} width={xd - 3 - X0} height={BH} fill={b.cor} fillOpacity={0.2} stroke={b.cor} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                      <rect x={xd + 3} y={b.y} width={X1 - xd - 3} height={BH} fill={b.cor} fillOpacity={0.2} stroke={b.cor} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                      <g opacity={textos}>
                      <text x={X0 + 22} y={b.y + 56} fontFamily={MONO}>
                        <tspan fill={TEXTO_2} fontSize={26} letterSpacing={2}>LULA </tspan>
                        <tspan fill={TEXTO} fontSize={44}>{digitado(b.ids[0], f).padEnd(4, " ")}</tspan>
                      </text>
                      <text x={X1 - 22} y={b.y + 56} textAnchor="end" fontFamily={MONO}>
                        <tspan fill={TEXTO} fontSize={44}>{digitado(b.ids[1], f).padStart(4, " ")}</tspan>
                        <tspan fill={TEXTO_2} fontSize={26} letterSpacing={2}> FLÁVIO</tspan>
                      </text>
                      </g>
                    </g>
                  )}
                </g>
              );
            })}
            {/* punch-in: as duas divisórias quase na mesma linha */}
            <g opacity={guia}>
              <line x1={xa} x2={xa} y1={BARRAS[0].y - 8} y2={BARRAS[1].y + BH + 8} stroke={LARANJA} strokeWidth={2} strokeDasharray="5 6" vectorEffect="non-scaling-stroke" />
              <line x1={xb} x2={xb} y1={BARRAS[0].y - 8} y2={BARRAS[1].y + BH + 8} stroke={CIANO} strokeWidth={2} strokeDasharray="5 6" vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        </g>
        {/* os dois lados de cada divisória, com o mesmo tamanho e a mesma cor */}
        <g opacity={rotulos} fontFamily={MONO}>
          <text x={ax - 20} y={ay + 64} textAnchor="end" fill={LARANJA} fontSize={52} {...CONTORNO}>{br(PV.ananindeua.lula)}</text>
          <text x={ax + 20} y={ay + 64} fill={LARANJA} fontSize={52} {...CONTORNO}>{br(PV.ananindeua.flavio)}</text>
          <text x={ax} y={ay + 104} textAnchor="middle" fill={LARANJA} fontSize={24} letterSpacing={2} {...CONTORNO}>ANANINDEUA</text>
          <text x={bxx - 20} y={byy - 30} textAnchor="end" fill={CIANO} fontSize={52} {...CONTORNO}>{br(PV.brasil.lula)}</text>
          <text x={bxx + 20} y={byy - 30} fill={CIANO} fontSize={52} {...CONTORNO}>{br(PV.brasil.flavio)}</text>
          <text x={bxx} y={byy - 96} textAnchor="middle" fill={CIANO} fontSize={24} letterSpacing={2} {...CONTORNO}>BRASIL</text>
          <text x={X0} y={(ay + byy) / 2 + 10} fill={TEXTO_2} fontSize={24} letterSpacing={2} {...CONTORNO}>← LULA</text>
          <text x={X1} y={(ay + byy) / 2 + 10} textAnchor="end" fill={TEXTO_2} fontSize={24} letterSpacing={2} {...CONTORNO}>FLÁVIO →</text>
        </g>
      </svg>
      <Heroi o={entre(f, M.b482 + 12, M.b482 + 20)}>
        <div style={{ fontSize: 96, lineHeight: 1, color: LARANJA, textShadow: `0 0 28px ${LARANJA}55` }}>{br(PV.dif)} PONTO</div>
        <Rotulo>DE DIFERENÇA</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- linhas 2002–2026 (histórico de Ananindeua e termômetro de Pedreira) ---------------------
const ANOS = D.anos;
const xAno = (i: number) => 200 + i * ((880 - 200) / (ANOS.length - 1));
const YB = 1060, HT = 540;
const escala = (vmin: number, vmax: number) => (v: number) => YB - ((v - vmin) / (vmax - vmin)) * HT;
const caminhoSerie = (vals: number[], y: (v: number) => number) => vals.map((v, i) => `${i ? "L" : "M"}${xAno(i).toFixed(1)},${y(v).toFixed(1)}`).join("");

const Eixos: React.FC<{ y: (v: number) => number; marcas: number[]; anos: number; o: number }> = ({ y, marcas, anos, o }) => (
  <g opacity={o}>
    {marcas.map((v) => (
      <g key={v}>
        <line x1={170} x2={910} y1={y(v)} y2={y(v)} stroke={TEXTO_2} strokeOpacity={v === 50 ? 0.55 : 0.16} strokeDasharray={v === 50 ? "6 8" : "4 8"} />
        <text x={158} y={y(v) + 8} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22}>{v}%</text>
      </g>
    ))}
    {ANOS.map((a, i) => (
      <text key={a} x={xAno(i)} y={YB + 56} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={26} opacity={entre(anos, i / 7, i / 7 + 0.15)}>{a}</text>
    ))}
  </g>
);

const Legendinha: React.FC<{ itens: [string, string][]; o: number }> = ({ itens, o }) => (
  <g opacity={o} fontFamily={MONO} fontSize={26} letterSpacing={2}>
    {itens.map(([nome, cor], k) => (
      <g key={nome} transform={`translate(${X0 + k * 360} 440)`}>
        <line x1={0} x2={40} y1={-9} y2={-9} stroke={cor} strokeWidth={4} />
        <text x={54} y={0} fill={cor === LARANJA ? LARANJA : TEXTO}>{nome}</text>
      </g>
    ))}
  </g>
);

const H = D.hist;
const yHist = escala(38, 68);

const Historico: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.historico - 2, F.ranking + 2, 6);
  if (o <= 0) return null;
  const eixos = entre(f, F.historico, F.historico + 14);
  const anos = entre(f, M.sete - 2, M.h2002, Easing.out(Easing.quad));
  const linhas = entre(f, M.h2002 - 4, M.h2002 + 26, Easing.inOut(Easing.quad));
  const vaos = entre(f, M.media - 4, M.media + 10);
  const pontos = entre(linhas, 0.9, 1);
  // "E não foi sorte de uma eleição": primeiro só o par de 2026 que acabou de aparecer nas barras
  const p26 = mola(f, F.historico + 4, { damping: 11, stiffness: 180 });
  const pulso26 = entre(f, M.sorte - 2, M.sorte + 16);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="% DO CANDIDATO DO PT" direita="2º TURNO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonHist" /></defs>
        <Legendinha itens={[["ANANINDEUA", LARANJA], ["BRASIL", TEXTO]]} o={eixos} />
        <Eixos y={yHist} marcas={[40, 50, 60]} anos={anos} o={eixos} />
        <g opacity={vaos}>
          {H.brasil.map((v, i) => (
            <line key={i} x1={xAno(i)} x2={xAno(i)} y1={yHist(v)} y2={yHist(H.ananindeua[i])} stroke={LARANJA} strokeWidth={6} strokeOpacity={0.45} />
          ))}
        </g>
        <Neon filtro="neonHist" cor={TEXTO} largura={2.5}><path d={caminhoSerie(H.brasil, yHist)} {...traco(linhas)} /></Neon>
        <Neon filtro="neonHist" cor={LARANJA} largura={3}><path d={caminhoSerie(H.ananindeua, yHist)} {...traco(linhas)} /></Neon>
        <g opacity={pontos}>
          {H.brasil.map((v, i) => <circle key={`b${i}`} cx={xAno(i)} cy={yHist(v)} r={6} fill={TEXTO} />)}
          {H.ananindeua.map((v, i) => <circle key={`a${i}`} cx={xAno(i)} cy={yHist(v)} r={7} fill={LARANJA} />)}
        </g>
        {p26 > 0 && (
          <g opacity={Math.min(1, p26 * 1.5) * (1 - entre(f, M.media - 6, M.media + 4))} fontFamily={MONO}>
            {pulso26 > 0 && pulso26 < 1 && (
              <circle cx={xAno(6)} cy={yHist(H.ananindeua[6])} r={14 + 70 * pulso26} fill="none" stroke={LARANJA} strokeWidth={2.5} opacity={1 - pulso26} />
            )}
            <circle cx={xAno(6)} cy={yHist(H.brasil[6])} r={7 * p26} fill={TEXTO} />
            <circle cx={xAno(6)} cy={yHist(H.ananindeua[6])} r={8 * p26} fill={LARANJA} />
            <text x={xAno(6) - 20} y={yHist(H.ananindeua[6]) - 22} textAnchor="end" fill={LARANJA} fontSize={34} {...CONTORNO}>{br(H.ananindeua[6])}</text>
            <text x={xAno(6) - 20} y={yHist(H.brasil[6]) + 42} textAnchor="end" fill={TEXTO} fontSize={34} {...CONTORNO}>{br(H.brasil[6])}</text>
            <text x={xAno(6)} y={YB + 56} textAnchor="middle" fill={TEXTO} fontSize={26} opacity={1 - anos}>2026</text>
          </g>
        )}
      </svg>
      <Heroi o={entre(f, M.h17 - 2, M.h17 + 2)}>
        <div style={{ fontSize: 104, lineHeight: 1, color: LARANJA, textShadow: `0 0 28px ${LARANJA}55` }}>{digitado("h17", f).padEnd(3, " ")} PONTO</div>
        <Rotulo>DISTÂNCIA MÉDIA DO BRASIL EM 7 ELEIÇÕES</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- ranking: 1ª de 5.563, e o único erro ------------------------------------------------------
const RK = D.ranking;
const RB = 1000, RHMAX = 400, RW = (X1 - X0) / RK.bins.length;
const RMAX = Math.max(...RK.bins);
const CHIP_W = 104, CHIP_Y = 600, CHIP_X0 = 540 - (7 * CHIP_W + 6 * 10) / 2;

const Ranking: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.ranking - 2, F.pergunta + 2, 6);
  if (o <= 0) return null;
  const oHist = 1 - entre(f, M.errou - 4, M.errou + 6);
  const oChips = entre(f, M.errou, M.errou + 8);
  const xA = X0 + (H.distMedia / RK.bin) * RW;
  const marca = entre(f, M.primeira + 14, M.primeira + 24);
  const hero = Math.min(entre(f, M.n5563 - 4, M.n5563), 1 - entre(f, M.errou - 4, M.errou + 4));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda={f < M.errou ? `${RK.n.toLocaleString("pt-BR")} CIDADES` : "ACERTOU O VENCEDOR?"} direita={f < M.errou ? "2002–2026" : "ANANINDEUA"} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g opacity={oHist}>
          {RK.bins.map((n, i) => {
            const p = entre(f, M.primeira - 6 + i * 0.6, M.primeira + 6 + i * 0.6, Easing.out(Easing.cubic));
            const h = (n / RMAX) * RHMAX * p;
            return <rect key={i} x={X0 + i * RW + 1} y={RB - h} width={RW - 2} height={h} fill={CIANO} opacity={0.5} />;
          })}
          <line x1={X0} x2={X1} y1={RB} y2={RB} stroke={TEXTO_2} strokeOpacity={0.6} />
          {[0, 10, 20, 30, 40].map((v) => (
            <text key={v} x={X0 + (v / RK.bin) * RW} y={RB + 40} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={24}>{v}</text>
          ))}
          <text x={(X0 + X1) / 2} y={RB + 86} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2}>DISTÂNCIA MÉDIA DO BRASIL (PONTOS)</text>
          <text x={X1} y={560} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2} opacity={entre(f, M.primeira, M.primeira + 10)}>CADA BARRA: QUANTAS CIDADES</text>
          <g opacity={marca}>
            <line x1={xA} x2={xA} y1={RB - 6} y2={560} stroke={LARANJA} strokeWidth={2} strokeDasharray="5 6" />
            <circle cx={xA} cy={RB} r={9} fill={LARANJA} />
            <text x={X0} y={496} fill={LARANJA} fontFamily={MONO} fontSize={34} letterSpacing={2}>ANANINDEUA</text>
            <text x={X0} y={536} fill={TEXTO} fontFamily={MONO} fontSize={26}>{br(H.distMedia, 2)} PONTO</text>
          </g>
        </g>
        {oChips > 0 && (
          <g opacity={oChips}>
            {ANOS.map((a, i) => {
              const x = CHIP_X0 + i * (CHIP_W + 10), y = CHIP_Y;
              const erro = !H.acertos[i];
              const p = entre(f, M.errou + i * 6, M.errou + i * 6 + 8, Easing.out(Easing.back(1.6)));
              const vira = erro ? entre(f, M.r2022 - 2, M.r2022 + 6) : 0;
              const cor = erro && vira > 0 ? LARANJA : CIANO;
              return (
                <g key={a} opacity={Math.min(1, p * 2)} transform={`translate(${x + CHIP_W / 2} ${y + 90}) scale(${0.7 + 0.3 * p}) translate(${-x - CHIP_W / 2} ${-y - 90})`}>
                  <rect x={x} y={y} width={CHIP_W} height={180} fill={cor} fillOpacity={erro && vira > 0 ? 0.16 : 0.06} stroke={cor} strokeWidth={erro && vira > 0 ? 3 : 1.5} />
                  <text x={x + CHIP_W / 2} y={y + 52} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={30}>{a}</text>
                  {erro && vira > 0 ? (
                    <path d={`M${x + 30},${y + 88} L${x + 74},${y + 132} M${x + 74},${y + 88} L${x + 30},${y + 132}`} stroke={LARANJA} strokeWidth={6} strokeLinecap="round" opacity={vira} />
                  ) : (
                    <path d={`M${x + 24},${y + 112} L${x + 44},${y + 132} L${x + 80},${y + 90}`} fill="none" stroke={CIANO} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </g>
              );
            })}
            <g opacity={entre(f, M.meio - 4, M.meio + 4)}>
              <text x={CHIP_X0 + 5 * (CHIP_W + 10) + CHIP_W / 2} y={CHIP_Y + 236} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={36}>{br(H.margem2022, 2)}</text>
              <text x={CHIP_X0 + 5 * (CHIP_W + 10) + CHIP_W / 2} y={CHIP_Y + 274} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={24} letterSpacing={2}>PONTO</text>
            </g>
          </g>
        )}
      </svg>
      <Heroi o={hero}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 26 }}>
          <Primeira tam={150} cor={LARANJA} />
          <span style={{ fontSize: 64, color: TEXTO }}>DE {digitado("n5563", f).padEnd(5, " ")}</span>
        </div>
      </Heroi>
      <Heroi o={entre(f, M.errou + 40, M.errou + 48)}>
        <div style={{ fontSize: 104, lineHeight: 1, color: TEXTO }}>{H.acertos.filter(Boolean).length} <span style={{ fontSize: 64 }}>DE</span> {ANOS.length}</div>
        <Rotulo>ELEIÇÕES COM O MESMO VENCEDOR DO PAÍS</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- pergunta: um Brasil em miniatura? -------------------------------------------------------
const CENTRO_MAPA: [number, number] = [540, 790];
const S_MINI = 0.72, Y_MINI = 790;

const Pergunta: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.pergunta - 2, F.paradoxo + 2, 6);
  if (o <= 0) return null;
  const desenho = entre(f, F.pergunta, F.pergunta + 34, Easing.inOut(Easing.quad));
  const q = mola(f, M.miniatura - 4, { damping: 10, stiffness: 180 });
  const ax = 540 + (A[0] - CENTRO_MAPA[0]) * S_MINI, ay = Y_MINI + (A[1] - CENTRO_MAPA[1]) * S_MINI;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="ANANINDEUA (PA)" direita="2002–2026" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonMini" desvio={4} /><filter id="brilhoMini" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={10} /></filter></defs>
        <g transform={`translate(540 ${Y_MINI}) scale(${S_MINI}) translate(${-CENTRO_MAPA[0]} ${-CENTRO_MAPA[1]})`}>
          <Neon filtro="neonMini" cor={TEXTO} largura={1.6 / S_MINI}>
            {CONT.map((c, k) => <path key={k} d={c.d} {...traco(desenho)} />)}
          </Neon>
        </g>
        <circle cx={ax} cy={ay} r={26} fill={LARANJA} opacity={0.4} filter="url(#brilhoMini)" />
        <circle cx={ax} cy={ay} r={9} fill={LARANJA} />
        {q > 0 && (
          <text x={858} y={640} textAnchor="middle" fill={LARANJA} fontFamily={SORA} fontWeight={300} fontSize={260 * (0.6 + 0.4 * q)} opacity={Math.min(1, q * 1.5)}>?</text>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// --- paradoxo: Censo 2022 ----------------------------------------------------------------------
const CS = D.censo;
const CX = 380, CK = 480 / 70; // 0–70% em 480px
const VK = 480 / 15; // 0–15 pontos em 480px

const Barra: React.FC<{ y: number; nome: string; v: number; k: number; cor: string; p: number; texto: string; destaque?: number; dif?: string; oDif?: number }> = ({ y, nome, v, k, cor, p, texto, destaque = 1, dif, oDif = 0 }) => (
  <g opacity={Math.min(1, p * 3) * (0.4 + 0.6 * destaque)}>
    <text x={X0} y={y + 30} fill={cor === TEXTO ? TEXTO_2 : cor} fontFamily={MONO} fontSize={28} letterSpacing={1}>{nome}</text>
    <rect x={CX} y={y} width={v * k * p} height={40} fill={cor} fillOpacity={cor === TEXTO ? 0.5 : 0.8} />
    <text x={CX + v * k * p + 14} y={y + 33} fill={cor === TEXTO ? TEXTO : cor} fontFamily={MONO} fontSize={36}>{texto}</text>
    {dif && oDif > 0 && (
      <text x={CX + v * k * p - 14} y={y + 31} textAnchor="end" fill={FUNDO} fontFamily={MONO} fontSize={28} opacity={oDif}>{dif}</text>
    )}
  </g>
);

const Paradoxo: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.paradoxo - 2, M.termometro + 4, 6);
  if (o <= 0) return null;
  const pBr = entre(f, M.censo - 4, M.censo + 12, Easing.out(Easing.cubic));
  const pAna = mola(f, M.nao - 4, { damping: 14, stiffness: 120 });
  const pMos = mola(f, M.mossoro - 4, { damping: 14, stiffness: 120 });
  const pVoto = entre(f, M.votou - 4, M.votou + 6);
  const pVotoMos = mola(f, M.p12 - 4, { damping: 14, stiffness: 110 });
  const dPardos = f < M.parda ? 1 : f < M.evangelica ? 1 : f < M.mossoro ? 0.35 + 0.65 * entre(f, M.mossoro - 6, M.mossoro) : 1;
  const dEvang = f < M.evangelica - 2 ? (f >= M.parda ? 0.35 : 1) : 1;
  const grupo = (titulo: string, y: number, chave: "parda" | "evangelica", dest: number) => (
    <g>
      <text x={X0} y={y} fill={TEXTO} fontFamily={MONO} fontSize={34} letterSpacing={3} opacity={pBr * (0.4 + 0.6 * dest)}>{titulo}</text>
      <Barra y={y + 24} nome="BRASIL" v={CS.brasil[chave]} k={CK} cor={TEXTO} p={pBr} texto={br(CS.brasil[chave])} destaque={dest} />
      <Barra y={y + 82} nome="ANANINDEUA" v={CS.ananindeua[chave]} k={CK} cor={LARANJA} p={pAna} texto={br(CS.ananindeua[chave])} destaque={dest}
        dif={`+${br(CS.ananindeua[chave] - CS.brasil[chave])} PONTOS`} oDif={entre(f, (chave === "parda" ? M.parda : M.evangelica) - 4, (chave === "parda" ? M.parda : M.evangelica) + 4)} />
      <Barra y={y + 140} nome="MOSSORÓ (RN)" v={CS.mossoro[chave]} k={CK} cor={CIANO} p={pMos} texto={br(CS.mossoro[chave])} destaque={dest} />
    </g>
  );
  const heroMos = Math.min(entre(f, M.mossoro, M.mossoro + 6), 1 - entre(f, M.p12 - 6, M.p12 - 2));
  const heroVoto = Math.min(entre(f, M.p12 - 2, M.p12 + 2), 1 - entre(f, F.termometro - 2, F.termometro + 4));
  const heroFrase = entre(f, F.termometro, F.termometro + 6);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="CENSO 2022 · % DA POPULAÇÃO" direita="IBGE" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {grupo("PARDOS", 458, "parda", dPardos)}
        {grupo("EVANGÉLICOS", 712, "evangelica", dEvang)}
        <g opacity={pVoto}>
          <line x1={X0} x2={X1} y1={922} y2={922} stroke={TEXTO_2} strokeOpacity={0.3} />
          <text x={X0} y={972} fill={TEXTO} fontFamily={MONO} fontSize={28} letterSpacing={2}>VOTO: DISTÂNCIA DO BRASIL</text>
          <text x={X1} y={972} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2}>2º TURNO 2026</text>
          <Barra y={994} nome="ANANINDEUA" v={CS.voto2t.ananindeua} k={VK} cor={LARANJA} p={pVoto} texto={`${br(CS.voto2t.ananindeua)} PONTO`} />
          <Barra y={1052} nome="MOSSORÓ (RN)" v={CS.voto2t.mossoro} k={VK} cor={CIANO} p={pVotoMos} texto={digitado("p12", f)} />
        </g>
      </svg>
      <Heroi o={heroMos}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 22 }}>
          <Primeira tam={110} cor={CIANO} />
          <span style={{ fontSize: 64, color: CIANO }}>DE {CS.n.toLocaleString("pt-BR")}</span>
        </div>
        <Rotulo>MOSSORÓ: A MAIS PARECIDA COM O BRASIL NO CENSO</Rotulo>
      </Heroi>
      <Heroi o={heroVoto}>
        <div style={{ fontSize: 92, lineHeight: 1, color: CIANO }}>{digitado("p12", f).padEnd(4, " ")} PONTOS</div>
        <Rotulo>MOSSORÓ: DISTÂNCIA DO BRASIL NO 2º TURNO</Rotulo>
      </Heroi>
      <Heroi o={heroFrase}>
        <div style={{ fontSize: 64, lineHeight: 1.2, color: TEXTO, marginTop: 20 }}>PARECER <span style={{ color: LARANJA }}>≠</span> VOTAR IGUAL</div>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- termômetro: Pedreira acertou 2002 em cheio ----------------------------------------------
const yTerm = escala(10, 70);

const Termometro: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, M.termometro - 4, F.minas + 2, 6);
  if (o <= 0) return null;
  const eixos = entre(f, M.termometro - 2, M.termometro + 12);
  const brasil = entre(f, M.termometro, M.termometro + 24, Easing.inOut(Easing.quad));
  const ped0 = mola(f, M.pedreira - 2, { damping: 12, stiffness: 180 });
  const anel = entre(f, M.t2002 - 2, M.t2002 + 16);
  const deriva = entre(f, M.t2026 - 8, M.t2026 + 22, Easing.inOut(Easing.quad));
  const chave = entre(f, M.t23 - 6, M.t23 + 6);
  const y26b = yTerm(H.brasil[6]), y26p = yTerm(H.pedreira[6]);
  const heroCheio = Math.min(entre(f, M.t2002, M.t2002 + 6), 1 - entre(f, M.t23 - 8, M.t23 - 2));
  const heroLonge = entre(f, M.t23 - 2, M.t23 + 2);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="% DO CANDIDATO DO PT" direita="2º TURNO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonTerm" /></defs>
        <Legendinha itens={[["PEDREIRA (SP)", CIANO], ["BRASIL", TEXTO]]} o={eixos} />
        <Eixos y={yTerm} marcas={[20, 30, 40, 50, 60]} anos={eixos} o={eixos} />
        <Neon filtro="neonTerm" cor={TEXTO} largura={2.5}><path d={caminhoSerie(H.brasil, yTerm)} {...traco(brasil)} /></Neon>
        <g opacity={entre(brasil, 0.9, 1)}>{H.brasil.map((v, i) => <circle key={i} cx={xAno(i)} cy={yTerm(v)} r={6} fill={TEXTO} />)}</g>
        {ped0 > 0 && (
          <g>
            <Neon filtro="neonTerm" cor={CIANO} largura={3}><path d={caminhoSerie(H.pedreira, yTerm)} {...traco(deriva)} /></Neon>
            {H.pedreira.map((v, i) => (
              <circle key={i} cx={xAno(i)} cy={yTerm(v)} r={i ? 6 : 9 * ped0} fill={CIANO} opacity={i ? entre(deriva, (i - 0.2) / 6, i / 6) : 1} />
            ))}
          </g>
        )}
        {anel > 0 && anel < 1 && (
          <circle cx={xAno(0)} cy={yTerm(H.brasil[0])} r={12 + 60 * anel} fill="none" stroke={CIANO} strokeWidth={3} opacity={1 - anel} />
        )}
        <g opacity={chave}>
          <path d={`M${xAno(6) + 26},${y26b} H${xAno(6) + 40} V${y26p} H${xAno(6) + 26}`} fill="none" stroke={LARANJA} strokeWidth={3} />
          <text x={xAno(6) + 52} y={(y26b + y26p) / 2 + 12} fill={LARANJA} fontFamily={MONO} fontSize={36} {...CONTORNO}>{digitado("t23", f)}</text>
        </g>
      </svg>
      <Heroi o={heroCheio}>
        <div style={{ fontSize: 88, lineHeight: 1, color: TEXTO }}>{br(H.pedreira[0], 2)} <span style={{ color: CIANO }}>=</span> {br(H.brasil[0], 2)}</div>
        <Rotulo>2002 · PEDREIRA E BRASIL</Rotulo>
      </Heroi>
      <Heroi o={heroLonge}>
        <div style={{ fontSize: 104, lineHeight: 1, color: LARANJA, textShadow: `0 0 28px ${LARANJA}55` }}>{digitado("t23", f).padEnd(2, " ")} PONTOS</div>
        <Rotulo>2026 · PEDREIRA LONGE DO BRASIL</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- Minas e as 27 miniaturas ------------------------------------------------------------------
const MN = D.minas;
const C7 = MN.cidades7 as [number, number, number][];
const S_MG = 1.9;
const EST = D.estados.map((e, k) => ({ ...e, k }));
const ORDEM_Y = [...EST].sort((a, b) => a.xy[1] - b.xy[1]).map((e) => e.k);
const LIN = 14, LY0 = 452, LDY = 52;
const posLista = (k: number): [number, number] => [k < LIN ? 70 : 520, LY0 + (k % LIN) * LDY];
const hash = (k: number) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const MinasEstados: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.minas - 2, G0 + 2, 8);
  if (o <= 0) return null;
  const noEstados = f >= F.estados;
  const mapa = entre(f, F.minas, F.minas + 14) * (1 - entre(f, F.estados + 18, F.estados + 44));
  const mg = entre(f, M.minas - 4, M.minas + 8) * (1 - entre(f, F.estados, F.estados + 10));
  const s = 1 + (S_MG - 1) * mola(f, M.m67 - 4, { damping: 16, stiffness: 110 }) * (1 - entre(f, F.estados - 2, F.estados + 12, Easing.inOut(Easing.cubic)));
  const tr = camera(s, S_MG, MN.centro as [number, number], [560, 800]);
  const oC7 = 1 - entre(f, F.estados - 2, F.estados + 6);
  const laranja67 = entre(f, M.m67 - 2, M.m67 + 8);
  const chips = Math.min(entre(f, M.sete2 - 4, M.sete2 + 2), 1 - entre(f, M.m67 - 6, M.m67 - 1));
  const hero67 = Math.min(entre(f, M.m67 - 2, M.m67 + 2), 1 - entre(f, F.estados - 4, F.estados + 4));
  const statusE = noEstados ? "A MINIATURA DE CADA ESTADO" : f >= M.m107 ? "ACERTARAM OS 7" : "QUEM VENCEU EM MINAS";
  const statusD = noEstados ? "2026" : f >= M.m107 ? `${MN.n7} CIDADES` : "2002–2026";
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda={statusE} direita={statusD} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilhoMG" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={6} /></filter>
          <clipPath id="palcoMG"><rect x={0} y={380} width={1080} height={790} /></clipPath>
        </defs>
        <g clipPath="url(#palcoMG)">
          <g transform={tr}>
            <g opacity={mapa}>
              {CONT.map((c, k) => (
                <path key={k} d={c.d} fill="none" stroke={CIANO} strokeOpacity={0.3} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
            {mg > 0 && (
              <g opacity={mg}>
                <path d={CONT[I_MG].d} fill="none" stroke={LARANJA} strokeWidth={8} strokeOpacity={0.4} filter="url(#brilhoMG)" vectorEffect="non-scaling-stroke" />
                <path d={CONT[I_MG].d} fill={LARANJA} fillOpacity={0.14} stroke={LARANJA} strokeWidth={2.2} vectorEffect="non-scaling-stroke" />
              </g>
            )}
            {f >= M.m107 - 2 && oC7 > 0 && (
              <g opacity={oC7}>
                {C7.map(([x, y, ehMG], i) => {
                  const p = mola(f, M.m107 - 2 + Math.floor(hash(i) * 22), { damping: 11, stiffness: 220 });
                  if (p <= 0) return null;
                  const cor = ehMG ? (laranja67 > 0.5 ? LARANJA : TEXTO) : TEXTO;
                  return <circle key={i} cx={x} cy={y} r={(4.2 / Math.sqrt(s)) * p} fill={cor} opacity={ehMG ? 0.95 : 0.85 - 0.35 * laranja67} />;
                })}
              </g>
            )}
          </g>
        </g>
        {/* as 27 miniaturas: acendem de norte a sul e voam pra lista */}
        {noEstados && EST.map((e) => {
          const ordem = ORDEM_Y.indexOf(e.k);
          const pop = mola(f, F.estados + 2 + ordem * 0.7, { damping: 10, stiffness: 240 });
          if (pop <= 0) return null;
          const voa = entre(f, F.estados + 20 + e.k * 1.1, F.estados + 34 + e.k * 1.1, ioCubico);
          const [lx, ly] = posLista(e.k);
          const x = e.xy[0] + (lx + 10 - e.xy[0]) * voa, y = e.xy[1] + (ly - 10 - e.xy[1]) * voa;
          const ehPA = e.uf === "PA";
          const nome = entre(f, F.estados + 30 + e.k * 1.1, F.estados + 36 + e.k * 1.1);
          return (
            <g key={e.uf}>
              <circle cx={x} cy={y} r={(ehPA ? 9 : 7) * (0.6 + 0.4 * pop) + 4 * (1 - pop)} fill={ehPA ? LARANJA : CIANO} opacity={Math.min(1, pop * 1.5)} />
              {nome > 0 && (
                <g opacity={nome} transform={`translate(${(1 - nome) * -12} 0)`}>
                  <text x={lx + 28} y={ly} fill={ehPA ? LARANJA : TEXTO_2} fontFamily={MONO} fontSize={26}>{e.uf}</text>
                  <text x={lx + 78} y={ly} fill={ehPA ? LARANJA : TEXTO} fontFamily={SORA} fontWeight={400} fontSize={29}>{e.nome}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <Heroi o={chips}>
        <Rotulo>QUEM VENCEU EM MINAS VENCEU NO BRASIL</Rotulo>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
          {ANOS.map((a, i) => {
            const p = entre(f, M.sete2 + i * 3, M.sete2 + i * 3 + 6);
            return (
              <div key={a} style={{ width: 106, height: 92, border: `1.5px solid ${CIANO}`, background: `rgba(92,225,255,${0.12 * p})`, opacity: 0.35 + 0.65 * p,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 28, color: TEXTO }}>
                <div>{a}</div>
                <svg width={40} height={26} style={{ opacity: p }}><path d="M4,13 L15,23 L36,3" fill="none" stroke={CIANO} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            );
          })}
        </div>
      </Heroi>
      <Heroi o={hero67}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 24 }}>
          <span style={{ fontSize: 150, lineHeight: 1, color: LARANJA, textShadow: `0 0 30px ${LARANJA}55`, width: 190, textAlign: "right" }}>{digitado("m67", f)}</span>
          <span style={{ fontSize: 64, color: TEXTO }}>DE {MN.n7}</span>
        </div>
        <Rotulo>SÃO MINEIRAS</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- a pergunta do fim, grande, palavra por palavra ---------------------------------------------
const PerguntaFinal: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, G0 - 4, G0 + 2) * (1 - entre(f, FIM - 2, FIM + 10));
  if (o <= 0) return null;
  const linhas = [0, 1, 2].map((l) => T.grande.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top: 560, left: 90, width: 900, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 104, lineHeight: 1.14, letterSpacing: -1, color: TEXTO,
      textShadow: "0 0 30px rgba(5,7,12,0.95)",
    }}>
      {linhas.map((ws, l) => (
        <div key={l}>
          {ws.map((w, i) => {
            const p = entre(f, w.f - 3, w.f + 3);
            return (
              <span key={i} style={{ color: w.chave ? LARANJA : TEXTO, opacity: p, display: "inline-block", marginLeft: i ? "0.26em" : 0, translate: `0 ${(1 - p) * 16}px` }}>
                {w.t}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// --- fecho: CTA escrito, pequeno ------------------------------------------------------------
const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, T.cta, T.cta + 8);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 1432, left: 0, width: 1080, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, opacity: o }}>
      <Img src={staticFile("ciencia/icone.png")} style={{ width: 64, height: 64 }} />
      <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO }}>SEGUE O CIÊNCIA VISUAL</div>
    </div>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/miniatura/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/miniatura/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const BrasilMiniatura: React.FC = () => (
  <Fundo>
    <Mapa />
    <Prova />
    <Historico />
    <Ranking />
    <Pergunta />
    <Paradoxo />
    <Termometro />
    <MinasEstados />
    <PerguntaFinal />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-miniatura.mjs: riser no colapso, whoosh nas trocas, tiques nos números */}
    <Audio src={staticFile("ciencia/trilha-miniatura.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
export const BrasilMiniaturaCapa: React.FC = () => (
  <Fundo>
    <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2 }}>
      2º TURNO PRESIDENCIAL · 2002–2026
    </div>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs><filter id="brilhoMapa" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={14} /></filter></defs>
      <g transform="translate(540 680) scale(0.8) translate(-540 -790)">
        <MapaQueEncolhe p={0.3} brilho={1} pulso={0} />
      </g>
    </svg>
    <div style={{
      position: "absolute", top: 1050, left: 90, width: 900, textAlign: "center",
      fontFamily: SORA, fontWeight: 300, fontSize: 112, lineHeight: 1.08, letterSpacing: -1.5, color: TEXTO,
      textShadow: "0 0 30px rgba(5,7,12,0.95)",
    }}>
      A cidade que<br />vota igual<br />ao <span style={{ color: LARANJA }}>Brasil</span>
    </div>
    <div style={{ position: "absolute", top: 1450, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 40, letterSpacing: 6, color: LARANJA }}>
      HÁ 24 ANOS
    </div>
  </Fundo>
);
