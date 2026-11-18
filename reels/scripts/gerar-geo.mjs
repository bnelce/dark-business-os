// Gera as geometrias do reel "Groenlândia x África" a partir do Natural Earth
// (domínio público). Saída: caminhos SVG já projetados + a razão de área calculada,
// pra nenhum número do vídeo vir de memória.
//
// A demonstração é a troca de projeção:
//   Mercator   — o mapa que todo mundo conhece; infla o que está longe do equador.
//   Equal Earth — preserva área.
// Deslocar a Groenlândia até o equador mostraria só a distorção vertical, porque no
// Mercator a largura em pixels depende apenas da longitude. Trocar a projeção é exato.
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoMercator, geoEqualEarth, geoPath, geoArea } from "d3-geo";

const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-110m.json", "utf-8"));
const fc = feature(topo, topo.objects.countries);
const acha = (n) => fc.features.find((f) => f.properties.name === n);

const AFRICA = ["Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cameroon","Central African Rep.",
"Chad","Côte d'Ivoire","Dem. Rep. Congo","Djibouti","Egypt","Eq. Guinea","Eritrea","Ethiopia","Gabon","Ghana",
"Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Morocco",
"Mozambique","Namibia","Niger","Nigeria","Congo","Rwanda","Senegal","Sierra Leone","Somalia","Somaliland",
"S. Sudan","South Africa","Sudan","Swaziland","Tanzania","Togo","Tunisia","Uganda","W. Sahara","Zambia","Zimbabwe","Gambia"];

const groenlandia = acha("Greenland");
const africa = { type: "FeatureCollection", features: AFRICA.map(acha).filter(Boolean) };

// Área na esfera (esteradianos): independe de projeção, é o número honesto.
const aG = geoArea(groenlandia);
const aA = africa.features.reduce((s, f) => s + geoArea(f), 0);

const W = 1080, H = 1920;
const mercator = geoMercator().scale(178).center([12, 26]).translate([W / 2, H / 2]);
const equalEarth = geoEqualEarth().scale(235).center([12, 8]).translate([W / 2, H / 2]);
const pM = geoPath(mercator), pE = geoPath(equalEarth);

const caixa = (proj, f) => {
  const [[x0, y0], [x1, y1]] = geoPath(proj).bounds(f);
  return { x: x0, y: y0, larg: x1 - x0, alt: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};

const saida = {
  razaoArea: aA / aG,
  caixas: {
    mercator: { groenlandia: caixa(mercator, groenlandia), africa: caixa(mercator, africa) },
    equalEarth: { groenlandia: caixa(equalEarth, groenlandia), africa: caixa(equalEarth, africa) },
  },
  mercator: { mundo: pM(fc), groenlandia: pM(groenlandia), africa: pM(africa) },
  equalEarth: { mundo: pE(fc), groenlandia: pE(groenlandia), africa: pE(africa) },
};

writeFileSync("src/lab/geo-groenlandia.json", JSON.stringify(saida));

const mesmaEstrutura = (a, b) => a.replace(/[-\d.]/g, "") === b.replace(/[-\d.]/g, "");
console.log(`África / Groenlândia = ${(aA / aG).toFixed(1)}x (área real na esfera)`);
console.log(`Groenlândia morfável entre projeções? ${mesmaEstrutura(saida.mercator.groenlandia, saida.equalEarth.groenlandia)}`);
console.log(`mundo morfável? ${mesmaEstrutura(saida.mercator.mundo, saida.equalEarth.mundo)}`);
console.log(`arquivo: ${(JSON.stringify(saida).length / 1024).toFixed(0)} KB`);
