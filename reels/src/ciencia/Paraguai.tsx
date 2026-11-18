import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import D from "./paraguai.json";
import T from "./paraguai-tempos.json";
import { Fundo, X0, X1, entre, janela } from "./base";
import { CIANO, FUNDO, LARANJA, MONO, SORA, TEXTO, TEXTO_2, br } from "./tokens";
import { Cadeado, FiltroNeon, Neon, traco } from "./ilustra-dolar";
import { AssinaturaCta } from "./marca";

// O Ueno Bank no Paraguai (9/11/2026). Começa pela consequência pra quem é cliente e só depois mostra o
// tamanho (preferencias.md, "Dado não é o assunto").
//   trava      a torre com a marca do Ueno em Assunção (foto CC0); o app, o cartão e a agência param
//   tamanho    clientes × habitantes na mesma régua; US$ 2,8 bi, e a grade de 100 com 9 acesas
//   resolucao  o selo do BCP; o índice de solvência abaixo da metade do mínimo; 2/11 aprovada, 3/11 comunicada
//   garantia   100 clientes, 97 com o saldo todo coberto (estimativa do BCP)
//   virada     o mesmo dinheiro em valor: só 30% dentro do limite (Moody's); o resto em contas grandes
//   senado     o Congresso (foto CC0), os 4 dias, 44 a 0; a ligação de Peña com o grupo
//   defesa     acusação e defesa em dois cartões iguais; "nega ter interferido"
//   pergunta   volta pra torre; o fim emenda no quadro 0
//
// Imagens em public/ciencia/paraguai/img/ (originais em baixados/; licenças em public/ciencia/fotos-origem.md).
// Números: paraguai.json (scripts/gerar-paraguai.mjs). Tempos: paraguai-tempos.json (scripts/tempos-paraguai.mjs).
// Editorial: política de outro país, só fatos e atribuição; acusação e defesa com o mesmo peso visual
// (mesmo tamanho, mesma cor). Cliente não é pessoa única: nada de "metade do país". US$ 2,8 bi
// (depósitos) e US$ 355 mi (IPS) nunca aparecem como comparação.

export const PARAGUAI_TOTAL = T.total;
const F = T.fala;
const M = T.m;
const C = T.cena;
const FT = D.fatos;
const FIM = T.fim;
const G0 = T.grande[0].f;

const CONTORNO = { stroke: FUNDO, strokeWidth: 8, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
const mola = (f: number, de: number, config = { damping: 14, stiffness: 140 }) => (f < de ? 0 : spring({ frame: f - de, fps: 30, config }));
const io = Easing.inOut(Easing.cubic);
const saida = Easing.out(Easing.cubic);
const img = (n: string) => staticFile(`ciencia/paraguai/img/${n}`);
const SOMBRA_TXT = "0 0 14px rgba(5,7,12,1), 0 0 6px rgba(5,7,12,1), 0 2px 4px rgba(0,0,0,0.9)";

/** Quanto uma cena está visível: entra e sai com fusão curta. */
const visivel = (f: number, de: number, ate: number, fade = 6) => (f < de - fade || f >= ate + fade ? 0 : Math.min(entre(f, de - fade, de), 1 - entre(f, ate, ate + fade)));

// --- peças comuns ---------------------------------------------------------------------------------

/** Foto de tela inteira (recorte 1215×2160) com zoom lento de câmera. */
const Foto: React.FC<{ src: string; s: number; origem?: string; filtro?: string; top?: number }> = ({ src, s, origem = "50% 50%", filtro, top = -120 }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <Img src={img(src)} style={{ position: "absolute", left: -67.5, top, width: 1215, height: 2160, scale: `${s}`, transformOrigin: origem, filter: filtro }} />
  </AbsoluteFill>
);

/** Escurece o alto e a base da foto, pra o texto ler em cima de qualquer imagem. */
const Sombras: React.FC<{ o?: number; meio?: number }> = ({ o = 1, meio = 0 }) => (
  <AbsoluteFill style={{
    opacity: o,
    background: `linear-gradient(180deg, rgba(5,7,12,0.92) 0px, rgba(5,7,12,0.55) 430px, rgba(5,7,12,${meio}) 640px, rgba(5,7,12,${meio}) 1060px, rgba(5,7,12,0.75) 1240px, rgba(5,7,12,0.95) 1700px)`,
  }} />
);

const Credito: React.FC<{ texto: string; o: number }> = ({ texto, o }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top: 262, width: "100%", textAlign: "center", opacity: o, fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: TEXTO_2, textShadow: SOMBRA_TXT }}>{texto}</div>
  );

const Etiqueta: React.FC<{ texto: string; o: number; cor?: string; top?: number }> = ({ texto, o, cor = TEXTO, top = 318 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: 60, width: 960, textAlign: "center", opacity: o, fontFamily: MONO, fontSize: 32, letterSpacing: 3, color: cor, textShadow: SOMBRA_TXT, whiteSpace: "pre-line", lineHeight: 1.35 }}>{texto}</div>
  );

const Heroi: React.FC<{ o: number; children: React.ReactNode; top?: number }> = ({ o, children, top = 1172 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", top, left: X0, width: 820, opacity: o, fontFamily: MONO, color: TEXTO, textAlign: "center" }}>{children}</div>
  );

const Grande: React.FC<{ tam?: number; cor?: string; children: React.ReactNode }> = ({ tam = 112, cor = LARANJA, children }) => (
  <div style={{ fontSize: tam, lineHeight: 1.04, color: cor, letterSpacing: -2, textShadow: `0 0 30px ${cor}55, ${SOMBRA_TXT}`, whiteSpace: "nowrap" }}>{children}</div>
);

const Rotulo: React.FC<{ children: React.ReactNode; cor?: string; tam?: number }> = ({ children, cor = TEXTO, tam = 25 }) => (
  <div style={{ fontSize: tam, letterSpacing: 3, color: cor, marginTop: 10, lineHeight: 1.45, whiteSpace: "pre-line", textShadow: SOMBRA_TXT }}>{children}</div>
);

/** Marca sobre o chip neutro (#E8F4FF), sem recolorir nem distorcer. */
const Chip: React.FC<{ src: string; o: number; x: number; y: number; altura: number; pad?: number; s?: number }> = ({ src, o, x, y, altura, pad = 16, s = 1 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, translate: "-50% 0", opacity: o, scale: `${s}`, background: TEXTO, padding: `${pad}px ${pad * 1.6}px`, borderRadius: 3, boxShadow: `0 0 28px ${CIANO}33` }}>
      <Img src={img(src)} style={{ height: altura, display: "block" }} />
    </div>
  );

// --- 1. a torre: o app, o cartão e a agência param (e o fim, que volta pra cá) --------------------------
const LOGO_UENO_W = (1315 / 200) * 44; // ueno-logo.png é 1315×200; no chip, 44 px de altura

/** Celular com o app que não abre: a roda de carregar quebra e vira um X. */
const Celular: React.FC<{ p: number; x: number }> = ({ p, x }) => (
  <g>
    <rect x={-44} y={-78} width={88} height={156} rx={10} {...traco(p)} />
    <line x1={-12} x2={12} y1={-66} y2={-66} {...traco(p)} />
    <circle cx={0} cy={60} r={6} {...traco(p)} />
    <g opacity={x} stroke={LARANJA} strokeWidth={5}>
      <line x1={-18} y1={-18} x2={18} y2={18} />
      <line x1={18} y1={-18} x2={-18} y2={18} />
    </g>
    <path d="M0,-30 A30,30 0 1 1 -26,-15" opacity={1 - x} {...traco(p)} />
  </g>
);

/** Cartão com o carimbo de recusa. */
const Cartao: React.FC<{ p: number; x: number }> = ({ p, x }) => (
  <g>
    <rect x={-72} y={-46} width={144} height={92} rx={8} {...traco(p)} />
    <line x1={-72} x2={72} y1={-20} y2={-20} {...traco(p)} />
    <rect x={-56} y={0} width={26} height={20} rx={3} {...traco(p)} />
    <line x1={-14} x2={50} y1={28} y2={28} {...traco(p)} />
    {x > 0 && (
      <g opacity={x} transform={`rotate(-12) scale(${1.25 - 0.25 * x})`}>
        <rect x={-74} y={-20} width={148} height={40} stroke={LARANJA} strokeWidth={4} fill="rgba(5,7,12,0.85)" />
        <text x={0} y={10} textAnchor="middle" fill={LARANJA} stroke="none" fontFamily={MONO} fontSize={26} letterSpacing={2}>RECUSADO</text>
      </g>
    )}
  </g>
);

/** A porta da agência, com o cadeado fechando. */
const Porta: React.FC<{ p: number; x: number }> = ({ p, x }) => (
  <g>
    <rect x={-50} y={-74} width={100} height={148} {...traco(p)} />
    <line x1={0} x2={0} y1={-74} y2={74} {...traco(p)} />
    <line x1={-64} x2={64} y1={74} y2={74} {...traco(p)} />
    <g transform={`translate(0 ${-6 + (1 - x) * -30})`} opacity={x} stroke={LARANJA}><Cadeado p={1} abre={0} /></g>
  </g>
);

const ICONES_Y = 760;

const Torre: React.FC = () => {
  const f = useCurrentFrame();
  const noFim = f >= FIM;
  const naPergunta = f >= C.pergunta.de - 6;
  const o = noFim ? 1 : Math.max(visivel(f, 0, C.torre.ate, 6), visivel(f, C.pergunta.de, FIM + 6, 6));
  if (o <= 0) return null;
  // câmera: zoom lento na marca do Ueno; na pergunta, mais lento e escuro; no fim, volta ao estado do
  // quadro 0 (zoom 1, mais claro, celular desenhado até onde estava no quadro 0), pro loop emendar
  const volta = entre(f, FIM, FIM + 12, io);
  const sPerg = (q: number) => 1.06 + 0.05 * entre(q, C.pergunta.de, FIM);
  const s = noFim ? sPerg(FIM) + (1 - sPerg(FIM)) * volta : naPergunta ? sPerg(f) : 1 + 0.12 * entre(f, 0, C.torre.ate);
  const escuro = noFim ? 0.5 + 0.24 * volta : naPergunta ? 0.5 : 0.74;
  // o celular já está na tela no quadro 0, quebrando; o cartão e a porta entram com a voz
  const P0 = entre(0, -14, 6);
  const pCel = noFim ? P0 * volta : entre(f, -14, 6);
  const xCel = noFim ? 0 : entre(f, M.app + 6, M.app + 14);
  const pCar = noFim ? 0 : entre(f, M.cartao - 6, M.cartao + 8);
  const xCar = noFim ? 0 : entre(f, M.cartao + 10, M.cartao + 16, saida);
  const pPor = noFim ? 0 : entre(f, M.agencia - 6, M.agencia + 8);
  const xPor = noFim ? 0 : entre(f, M.agencia + 10, M.agencia + 18, saida);
  const icones = noFim ? volta : naPergunta ? 0 : 1 - entre(f, C.torre.ate - 8, C.torre.ate);
  const num = noFim ? 1 : 1 + 0.08 * Math.sin(Math.PI * entre(f, M.milhoes - 2, M.milhoes + 10));
  const logo = 1;
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, o) }}>
      <Foto src="asuncion-ueno.jpg" s={s} origem="79% 28%" top={60} filtro={`brightness(${escuro}) saturate(0.85)`} />
      <Sombras meio={0.1} />
      <Credito texto="FOTO: CMASI · CC0 · ASSUNÇÃO, 2024" o={1} />
      <Etiqueta texto="PARAGUAI · NOVEMBRO DE 2026" o={1} />
      <Chip src="ueno-logo.png" o={logo} x={540} y={392} altura={44} />
      {icones > 0 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: icones }}>
          <defs><FiltroNeon id="neonT" /></defs>
          <g transform={`translate(250 ${ICONES_Y})`}><Neon filtro="neonT" largura={3.5}><Celular p={pCel} x={xCel} /></Neon></g>
          <g transform={`translate(540 ${ICONES_Y})`} opacity={pCar > 0 ? 1 : 0}><Neon filtro="neonT" largura={3.5}><Cartao p={pCar} x={xCar} /></Neon></g>
          <g transform={`translate(830 ${ICONES_Y})`} opacity={pPor > 0 ? 1 : 0}><Neon filtro="neonT" largura={3.5}><Porta p={pPor} x={xPor} /></Neon></g>
          {[["APP", 250, pCel], ["CARTÃO", 540, pCar], ["AGÊNCIA", 830, pPor]].map(([t, x, v]) => (
            <text key={t as string} x={x as number} y={ICONES_Y + 128} textAnchor="middle" fill={TEXTO} opacity={v as number} fontFamily={MONO} fontSize={26} letterSpacing={3} {...CONTORNO}>{t as string}</text>
          ))}
        </svg>
      )}
      <Heroi o={noFim ? volta : naPergunta ? 0 : 1} top={1000}>
        <div style={{ scale: `${num}` }}><Grande tam={104}>QUASE 3 MILHÕES</Grande></div>
        <Rotulo>{"DE CLIENTES SEM ACESSO À CONTA\nNÚMERO DO BANCO, JUN/2026"}</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- 2. clientes × habitantes, e o dinheiro ---------------------------------------------------------------
const BW = X1 - X0; // 810 px = 6,46 mi de habitantes

const Pessoas: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.pessoas.de, C.pessoas.ate, 6);
  if (o <= 0) return null;
  const pop = entre(f, M.pais - 4, M.m65 + 6, io);
  const cli = entre(f, M.m65 - 2, M.pessoas + 2, io);
  const logo = mola(f, C.pessoas.de - 2);
  const wCli = (FT.clientes / D.ine.pop2026) * BW;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Credito texto="DADOS: INE PARAGUAI (PROJEÇÃO, REVISÃO 2024) · UENO BANK" o={1} />
      <Etiqueta texto="NA MESMA RÉGUA" o={1} />
      <Chip src="ueno-logo.png" o={Math.min(1, logo * 1.3)} s={0.9 + 0.1 * logo} x={540} y={392} altura={44} />
      <div style={{ position: "absolute", top: 560, left: X0, width: BW, fontFamily: MONO }}>
        <div style={{ fontSize: 28, letterSpacing: 3, color: TEXTO, opacity: entre(f, C.pessoas.de, C.pessoas.de + 8) }}>HABITANTES DO PARAGUAI</div>
        <div style={{ marginTop: 14, height: 70, width: BW, border: `1.5px solid ${TEXTO_2}55`, opacity: entre(f, C.pessoas.de, C.pessoas.de + 8) }}>
          <div style={{ height: "100%", width: BW * pop, background: TEXTO_2, opacity: 0.85 }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 52, color: TEXTO, opacity: pop }}>{br((D.ine.pop2026 / 1e6) * pop, 2)} MI</div>
        <div style={{ fontSize: 22, letterSpacing: 3, color: TEXTO_2, opacity: pop }}>PROJEÇÃO DO INE PARA 2026</div>

        <div style={{ marginTop: 56, fontSize: 28, letterSpacing: 3, color: CIANO, opacity: entre(f, C.pessoas.de + 4, C.pessoas.de + 12) }}>CLIENTES DO UENO</div>
        <div style={{ marginTop: 14, height: 70, width: BW, border: `1.5px solid ${TEXTO_2}55`, opacity: entre(f, C.pessoas.de + 4, C.pessoas.de + 12) }}>
          <div style={{ height: "100%", width: wCli * cli, background: CIANO, boxShadow: `0 0 26px ${CIANO}66` }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 52, color: CIANO, opacity: cli }}>{br((FT.clientes / 1e6) * cli, 2)} MI</div>
        <div style={{ fontSize: 22, letterSpacing: 3, color: TEXTO_2, opacity: cli, lineHeight: 1.5 }}>NÚMERO DO BANCO, JUN/2026{"\n"}</div>
        <div style={{ fontSize: 22, letterSpacing: 3, color: TEXTO_2, opacity: cli, lineHeight: 1.5 }}>CLIENTE NÃO É PESSOA ÚNICA: O BANCO</div>
        <div style={{ fontSize: 22, letterSpacing: 3, color: TEXTO_2, opacity: cli, lineHeight: 1.5 }}>NÃO DIZ QUANTOS SÃO EMPRESAS</div>
      </div>
    </AbsoluteFill>
  );
};

const GRADE = { lado: 38, gap: 8, x: 540 - (10 * 38 + 9 * 8) / 2, y: 640 };

const Deposito: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.deposito.de, C.deposito.ate, 6);
  if (o <= 0) return null;
  const c = T.contas.find((x) => x.id === "c28")!;
  const n = entre(f, c.de, c.ate, saida);
  const num = mola(f, M.b28 - 2, { damping: 12, stiffness: 200 });
  const grade = entre(f, M.b28 + 16, M.um - 4);
  const fatia = FT.fatiaDepositos;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Credito texto="DADOS: BLOOMBERG (DEPÓSITOS) · MOODY'S (FATIA, SET/2026)" o={1} />
      <Etiqueta texto="O QUE O UENO GUARDAVA" o={1} />
      <div style={{ position: "absolute", top: 420, width: "100%", textAlign: "center", fontFamily: MONO, opacity: Math.min(1, num * 1.3), scale: `${0.85 + 0.15 * num}` }}>
        <Grande tam={120} cor={TEXTO}>US$ {br((FT.depositosUsd / 1e9) * n, 1)} BI</Grande>
        <Rotulo>EM DEPÓSITOS</Rotulo>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><FiltroNeon id="neonD" desvio={4} /></defs>
        {Array.from({ length: 100 }, (_, k) => {
          const col = k % 10, lin = Math.floor(k / 10);
          const x = GRADE.x + col * (GRADE.lado + GRADE.gap), y = GRADE.y + lin * (GRADE.lado + GRADE.gap);
          const aparece = entre(grade, k / 140, k / 140 + 0.3);
          const ehUeno = k < fatia;
          const acende = ehUeno ? entre(f, M.um - 4 + k * 3, M.um + k * 3) : 0;
          return (
            <g key={k} opacity={aparece}>
              <rect x={x} y={y} width={GRADE.lado} height={GRADE.lado} fill="none" stroke={TEXTO_2} strokeOpacity={0.6} strokeWidth={1.5} />
              {acende > 0 && <rect x={x} y={y} width={GRADE.lado} height={GRADE.lado} fill={LARANJA} opacity={acende} filter={k === 0 ? undefined : undefined} />}
            </g>
          );
        })}
      </svg>
      <Heroi o={entre(f, M.dez - 4, M.dez + 4)} top={1110}>
        <Rotulo cor={LARANJA} tam={30}>{`${fatia}% DOS DEPÓSITOS DE TODOS\nOS BANCOS DO PAÍS`}</Rotulo>
        <Rotulo cor={TEXTO_2} tam={22}>{`MOODY'S, SET/2026 · NA FIX (DADOS DO BCP): ${br(D.fix.depositosDez2025, 1)}% EM DEZ/2025`}</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- 3. a resolução: o BCP e a solvência -------------------------------------------------------------------
const SX = (v: number) => X0 + (v / 14) * BW; // eixo de 0 a 14%

const Resolucao: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.resolucao.de, C.resolucao.ate, 6);
  if (o <= 0) return null;
  const selo = mola(f, C.resolucao.de - 2);
  const d1 = entre(f, M.novembro - 4, M.novembro + 4);
  const d2 = entre(f, M.resolucao + 4, M.resolucao + 12);
  const eixo = entre(f, M.capital - 8, M.capital);
  const barra = entre(f, M.capital, M.metade, io);
  const metade = entre(f, M.metade - 2, M.metade + 6);
  const y = 1000;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Credito texto="LOGO: BCP · SOLVÊNCIA: PERFIL, 3/11/2026" o={1} />
      <Etiqueta texto="BANCO CENTRAL DO PARAGUAI" o={1} />
      <Chip src="bcp-logo.png" o={Math.min(1, selo * 1.3)} s={0.85 + 0.15 * selo} x={540} y={392} altura={150} pad={10} />
      <div style={{ position: "absolute", top: 620, left: X0, width: BW, fontFamily: MONO, fontSize: 28, letterSpacing: 2, color: TEXTO, lineHeight: 1.6 }}>
        <div style={{ opacity: d1 }}><span style={{ color: LARANJA }}>2/11</span> · RESOLUÇÃO APROVADA PELA DIRETORIA</div>
        <div style={{ opacity: d2 }}><span style={{ color: LARANJA }}>3/11</span> · RESOLUÇÃO COMUNICADA</div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: eixo }}>
        <text x={X0} y={y - 150} fill={TEXTO} fontFamily={MONO} fontSize={26} letterSpacing={3}>ÍNDICE DE SOLVÊNCIA DO UENO</text>
        <line x1={X0} x2={X1} y1={y + 60} y2={y + 60} stroke={TEXTO_2} strokeWidth={2} />
        {[0, 2, 4, 6, 8, 10, 12, 14].map((v) => (
          <g key={v}>
            <line x1={SX(v)} x2={SX(v)} y1={y + 60} y2={y + 70} stroke={TEXTO_2} strokeWidth={2} />
            <text x={SX(v)} y={y + 100} textAnchor="middle" fill={TEXTO_2} fontFamily={MONO} fontSize={22}>{v}%</text>
          </g>
        ))}
        <rect x={X0} y={y - 40} width={SX(FT.solvencia * barra) - X0} height={80} fill={CIANO} opacity={0.9} />
        <line x1={SX(FT.solvenciaMinima)} x2={SX(FT.solvenciaMinima)} y1={y - 70} y2={y + 60} stroke={TEXTO} strokeWidth={3} />
        <text x={SX(FT.solvenciaMinima)} y={y - 80} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={24} letterSpacing={2}>MÍNIMO {FT.solvenciaMinima}%</text>
        <g opacity={metade}>
          <line x1={SX(FT.solvenciaMinima / 2)} x2={SX(FT.solvenciaMinima / 2)} y1={y - 70} y2={y + 60} stroke={LARANJA} strokeWidth={3} strokeDasharray="10 8" />
          <text x={SX(FT.solvenciaMinima / 2)} y={y - 80} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={24} letterSpacing={2}>METADE</text>
        </g>
        <text x={SX(FT.solvencia * barra) + 14} y={y + 12} fill={CIANO} fontFamily={MONO} fontSize={34} opacity={barra} {...CONTORNO}>{br(FT.solvencia * barra, 2)}%</text>
      </svg>
    </AbsoluteFill>
  );
};

// --- 4. cobertura: 97% dos clientes × 30% do dinheiro ------------------------------------------------------
const PESSOAS = { r: 15, passo: 44, x: 540 - 4.5 * 44, y: 500 };

const Cobertura: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.cobertura.de, C.cobertura.ate, 6);
  if (o <= 0) return null;
  const fasePessoas = 1 - entre(f, M.mas - 2, M.mas + 10);
  const faseDinheiro = entre(f, M.mas + 2, M.mas + 14);
  const c97 = T.contas.find((x) => x.id === "c97")!;
  const c30 = T.contas.find((x) => x.id === "c30")!;
  const n97 = entre(f, c97.de, c97.ate, saida);
  const n30 = entre(f, c30.de, c30.ate, saida);
  const surge = entre(f, C.cobertura.de, M.limite);
  const limite = entre(f, M.limite - 4, M.limite + 6);
  const cobre = entre(f, M.saldo - 4, M.p97 + 10);
  const grande = entre(f, M.grandes - 4, M.grandes + 8);
  const ips = entre(f, M.previdencia - 4, M.previdencia + 6);
  const yC = 640, yD = 900; // barras: clientes e dinheiro
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Credito texto={faseDinheiro > 0.5 ? "MOODY'S · VALOR DOS DEPÓSITOS DO UENO, AGO/2026" : "FUNDO DE GARANTIA DE DEPÓSITOS · ESTIMATIVA DO BCP"} o={1} />
      <Etiqueta texto={faseDinheiro > 0.5 ? "OS MESMOS CLIENTES, EM DINHEIRO" : "QUEM RECEBE TUDO DE VOLTA"} o={1} />
      {fasePessoas > 0 && (
        <AbsoluteFill style={{ opacity: fasePessoas }}>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            {Array.from({ length: 100 }, (_, k) => {
              const col = k % 10, lin = Math.floor(k / 10);
              const cx = PESSOAS.x + col * PESSOAS.passo, cy = PESSOAS.y + lin * PESSOAS.passo;
              const ap = entre(surge, k / 130, k / 130 + 0.25);
              const coberto = k < FT.clientesCobertos;
              const acende = entre(cobre, k / 120, k / 120 + 0.2);
              return (
                <g key={k} opacity={ap}>
                  <circle cx={cx} cy={cy} r={PESSOAS.r} fill="none" stroke={TEXTO_2} strokeWidth={1.5} strokeOpacity={0.7} />
                  {acende > 0 && <circle cx={cx} cy={cy} r={PESSOAS.r} fill={coberto ? CIANO : LARANJA} opacity={acende} />}
                </g>
              );
            })}
          </svg>
          <div style={{ position: "absolute", top: 940, left: X0, width: BW, textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: TEXTO, lineHeight: 1.55, opacity: limite, textShadow: SOMBRA_TXT, whiteSpace: "pre-line" }}>
            {`GARANTIA: ATÉ ${FT.limiteSalarios} SALÁRIOS MÍNIMOS POR PESSOA\n1ª PARCELA DESDE ${FT.primeiroPagamento}: ATÉ G$ 10 MI (≈ US$ 1.600)`}
          </div>
          <Heroi o={Math.min(1, n97 * 3)} top={1060}>
            <Grande tam={104} cor={CIANO}>{Math.round(FT.clientesCobertos * n97)}%</Grande>
            <Rotulo>{"DOS CLIENTES: SALDO TODO COBERTO\nESTIMATIVA DO BANCO CENTRAL"}</Rotulo>
          </Heroi>
        </AbsoluteFill>
      )}
      {faseDinheiro > 0 && (
        <AbsoluteFill style={{ opacity: faseDinheiro }}>
          <div style={{ position: "absolute", top: yC - 60, left: X0, fontFamily: MONO, fontSize: 28, letterSpacing: 3, color: TEXTO }}>CLIENTES</div>
          <div style={{ position: "absolute", top: yC, left: X0, width: BW * FT.clientesCobertos / 100, height: 80, background: CIANO }} />
          <div style={{ position: "absolute", top: yC, left: X0 + BW * FT.clientesCobertos / 100 + 3, width: BW * (100 - FT.clientesCobertos) / 100 - 3, height: 80, background: LARANJA }} />
          <div style={{ position: "absolute", top: yC + 92, left: X0, fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: CIANO }}>{FT.clientesCobertos}% DENTRO DO LIMITE</div>

          <div style={{ position: "absolute", top: yD - 60, left: X0, fontFamily: MONO, fontSize: 28, letterSpacing: 3, color: TEXTO, opacity: entre(f, M.moodys - 4, M.moodys + 4) }}>DINHEIRO</div>
          <div style={{ position: "absolute", top: yD, left: X0, width: BW, height: 80, border: `1.5px solid ${TEXTO_2}`, opacity: entre(f, M.moodys - 4, M.moodys + 4) }} />
          <div style={{ position: "absolute", top: yD, left: X0, width: (BW * FT.valorDentroLimite / 100) * n30, height: 80, background: CIANO, boxShadow: `0 0 26px ${CIANO}66` }} />
          <div style={{ position: "absolute", top: yD, left: X0 + BW * FT.valorDentroLimite / 100 + 3, width: (BW * (100 - FT.valorDentroLimite) / 100 - 3) * entre(f, M.resto - 4, M.grandes + 4, io), height: 80, background: LARANJA, boxShadow: `0 0 30px ${LARANJA}55` }} />
          <div style={{ position: "absolute", top: yD + 92, left: X0, fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: CIANO, opacity: n30 }}>{FT.valorDentroLimite}% DENTRO</div>
          <div style={{ position: "absolute", top: yD + 92, left: X0, width: BW, textAlign: "right", fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: LARANJA, opacity: grande }}>{100 - FT.valorDentroLimite}% ACIMA: CONTAS GRANDES</div>
          <div style={{ position: "absolute", top: yD + 140, left: X0, width: BW, textAlign: "right", fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: TEXTO, opacity: ips, lineHeight: 1.5 }}>
            {`EX.: IPS, A PREVIDÊNCIA PÚBLICA,\nCOM US$ ${br(FT.ipsUsd / 1e6, 0)} MI NO BANCO`}
          </div>
          <Heroi o={Math.min(1, n30 * 3) * (1 - entre(f, M.previdencia - 6, M.previdencia))} top={1130}>
            <Grande tam={104} cor={LARANJA}>SÓ {Math.round(FT.valorDentroLimite * n30)}%</Grande>
            <Rotulo>{"DO DINHEIRO DENTRO DO LIMITE\nCONTA DA MOODY'S"}</Rotulo>
          </Heroi>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// --- 5. o Senado: os 4 dias, o placar, acusação × defesa --------------------------------------------------
const DIAS: [string, string][] = [
  ["2/11", "RESOLUÇÃO\nAPROVADA"],
  ["3/11", "BCP\nCOMUNICA"],
  ["4/11", "APP E\nCARTÕES\nPARAM"],
  ["5/11", "1º\nPAGAMENTO;\nFUNDADOR\nPRESO*"],
  ["6/11", "SENADO\nDESTITUI\nPEÑA"],
];
const DX = (k: number) => 150 + k * 195;

const Senado: React.FC = () => {
  const f = useCurrentFrame();
  const o = visivel(f, C.senado.de, C.senado.ate, 6);
  if (o <= 0) return null;
  const defesa = entre(f, F.defesa - 4, F.defesa + 8);
  const linha = entre(f, C.senado.de + 2, M.destituiu, io);
  const placar = mola(f, M.p44 - 2, { damping: 12, stiffness: 200 });
  const acionista = entre(f, M.acionista - 4, M.acionista + 6);
  const yL = 560;
  const cartao = (k: number) => entre(f, k === 0 ? M.nega - 6 : M.defesa - 6, (k === 0 ? M.nega : M.defesa) + 4);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Foto src="palacio.jpg" s={1.04 + 0.06 * entre(f, C.senado.de, C.senado.ate)} origem="45% 35%" filtro={`brightness(${0.5 - 0.15 * defesa}) saturate(0.8)`} />
      <Sombras meio={0.35} />
      <Credito texto="FOTO: MX. GRANGER · CC0 · CONGRESSO DO PARAGUAI, 2017" o={1} />
      <Etiqueta texto="QUATRO DIAS" o={1} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - 0.65 * defesa }}>
        <rect x={0} y={yL - 90} width={1080} height={330} fill="rgba(5,7,12,0.72)" />
        <line x1={DX(0)} x2={DX(0) + (DX(4) - DX(0)) * linha} y1={yL} y2={yL} stroke={TEXTO} strokeWidth={3} />
        {DIAS.map(([d, t], k) => {
          const on = entre(linha, k / 4 - 0.06, k / 4);
          const ult = k === 4;
          return (
            <g key={d} opacity={Math.max(0.25, on)}>
              <circle cx={DX(k)} cy={yL} r={ult ? 14 : 10} fill={on > 0.5 ? (ult ? LARANJA : TEXTO) : FUNDO} stroke={ult ? LARANJA : TEXTO} strokeWidth={3} />
              <text x={DX(k)} y={yL - 30} textAnchor="middle" fill={ult ? LARANJA : TEXTO} fontFamily={MONO} fontSize={30} {...CONTORNO}>{d}</text>
              {t.split("\n").map((l, j) => (
                <text key={j} x={DX(k)} y={yL + 50 + j * 30} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={21} letterSpacing={0.5} {...CONTORNO}>{l}</text>
              ))}
            </g>
          );
        })}
        <text x={540} y={yL + 205} textAnchor="middle" fill={TEXTO} fontFamily={MONO} fontSize={20} letterSpacing={0.5} opacity={entre(linha, 0.8, 0.95)} {...CONTORNO}>* EM PRISÃO PREVENTIVA, SEGUNDO A AP · NINGUÉM FOI CONDENADO</text>
      </svg>
      <div style={{ position: "absolute", top: 860, left: X0, width: BW, textAlign: "center", fontFamily: MONO, fontSize: 25, letterSpacing: 2, color: TEXTO, lineHeight: 1.5, opacity: acionista * (1 - defesa), textShadow: SOMBRA_TXT }}>
        {`PEÑA FOI ACIONISTA DE UMA EMPRESA\nDO GRUPO DONO DO BANCO ATÉ ${FT.acionistaAte.toUpperCase()}`}
      </div>
      {/* acusação × defesa: mesmo tamanho, mesma cor, mesma moldura */}
      {defesa > 0 && (
        <div style={{ position: "absolute", top: 800, left: X0, width: BW, display: "flex", gap: 30 }}>
          {[["SENADO", "CULPADO POR MAU\nDESEMPENHO DAS\nFUNÇÕES, 44 A 0"], ["DEFESA", "CONTESTA A VALIDADE\nDO JULGAMENTO E DIZ\nQUE FALTOU TEMPO"]].map(([t, x], k) => (
            <div key={t} style={{
              flex: 1, border: `2px solid ${TEXTO}`, background: "rgba(5,7,12,0.82)", padding: "26px 20px", fontFamily: MONO, color: TEXTO,
              opacity: cartao(k), translate: `0 ${(1 - cartao(k)) * 20}px`,
            }}>
              <div style={{ fontSize: 30, letterSpacing: 4 }}>{t}</div>
              <div style={{ fontSize: 25, letterSpacing: 1, lineHeight: 1.5, marginTop: 14, whiteSpace: "pre-line", color: TEXTO }}>{x}</div>
            </div>
          ))}
        </div>
      )}
      <Heroi o={placar * (1 - defesa)} top={1040}>
        <div style={{ scale: `${0.85 + 0.15 * placar}` }}><Grande tam={140}>{FT.votosSim} A {FT.votosNao}</Grande></div>
        <Rotulo>{`SENADO · ${FT.destituicao} · ${FT.ausentes} AUSENTE\nPOR MAU DESEMPENHO DAS FUNÇÕES`}</Rotulo>
      </Heroi>
      <Heroi o={entre(f, M.nega - 4, M.nega + 6)} top={1090}>
        <Rotulo tam={27}>{"PEÑA NEGA TER INTERFERIDO\nNA FISCALIZAÇÃO DO BANCO"}</Rotulo>
        <Rotulo cor={TEXTO_2} tam={21}>GAZETA DO POVO · DEFESA: DIARIO PANORAMA/EFE</Rotulo>
      </Heroi>
    </AbsoluteFill>
  );
};

// --- legenda e pergunta -----------------------------------------------------------------------------------
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
  const linhas = [0, 1, 2].map((l) => T.grande.filter((w) => w.l === l));
  return (
    <div style={{
      position: "absolute", top: 1060, left: 60, width: 960, textAlign: "center", opacity: o,
      fontFamily: SORA, fontWeight: 300, fontSize: 96, lineHeight: 1.14, letterSpacing: -1, color: TEXTO,
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
      <AssinaturaCta sombra={SOMBRA_TXT} />
    </div>
  );
};

// --- narração ----------------------------------------------------------------------------
// A ordem das falas em T.fala é a do roteiro.json: a fala k é ciencia/paraguai/beat-<k>.mp3.
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/paraguai/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Paraguai: React.FC = () => (
  <Fundo>
    <Pessoas />
    <Deposito />
    <Resolucao />
    <Cobertura />
    <Senado />
    <Torre />
    <PerguntaFinal />
    <Legenda />
    <Cta />
    <Narracao />
    {/* scripts/gerar-trilha-paraguai.mjs: recusas, impactos, tiques, whoosh nas cenas */}
    <Audio src={staticFile("ciencia/paraguai/trilha.mp3")} volume={0.3} />
  </Fundo>
);

// --- capa da grade (1080x1920; o recorte 3:4 da grade vai de y 240 a 1680) -------------------
export const ParaguaiCapa: React.FC = () => (
  <Fundo>
    <Foto src="asuncion-ueno.jpg" s={1.08} origem="79% 28%" top={60} filtro="brightness(0.6) saturate(0.85)" />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,12,0.35) 0px, rgba(5,7,12,0.2) 600px, rgba(5,7,12,0.75) 980px, rgba(5,7,12,0.92) 1500px)" }} />
    <Chip src="ueno-logo.png" o={1} x={540} y={330} altura={52} />
    <div style={{ position: "absolute", top: 940, left: 60, width: 960, textAlign: "center", fontFamily: SORA, fontWeight: 300, fontSize: 110, lineHeight: 1.08, letterSpacing: -1.5, color: TEXTO, textShadow: "0 0 30px rgba(5,7,12,1), 0 0 10px rgba(5,7,12,1)" }}>
      O banco<br />que travou
    </div>
    <div style={{ position: "absolute", top: 1220, width: "100%", textAlign: "center", fontFamily: SORA, fontWeight: 400, fontSize: 104, letterSpacing: 2, color: LARANJA, textShadow: `0 0 40px ${LARANJA}aa, 0 0 12px rgba(5,7,12,1)` }}>
      PARAGUAI
    </div>
  </Fundo>
);
