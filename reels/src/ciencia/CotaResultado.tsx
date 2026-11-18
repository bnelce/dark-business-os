import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./cota-resultado.json";
import T from "./cota-resultado-tempos.json";
import { Fundo, entre } from "./base";
import { CIANO, LARANJA, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";

// "Cota × resultado": deputado federal 2026. Mulheres e pessoas negras (pretas + pardas, autodeclaração ao TSE)
// na população (Censo 2022), nas candidaturas, no fundo eleitoral (FEFC) e entre os 513 eleitos.
//   gancho    hemiciclo dos 513 com os 135 assentos de pessoas negras acesos; 56% (Brasil) → 26% (Câmara)
//   camara    o hemiciclo troca pros 109 assentos de mulheres; 51% → 21%; "votam as leis a partir de fevereiro"
//   mulheres  funil: população, candidaturas, fundo, eleitos (51,5 → 37,1 → 34,5 → 21,2)
//   negros    o mesmo funil (55,5 → 46,4 → 36,7 → 26,3)
//   chance    1 em 40 candidatas negras se elegeu; 1 em 8 candidatos homens brancos
//   regra     a regra (30% de candidaturas por sexo, fundo proporcional, 30% para pessoas pretas e pardas) e a
//             tabela de TODOS os partidos, em ordem alfabética, conta nossa com todos os cargos
//   pergunta  lista → dinheiro → urna e a pergunta sobre o dado; volta pro quadro 0
//
// Números: cota-resultado.json (scripts/gerar-cota-resultado.mjs confere cada número da fala).
// Tempos: cota-resultado-tempos.json (scripts/tempos-cota-resultado.mjs). Nenhuma foto de pessoa.

export const COTA_RESULTADO_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const C = T.cena;
const FIM = T.fim;
const G0 = T.grande[0].f;

const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const saida = Easing.out(Easing.cubic);
const SOMBRA_TXT = "0 0 14px rgba(5,7,12,1), 0 0 6px rgba(5,7,12,1)";
const visivel = (f: number, de: number, ate: number, fade = 6) => (f < de - fade || f >= ate + fade ? 0 : Math.min(entre(f, de - fade, de), 1 - entre(f, ate, ate + fade)));
const milhar = (n: number) => Math.round(n).toLocaleString("pt-BR");
const AUTODECL = "PESSOAS NEGRAS = PRETAS + PARDAS · COR AUTODECLARADA AO TSE";

const Etiqueta: React.FC<{ texto: string; o: number; top?: number; cor?: string; size?: number }> = ({ texto, o, top = 240, cor = TEXTO_2, size = 28 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: 50, width: 980, textAlign: "center", opacity: o, fontFamily: MONO, fontSize: size, letterSpacing: 3, color: cor, whiteSpace: "pre-line", lineHeight: 1.4 }}>{texto}</div>
  );

// --- hemiciclo dos 513 assentos -----------------------------------------------------------------------------
const HX = 540, HY = 1190;
const FILAS = Array.from({ length: 11 }, (_, i) => 220 + i * 25);
const ASSENTOS = (() => {
  const soma = FILAS.reduce((a, b) => a + b, 0);
  const por = FILAS.map((r) => Math.round((513 * r) / soma));
  por[por.length - 1] += 513 - por.reduce((a, b) => a + b, 0);
  const s: { x: number; y: number; a: number; r: number }[] = [];
  FILAS.forEach((r, i) => {
    for (let k = 0; k < por[i]; k++) {
      const a = Math.PI - (Math.PI * (k + 0.5)) / por[i];
      s.push({ x: HX + r * Math.cos(a), y: HY - r * Math.sin(a), a, r });
    }
  });
  // da esquerda pra direita, como quem enche o plenário: quem acende primeiro é a fatia da esquerda
  return s.sort((p, q) => q.a - p.a || p.r - q.r);
})();

const Hemiciclo: React.FC<{ acesos: number; cor: string; f: number; o?: number; escala?: number }> = ({ acesos, cor, f, o = 1, escala = 1 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
    <g transform={`translate(${HX} ${HY}) scale(${escala}) translate(${-HX} ${-HY})`}>
      {ASSENTOS.map((s, i) => {
        const on = i < acesos;
        const pulso = on ? 0.6 + 0.4 * Math.max(0, Math.sin(f / 7 - i * 0.05)) : 1; // brilho já correndo no quadro 0
        return <circle key={i} cx={s.x} cy={s.y} r={8} fill={on ? cor : "none"} fillOpacity={on ? pulso : 0} stroke={on ? cor : TEXTO_2} strokeOpacity={on ? 1 : 0.35} strokeWidth={2} />;
      })}
    </g>
  </svg>
);

const ParNumeros: React.FC<{ esq: string; dir: string; rotEsq: string; rotDir: string; pDir?: number }> = ({ esq, dir, rotEsq, rotDir, pDir = 0 }) => (
  <>
    <div style={{ position: "absolute", top: 360, left: 60, width: 440, textAlign: "center", fontFamily: MONO }}>
      <div style={{ fontSize: 30, letterSpacing: 4, color: TEXTO_2 }}>{rotEsq}</div>
      <div style={{ fontSize: 170, letterSpacing: -6, color: TEXTO, lineHeight: 1.05 }}>{esq}</div>
    </div>
    <div style={{ position: "absolute", top: 470, left: 500, width: 80, textAlign: "center", fontFamily: MONO, fontSize: 80, color: TEXTO_2 }}>→</div>
    <div style={{ position: "absolute", top: 360, left: 580, width: 440, textAlign: "center", fontFamily: MONO }}>
      <div style={{ fontSize: 30, letterSpacing: 4, color: TEXTO_2 }}>{rotDir}</div>
      <div style={{ fontSize: 170, letterSpacing: -6, color: LARANJA, lineHeight: 1.05, scale: `${1 + 0.08 * pDir}`, textShadow: `0 0 40px ${LARANJA}88` }}>{dir}</div>
    </div>
  </>
);

// --- 1. gancho (e o fim, pro loop) ---------------------------------------------------------------------------
const Gancho: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM;
  const o = noFim ? entre(f, FIM, FIM + 10) : visivel(f, 0, C.gancho.ate, 4);
  if (o <= 0) return null;
  const p26 = noFim ? 0 : mola(f, M.n26 - 2, { damping: 10, stiffness: 220 }) * (1 - entre(f, M.n26 + 8, M.n26 + 20));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={AUTODECL} o={1} size={21} />
      <ParNumeros esq="56%" dir="26%" rotEsq="BRASIL" rotDir="CÂMARA" pDir={p26} />
      <Hemiciclo acesos={D.assentos.negros} cor={CIANO} f={f} />
      <div style={{ position: "absolute", top: 1215, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: TEXTO }}>
        <span style={{ color: CIANO }}>{D.assentos.negros}</span> DE 513 DEPUTADOS ELEITOS EM 2026
      </div>
    </AbsoluteFill>
  );
};

// --- 2. a Câmara e as mulheres -------------------------------------------------------------------------------
const Camara: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.camara.de, C.camara.ate);
  if (o <= 0) return null;
  const troca = entre(f, M.mulheres - 4, M.mulheres + 26, saida);
  const acesos = troca <= 0 ? D.assentos.negros : Math.round(D.assentos.mulheres * troca);
  const cor = troca <= 0 ? CIANO : CIANO;
  const leis = entre(f, M.leis - 4, M.leis + 4) * (1 - entre(f, M.mulheres - 6, M.mulheres));
  const nums = entre(f, M.n51 - 4, M.n51 + 4);
  const p21 = mola(f, M.n21 - 2, { damping: 10, stiffness: 220 }) * (1 - entre(f, M.n21 + 8, M.n21 + 20));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={troca > 0 ? "MULHERES · CENSO 2022 E TSE" : "CÂMARA DOS DEPUTADOS · 2027 A 2031"} o={1} />
      <div style={{ position: "absolute", top: 420, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 92, color: TEXTO, opacity: entre(f, C.camara.de, C.camara.de + 8) * (1 - nums), lineHeight: 1.1 }}>
        513 deputados
        <div style={{ fontFamily: MONO, fontSize: 32, letterSpacing: 4, color: TEXTO_2, marginTop: 20, opacity: leis }}>VOTAM AS LEIS A PARTIR DE 1º/2/2027</div>
      </div>
      {nums > 0 && (
        <div style={{ opacity: nums }}>
          <ParNumeros esq="51%" dir="21%" rotEsq="BRASIL" rotDir="CÂMARA" pDir={p21} />
        </div>
      )}
      <Hemiciclo acesos={acesos} cor={cor} f={f} />
      <div style={{ position: "absolute", top: 1215, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: TEXTO }}>
        {troca > 0 ? (
          <>
            <span style={{ color: CIANO }}>{milhar(acesos)}</span> DE 513 · MULHERES ELEITAS
            <span style={{ color: TEXTO_2, opacity: entre(f, M.n109, M.n109 + 8) }}> · CONFERIDO NO TSE</span>
          </>
        ) : (
          <>
            <span style={{ color: CIANO }}>{D.assentos.negros}</span> DE 513 · PESSOAS NEGRAS
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

// --- 3 e 4. o funil ------------------------------------------------------------------------------------------
const BX = 100, BW = 880;
const Funil: React.FC<{ g: "m" | "n" }> = ({ g }) => {
  const f = useCurrentFrame();
  const cena = g === "m" ? C.mulheres : C.negros;
  const o = visivel(f, cena.de, cena.ate);
  if (o <= 0) return null;
  const d = D[g];
  const marcas = g === "m" ? [cena.de, M.mCand, M.mFundo, M.mEl] : [cena.de, M.nCand, M.nFundo, M.nEl];
  const reais = (v: number) => (v >= 1e9 ? `R$ ${br(v / 1e9, 2)} BI` : `R$ ${milhar(v / 1e6)} MI`);
  const linhas = [
    { rot: "POPULAÇÃO · CENSO 2022", v: D.pop[g] },
    { rot: "CANDIDATURAS A DEPUTADO FEDERAL", v: d.cand },
    { rot: `FUNDO ELEITORAL (FEFC) · ${reais(d.reais)} DE ${reais(D.fefcTotal)}`, v: d.fefc },
    { rot: `ELEITOS · ${d.nEl} DE 513`, v: d.el },
  ];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={g === "m" ? "MULHERES" : "PESSOAS NEGRAS"} o={1} top={230} cor={TEXTO} size={40} />
      {g === "n" && <Etiqueta texto="PRETAS + PARDAS · COR AUTODECLARADA AO TSE" o={1} top={292} size={24} />}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {/* metade: a régua dos 50% */}
        <line x1={BX + BW / 2} x2={BX + BW / 2} y1={380} y2={1240} stroke={TEXTO_2} strokeWidth={2} strokeDasharray="6 10" opacity={0.6} />
        <text x={BX + BW / 2} y={370} textAnchor="middle" fontFamily={MONO} fontSize={22} fill={TEXTO_2} letterSpacing={2}>50%</text>
        {linhas.map((l, i) => {
          const y = 430 + i * 205;
          const p = entre(f, marcas[i] - 6, marcas[i] + 10, saida);
          const ultima = i === 3;
          const cor = ultima ? LARANJA : i === 0 ? TEXTO : CIANO;
          return (
            <g key={i} opacity={i === 0 ? 1 : entre(f, marcas[i] - 8, marcas[i] - 2)}>
              <rect x={BX} y={y + 50} width={BW} height={84} fill="none" stroke={TEXTO_2} strokeOpacity={0.4} strokeWidth={2} />
              <rect x={BX} y={y + 50} width={(BW * l.v * p) / 100} height={84} fill={cor} fillOpacity={i === 0 ? 0.35 : 0.85} style={ultima ? { filter: `drop-shadow(0 0 14px ${LARANJA}88)` } : undefined} />
              <text x={BX} y={y + 34} fontFamily={MONO} fontSize={26} letterSpacing={2} fill={TEXTO_2}>{l.rot}</text>
              {/* o valor só aparece com a barra já crescendo: nada de "0,0%" na tela */}
              {p > 0.04 && <text x={BX + (BW * l.v * p) / 100 + 18} y={y + 112} fontFamily={MONO} fontSize={60} fill={ultima ? LARANJA : TEXTO}>{br(l.v * p)}%</text>}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// --- 5. 1 em 40 × 1 em 8 -------------------------------------------------------------------------------------
const Pessoa: React.FC<{ x: number; y: number; on: boolean; s?: number }> = ({ x, y, on, s = 1 }) => (
  <g opacity={on ? 1 : 0.55}>
    <circle cx={x} cy={y - 16 * s} r={9 * s} fill={on ? LARANJA : "none"} stroke={on ? LARANJA : TEXTO_2} strokeWidth={2.5} />
    <path d={`M ${x - 15 * s} ${y + 18 * s} Q ${x} ${y - 10 * s} ${x + 15 * s} ${y + 18 * s} Z`} fill={on ? LARANJA : "none"} stroke={on ? LARANJA : TEXTO_2} strokeWidth={2.5} />
  </g>
);

const Chance: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.chance.de, C.chance.ate);
  if (o <= 0) return null;
  const a = entre(f, M.n40 - 6, M.n40 + 14);
  const acA = entre(f, M.uma - 3, M.uma + 3);
  const b = entre(f, M.homens - 6, M.homens + 6);
  const acB = entre(f, M.oito - 4, M.oito + 3);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto={"CANDIDATURAS A DEPUTADO FEDERAL 2026\nCOR AUTODECLARADA AO TSE"} o={1} top={226} size={24} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 40 }, (_, k) => (
          <g key={k} opacity={entre(a, k / 40, k / 40 + 0.08)}>
            <Pessoa x={110 + (k % 8) * 54} y={520 + Math.floor(k / 8) * 74} on={k === 0 && acA > 0} />
          </g>
        ))}
        {Array.from({ length: 8 }, (_, k) => (
          <g key={k} opacity={entre(b, k / 8, k / 8 + 0.2)}>
            <Pessoa x={650 + (k % 4) * 90} y={560 + Math.floor(k / 4) * 120} on={k === 0 && acB > 0} s={1.5} />
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", top: 380, left: 60, width: 480, textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: TEXTO }}>CANDIDATAS NEGRAS</div>
      <div style={{ position: "absolute", top: 380, left: 560, width: 460, textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 3, color: TEXTO, opacity: b }}>HOMENS BRANCOS</div>
      <div style={{ position: "absolute", top: 900, left: 60, width: 480, textAlign: "center", fontFamily: MONO, opacity: acA }}>
        <div style={{ fontSize: 110, color: LARANJA, letterSpacing: -3, textShadow: `0 0 30px ${LARANJA}77` }}>1 EM 40</div>
        <div style={{ fontSize: 26, letterSpacing: 2, color: TEXTO_2 }}>{D.mn.el} ELEITAS DE {milhar(D.mn.n)}</div>
      </div>
      <div style={{ position: "absolute", top: 900, left: 560, width: 460, textAlign: "center", fontFamily: MONO, opacity: acB }}>
        <div style={{ fontSize: 110, color: TEXTO, letterSpacing: -3 }}>1 EM 8</div>
        <div style={{ fontSize: 26, letterSpacing: 2, color: TEXTO_2 }}>{D.hb.el} ELEITOS DE {milhar(D.hb.n)}</div>
      </div>
    </AbsoluteFill>
  );
};

// --- 6. a regra e todos os partidos --------------------------------------------------------------------------
/** Uma casa decimal; duas quando arredondar a uma casa esconderia de que lado do limite o número está. */
const pct = (v: number | null, limite: number) => {
  if (v === null) return "—";
  const um = Math.round(v * 10) / 10;
  return (um >= limite) !== (v >= limite) ? br(v, 2) : br(v, 1);
};

const Marca: React.FC<{ ok: boolean | null }> = ({ ok }) =>
  ok === null ? <span style={{ color: TEXTO_2 }}> ·</span> : ok ? <span style={{ color: CIANO }}> ✓</span> : <span style={{ color: TEXTO_2 }}> ○</span>;

const Regra: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.regra.de, C.regra.ate);
  if (o <= 0) return null;
  const tabela = entre(f, M.conta - 8, M.conta);
  const regras = [
    { de: M.n30, t: "30% DE CANDIDATURAS DE CADA SEXO", fonte: "LEI 9.504/97, ART. 10, §3º · STF, ADI 5617" },
    { de: M.proporcao, t: "FUNDO PARA CANDIDATAS: NO MÍNIMO 30%, NA PROPORÇÃO DELAS", fonte: "CF, ART. 17, §8º (EC 117/2022) · STF, ADI 5617" },
    { de: M.proporcao + 18, t: "30% DO FUNDO PARA CANDIDATURAS DE PESSOAS PRETAS E PARDAS", fonte: "CF, ART. 17, §9º (EC 133/2024) · STF, ADIs 7706 E 7707" },
  ];
  const ROW = 30.5, Y0 = 410;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {tabela < 1 && (
        <AbsoluteFill style={{ opacity: 1 - tabela }}>
          <Etiqueta texto="A REGRA" o={1} cor={TEXTO} size={40} top={240} />
          {regras.map((r, i) => (
            <div key={i} style={{ position: "absolute", top: 420 + i * 260, left: 90, width: 900, opacity: entre(f, r.de - 6, r.de + 4), translate: `0 ${(1 - entre(f, r.de - 6, r.de + 8, saida)) * 18}px` }}>
              <div style={{ fontFamily: SORA, fontWeight: 400, fontSize: 52, lineHeight: 1.12, color: i === 0 ? TEXTO : TEXTO }}>{r.t}</div>
              <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: TEXTO_2, marginTop: 12 }}>{r.fonte}</div>
            </div>
          ))}
        </AbsoluteFill>
      )}
      {tabela > 0 && (
        <AbsoluteFill style={{ opacity: tabela }}>
          <div style={{ position: "absolute", top: 222, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 25, letterSpacing: 2, color: TEXTO_2, lineHeight: 1.35 }}>
            TODOS OS PARTIDOS · CONTA NOSSA, TODOS OS CARGOS
            <br />
            <span style={{ color: TEXTO, opacity: entre(f, M.metade - 4, M.metade + 4) }}>FUNDO P/ ELAS: {D.abaixoM} DE {D.totalM} ABAIXO DA PROPORÇÃO</span>
            <br />
            <span style={{ color: TEXTO, opacity: entre(f, M.n7 - 4, M.n7 + 4) }}>FUNDO P/ NEGROS: {D.abaixoN} DE {D.totalN} ABAIXO DE 30%</span>
          </div>
          <div style={{ position: "absolute", top: Y0 - 44, left: 70, width: 940, display: "flex", fontFamily: MONO, fontSize: 20, letterSpacing: 1, color: TEXTO_2 }}>
            <span style={{ width: 250 }}>PARTIDO</span>
            <span style={{ width: 230, textAlign: "right" }}>% CANDIDATAS</span>
            <span style={{ width: 230, textAlign: "right" }}>% FUNDO P/ ELAS</span>
            <span style={{ width: 230, textAlign: "right" }}>% FUNDO P/ NEGROS</span>
          </div>
          {D.partidos.map((p, i) => (
            <div key={p.p} style={{
              position: "absolute", top: Y0 + i * ROW, left: 70, width: 940, display: "flex", fontFamily: MONO, fontSize: 24, color: TEXTO,
              opacity: entre(f, M.conta + i * 0.8, M.conta + 4 + i * 0.8), borderTop: `1px solid ${TEXTO_2}22`, lineHeight: `${ROW}px`,
            }}>
              <span style={{ width: 250 }}>{p.p}</span>
              <span style={{ width: 230, textAlign: "right", color: TEXTO_2 }}>{pct(p.cm, 30)}</span>
              <span style={{ width: 230, textAlign: "right" }}>{p.fefc > 0 && p.cm > 0 ? pct(p.fm, Math.max(30, p.cm)) : "—"}<Marca ok={p.mOk} /></span>
              <span style={{ width: 230, textAlign: "right" }}>{p.fefc > 0 ? pct(p.fn, 30) : "—"}<Marca ok={p.nOk} /></span>
            </div>
          ))}
          <div style={{ position: "absolute", top: Y0 + D.partidos.length * ROW + 10, left: 70, width: 940, fontFamily: MONO, fontSize: 19, letterSpacing: 1, color: TEXTO_2, lineHeight: 1.4 }}>
            ✓ ATINGE · ○ ABAIXO · — SEM FUNDO OU SEM CANDIDATA · DADOS DE 12/11
            <br />
            A CONTA OFICIAL É DA JUSTIÇA ELEITORAL, NA PRESTAÇÃO DE CONTAS
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// --- 7. lista → dinheiro → urna -------------------------------------------------------------------------------
const Etapas: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.pergunta.de, C.pergunta.ate);
  if (o <= 0) return null;
  const et = [
    { t: "LISTA", m: D.m.cand, n: D.n.cand, de: M.lista },
    { t: "DINHEIRO", m: D.m.fefc, n: D.n.fefc, de: M.dinheiro },
    { t: "URNA", m: D.m.el, n: D.n.el, de: M.urna },
  ];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Etiqueta texto="DEPUTADO FEDERAL 2026 · % DE CADA ETAPA" o={1} />
      {et.map((e, i) => {
        const p = entre(f, e.de - 4, e.de + 4);
        return (
          <div key={e.t} style={{ position: "absolute", top: 330, left: 70 + i * 320, width: 300, textAlign: "center", fontFamily: MONO, border: `2px solid ${p > 0.5 ? LARANJA : `${TEXTO_2}66`}`, padding: "22px 0", boxShadow: p > 0.5 ? `0 0 24px ${LARANJA}55` : undefined }}>
            <div style={{ fontSize: 36, letterSpacing: 4, color: p > 0.5 ? LARANJA : TEXTO }}>{e.t}</div>
            <div style={{ fontSize: 26, color: TEXTO_2, marginTop: 14 }}>MULHERES <span style={{ color: TEXTO }}>{br(e.m)}%</span></div>
            <div style={{ fontSize: 26, color: TEXTO_2, marginTop: 6 }}>NEGROS <span style={{ color: TEXTO }}>{br(e.n)}%</span></div>
          </div>
        );
      })}
      <div style={{ position: "absolute", top: 640, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: TEXTO_2, opacity: entre(f, M.porque - 6, M.porque + 4) }}>OS NÚMEROS NÃO DIZEM A CAUSA</div>
    </AbsoluteFill>
  );
};

// --- legenda, pergunta, CTA e fonte ----------------------------------------------------------------------------
const Legenda: React.FC = () => {
  const f = useCurrentFrame();
  const bloco = T.legendas.find((l) => f >= l.de && f < l.ate);
  if (!bloco) return null;
  const s = bloco.de <= 0 ? 1 : 0.86 + 0.14 * mola(f, bloco.de, { damping: 12, stiffness: 260 });
  return (
    <div style={{
      position: "absolute", top: 1420, left: 90, width: 820, textAlign: "center",
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
      position: "absolute", top: 760, left: 60, width: 960, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 80, lineHeight: 1.12, letterSpacing: -1, color: TEXTO,
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
  const naTabela = f >= C.regra.de - 6 && f < C.regra.ate;
  const o = f < FIM ? (naTabela ? 0 : 0.8) : 0;
  return (
    <div style={{ position: "absolute", top: 1318, left: 40, width: 1000, textAlign: "center", fontFamily: MONO, fontSize: 20, letterSpacing: 2, color: TEXTO_2, opacity: o * (1 - entre(f, G0 - 10, G0)) }}>
      DADOS: TSE 2026 (12/11) · IBGE, CENSO 2022
    </div>
  );
};

// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/cota-resultado/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/cota-resultado/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const CotaResultado: React.FC = () => (
  <Fundo>
    <Camara />
    <Funil g="m" />
    <Funil g="n" />
    <Chance />
    <Regra />
    <Etapas />
    <Gancho />
    <Fonte />
    <PerguntaFinal />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-cota-resultado.mjs: colchão, whoosh nas cenas, tiques nos funis e na tabela */}
    <Audio src={staticFile("ciencia/cota-resultado/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------------------------
// Padrão das capas de 12/11 (CVEnemTriCapa): rótulo mono no topo do recorte (y 300), elemento forte no meio,
// título Sora 400 de 150 px com a base em y 1600, uma palavra em laranja. O hemiciclo é o dos 513 eleitos,
// com os 135 assentos de pessoas negras acesos (número real).
export const CotaResultadoCapa: React.FC = () => (
  <Fundo>
    <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 34, letterSpacing: 6, color: TEXTO_2 }}>DEPUTADOS FEDERAIS 2026</div>
    <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1920, translate: "0 -180px" }}>
      <Hemiciclo acesos={D.assentos.negros} cor={CIANO} f={0} />
    </div>
    <div style={{ position: "absolute", top: 1060, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 36, letterSpacing: 4, color: TEXTO }}>
      BRASIL 56% NEGRO · CÂMARA <span style={{ color: LARANJA }}>26%</span>
    </div>
    <div style={{ position: "absolute", bottom: 320, left: 40, width: 1000, textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 150, lineHeight: 1.04, letterSpacing: -4, color: TEXTO }}>
      Quem chega<br />à <span style={{ color: LARANJA, textShadow: `0 0 40px ${LARANJA}66` }}>Câmara?</span>
    </div>
  </Fundo>
);
