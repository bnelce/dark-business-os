import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./gta6.json";
import T from "./gta6-tempos.json";
import { Fundo, Status, X0, X1, entre, janela } from "./base";
import { CIANO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";
import { FiltroNeon, Neon } from "./ilustra-dolar";

// "Quanto tempo leva baixar o GTA VI" (18/11/2026). Começa pela consequência (com 20 mega, o jogo
// só fica pronto amanhã à noite) e paga com a conta: até 212 GB do pré-load (Rockstar, 3/11) são
// 1.696 gigabits; dividido pela velocidade, 28 min com 1 giga, 2h08 na mediana fixa do Brasil
// (221,5 Mbps, Ookla, mar/2026), 4h43 com 100 mega, 23h33 com 20. Depois a meia-noite: o país abre
// todo no mesmo instante (03:00 UTC), 22h no Acre, 23h em Manaus, 0h em Brasília, 1h em Noronha;
// a Nova Zelândia abriu 16 horas antes.
//
// Arte própria: nada de logo, print ou personagem da Rockstar. O "GTA VI" aparece só escrito.
//
// Números: gta6.json (gerar-gta6.mjs confere a fala contra a conta). Tempos: gta6-tempos.json.
// A trilha (gerar-trilha-gta6.mjs) lê os mesmos tempos.
// O laranja é a barra de 20 mega, o 23H33, a meia-noite de Brasília e as palavras-chave; o ciano é o
// relógio, as outras barras e o mapa.

export const GTA6_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const FIM = T.fim;

const br = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");
const STATUS_TOP = 330;
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const ioCubico = Easing.inOut(Easing.cubic);
const ioQuad = Easing.inOut(Easing.quad);
const saida = Easing.out(Easing.cubic);

const V = Object.fromEntries(D.velocidades.map((v) => [v.id, v])) as Record<string, (typeof D.velocidades)[number]>;
const H20 = V.vinte.horas;

const conta = (id: string, f: number, easing = saida) => {
  const c = T.contas.find((x) => x.id === id)!;
  return entre(f, c.de, c.ate, easing);
};
const digitado = (id: string, f: number) => {
  const d = T.digita.find((x) => x.id === id)!;
  if (f < d.de) return "";
  const passo = (d.ate - d.de) / d.texto.length;
  return d.texto.slice(0, Math.min(d.texto.length, Math.floor((f - d.de) / passo) + 1));
};
/** "23:33" a partir de horas. */
const hhmm = (h: number) => {
  const min = Math.round(h * 60);
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
};
const mil = (n: number) => Math.round(n).toLocaleString("pt-BR");

// --- texto no terço de baixo ---------------------------------------------------------------
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

const fonteDe = (f: number) => {
  if (f < F.tamanho - 2 || f >= FIM) return "";
  if (f < F.corrida) return "FONTE: ROCKSTAR NEWSWIRE · 3/11/2026";
  if (f < F.fusos) return "CONTA NOSSA · MEDIANA: OOKLA, MAR/2026";
  if (f < F.zelandia) return "FUSOS: LEI 12.876/2013 · SEM HORÁRIO DE VERÃO";
  if (f < F.pergunta) return "HORÁRIOS DAS LOJAS: GAMERFUZION · CONTA NOSSA";
  return "";
};

const Fonte: React.FC = () => {
  const f = useCurrentFrame();
  const t = fonteDe(f);
  if (!t) return null;
  return (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, textShadow: "0 0 10px rgba(5,7,12,1)" }}>
      {t}
    </div>
  );
};

// --- o relógio do download: um anel de 24 horas que enche a partir da meia-noite ---------------
const Relogio: React.FC<{ id: string; cx: number; cy: number; r: number; horas: number; quente?: boolean; rotulo?: string; f: number }> = ({
  id, cx, cy, r, horas, quente = false, rotulo = "19/11", f,
}) => {
  const fr = Math.max(0, Math.min(horas, 23.999)) / 24;
  const ang = fr * 2 * Math.PI;
  const px = cx + r * Math.sin(ang), py = cy - r * Math.cos(ang);
  const arco = fr > 0 ? `M${cx},${cy - r} A${r},${r} 0 ${fr > 0.5 ? 1 : 0} 1 ${px.toFixed(2)},${py.toFixed(2)}` : "";
  const pulso = 1 + 0.18 * Math.sin(f * 0.35);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id={`neonRel${id}`} desvio={6} /></defs>
        <circle cx={cx} cy={cy} r={r} fill="rgba(12,20,36,0.6)" stroke={TEXTO_2} strokeOpacity={0.35} strokeWidth={2} />
        {Array.from({ length: 24 }, (_, k) => {
          const a = (k / 24) * 2 * Math.PI, longo = k % 6 === 0;
          const r0 = r - (longo ? 26 : 14), r1 = r - 4;
          return <line key={k} x1={cx + r0 * Math.sin(a)} y1={cy - r0 * Math.cos(a)} x2={cx + r1 * Math.sin(a)} y2={cy - r1 * Math.cos(a)} stroke={TEXTO_2} strokeWidth={longo ? 3 : 1.5} />;
        })}
        {[0, 6, 12, 18].map((h) => {
          const a = (h / 24) * 2 * Math.PI, rr = r + 30;
          return <text key={h} x={cx + rr * Math.sin(a)} y={cy - rr * Math.cos(a) + 8} textAnchor="middle" fontFamily={MONO} fontSize={22} fill={TEXTO_2}>{h}H</text>;
        })}
        {arco && (
          <Neon filtro={`neonRel${id}`} cor={quente ? LARANJA : CIANO} largura={7}>
            <path d={arco} />
          </Neon>
        )}
        <circle cx={px} cy={py} r={11 * (fr > 0 ? 1 : pulso)} fill={LARANJA} />
      </svg>
      <div style={{ position: "absolute", left: cx - r, top: cy - r * 0.32, width: 2 * r, textAlign: "center", fontFamily: MONO, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: r * 0.44, lineHeight: 1, color: quente ? LARANJA : TEXTO, letterSpacing: -2, textShadow: quente ? `0 0 26px ${LARANJA}55` : undefined }}>{hhmm(horas)}</div>
        <div style={{ fontSize: Math.max(20, r * 0.12), letterSpacing: 3, color: TEXTO_2, marginTop: 10 }}>{rotulo}</div>
      </div>
    </>
  );
};

/** Barra de download com rótulo em cima e o tempo (ou a %) à direita. */
const Barra: React.FC<{ y: number; rotulo: string; p: number; fim: string; quente?: boolean; ativo?: boolean; tam?: number; h?: number; direita?: string }> = ({
  y, rotulo, p, fim, quente = false, ativo = true, tam = 30, h = 30, direita,
}) => {
  const cor = quente ? LARANJA : CIANO;
  const pronto = p >= 0.9999;
  return (
    <div style={{ position: "absolute", top: y, left: X0, width: X1 - X0, fontFamily: MONO }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: tam, letterSpacing: 2, color: ativo ? TEXTO : TEXTO_2 }}>
        <span>{rotulo}</span>
        <span style={{ color: pronto ? cor : TEXTO_2, fontSize: pronto ? tam * 1.15 : tam, textShadow: pronto && quente ? `0 0 20px ${LARANJA}66` : undefined }}>{pronto ? fim : direita ?? `${Math.floor(p * 100)}%`}</span>
      </div>
      <div style={{ position: "relative", marginTop: 12, height: h, border: `2px solid ${ativo ? TEXTO_2 : "rgba(133,146,171,0.5)"}` }}>
        <div style={{ position: "absolute", left: 3, top: 3, bottom: 3, width: `calc(${(100 * Math.min(1, p)).toFixed(3)}% - 6px)`, background: cor, opacity: 0.9, boxShadow: `0 0 18px ${cor}66` }} />
      </div>
    </div>
  );
};

// --- cena 1 (e a volta do fim): a barra de 20 mega contra o relógio ---------------------------
const Download: React.FC<{ lf: number; modo: "gancho" | "volta" | "pergunta" }> = ({ lf, modo }) => {
  const f = useCurrentFrame();
  const g = T.relogio.gancho;
  // na volta o relógio fica parado na 0h, igual ao quadro 0: o loop emenda sem salto
  const horas = modo === "gancho" ? H20 * entre(lf, g.de, g.ate) : 0;
  const pronto = modo === "gancho" && lf >= g.ate;
  const seu = modo === "pergunta" ? entre(f, M.seu - 4, M.seu + 6, saida) : 0;
  return (
    <>
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 30, letterSpacing: 6, color: TEXTO_2 }}>GTA VI · PRÉ-LOAD</div>
      <div style={{ position: "absolute", top: 345, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 300, color: TEXTO, whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 44, letterSpacing: 4, color: TEXTO_2, marginRight: 18 }}>ATÉ</span>
        <span style={{ fontSize: 176, letterSpacing: -6, lineHeight: 1 }}>212 GB</span>
      </div>
      <Relogio id={modo} cx={540} cy={820} r={200} horas={horas} quente={pronto} f={f} rotulo={modo === "pergunta" ? "LIBERA À 0H · 19/11" : "19/11"} />
      {modo === "pergunta" ? (
        <>
          <Barra y={1100} rotulo="QUEM FEZ O PRÉ-LOAD" p={1} fim="PRONTO" />
          {seu > 0 && (
            <div style={{ opacity: seu }}>
              <Barra y={1215} rotulo="E O SEU?" p={0.06 + 0.04 * Math.sin(f * 0.2)} fim="" direita="?" quente />
            </div>
          )}
        </>
      ) : (
        <>
          <Barra y={1100} rotulo="20 MEGA" p={horas / H20} fim="23H33" quente />
          <div style={{ position: "absolute", top: 1200, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: pronto ? LARANJA : TEXTO_2 }}>
            {pronto ? "PRONTO ÀS 23H33 DE 19/11" : "COMEÇANDO À 0H DE 19/11"}
          </div>
        </>
      )}
    </>
  );
};

const CenaGancho: React.FC = () => {
  const f = useCurrentFrame();
  const o = 1 - entre(f, F.tamanho - 6, F.tamanho + 2);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o }}><Download lf={f} modo="gancho" /></AbsoluteFill>;
};

// --- cena 2: 212 GB × 8 = 1.696 gigabits ---------------------------------------------------------
const CenaBits: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.tamanho - 2, F.corrida + 2, 8);
  if (o <= 0) return null;
  const gb = entre(f, F.tamanho - 2, F.tamanho + 8, saida);
  const bits = conta("bits", f, (t) => t);
  // o 1.696 entra pronto, sem contador: nada de número intermediário com o rótulo GIGABITS
  const mostra = entre(f, M.n1696 - 6, M.n1696);
  const pula = 0.85 + 0.15 * mola(f, M.n1696 - 6, { damping: 11, stiffness: 220 });
  const nota = entre(f, M.gigabytes, M.gigabytes + 8);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="PRÉ-LOAD DO GTA VI" direita="PS5 · XBOX SERIES" />
      <div style={{ position: "absolute", top: 420, width: "100%", textAlign: "center", opacity: gb, translate: `0 ${(1 - gb) * 20}px` }}>
        <span style={{ fontFamily: MONO, fontSize: 40, letterSpacing: 4, color: TEXTO_2, marginRight: 16 }}>ATÉ</span>
        <span style={{ fontFamily: SORA, fontWeight: 300, fontSize: 170, letterSpacing: -5, color: TEXTO, lineHeight: 1 }}>212</span>
        <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2, marginTop: 10 }}>GIGABYTES</div>
      </div>
      {/* um byte = oito bits */}
      <div style={{ position: "absolute", top: 740, width: "100%", display: "flex", justifyContent: "center", gap: 16, opacity: entre(f, M.internet - 6, M.internet + 4) }}>
        {Array.from({ length: 8 }, (_, k) => {
          const aceso = bits * 8 > k;
          return <div key={k} style={{ width: 64, height: 64, border: `2.5px solid ${aceso ? CIANO : TEXTO_2}`, background: aceso ? "rgba(92,225,255,0.28)" : "transparent", boxShadow: aceso ? `0 0 16px ${CIANO}66` : undefined, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 26, color: aceso ? TEXTO : TEXTO_2 }}>{aceso ? (k % 3 === 1 ? 0 : 1) : ""}</div>;
        })}
      </div>
      <div style={{ position: "absolute", top: 830, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 3, color: CIANO, opacity: entre(f, M.bits - 2, M.bits + 6) }}>
        1 BYTE = 8 BITS · × 8
      </div>
      <div style={{ position: "absolute", top: 905, width: "100%", textAlign: "center", opacity: mostra, scale: `${pula}` }}>
        <div style={{ fontFamily: SORA, fontWeight: 300, fontSize: 190, letterSpacing: -6, color: LARANJA, lineHeight: 1, textShadow: `0 0 34px ${LARANJA}55` }}>{mil(D.gbits)}</div>
        <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 4, color: TEXTO_2, marginTop: 12 }}>GIGABITS</div>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: TEXTO_2, marginTop: 8 }}>A INTERNET SE MEDE EM BITS: "MEGA" = MEGABIT/S</div>
      </div>
      <div style={{ position: "absolute", top: 1290, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 21, letterSpacing: 1.5, color: TEXTO_2, opacity: nota }}>
        "ATÉ 212 GB" É O ESPAÇO PEDIDO, NÃO O DOWNLOAD EXATO
      </div>
    </AbsoluteFill>
  );
};

// --- cena 3: as quatro barras correndo contra o relógio ----------------------------------------
const ORDEM_V = ["giga", "mediana", "cem", "vinte"] as const;
const horasCorrida = (f: number) => {
  let h = 0;
  T.relogio.corrida.forEach((s, k) => {
    if (f < s.de) return;
    const de = k ? V[ORDEM_V[k - 1]].horas : 0;
    h = de + (V[s.ate_h].horas - de) * entre(f, s.de, s.ate, ioQuad);
  });
  return h;
};

const CenaCorrida: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.corrida - 2, F.fusos + 2, 8);
  if (o <= 0) return null;
  const horas = horasCorrida(f);
  const fimV = T.relogio.corrida.at(-1)!.ate;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="TEMPO PRA BAIXAR" direita={digitado("melhor", f)} />
      <Relogio id="corrida" cx={540} cy={610} r={165} horas={horas} quente={f >= fimV} f={f} rotulo="DESDE A 0H" />
      {ORDEM_V.map((id, k) => {
        const v = V[id];
        const seg = T.relogio.corrida[k];
        return (
          <Barra key={id} y={860 + k * 118} rotulo={v.rotulo} p={horas / v.horas} fim={v.tempo} quente={id === "vinte"}
            ativo={f >= seg.de - 6} tam={k === 1 ? 26 : 30} h={26} />
        );
      })}
    </AbsoluteFill>
  );
};

// --- cena 4: o Brasil abre todo no mesmo instante -----------------------------------------------
const ACENDE: Record<string, number> = { "-5": M.n22, "-4": M.n23f, "-3": M.meianoite, "-2": M.uma };
const FUSOS = [
  { z: "-5", hora: "22:00", dia: "18/11", lugar: "ACRE", nota: "E O OESTE DO AMAZONAS", dx: 0, dy: 150 },
  { z: "-4", hora: "23:00", dia: "18/11", lugar: "AM · RR · RO · MT · MS", nota: "", dx: 0, dy: -10 },
  { z: "-3", hora: "0:00", dia: "19/11", lugar: "BRASÍLIA", nota: "", dx: 150, dy: 40 },
  { z: "-2", hora: "1:00", dia: "19/11", lugar: "NORONHA", nota: "", dx: -60, dy: -170 },
] as const;
const OPAC: Record<number, number> = { [-5]: 0.42, [-4]: 0.28, [-3]: 0.15 };

const CenaFusos: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.fusos - 2, F.zelandia + 2, 8);
  if (o <= 0) return null;
  const mapa = entre(f, F.fusos - 2, F.fusos + 10, saida);
  const flash = janela(f, M.instante - 2, M.instante + 16, 6);
  const aceso = (z: string) => entre(f, ACENDE[z] - 3, ACENDE[z] + 5);
  const [nx, ny] = D.brasil.noronha;
  const [bx, by] = D.brasil.brasilia;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="LIBERA NO MESMO INSTANTE" direita="03:00 UTC" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: mapa }}>
        <defs><FiltroNeon id="neonMapa" desvio={5} /></defs>
        {D.brasil.estados.map((e) => (
          <path key={e.uf} d={e.d} fill={CIANO} fillOpacity={OPAC[e.z] * aceso(String(e.z))} stroke={flash > 0 ? CIANO : TEXTO_2}
            strokeOpacity={0.45 + 0.5 * flash} strokeWidth={1.5 + 1.5 * flash} />
        ))}
        {/* Noronha: ponto */}
        <circle cx={nx} cy={ny} r={9} fill={CIANO} fillOpacity={0.3 + 0.7 * aceso("-2")} stroke={CIANO} strokeWidth={2} />
        {aceso("-2") > 0 && <circle cx={nx} cy={ny} r={9 + 30 * entre(f, M.uma, M.uma + 14)} fill="none" stroke={CIANO} strokeWidth={2} opacity={1 - entre(f, M.uma, M.uma + 14)} />}
        {/* Brasília: o ponto quente */}
        <circle cx={bx} cy={by} r={10} fill={LARANJA} opacity={aceso("-3")} />
      </svg>
      {FUSOS.map((z) => {
        const a = aceso(z.z);
        if (a <= 0) return null;
        const [lx, ly] = (D.brasil.rotulos as Record<string, number[]>)[z.z];
        const quente = z.z === "-3";
        const x = Math.max(X0 + 100, Math.min(1080 - 160, lx + z.dx));
        return (
          <div key={z.z} style={{
            position: "absolute", left: x - 210, top: ly + z.dy - 50, width: 420, textAlign: "center", fontFamily: MONO,
            opacity: a, scale: `${0.8 + 0.2 * mola(f, ACENDE[z.z] - 3, { damping: 11, stiffness: 220 })}`, textShadow: "0 0 12px rgba(5,7,12,1), 0 0 4px rgba(5,7,12,1)",
          }}>
            <div style={{ fontSize: 64, lineHeight: 1, color: quente ? LARANJA : TEXTO, letterSpacing: -1 }}>{z.hora}</div>
            <div style={{ fontSize: 22, letterSpacing: 2, color: quente ? LARANJA : CIANO, marginTop: 6 }}>{z.lugar}</div>
            <div style={{ fontSize: 18, letterSpacing: 2, color: TEXTO_2, marginTop: 4 }}>{z.dia}</div>
            {z.nota && <div style={{ fontSize: 18, letterSpacing: 2, color: TEXTO_2, marginTop: 2 }}>{z.nota}</div>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// --- cena 5: a Nova Zelândia abriu 16 horas antes ----------------------------------------------
const TX0 = 150, TX1 = 930, H0 = 6, H1 = 26; // eixo de 6h de 18/11 a 2h de 19/11 (horário de Brasília)
const xh = (h: number) => TX0 + ((h - H0) / (H1 - H0)) * (TX1 - TX0);

const CenaZelandia: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.zelandia - 2, F.pergunta + 2, 8);
  if (o <= 0) return null;
  const eixo = entre(f, F.zelandia - 2, F.zelandia + 10, saida);
  const nz = entre(f, M.zelandia - 4, M.zelandia + 6);
  const p = conta("nz", f, ioCubico);
  const xNz = xh(D.libera.nz), xBr = xh(24);
  const Y = 900;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status top={STATUS_TOP} esquerda="PELO HORÁRIO DE BRASÍLIA" direita="18 → 19/11" />
      <div style={{ position: "absolute", top: 520, width: "100%", textAlign: "center", opacity: entre(f, M.abriu - 6, M.abriu), fontFamily: SORA, fontWeight: 300, color: LARANJA, textShadow: `0 0 34px ${LARANJA}55` }}>
        <span style={{ fontSize: 190, letterSpacing: -6, lineHeight: 1 }}>{Math.round(D.libera.antes * p)}</span>
        <span style={{ fontFamily: MONO, fontSize: 44, letterSpacing: 4, marginLeft: 18 }}>HORAS ANTES</span>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: eixo }}>
        <defs><FiltroNeon id="neonNz" desvio={5} /></defs>
        <line x1={TX0} x2={TX1} y1={Y} y2={Y} stroke={TEXTO_2} strokeWidth={2} />
        {Array.from({ length: H1 - H0 + 1 }, (_, k) => {
          const h = H0 + k, x = xh(h), rot = h % 4 === 0;
          return (
            <g key={h}>
              <line x1={x} x2={x} y1={Y - (rot ? 14 : 7)} y2={Y + (rot ? 14 : 7)} stroke={TEXTO_2} strokeWidth={rot ? 2.5 : 1.5} />
              {rot && <text x={x} y={Y + 46} textAnchor="middle" fontFamily={MONO} fontSize={22} fill={TEXTO_2}>{h % 24}H</text>}
            </g>
          );
        })}
        <text x={xh(14)} y={Y + 84} textAnchor="middle" fontFamily={MONO} fontSize={20} letterSpacing={2} fill={TEXTO_2}>18/11</text>
        <text x={xh(25)} y={Y + 84} textAnchor="middle" fontFamily={MONO} fontSize={20} letterSpacing={2} fill={TEXTO_2}>19/11</text>
        <line x1={xh(24)} x2={xh(24)} y1={Y - 40} y2={Y + 60} stroke={TEXTO_2} strokeDasharray="5 6" strokeWidth={1.5} />
        {/* o intervalo de 16 horas se desenhando */}
        {p > 0 && (
          <Neon filtro="neonNz" cor={LARANJA} largura={6}>
            <line x1={xNz} x2={xNz + (xBr - xNz) * p} y1={Y} y2={Y} />
          </Neon>
        )}
        <circle cx={xNz} cy={Y} r={13} fill={CIANO} opacity={nz} />
        <circle cx={xBr} cy={Y} r={13} fill={LARANJA} opacity={entre(f, M.n16, M.n16 + 6)} />
      </svg>
      <div style={{ position: "absolute", top: Y - 150, left: xNz - 30, fontFamily: MONO, opacity: nz }}>
        <div style={{ fontSize: 30, letterSpacing: 2, color: CIANO }}>NOVA ZELÂNDIA</div>
        <div style={{ fontSize: 22, letterSpacing: 2, color: TEXTO_2, marginTop: 6 }}>8H DE 18/11</div>
      </div>
      <div style={{ position: "absolute", top: Y - 150, left: xBr - 260, width: 290, textAlign: "right", fontFamily: MONO, opacity: entre(f, M.n16, M.n16 + 6) }}>
        <div style={{ fontSize: 30, letterSpacing: 2, color: LARANJA }}>BRASIL</div>
        <div style={{ fontSize: 22, letterSpacing: 2, color: TEXTO_2, marginTop: 6 }}>0H DE 19/11</div>
      </div>
      <div style={{ position: "absolute", top: Y + 140, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 21, letterSpacing: 1.5, color: TEXTO_2, opacity: entre(f, M.n16, M.n16 + 8) }}>
        O HORÁRIO VALE PELA REGIÃO DA CONTA
      </div>
    </AbsoluteFill>
  );
};

// --- cena 6: a pergunta, e a volta pro quadro 0 ------------------------------------------------
const CenaPergunta: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.pergunta - 4, FIM + 4, 8);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o }}><Download lf={f} modo="pergunta" /></AbsoluteFill>;
};

const Volta: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, FIM - 6, FIM + 4);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o, background: `rgba(5,7,12,${0.9 * o})` }}><Download lf={f - FIM} modo="volta" /></AbsoluteFill>;
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

const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/gta6/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Gta6: React.FC = () => (
  <Fundo>
    <CenaGancho />
    <CenaBits />
    <CenaCorrida />
    <CenaFusos />
    <CenaZelandia />
    <CenaPergunta />
    <Volta />
    <Fonte />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-gta6.mjs: tiques do relógio, sinos nas chegadas, whoosh nas trocas */}
    <Audio src={staticFile("ciencia/gta6/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
// Padrão das capas: rótulo mono no topo do recorte (y 300), elemento forte no meio, título Sora 400
// de 150 px com a base em y 1600, uma palavra em laranja. O elemento são as quatro barras prontas.
export const Gta6Capa: React.FC = () => (
  <Fundo>
    <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 46, letterSpacing: 6, color: TEXTO }}>GTA VI · ATÉ 212 GB</div>
    {ORDEM_V.map((id, k) => (
      <Barra key={id} y={420 + k * 120} rotulo={V[id].rotulo} p={1} fim={V[id].tempo} quente={id === "vinte"} tam={k === 1 ? 26 : 32} h={30} />
    ))}
    <div style={{ position: "absolute", top: 905, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: 3, color: TEXTO_2 }}>NO MELHOR CASO · CONTA NOSSA</div>
    <div style={{ position: "absolute", bottom: 320, left: 40, width: 1000, textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 128, lineHeight: 1.06, letterSpacing: -4, color: TEXTO, whiteSpace: "nowrap" }}>
      Quanto tempo<br />pra <span style={{ color: LARANJA, textShadow: `0 0 40px ${LARANJA}66` }}>baixar?</span>
    </div>
  </Fundo>
);
