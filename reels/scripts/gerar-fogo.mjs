// Gera os dados do reel "o Pará nunca queimou tanto" (ciencia/Fogo) a partir dos focos
// de queimada do INPE (Programa Queimadas, dataserver-coids.inpe.br).
//
//   node scripts/gerar-fogo.mjs <pasta dados/ do reel> <dados/ da apuração> <saída .json>
//
// Duas contagens diferentes, de propósito:
//   - Comparação entre anos: só o satélite de referência do INPE (AQUA_M-T), o único com
//     série desde 2003. Somar satélites contaria o mesmo fogo várias vezes.
//   - Imagem (mapa do mês e as 24 horas): só o GOES-19, geoestacionário, que olha o Brasil
//     a cada 10 minutos. É a passagem regular que deixa ver o ciclo do dia.
// Horários em Brasília (GMT-3). Nenhum número do vídeo é digitado à mão.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoMercator, geoPath, geoArea } from "d3-geo";

const [DADOS, GEO, SAIDA] = process.argv.slice(2);
if (!DADOS || !GEO || !SAIDA) throw new Error("uso: gerar-fogo.mjs <dados/> <dados da apuração/> <saída.json>");

const REF = "AQUA_M-T", GOES = "GOES-19";
const ATE_DIA = 27; // 1 a 27 de outubro: o último dia completo quando os dados foram baixados
const DIA_24H = "2026-10-26"; // o mensal ainda não tinha 27/10 depois das 21h de Brasília

/** CSV do INPE: sem aspas, campos com espaços à toa. */
const ler = (texto) => {
  const linhas = texto.split("\n").filter(Boolean);
  const cab = linhas[0].split(",").map((c) => c.trim());
  return linhas.slice(1).map((l) => {
    const v = l.split(",");
    return Object.fromEntries(cab.map((c, i) => [c, (v[i] ?? "").trim()]));
  });
};
const unzip = (arq) => execFileSync("unzip", ["-p", arq], { maxBuffer: 1 << 30 }).toString("utf-8");

/** "2026-10-27 18:10:00" em GMT → { dia (data de Brasília), min (minuto do dia em Brasília) }. */
const brasilia = (gmt) => {
  const t = new Date(`${gmt.replace(" ", "T")}Z`).getTime() - 3 * 3600e3;
  const d = new Date(t);
  return { dia: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes(), t };
};

// --- comparação entre anos: Pará, 1 a 27 de outubro, satélite de referência -------------
const historico = {};
for (const arq of readdirSync(join(DADOS, "pa_ref")).filter((a) => a.endsWith(".zip")).sort()) {
  const ano = +arq.match(/(\d{4})\.zip$/)[1];
  historico[ano] = ler(unzip(join(DADOS, "pa_ref", arq)))
    .filter((r) => r.data_pas.slice(5, 7) === "10" && +r.data_pas.slice(8, 10) <= ATE_DIA).length;
}
// 2025 não tem arquivo por estado; vem do nacional de referência, filtrado.
historico[2025] = ler(unzip(join(DADOS, "focos_br_ref_2025.zip")))
  .filter((r) => r.estado === "PARÁ" && r.data_pas.slice(5, 7) === "10" && +r.data_pas.slice(8, 10) <= ATE_DIA).length;

const mes = ler(readFileSync(join(DADOS, "focos_mensal_br_202610.csv"), "utf-8"));
// Os anteriores contam pela data do arquivo de referência (data_pas, GMT); 2026 conta igual.
historico[2026] = mes.filter((r) => r.satelite === REF && r.estado === "PARÁ" && +r.data_hora_gmt.slice(8, 10) <= ATE_DIA).length;

// Conferido em 28/10/2026: se mudar, os dados ou o método mudaram.
if (historico[2026] !== 11274 || historico[2023] !== 9205 || historico[2025] !== 2948) {
  throw new Error(`histórico não bate com o conferido: ${JSON.stringify(historico)}`);
}

// --- geografia ---------------------------------------------------------------------------
const ufs = JSON.parse(readFileSync(join(GEO, "br-uf.json"), "utf-8"));
for (const ft of ufs.features) {
  if (geoArea(ft) > 2 * Math.PI) {
    const g = ft.geometry;
    for (const p of g.type === "Polygon" ? [g.coordinates] : g.coordinates) for (const anel of p) anel.reverse();
  }
}
const para = ufs.features.find((ft) => String(ft.properties.codarea) === "15");
if (!para) throw new Error("Pará (código 15) não encontrado na malha do IBGE");
const projBR = geoMercator().fitExtent([[110, 530], [950, 1300]], ufs); // abaixo da linha de status
const projPA = geoMercator().fitExtent([[110, 470], [970, 1260]], para);
const contornosBR = ufs.features.map((ft) => geoPath(projBR)(ft));
const contornosPA = { para: geoPath(projPA)(para), vizinhos: ufs.features.filter((ft) => ft !== para).map((ft) => geoPath(projPA)(ft)) };

const coordMun = {};
for (const linha of readFileSync(join(GEO, "municipios.csv"), "utf-8").split("\n").slice(1)) {
  const [ibge, nome, lat, lon] = linha.split(",");
  if (ibge) coordMun[ibge] = { nome, lonlat: [+lon, +lat] };
}

// --- o mês no mapa: GOES-19, Brasil, células de 0,2°, acendem na primeira detecção ------
const INICIO = new Date("2026-10-01T00:00:00Z").getTime(); // 1/10 00:00 em Brasília, no relógio deslocado
const CELULA = 0.2;
const celulas = new Map();
for (const r of mes) {
  if (r.satelite !== GOES || r.pais !== "Brasil") continue;
  // Mesmo recorte da contagem (data GMT do arquivo), pra o mapa mostrar os mesmos dias.
  if (+r.data_hora_gmt.slice(8, 10) > ATE_DIA) continue;
  const { t } = brasilia(r.data_hora_gmt);
  const lat = +r.lat, lon = +r.lon;
  const k = `${Math.floor(lon / CELULA)},${Math.floor(lat / CELULA)}`;
  const quando = Math.max(0, (t - INICIO) / 86400e3); // dias desde 1/10 em Brasília
  const c = celulas.get(k);
  if (!c) celulas.set(k, { lon: (Math.floor(lon / CELULA) + 0.5) * CELULA, lat: (Math.floor(lat / CELULA) + 0.5) * CELULA, quando, n: 1, pa: 0 });
  else { c.n++; if (quando < c.quando) c.quando = quando; }
  if (r.estado === "PARÁ") celulas.get(k).pa++;
}
const mapaMes = [...celulas.values()]
  // 5º campo: 1 se a maioria das detecções da célula caiu no Pará (pra destacar o estado).
  .map((c) => { const [x, y] = projBR([c.lon, c.lat]); return [+x.toFixed(1), +y.toFixed(1), +c.quando.toFixed(3), c.n, c.pa * 2 > c.n ? 1 : 0]; })
  .sort((a, b) => a[2] - b[2]);

// --- 24 horas no Pará: GOES-19, cada detecção com seu minuto -----------------------------
const dia24 = [];
const porHora = Array(24).fill(0);
for (const r of mes) {
  if (r.satelite !== GOES || r.estado !== "PARÁ") continue;
  const { dia, min } = brasilia(r.data_hora_gmt);
  if (dia !== DIA_24H) continue;
  const [x, y] = projPA([+r.lon, +r.lat]);
  dia24.push([+x.toFixed(1), +y.toFixed(1), min]);
  porHora[Math.floor(min / 60)]++;
}
dia24.sort((a, b) => a[2] - b[2]);
const horaPico = porHora.indexOf(Math.max(...porHora));
if (porHora.slice(21).some((n) => n === 0)) throw new Error(`as 24h de ${DIA_24H} parecem incompletas: ${porHora.join(" ")}`);

// --- onde mais queimou: municípios do Pará, outubro, satélite de referência --------------
const contaMun = {};
for (const r of mes) {
  if (r.satelite !== REF || r.estado !== "PARÁ" || +r.data_hora_gmt.slice(8, 10) > ATE_DIA) continue;
  contaMun[r.municipio_id] = (contaMun[r.municipio_id] ?? 0) + 1;
}
const topo = Object.entries(contaMun).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => {
  const m = coordMun[id];
  if (!m) throw new Error(`município ${id} sem coordenada`);
  const [x, y] = projPA(m.lonlat);
  return { nome: m.nome, focos: n, x: +x.toFixed(1), y: +y.toFixed(1) };
});
const somaTopo = topo.reduce((s, m) => s + m.focos, 0);

writeFileSync(SAIDA, JSON.stringify({
  fonte: "INPE, Programa Queimadas: focos de 1 a 27 de outubro (AQUA_M-T para a série, GOES-19 para os mapas)",
  ateDia: ATE_DIA, dia24h: DIA_24H,
  historico, porHora, horaPico, topo, somaTopo,
  contornosBR, indicePA: ufs.features.indexOf(para), contornosPA, mapaMes, dia24,
}));
console.log("Pará, 1–27/out, satélite de referência:", Object.entries(historico).map(([a, n]) => `${a}:${n}`).join(" "));
console.log(`mapa do mês: ${mapaMes.length} células · 24h no Pará: ${dia24.length} detecções, pico às ${horaPico}h (${porHora[horaPico]})`);
console.log(`por hora: ${porHora.join(" ")}`);
console.log("municípios:", topo.map((m) => `${m.nome} ${m.focos}`).join(" · "), `· soma ${somaTopo} de ${historico[2026]}`);
