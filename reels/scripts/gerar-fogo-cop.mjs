// Dados do reel desmatamento × fogo (ciencia/FogoCop, 09/11/2026), a partir do contas.json que o
// fogo-cop-focos.py tira dos arquivos do BDQueimadas (INPE), e dos números do PRODES 2026 (nota do
// INPE de 16/10/2026, em FATOS abaixo).
//
//   python3 -I scripts/fogo-cop-focos.py <pasta do reel>/dados <pasta do reel>/contas.json
//   node scripts/gerar-fogo-cop.mjs <pasta do reel>/contas.json src/ciencia/fogo-cop.json
//
// Nenhum número do vídeo é digitado na composição: sai tudo daqui. O script confere o que a
// narração diz (ESPERADO) e para se um dado mudar e a fala ficar errada.
//
// Método: focos do satélite de referência (AQUA_M-T), de janeiro a outubro (pela data GMT do
// arquivo), por bioma e por estado. 2026 contra a média de 2019 a 2025 no mesmo período. O AQUA
// filtrado do arquivo "todos os satélites" tem que bater com o arquivo do satélite de referência
// em todos os anos (conferência de que o filtro é o mesmo que o INPE usa). O NOAA-20 refaz a conta
// com outro satélite, pra ver se a direção se mantém (o AQUA está com a órbita derivando).
import { readFileSync, writeFileSync } from "node:fs";

const [CONTAS, SAIDA] = process.argv.slice(2);
if (!CONTAS || !SAIDA) throw new Error("uso: gerar-fogo-cop.mjs <contas.json> <saída.json>");
const confere = (ok, msg) => { if (!ok) throw new Error(`não confere: ${msg}`); };

// PRODES 2026 (INPE, 16/10/2026). Amazônia: estimativa (imagens prioritárias; a taxa consolidada
// sai no 1º semestre de 2027). Cerrado: taxa consolidada. Período: 1/8/2025 a 31/7/2026.
const FATOS = {
  divulgado: "16/10/2026",
  amazonia: { atual: 3335, anterior: 5731, desde: 1988, menorAntes: { ano: 2012, km2: 4571 }, estimativa: true },
  cerrado: { atual: 5516.69, anterior: 7235.27, desde: 2001, menorAntes: { ano: 2019, km2: 6319 }, estimativa: false },
};

const C = JSON.parse(readFileSync(CONTAS, "utf-8"));
const ANOS_BASE = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const REGIOES = [
  { id: "amazonia", nome: "Amazônia", chave: "bioma:Amazônia" },
  { id: "cerrado", nome: "Cerrado", chave: "bioma:Cerrado" },
  { id: "caatinga", nome: "Caatinga", chave: "bioma:Caatinga" },
  { id: "para", nome: "Pará", chave: "estado:PARÁ" },
  { id: "ceara", nome: "Ceará", chave: "estado:CEARÁ" },
  { id: "brasil", nome: "Brasil", chave: "total" },
];

const soma = (lista, sat, ano, meses, chave) =>
  lista.filter((g) => g.sat === sat && g.ano === ano && meses.includes(g.mes)).reduce((s, g) => s + (g[chave] ?? 0), 0);

// --- conferência: AQUA filtrado do arquivo completo = arquivo de referência ----------------------
for (const ano of ANOS_BASE) {
  for (const r of REGIOES) {
    const a = soma(C.todos, "AQUA_M-T", ano, MESES, r.chave), b = soma(C.ref, "AQUA_M-T", ano, MESES, r.chave);
    confere(a === b, `${r.nome} ${ano}: AQUA no arquivo completo ${a} × arquivo de referência ${b}`);
  }
}
// 2026 tem os dez meses inteiros
for (const mes of MESES) confere(C.todos.some((g) => g.sat === "AQUA_M-T" && g.ano === 2026 && g.mes === mes), `2026-${mes} sem AQUA`);

const calcula = (sat) => Object.fromEntries(REGIOES.map((r) => {
  // 2019–2025 do arquivo completo, que pro AQUA é igual ao de referência (conferido acima, ano a ano).
  const anos = Object.fromEntries([...ANOS_BASE, 2026].map((a) => [a, soma(C.todos, sat, a, MESES, r.chave)]));
  const media = ANOS_BASE.reduce((s, a) => s + anos[a], 0) / ANOS_BASE.length;
  const n = anos[2026];
  const varPct = (100 * (n - media)) / media;
  const ordem = [...ANOS_BASE, 2026].sort((x, y) => anos[y] - anos[x]);
  const mensal2026 = MESES.map((m) => soma(C.todos, sat, 2026, [m], r.chave));
  const mensalMedia = MESES.map((m) => ANOS_BASE.reduce((s, a) => s + soma(C.todos, sat, a, [m], r.chave), 0) / ANOS_BASE.length);
  return [r.id, { nome: r.nome, n2026: n, media, varPct, anos, posicao2026: ordem.indexOf(2026) + 1, mensal2026, mensalMedia }];
}));

const aqua = calcula("AQUA_M-T");
const noaa = calcula("NOAA-20");
for (const k of Object.keys(aqua)) {
  aqua[k].vs2025 = (100 * (aqua[k].n2026 - aqua[k].anos[2025])) / aqua[k].anos[2025];
  noaa[k].vs2025 = (100 * (noaa[k].n2026 - noaa[k].anos[2025])) / noaa[k].anos[2025];
}

// Pará: os outubros desde 2003 (2003–2018 do arquivo de referência do estado, 2019–2025 do nacional
// de referência, 2026 do mensal) e quanto de 2026 veio só em outubro.
const outubros = {};
for (let a = 2003; a <= 2018; a++) outubros[a] = C.paRef.filter((g) => g.ano === a && g.mes === 10).reduce((s, g) => s + g.total, 0);
for (const a of ANOS_BASE) outubros[a] = soma(C.ref, "AQUA_M-T", a, [10], "estado:PARÁ");
outubros[2026] = soma(C.todos, "AQUA_M-T", 2026, [10], "estado:PARÁ");
const recordeAntes = Object.entries(outubros).filter(([a]) => +a < 2026).sort((x, y) => y[1] - x[1])[0];
const para = { outubros, recordeAntes: { ano: +recordeAntes[0], focos: recordeAntes[1] }, out2026: outubros[2026], parteOutubro: (100 * outubros[2026]) / aqua.para.n2026 };

// Ceará: quanto do ano costuma vir em novembro e dezembro (média agregada de 2019 a 2025).
const todoAno = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const cearaNovDez = (100 * ANOS_BASE.reduce((s, a) => s + soma(C.ref, "AQUA_M-T", a, [11, 12], "estado:CEARÁ"), 0))
  / ANOS_BASE.reduce((s, a) => s + soma(C.ref, "AQUA_M-T", a, todoAno, "estado:CEARÁ"), 0);

// Janela do PRODES (agosto a julho), só pra conferência no comentário fixado: 8/2025–7/2026 contra
// as janelas 8/2019–7/2020 … 8/2024–7/2025 (a de 8/2018 precisaria do arquivo de 2018).
const janelaProdes = Object.fromEntries(REGIOES.filter((r) => ["amazonia", "cerrado"].includes(r.id)).map((r) => {
  const j = (y) => soma(C.todos, "AQUA_M-T", y - 1, [8, 9, 10, 11, 12], r.chave) + soma(C.todos, "AQUA_M-T", y, [1, 2, 3, 4, 5, 6, 7], r.chave);
  const anos = Object.fromEntries([2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => [`${y - 1}/${y}`, j(y)]));
  const base = [2020, 2021, 2022, 2023, 2024, 2025].map((y) => j(y));
  const media = base.reduce((s, v) => s + v, 0) / base.length;
  return [r.id, { anos, media, atual: j(2026), varPct: (100 * (j(2026) - media)) / media }];
}));

// --- o que a narração diz (roteiro.json) ----------------------------------------------------------
const r0 = (v) => Math.round(v);
confere(r0(100 * (1 - FATOS.amazonia.atual / FATOS.amazonia.anterior)) === 42, "Amazônia: \"42% a menos\"");
confere(FATOS.amazonia.atual < FATOS.amazonia.menorAntes.km2, "Amazônia: menor da série");
confere(FATOS.cerrado.atual < FATOS.cerrado.menorAntes.km2, "Cerrado: menor da série");
confere(r0(FATOS.cerrado.atual) === 5517, "Cerrado: \"5.517\"");
confere(r0(aqua.amazonia.varPct) === -40, `Amazônia: "40% menos" (${aqua.amazonia.varPct})`);
confere(r0(aqua.cerrado.varPct) === -38, `Cerrado: "38% menos" (${aqua.cerrado.varPct})`);
confere(r0(aqua.caatinga.varPct) === -8, `Caatinga: "8%" (${aqua.caatinga.varPct})`);
confere(r0(aqua.amazonia.vs2025) === 70, `Amazônia contra 2025: "70% a mais" (${aqua.amazonia.vs2025})`);
confere(aqua.amazonia.anos[2025] === Math.min(...Object.values(aqua.amazonia.anos)), "2025 é o ano de menos fogo na Amazônia (\"um ano de pouco fogo\")");
confere(para.parteOutubro > 50, `Pará: "mais da metade veio só em outubro" (${para.parteOutubro})`);
confere(para.out2026 > para.recordeAntes.focos, `Pará: "o maior outubro da série" (${para.out2026} × ${JSON.stringify(para.recordeAntes)})`);
confere(Math.abs(aqua.ceara.varPct) < 15 && Math.sign(aqua.ceara.varPct) !== Math.sign(noaa.ceara.varPct), `Ceará: "perto da média" (AQUA ${aqua.ceara.varPct}, NOAA-20 ${noaa.ceara.varPct})`);
// Conferência de direção com o outro satélite: as falas de bioma, de 2025 e do Pará valem nos dois.
for (const k of ["amazonia", "cerrado", "caatinga", "para", "brasil"]) confere(Math.sign(aqua[k].varPct) === Math.sign(noaa[k].varPct), `${k}: NOAA-20 discorda da direção contra a média`);
for (const k of ["amazonia", "cerrado", "caatinga", "para", "ceara"]) confere(Math.sign(aqua[k].vs2025) === Math.sign(noaa[k].vs2025), `${k}: NOAA-20 discorda da direção contra 2025`);
confere(aqua.brasil.posicao2026 === 8, "Brasil: o menor dos oito anos");

const fmt = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
for (const r of REGIOES) {
  const a = aqua[r.id], b = noaa[r.id];
  console.log(`${r.nome.padEnd(9)} AQUA 2026 ${String(a.n2026).padStart(7)} · média ${a.media.toFixed(0).padStart(7)} · ${fmt(a.varPct).padStart(7)} · vs 2025 ${fmt(a.vs2025).padStart(7)} · ${a.posicao2026}º de 8 | NOAA-20 ${fmt(b.varPct)} / ${fmt(b.vs2025)}`);
}
console.log(`Pará: outubro de 2026 ${para.out2026} (${para.parteOutubro.toFixed(1)}% de jan–out); recorde anterior ${JSON.stringify(para.recordeAntes)}`);
console.log(`Ceará: nov–dez = ${cearaNovDez.toFixed(1)}% do ano (2019–2025)`);
for (const [k, v] of Object.entries(janelaProdes)) console.log(`janela PRODES ${k}: ${v.atual} × média ${v.media.toFixed(0)} (${fmt(v.varPct)}) · ${JSON.stringify(v.anos)}`);

writeFileSync(SAIDA, `${JSON.stringify({ fatos: FATOS, anosBase: ANOS_BASE, aqua, noaa, para, cearaNovDez, janelaProdes }, null, 1)}\n`);
console.log(`→ ${SAIDA}`);
