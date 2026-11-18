import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import T from "./site-eleicoes-tempos.json";
import { Destaque, Fundo, Manchete, entre } from "./base";
import { CIANO, LARANJA, MONO, SORA, TEXTO, TEXTO_2 } from "./tokens";

// Divulgação do eleicoes.a2lo.dev com prints reais do site (versão de celular, 390 px a 3x,
// capturados da versão local; origem em negocios/.../site-eleicoes-empate-2026-11-02/README.md).
// O gancho é o empate exato de Marquinho (PR), 1.530 a 1.530; depois as cinco cidades decididas
// por um voto, o mapa, a busca e a distância do Brasil. O fim volta ao enquadramento do quadro 0.
//
// A câmera anda dentro de cada print: `de`/`para` são o ponto do print (em px do print, 1170 de
// largura) que fica no centro da tela e a escala. Os instantes vêm da voz, por em(fala, palavra).

export const SITE_ELEICOES_TOTAL = T.total;
const F = T.fala as Record<string, number>;
const PAL = T.palavras as Record<string, { w: string; f: number }[]>;
const norm = (w: string) => w.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
const em = (id: string, palavra: string, n = 1) => {
  const achadas = PAL[id].filter((p) => norm(p.w) === norm(palavra));
  if (achadas.length < n) throw new Error(`"${palavra}" não aparece ${n}× na fala ${id}`);
  return achadas[n - 1].f;
};

// Janela do print na tela: quadrada, linha fina ciano, sem canto arredondado.
const VX = 60, VY = 340, VW = 960, VH = 1030;
const PAPEL = "#f2f0eb";
const FADE = 8;

type Cam = { cx: number; cy: number; s: number };
type Plano = { img: string; de: number; ate: number; a: Cam; b: Cam; digita?: [number, number] };

const P = (n: string) => `ciencia/site-eleicoes/prints/${n}.png`;
const CIDADES = ["04-altamira-do-parana", "04-anhanguera", "04-apiaca", "04-nova-luzitania", "04-sao-joao-do-pau-dalho"];
const ABRE: Cam = { cx: 585, cy: 1300, s: 0.9 };

const PLANOS: Plano[] = (() => {
  const v = F["um-voto"], dv = (F.pergunta - v) / CIDADES.length;
  const digita = em("site", "Digita"), lista = em("site", "cidade"), ganhou = em("site", "ganhou,");
  return [
    { img: P("03-marquinho-topo"), de: 0, ate: F.cidade, a: ABRE, b: { cx: 585, cy: 1290, s: 0.85 } },
    { img: P("03-marquinho-topo"), de: F.cidade, ate: em("cidade", "Paraná.") + 10, a: { cx: 585, cy: 1290, s: 0.85 }, b: { cx: 585, cy: 1000, s: 0.8 } },
    ...CIDADES.map((c, i) => ({
      img: P(c), de: Math.round(v + i * dv), ate: Math.round(v + (i + 1) * dv),
      a: { cx: 585, cy: 1100, s: 0.72 }, b: { cx: 585, cy: 1120, s: 0.76 },
    })),
    { img: P("01-home-topo"), de: F.pergunta, ate: F.site, a: { cx: 585, cy: 760, s: 0.82 }, b: { cx: 585, cy: 800, s: 0.86 } },
    { img: P("06-home-mapa"), de: F.site, ate: digita, a: { cx: 585, cy: 760, s: 0.82 }, b: { cx: 585, cy: 1300, s: 0.8 } },
    { img: P("01-home-topo"), de: digita, ate: lista, a: { cx: 585, cy: 1150, s: 0.84 }, b: { cx: 585, cy: 1170, s: 0.88 }, digita: [digita + 4, lista - 2] },
    { img: P("02-busca-marquinho"), de: lista, ate: ganhou, a: { cx: 585, cy: 1170, s: 0.88 }, b: { cx: 585, cy: 1200, s: 0.88 } },
    { img: P("03-marquinho-topo"), de: ganhou, ate: em("site", "Brasil."), a: { cx: 585, cy: 1330, s: 0.84 }, b: { cx: 585, cy: 1880, s: 0.82 } },
    { img: P("03-marquinho-topo"), de: F.fecho, ate: T.total, a: { cx: 585, cy: 1290, s: 0.86 }, b: ABRE },
  ];
})();

/** Campo de busca do 01-home-topo, em px do print: tampa o placeholder e digita o nome. */
const Digitacao: React.FC<{ de: number; ate: number }> = ({ de, ate }) => {
  const f = useCurrentFrame();
  const NOME = "Marquinho";
  const n = Math.round(NOME.length * entre(f, de, ate));
  const cursor = Math.floor(f / 8) % 2 === 0;
  return (
    <>
      <div style={{ position: "absolute", left: 196, top: 1224, width: 900, height: 122, background: "#fff" }} />
      <div style={{ position: "absolute", left: 209, top: 1250, fontFamily: MONO, fontSize: 46, color: "#0e0e0e", whiteSpace: "pre" }}>
        {NOME.slice(0, n)}<span style={{ opacity: cursor ? 1 : 0 }}>|</span>
      </div>
    </>
  );
};

const Tela: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{
      position: "absolute", left: VX, top: VY, width: VW, height: VH, overflow: "hidden", background: PAPEL,
      outline: `2px solid ${CIANO}`, outlineOffset: 0, boxShadow: `0 0 46px rgba(92,225,255,0.28)`,
    }}>
      {PLANOS.map((p, k) => {
        const proximo = PLANOS[k + 1];
        if (f < p.de - (k ? FADE : 0) || (proximo && f >= proximo.de + FADE)) return null;
        const o = k === 0 ? 1 : entre(f, p.de - FADE, p.de);
        const t = entre(f, p.de, p.ate, Easing.inOut(Easing.cubic));
        const cx = p.a.cx + (p.b.cx - p.a.cx) * t, cy = p.a.cy + (p.b.cy - p.a.cy) * t, s = p.a.s + (p.b.s - p.a.s) * t;
        return (
          <div key={k} style={{
            position: "absolute", left: 0, top: 0, width: 1170, height: 2532, opacity: o, transformOrigin: "0 0",
            transform: `translate(${VW / 2 - cx * s}px, ${VH / 2 - cy * s}px) scale(${s})`,
          }}>
            <Img src={staticFile(p.img)} style={{ width: 1170, height: 2532, display: "block" }} />
            {p.digita && <Digitacao de={p.digita[0]} ate={p.digita[1]} />}
          </div>
        );
      })}
    </div>
  );
};

type Bloco = { de: number; ate: number; partes: { t: string; chave: boolean }[] };
const Legenda: React.FC = () => {
  const f = useCurrentFrame();
  const bloco = (T.legendas as Bloco[]).find((l) => f >= l.de && f < l.ate);
  if (!bloco) return null;
  const s = bloco.de <= 0 ? 1 : 0.86 + 0.14 * spring({ frame: f - bloco.de, fps: 30, config: { damping: 12, stiffness: 260 } });
  return (
    <div style={{
      position: "absolute", top: 1420, left: 90, width: 900, textAlign: "center",
      fontFamily: SORA, fontWeight: 400, fontSize: 66, lineHeight: 1.12, letterSpacing: -0.5, color: TEXTO,
      textShadow: "0 0 24px rgba(5,7,12,0.95), 0 3px 6px rgba(0,0,0,0.9)", scale: `${s}`,
    }}>
      {bloco.partes.map((p, i) => <span key={i} style={{ color: p.chave ? LARANJA : TEXTO }}>{i ? " " : ""}{p.t}</span>)}
    </div>
  );
};

const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/site-eleicoes/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

const Rodape: React.FC = () => (
  <div style={{ position: "absolute", top: 1690, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2 }}>
    FONTE: TSE · 2º TURNO DE 2026 · PRINTS DE ELEICOES.A2LO.DEV
  </div>
);

export const SiteEleicoes: React.FC<{ capa?: boolean }> = ({ capa }) => (
  <Fundo>
    <Tela />
    <Manchete de={-10} ate={F.cidade - 4}>Empate:{"\n"}<Destaque cor={LARANJA}>1.530 × 1.530</Destaque></Manchete>
    <Manchete de={F.cidade} ate={F["um-voto"] - 4}>Marquinho (PR):{"\n"}<Destaque>nenhum voto de diferença.</Destaque></Manchete>
    <Manchete de={F["um-voto"]} ate={F.pergunta - 4}>5 cidades decididas{"\n"}<Destaque>por 1 voto.</Destaque></Manchete>
    <Manchete de={F.pergunta} ate={F.site - 4}>E a sua{"\n"}<Destaque>cidade?</Destaque></Manchete>
    <Manchete de={F.site} ate={em("site", "Digita") - 4}>5.571 municípios{"\n"}<Destaque>num mapa só.</Destaque></Manchete>
    <Manchete de={em("site", "Digita")} ate={F.fecho - 4}>Busca a sua cidade{"\n"}<Destaque>pelo nome.</Destaque></Manchete>
    <Manchete de={F.fecho} ate={T.total + 20}>Acesse:{"\n"}<Destaque>eleicoes.a2lo.dev</Destaque></Manchete>
    {!capa && <Legenda />}
    <Rodape />
    {!capa && <Narracao />}
    {/* scripts/gerar-trilha-narrada.mjs: por baixo da voz, como nos outros reels de dados */}
    {!capa && <Audio src={staticFile("ciencia/trilha-site-eleicoes.mp3")} volume={0.22} />}
  </Fundo>
);

export const SiteEleicoesCapa: React.FC = () => (
  <AbsoluteFill><SiteEleicoes capa /></AbsoluteFill>
);
