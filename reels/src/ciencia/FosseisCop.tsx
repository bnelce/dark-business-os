import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./fosseis-cop.json";
import T from "./fosseis-cop-tempos.json";
import { Fundo, Status, entre } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";

// Os anfitriões da COP31 e os fósseis (09/11/2026), pauta 3 do radar de 08/11. A Turquia preside e
// tirou 56,7% da eletricidade de fósseis em 2025; a Austrália conduz as negociações e tirou 60,2%;
// o mundo fica em 57,7% (a Turquia um pouco abaixo, a Austrália um pouco acima); o Brasil, que
// presidiu a COP30, em 11,1%. Desde 2000: Austrália −31,7 pontos, Turquia −18,2, mundo −7,0,
// Brasil +2,3. A pergunta final é sobre o dado: onde o país está ou a velocidade com que sai.
//
// Quatro barras empilhadas (carvão, gás, outros fósseis) na mesma régua de 0 a 100%, com as
// bandeiras (Commons, domínio público) e a foto de Antália (Commons, CC BY 3.0, crédito na tela
// enquanto aparece). Sem neon: a pauta pede foto e bandeira. Origem das imagens em
// public/ciencia/fotos-origem.md.
//
// Números: fosseis-cop.json (scripts/gerar-fosseis-cop.py, que confere cada número da fala no CSV
// do Ember). Tempos: fosseis-cop-tempos.json (scripts/tempos-fosseis-cop.mjs). A trilha
// (gerar-trilha-fosseis-cop.mjs) lê os mesmos tempos.
//
// Editorial: neutro. Nenhum país é chamado de hipócrita; os dois anfitriões aparecem com o mesmo tipo
// de número e o mundo como régua. Só eletricidade (não "energia"). Nada de "3º maior exportador".

export const FOSSEIS_COP_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const V = T.varre;
const FIM = T.fim;
const G0 = T.grande[0].f;

type Area = "turquia" | "australia" | "mundo" | "brasil";
type Fonte = "carvao" | "gas" | "outros" | "fossil";
const AREAS: Area[] = ["turquia", "australia", "mundo", "brasil"];
const S = D.serie as Record<Area, Record<Fonte | "hidro", number[]>>;
const FALA = D.fala;

const br = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");
const sinal = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${br(Math.abs(n))}`;
/** Arredonda como a tela mostra (uma casa), pra diferença bater com os rótulos. */
const r1 = (n: number) => Math.round(n * 10) / 10;
const ioCubico = Easing.inOut(Easing.cubic);
const saida = Easing.out(Easing.cubic);
const mola = (f: number, de: number, config = { damping: 13, stiffness: 160 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));

// --- régua ---------------------------------------------------------------------------------------
const Y0 = 1110; // 0%
const H = 610; // 0 a 100%
const yDe = (pct: number) => Y0 - (pct * H) / 100;
const BW = 140, SLOT = 200;
const COR = { carvao: "#C9D2E3", gas: CIANO, outros: "#56637E" } as const;

/** Valor de uma série num ano fracionário (interpola entre os anos inteiros). */
const noAno = (a: Area, k: Fonte, ano: number) => {
  const i = Math.max(0, Math.min(25, ano - 2000));
  const i0 = Math.floor(i), i1 = Math.min(25, i0 + 1), t = i - i0;
  return S[a][k][i0] * (1 - t) + S[a][k][i1] * t;
};

/** Ano que as barras mostram: 2025; no "Desde 2000" voltam até 2000 e correm de novo até 2025. */
const anoEm = (f: number) =>
  f < V.volta || f >= FIM ? 2025
    : f < V.de ? 2025 - 25 * entre(f, V.volta, V.de - 4, ioCubico)
      : 2000 + 25 * entre(f, V.de, V.ate);

/** Quanto da barra já cresceu (0 a 1). A da Turquia já está inteira no quadro 0: é a capa automática
 *  da grade, e um contador no meio do caminho mostraria um número que não existe. */
const cresce = (a: Area, f: number) => {
  if (a === "turquia") return 1;
  const de = { australia: [M.australia - 2, M.p60 + 2], mundo: [M.mundo - 2, M.p58 + 2], brasil: [M.brasil - 2, M.p11 + 2] }[a];
  return entre(f, de[0], de[1], saida);
};
const aparece = (a: Area, f: number) => {
  if (a === "turquia") return 1;
  const de = { australia: M.australia, mundo: M.mundo, brasil: M.brasil }[a];
  return entre(f, de - 4, de + 4) * (1 - entre(f, FIM, FIM + 14));
};
/** Quantas barras ocupam a régua (fracionário, pras barras deslizarem pro lugar). */
const nVis = (f: number) =>
  1 + entre(f, F.australia - 6, F.australia + 10, ioCubico) + entre(f, M.mundo - 16, M.mundo, ioCubico)
  + entre(f, F.brasil - 6, F.brasil + 10, ioCubico) - 3 * entre(f, FIM, FIM + 20, ioCubico);
const xDe = (k: number, f: number) => 540 + (k - (nVis(f) - 1) / 2) * SLOT;

/** Tamanho do rótulo de valor: grande na barra em foco, 44 nas outras. */
const foco = (a: Area, f: number) => {
  switch (a) {
    case "turquia": return 1 - entre(f, F.australia - 4, F.australia + 8) + entre(f, FIM, FIM + 20);
    case "australia": return entre(f, M.australia, M.australia + 6) - entre(f, M.mundo - 4, M.mundo + 6);
    case "mundo": return entre(f, M.mundo, M.mundo + 6) - entre(f, F.brasil - 4, F.brasil + 6);
    case "brasil": return entre(f, M.brasil, M.brasil + 6) - entre(f, V.volta - 4, V.volta + 6);
  }
};
const tamRotulo = (a: Area, f: number) => 44 + (a === "turquia" ? 56 : 20) * foco(a, f);

const NOME: Record<Area, string> = { turquia: "TURQUIA", australia: "AUSTRÁLIA", mundo: "MUNDO", brasil: "BRASIL" };
const PAPEL: Record<Area, string> = { turquia: "PRESIDE A COP31", australia: "CONDUZ AS NEGOCIAÇÕES", mundo: "TODOS OS PAÍSES", brasil: "PRESIDIU A COP30" };
const BANDEIRA: Partial<Record<Area, string>> = { turquia: "bandeira-turquia.png", australia: "bandeira-australia.png", brasil: "bandeira-brasil.png" };
// Quando cada saldo 2000 → 2025 aparece (na palavra dita).
const SALDO_EM: Record<Area, number> = { australia: M.p32 - 2, turquia: M.t18 - 2, mundo: M.m7 - 2, brasil: M.b2 - 2 };

// --- fundo: a foto de Antália ------------------------------------------------------------------------
const fotoO = (f: number) => (f < FIM ? 1 - entre(f, F.australia - 6, F.australia + 10) : entre(f, FIM, FIM + 24));

const Foto: React.FC = () => {
  const f = useCurrentFrame();
  const o = fotoO(f);
  if (o <= 0) return null;
  // zoom lento que recomeça no loop: no fim volta ao enquadramento do quadro 0
  const z = f < FIM ? 1.04 + 0.05 * entre(f, 0, F.australia + 10) : 1.04;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Img src={staticFile("ciencia/fosseis-cop/antalia-falez.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "35% 50%", scale: `${z}` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(5,7,12,0.86) 0%, rgba(5,7,12,0.66) 30%, rgba(5,7,12,0.62) 55%, rgba(5,7,12,0.9) 75%, rgba(5,7,12,0.97) 100%)" }} />
    </AbsoluteFill>
  );
};

// --- cabeçalho: fonte, status, título e legenda das cores ----------------------------------------------
const Cabecalho: React.FC = () => {
  const f = useCurrentFrame();
  const corre = f >= V.volta && f < FIM;
  const ano = Math.round(anoEm(f));
  return (
    <>
      <div style={{ position: "absolute", top: 254, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, textShadow: "0 0 10px rgba(5,7,12,1)" }}>
        <span>FONTE:</span>
        <div style={{ background: TEXTO, padding: "5px 9px", display: "flex" }}>
          <Img src={staticFile("ciencia/fosseis-cop/ember-logo.png")} style={{ height: 20 }} />
        </div>
        <span>· CÁLCULO NOSSO</span>
      </div>
      <Status top={322} esquerda="COP31 · ANTÁLIA" direita="9 A 20/11/2026" />
      <div style={{ position: "absolute", top: 384, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 2, color: TEXTO, textShadow: "0 0 12px rgba(5,7,12,1)" }}>
        FATIA FÓSSIL DA ELETRICIDADE ·{" "}
        <span style={{ color: corre ? CIANO : TEXTO, fontSize: corre ? 40 : 30, display: "inline-block", minWidth: corre ? 104 : 0, textAlign: "left" }}>{ano}</span>
      </div>
      <div style={{ position: "absolute", top: 440, width: "100%", display: "flex", justifyContent: "center", gap: 34, fontFamily: MONO, fontSize: 21, letterSpacing: 2, color: TEXTO_2 }}>
        {(["carvao", "gas", "outros"] as const).map((k) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 20, height: 20, background: COR[k] }} />
            {{ carvao: "CARVÃO", gas: "GÁS", outros: "OUTROS FÓSSEIS" }[k]}
          </div>
        ))}
      </div>
    </>
  );
};

// --- a régua e as barras ------------------------------------------------------------------------
const Globo: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <g fill="none" stroke={CIANO} strokeWidth={2.5}>
    <circle cx={x} cy={y} r={r} />
    <ellipse cx={x} cy={y} rx={r * 0.45} ry={r} />
    <line x1={x} x2={x} y1={y - r} y2={y + r} />
    <line x1={x - r} x2={x + r} y1={y} y2={y} />
    <path d={`M${x - r * 0.87},${y - r * 0.5} H${x + r * 0.87} M${x - r * 0.87},${y + r * 0.5} H${x + r * 0.87}`} />
  </g>
);

const Regua: React.FC = () => {
  const f = useCurrentFrame();
  const apaga = entre(f, G0 - 6, G0 + 4) * (1 - entre(f, FIM, FIM + 12));
  const oGrupo = 1 - 0.93 * apaga;
  const ano = anoEm(f);
  const mundoO = entre(f, M.p58 - 4, M.p58 + 4) * (1 - entre(f, V.volta - 6, V.volta + 4));
  const fantasmaO = entre(f, V.de, V.de + 8) * (1 - entre(f, FIM, FIM + 10));
  const tercoO = entre(f, M.terco - 4, M.terco + 4) * (1 - entre(f, F.australia - 6, F.australia + 2));
  const xT = xDe(0, f);
  // a linha da metade anda (tracejado correndo) no gancho e no loop; offset 0 no quadro 0 e no último
  const metadeO = 1 - entre(f, F.australia - 8, F.australia + 2) + entre(f, FIM, FIM + 12);
  const marcha = f < F.turquia ? 1 - entre(f, F.turquia - 10, F.turquia) : entre(f, FIM, FIM + 10);
  const dash = f < F.turquia ? -f * 1.2 : f >= FIM ? -(f - T.total) * 1.2 : 0;
  // "mais da metade": o pedaço da barra da Turquia acima da linha acende
  const acima = entre(f, M.metade - 4, M.metade + 2) * (1 - entre(f, F.turquia + 20, F.turquia + 30));
  return (
    <AbsoluteFill style={{ opacity: oGrupo }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {/* 100%, metade e base */}
        <line x1={130} x2={935} y1={yDe(100)} y2={yDe(100)} stroke={TEXTO_2} strokeOpacity={0.35} strokeWidth={1.5} />
        <text x={935} y={yDe(100) - 10} textAnchor="end" fontFamily={MONO} fontSize={20} letterSpacing={2} fill={TEXTO_2}>100%</text>
        <line x1={130} x2={935} y1={yDe(50)} y2={yDe(50)} stroke={TEXTO} strokeOpacity={0.6 + 0.3 * marcha} strokeWidth={2 + marcha} strokeDasharray="10 10" strokeDashoffset={dash} />
        <text x={935} y={yDe(50) - 10} textAnchor="end" fontFamily={MONO} fontSize={20} letterSpacing={2} fill={TEXTO} opacity={metadeO}>METADE</text>
        {/* a régua do mundo: atrás das barras, aparece entre elas */}
        {mundoO > 0 && (
          <g opacity={mundoO}>
            <line x1={130} x2={130 + 805 * entre(f, M.p58 - 4, M.p58 + 10, saida)} y1={yDe(FALA.mundo)} y2={yDe(FALA.mundo)} stroke={LARANJA} strokeWidth={3} strokeDasharray="14 8" />
            <text x={130} y={yDe(FALA.mundo) + 28} fontFamily={MONO} fontSize={20} letterSpacing={2} fill={LARANJA} opacity={1 - entre(f, F.brasil - 8, F.brasil)}>MUNDO</text>
          </g>
        )}
        {AREAS.map((a, k) => {
          const o = aparece(a, f);
          if (o <= 0) return null;
          const g = cresce(a, f);
          const x = xDe(k, f), x0 = x - BW / 2;
          const c = noAno(a, "carvao", ano) * g, gs = noAno(a, "gas", ano) * g, ou = noAno(a, "outros", ano) * g;
          const yC = yDe(c), yG = yDe(c + gs), yO = yDe(c + gs + ou);
          const tam = tamRotulo(a, f);
          const quente = foco(a, f) > 0.5;
          const total = c + gs + ou;
          const de2000 = S[a].fossil[0];
          return (
            <g key={a} opacity={o}>
              <rect x={x0} y={yC} width={BW} height={Y0 - yC} fill={COR.carvao} />
              <rect x={x0} y={yG} width={BW} height={yC - yG} fill={COR.gas} />
              <rect x={x0} y={yO} width={BW} height={yG - yO} fill={COR.outros} />
              <line x1={x0} x2={x0 + BW} y1={yC} y2={yC} stroke={FUNDO} strokeWidth={2} />
              <line x1={x0} x2={x0 + BW} y1={yG} y2={yG} stroke={FUNDO} strokeWidth={2} />
              {fantasmaO > 0 && (
                <g opacity={fantasmaO}>
                  <line x1={x0} x2={x0 + BW} y1={yDe(de2000)} y2={yDe(de2000)} stroke={TEXTO} strokeWidth={2.5} strokeDasharray="8 6" />
                </g>
              )}
              <text x={x} y={yO - 16} textAnchor="middle" fontFamily={MONO} fontSize={tam} letterSpacing={-1}
                fill={quente ? LARANJA : TEXTO} stroke={FUNDO} strokeWidth={6} paintOrder="stroke">
                {br(total)}%
              </text>
            </g>
          );
        })}
        {acima > 0 && (
          <g opacity={acima}>
            <rect x={xT - BW / 2 - 6} y={yDe(FALA.turquia) - 6} width={BW + 12} height={yDe(50) - yDe(FALA.turquia) + 6} fill="none" stroke={LARANJA} strokeWidth={4} />
            <text x={xT - BW / 2 - 22} y={(yDe(50) + yDe(FALA.turquia)) / 2 + 2} textAnchor="end" fontFamily={MONO} fontSize={28} fill={LARANJA} stroke={FUNDO} strokeWidth={6} paintOrder="stroke">
              +{br(FALA.turquia - 50)} ACIMA
            </text>
          </g>
        )}
        {/* "mais de um terço": a marca de 1/3 ao lado da barra da Turquia */}
        {tercoO > 0 && (
          <g opacity={tercoO}>
            <line x1={xT - BW / 2 - 50} x2={xT - BW / 2 - 4} y1={yDe(100 / 3)} y2={yDe(100 / 3)} stroke={LARANJA} strokeWidth={3} />
            <text x={xT - BW / 2 - 60} y={yDe(100 / 3) + 9} textAnchor="end" fontFamily={MONO} fontSize={28} fill={LARANJA}>1/3</text>
          </g>
        )}
        <line x1={130} x2={935} y1={Y0} y2={Y0} stroke={TEXTO_2} strokeOpacity={0.8} strokeWidth={2} />
      </svg>
      <Rotulos />
      <Rodape />
    </AbsoluteFill>
  );
};

/** Rótulos das fatias, à direita da barra em foco (Turquia na abertura, Austrália na sua fala). */
const Rotulos: React.FC = () => {
  const f = useCurrentFrame();
  const itens: { a: Area; k: number; o: number; quente: number; fontes: ("carvao" | "gas")[]; de: Record<"carvao" | "gas", number> }[] = [
    { a: "turquia", k: 0, o: 1 - entre(f, F.australia - 6, F.australia + 2), quente: entre(f, M.terco - 2, M.terco + 4), fontes: ["carvao", "gas"], de: { carvao: M.carvao0 - 2, gas: M.gas0 - 2 } },
    { a: "australia", k: 1, o: 1 - entre(f, M.mundo - 18, M.mundo - 8), quente: entre(f, M.so - 2, M.so + 4), fontes: ["carvao", "gas"], de: { carvao: M.so - 4, gas: M.p60 + 4 } },
  ];
  return (
    <>
      {itens.map(({ a, k, o, quente, fontes, de }) => {
        if (o <= 0) return null;
        const g = cresce(a, f);
        const x = xDe(k, f) + BW / 2 + 22;
        const c = S[a].carvao[25], gs = S[a].gas[25];
        const meio = { carvao: yDe((c * g) / 2), gas: yDe(c * g + (gs * g) / 2) };
        return fontes.map((fo) => {
          const p = entre(f, de[fo], de[fo] + 6);
          if (p <= 0) return null;
          const destaque = fo === "carvao" ? quente : 0;
          return (
            <div key={`${a}-${fo}`} style={{
              position: "absolute", left: x, top: meio[fo] - 20, opacity: o * p, translate: `${(1 - p) * -12}px 0`,
              fontFamily: MONO, fontSize: 30, letterSpacing: 1, whiteSpace: "nowrap",
              color: destaque > 0.5 ? LARANJA : TEXTO, textShadow: "0 0 10px rgba(5,7,12,1), 0 0 4px rgba(5,7,12,1)",
            }}>
              <span style={{ color: destaque > 0.5 ? LARANJA : TEXTO_2, fontSize: 22, letterSpacing: 2 }}>{fo === "carvao" ? "CARVÃO " : "GÁS "}</span>
              {br(fo === "carvao" ? c : gs)}%
            </div>
          );
        });
      })}
    </>
  );
};

/** Bandeira, nome e papel embaixo de cada barra; na corrida dos anos o papel dá lugar ao saldo. */
const Rodape: React.FC = () => {
  const f = useCurrentFrame();
  const papelO = 1 - entre(f, V.volta - 4, V.volta + 6) + entre(f, FIM, FIM + 14);
  return (
    <>
      {AREAS.map((a, k) => {
        const o = aparece(a, f);
        if (o <= 0) return null;
        const x = xDe(k, f);
        const saldo = r1(S[a].fossil[25]) - r1(S[a].fossil[0]);
        const sO = entre(f, SALDO_EM[a], SALDO_EM[a] + 5) * (1 - entre(f, FIM, FIM + 10));
        const s = mola(f, SALDO_EM[a], { damping: 11, stiffness: 220 });
        return (
          <div key={a} style={{ position: "absolute", left: x - 100, top: 1132, width: 200, opacity: o, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            {BANDEIRA[a] ? (
              <Img src={staticFile(`ciencia/fosseis-cop/${BANDEIRA[a]}`)} style={{ height: 54, outline: "1.5px solid rgba(232,244,255,0.45)" }} />
            ) : (
              <svg width={60} height={60} style={{ marginTop: -3, marginBottom: -3 }}><Globo x={30} y={30} r={26} /></svg>
            )}
            <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 25, letterSpacing: 2, color: TEXTO, textShadow: "0 0 8px rgba(5,7,12,1)" }}>{NOME[a]}</div>
            <div style={{ position: "relative", width: 200, height: 70 }}>
              <div style={{ position: "absolute", top: 6, width: 200, opacity: papelO, fontFamily: MONO, fontSize: 16, lineHeight: 1.25, letterSpacing: 1, color: TEXTO_2, textShadow: "0 0 8px rgba(5,7,12,1)" }}>{PAPEL[a]}</div>
              {sO > 0 && (
                <div style={{ position: "absolute", top: 0, width: 200, opacity: sO, scale: `${0.7 + 0.3 * s}`, fontFamily: MONO, color: LARANJA, textShadow: "0 0 10px rgba(5,7,12,1)" }}>
                  <div style={{ fontSize: 40, lineHeight: 1 }}>{sinal(saldo)}</div>
                  <div style={{ fontSize: 15, letterSpacing: 1, color: TEXTO_2, marginTop: 4 }}>PONTOS DESDE 2000</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

// --- marcas que acompanham a voz -----------------------------------------------------------------
/** Diferença pra régua do mundo, em cima da Turquia ("um pouco abaixo") e da Austrália ("acima"). */
const ContraMundo: React.FC = () => {
  const f = useCurrentFrame();
  const fora = 1 - entre(f, F.brasil - 4, F.brasil + 6);
  const itens: [Area, number, number][] = [["turquia", 0, M.abaixo - 2], ["australia", 1, M.acima - 2]];
  return (
    <>
      {itens.map(([a, k, de]) => {
        const o = entre(f, de, de + 5) * fora;
        if (o <= 0) return null;
        const d = r1(S[a].fossil[25]) - r1(S.mundo.fossil[25]);
        return (
          <div key={a} style={{
            position: "absolute", left: xDe(k, f) - 100, width: 200, top: yDe(S[a].fossil[25]) - 128, textAlign: "center", opacity: o,
            fontFamily: MONO, fontSize: 28, color: LARANJA, textShadow: "0 0 10px rgba(5,7,12,1), 0 0 4px rgba(5,7,12,1)", translate: `0 ${(1 - o) * 10}px`,
          }}>
            {sinal(d)} <span style={{ fontSize: 18, letterSpacing: 2, color: TEXTO_2 }}>VS MUNDO</span>
          </div>
        );
      })}
    </>
  );
};

/** Tag de instrumento no terço de baixo, acima da legenda. */
const Tag: React.FC<{ texto: string; o: number }> = ({ texto, o }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top: 1288, width: "100%", display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ border: `3px solid ${CIANO}`, padding: "10px 20px", fontFamily: MONO, fontSize: 30, letterSpacing: 2, color: CIANO, background: "rgba(5,7,12,0.86)", whiteSpace: "nowrap" }}>{texto}</div>
    </div>
  );

const Marcas: React.FC = () => {
  const f = useCurrentFrame();
  const hidro = entre(f, M.hidro - 8, M.hidro) * (1 - entre(f, V.volta - 6, V.volta + 2));
  // "estava em 92%": o valor de 2000 em cima da linha pontilhada da Austrália
  const o92 = entre(f, M.p92 - 6, M.p92) * (1 - entre(f, G0 - 6, G0 + 2));
  return (
    <>
      <ContraMundo />
      <Tag texto={`HIDRELÉTRICAS: ${br(FALA.brasilHidro)}% NO BRASIL`} o={hidro} />
      {o92 > 0 && (
        <div style={{
          position: "absolute", left: xDe(1, f) - 130, width: 260, top: yDe(S.australia.fossil[0]) - 46, textAlign: "center", opacity: o92,
          fontFamily: MONO, fontSize: 28, color: TEXTO, textShadow: "0 0 10px rgba(5,7,12,1), 0 0 4px rgba(5,7,12,1)",
        }}>
          <span style={{ fontSize: 18, letterSpacing: 2, color: TEXTO_2 }}>EM 2000 </span>{br(S.australia.fossil[0])}%
        </div>
      )}
    </>
  );
};

const Credito: React.FC = () => {
  const f = useCurrentFrame();
  const o = fotoO(f);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 1296, width: "100%", textAlign: "center", opacity: o * (f < FIM ? 1 : 1 - entre(f, T.cta, T.cta + 6)), fontFamily: MONO, fontSize: 19, letterSpacing: 2, color: TEXTO_2, textShadow: "0 0 8px rgba(5,7,12,1)" }}>
      ANTÁLIA, SEDE DA COP31 · FOTO: HALUK COMERTEL, CC BY 3.0
    </div>
  );
};

// --- texto no terço de baixo ---------------------------------------------------------------------
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

/** A pergunta do fim, grande, palavra por palavra, por cima das barras apagadas. */
const PerguntaFinal: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, G0 - 4, G0 + 2) * (1 - entre(f, FIM - 8, FIM));
  if (o <= 0) return null;
  const linhas = [0, 1, 2].map((l) => T.grande.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top: 600, left: 70, width: 940, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 82, lineHeight: 1.18, letterSpacing: -1, color: TEXTO,
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
      <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 4, color: TEXTO }}>SEGUE O CIÊNCIA VISUAL</div>
    </div>
  );
};

// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/fosseis-cop/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/fosseis-cop/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const FosseisCop: React.FC = () => (
  <Fundo>
    <Foto />
    <Cabecalho />
    <Regua />
    <Marcas />
    <Credito />
    <PerguntaFinal />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-fosseis-cop.mjs: whoosh nas trocas, tiques nos contadores e na corrida dos anos */}
    <Audio src={staticFile("ciencia/fosseis-cop/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------------
export const FosseisCopCapa: React.FC = () => {
  const linha = (a: Area, y: number) => (
    <div style={{ position: "absolute", top: y, left: 150, width: 780, display: "flex", alignItems: "center", gap: 30 }}>
      <Img src={staticFile(`ciencia/fosseis-cop/${BANDEIRA[a]}`)} style={{ height: 78, outline: "2px solid rgba(232,244,255,0.5)" }} />
      <div style={{ fontFamily: MONO, fontSize: 104, color: a === "turquia" ? LARANJA : TEXTO, letterSpacing: -2, textShadow: "0 0 20px rgba(5,7,12,1)" }}>{br(S[a].fossil[25])}%</div>
    </div>
  );
  return (
    <Fundo>
      <AbsoluteFill>
        <Img src={staticFile("ciencia/fosseis-cop/antalia-falez.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "35% 50%", scale: "1.04" }} />
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(5,7,12,0.88) 0%, rgba(5,7,12,0.62) 35%, rgba(5,7,12,0.7) 60%, rgba(5,7,12,0.95) 100%)" }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2 }}>
        COP31 · ANTÁLIA · 9 A 20/11
      </div>
      <div style={{
        position: "absolute", top: 400, left: 90, width: 900, textAlign: "center",
        fontFamily: SORA, fontWeight: 300, fontSize: 112, lineHeight: 1.08, letterSpacing: -1.5, color: TEXTO,
        textShadow: "0 0 30px rgba(5,7,12,0.95)",
      }}>
        Os anfitriões<br />e os <span style={{ color: LARANJA }}>fósseis</span>
      </div>
      {linha("turquia", 800)}
      {linha("australia", 960)}
      <div style={{ position: "absolute", top: 1140, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: TEXTO_2 }}>
        DA ELETRICIDADE, 2025 · MUNDO {br(S.mundo.fossil[25])}%
      </div>
      <div style={{ position: "absolute", top: 1560, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 18, letterSpacing: 2, color: TEXTO_2 }}>
        FOTO: HALUK COMERTEL, CC BY 3.0 · DADOS: EMBER
      </div>
    </Fundo>
  );
};
