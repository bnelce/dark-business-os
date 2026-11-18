import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Cena, Fundo, SANS, PRETO, PAPEL, CORES, ramp } from "./cena";
import { Handwrite } from "../remocn/handwrite";
import { PaperWobble } from "../remocn/paper-wobble";
import { PaperSticker } from "../remocn/paper-sticker";
import { steppedRamp } from "../remocn/stop-motion";

const D = [420, 540, 540, 540, 540];
const F = D.reduce<number[]>((a, _, i) => [...a, (a[i - 1] ?? 0) + (i ? D[i - 1] : 0)], []);
export const PILARES_TOTAL = D.reduce((a, b) => a + b, 0);

const PENSADORES = [
  { nome: "Durkheim", datas: "1858 — 1917", foto: "fotos/emile-durkheim.jpg", cor: CORES.azul,
    parte: "o todo", conceito: "FATO SOCIAL", metodo: "objetivo", soc: "um organismo vivo" },
  { nome: "Weber", datas: "1864 — 1920", foto: "fotos/max-weber.jpg", cor: CORES.rosa,
    parte: "o indivíduo", conceito: "AÇÃO SOCIAL", metodo: "compreensivo", soc: "teia de sentidos" },
  { nome: "Marx", datas: "1818 — 1883", foto: "fotos/karl-marx.jpg", cor: CORES.coral,
    parte: "o conflito", conceito: "MAIS-VALIA", metodo: "dialético", soc: "campo de luta" },
];

const Retrato: React.FC<{ src: string; d: number; x: number; y: number; at: number; seed: string }> =
({ src, d, x, y, at, seed }) => {
  const f = useCurrentFrame();
  const p = steppedRamp(f, at, at + 9);
  if (p === 0) return null;
  return (
    <div style={{ position: "absolute", left: x - d / 2, top: y - d / 2, opacity: p }}>
      <PaperWobble seed={seed} amp={1.3} rotAmp={0.26}>
        <div style={{ width: d, height: d, borderRadius: "50%", overflow: "hidden", border: `6px solid ${PRETO}`, background: "#fff", boxShadow: `7px 8px 0 ${PRETO}` }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }} />
        </div>
      </PaperWobble>
    </div>
  );
};

const Etiqueta: React.FC<{ txt: string; cor: string; at: number; x: number; y: number; t?: number }> =
({ txt, cor, at, x, y, t = 34 }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)" }}>
      <PaperSticker at={0} seed={txt} padding="11px 20px" background={cor} borderColor={PRETO}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: t, color: PRETO, whiteSpace: "nowrap" }}>{txt}</span>
      </PaperSticker>
    </div>
  );
};

const Cap: React.FC<{ txt: string; at: number; x: number; y: number; larg: number; t?: number }> =
({ txt, at, x, y, larg, t = 42 }) => (
  <div style={{ position: "absolute", left: x - larg / 2, top: y, width: larg, height: 150 }}>
    <Handwrite text={txt} delay={at} fontSize={t} color={PRETO} align="center" perStep={3.0} />
  </div>
);

const Chapeu: React.FC<{ n: number } > = ({ n }) => (
  <div style={{ position: "absolute", top: 96, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 25, color: "rgba(20,17,24,0.42)", letterSpacing: 4 }}>
    SOCIOLOGIA · OS 3 PILARES · {n}/5
  </div>
);
const Arroba: React.FC = () => (
  <div style={{ position: "absolute", bottom: 78, width: "100%", textAlign: "center", fontFamily: SANS, fontSize: 26, fontWeight: 600, color: "rgba(20,17,24,0.38)" }}>
    @revisaorapida1ano
  </div>
);

// ── 1. ABERTURA: a mesma pergunta, três respostas ──
const C1: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Chapeu n={1} />
      <div style={{ position: "absolute", top: 210, left: 0, width: "100%", height: 150 }}>
        <Handwrite text="o que move a sociedade?" delay={6} fontSize={62} color={PRETO} align="center" perStep={3.4} />
      </div>
      {PENSADORES.map((p, i) => {
        const at = 70 + i * 92;
        const y = 620 + i * 330;
        return (
          <div key={p.nome}>
            <Retrato src={p.foto} d={190} x={230} y={y} at={at} seed={p.nome} />
            <div style={{ position: "absolute", left: 380, top: y - 78, opacity: f > at + 8 ? 1 : 0 }}>
              <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 60, color: PRETO, textShadow: `4px 4px 0 ${p.cor}` }}>{p.nome}</div>
            </div>
            <Etiqueta txt={`parte ${p.parte === "o todo" ? "do" : "do"} ${p.parte.replace("o ", "")}`} cor={p.cor} at={at + 22} x={560} y={y + 34} />
          </div>
        );
      })}
      {f > 340 && (
        <div style={{ position: "absolute", bottom: 210, width: "100%", textAlign: "center", opacity: ramp(f, 340, 360) }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: PRETO, background: CORES.amarelo, padding: "12px 24px", borderRadius: 10, border: `4px solid ${PRETO}`, boxShadow: `6px 7px 0 ${PRETO}` }}>
            mesma pergunta, três respostas
          </span>
        </div>
      )}
      <Arroba />
    </>
  );
};

// ── mergulho individual, reaproveitado pelos três ──
const Mergulho: React.FC<{
  n: number; p: typeof PENSADORES[number]; itens: { et: string; cap: string; at: number }[]; prova: string;
}> = ({ n, p, itens, prova }) => {
  const f = useCurrentFrame();
  return (
    <>
      <Chapeu n={n} />
      <Retrato src={p.foto} d={230} x={540} y={330} at={4} seed={`m${p.nome}`} />
      <div style={{ position: "absolute", top: 470, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 76, color: PRETO, textShadow: `5px 5px 0 ${p.cor}`, letterSpacing: -2 }}>{p.nome}</div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 27, color: "rgba(20,17,24,0.5)", marginTop: 2 }}>{p.datas}</div>
      </div>
      {itens.map((it, i) => {
        const y = 690 + i * 250;
        return (
          <div key={it.et}>
            <Etiqueta txt={it.et} cor={p.cor} at={it.at} x={540} y={y} t={36} />
            <Cap txt={it.cap} at={it.at + 12} x={540} y={y + 34} larg={880} t={42} />
          </div>
        );
      })}
      {f > 430 && (
        <div style={{ position: "absolute", bottom: 200, width: "100%", textAlign: "center", opacity: ramp(f, 430, 452), padding: "0 70px" }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: PRETO, background: CORES.amarelo, padding: "12px 22px", borderRadius: 10, border: `4px solid ${PRETO}`, boxShadow: `6px 7px 0 ${PRETO}`, display: "inline-block", lineHeight: 1.25 }}>
            {prova}
          </span>
        </div>
      )}
      <Arroba />
    </>
  );
};

// ── 5. COMPARATIVO FINAL ──
const LINHAS = [
  { rot: "parte de", campo: "parte" as const },
  { rot: "conceito-chave", campo: "conceito" as const },
  { rot: "método", campo: "metodo" as const },
  { rot: "a sociedade é", campo: "soc" as const },
];

const C5: React.FC = () => {
  const f = useCurrentFrame();
  const COLX = [232, 540, 848];
  return (
    <>
      <Chapeu n={5} />
      <div style={{ position: "absolute", top: 190, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 62, color: PRETO, textShadow: `5px 5px 0 ${CORES.amarelo}`, letterSpacing: -2 }}>
          NA PROVA, COMPARE ASSIM
        </div>
      </div>
      {PENSADORES.map((p, i) => (
        <div key={p.nome}>
          <Retrato src={p.foto} d={124} x={COLX[i]} y={400} at={10 + i * 10} seed={`c${p.nome}`} />
          <div style={{ position: "absolute", left: COLX[i], top: 486, transform: "translateX(-50%)", fontFamily: SANS, fontWeight: 800, fontSize: 34, color: PRETO, textShadow: `3px 3px 0 ${p.cor}` }}>
            {p.nome}
          </div>
        </div>
      ))}
      {LINHAS.map((l, li) => {
        const y = 620 + li * 200;
        const at = 70 + li * 78;
        const vis = ramp(f, at, at + 14);
        if (vis === 0) return null;
        return (
          <div key={l.rot} style={{ opacity: vis }}>
            <div style={{ position: "absolute", left: 0, top: y, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 27, color: "rgba(20,17,24,0.5)", letterSpacing: 2 }}>
              {l.rot.toUpperCase()}
            </div>
            <div style={{ position: "absolute", left: 90, top: y + 40, width: 900, height: 4, background: "rgba(20,17,24,0.15)" }} />
            {PENSADORES.map((p, i) => (
              <div key={p.nome} style={{
                position: "absolute", left: COLX[i], top: y + 100, transform: "translate(-50%,-50%)",
                width: 292, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 28,
                color: PRETO, lineHeight: 1.12,
              }}>
                <span style={{ background: p.cor, padding: "8px 12px", borderRadius: 8, border: `3px solid ${PRETO}`, display: "inline-block", maxWidth: 268, whiteSpace: "normal" }}>
                  {p[l.campo]}
                </span>
              </div>
            ))}
          </div>
        );
      })}
      {f > 430 && (
        <div style={{ position: "absolute", bottom: 190, width: "100%", textAlign: "center", opacity: ramp(f, 430, 452) }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, color: PRETO, background: "#FFFDF6", padding: "14px 28px", borderRadius: 10, border: `4px solid ${PRETO}`, boxShadow: `6px 7px 0 ${PRETO}` }}>
            salva esse comparativo 📌
          </span>
        </div>
      )}
      <Arroba />
    </>
  );
};

export const PilaresAula: React.FC = () => (
  <AbsoluteFill style={{ background: PAPEL, overflow: "hidden" }}>
    <Fundo total={PILARES_TOTAL} />
    <Cena from={F[0]} dur={D[0]}><C1 /></Cena>
    <Cena from={F[1]} dur={D[1]}>
      <Mergulho n={2} p={PENSADORES[0]} prova={"suicídio, anomia e solidariedade\ncaem sempre com ele"} itens={[
        { et: "FATO SOCIAL", cap: "existe fora de você\ne te obriga", at: 60 },
        { et: "COESÃO SOCIAL", cap: "o que mantém\na sociedade inteira", at: 190 },
        { et: "ANOMIA", cap: "quando as regras somem\ne a coesão quebra", at: 320 },
      ]} />
    </Cena>
    <Cena from={F[2]} dur={D[2]}>
      <Mergulho n={3} p={PENSADORES[1]} prova={"ética protestante e burocracia\nsão o recorte preferido da prova"} itens={[
        { et: "AÇÃO SOCIAL", cap: "conduta com sentido,\norientada pelo outro", at: 60 },
        { et: "TIPO IDEAL", cap: "um modelo pra comparar,\nnão a realidade", at: 190 },
        { et: "RACIONALIZAÇÃO", cap: "o mundo vira cálculo,\nregra e burocracia", at: 320 },
      ]} />
    </Cena>
    <Cena from={F[3]} dur={D[3]}>
      <Mergulho n={4} p={PENSADORES[2]} prova={"mais-valia e alienação\nsão o par mais cobrado"} itens={[
        { et: "MATERIALISMO HISTÓRICO", cap: "a base material\nexplica as ideias", at: 60 },
        { et: "LUTA DE CLASSES", cap: "burguesia e proletariado\nem conflito permanente", at: 190 },
        { et: "MAIS-VALIA", cap: "o lucro vem do\ntrabalho não pago", at: 320 },
      ]} />
    </Cena>
    <Cena from={F[4]} dur={D[4]}><C5 /></Cena>
  </AbsoluteFill>
);
