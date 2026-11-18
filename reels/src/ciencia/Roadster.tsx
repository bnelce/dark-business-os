import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import T from "./roadster-tempos.json";
import { Destaque, Fonte, Fundo, Manchete, Marca, Status, X0, X1, entre, janela } from "./base";
import { Neon, Traco, ruido } from "./ilustra-drex";
import {
  Carro, FROTA, Jato, Nuvem, PERFIL, Seta, TRASEIRA, Traseira, arco, circulo, cubo, noPerfil,
} from "./ilustra-roadster";
import { CIANO, LARANJA, MONO, TEXTO, TEXTO_2 } from "./tokens";

// O Roadster "voador" da Tesla, apresentado em 15/10/2026 na base de testes da SpaceX em
// McGregor (Texas). Ditos pela Tesla na apresentação (youtube.com/watch?v=qt5p-_tE8d0):
// 2 tanques, 600 L, "about 250 kilos of air", 10 bicos (12:09); os 4 traseiros fazem mais de
// 80 kN e o jato sai supersônico, com discos de Mach (17:56); sucção das ventoinhas até 2 g
// (08:13). Estimativas nossas, rotuladas na tela: carro de ~2 t (peso ≈ 20.000 N), jato a
// ~600 m/s, 33 kg/s pra pairar (≈ 27 m³ de ar livre), 250/33 ≈ 7,5 s, e ~3% de pressão a
// menos num piso de ~6 m² pra segurar o carro no teto.
//
// Com narração (roteiro.json da pasta do reel). Tempos em roadster-tempos.json
// (scripts/tempos-roadster.mjs); a trilha lê o mesmo arquivo.

const F = T.fala;
export const ROADSTER_TOTAL = T.total;

const texto = (x: number, y: number, s: string, o: number, extra: Partial<React.SVGProps<SVGTextElement>> = {}) => (
  <text x={x} y={y} fill={TEXTO_2} fontFamily={MONO} fontSize={24} letterSpacing={2} opacity={o} {...extra}>{s}</text>
);

// --- cena 1: o salto por cima da frota --------------------------------------------------------
const CHAO1 = 1300, S1 = 0.38, AR1 = 52, X_SOBE = 130, X_DESCE = 930, ALTURA1 = 330, VAO1 = 14;

const Salto: React.FC = () => {
  const f = useCurrentFrame();
  const o = 1 - entre(f, F.bicos - 12, F.bicos);
  if (o <= 0) return null;
  const u = entre(f, T.salto, T.salto + AR1);
  let x: number, y: number, ang = 0;
  // o quadro 0 é a capa: o carro já está na pista, pronto pra decolar
  if (f < T.salto) { x = X_SOBE; y = CHAO1; }
  else if (f < T.salto + AR1) { x = X_SOBE + (X_DESCE - X_SOBE) * u; y = CHAO1 - 4 * ALTURA1 * u * (1 - u); ang = -7 * (1 - 2 * u); }
  else { x = X_DESCE + 20 * entre(f, T.salto + AR1, T.salto + AR1 + 30, Easing.out(Easing.cubic)); y = CHAO1; }
  const jatos = Math.max(janela(f, T.salto - 4, T.salto + 16, 4), janela(f, T.salto + AR1 - 18, T.salto + AR1 + 4, 4));
  let xf = 530 - (FROTA.reduce((a, v) => a + v.w, 0) + VAO1 * (FROTA.length - 1)) / 2;
  const relogio = entre(f, T.salto, T.salto + AR1);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="MCGREGOR · TEXAS" direita="15/10/2026" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonRS1" /></defs>
        <line x1={X0 - 60} x2={X1 + 60} y1={CHAO1} y2={CHAO1} stroke={TEXTO_2} strokeOpacity={0.6} />
        {FROTA.map((v) => {
          const x0 = xf; xf += v.w + VAO1;
          return (
            <g key={v.nome}>
              <g transform={`translate(${x0} ${CHAO1})`}><Traco d={v.d} filtro="neonRS1" cor={TEXTO_2} w={1.6} brilho={0} /></g>
              {texto(x0 + v.w / 2, CHAO1 + 40, v.nome, 1, { textAnchor: "middle", fontSize: 18 })}
            </g>
          );
        })}
        {[noPerfil(PERFIL.bocaTras, x, y, S1), noPerfil(PERFIL.bocaFrente, x, y, S1)].map(([jx, jy], k) => (
          <Jato key={k} x={jx} y={jy} ang={90 + ang} comp={130} forca={jatos} f={f} filtro="neonRS1" larg={12} />
        ))}
        <Carro x={x} y={y} s={S1} ang={ang} giroRoda={x / (PERFIL.raio * S1)} filtro="neonRS1" />
        <Nuvem x={X_SOBE} y={CHAO1} t={f - T.salto} filtro="neonRS1" espalha={90} dur={40} n={6} />
        <Nuvem x={X_DESCE} y={CHAO1} t={f - (T.salto + AR1 - 6)} filtro="neonRS1" espalha={130} dur={50} n={7} semente={20} />
        {/* cronômetro: gira durante o salto e fica com a pergunta */}
        <g>
          <path d={circulo(540, 680, 86)} fill="none" stroke={TEXTO_2} strokeOpacity={0.5} />
          {Array.from({ length: 60 }, (_, k) => {
            const a = (k / 60) * 2 * Math.PI, r0 = k % 5 === 0 ? 96 : 100;
            return <line key={k} x1={540 + r0 * Math.cos(a)} y1={680 + r0 * Math.sin(a)} x2={540 + 106 * Math.cos(a)} y2={680 + 106 * Math.sin(a)} stroke={TEXTO_2} strokeOpacity={0.5} />;
          })}
          {relogio > 0.01 && <Traco d={arco(540, 680, 86, -90, -90 + 359 * relogio)} filtro="neonRS1" cor={CIANO} w={3} brilho={0.6} />}
          <text x={540} y={712} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={92} opacity={entre(f, T.pergunta, T.pergunta + 12)}>?</text>
          {texto(540, 830, "SEGUNDOS NO AR", entre(f, T.pergunta, T.pergunta + 12), { textAnchor: "middle" })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 2: os bicos e os tanques ------------------------------------------------------------
const Bicos: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.bicos, F.newton, 12);
  if (o <= 0) return null;
  const t = f - F.bicos;
  const CY = 1290, S2 = 1.25;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="AR COMPRIMIDO" direita="DADOS DA TESLA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonRS2" /></defs>
        <Traseira x={540} y={690} s={1.15} p={entre(t, 0, 35)} bicos={entre(f, T.dezBicos, T.dezBicos + 30)} filtro="neonRS2" />
        <g opacity={entre(f, T.dezBicos + 20, T.dezBicos + 35)}>
          {texto(540, 850, "4 PRINCIPAIS, NA TRASEIRA", 1, { textAnchor: "middle", fill: LARANJA, fontSize: 28 })}
          {texto(540, 890, "+ 6 DE CONTROLE NA FRENTE E NAS LATERAIS", 1, { textAnchor: "middle", fontSize: 22 })}
        </g>
        <Carro x={540} y={CY} s={S2} p={entre(t, 25, 65)} raioX={entre(f, T.quilos, T.quilos + 25)} filtro="neonRS2" cor={TEXTO_2} />
        {texto(540, CY + 70, "≈ 250 KG DE AR", entre(f, T.quilos + 10, T.quilos + 25), { textAnchor: "middle", fill: CIANO, fontSize: 40, letterSpacing: 3 })}
        {texto(540, CY + 118, "2 TANQUES DE FIBRA DE CARBONO · 600 L", entre(f, T.tanques, T.tanques + 15), { textAnchor: "middle", fill: TEXTO })}
        {texto(540, CY + 154, "POSIÇÃO DOS TANQUES: ESQUEMA", entre(f, T.tanques + 10, T.tanques + 25), { textAnchor: "middle", fontSize: 20 })}
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 3: ação e reação ------------------------------------------------------------------------
const CHAO3 = 1420, Y3 = 1060, S3 = 1.05;

const Newton: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.newton, F.vazao, 12);
  if (o <= 0) return null;
  const t = f - F.newton;
  const y = Y3 + 6 * Math.sin(t / 14);
  const mach = entre(f, T.som, T.som + 20);
  const bocas = [noPerfil(PERFIL.bocaTras, 540, y, S3), noPerfil(PERFIL.bocaFrente, 540, y, S3)];
  const meio = y - (PERFIL.h * S3) / 2;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="AÇÃO E REAÇÃO" direita="3ª LEI DE NEWTON" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonRS3" /></defs>
        <line x1={X0 - 60} x2={X1 + 60} y1={CHAO3} y2={CHAO3} stroke={TEXTO_2} strokeOpacity={0.6} />
        {bocas.map(([jx, jy], k) => (
          <g key={k}>
            <Jato x={jx} y={jy} ang={90} comp={CHAO3 - jy - 6} forca={entre(t, 0, 15)} f={f + k * 5} filtro="neonRS3" mach={mach} larg={22} />
            <Nuvem x={jx} y={CHAO3} t={Math.min(t, 70)} filtro="neonRS3" espalha={120} dur={70} n={6} semente={k * 9} />
          </g>
        ))}
        <Carro x={540} y={y} s={S3} filtro="neonRS3" />
        <Seta x1={540} y1={meio - 30} x2={540} y2={600} p={entre(f, T.empurra, T.empurra + 18, Easing.out(Easing.cubic))} filtro="neonRS3" cor={CIANO} w={4} ponta={30} />
        {texto(570, 640, "EMPURRÃO", entre(f, T.empurra + 10, T.empurra + 25), { fill: CIANO, fontSize: 30 })}
        <Seta x1={540} y1={meio + 30} x2={540} y2={1290} p={entre(f, T.flutuar, T.flutuar + 18, Easing.out(Easing.cubic))} filtro="neonRS3" cor={TEXTO} w={4} ponta={30} />
        {texto(570, 1280, "PESO ≈ 20.000 N", entre(f, T.flutuar + 10, T.flutuar + 25), { fill: TEXTO, fontSize: 30 })}
        <g opacity={mach}>
          {texto(540, 1480, "JATO MAIS RÁPIDO QUE O SOM", 1, { textAnchor: "middle", fill: TEXTO })}
          {texto(540, 1514, "OS LOSANGOS SÃO ONDAS DE CHOQUE", 1, { textAnchor: "middle", fontSize: 20 })}
        </g>
        {texto(540, 1560, "PESO: ESTIMATIVA, CARRO DE ~2 T", entre(f, T.flutuar + 25, T.flutuar + 40), { textAnchor: "middle", fontSize: 20 })}
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 4: um quarto de ar por segundo ----------------------------------------------------------
const XC4 = 540, YC4 = 1360, A4 = 290;
const ponto4 = (a: number, b: number, c: number): [number, number] => [
  XC4 + (a - b) * Math.cos(Math.PI / 6) * A4, YC4 - (a + b) * (A4 / 2) - c * A4,
];

const Vazao: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.vazao, F.tempo, 12);
  if (o <= 0) return null;
  const C = cubo(XC4, YC4, A4);
  const desenho = entre(f, T.quarto, T.quarto + 30);
  const ciclo = f >= T.cadaSegundo ? (f - T.cadaSegundo) % 30 : -1;
  const segundos = f >= T.cadaSegundo ? Math.floor((f - T.cadaSegundo) / 30) + 1 : 0;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="AR GASTO POR SEGUNDO" direita="ESTIMATIVA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonRS4" /></defs>
        {texto(540, 560, "PESO ≈ 20.000 N  ·  JATO ≈ 600 M/S", entre(f, F.vazao + 10, F.vazao + 25), { textAnchor: "middle", fill: TEXTO, fontSize: 28 })}
        {texto(540, 650, "20.000 ÷ 600 ≈ 33 KG DE AR POR SEGUNDO", entre(f, T.vazao, T.vazao + 15), { textAnchor: "middle", fill: LARANJA, fontSize: 32 })}
        <Traco d={C.fundo} filtro="neonRS4" cor={TEXTO_2} w={1.2} p={desenho} brilho={0} tracejado="6 8" />
        <Traco d={C.frente} filtro="neonRS4" cor={CIANO} w={2.2} p={desenho} brilho={0.5} />
        {/* o ar de um quarto inteiro entra e sai a cada segundo */}
        {ciclo >= 0 && Array.from({ length: 70 }, (_, k) => {
          const aparece = (k / 70) * 20;
          if (ciclo < aparece) return null;
          const sai = entre(ciclo, 22, 30);
          const [px, py] = ponto4(ruido(k), ruido(k + 100), ruido(k + 200));
          return <circle key={k} cx={px} cy={py + sai * 60} r={4} fill={TEXTO} opacity={0.7 * (1 - sai)} />;
        })}
        <g opacity={desenho}>
          {texto((ponto4(0, 1, 0)[0] + XC4) / 2 - 30, (ponto4(0, 1, 0)[1] + YC4) / 2 + 40, "3 M", 1, { textAnchor: "end", fill: TEXTO })}
          {texto((ponto4(1, 0, 0)[0] + XC4) / 2 + 30, (ponto4(1, 0, 0)[1] + YC4) / 2 + 40, "3 M", 1, { fill: TEXTO })}
          {texto(ponto4(1, 0, 0.5)[0] + 24, ponto4(1, 0, 0.5)[1] + 8, "3 M", 1, { fill: TEXTO })}
        </g>
        {texto(540, YC4 + 80, "≈ 27 M³ DE AR, AO AR LIVRE", entre(f, T.quarto + 20, T.quarto + 35), { textAnchor: "middle", fill: TEXTO, fontSize: 28 })}
        {segundos > 0 && texto(X1, 800, `${segundos} S`, 1, { textAnchor: "end", fill: LARANJA, fontSize: 40 })}
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 5: quanto tempo o tanque dura ------------------------------------------------------------
const CHAO5 = 1400, Y5 = 1180, S5 = 0.8;

const Tempo: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.tempo, F.giro, 12);
  if (o <= 0) return null;
  const t0 = F.tempo + 8, t1 = T.sete + 5;
  const gasto = entre(f, t0, t1);
  const cai = entre(f, t1, t1 + 14, Easing.in(Easing.quad));
  const y = Y5 + (CHAO5 - Y5) * cai;
  const carro = 1 - entre(f, T.saltos, T.saltos + 12);
  const bocas = [noPerfil(PERFIL.bocaTras, 540, y, S5), noPerfil(PERFIL.bocaFrente, 540, y, S5)];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="SE ELE PAIRASSE" direita="LIMITE TEÓRICO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonRS5" /></defs>
        {texto(X0, 540, "AR NO TANQUE", 1, { fill: TEXTO })}
        {texto(X1, 540, `${Math.round(250 * (1 - gasto))} KG`, 1, { textAnchor: "end", fill: TEXTO })}
        <rect x={X0} y={560} width={X1 - X0} height={34} fill="none" stroke={TEXTO_2} strokeOpacity={0.7} />
        <rect x={X0 + 4} y={564} width={Math.max(0, (X1 - X0 - 8) * (1 - gasto))} height={26} fill={CIANO} opacity={0.55} />
        <text x={540} y={800} textAnchor="middle" fill={LARANJA} fontFamily={MONO} fontSize={140}>{(7.5 * gasto).toFixed(1).replace(".", ",")} S</text>
        {texto(540, 850, "TEMPO ACELERADO", 1, { textAnchor: "middle", fontSize: 20 })}
        <line x1={X0 - 60} x2={X1 + 60} y1={CHAO5} y2={CHAO5} stroke={TEXTO_2} strokeOpacity={0.6} />
        <g opacity={carro}>
          {bocas.map(([jx, jy], k) => (
            <Jato key={k} x={jx} y={jy} ang={90} comp={CHAO5 - jy - 6} forca={1 - entre(f, t1 - 6, t1)} f={f + k * 5} filtro="neonRS5" larg={18} mach={1 - gasto} />
          ))}
          <Carro x={540} y={y} s={S5} filtro="neonRS5" />
          <Nuvem x={540} y={CHAO5} t={f - (t1 + 12)} filtro="neonRS5" espalha={200} dur={40} n={8} semente={5} />
        </g>
        {/* o que a Tesla mostrou: saltos curtos */}
        {[0, 1, 2].map((k) => {
          const xa = 170 + k * 250, p = entre(f, T.saltos + 8 + k * 10, T.saltos + 28 + k * 10);
          return <Traco key={k} d={`M${xa},${CHAO5} Q${xa + 110},${CHAO5 - 260} ${xa + 220},${CHAO5}`} filtro="neonRS5" cor={CIANO} w={2.4} p={p} brilho={0.5} />;
        })}
        {texto(540, CHAO5 + 60, "NA APRESENTAÇÃO: SÓ SALTOS", entre(f, T.saltos + 15, T.saltos + 30), { textAnchor: "middle", fill: CIANO, fontSize: 28 })}
        {texto(540, CHAO5 + 104, "250 KG ÷ 33 KG/S ≈ 7,5 S · ESTIMATIVA", entre(f, t1, t1 + 15), { textAnchor: "middle", fontSize: 20 })}
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 6: o giro, visto de trás ---------------------------------------------------------------
// Bicos em cantos opostos sopram em sentidos contrários: as forças se anulam e sobra o giro.
// Acelera com um par, desliza, freia com o par oposto e para na volta inteira.
const X6 = 540, Y6 = 1010, S6 = 1.25;
const J0 = T.cantos + 15, ACEL = 70, DESLIZA = 46;
const ALFA = 360 / (ACEL * ACEL + ACEL * DESLIZA);
const J1 = J0 + ACEL, J2 = J1 + DESLIZA, J3 = J2 + ACEL;
const angGiro = (f: number) => {
  if (f <= J0) return 0;
  if (f <= J1) return -0.5 * ALFA * (f - J0) ** 2;
  const w = ALFA * ACEL, a1 = 0.5 * ALFA * ACEL * ACEL;
  if (f <= J2) return -(a1 + w * (f - J1));
  if (f <= J3) { const d = f - J2; return -(a1 + w * DESLIZA + w * d - 0.5 * ALFA * d * d); }
  return -360;
};
const naTela = (lx: number, ly: number, ang: number): [number, number] => {
  const a = (ang * Math.PI) / 180, dx = (lx - TRASEIRA.cx) * S6, dy = (ly - TRASEIRA.cy) * S6;
  return [X6 + dx * Math.cos(a) - dy * Math.sin(a), Y6 + dx * Math.sin(a) + dy * Math.cos(a)];
};

const Giro: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.giro, F.nuvem, 12);
  if (o <= 0) return null;
  const t = f - F.giro;
  const ang = angGiro(f);
  const acelera = janela(f, J0, J1, 4), freia = janela(f, J2, J3, 4);
  const setas = entre(f, J0 + 30, J0 + 45);
  const par = (sentido: 1 | -1, forca: number) => {
    if (forca <= 0) return null;
    const esq = naTela(40, 132, ang), dir = naTela(480, 132, ang);
    // sentido 1: o esquerdo sopra pra cima e o direito pra baixo (o carro gira anti-horário)
    const jEsq = -90 * sentido + ang, jDir = 90 * sentido + ang;
    const reacao = (p: [number, number], a: number) => {
      const r = ((a + 180) * Math.PI) / 180;
      return <Seta x1={p[0]} y1={p[1]} x2={p[0] + 110 * Math.cos(r)} y2={p[1] + 110 * Math.sin(r)} p={setas} filtro="neonRS6" cor={CIANO} w={3.5} ponta={24} />;
    };
    return (
      <g>
        <Jato x={esq[0]} y={esq[1]} ang={jEsq} comp={190} forca={forca} f={f} filtro="neonRS6" larg={16} />
        <Jato x={dir[0]} y={dir[1]} ang={jDir} comp={190} forca={forca} f={f + 3} filtro="neonRS6" larg={16} />
        {reacao(esq, jEsq)}{reacao(dir, jDir)}
      </g>
    );
  };
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="VISTA DE TRÁS" direita="BINÁRIO" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonRS6" /></defs>
        {par(1, acelera)}
        {par(-1, freia)}
        <Traseira x={X6} y={Y6} s={S6} ang={ang} p={entre(t, 0, 25)} bicos={1} filtro="neonRS6" />
        {/* seta curva do sentido do giro */}
        <g opacity={acelera}>
          <Traco d={arco(X6, Y6, 420, -55, -125)} filtro="neonRS6" cor={TEXTO} w={2} brilho={0.3} tracejado="10 10" />
          <Seta x1={X6 + 420 * Math.cos((-118 * Math.PI) / 180)} y1={Y6 + 420 * Math.sin((-118 * Math.PI) / 180)}
            x2={X6 + 420 * Math.cos((-125 * Math.PI) / 180)} y2={Y6 + 420 * Math.sin((-125 * Math.PI) / 180)} filtro="neonRS6" cor={TEXTO} w={2} ponta={22} brilho={0.3} />
        </g>
        {texto(540, 1420, "FORÇAS IGUAIS E OPOSTAS", entre(f, J0 + 40, J0 + 55), { textAnchor: "middle", fill: TEXTO, fontSize: 30 })}
        {texto(540, 1462, "NÃO EMPURRAM O CARRO: SÓ O FAZEM GIRAR", entre(f, J0 + 50, J0 + 65), { textAnchor: "middle", fontSize: 22 })}
        {texto(540, 1500, "PARA PARAR, O PAR OPOSTO FREIA", entre(f, J2, J2 + 15), { textAnchor: "middle", fontSize: 20 })}
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 7: a nuvem é condensação -----------------------------------------------------------------
const YJ = 1010, XB = 270;
const naNuvem = (x: number, y: number) => x > XB + 40 && Math.abs(y - YJ) < 30 + 0.14 * (x - XB);

const Condensa: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.nuvem, F.teto, 12);
  if (o <= 0) return null;
  const t = f - F.nuvem;
  const vira = entre(f, T.condensa, T.condensa + 40);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="CONDENSAÇÃO" direita="ESQUEMA" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonRS7" /></defs>
        {/* tanque e bocal convergente-divergente: estrangula e abre, e o ar sai supersônico */}
        <Traco d={`M20,${YJ - 120} L80,${YJ - 120} A40,40 0 0 1 120,${YJ - 80} L120,${YJ + 80} A40,40 0 0 1 80,${YJ + 120} L20,${YJ + 120}`} filtro="neonRS7" cor={TEXTO_2} w={2} p={entre(t, 0, 20)} brilho={0.2} />
        <Traco d={`M120,${YJ - 70} L205,${YJ - 34} L${XB},${YJ - 64} M120,${YJ + 70} L205,${YJ + 34} L${XB},${YJ + 64}`} filtro="neonRS7" cor={TEXTO} w={2.4} p={entre(t, 0, 20)} brilho={0.4} />
        <Jato x={XB} y={YJ} ang={0} comp={680} forca={entre(t, 10, 30)} f={f} filtro="neonRS7" mach={1} larg={56} cor={CIANO} />
        {texto(120, YJ + 130, "NO TANQUE: TEMPERATURA AMBIENTE", entre(t, 15, 30), { fill: TEXTO, fontSize: 22 })}
        {texto(X1, YJ - 170, "NO JATO: ABAIXO DE 0 °C", entre(f, T.gelado, T.gelado + 15), { textAnchor: "end", fill: LARANJA, fontSize: 30 })}
        {texto(X1, YJ - 132, "O AR ESFRIA AO SE EXPANDIR", entre(f, T.gelado + 10, T.gelado + 25), { textAnchor: "end", fontSize: 20 })}
        {/* vapor d'água invisível no ar em volta; perto do jato gelado, vira gotícula */}
        {Array.from({ length: 110 }, (_, k) => {
          const x = 100 + ruido(k) * 880 + 12 * Math.sin(t / 25 + k);
          const y = 720 + ruido(k + 300) * 600 + 10 * Math.cos(t / 30 + k);
          const perto = naNuvem(x, y);
          const v = perto ? vira : 0;
          return (
            <g key={k}>
              <circle cx={x} cy={y} r={3} fill={TEXTO_2} opacity={0.6 * (1 - v)} />
              {v > 0 && <Traco d={circulo(x, y, 6 + 18 * v * ruido(k + 9))} filtro="neonRS7" cor={TEXTO} w={1.4} o={v} brilho={0.35} preenche={0.15} />}
            </g>
          );
        })}
        {texto(X0, 1390, "VAPOR D'ÁGUA DO AR (INVISÍVEL)", entre(t, 30, 45), { fontSize: 22 })}
        {texto(X0, 1430, "→ GOTÍCULAS: NEBLINA, NÃO FUMAÇA", entre(f, T.condensa + 25, T.condensa + 40), { fill: TEXTO, fontSize: 26 })}
      </svg>
    </AbsoluteFill>
  );
};

// --- cena 8: preso no teto pela pressão do ar --------------------------------------------------------
// A rampa em "J" passa da vertical: no topo o carro fica de cabeça pra baixo. Vencer o peso
// pede ~3% a menos de pressão sob um piso de ~6 m² (20.000 N ÷ 6 m² ≈ 3.300 Pa ≈ 3% de 101 kPa).
const XR = 540, YR = 1060, RR = 470, S8 = 0.75;
const TOPO = YR - RR;
const Y_CARRO8 = TOPO + 140 * S8; // de cabeça pra baixo, as rodas encostam no topo da rampa
const PISO8 = Y_CARRO8 - PERFIL.h * S8 + (200 - 134) * S8;

const Teto: React.FC = () => {
  const f = useCurrentFrame();
  const o = janela(f, F.teto, F.cta, 12);
  if (o <= 0) return null;
  const t = f - F.teto;
  const puxa = entre(f, T.ventoinhas, T.ventoinhas + 15);
  const menos = entre(f, T.pressao, T.pressao + 15);
  const empurra = entre(f, T.segura, T.segura + 20, Easing.out(Easing.cubic));
  const meia = 0.5 * (546 - 54) * S8;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Status esquerda="SUCÇÃO" direita="PRESSÃO DO AR" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonRS8" /></defs>
        <Traco d={`M${X0 - 60},${YR + RR} L${XR},${YR + RR}`} filtro="neonRS8" cor={TEXTO_2} w={1.5} p={entre(t, 0, 10)} brilho={0} />
        <Traco d={arco(XR, YR, RR, 90, -140)} filtro="neonRS8" cor={TEXTO} w={3} p={entre(t, 0, 30)} brilho={0.35} />
        {Array.from({ length: 24 }, (_, k) => {
          const a = ((90 - k * 10) * Math.PI) / 180;
          return <line key={k} x1={XR + RR * Math.cos(a)} y1={YR + RR * Math.sin(a)} x2={XR + (RR + 26) * Math.cos(a)} y2={YR + (RR + 26) * Math.sin(a)}
            stroke={TEXTO_2} strokeOpacity={0.4 * entre(t, 10 + k, 20 + k)} />;
        })}
        <Carro x={XR} y={Y_CARRO8} s={S8} ang={180} p={entre(t, 15, 45)} filtro="neonRS8" />
        {/* o vão entre o piso e a rampa: as ventoinhas tiram o ar dali */}
        {menos > 0 && <rect x={XR - meia} y={TOPO + 2} width={2 * meia} height={PISO8 - TOPO - 4} fill={LARANJA} opacity={0.22 * menos} />}
        {puxa > 0 && Array.from({ length: 16 }, (_, k) => {
          const lado = k % 2 ? 1 : -1, fase = ((f - T.ventoinhas) * 2.2 + k * 23) % 120;
          const x = XR + lado * (meia * (ruido(k) * 0.8) + fase * 1.6), y = (TOPO + PISO8) / 2 + (ruido(k + 5) - 0.5) * 12;
          return <circle key={k} cx={x} cy={y} r={3.5} fill={TEXTO} opacity={puxa * (1 - fase / 120)} />;
        })}
        {texto(XR, Y_CARRO8 + 215, "VENTOINHAS TIRAM O AR DO VÃO", puxa, { textAnchor: "middle", fill: TEXTO, fontSize: 24 })}
        {texto(XR, Y_CARRO8 + 275, "≈ 3% MENOS PRESSÃO NO VÃO", menos, { textAnchor: "middle", fill: LARANJA, fontSize: 40, letterSpacing: 3 })}
        {/* a atmosfera empurra o teto do carro (virado pra baixo) contra a rampa */}
        {Array.from({ length: 7 }, (_, k) => {
          const x = XR - meia * 0.9 + (k / 6) * meia * 1.8;
          return <Seta key={k} x1={x} y1={Y_CARRO8 + 160} x2={x} y2={Y_CARRO8 + 20} p={empurra} filtro="neonRS8" cor={CIANO} w={3} ponta={20} />;
        })}
        {texto(XR, Y_CARRO8 + 330, "O AR DE FORA EMPURRA · 101 KPA", empurra, { textAnchor: "middle", fill: CIANO, fontSize: 26 })}
        <g opacity={entre(f, T.segura + 25, T.segura + 40)}>
          {texto(XR, 1380, "A TESLA DIZ QUE A SUCÇÃO CHEGA A 2 G", 1, { textAnchor: "middle", fontSize: 22, fill: TEXTO })}
          {texto(XR, 1416, "ESTIMATIVA: CARRO DE ~2 T, PISO DE ~6 M²", 1, { textAnchor: "middle", fontSize: 20 })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// --- fecho ---------------------------------------------------------------------------------------------
const Fecho: React.FC = () => {
  const f = useCurrentFrame();
  const o = entre(f, F.cta, F.cta + 15) * (1 - entre(f, T.marca, T.marca + 20));
  if (o <= 0) return null;
  const y = 1180 + 8 * Math.sin((f - F.cta) / 12);
  const bocas = [noPerfil(PERFIL.bocaTras, 540, y, 0.9), noPerfil(PERFIL.bocaFrente, 540, y, 0.9)];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><Neon id="neonRS9" /></defs>
        {bocas.map(([jx, jy], k) => <Jato key={k} x={jx} y={jy} ang={90} comp={150} forca={1} f={f + k * 4} filtro="neonRS9" larg={16} mach={1} />)}
        <Carro x={540} y={y} s={0.9} filtro="neonRS9" />
      </svg>
    </AbsoluteFill>
  );
};

// --- narração ----------------------------------------------------------------------------------------
const Narracao: React.FC = () => (
  <>
    {Object.values(F).map((de, k) => (
      <Sequence key={k} from={de}>
        <Audio src={staticFile(`ciencia/roadster/beat-${String(k + 1).padStart(2, "0")}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Roadster: React.FC = () => (
  <Fundo>
    <Salto />
    <Bicos />
    <Newton />
    <Vazao />
    <Tempo />
    <Giro />
    <Condensa />
    <Teto />
    <Fecho />
    <Manchete de={-10} ate={F.bicos - 4}>Esse carro sai do chão.{"\n"}<Destaque cor={LARANJA}>Mas por quantos segundos?</Destaque></Manchete>
    <Manchete de={F.bicos} ate={F.newton - 4}>Sem fogo: <Destaque>250 kg</Destaque>{"\n"}<Destaque>de ar comprimido.</Destaque></Manchete>
    <Manchete de={F.newton} ate={F.vazao - 4}>Pra flutuar, o empurrão{"\n"}<Destaque>precisa igualar o peso.</Destaque></Manchete>
    <Manchete de={F.vazao} ate={F.tempo - 4}>Um quarto cheio de ar{"\n"}<Destaque cor={LARANJA}>a cada segundo.</Destaque></Manchete>
    <Manchete de={F.tempo} ate={F.giro - 4}>250 kg de ar:{"\n"}<Destaque cor={LARANJA}>uns 7 segundos no ar.</Destaque></Manchete>
    <Manchete de={F.giro} ate={F.nuvem - 4}>Jatos opostos{"\n"}<Destaque>fazem o carro girar.</Destaque></Manchete>
    <Manchete de={F.nuvem} ate={F.teto - 4}>A nuvem branca{"\n"}<Destaque>não é fumaça.</Destaque></Manchete>
    <Manchete de={F.teto} ate={F.cta - 4}><Destaque cor={LARANJA}>3% menos pressão,</Destaque>{"\n"}e o ar prende{"\n"}o carro no teto.</Manchete>
    <Manchete de={F.cta} ate={T.marca}>Segue pra ver a ciência{"\n"}<Destaque>por trás das notícias.</Destaque></Manchete>
    <Fonte texto="FONTE: TESLA, 15/10/2026 · CONTAS: ESTIMATIVA" ate={T.marca} />
    <Marca de={T.marca} />
    <Narracao />
    {/* scripts/gerar-trilha-roadster.mjs: os eventos caem nos quadros das cenas */}
    <Audio src={staticFile("ciencia/trilha-roadster.mp3")} volume={0.22} />
  </Fundo>
);
