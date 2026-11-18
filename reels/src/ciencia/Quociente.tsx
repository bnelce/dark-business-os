import { AbsoluteFill, Audio, Easing, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import dados from "./quociente.json";
import T from "./quociente-tempos.json";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre } from "./base";
import { CIANO, FUNDO, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";

// "Como 513 cadeiras são divididas": deputado federal 2026. Só 34 dos 513 eleitos tiveram
// votos próprios iguais ou maiores que o quociente eleitoral do estado. Em São Paulo o
// quociente foi 338.203: cada lista leva uma cadeira a cada quociente, e quem preenche são os
// mais votados dela. Pavanato (PL) teve quase 9 quocientes, Erika Hilton (PSOL) quase 5, e
// Rui Falcão (PT) ficou de fora com 106 mil votos porque os 11 do PT tiveram mais.
//
// Números: quociente.json (scripts/eleicoes/quociente.py, a partir da votação do TSE; confere
// os 513 eleitos). Tempos: quociente-tempos.json (scripts/tempos-narracao.mjs). Os instantes
// dentro das falas (`seg`) foram medidos com silencedetect: regravou, medir de novo.
//
// Neutralidade: listas em cinza e destaque em ciano, sem cor de partido. Os exemplos vêm do
// PL, do PSOL e do PT, nessa ordem da narração, e os três aparecem com a foto oficial de
// candidatura (public/ciencia/quociente/fotos/, só recortada) e o mesmo aro branco.

const Foto: React.FC<{ src: string; x: number; y: number; lado: number; o?: number }> = ({ src, x, y, lado, o = 1 }) => (
  <Img src={staticFile(src)} style={{
    position: "absolute", left: x, top: y, width: lado, height: lado, opacity: o,
    borderRadius: "50%", objectFit: "cover", boxSizing: "border-box", border: `3px solid ${TEXTO}`,
  }} />
);

export const QUOCIENTE_TOTAL = T.total;
const F = T.fala;
const seg = (s: number) => Math.round(s * 30);
const SP = dados.sp, QE = SP.qe;
const CONTORNO = { stroke: FUNDO, strokeWidth: 10, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
const mil = (n: number) => `${Math.round(n / 1000)} MIL`;
const milhoes = (n: number) => `${br(n / 1e6)} MI`;
const lista = (s: string) => s.replace("PT/PC do B/PV", "PT/PCdoB/PV");

// --- plenário: 513 cadeiras em semicírculo ----------------------------------------------
const PLENARIO = (() => {
  const FILAS = 12, R0 = 200, R1 = 430, CX = 540, CY = 1180, N = dados.nacional.eleitos;
  const raios = Array.from({ length: FILAS }, (_, i) => R0 + (i * (R1 - R0)) / (FILAS - 1));
  const soma = raios.reduce((a, b) => a + b, 0);
  const porFila = raios.map((r) => Math.round((N * r) / soma));
  porFila[FILAS - 1] += N - porFila.reduce((a, b) => a + b, 0);
  const cadeiras = raios.flatMap((r, i) => Array.from({ length: porFila[i] }, (_, j) => {
    const a = Math.PI - (j * Math.PI) / (porFila[i] - 1);
    return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a), a };
  }));
  cadeiras.sort((p, q) => q.a - p.a);
  // Quais acendem não importa (o dado é a contagem): sorteio fixo, espalhado pelo plenário.
  let s = 2026;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const idx = cadeiras.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const acesas = new Set(idx.slice(0, dados.nacional.comVotosProprios));
  return cadeiras.map((c, i) => ({ ...c, acesa: acesas.has(i) }));
})();

const CenaPlenario: React.FC = () => {
  const f = useCurrentFrame();
  const fim = f >= F.conclusao;
  const visivel = fim
    ? Math.min(entre(f, F.conclusao + 5, F.conclusao + 20), 1 - entre(f, F.cta, F.cta + 15))
    : 1 - entre(f, F.quociente, F.quociente + 15);
  if (visivel <= 0) return null;
  const outros = fim ? 1 : entre(f, seg(5.4), seg(5.4) + 20);
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="DEPUTADOS FEDERAIS 2026" direita={`${dados.nacional.eleitos} CADEIRAS`} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilho" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={6} /></filter>
        </defs>
        {PLENARIO.map((c, i) => c.acesa
          ? <g key={i}><circle cx={c.x} cy={c.y} r={16} fill={CIANO} opacity={0.35} filter="url(#brilho)" /><circle cx={c.x} cy={c.y} r={8.5} fill={CIANO} /></g>
          : <circle key={i} cx={c.x} cy={c.y} r={8.5} fill={TEXTO_2} opacity={0.3 + 0.25 * outros} />)}
        <text x={X0} y={1270} fill={CIANO} fontFamily={MONO} fontSize={30} letterSpacing={2}>● {dados.nacional.comVotosProprios} COM VOTOS PRÓPRIOS</text>
        <text x={X0} y={1320} fill={TEXTO_2} fillOpacity={0.5 + 0.5 * outros} fontFamily={MONO} fontSize={30} letterSpacing={2}>
          ● {dados.nacional.eleitos - dados.nacional.comVotosProprios} COM VOTOS DO PARTIDO
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// --- o quociente: votos válidos ÷ cadeiras ----------------------------------------------
const CenaDivisao: React.FC = () => {
  const f = useCurrentFrame();
  const Q = F.quociente;
  const visivel = Math.min(entre(f, Q + 5, Q + 20), 1 - entre(f, F.partido, F.partido + 15));
  if (visivel <= 0) return null;
  const barra = entre(f, Q + seg(2.06), Q + seg(2.06) + 25, Easing.out(Easing.cubic));
  const cortes = entre(f, Q + seg(3.6), Q + seg(3.6) + 30);
  const fatia = entre(f, Q + seg(6.73), Q + seg(6.73) + 12);
  const largura = (X1 - X0) / SP.vagas;
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="SÃO PAULO" direita={`${SP.vagas} CADEIRAS`} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <text x={X0} y={740} fill={TEXTO} fillOpacity={barra} fontFamily={MONO} fontSize={28} letterSpacing={2}>
          {SP.validos.toLocaleString("pt-BR")} VOTOS VÁLIDOS
        </text>
        <rect x={X0} y={770} width={(X1 - X0) * barra} height={80} fill={TEXTO_2} opacity={0.55} />
        {Array.from({ length: SP.vagas - 1 }, (_, i) => {
          const o = entre(cortes, i / SP.vagas, i / SP.vagas + 0.1);
          return o > 0 && <line key={i} x1={X0 + (i + 1) * largura} x2={X0 + (i + 1) * largura} y1={770} y2={850} stroke={FUNDO} strokeWidth={3} opacity={o} />;
        })}
        <text x={X1} y={900} textAnchor="end" fill={TEXTO} fillOpacity={cortes} fontFamily={MONO} fontSize={28} letterSpacing={2}>÷ {SP.vagas} CADEIRAS</text>
        {fatia > 0 && (
          <g opacity={fatia}>
            <rect x={X0} y={770} width={largura} height={80} fill={CIANO} />
            <line x1={X0 + largura / 2} x2={X0 + largura / 2} y1={860} y2={990} stroke={CIANO} strokeWidth={3} />
          </g>
        )}
      </svg>
      <div style={{ position: "absolute", top: 1000, left: X0, opacity: fatia }}>
        <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 110, color: CIANO, letterSpacing: -2 }}>= {QE.toLocaleString("pt-BR")}</div>
        <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2 }}>VOTOS POR CADEIRA: O QUOCIENTE ELEITORAL</div>
      </div>
    </AbsoluteFill>
  );
};

// --- cada lista: os votos em blocos de um quociente ---------------------------------------
const BX0 = 360, BX1 = X1;
const MAIOR = SP.listas[0][1] as number;
const xVotos = (v: number) => (v / MAIOR) * (BX1 - BX0);

const Blocos: React.FC<{ x: number; y: number; votos: number; escala: number; h: number; cor: string; o?: number }> = ({ x, y, votos, escala, h, cor, o = 1 }) => {
  const n = Math.floor(votos / QE);
  return (
    <g opacity={o}>
      <rect x={x} y={y} width={votos * escala} height={h} fill={cor} />
      {Array.from({ length: n }, (_, i) => (
        <line key={i} x1={x + (i + 1) * QE * escala} x2={x + (i + 1) * QE * escala} y1={y} y2={y + h} stroke={FUNDO} strokeWidth={3} />
      ))}
    </g>
  );
};

const CenaListas: React.FC = () => {
  const f = useCurrentFrame();
  const P = F.partido;
  const visivel = Math.min(entre(f, P + 5, P + 20), 1 - entre(f, F.puxador, F.puxador + 15));
  if (visivel <= 0) return null;
  const blocos = entre(f, P + seg(4.3), P + seg(4.3) + 12);
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="LISTAS · SP" direita={blocos > 0 ? `1 BLOCO = ${mil(QE)}` : ""} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {(SP.listas as [string, number, number][]).map(([sigla, votos], i) => {
          const y = 560 + i * 72;
          const cresce = entre(f, P + 10 + i * 5, P + 40 + i * 5, Easing.out(Easing.cubic));
          return (
            <g key={sigla}>
              <text x={X0} y={y + 34} fill={TEXTO} fontFamily={MONO} fontSize={26}>{lista(sigla)}</text>
              <rect x={BX0} y={y + 6} width={xVotos(votos) * cresce} height={36} fill={TEXTO_2} opacity={0.6} />
              {blocos > 0 && <Blocos x={BX0} y={y + 6} votos={votos} escala={(BX1 - BX0) / MAIOR} h={36} cor={CIANO} o={0.85 * blocos} />}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// --- puxador e puxadora: os votos de uma pessoa viram cadeiras dos colegas ---------------
const ESCALA = (X1 - X0) / MAIOR;

const CenaPuxador: React.FC<{ de: number; ate: number; titulo: string; nome: string; quem: string; foto: string; votos: number; total: number; eleitos: [string, number][]; rotuloUltimo: string; marcas: { blocos: number; uma: number; outras: number } }> = ({
  de, ate, titulo, nome, quem, foto, votos, total, eleitos, rotuloUltimo, marcas,
}) => {
  const f = useCurrentFrame();
  const visivel = Math.min(entre(f, de + 5, de + 20), 1 - entre(f, ate, ate + 15));
  if (visivel <= 0) return null;
  const barra = entre(f, de + 10, de + 40, Easing.out(Easing.cubic));
  const blocos = entre(f, de + marcas.blocos, de + marcas.blocos + 12);
  const uma = entre(f, de + marcas.uma, de + marcas.uma + 10);
  const outras = entre(f, de + marcas.outras, de + marcas.outras + 30, Easing.inOut(Easing.cubic));
  // "Quase nove cadeiras": 8,98 quocientes contam como 9, uma dele(a) e o resto pros colegas.
  const dele = Math.round(votos / QE);
  const passo = Math.min(40, (X1 - X0) / eleitos.length);
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda={titulo} direita={`${eleitos.length} ELEITOS`} />
      <Foto src={foto} x={X0} y={540} lado={130} o={barra} />
      <div style={{ position: "absolute", left: X0 + 156, top: 568, fontFamily: MONO, color: TEXTO, opacity: barra }}>
        <div style={{ fontSize: 30, letterSpacing: 2 }}>{quem}</div>
        <div style={{ fontSize: 26, letterSpacing: 2, color: TEXTO_2, marginTop: 10 }}>{votos.toLocaleString("pt-BR")} VOTOS</div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="brilhoP" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={6} /></filter>
        </defs>
        <text x={X0} y={735} fill={TEXTO_2} fontFamily={MONO} fontSize={26} letterSpacing={2}>VOTOS DA LISTA: {milhoes(total)}</text>
        <rect x={X0} y={750} width={total * ESCALA * barra} height={70} fill={TEXTO_2} opacity={0.45} />
        <Blocos x={X0} y={750} votos={votos * barra} escala={ESCALA} h={70} cor={CIANO} />
        <text x={X0} y={870} fill={CIANO} fontFamily={MONO} fontSize={28} letterSpacing={2} opacity={barra}>{nome}: {milhoes(votos)}</text>
        {blocos > 0 && (
          <text x={X0} y={915} fill={TEXTO} fillOpacity={blocos} fontFamily={MONO} fontSize={28} letterSpacing={2}>
            ≈ {br(votos / QE, 2)} QUOCIENTES
          </text>
        )}
        {uma > 0 && <rect x={X0} y={750} width={QE * ESCALA} height={70} fill={TEXTO} opacity={uma} />}
        {eleitos.map(([, v], i) => {
          const x = X0 + 18 + i * passo, y = 1060;
          // A 1ª cadeira é dela(e); as próximas `dele - 1` saem dos votos dela(e).
          const vemDele = i > 0 && i < dele;
          const o = i === 0 ? uma : vemDele ? outras : entre(f, de + marcas.outras + 20, de + marcas.outras + 40);
          if (o <= 0) return null;
          const origem = X0 + (i + 0.5) * QE * ESCALA;
          const cx = vemDele ? origem + (x - origem) * outras : x;
          const cy = vemDele ? 785 + (y - 785) * outras : y;
          return (
            <g key={i} opacity={o}>
              {i === 0 && <circle cx={cx} cy={cy} r={22} fill={TEXTO} opacity={0.3} filter="url(#brilhoP)" />}
              <circle cx={cx} cy={cy} r={13} fill={i === 0 ? TEXTO : vemDele ? CIANO : TEXTO_2} opacity={vemDele || i === 0 ? 1 : 0.6} />
            </g>
          );
        })}
        {outras > 0 && (
          <g opacity={entre(f, de + marcas.outras + 30, de + marcas.outras + 45)}>
            <text x={X0} y={1130} fill={CIANO} fontFamily={MONO} fontSize={26} letterSpacing={2}>● AS OUTRAS {Math.min(dele, eleitos.length) - 1} VÃO PROS COLEGAS</text>
            <text x={X0} y={1175} fill={TEXTO_2} fontFamily={MONO} fontSize={26} letterSpacing={2}>{rotuloUltimo}: {mil(eleitos[eleitos.length - 1][1])} VOTOS</text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// --- fora: a ordem dentro da lista --------------------------------------------------------
const CenaFora: React.FC = () => {
  const f = useCurrentFrame();
  const D = F.fora;
  const visivel = Math.min(entre(f, D + 5, D + 20), 1 - entre(f, F.conclusao, F.conclusao + 15));
  if (visivel <= 0) return null;
  const eleitos = SP.pt as [string, number][];
  const rui = (SP.ptCandidatos as [string, number][]).find(([n]) => n === "RUI FALCÃO")!;
  const ruiO = entre(f, D + seg(1.3), D + seg(1.3) + 12);
  const foraO = entre(f, D + seg(4.9), D + seg(4.9) + 10);
  const colegas = D + seg(6.4);
  const Y0 = 560, PASSO = 50, CORTE = Y0 + eleitos.length * PASSO + 6;
  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      <Status esquerda="PT/PCdoB/PV · SÃO PAULO" direita={`${eleitos.length} CADEIRAS`} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {eleitos.map(([nome, votos], i) => {
          const o = entre(f, colegas + i * 3, colegas + i * 3 + 10);
          if (o <= 0) return null;
          const y = Y0 + i * PASSO + 30;
          return (
            <g key={nome} opacity={o} fontFamily={MONO} fontSize={26}>
              <text x={X0} y={y} fill={CIANO}>✓</text>
              <text x={X0 + 44} y={y} fill={TEXTO}>{nome}</text>
              <text x={X1} y={y} textAnchor="end" fill={TEXTO}>{votos.toLocaleString("pt-BR")}</text>
            </g>
          );
        })}
        <line x1={X0} x2={X1} y1={CORTE} y2={CORTE} stroke={CIANO} strokeWidth={3} strokeDasharray="12 10" opacity={entre(f, colegas + 40, colegas + 50)} />
        <g opacity={ruiO} fontFamily={MONO} fontSize={30}>
          <rect x={X0 - 16} y={CORTE + 26} width={X1 - X0 + 32} height={64} rx={6} fill="rgba(232,244,255,0.06)" stroke={TEXTO} strokeOpacity={0.5} />
          <text x={X0 + 112} y={CORTE + 69} fill={TEXTO}>{rui[0]}</text>
          <text x={X1} y={CORTE + 69} textAnchor="end" fill={TEXTO}>{rui[1].toLocaleString("pt-BR")}</text>
          <text x={X0} y={CORTE + 69} fill={TEXTO} opacity={foraO}>✗</text>
        </g>
        {foraO > 0 && (
          <text x={540} y={CORTE + 150} textAnchor="middle" fill={TEXTO} fillOpacity={foraO} fontFamily={MONO} fontSize={30} letterSpacing={4}>FICOU DE FORA</text>
        )}
        {f >= colegas + 40 && (
          <text x={540} y={CORTE + 200} textAnchor="middle" fill={CIANO} fillOpacity={entre(f, colegas + 40, colegas + 50)} fontFamily={MONO} fontSize={26} letterSpacing={2}>
            OS {eleitos.length} DE CIMA TIVERAM MAIS VOTOS
          </text>
        )}
      </svg>
      <Foto src="ciencia/quociente/fotos/rui-falcao.jpg" x={X0 + 34} y={CORTE + 30} lado={56} o={ruiO} />
    </AbsoluteFill>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é audio/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(T.fala).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/quociente/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

const pl = SP.pl as [string, number][], psol = SP.psol as [string, number][];
const votosLista = (sigla: string) => (SP.listas as [string, number, number][]).find(([s]) => s === sigla)![1];

export const Quociente: React.FC = () => (
  <Fundo>
    <CenaPlenario />
    <CenaDivisao />
    <CenaListas />
    <CenaPuxador de={F.puxador} ate={F.puxadora} titulo="PL · SÃO PAULO" nome="PAVANATO" quem="LUCAS PAVANATO · PL" foto="ciencia/quociente/fotos/pavanato.jpg" votos={pl[0][1]} total={votosLista("PL")}
      eleitos={pl} rotuloUltimo="ÚLTIMO ELEITO DO PL" marcas={{ blocos: seg(4.18), uma: seg(5.86), outras: seg(7.12) }} />
    <CenaPuxador de={F.puxadora} ate={F.fora} titulo="PSOL/REDE · SÃO PAULO" nome="ERIKA HILTON" quem="ERIKA HILTON · PSOL" foto="ciencia/quociente/fotos/erika-hilton.jpg" votos={psol[0][1]} total={votosLista("PSOL/REDE")}
      eleitos={psol} rotuloUltimo="ÚLTIMA ELEITA DO PSOL/REDE" marcas={{ blocos: seg(1.1), uma: seg(2.1), outras: seg(3.6) }} />
    <CenaFora />
    <Manchete de={-10} ate={F.quociente - 4}>Só {dados.nacional.comVotosProprios} dos {dados.nacional.eleitos} deputados{"\n"}se elegeram com{"\n"}<Destaque>os próprios votos.</Destaque></Manchete>
    <Manchete de={F.quociente} ate={F.partido - 4}>Votos válidos ÷ cadeiras{"\n"}<Destaque>= quociente eleitoral.</Destaque></Manchete>
    <Manchete de={F.partido} ate={F.puxador - 4}>A cada {mil(QE).toLowerCase()} votos,{"\n"}<Destaque>o partido leva uma cadeira.</Destaque></Manchete>
    <Manchete de={F.puxador} ate={F.puxadora - 4}>Pavanato (PL): 3 milhões.{"\n"}<Destaque>Quase 9 cadeiras.</Destaque></Manchete>
    <Manchete de={F.puxadora} ate={F.fora - 4}>Erika Hilton (PSOL){"\n"}<Destaque>também puxou colegas.</Destaque></Manchete>
    <Manchete de={F.fora} ate={F.conclusao - 4}>Rui Falcão (PT):{"\n"}106 mil votos.{"\n"}<Destaque>Ficou de fora.</Destaque></Manchete>
    <Manchete de={F.conclusao} ate={F.cta - 4}>Você vota numa pessoa.{"\n"}<Destaque>A conta começa{"\n"}pelo partido.</Destaque></Manchete>
    <Manchete de={F.cta} ate={T.marca} centro>Segue pra ver a ciência{"\n"}<Destaque>escondida nos dados.</Destaque></Manchete>
    <Fonte texto="FONTE: TSE · VOTAÇÃO DE DEPUTADO FEDERAL 2026" ate={F.cta} />
    <Marca de={T.marca} />
    <Narracao />
    {/* scripts/gerar-trilha-narrada.mjs: por baixo da voz, como no reel da apuração */}
    <Audio src={staticFile("ciencia/trilha-quociente.mp3")} volume={0.22} />
  </Fundo>
);
