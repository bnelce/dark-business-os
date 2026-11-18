import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./custo-voto.json";
import T from "./custo-voto-tempos.json";
import { Fundo, entre } from "./base";
import { CIANO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";

// "Quanto custou cada voto": gasto de campanha (despesas contratadas declaradas ao TSE) ÷ votos nominais dos
// deputados federais de 2026.
//   gancho   os dois extremos entre os 513 eleitos, com foto oficial de candidatura (TSE, CC BY), em preto e branco
//   bolso    88 de cada 100 reais que os eleitos pagaram vieram do FEFC e do Fundo Partidário (100 moedas)
//   tipico   os 513 eleitos numa régua logarítmica de gasto por voto, a mediana de R$ 21,78
//   partidos os 28 partidos, todos os candidatos de cada um, mesma cor, ordenados pelo número
//   fora     mediana de quem se elegeu × de quem não se elegeu
//   ressalva gasto alto ≠ irregularidade, gasto baixo ≠ mérito
//   pergunta "Quanto você acha justo custar um voto?" e volta pro quadro 0
//
// Números: custo-voto.json (scripts/gerar-custo-voto.mjs, que confere cada número da fala contra a conta do
// scripts/custo-voto.py). Tempos: custo-voto-tempos.json (scripts/tempos-custo-voto.mjs).
//
// Neutralidade: nenhuma cor de partido. Ciano pro dado, cinza pro resto, um único ponto laranja por cena.
// Os dois deputados têm o mesmo tratamento (mesmo tamanho, preto e branco, mesmo aro). Nomes só nos extremos.

export const CUSTO_VOTO_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const C = T.cena;
const FIM = T.fim;
const G0 = T.grande[0].f;

const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const saida = Easing.out(Easing.cubic);
const SOMBRA_TXT = "0 0 14px rgba(5,7,12,1), 0 0 6px rgba(5,7,12,1)";
const visivel = (f: number, de: number, ate: number, fade = 6) => (f < de - fade || f >= ate + fade ? 0 : Math.min(entre(f, de - fade, de), 1 - entre(f, ate, ate + fade)));
const reais = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const milhar = (n: number) => Math.round(n).toLocaleString("pt-BR");
const mi = (n: number) => (n < 1e6 ? `R$ ${milhar(n)}` : `R$ ${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} MI`);
const bi = (n: number) => `R$ ${(n / 1e9).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BI`;

const Etiqueta: React.FC<{ texto: string; o: number; top?: number; cor?: string }> = ({ texto, o, top = 250, cor = TEXTO_2 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: 60, width: 960, textAlign: "center", opacity: o, fontFamily: MONO, fontSize: 28, letterSpacing: 3, color: cor, whiteSpace: "pre-line", lineHeight: 1.4 }}>{texto}</div>
  );

const Foto: React.FC<{ src: string; x: number; y: number; lado: number; brilho?: number }> = ({ src, x, y, lado, brilho = 0 }) => (
  <Img src={staticFile(src)} style={{
    position: "absolute", left: x - lado / 2, top: y, width: lado, height: lado, borderRadius: "50%", objectFit: "cover",
    boxSizing: "border-box", border: `3px solid ${TEXTO}`, filter: "grayscale(1) contrast(1.05)",
    boxShadow: `0 0 ${18 + 22 * brilho}px rgba(92,225,255,${0.25 + 0.35 * brilho})`,
  }} />
);

// --- 1. os dois extremos (quadro 0 e o fim, pro loop) -----------------------------------------------------
const COL = [290, 790]; // o mais barato à esquerda (dito primeiro), o mais caro à direita

const Dupla: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM;
  const o = noFim ? entre(f, FIM, FIM + 10) : visivel(f, 0, C.dupla.ate, 4);
  if (o <= 0) return null;
  const pA = noFim ? 0 : mola(f, M.centavos - 2, { damping: 10, stiffness: 220 });
  const pB = noFim ? 0 : mola(f, M.n170 - 2, { damping: 10, stiffness: 220 });
  const pulso = (k: number) => 0.5 + 0.5 * Math.max(0, Math.sin((f / 30) * 3.2 - k * 1.6)); // o brilho já correndo no quadro 0
  const pessoas = [D.barato, D.caro];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"DEPUTADOS FEDERAIS ELEITOS · 2026\nGASTO DE CAMPANHA ÷ VOTOS"} o={1} />
      {pessoas.map((p, c) => (
        <div key={c}>
          <Foto src={p.foto} x={COL[c]} y={400} lado={230} brilho={pulso(c)} />
          <div style={{ position: "absolute", top: 650, left: COL[c] - 240, width: 480, textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 2, color: TEXTO }}>{p.nome}</div>
          <div style={{ position: "absolute", top: 692, left: COL[c] - 240, width: 480, textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: TEXTO_2 }}>{p.partido} · {p.uf}</div>
          <div style={{
            position: "absolute", top: 760, left: COL[c] - 260, width: 520, textAlign: "center", fontFamily: MONO, fontSize: 88, letterSpacing: -3,
            color: c ? LARANJA : TEXTO, textShadow: c ? `0 0 34px ${LARANJA}88` : `0 0 30px ${TEXTO}33`,
            scale: `${1 + 0.1 * (c ? pB : pA) * (1 - entre(f, (c ? M.n170 : M.centavos) + 8, (c ? M.n170 : M.centavos) + 20))}`,
          }}>{reais(p.cpv)}</div>
          <div style={{ position: "absolute", top: 870, left: COL[c] - 240, width: 480, textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO_2 }}>POR VOTO</div>
          <div style={{ position: "absolute", top: 940, left: COL[c] - 240, width: 480, textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 1, color: TEXTO_2, lineHeight: 1.45 }}>
            {mi(p.gasto)} GASTOS<br />{milhar(p.votos)} VOTOS
          </div>
        </div>
      ))}
      <div style={{ position: "absolute", top: 1150, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>FOTOS: TSE (CC BY) · OS DOIS EXTREMOS ENTRE OS {D.nEleitos}</div>
    </AbsoluteFill>
  );
};

// --- 2. o bolso: 100 moedas, 88 de dinheiro público ----------------------------------------------------------
const Bolso: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.bolso.de, C.bolso.ate);
  if (o <= 0) return null;
  const conta = T.contas.find((c) => c.id === "c88")!;
  const nPub = Math.round(D.pctPublico);
  const enche = entre(f, conta.de, conta.ate, saida) * nPub;
  const moedas = entre(f, C.bolso.de, M.n100 + 4);
  const nume = Math.round(enche);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={`DESPESAS PAGAS PELOS ${D.nEleitos} ELEITOS\n${bi(D.pagoEleitos)} NO TOTAL`} o={entre(f, C.bolso.de, C.bolso.de + 8)} top={232} />
      <div style={{ position: "absolute", top: 350, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 150, letterSpacing: -4, color: LARANJA, textShadow: `0 0 36px ${LARANJA}77`, opacity: entre(f, conta.de - 6, conta.de) }}>
        R$ {nume}
      </div>
      <div style={{ position: "absolute", top: 530, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 32, letterSpacing: 4, color: TEXTO_2, opacity: entre(f, M.n100 - 4, M.n100 + 4) }}>DE CADA R$ 100</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 100 }, (_, k) => {
          const col = k % 10, lin = Math.floor(k / 10);
          const x = 333 + col * 46, y = 640 + lin * 46;
          const aparece = entre(moedas, k / 140, k / 140 + 0.3);
          const pub = k < enche;
          return <circle key={k} cx={x} cy={y} r={17 * aparece} fill={pub ? CIANO : "none"} fillOpacity={pub ? 0.85 : 0} stroke={pub ? CIANO : TEXTO_2} strokeOpacity={pub ? 1 : 0.6} strokeWidth={2} style={pub ? { filter: `drop-shadow(0 0 6px ${CIANO})` } : undefined} />;
        })}
      </svg>
      <div style={{ position: "absolute", top: 1125, left: 130, width: 820, fontFamily: MONO, fontSize: 26, letterSpacing: 2, color: CIANO, opacity: entre(f, M.publico - 4, M.publico + 4) }}>● DINHEIRO PÚBLICO</div>
      <div style={{ position: "absolute", top: 1165, left: 160, width: 790, fontFamily: MONO, fontSize: 24, letterSpacing: 1, color: TEXTO, lineHeight: 1.4 }}>
        <span style={{ opacity: entre(f, M.fundo - 4, M.fundo + 4) }}>FUNDO ELEITORAL (FEFC)</span>
        <span style={{ opacity: entre(f, M.partidario - 6, M.partidario + 2) }}> + FUNDO PARTIDÁRIO</span>
      </div>
      <div style={{ position: "absolute", top: 1220, left: 130, width: 820, fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: TEXTO_2, opacity: entre(f, M.partidario, M.partidario + 8) }}>○ DOAÇÕES E RECURSOS PRÓPRIOS</div>
    </AbsoluteFill>
  );
};

// --- 3. os 513 eleitos numa régua de gasto por voto (log) --------------------------------------------------------
const DX0 = 130, DX1 = 950, DBASE = 1150, V0 = 0.2, V1 = 200, PASSO = 12;
const xLog = (v: number) => DX0 + ((Math.log10(v) - Math.log10(V0)) / (Math.log10(V1) - Math.log10(V0))) * (DX1 - DX0);
const PONTOS = (() => {
  const pilha = new Map<number, number>();
  return D.dist.map((v, i) => {
    const b = Math.round((xLog(v) - DX0) / PASSO);
    const h = pilha.get(b) ?? 0;
    pilha.set(b, h + 1);
    return { v, i, x: DX0 + b * PASSO, y: DBASE - 8 - h * PASSO };
  });
})();
const xMed = xLog(D.mediana);

const Dist: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.dist.de, C.dist.ate);
  if (o <= 0) return null;
  const med = entre(f, M.n22 - 4, M.n22 + 6, saida);
  const esq = entre(f, M.metade1 - 2, M.metade1 + 6), dir = entre(f, M.metade2 - 2, M.metade2 + 6);
  const n = Math.round(D.nEleitos * entre(f, C.dist.de + 2, M.n513 + 10, saida));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"OS 513 ELEITOS · GASTO POR VOTO\nCADA PONTO É UM DEPUTADO"} o={entre(f, C.dist.de, C.dist.de + 8)} top={232} />
      <div style={{ position: "absolute", top: 380, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 120, letterSpacing: -3, color: LARANJA, opacity: med, textShadow: `0 0 30px ${LARANJA}77` }}>{reais(D.mediana)}</div>
      <div style={{ position: "absolute", top: 525, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO_2, opacity: med }}>MEDIANA · O VOTO TÍPICO</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {PONTOS.map((p) => {
          const k = p.i; // do mais barato ao mais caro
          const a = entre(f, C.dist.de + 2 + (k / D.nEleitos) * 24, C.dist.de + 8 + (k / D.nEleitos) * 24, saida);
          const lado = p.v < D.mediana ? esq : p.v > D.mediana ? dir : 0;
          return <circle key={k} cx={p.x} cy={p.y - (1 - a) * 60} r={5} fill={CIANO} opacity={a * (0.55 + 0.45 * lado)} />;
        })}
        <line x1={DX0} x2={DX1} y1={DBASE} y2={DBASE} stroke={TEXTO_2} strokeWidth={2} />
        {[1, 10, 100].map((v) => (
          <g key={v}>
            <line x1={xLog(v)} x2={xLog(v)} y1={DBASE} y2={DBASE + 12} stroke={TEXTO_2} strokeWidth={2} />
            <text x={xLog(v)} y={DBASE + 46} textAnchor="middle" fontFamily={MONO} fontSize={26} fill={TEXTO_2}>R$ {v}</text>
          </g>
        ))}
        <g opacity={med}>
          <line x1={xMed} x2={xMed} y1={DBASE} y2={DBASE - (DBASE - 620) * med} stroke={LARANJA} strokeWidth={3} strokeDasharray="8 8" />
        </g>
        <text x={xLog(D.barato.cpv)} y={DBASE + 92} textAnchor="start" fontFamily={MONO} fontSize={22} fill={TEXTO} opacity={entre(f, M.n513, M.n513 + 10)}>{reais(D.barato.cpv)}</text>
        <text x={xLog(D.caro.cpv) + 6} y={DBASE + 92} textAnchor="end" fontFamily={MONO} fontSize={22} fill={TEXTO} opacity={entre(f, M.n513, M.n513 + 10)}>{reais(D.caro.cpv)}</text>
        <text x={xMed - 24} y={605} textAnchor="end" fontFamily={MONO} fontSize={30} letterSpacing={3} fill={TEXTO} opacity={esq}>← METADE</text>
        <text x={xMed + 24} y={605} textAnchor="start" fontFamily={MONO} fontSize={30} letterSpacing={3} fill={TEXTO} opacity={dir}>METADE →</text>
      </svg>
      <div style={{ position: "absolute", top: 1270, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: TEXTO_2 }}>{n} DE {D.nEleitos} · ESCALA LOGARÍTMICA</div>
    </AbsoluteFill>
  );
};

// --- 4. os 28 partidos, mesma régua ---------------------------------------------------------------------------
const PY0 = 340, PDY = 33, PX = 300, PW = 420;
const PMAX = Math.max(...D.partidos.map((p) => p.cpv));

const Partidos: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.partidos.de, C.partidos.ate);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"DEPUTADO FEDERAL 2026 · TODOS OS CANDIDATOS\nGASTO ÷ VOTOS DE CADA PARTIDO"} o={entre(f, C.partidos.de, C.partidos.de + 8)} top={220} />
      <div style={{ position: "absolute", top: PY0 - 34, left: PX, width: 650, fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: entre(f, C.partidos.de + 4, C.partidos.de + 12) }}>R$ POR VOTO · % PAGO COM DINHEIRO PÚBLICO</div>
      {D.partidos.map((p, i) => {
        const y = PY0 + i * PDY;
        const a = entre(f, M.n28 + i * 1.1, M.n28 + 6 + i * 1.1, saida);
        const w = (p.cpv / PMAX) * PW * a;
        const zero = p.gasto === 0;
        const ponta = (i === 0 && f >= M.zero - 2) || (i === D.partidos.length - 1 && f >= M.n70 - 2);
        return (
          <div key={p.sg} style={{ position: "absolute", top: y, left: 0, width: 1080, height: PDY, opacity: entre(f, M.n28 - 4 + i * 1.1, M.n28 + i * 1.1) }}>
            <div style={{ position: "absolute", left: 60, width: PX - 76, textAlign: "right", top: 2, fontFamily: MONO, fontSize: 22, letterSpacing: 1, color: TEXTO }}>{p.sg}</div>
            <div style={{ position: "absolute", left: PX, top: 6, width: Math.max(w, 2), height: PDY - 12, background: CIANO, opacity: 0.8, boxShadow: ponta ? `0 0 14px ${CIANO}` : undefined }} />
            <div style={{ position: "absolute", left: PX + Math.max(w, 2) + 12, top: 3, fontFamily: MONO, fontSize: 21, color: ponta ? LARANJA : TEXTO, opacity: a, whiteSpace: "nowrap" }}>
              {zero ? "R$ 0 · SEM DESPESA DECLARADA" : `${reais(p.cpv)} · ${p.pub === null ? "–" : `${Math.round(p.pub)}%`}`}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", top: PY0 + D.partidos.length * PDY + 6, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: entre(f, M.regua - 6, M.regua + 4) }}>
        ORDEM PELO NÚMERO · MESMA COR PARA TODOS
      </div>
    </AbsoluteFill>
  );
};

// --- 5. quem não se elegeu -----------------------------------------------------------------------------------------
const Fora: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.fora.de, C.fora.ate);
  if (o <= 0) return null;
  const BASE = 1080, ALT = 420, MAXV = D.fora.mediana;
  const hE = (D.mediana / MAXV) * ALT * entre(f, C.fora.de + 4, C.fora.de + 18, saida);
  const hN = ALT * entre(f, M.n65 - 14, M.n65 + 2, saida);
  const tres = mola(f, M.tres - 2, { damping: 11, stiffness: 200 });
  const colunas = [
    { x: 330, h: hE, cor: CIANO, rot: "ELEITOS", v: D.mediana, sub: `${D.nEleitos} CANDIDATOS`, o: 1 },
    { x: 750, h: hN, cor: LARANJA, rot: "NÃO ELEITOS", v: D.fora.mediana, sub: `${milhar(D.fora.nComGastoEVoto)} COM GASTO E VOTO`, o: entre(f, M.nao - 6, M.nao + 4) },
  ];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"DEPUTADO FEDERAL 2026\nMEDIANA DO GASTO POR VOTO"} o={1} top={232} />
      <div style={{ position: "absolute", top: 380, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: TEXTO_2, opacity: entre(f, M.bilhoes - 6, M.bilhoes + 4) }}>
        QUEM NÃO SE ELEGEU GASTOU <span style={{ color: TEXTO }}>{bi(D.fora.gasto)}</span>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {colunas.map((c) => (
          <g key={c.rot} opacity={c.o}>
            <rect x={c.x - 90} y={BASE - c.h} width={180} height={c.h} fill={c.cor} opacity={0.85} style={{ filter: `drop-shadow(0 0 10px ${c.cor})` }} />
          </g>
        ))}
        <line x1={160} x2={920} y1={BASE} y2={BASE} stroke={TEXTO_2} strokeWidth={2} />
      </svg>
      {colunas.map((c) => (
        <div key={c.rot} style={{ opacity: c.o }}>
          <div style={{ position: "absolute", top: BASE - c.h - 90, left: c.x - 200, width: 400, textAlign: "center", fontFamily: MONO, fontSize: 60, letterSpacing: -2, color: c.cor === LARANJA ? LARANJA : TEXTO }}>{reais(c.v)}</div>
          <div style={{ position: "absolute", top: BASE + 20, left: c.x - 220, width: 440, textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: TEXTO }}>{c.rot}</div>
          <div style={{ position: "absolute", top: BASE + 62, left: c.x - 220, width: 440, textAlign: "center", fontFamily: MONO, fontSize: 21, letterSpacing: 1, color: TEXTO_2 }}>{c.sub}</div>
        </div>
      ))}
      <div style={{ position: "absolute", top: 470, left: 0, width: 1080, textAlign: "center", fontFamily: MONO, fontSize: 96, color: TEXTO, opacity: entre(f, M.tres - 3, M.tres + 3), scale: `${0.85 + 0.15 * tres}` }}>3×</div>
      <div style={{ position: "absolute", top: 1200, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 21, letterSpacing: 2, color: TEXTO_2 }}>
        {milhar(D.fora.n - D.fora.nComGastoEVoto)} SEM DESPESA OU SEM VOTO VÁLIDO FICAM FORA DA MEDIANA
      </div>
    </AbsoluteFill>
  );
};

// --- 6. a ressalva -----------------------------------------------------------------------------------------------
const Ressalva: React.FC = () => {
  const f = useCurrentFrame();
  // sai antes da pergunta grande entrar (as duas ocupam o meio da tela)
  const o = visivel(f, C.ressalva.de, C.ressalva.ate) * (1 - entre(f, G0 - 10, G0 - 4));
  if (o <= 0) return null;
  const l1 = entre(f, M.alto - 6, M.alto + 4), l2 = entre(f, M.baixo - 6, M.baixo + 4), l3 = entre(f, M.explica - 8, M.explica + 2);
  const Linha: React.FC<{ y: number; a: string; b: string; op: number }> = ({ y, a, b, op }) => (
    <div style={{ position: "absolute", top: y, left: 0, width: 1080, textAlign: "center", opacity: op, fontFamily: MONO, fontSize: 46, letterSpacing: 2, color: TEXTO, translate: `0 ${(1 - op) * 16}px` }}>
      {a} <span style={{ color: TEXTO_2 }}>≠</span> {b}
    </div>
  );
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Linha y={430} a="GASTO ALTO" b="IRREGULARIDADE" op={l1} />
      <Linha y={560} a="GASTO BAIXO" b="MÉRITO" op={l2} />
      <div style={{ position: "absolute", top: 760, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 92, lineHeight: 1.1, letterSpacing: -1, color: TEXTO, opacity: l3 }}>
        O dado não diz<br /><span style={{ color: LARANJA, fontWeight: 400 }}>por quê.</span>
      </div>
    </AbsoluteFill>
  );
};

// --- 7. a pergunta -----------------------------------------------------------------------------------------------
const Pergunta: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.pergunta.de, C.pergunta.ate);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto="1 VOTO = R$ ?" o={1} top={330} cor={TEXTO} />
      <div style={{ position: "absolute", top: 420, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 260, color: LARANJA, textShadow: `0 0 40px ${LARANJA}88`, opacity: 0.6 + 0.4 * Math.abs(Math.sin(f / 9)) }}>?</div>
    </AbsoluteFill>
  );
};

// --- legenda, pergunta grande, CTA e fonte -------------------------------------------------------------------------
const Legenda: React.FC = () => {
  const f = useCurrentFrame();
  const bloco = T.legendas.find((l) => f >= l.de && f < l.ate);
  if (!bloco) return null;
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

const PerguntaFinal: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, G0 - 4, G0 + 2) * (1 - entre(f, FIM - 8, FIM));
  if (o <= 0) return null;
  const nLinhas = Math.max(...T.grande.map((w) => w.l)) + 1;
  const linhas = Array.from({ length: nLinhas }, (_, l) => T.grande.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top: 820, left: 60, width: 960, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 92, lineHeight: 1.14, letterSpacing: -1, color: TEXTO,
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

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, T.cta, T.cta + 8);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 1432, left: 0, width: 1080, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, opacity: o }}>
      <Img src={staticFile("ciencia/icone.png")} style={{ width: 64, height: 64 }} />
      <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO, textShadow: SOMBRA_TXT }}>SEGUE O CIÊNCIA VISUAL</div>
    </div>
  );
};

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  const o = f < FIM ? 0.8 : 0;
  const escondida = f >= C.partidos.de - 6 && f < C.partidos.ate; // a régua dos partidos ocupa até embaixo
  return (
    <div style={{ position: "absolute", top: 1330, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: o * (escondida ? 0 : 1) * (1 - entre(f, C.pergunta.de - 6, C.pergunta.de)) }}>
      TSE · PRESTAÇÃO DE CONTAS E VOTAÇÃO 2026 · CARGA DE 12/11/2026
    </div>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/custo-voto/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/custo-voto/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const CustoVoto: React.FC = () => (
  <Fundo>
    <Bolso />
    <Dist />
    <Partidos />
    <Fora />
    <Ressalva />
    <Pergunta />
    <Dupla />
    <Fonte />
    <PerguntaFinal />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-custo-voto.mjs: colchão, whoosh nas cenas, tiques nos pontos e nas barras */}
    <Audio src={staticFile("ciencia/custo-voto/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
// Padrão das capas de 12/11: rótulo mono no topo do recorte (y 300), elemento forte no meio,
// título Sora 400 com a base perto de y 1600, uma palavra em laranja.
// O elemento do meio são os dois extremos reais (R$ 0,25 e R$ 170,37 por voto) e a régua dos 513 eleitos.
export const CustoVotoCapa: React.FC = () => {
  const ESC = 0.62; // a régua dos 513 pontos, reduzida (abaixo das fotos e dos valores)
  return (
    <Fundo>
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 34, letterSpacing: 6, color: TEXTO_2 }}>DEPUTADOS FEDERAIS · 2026</div>
      <div style={{ position: "absolute", top: 380, left: 60, width: 960, display: "flex", justifyContent: "space-between", fontFamily: MONO }}>
        {[D.barato, D.caro].map((p, c) => (
          <div key={c} style={{ width: 470, textAlign: "center" }}>
            <Img src={staticFile(p.foto)} style={{ width: 190, height: 190, borderRadius: "50%", objectFit: "cover", boxSizing: "border-box", border: `4px solid ${c ? LARANJA : TEXTO}`, boxShadow: c ? `0 0 30px ${LARANJA}66` : "0 0 24px rgba(92,225,255,0.3)" }} />
            <div style={{ fontSize: 20, letterSpacing: 2, color: TEXTO_2, marginTop: 10, marginBottom: 10 }}>{p.nome.replace("DEFENSOR ", "")} ({p.partido}-{p.uf})</div>
            <div style={{ fontSize: 92, letterSpacing: -3, color: c ? LARANJA : TEXTO, textShadow: c ? `0 0 34px ${LARANJA}88` : undefined }}>{reais(p.cpv)}</div>
            <div style={{ fontSize: 28, letterSpacing: 4, color: TEXTO_2, marginTop: 6 }}>POR VOTO</div>
          </div>
        ))}
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${540 - 540 * ESC} ${-DBASE * ESC + 1150}) scale(${ESC})`}>
          {PONTOS.map((p) => <circle key={p.i} cx={p.x} cy={p.y} r={5} fill={CIANO} opacity={0.75} />)}
          <line x1={DX0} x2={DX1} y1={DBASE} y2={DBASE} stroke={TEXTO_2} strokeWidth={2} />
          <line x1={xMed} x2={xMed} y1={DBASE} y2={DBASE - 330} stroke={LARANJA} strokeWidth={3} strokeDasharray="8 8" />
        </g>
      </svg>
      <div style={{ position: "absolute", top: 1180, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: TEXTO_2 }}>OS 513 ELEITOS · GASTO ÷ VOTOS · FOTOS: TSE (CC BY)</div>
      <div style={{ position: "absolute", bottom: 330, left: 40, width: 1000, textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 128, lineHeight: 1.04, letterSpacing: -4, color: TEXTO }}>
        Quanto custou<br />cada <span style={{ color: LARANJA, textShadow: `0 0 40px ${LARANJA}66` }}>voto?</span>
      </div>
    </Fundo>
  );
};
