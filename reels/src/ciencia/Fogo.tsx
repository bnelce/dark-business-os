import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import dados from "./fogo-para.json";
import T from "./fogo-para-tempos.json";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, TEXTO, TEXTO_2 } from "./tokens";
import { CeuDia, Chama, FocoNaoIncendio, NeonDefs, SateliteAQUA, SateliteGOES, Varredura } from "./ilustra-fogo-para";

// "O Pará nunca queimou tanto num outubro": 1 a 27 de outubro de 2026, 11.274 focos pelo
// satélite de referência do INPE, o maior número da série que começa em 2003. Com narração.
//
// Todos os números vêm de fogo-para.json, gerado por scripts/gerar-fogo.mjs a partir dos
// arquivos do Programa Queimadas (o script confere a série contra a conta feita à mão).
// Duas contagens, de propósito: a série entre anos usa só o satélite de referência
// (AQUA_M-T); os mapas usam só o GOES-19, que passa a cada 10 minutos. Somar satélites
// contaria o mesmo fogo várias vezes. Os dois satélites aparecem desenhados, cada um na
// cena que usa os dados dele, e o esquema "foco não é incêndio" explica por que um só.
//
// Tempos: fogo-para-tempos.json (scripts/tempos-fogo-para.mjs, a partir da duração de cada
// fala). A trilha (scripts/gerar-trilha-fogo.mjs) lê o mesmo arquivo.
//
// O laranja aqui é o próprio fogo, o ponto quente do design guide. Todo o resto fica no
// ciano e no escuro da marca. Ilustrações em ilustra-fogo-para.tsx.

const F = T.fala;
export const FOGO_TOTAL = T.total;

type Celula = [number, number, number, number, number]; // x, y, dia da 1ª detecção (desde 1/10), detecções, é do Pará
type Deteccao = [number, number, number]; // x, y, minuto do dia em Brasília
const CELULAS = dados.mapaMes as Celula[];
const DIA = dados.dia24 as Deteccao[];
const ANOS = Object.keys(dados.historico).map(Number).sort((a, b) => a - b);
const H = dados.historico as Record<string, number>;
const ATUAL = ANOS[ANOS.length - 1];
const RECORDE_ANTES = ANOS.slice(0, -1).reduce((m, a) => (H[a] > H[m] ? a : m), ANOS[0]);
const milhar = (n: number) => n.toLocaleString("pt-BR");

const BrilhoDefs: React.FC = () => (
  <defs>
    <filter id="fogo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={6} /></filter>
  </defs>
);

// --- cena 1 e 5: o mês inteiro no mapa do Brasil ----------------------------------------
const raioCel = (n: number) => 1.4 + Math.log1p(n) * 0.85;

// O GOES-19 fica parado sobre o equador, a oeste do Brasil: no mapa, o canto de cima à
// esquerda, fora do contorno. A abertura dos instrumentos é a origem do leque.
const GOES = { x: 196, y: 584, escala: 1.2 };
const ABERTURA = { x: GOES.x, y: GOES.y + 25 * GOES.escala };
const PASSADA = 46; // quadros de uma passada de norte a sul
const INTERVALO = 54; // uma passada nova a cada 54 quadros: o "a cada 10 minutos" do vídeo

const MapaMes: React.FC = () => {
  const f = useCurrentFrame();
  const visivel = Math.max(1 - entre(f, T.historico - 10, T.historico + 5), entre(f, T.fim - 10, T.fim + 10));
  if (visivel <= 0) return null;
  // O quadro 0 é a capa: já abre com oito dias acesos.
  const d = f < T.historico ? 8 + (dados.ateDia - 8) * entre(f, 0, T.historico - 40, Easing.inOut(Easing.quad)) : dados.ateDia;
  // O contorno do Pará acende quando a voz diz "Pará".
  const destaquePA = f < T.historico ? entre(f, T.destaquePA, T.destaquePA + 25) : 1;
  const diaRotulo = Math.min(dados.ateDia, Math.max(1, Math.ceil(d)));
  // O satélite se desenha quando a narração o apresenta e volta pronto no mapa final.
  const desenhoGOES = f < T.historico ? entre(f, F.satelite, F.satelite + 36, Easing.inOut(Easing.quad)) : 1;
  const rotuloGOES = f < T.historico ? entre(f, T.goesNome, T.goesNome + 10) : entre(f, T.fim + 10, T.fim + 25);
  // Passadas: do momento em que a voz diz "um satélite parado" até o mapa sair; no fim, mais duas.
  const inicioVarre = f < T.historico ? T.varredura : T.fim + 15;
  const fimVarre = f < T.historico ? T.historico - 10 : T.fim + 15 + 2 * INTERVALO;
  const k = Math.floor((f - inicioVarre) / INTERVALO);
  const tVarre = f >= inicioVarre && f < fimVarre ? (f - inicioVarre - k * INTERVALO) / PASSADA : 0;
  // Onde a linha passa, os focos piscam: é a foto sendo tirada.
  const yVarre = tVarre > 0 && tVarre < 1 ? 540 + 760 * tVarre : -1e4;
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda={`${diaRotulo} DE OUTUBRO`} direita="GOES-19 · A CADA 10 MIN" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <BrilhoDefs />
        <NeonDefs />
        {dados.contornosBR.map((p, k) => <path key={k} d={p} fill="none" stroke={CIANO} strokeOpacity={0.2} strokeWidth={1.2} />)}
        {[true, false].map((halo) => (
          <g key={String(halo)} filter={halo ? "url(#fogo)" : undefined} opacity={halo ? 0.7 : 1}>
            {CELULAS.map(([x, y, q, n, pa], k) => {
              if (q > d) return null;
              // Quando o contorno do Pará acende, o resto do país recua: a história é o Pará.
              const recuo = pa ? 1 : 1 - 0.7 * destaquePA;
              // Recém-acesa nasce quase branca e assenta no laranja em meio dia.
              const novo = Math.max(1 - Math.min(1, (d - q) / 0.5), 1 - Math.abs(y - yVarre) / 24);
              return <circle key={k} cx={x} cy={y} r={raioCel(n) * (halo ? 1.8 : 1) * (1 + 0.5 * novo)}
                fill={novo > 0.5 ? "#FFD2B0" : LARANJA} opacity={(0.55 + 0.45 * Math.min(1, n / 40)) * recuo} />;
            })}
          </g>
        ))}
        <path d={dados.contornosBR[dados.indicePA]} fill="none" stroke={TEXTO} strokeOpacity={0.8 * destaquePA} strokeWidth={2} />
        <Varredura ox={ABERTURA.x} oy={ABERTURA.y} t={tVarre} x0={164} x1={896} y0={540} y1={1300} opacidade={1} />
        {desenhoGOES > 0 && <SateliteGOES x={GOES.x} y={GOES.y} escala={GOES.escala} p={desenhoGOES} rotulo={rotuloGOES} />}
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 2: os outubros do Pará desde 2003 ---------------------------------------------
const BY0 = 600, BY1 = 1290, BMAX = 12000;
const yBar = (n: number) => BY1 - (n / BMAX) * (BY1 - BY0);

const Historico: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, T.historico, T.foco, 12);
  if (o <= 0) return null;
  const passo = (X1 - X0) / ANOS.length, larg = passo * 0.68;
  const aqua = entre(f, T.aqua, T.aqua + 30, Easing.inOut(Easing.quad));
  // A órbita do AQUA é uma faixa tracejada que atravessa o canto vazio do gráfico (os anos
  // de 2003 a 2008 são todos menores que 10 mil). O satélite anda devagar por ela.
  const orb = (t: number) => ({ x: 150 + 340 * t, y: 700 - 120 * t - 40 * Math.sin(Math.PI * t) });
  const pos = orb(0.3 + 0.12 * entre(f, T.aqua, T.foco));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="PARÁ · 1–27 OUT" direita="SATÉLITE AQUA (REF.)" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <BrilhoDefs />
        <NeonDefs />
        {[5000, 10000].map((v) => (
          <g key={v}>
            <line x1={X0} x2={X1} y1={yBar(v)} y2={yBar(v)} stroke={TEXTO_2} strokeOpacity={0.2} />
            <text x={X0 - 14} y={yBar(v) + 9} textAnchor="end" fill={TEXTO_2} fontFamily={MONO} fontSize={24}>{milhar(v)}</text>
          </g>
        ))}
        <line x1={X0} x2={X1} y1={BY1} y2={BY1} stroke={TEXTO_2} strokeOpacity={0.5} />
        {aqua > 0 && (
          <g>
            {/* Tracejado feito à mão (um traço a cada dois passos), que aparece da esquerda pra direita. */}
            {Array.from({ length: 20 }, (_, i) => {
              const a = orb(i / 20), b = orb((i + 0.45) / 20);
              return i / 20 <= aqua && <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={CIANO} strokeOpacity={0.45} strokeWidth={1} />;
            })}
            <SateliteAQUA x={pos.x} y={pos.y} p={aqua} escala={1.5} />
            <g opacity={entre(f, T.aqua + 15, T.aqua + 30)}>
              <text x={pos.x + 118} y={pos.y + 9} fill={CIANO} fontFamily={MONO} fontSize={26} letterSpacing={3}>AQUA</text>
              <text x={pos.x + 118} y={pos.y + 44} fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2}>O MESMO SATÉLITE DESDE 2003</text>
            </g>
          </g>
        )}
        {ANOS.map((a, i) => {
          const atual = a === ATUAL;
          // Os anteriores sobem em sequência; o de agora sobe sozinho, quando a voz diz o número.
          const de = atual ? T.barraAtual : T.historico + 10 + i * 4;
          const p = entre(f, de, de + (atual ? 45 : 20), Easing.out(Easing.cubic));
          const x = X0 + i * passo + (passo - larg) / 2;
          const y = yBar(H[a] * p);
          const rotulo = atual ? p > 0.95 : f >= T.recordeAnterior;
          return (
            <g key={a}>
              {atual && <rect x={x - 4} y={y - 4} width={larg + 8} height={BY1 - y + 4} fill={LARANJA} opacity={0.35} filter="url(#fogo)" />}
              <rect x={x} y={y} width={larg} height={BY1 - y} fill={atual ? LARANJA : a === RECORDE_ANTES ? TEXTO : TEXTO_2}
                opacity={atual ? 1 : a === RECORDE_ANTES ? 0.45 + 0.3 * entre(f, T.recordeAnterior, T.recordeAnterior + 10) : 0.45} />
              {(a === ANOS[0] || (a % 5 === 0 && a - ANOS[0] > 3 && ATUAL - a > 2) || atual) && (
                <text x={x + larg / 2} y={BY1 + 42} textAnchor="middle" fill={atual ? LARANJA : TEXTO_2} fontFamily={MONO} fontSize={24}>{a}</text>
              )}
              {(atual || a === RECORDE_ANTES) && rotulo && (
                <text x={atual ? x + larg / 2 : x + larg} y={y - 18} textAnchor="end" fill={atual ? LARANJA : TEXTO} fontFamily={MONO} fontSize={30}>
                  {milhar(H[a])}{atual ? "" : ` · ${a}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 2b: por que um satélite só -----------------------------------------------------
const FocoIncendio: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, T.foco, T.dia, 12);
  if (o <= 0) return null;
  const grade = entre(f, T.foco + 5, T.foco + 40, Easing.inOut(Easing.quad));
  const fogo = entre(f, T.focoFogo, T.focoFogo + 30, Easing.inOut(Easing.quad));
  const pixels = entre(f, T.focoPixels, T.focoPixels + 45);
  const mesmo = entre(f, T.focoMesmo, T.focoMesmo + 15);
  const sat = entre(f, T.foco + 10, T.foco + 40, Easing.inOut(Easing.quad));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="O QUE É UM FOCO" direita="ESQUEMA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <NeonDefs />
        {/* O satélite olha a grade de cima: o leque vai até os cantos dela. */}
        <path d={`M510,628 L204,760 M510,628 L876,760`} fill="none" stroke={CIANO} strokeOpacity={0.22 * sat} strokeWidth={1} />
        <SateliteAQUA x={510} y={600} p={sat} escala={1.8} />
        <text x={652} y={610} fill={CIANO} opacity={sat} fontFamily={MONO} fontSize={24} letterSpacing={3}>AQUA</text>
        <FocoNaoIncendio grade={grade} fogo={fogo} pixels={pixels} f={f} />
        <g fontFamily={MONO} fontSize={30} letterSpacing={2}>
          <text x={X0} y={1316} fill={TEXTO} opacity={fogo}>1 INCÊNDIO</text>
          <text x={X1} y={1316} textAnchor="end" fill={LARANJA} opacity={entre(f, T.focoPixels + 20, T.focoPixels + 35)}>VÁRIOS FOCOS</text>
        </g>
        <path d="M460,1306 L570,1306 M558,1296 L570,1306 L558,1316" fill="none" stroke={TEXTO_2} strokeWidth={2}
          opacity={entre(f, T.focoPixels + 10, T.focoPixels + 25)} />
        <text x={540} y={1400} textAnchor="middle" fill={TEXTO} opacity={mesmo} fontFamily={MONO} fontSize={26} letterSpacing={2}>
          POR ISSO A SÉRIE USA
        </text>
        <text x={540} y={1440} textAnchor="middle" fill={CIANO} opacity={mesmo} fontFamily={MONO} fontSize={26} letterSpacing={2}>
          SEMPRE O MESMO SATÉLITE
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 3 e 4: o Pará de perto ---------------------------------------------------------
const MapaPara: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <BrilhoDefs />
    <NeonDefs />
    <clipPath id="quadroPA"><rect x={0} y={440} width={1080} height={860} /></clipPath>
    <g clipPath="url(#quadroPA)">
      {dados.contornosPA.vizinhos.map((p, k) => <path key={k} d={p} fill="none" stroke={CIANO} strokeOpacity={0.12} strokeWidth={1} />)}
    </g>
    <path d={dados.contornosPA.para} fill="none" stroke={TEXTO} strokeOpacity={0.7} strokeWidth={1.8} />
    {children}
  </svg>
);

const hora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}h${String(Math.floor(min % 60)).padStart(2, "0")}`;
const RELOGIO = T.relogio as [number, number][];

const VinteQuatroHoras: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(entre(f, T.dia, T.dia + 15), 1 - entre(f, T.cidades - 10, T.cidades + 5));
  if (o <= 0) return null;
  // O relógio anda rápido onde não há fogo e devagar onde ele volta: as âncoras vêm da fala.
  const m = interpolate(f, RELOGIO.map((r) => r[0]), RELOGIO.map((r) => r[1]), { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const JANELA = 90; // minutos que um foco fica aceso depois de detectado
  const hAtual = Math.min(23, Math.floor(m / 60));
  const maxH = Math.max(...dados.porHora);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda={`PARÁ · ${Number(dados.dia24h.slice(8, 10))} DE OUTUBRO`} direita={`HORA ${hora(Math.min(m, 1439))}`} />
      <MapaPara>
        {[true, false].map((halo) => (
          <g key={String(halo)} filter={halo ? "url(#fogo)" : undefined} opacity={halo ? 0.8 : 1}>
            {DIA.map(([x, y, mi], k) => {
              const idade = m - mi;
              if (idade < 0 || idade > JANELA) return null;
              const vivo = 1 - idade / JANELA;
              return <circle key={k} cx={x} cy={y} r={(halo ? 12 : 4.5) * (0.6 + 0.4 * vivo)} fill={vivo > 0.85 ? "#FFD2B0" : LARANJA} opacity={vivo} />;
            })}
          </g>
        ))}
      </MapaPara>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <NeonDefs />
        {/* O céu fica na faixa vazia entre a manchete e o relógio: o sol e a lua dizem que
            hora do dia é, sem precisar ler o número. */}
        <CeuDia cx={750} cy={428} rx={185} ry={92} minuto={m} p={entre(f, T.dia + 5, T.dia + 25)} />
        {dados.porHora.map((n, h) => {
          const larg = (X1 - X0) / 24;
          const alt = (n / maxH) * 170;
          const passou = h <= hAtual;
          return (
            <rect key={h} x={X0 + h * larg + 2} y={1500 - (passou ? alt : 0)} width={larg - 4} height={passou ? alt : 0}
              fill={h === hAtual ? LARANJA : TEXTO_2} opacity={h === hAtual ? 1 : 0.6} />
          );
        })}
        <line x1={X0} x2={X1} y1={1500} y2={1500} stroke={TEXTO_2} strokeOpacity={0.5} />
        {[0, 6, 12, 18].map((h) => (
          <text key={h} x={X0 + h * ((X1 - X0) / 24)} y={1540} fill={TEXTO_2} fontFamily={MONO} fontSize={24}>{h}h</text>
        ))}
        <text x={X0} y={1585} fill={TEXTO_2} fontFamily={MONO} fontSize={22} letterSpacing={2}>FOCOS DETECTADOS POR HORA</text>
      </svg>
    </AbsoluteFill>
  );
};

const Cidades: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(entre(f, T.cidades - 5, T.cidades + 15), 1 - entre(f, T.fim - 10, T.fim + 5));
  if (o <= 0) return null;
  const maxF = dados.topo[0].focos;
  // Cada cidade acende quando a voz diz o nome dela.
  const de = (i: number) => T.nomes[i] - 6;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="PARÁ · 1–27 OUT" direita="SATÉLITE AQUA (REF.)" />
      <MapaPara>
        {dados.topo.map((c, i) => {
          const p = entre(f, de(i), de(i) + 20, Easing.out(Easing.back(1.6)));
          const r = 14 + 40 * Math.sqrt(c.focos / maxF);
          return (
            <g key={c.nome} opacity={Math.min(1, p)}>
              <circle cx={c.x} cy={c.y} r={r * 1.3 * p} fill={LARANJA} opacity={0.22} filter="url(#fogo)" />
              <circle cx={c.x} cy={c.y} r={r * p} fill={FUNDO} fillOpacity={0.55} stroke={LARANJA} strokeWidth={2.5} />
              <Chama x={c.x} y={c.y - 10} escala={1.15} f={f + i * 11} opacidade={entre(f, de(i) + 6, de(i) + 16)} />
              <text x={c.x} y={c.y + 32} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={24}
                stroke={FUNDO} strokeWidth={6} paintOrder="stroke">{i + 1}</text>
            </g>
          );
        })}
      </MapaPara>
      <div style={{ position: "absolute", top: 1320, left: X0, width: X1 - X0 }}>
        {dados.topo.map((c, i) => (
          <div key={c.nome} style={{
            display: "flex", justifyContent: "space-between", height: 50, alignItems: "center",
            fontFamily: MONO, fontSize: 30, letterSpacing: 2, color: TEXTO,
            opacity: entre(f, de(i), de(i) + 10),
          }}>
            <span><span style={{ color: LARANJA }}>{i + 1}</span>  {c.nome.toUpperCase()}</span>
            <span>{milhar(c.focos)}</span>
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
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/fogo-para/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Fogo: React.FC = () => {
  const umEmCada = Math.round(H[ATUAL] / dados.somaTopo);
  return (
    <Fundo>
      <MapaMes />
      <Historico />
      <FocoIncendio />
      <VinteQuatroHoras />
      <Cidades />
      <Manchete de={-10} ate={F.satelite - 4}>O Pará nunca queimou{"\n"}<Destaque cor={LARANJA}>tanto num outubro.</Destaque></Manchete>
      <Manchete de={F.satelite} ate={T.historico - 2}>Visto do <Destaque>GOES-19</Destaque>,{"\n"}a cada 10 minutos.</Manchete>
      <Manchete de={F.recorde} ate={T.foco - 2}>
        <Destaque cor={LARANJA}>{milhar(H[ATUAL])} focos</Destaque> em {dados.ateDia} dias.{"\n"}Recorde anterior: {milhar(H[RECORDE_ANTES])}.
      </Manchete>
      <Manchete de={F.foco} ate={T.dia - 2}>Um foco não é{"\n"}<Destaque cor={LARANJA}>um incêndio.</Destaque></Manchete>
      <Manchete de={F.madrugada} ate={F.tarde - 4}>Em 24 horas, o fogo{"\n"}some de madrugada…</Manchete>
      <Manchete de={F.tarde} ate={T.cidades - 2}>…e volta{"\n"}<Destaque cor={LARANJA}>toda tarde.</Destaque></Manchete>
      <Manchete de={F.cidades} ate={T.fim - 2}>Cinco cidades somam{"\n"}<Destaque cor={LARANJA}>1 em cada {umEmCada} focos.</Destaque></Manchete>
      <Manchete de={F.fim} ate={F.cta - 4}>Cada ponto é um foco{"\n"}<Destaque cor={LARANJA}>visto do espaço.</Destaque></Manchete>
      <Manchete de={F.cta} ate={T.marca}>Segue pra ver a ciência{"\n"}<Destaque>escondida nos dados.</Destaque></Manchete>
      <Fonte texto="FONTE: INPE · PROGRAMA QUEIMADAS · OUT/2026" ate={T.marca} />
      <Marca de={T.marca} />
      <Narracao />
      {/* scripts/gerar-trilha-fogo.mjs: mais baixa, por baixo da voz */}
      <Audio src={staticFile("ciencia/trilha-fogo.mp3")} volume={0.22} />
    </Fundo>
  );
};
