// Números e mapa do reel "GTA VI pelo fuso da Nova Zelândia" (ciencia/Gta6Nz, 18/11/2026).
//
//   node scripts/gerar-gta6-nz.mjs <pasta do reel> src/ciencia/gta6-nz.json
//
// Os insumos ficam aqui, com a fonte do lado; o resto é conta. O script confere cada número da fala
// (roteiro.json) contra a conta e para se algum não bater.
//
// Mapa: Natural Earth 110m (world-atlas, domínio público), equirretangular centrado em 62,5° L, pra
// caber do Brasil à Linha da Data numa faixa só. A "meia-noite" que anda é a dos fusos civis: um fuso
// UTC+o vira o dia às (24 − o) h UTC, e o traço fica na longitude nominal do fuso (15° × o). Por isso
// a Nova Zelândia (UTC+13 no horário de verão, longitude nominal 195°) vira o dia com o traço um pouco
// a leste da Linha da Data, e o Brasil (UTC−3, 45° O) 16 horas depois.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { feature } from "topojson-client";
import { geoEquirectangular, geoPath } from "d3-geo";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: gerar-gta6-nz.mjs <pasta do reel> <saída.json>");
const confere = (ok, msg) => { if (!ok) throw new Error(`não confere: ${msg}`); };

// --- insumos -----------------------------------------------------------------------------------
const GRAUS_POR_HORA = 360 / 24; // rotação da Terra (dia solar)
const NZ_UTC = 13; // NZDT, horário de verão de 27/9/2026 a 4/4/2027 (NZ Daylight Time Order 2007: último domingo de setembro ao 1º de abril)
const BR_UTC = -3; // Brasília, sem horário de verão desde o Decreto 9.772/2019
// A Rockstar libera "à meia-noite local de 19/11, em todas as regiões" (suporte Rockstar, atualizado em 3/11/2026)
const GTA5 = "2013-09-17"; // GTA V, PS3 e Xbox 360 (Rockstar, via The Next Web, 31/1/2013)
const GTA6 = "2026-11-19";
const NZD_PADRAO = "139,95"; // GTA VI Standard na PS Store da Nova Zelândia (Unilad Tech 17/11; GameRant)
// Cidades que o traço da meia-noite atravessa (fuso de novembro de 2026)
const CIDADES = [
  { id: "auckland", nome: "NOVA ZELÂNDIA", lon: 174.76, lat: -36.85, utc: NZ_UTC },
  { id: "toquio", nome: "TÓQUIO", lon: 139.69, lat: 35.69, utc: 9 },
  { id: "londres", nome: "LONDRES", lon: -0.13, lat: 51.51, utc: 0 },
  { id: "brasilia", nome: "BRASÍLIA", lon: -47.93, lat: -15.78, utc: BR_UTC },
];

// --- a conta -----------------------------------------------------------------------------------
confere(GRAUS_POR_HORA === 15, "15° por hora");
const virada = (utc) => 24 - utc; // hora UTC (contada a partir da 0h de 18/11) em que o fuso vira 19/11
const nzVira = virada(NZ_UTC), brVira = virada(BR_UTC);
confere(nzVira === 11, "NZ vira às 11:00 UTC de 18/11");
confere(brVira === 27, "Brasil vira às 03:00 UTC de 19/11");
const nzEmBrasilia = nzVira + BR_UTC;
confere(nzEmBrasilia === 8, "8h de Brasília");
const antes = brVira - nzVira;
confere(antes === 16, "16 horas");
const dias = (Date.parse(GTA6) - Date.parse(GTA5)) / 864e5;
const anos = Math.floor(dias / 365.2425);
confere(anos === 13, `13 anos (${dias} dias)`);

const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const fala = Object.fromEntries(roteiro.beats.map((b) => [b.id, b.narracao]));
const tem = (id, trecho) => confere(fala[id].includes(trecho), `fala ${id} sem "${trecho}"`);
tem("gancho", "desde as 8 da manhã"); tem("gancho", "à meia-noite");
tem("ciencia", "15 graus por hora"); tem("ciencia", "de leste para oeste"); tem("ciencia", "16 horas antes de Brasília");
tem("ciencia", "horário de verão");
tem("fecho", "13 anos"); tem("fecho", "16 horas");
tem("ps5", "dólar neozelandês");
confere(roteiro.legenda.corpo.includes(`NZ$ ${NZD_PADRAO}`), "preço NZ na legenda");

// --- mapa --------------------------------------------------------------------------------------
const LON0 = -75, LON1 = 205, LAT0 = 72, LAT1 = -50;
const X0 = 50, X1 = 1030;
const k = (X1 - X0) / (LON1 - LON0); // px por grau
const proj = geoEquirectangular().rotate([-(LON0 + LON1) / 2, 0]).scale((k * 180) / Math.PI)
  .translate([(X0 + X1) / 2, 0]);
const yTopo = proj([0, LAT0])[1];
proj.translate([(X0 + X1) / 2, 600 - yTopo]); // o topo do mapa em y = 600
proj.clipExtent([[X0, proj([0, LAT0])[1]], [X1, proj([0, LAT1])[1]]]);
const caminho = geoPath(proj);
caminho.digits?.(1);
const xLon = (lon) => +(proj([lon, 0])[0]).toFixed(1);
confere(Math.abs(xLon(LON0) - X0) < 0.5 && Math.abs(xLon(LON1) - X1) < 0.5, "faixa do mapa");
const ponto = (lon, lat) => proj([lon, lat]).map((v) => +v.toFixed(1));

const terra = JSON.parse(readFileSync(new URL("../node_modules/world-atlas/land-110m.json", import.meta.url), "utf-8"));
const paises = JSON.parse(readFileSync(new URL("../node_modules/world-atlas/countries-110m.json", import.meta.url), "utf-8"));
const fcPaises = feature(paises, paises.objects.countries);
const pais = (n) => {
  const f = fcPaises.features.find((x) => x.properties.name === n);
  confere(f, `país ${n}`);
  return caminho(f);
};

const out = {
  grausHora: GRAUS_POR_HORA, nzUtc: NZ_UTC, brUtc: BR_UTC, nzVira, brVira, nzEmBrasilia, antes, anos, nzd: NZD_PADRAO,
  mapa: {
    y0: +proj([0, LAT0])[1].toFixed(1), y1: +proj([0, LAT1])[1].toFixed(1), x0: X0, x1: X1,
    // x = a + b × longitude
    a: +xLon(0).toFixed(2), b: +k.toFixed(5),
    terra: caminho(feature(terra, terra.objects.land)),
    nz: pais("New Zealand"), br: pais("Brazil"),
    linhaData: xLon(180),
    cidades: CIDADES.map((c) => ({ ...c, xy: ponto(c.lon, c.lat), vira: virada(c.utc) })),
  },
};
writeFileSync(SAIDA, `${JSON.stringify(out, null, 1)}\n`);
console.log(`NZ vira às ${nzVira}:00 UTC = ${nzEmBrasilia}h de Brasília · Brasil às ${brVira - 24}:00 UTC de 19/11 · ${antes} h · ${anos} anos (${dias} dias)`);
console.log(`mapa y ${out.mapa.y0}–${out.mapa.y1} · Linha da Data em x ${out.mapa.linhaData}`);
for (const c of out.mapa.cidades) console.log(`  ${c.nome}: ${c.xy} · vira às ${c.vira} UTC (traço em ${15 * (24 - c.vira)}°)`);
