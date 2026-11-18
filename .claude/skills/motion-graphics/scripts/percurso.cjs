#!/usr/bin/env node
// Projeta trajetos reais (GPX, KML, GeoJSON ou CSV lat,lon) no plano da cidade procedural, em metros,
// ou monta um trajeto esquemático a partir de uma lista ordenada de ruas. Sai um JSON que a animação lê:
// pontos reamostrados a passo fixo (desenho proporcional à distância), marcos de km, altimetria e waypoints.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const C = require("./lib/comum.cjs");

const AJUDA = `Uso:
  node percurso.cjs <trajeto.gpx|.kml|.geojson|.csv> [mais arquivos...] [opções]
  node percurso.cjs --segmentos ruas.txt [opções]

  --saida percurso.json   arquivo de saída (padrão: percurso.json ao lado do primeiro arquivo)
  --nomes "5K,10K"        nome de cada trajeto (padrão: <name> do arquivo ou o nome do arquivo)
  --passo 5               distância entre pontos reamostrados, em metros
  --lonlat                o CSV está como lon,lat (padrão lat,lon[,ele])

Projeção: equirretangular local a partir do centro de todas as entradas; 1 unidade = 1 metro;
x = leste, z = sul (norte é -z, como a câmera padrão do Three.js). Todos os trajetos e pontos
dividem a mesma origem, então 5K e 10K se sobrepõem certo.

--segmentos: uma linha por trecho, na ordem oficial do percurso:
    Av. Beira Mar | L | 1200        (rua | direção N S L O NE NO SE SO ou graus a partir do norte | metros)
    Rua Silva Jatahy | S | 350
    @ Hidratação 1                   (ponto no fim do trecho anterior)
    == 10K                           (começa outro trajeto, de novo na largada)
  O desenho fica esquemático: avise no checklist que não é o mapa oficial.

Saída: { origem, eixos, trajetos: [{ nome, distancia_m, pontos: [[x,z]...], km: [{ km, x, z }],
         altimetria: [{ d, ele }] | null, ganho_m, ruas: [{ nome, de_m, ate_m }] }], pontos: [{ nome, x, z }], caixa }`;

const args = C.lerArgs(process.argv.slice(2), ["lonlat"]);
if (args.ajuda || (!args._.length && !args.segmentos)) { console.log(AJUDA); process.exit(args.ajuda ? 0 : 1); }
const PASSO = C.num(args.passo, 5);
process.on("uncaughtException", (e) => { console.error(e.message || e); process.exit(1); });

// ---------- leitura ----------
const attr = (tag, nome) => { const m = new RegExp(`${nome}\\s*=\\s*["']([^"']+)["']`).exec(tag); return m ? +m[1] : NaN; };
const texto = (bloco, tag) => { const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(bloco); return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : ""; };

function lerGpx(xml, padrao) {
  const trajetos = [], pontos = [];
  const blocos = [...xml.matchAll(/<trk\b[\s\S]*?<\/trk>/g)].map((m) => m[0]).concat([...xml.matchAll(/<rte\b[\s\S]*?<\/rte>/g)].map((m) => m[0]));
  for (const b of blocos) {
    const pts = [...b.matchAll(/<(?:trkpt|rtept)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:trkpt|rtept)>)/g)].map((m) => {
      const ele = m[2] ? parseFloat(texto(m[2], "ele")) : NaN;
      return { lat: attr(m[1], "lat"), lon: attr(m[1], "lon"), ele };
    });
    if (pts.length > 1) trajetos.push({ nome: texto(b.replace(/<(trkseg|trkpt|rtept)[\s\S]*/, ""), "name") || padrao, pts });
  }
  for (const m of xml.matchAll(/<wpt\b([^>]*?)>([\s\S]*?)<\/wpt>/g)) pontos.push({ nome: texto(m[2], "name") || "ponto", lat: attr(m[1], "lat"), lon: attr(m[1], "lon") });
  return { trajetos, pontos };
}

function lerKml(xml, padrao) {
  const trajetos = [], pontos = [];
  for (const m of xml.matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/g)) {
    const pm = m[0], nome = texto(pm, "name");
    const coords = (bloco) => texto(bloco, "coordinates").split(/\s+/).filter(Boolean).map((c) => { const [lon, lat, ele] = c.split(",").map(Number); return { lat, lon, ele }; });
    const linha = /<LineString\b[\s\S]*?<\/LineString>/.exec(pm);
    if (linha) { const pts = coords(linha[0]); if (pts.length > 1) trajetos.push({ nome: nome || padrao, pts }); continue; }
    const ponto = /<Point\b[\s\S]*?<\/Point>/.exec(pm);
    if (ponto) { const [p] = coords(ponto[0]); if (p) pontos.push({ nome: nome || "ponto", ...p }); }
  }
  return { trajetos, pontos };
}

function lerGeojson(txt, padrao) {
  const g = JSON.parse(txt), trajetos = [], pontos = [];
  const feats = g.type === "FeatureCollection" ? g.features : g.type === "Feature" ? [g] : [{ geometry: g, properties: {} }];
  for (const f of feats) {
    const geo = f.geometry || {}, nome = (f.properties && (f.properties.name || f.properties.nome)) || "";
    const conv = (c) => ({ lon: c[0], lat: c[1], ele: c[2] });
    if (geo.type === "LineString") trajetos.push({ nome: nome || padrao, pts: geo.coordinates.map(conv) });
    else if (geo.type === "MultiLineString") trajetos.push({ nome: nome || padrao, pts: geo.coordinates.flat().map(conv) });
    else if (geo.type === "Point") pontos.push({ nome: nome || "ponto", ...conv(geo.coordinates) });
  }
  return { trajetos, pontos };
}

function lerCsv(txt, padrao) {
  const pts = [];
  for (const l of txt.split(/\r?\n/)) {
    const c = l.split(/[,;\t]/).map((x) => x.trim());
    if (c.length < 2 || isNaN(+c[0]) || isNaN(+c[1]) || c[0] === "") continue;
    const [a, b, e] = c.map(Number);
    pts.push(args.lonlat ? { lon: a, lat: b, ele: e } : { lat: a, lon: b, ele: e });
  }
  return { trajetos: pts.length > 1 ? [{ nome: padrao, pts }] : [], pontos: [] };
}

function lerArquivo(arq) {
  const txt = fs.readFileSync(arq, "utf8"), padrao = path.basename(arq).replace(/\.[^.]+$/, "");
  const ext = path.extname(arq).toLowerCase();
  if (ext === ".gpx" || /<gpx\b/.test(txt)) return lerGpx(txt, padrao);
  if (ext === ".kml" || /<kml\b/.test(txt)) return lerKml(txt, padrao);
  if (ext === ".geojson" || ext === ".json") return lerGeojson(txt, padrao);
  return lerCsv(txt, padrao);
}

// ---------- geometria ----------
function reamostrar(xyz) { // xyz: [{x,z,ele}] → pontos a cada PASSO m + distância acumulada
  const acum = [0];
  for (let i = 1; i < xyz.length; i++) acum.push(acum[i - 1] + Math.hypot(xyz[i].x - xyz[i - 1].x, xyz[i].z - xyz[i - 1].z));
  const total = acum[acum.length - 1];
  const em = (d) => { // ponto na distância d
    let i = 1; while (i < acum.length - 1 && acum[i] < d) i++;
    const a = xyz[i - 1], b = xyz[i], seg = acum[i] - acum[i - 1] || 1, u = Math.min(1, Math.max(0, (d - acum[i - 1]) / seg));
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, ele: isFinite(a.ele) && isFinite(b.ele) ? a.ele + (b.ele - a.ele) * u : NaN };
  };
  return { total, em };
}

function montarTrajeto(nome, xyz, ruas = []) {
  const { total, em } = reamostrar(xyz);
  const n = Math.max(2, Math.round(total / PASSO) + 1);
  const pontos = Array.from({ length: n }, (_, i) => { const p = em((i / (n - 1)) * total); return [+p.x.toFixed(1), +p.z.toFixed(1)]; });
  const km = [];
  for (let k = 1; k * 1000 <= total + 0.5; k++) { const p = em(k * 1000); km.push({ km: k, x: +p.x.toFixed(1), z: +p.z.toFixed(1) }); }
  let altimetria = null, ganho = null;
  if (xyz.some((p) => isFinite(p.ele))) {
    altimetria = [];
    for (let d = 0; d <= total; d += 50) { const p = em(d); if (isFinite(p.ele)) altimetria.push({ d: Math.round(d), ele: +p.ele.toFixed(1) }); }
    const suave = altimetria.map((a, i, arr) => { const j = arr.slice(Math.max(0, i - 2), i + 3); return j.reduce((s, x) => s + x.ele, 0) / j.length; });
    ganho = Math.round(suave.reduce((s, e, i) => s + (i && e > suave[i - 1] ? e - suave[i - 1] : 0), 0));
  }
  return { nome, distancia_m: Math.round(total), pontos, km, altimetria, ganho_m: ganho, ruas };
}

// ---------- montagem ----------
let trajetos = [], pontos = [], origem = null;

if (args.segmentos) {
  const DIRS = { N: 0, NE: 45, L: 90, E: 90, SE: 135, S: 180, SO: 225, SW: 225, O: 270, W: 270, NO: 315, NW: 315 };
  let atual = null;
  const novo = (nome) => { atual = { nome, xyz: [{ x: 0, z: 0 }], ruas: [], d: 0 }; trajetos.push(atual); };
  for (const bruta of fs.readFileSync(path.resolve(args.segmentos), "utf8").split(/\r?\n/)) {
    const l = bruta.trim();
    if (!l || l.startsWith("#")) continue;
    if (l.startsWith("==")) { novo(l.slice(2).trim()); continue; }
    if (!atual) novo("percurso");
    const ult = atual.xyz[atual.xyz.length - 1];
    if (l.startsWith("@")) { pontos.push({ nome: l.slice(1).trim(), x: +ult.x.toFixed(1), z: +ult.z.toFixed(1), trajeto: atual.nome, d_m: Math.round(atual.d) }); continue; }
    const [rua, dir, metros] = l.split("|").map((x) => x.trim());
    const graus = DIRS[(dir || "").toUpperCase()] ?? +dir;
    if (!isFinite(graus) || !(+metros > 0)) throw new Error(`Linha inválida em --segmentos: "${l}" (esperado: rua | direção | metros)`);
    const rad = (graus * Math.PI) / 180;
    atual.xyz.push({ x: ult.x + Math.sin(rad) * +metros, z: ult.z - Math.cos(rad) * +metros });
    atual.ruas.push({ nome: rua, de_m: Math.round(atual.d), ate_m: Math.round(atual.d + +metros) });
    atual.d += +metros;
  }
  trajetos = trajetos.map((t, i) => montarTrajeto((args.nomes && args.nomes.split(",")[i]) || t.nome, t.xyz, t.ruas));
} else {
  const lidos = args._.map((a) => lerArquivo(path.resolve(a)));
  const brutos = lidos.flatMap((l) => l.trajetos);
  if (!brutos.length) throw new Error("Nenhuma linha (trk/rte/LineString/lat,lon) encontrada nas entradas.");
  const todos = brutos.flatMap((t) => t.pts).concat(lidos.flatMap((l) => l.pontos)).filter((p) => isFinite(p.lat) && isFinite(p.lon));
  const lat0 = (Math.min(...todos.map((p) => p.lat)) + Math.max(...todos.map((p) => p.lat))) / 2;
  const lon0 = (Math.min(...todos.map((p) => p.lon)) + Math.max(...todos.map((p) => p.lon))) / 2;
  origem = { lat: +lat0.toFixed(6), lon: +lon0.toFixed(6) };
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180), kz = 110540;
  const proj = (p) => ({ x: (p.lon - lon0) * kx, z: -(p.lat - lat0) * kz, ele: p.ele });
  trajetos = brutos.map((t, i) => montarTrajeto((args.nomes && args.nomes.split(",")[i]) || t.nome, t.pts.filter((p) => isFinite(p.lat) && isFinite(p.lon)).map(proj)));
  pontos = lidos.flatMap((l) => l.pontos).filter((p) => isFinite(p.lat)).map((p) => { const q = proj(p); return { nome: p.nome, x: +q.x.toFixed(1), z: +q.z.toFixed(1) }; });
}

const xs = trajetos.flatMap((t) => t.pontos.map((p) => p[0])).concat(pontos.map((p) => p.x));
const zs = trajetos.flatMap((t) => t.pontos.map((p) => p[1])).concat(pontos.map((p) => p.z));
const caixa = { xmin: Math.min(...xs), xmax: Math.max(...xs), zmin: Math.min(...zs), zmax: Math.max(...zs) };
const saida = path.resolve(args.saida || path.join(path.dirname(path.resolve(args._[0] || args.segmentos)), "percurso.json"));
const json = { origem, eixos: "1 unidade = 1 m; x = leste, z = sul (norte = -z)", esquematico: !!args.segmentos, trajetos, pontos, caixa };
fs.writeFileSync(saida, JSON.stringify(json) + "\n");
for (const t of trajetos) {
  console.log(`${t.nome}: ${(t.distancia_m / 1000).toFixed(2)} km · ${t.pontos.length} pontos · ${t.km.length} marcos de km` +
    (t.altimetria ? ` · altimetria ${Math.min(...t.altimetria.map((a) => a.ele))}–${Math.max(...t.altimetria.map((a) => a.ele))} m, ganho ${t.ganho_m} m` : " · sem altimetria") +
    (t.ruas.length ? ` · ${t.ruas.length} ruas` : ""));
}
if (pontos.length) console.log(`pontos: ${pontos.map((p) => p.nome).join(", ")}`);
console.log(`caixa: ${Math.round(caixa.xmax - caixa.xmin)} m (L-O) x ${Math.round(caixa.zmax - caixa.zmin)} m (N-S) · ${saida}`);
