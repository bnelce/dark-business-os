// Gera os dados do reel "o fogo do Ceará ainda nem começou" (ciencia/FogoCeara) a partir
// dos focos de queimada do INPE (Programa Queimadas).
//
//   node scripts/gerar-fogo-ce.mjs <pasta dados/ do reel do fogo> <dados/ da apuração> <saída .json>
//
// Mesma regra do reel do Pará: tudo que compara anos ou meses usa só o satélite de
// referência (AQUA_M-T, série desde 2003); o mapa de outubro de 2026 usa o GOES-19.
// A série vai até 2025, o último ano completo. Nenhum número do vídeo é digitado à mão.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoMercator, geoPath, geoArea } from "d3-geo";

const [DADOS, GEO, SAIDA] = process.argv.slice(2);
if (!DADOS || !GEO || !SAIDA) throw new Error("uso: gerar-fogo-ce.mjs <dados/> <dados da apuração/> <saída.json>");

const ANOS = Array.from({ length: 23 }, (_, i) => 2003 + i); // 2003-2025
const HOJE = { mes: 10, dia: 28 };
const CELULA = 0.05; // ~5,5 km

const ler = (texto) => {
  const linhas = texto.split("\n").filter(Boolean);
  const cab = linhas[0].split(",").map((c) => c.trim());
  return linhas.slice(1).map((l) => {
    const v = l.split(",");
    return Object.fromEntries(cab.map((c, i) => [c, (v[i] ?? "").trim()]));
  });
};
const unzip = (arq) => execFileSync("unzip", ["-p", arq], { maxBuffer: 1 << 30 }).toString("utf-8");
const diaDoAno = (d) => {
  const t = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.floor((t - Date.UTC(+d.slice(0, 4), 0, 1)) / 86400e3); // 0..365
};
const antesDeHoje = (d) => +d.slice(5, 7) < HOJE.mes || (+d.slice(5, 7) === HOJE.mes && +d.slice(8, 10) < HOJE.dia);

// --- focos de referência do Ceará, 2003-2025 --------------------------------------------
const focos = [];
for (const ano of ANOS) {
  const linhas = ano === 2025
    ? ler(unzip(join(DADOS, "focos_br_ref_2025.zip"))).filter((r) => r.estado === "CEARÁ")
    : ler(unzip(join(DADOS, "ce_ref", `focos_br_ce_ref_${ano}.zip`)));
  for (const r of linhas) focos.push({ ano, d: r.data_pas, lat: +r.lat, lon: +r.lon, mun: r.municipio });
}

const total = Object.fromEntries(ANOS.map((a) => [a, 0]));
const porMes = Array(12).fill(0);
const porSemana = Array(52).fill(0);
let antes = 0;
for (const f of focos) {
  total[f.ano]++;
  porMes[+f.d.slice(5, 7) - 1]++;
  porSemana[Math.min(51, Math.floor(diaDoAno(f.d) / 7))]++;
  if (antesDeHoje(f.d)) antes++;
}
const N = focos.length;
const pctOutDez = (porMes[9] + porMes[10] + porMes[11]) / N;
const pctNovDez = (porMes[10] + porMes[11]) / N;
const pctFalta = 1 - antes / N; // em média, quanto do fogo do ano vem depois de hoje

// Conferido em 28/10/2026 com a mesma conta feita à parte.
if (total[2025] !== 7852 || total[2014] !== 2327 || Math.round(pctOutDez * 100) !== 86 || Math.round(pctNovDez * 100) !== 67) {
  throw new Error(`série não bate com o conferido: 2025=${total[2025]} 2014=${total[2014]} out-dez=${pctOutDez} nov-dez=${pctNovDez}`);
}
// "pior desde X": o último ano antes de 2025 com mais focos que 2025.
const piorDesde = [...ANOS].reverse().find((a) => a < 2025 && total[a] > total[2025]);

// --- geografia ---------------------------------------------------------------------------
const ufs = JSON.parse(readFileSync(join(GEO, "br-uf.json"), "utf-8"));
for (const ft of ufs.features) {
  if (geoArea(ft) > 2 * Math.PI) {
    const g = ft.geometry;
    for (const p of g.type === "Polygon" ? [g.coordinates] : g.coordinates) for (const anel of p) anel.reverse();
  }
}
const ceara = ufs.features.find((ft) => String(ft.properties.codarea) === "23");
const proj = geoMercator().fitExtent([[120, 540], [960, 1300]], ceara);
const caminho = geoPath(proj);
const contorno = caminho(ceara);
const vizinhos = ufs.features.filter((ft) => ft !== ceara).map((ft) => caminho(ft));

// Células com a contagem por ano (23 posições): o mapa acumula ano a ano.
const celulas = new Map();
for (const f of focos) {
  const k = `${Math.floor(f.lon / CELULA)},${Math.floor(f.lat / CELULA)}`;
  let c = celulas.get(k);
  if (!c) celulas.set(k, (c = { lon: (Math.floor(f.lon / CELULA) + 0.5) * CELULA, lat: (Math.floor(f.lat / CELULA) + 0.5) * CELULA, anos: Array(23).fill(0) }));
  c.anos[f.ano - 2003]++;
}
const mapa23 = [...celulas.values()].map((c) => {
  const [x, y] = proj([c.lon, c.lat]);
  return [+x.toFixed(1), +y.toFixed(1), ...c.anos];
});

// Municípios com mais focos em 23 anos, na sede (coordenadas do IBGE, código 23xxxxx).
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const sede = {};
for (const linha of readFileSync(join(GEO, "municipios.csv"), "utf-8").split("\n").slice(1)) {
  const [ibge, nome, lat, lon] = linha.split(",");
  if (ibge?.startsWith("23")) sede[semAcento(nome)] = { nome, lonlat: [+lon, +lat] };
}
const contaMun = {};
for (const f of focos) contaMun[f.mun] = (contaMun[f.mun] ?? 0) + 1;
const topo = Object.entries(contaMun).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([mun, n]) => {
  const s = sede[semAcento(mun)];
  if (!s) throw new Error(`município sem sede no IBGE: ${mun}`);
  const [x, y] = proj(s.lonlat);
  return { nome: s.nome, focos: n, x: +x.toFixed(1), y: +y.toFixed(1) };
});

// --- outubro de 2026 no mapa: GOES-19 ----------------------------------------------------
const out26 = new Map();
for (const r of ler(readFileSync(join(DADOS, "focos_mensal_br_202610.csv"), "utf-8"))) {
  if (r.satelite !== "GOES-19" || r.estado !== "CEARÁ") continue;
  const k = `${Math.floor(+r.lon / CELULA)},${Math.floor(+r.lat / CELULA)}`;
  if (!out26.has(k)) out26.set(k, proj([(Math.floor(+r.lon / CELULA) + 0.5) * CELULA, (Math.floor(+r.lat / CELULA) + 0.5) * CELULA]));
}
const outubro2026 = [...out26.values()].map(([x, y]) => [+x.toFixed(1), +y.toFixed(1)]);

const diaHoje = diaDoAno(`2026-${String(HOJE.mes).padStart(2, "0")}-${String(HOJE.dia).padStart(2, "0")}`);
writeFileSync(SAIDA, JSON.stringify({
  fonte: "INPE, Programa Queimadas: Ceará, satélite de referência AQUA_M-T 2003-2025; GOES-19 em outubro de 2026",
  anos: ANOS, total, porMes, porSemana, pctOutDez, pctNovDez, pctFalta, piorDesde, diaHoje,
  topo, contorno, vizinhos, mapa23, outubro2026,
}));
console.log(`${N} focos de referência · out-dez ${(pctOutDez * 100).toFixed(1)}% · nov-dez ${(pctNovDez * 100).toFixed(1)}% · depois de 28/10: ${(pctFalta * 100).toFixed(1)}%`);
console.log(`média por mês: ${porMes.map((v) => Math.round(v / 23)).join(" ")}`);
console.log(`2025 = ${total[2025]}, pior desde ${piorDesde} (${total[piorDesde]}) · mínimo ${Math.min(...Object.values(total))}`);
console.log(`mapa: ${mapa23.length} células em 23 anos · outubro/2026 (GOES-19): ${outubro2026.length} células`);
console.log("municípios:", topo.map((m) => `${m.nome} ${m.focos}`).join(" · "));
