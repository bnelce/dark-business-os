// Dados do reel do El Niño de 2026 (ciencia/ElNino), versão 2: o fenômeno e o impacto no Brasil
// primeiro, o número como prova do tamanho. Lê a pasta dados/ do reel:
//   oni.ascii.txt   ONI (CPC/NOAA, ERSSTv6), baixado em 09/11/2026. Índice tradicional ("legado").
//   RONI.ascii.txt  RONI (CPC/NOAA), o índice oficial da NOAA desde 01/02/2026 (PNS 26-05).
//   ensodisc.html   ENSO Diagnostic Discussion de 08/10/2026 (chances de evento histórico).
//   br-uf.json      malha dos estados do IBGE (a mesma dos reels da apuração).
//
//   node scripts/gerar-elnino.mjs <dados/ do reel> src/ciencia/elnino.json
//
// Nenhum número do vídeo é digitado na composição: sai daqui. Os números do CPC são conferidos
// contra os arquivos; os fatos de fora (rio Negro, Rio Grande do Sul, Painel El Niño) ficam em FATOS,
// com a fonte do lado, e o script confere a coerência entre eles.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoArea, geoMercator, geoPath } from "d3-geo";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-elnino.mjs <dados/> <saída.json>");

const confere = (ok, msg) => { if (!ok) throw new Error(`não confere: ${msg}`); };
const igual = (a, b, msg) => confere(Math.abs(a - b) < 1e-9, `${msg}: ${a} (esperado ${b})`);

// --- fatos de fora do CPC (conferidos em 09/11/2026, links no README) ----------------------------
const FATOS = {
  // Porto de Manaus (tabela diária) e Espinoza et al. 2024, Sci Rep 14:8107: 12,70 m em 26/10/2023.
  // SGB, 19/10/2023: "o nível mais baixo em 121 anos, desde o início da série histórica na estação em 1902".
  // O recorde caiu em 2024 (12,66 m em 04/10/2024 pelo SGB; mínima de 12,11 m pelo Porto de Manaus).
  manaus: { cota: 12.7, data: "26/10/2023", inicioSerie: 1902, ano: 2023, recorde2024: true },
  // Defesa Civil RS, balanço de 25/04/2025 (estado.rs.gov.br): enchentes de abril–maio de 2024.
  rs2024: { obitos: 184, afetados: 2398255, municipios: 478 },
  // Painel El Niño 2026-2027 (INMET, INPE, ANA, CEMADEN, SGB, SEDEC, CENSIPAM). Boletim nº 4, 30/09/2026:
  // "O cenário é de dois extremos: seca e risco de fogo no centro-norte, e chuva acima da média, com risco de
  // cheias, no Sul." Boletim nº 5, 29/10/2026: nov/2026–jan/2027, chuva acima da normal no Sul; abaixo em
  // grande parte do Norte e em áreas do Nordeste e do Centro-Oeste.
  painel: { boletim4: "30/09/2026", boletim5: "29/10/2026" },
};
confere(FATOS.manaus.ano - FATOS.manaus.inicioSerie === 121, "121 anos de série em 2023");

// --- CPC/NOAA ------------------------------------------------------------------------------------
const ESTACOES = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"];
const ler = (arq, col) => {
  const linhas = readFileSync(join(DADOS, arq), "utf-8").split("\n").map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 3 && p[0] !== "SEAS");
  return Object.fromEntries(linhas.map((p) => [`${p[1]}-${p[0]}`, Number(p[col])]));
};
const ONI = ler("oni.ascii.txt", 3), RONI = ler("RONI.ascii.txt", 2);
const v = (ix, ano, est) => ix[`${ano}-${est}`];
const anos = [...new Set(Object.keys(ONI).map((k) => Number(k.split("-")[0])))];
confere(anos[0] === 1950, "série começa em 1950");
confere(v(ONI, 2026, "ASO") !== undefined && v(ONI, 2026, "SON") === undefined, "ONI termina em ASO 2026");
confere(v(RONI, 2026, "ASO") !== undefined && v(RONI, 2026, "SON") === undefined, "RONI termina em ASO 2026");

// "desde 1950 o Pacífico nunca esquentou tão rápido: de abaixo do normal a 2,5 graus acima, em oito meses"
// = a maior subida de DJF (centro em janeiro) a ASO (centro em setembro), em todos os anos, nos DOIS índices.
const subida = (ix, de) => anos.filter((a) => v(ix, a, "ASO") !== undefined)
  .map((a) => ({ ano: a, de: v(ix, a, de), ate: v(ix, a, "ASO"), d: +(v(ix, a, "ASO") - v(ix, a, de)).toFixed(2) }))
  .sort((x, y) => y.d - x.d || y.ano - x.ano);
for (const [nome, ix] of [["ONI", ONI], ["RONI", RONI]]) {
  for (const de of ["DJF", "JFM", "MAM"]) confere(subida(ix, de)[0].ano === 2026, `maior subida ${de}→ASO no ${nome}: ${subida(ix, de)[0].ano}`);
  confere(subida(ix, "DJF")[1].ano === 1997, `2º lugar no ${nome}: ${subida(ix, "DJF")[1].ano}`);
}
const rankOni = subida(ONI, "DJF").slice(0, 5);
const s26 = rankOni[0];
igual(s26.de, -0.39, "ONI DJF 2026");
igual(s26.ate, 2.46, "ONI ASO 2026");
igual(s26.d, 2.85, "subida ONI 2026");
confere(s26.de < 0, "começou abaixo do normal");
confere(Math.abs(s26.ate - 2.5) <= 0.05, "\"2,5 graus acima\"");
const s26r = subida(RONI, "DJF")[0];
igual(s26r.d, 2.88, "subida RONI 2026");
igual(subida(RONI, "DJF")[1].d, 2.28, "subida RONI 1997");
confere(rankOni.map((r) => r.ano).join() === "2026,1997,1976,1972,1965", `top 5: ${rankOni.map((r) => r.ano)}`);

// "Agora ele voltou" (mais forte que o último, 2023–24) — conferido nos dois índices, fora da fala.
const pico = (ix, a) => Math.max(...[...ESTACOES.slice(6).map((e) => v(ix, a, e)), ...ESTACOES.slice(0, 4).map((e) => v(ix, a + 1, e))].filter((x) => x !== undefined));
confere(v(ONI, 2026, "ASO") > pico(ONI, 2023) && v(RONI, 2026, "ASO") > pico(RONI, 2023), "2026 já passou o pico de 2023–24");

// "A NOAA vê 83% de chance de ele superar todos desde 1950 até dezembro."
const disc = readFileSync(join(DADOS, "ensodisc.html"), "utf-8").replace(/<[^>]+>/g, "").replace(/&#37;/g, "%").replace(/&deg;/g, "°").replace(/\s+/g, " ");
confere(disc.includes("8 October 2026"), "boletim de 8/10/2026");
confere(disc.includes("historic event that would exceed the strength of previous El Ni&ntilde;o events dating back to 1950 (+2.5°C or more for a 3-month RONI value)"), "definição de evento histórico");
confere(disc.includes("the chance is 54% for September-November, 83% for October-December, and 70% for November-January"), "chances 54/83/70");
confere(disc.includes("The next ENSO Diagnostics Discussion is scheduled for 12 November 2026"), "próximo boletim em 12/11");
const maiorRoni = Math.max(...Object.values(RONI));
igual(maiorRoni, 2.4, "maior RONI da série");

// --- mapa do satélite: NOAA Coral Reef Watch, anomalia diária de 7/11/2026 (1787×1085) -------------
// Equirretangular, 4,594 px por grau, 30°E em x=113 e 90°N em y=110 (medido nas linhas de grade do PNG).
const CRW = { largura: 1787, altura: 1085, x0: 113, lon0: 30, y0: 110, lat0: 90, k: 4.594 };
const crwPng = readFileSync(join(DADOS, "..", "fotos-originais", "noaa-crw-anomalia-tsm-global-2026-11-07.png"));
confere(crwPng.readUInt32BE(16) === CRW.largura && crwPng.readUInt32BE(20) === CRW.altura, "tamanho do PNG do CRW");

// --- mapa do Brasil (IBGE), por região --------------------------------------------------------------
const ufs = JSON.parse(readFileSync(join(DADOS, "br-uf.json"), "utf-8"));
for (const ft of ufs.features) {
  if (geoArea(ft) > 2 * Math.PI) { // o GeoJSON do IBGE vem no sentido RFC 7946; o d3-geo usa o oposto
    const g = ft.geometry;
    for (const p of g.type === "Polygon" ? [g.coordinates] : g.coordinates) for (const anel of p) anel.reverse();
  }
}
const COD_UF = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO", 21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB",
  26: "PE", 27: "AL", 28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS", 50: "MS",
  51: "MT", 52: "GO", 53: "DF",
};
const REGIAO_UF = { N: "AC AM AP PA RO RR TO", NE: "AL BA CE MA PB PE PI RN SE", SE: "ES MG RJ SP", S: "PR RS SC", CO: "DF GO MS MT" };
const regiaoDe = Object.fromEntries(Object.entries(REGIAO_UF).flatMap(([r, s]) => s.split(" ").map((u) => [u, r])));
const proj = geoMercator().fitExtent([[110, 470], [970, 1150]], ufs);
const caminho = geoPath(proj);
caminho.digits?.(1);
const estados = ufs.features.map((ft) => {
  const uf = COD_UF[ft.properties.codarea];
  return { uf, r: regiaoDe[uf], d: caminho(ft), c: caminho.centroid(ft).map((x) => +x.toFixed(1)) };
});
confere(estados.length === 27 && estados.every((e) => e.uf && e.r), "27 estados na malha");
const centro = (r) => {
  const es = estados.filter((e) => e.r === r);
  return [0, 1].map((i) => +(es.reduce((s, e) => s + e.c[i], 0) / es.length).toFixed(1));
};
const ponto = (lon, lat) => proj([lon, lat]).map((x) => +x.toFixed(1));

const out = {
  fatos: {
    ...FATOS,
    oniAso2026: s26.ate, oniDjf2026: s26.de, subidaOni: s26.d, subidaRoni: s26r.d, subidaRoni1997: subida(RONI, "DJF")[1].d,
    chance: { SON: 54, OND: 83, NDJ: 70 }, limiar: 2.5, maiorRoni, boletim: "08/10/2026", proximo: "12/11/2026",
  },
  ranking: rankOni,
  crw: CRW,
  brasil: { estados, centros: { N: centro("N"), NE: centro("NE"), S: centro("S") }, manaus: ponto(-60.02, -3.1), portoAlegre: ponto(-51.23, -30.03) },
};
writeFileSync(SAIDA, `${JSON.stringify(out)}\n`);
console.log(`ok: subida DJF→ASO 2026 ${s26.d} no ONI (${s26.de} → ${s26.ate}) e ${s26r.d} no RONI, 1º desde 1950 nos dois; 2º: 1997`);
console.log("top 5 ONI:", rankOni.map((r) => `${r.ano} ${r.de}→${r.ate} (+${r.d})`).join(" · "));
