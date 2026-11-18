// Gera os dados do reel "a apuração que enganou" (ciencia/Apuracao) a partir dos
// Boletins de Urna do TSE, já agregados por seção por scripts/eleicoes/baixa.sh.
//
//   node scripts/gerar-apuracao.mjs <pasta dados/ do reel> <saída .json> [turno: 1|2]
//
// A apuração é reconstruída ordenando as seções por DT_BU_RECEBIDO (hora em que o
// boletim chegou ao TSE) e acumulando. A "ordem aleatória" é a mesma lista embaralhada
// com semente fixa, pra o vídeo sair igual a cada render. Nenhum número do vídeo é
// digitado à mão: tudo sai daqui, e o script confere o total contra o oficial.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoMercator, geoPath, geoArea } from "d3-geo";

const [DADOS, SAIDA, TURNO = "1"] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-apuracao.mjs <dados/> <saída.json> [turno]");

// Totais oficiais (TSE, 100% das seções). Se a soma não bater, os dados estão errados.
const OFICIAL = {
  1: { lula: 53879538, flavio: 56104503, fonte: "TSE, Boletim de Urna, 1º turno de 04/10/2026, Presidente" },
  2: { lula: 64256232, flavio: 59826041, fonte: "TSE, Boletim de Urna, 2º turno de 25/10/2026, Presidente" },
}[TURNO];
if (!OFICIAL) throw new Error(`turno inválido: ${TURNO}`);

const LULA = "13", FLAVIO = "22";
const REGIAO = {
  N: "AC AM AP PA RO RR TO", NE: "AL BA CE MA PB PE PI RN SE", CO: "DF GO MS MT",
  SE: "ES MG RJ SP", S: "PR RS SC", EXT: "ZZ",
};
const regiaoDe = Object.fromEntries(Object.entries(REGIAO).flatMap(([r, ufs]) => ufs.split(" ").map((u) => [u, r])));

/** CSV mínimo: o csv.writer do Python só põe aspas quando precisa, e dobra as internas. */
const campos = (linha) => {
  const out = [];
  let i = 0;
  while (i <= linha.length) {
    if (linha[i] === '"') {
      let s = "";
      i++;
      for (;;) {
        const j = linha.indexOf('"', i);
        s += linha.slice(i, j);
        if (linha[j + 1] === '"') { s += '"'; i = j + 2; } else { i = j + 2; break; }
      }
      out.push(s);
    } else {
      const j = linha.indexOf(",", i);
      const fim = j < 0 ? linha.length : j;
      out.push(linha.slice(i, fim));
      i = fim + 1;
    }
  }
  return out;
};

const secoes = [];
for (const arq of readdirSync(join(DADOS, "secoes")).filter((a) => a.endsWith(".csv"))) {
  for (const linha of readFileSync(join(DADOS, "secoes", arq), "utf-8").split("\n")) {
    if (!linha) continue;
    const [t, uf, mun, , , , , , v] = campos(linha);
    const votos = JSON.parse(v);
    let validos = 0;
    for (const [nr, q] of Object.entries(votos)) if (nr !== "95" && nr !== "96") validos += q;
    secoes.push({ t, uf, mun, validos, l: votos[LULA] ?? 0, f: votos[FLAVIO] ?? 0, votos });
  }
}
secoes.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
const N = secoes.length;

const total = secoes.reduce((s, x) => ({ l: s.l + x.l, f: s.f + x.f }), { l: 0, f: 0 });
if (total.l !== OFICIAL.lula || total.f !== OFICIAL.flavio) {
  throw new Error(`total não bate com o oficial: Lula ${total.l}, Flávio ${total.f}`);
}

// --- curvas: um ponto a cada 0,1% das seções -------------------------------------------
const PASSOS = 1000;
const curva = (ordem) => {
  const pts = [];
  let l = 0, f = 0, v = 0, k = 1;
  ordem.forEach((s, i) => {
    l += s.l; f += s.f; v += s.validos;
    while (k <= PASSOS && i + 1 >= Math.round((k / PASSOS) * N)) {
      pts.push([+(l / v * 100).toFixed(3), +(f / v * 100).toFixed(3), s.t.slice(11, 16)]);
      k++;
    }
  });
  return pts; // índice k-1 = k/10 % das seções
};

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const embaralhada = secoes.slice();
const rnd = mulberry32(2026);
for (let i = N - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [embaralhada[i], embaralhada[j]] = [embaralhada[j], embaralhada[i]];
}

const real = curva(secoes);
const aleatoria = curva(embaralhada);

// --- quantas urnas bastam: sorteios de n seções, % do Flávio em cada um ----------------
// Cada sorteio pega n seções ao acaso (com reposição) e calcula o % do Flávio nos votos
// válidos delas. A faixa de erro é o intervalo que contém 95% dos sorteios.
const SORTEIOS = 300;
const amostras = [10, 100, 1000, 10000].map((tam) => {
  const est = [];
  for (let k = 0; k < SORTEIOS; k++) {
    let f = 0, v = 0;
    for (let j = 0; j < tam; j++) {
      const s = secoes[Math.floor(rnd() * N)];
      f += s.f; v += s.validos;
    }
    est.push(+(f / v * 100).toFixed(2));
  }
  const ord = est.slice().sort((x, y) => x - y);
  const erro = (ord[Math.floor(SORTEIOS * 0.975) - 1] - ord[Math.floor(SORTEIOS * 0.025)]) / 2;
  return { urnas: tam, erro: +erro.toFixed(2), sorteios: est };
});
let pico = 0;
real.forEach((p, i) => { if (i >= 5 && p[1] > real[pico][1]) pico = i; });
const acima50 = real.map((p, i) => (p[1] > 50 ? i : -1)).filter((i) => i >= 5);

// --- regiões: fração dos votos válidos de cada região já chegada, a cada 1% -----------
const validosRegiao = {};
for (const s of secoes) {
  const r = regiaoDe[s.uf];
  validosRegiao[r] = (validosRegiao[r] ?? 0) + s.validos;
}
const regioes = Object.fromEntries(Object.keys(REGIAO).map((r) => [r, []]));
{
  const acc = {};
  let k = 0;
  secoes.forEach((s, i) => {
    const r = regiaoDe[s.uf];
    acc[r] = (acc[r] ?? 0) + s.validos;
    while (k <= 100 && i + 1 >= Math.round((k / 100) * N)) {
      for (const rr of Object.keys(REGIAO)) regioes[rr].push(+((acc[rr] ?? 0) / validosRegiao[rr]).toFixed(4));
      k++;
    }
  });
}

// --- mapa ------------------------------------------------------------------------------
// O GeoJSON do IBGE vem no sentido RFC 7946 (anel externo anti-horário); o d3-geo usa o
// sentido oposto e, sem inverter, desenha o planeta inteiro menos o estado.
const ufs = JSON.parse(readFileSync(join(DADOS, "br-uf.json"), "utf-8"));
for (const ft of ufs.features) {
  if (geoArea(ft) > 2 * Math.PI) {
    const g = ft.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const p of polys) for (const anel of p) anel.reverse();
  }
}
// Quadro do mapa no vídeo 1080x1920 (ver Apuracao.tsx: MAPA_*).
const proj = geoMercator().fitExtent([[110, 450], [950, 1240]], ufs);
const caminho = geoPath(proj);
const contornos = ufs.features.map((ft) => caminho(ft));

const ibgePorTse = {};
for (const abr of JSON.parse(readFileSync(join(DADOS, "mun-cm.json"), "utf-8")).abr) {
  for (const m of abr.mu) ibgePorTse[`${abr.cd.toUpperCase()}-${m.cd}`] = m.cdi;
}
const coord = {};
for (const linha of readFileSync(join(DADOS, "municipios.csv"), "utf-8").split("\n").slice(1)) {
  const [ibge, , lat, lon] = linha.split(",");
  if (ibge) coord[ibge] = [+lon, +lat];
}

// Por município: votos válidos e em que ponto da apuração (0..100% das seções) chegaram
// 25%, 50%, 75% e 100% dos seus votos — o ponto acende aos poucos, como no painel —, e
// quem liderava no município em cada um desses marcos, contando só as urnas já chegadas
// (1 = Lula, 2 = Flávio, 0 = outro candidato ou empate). As urnas não têm coordenada
// própria, só o município, então o ponto é o município e a cor é a liderança nele.
const porMun = new Map();
secoes.forEach((s, i) => {
  if (s.uf === "ZZ") return;
  const chave = `${s.uf}-${s.mun.padStart(5, "0")}`;
  let m = porMun.get(chave);
  if (!m) porMun.set(chave, (m = { chave, uf: s.uf, chegadas: [] }));
  m.chegadas.push([(i + 1) / N * 100, s.validos, s.votos]);
});
const semCoord = [];
const municipios = [];
for (const m of porMun.values()) {
  const c = coord[ibgePorTse[m.chave]];
  if (!c) { semCoord.push(m.chave); continue; }
  const [x, y] = proj(c);
  const v = m.chegadas.reduce((s, [, q]) => s + q, 0);
  const marcos = [], lideres = [];
  const acc = {};
  let a = 0, q = 0;
  const QS = [0.25, 0.5, 0.75, 1];
  for (const [p, qv, votos] of m.chegadas) {
    a += qv;
    for (const [nr, n] of Object.entries(votos)) if (nr !== "95" && nr !== "96") acc[nr] = (acc[nr] ?? 0) + n;
    while (q < QS.length && a >= QS[q] * v - 1e-9) {
      const ordem = Object.entries(acc).sort((x, y) => y[1] - x[1]);
      const empate = ordem.length > 1 && ordem[0][1] === ordem[1][1];
      lideres.push(empate ? 0 : ordem[0][0] === LULA ? 1 : ordem[0][0] === FLAVIO ? 2 : 0);
      marcos.push(+p.toFixed(2));
      q++;
    }
  }
  municipios.push([+x.toFixed(1), +y.toFixed(1), v, ...marcos, ...lideres]);
}
if (semCoord.length) console.warn(`${semCoord.length} municípios sem coordenada:`, semCoord.slice(0, 10));
municipios.sort((a, b) => a[2] - b[2]); // grandes por cima

writeFileSync(SAIDA, JSON.stringify({
  fonte: OFICIAL.fonte,
  secoes: N,
  final: { lula: real.at(-1)[0], flavio: real.at(-1)[1] },
  pico: { i: pico, flavio: real[pico][1], hora: real[pico][2] },
  acima50: { de: acima50[0], ate: acima50.at(-1) },
  real, aleatoria, amostras, regioes, contornos, municipios,
}));
console.log(`${N} seções · pico Flávio ${real[pico][1]}% em ${(pico + 1) / 10}% às ${real[pico][2]}`);
console.log(`acima de 50%: ${(acima50[0] + 1) / 10}% a ${(acima50.at(-1) + 1) / 10}% das seções`);
console.log(`final ${real.at(-1)[0]} × ${real.at(-1)[1]} · aleatória com 0,1%: ${aleatoria[0][0]} × ${aleatoria[0][1]}`);
const ganhou = [0, 0, 0];
for (const m of municipios) ganhou[m[10]]++;
console.log(`erro (95%) por tamanho de sorteio: ${amostras.map((a) => `${a.urnas} urnas ±${a.erro}`).join(' · ')}`);
console.log(`${municipios.length} municípios no mapa · venceu Lula ${ganhou[1]}, Flávio ${ganhou[2]}, outro/empate ${ganhou[0]}`);
