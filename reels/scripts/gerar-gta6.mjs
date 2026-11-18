// Números e mapa do reel "Quanto tempo leva baixar o GTA VI" (ciencia/Gta6, 18/11/2026).
//
//   node scripts/gerar-gta6.mjs <pasta do reel> src/ciencia/gta6.json
//
// Os insumos são poucos e ficam aqui, com a fonte do lado; o resto é conta. Nenhum número do vídeo
// é digitado na composição: sai daqui. O script confere cada número da fala (roteiro.json) contra a
// conta e para se algum não bater.
//
// Mapa: malha dos estados do IBGE (dados/br-uf.json, a mesma dos reels da apuração e do El Niño).
// Noronha não está na malha (o polígono de PE é só o continente): entra como ponto.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoArea, geoMercator, geoPath } from "d3-geo";

const [PASTA, SAIDA] = process.argv.slice(2);
if (!PASTA || !SAIDA) throw new Error("uso: gerar-gta6.mjs <pasta do reel> <saída.json>");
const confere = (ok, msg) => { if (!ok) throw new Error(`não confere: ${msg}`); };

// --- insumos -----------------------------------------------------------------------------------
const GB = 212; // "até 212 GB", espaço pedido pelo pré-load (Rockstar Newswire, 3/11/2026). GB decimal (10^9 bytes).
const MEDIANA_FIXA = 221.5; // Mbps, mediana de download da banda larga fixa no Brasil (Ookla Speedtest Global Index, mar/2026)
const VELOCIDADES = [
  { id: "giga", mbps: 1000, rotulo: "1 GIGA" },
  { id: "mediana", mbps: MEDIANA_FIXA, rotulo: "221,5 MEGA · MEDIANA DO BRASIL" },
  { id: "cem", mbps: 100, rotulo: "100 MEGA" },
  { id: "vinte", mbps: 20, rotulo: "20 MEGA" },
];
// Desbloqueio: 0h de 19/11 em Brasília = 03:00 UTC (PS Store BR). Fusos: Lei 12.876/2013; sem horário de verão (Decreto 9.772/2019).
const UTC_LIBERA = 3; // hora UTC de 19/11
const FUSO = { AC: -5, AM: -4, RR: -4, RO: -4, MT: -4, MS: -4 }; // o resto do país é -3; Noronha, -2
const NZ_BRASILIA = 8; // a Nova Zelândia abriu às 8h de 18/11 pelo horário de Brasília (horários das lojas, GamerFuzion)

// --- a conta -----------------------------------------------------------------------------------
const gbits = GB * 8;
confere(gbits === 1696, "212 GB = 1.696 Gb");
const K = gbits * 1000 / 3600; // horas = K ÷ Mbps
confere(Math.abs(K - 471.11) < 0.01, `constante ${K}`);
const hm = (h) => {
  const min = Math.round(h * 60);
  return { h: Math.floor(min / 60), m: min % 60 };
};
const texto = ({ h, m }) => (h === 0 ? `${m} MIN` : `${h}H${String(m).padStart(2, "0")}`);
const vel = VELOCIDADES.map((v) => {
  const horas = K / v.mbps;
  return { ...v, horas: +horas.toFixed(5), tempo: texto(hm(horas)) };
});
const por = Object.fromEntries(vel.map((v) => [v.id, v]));
confere(vel.map((v) => v.tempo).join() === "28 MIN,2H08,4H43,23H33", `tempos ${vel.map((v) => v.tempo)}`);

// Números da fala, conferidos contra a conta.
const roteiro = JSON.parse(readFileSync(join(PASTA, "roteiro.json"), "utf-8"));
const fala = Object.fromEntries(roteiro.beats.map((b) => [b.id, b.narracao]));
const tem = (id, trecho) => confere(fala[id].includes(trecho), `fala ${id} sem "${trecho}"`);
tem("gancho", "20 mega"); tem("gancho", "amanhã à noite");
confere(UTC_LIBERA + (-3) + por.vinte.horas > 19, "20 mega começando à 0h termina na noite de 19/11 (depois das 19h)");
tem("tamanho", `até ${GB} gigabytes`); tem("tamanho", "1.696 gigabits");
tem("corrida", "1 giga, isso leva 28 minutos"); confere(hm(por.giga.horas).m === 28 && hm(por.giga.horas).h === 0, "28 minutos");
tem("corrida", "uns 220 mega"); confere(Math.abs(MEDIANA_FIXA - 220) < 2, "mediana ~220");
tem("corrida", "pouco mais de duas horas"); confere(por.mediana.horas > 2 && por.mediana.horas < 2.25, "pouco mais de duas horas");
tem("corrida", "100 mega, quase cinco"); confere(por.cem.horas > 4.5 && por.cem.horas < 5, "quase cinco");
tem("corrida", "23 horas e meia"); confere(Math.abs(por.vinte.horas - 23.5) < 0.1, "23 horas e meia");
const local = (uf) => UTC_LIBERA + (FUSO[uf] ?? -3);
const hora = (h) => ((h % 24) + 24) % 24;
tem("fusos", "22 horas no Acre"); confere(hora(local("AC")) === 22, "Acre 22h");
tem("fusos", "23 em Manaus"); confere(hora(local("AM")) === 23, "Manaus 23h");
tem("fusos", "meia-noite em Brasília"); confere(hora(local("DF")) === 0, "Brasília 0h");
tem("fusos", "uma da manhã em Noronha"); confere(hora(UTC_LIBERA - 2) === 1, "Noronha 1h");
tem("zelandia", "16 horas antes"); confere(24 - NZ_BRASILIA === 16, "NZ 16 h antes");

// --- mapa --------------------------------------------------------------------------------------
const ufs = JSON.parse(readFileSync(join(PASTA, "dados/br-uf.json"), "utf-8"));
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
const NORONHA = [-32.42, -3.85];
const tudo = { type: "FeatureCollection", features: [...ufs.features, { type: "Feature", geometry: { type: "Point", coordinates: NORONHA } }] };
const proj = geoMercator().fitExtent([[150, 520], [930, 1290]], tudo);
const caminho = geoPath(proj);
caminho.digits?.(1);
const estados = ufs.features.map((ft) => {
  const uf = COD_UF[ft.properties.codarea];
  return { uf, z: FUSO[uf] ?? -3, d: caminho(ft), c: caminho.centroid(ft).map((x) => +x.toFixed(1)) };
});
confere(estados.length === 27 && estados.every((e) => e.uf), "27 estados na malha");
const ponto = (lon, lat) => proj([lon, lat]).map((x) => +x.toFixed(1));

const out = {
  gb: GB, gbits, k: +K.toFixed(2), velocidades: vel,
  libera: { utc: UTC_LIBERA, nz: NZ_BRASILIA, antes: 24 - NZ_BRASILIA },
  brasil: {
    estados,
    noronha: ponto(...NORONHA),
    // onde fica o rótulo de cada fuso
    rotulos: { "-5": ponto(-70.5, -9.3), "-4": ponto(-58, -9), "-3": ponto(-47.9, -15.8), "-2": ponto(...NORONHA) },
    brasilia: ponto(-47.93, -15.78),
  },
};
writeFileSync(SAIDA, `${JSON.stringify(out, null, 1)}\n`);
console.log(`${GB} GB = ${gbits} Gb · horas = ${K.toFixed(2)} ÷ Mbps`);
for (const v of vel) console.log(`  ${v.rotulo}: ${v.horas.toFixed(3)} h = ${v.tempo}`);
console.log(`Noronha em ${out.brasil.noronha} · Brasília em ${out.brasil.brasilia}`);
