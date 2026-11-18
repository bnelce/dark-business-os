// Dados do reel "O mínimo bateu recorde e compra menos comida que em 2017"
// (ciencia/SalarioCesta), a partir dos derivados da pasta dados/ do reel (sm_mensal.csv,
// sm_anual.csv, sm_reajustes.csv e mandatos.csv, feitos pelo analise.py).
//
//   node scripts/gerar-salario.mjs <dados/ do reel> src/ciencia/salario-cesta.json
//
// Nenhum número do vídeo é digitado à mão: sai tudo daqui, e o script confere contra o que
// a narração diz (recorde em jan/2026; 3 vezes o do começo de 1995; cesta perto de 570 até
// 2011 e 918 hoje; 1 cesta em 1995, 2,16 em 2017 o melhor ano, 1,6 em 2022 o pior desde
// 2004, 1,8 hoje; arroz 36 min o menor; carne 7h23 e 5h36 em 2018; maior aumento real em
// 1995). Se um dado mudar e a fala ficar errada, o script para.
//
// Neutralidade: dos mandatos só saem as datas (as faixas cinza), nunca o nome.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-salario.mjs <dados/> <saída.json>");

const confere = (ok, msg) => { if (!ok) throw new Error(`não confere: ${msg}`); };
const csv = (arq) => {
  const [cab, ...linhas] = readFileSync(join(DADOS, arq), "utf-8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const cols = cab.split(",");
  return linhas.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])));
};
const r = (n, c = 2) => Math.round(n * 10 ** c) / 10 ** c;

const MENSAL = csv("sm_mensal.csv").filter((x) => x.mes >= "1995-01" && x.sm_real_inpc_set2026 !== "");
const ANUAL = csv("sm_anual.csv").map((x) => ({ ...x, ano: +x.ano }));
const REAJ = csv("sm_reajustes.csv").filter((x) => +x.ciclo >= 1995);
const MAND = csv("mandatos.csv");
const ano = (a) => ANUAL.find((x) => x.ano === a);

// --- salário mínimo real, mês a mês (jan/1995 a set/2026) ---------------------------------
const sm = MENSAL.map((x) => r(+x.sm_real_inpc_set2026, 1));
const inicio = MENSAL[0], fim = MENSAL.at(-1);
confere(inicio.mes === "1995-01" && fim.mes === "2026-09", `série mensal de ${inicio.mes} a ${fim.mes}`);
const recorde = MENSAL.reduce((a, b) => (+b.sm_real_inpc_set2026 > +a.sm_real_inpc_set2026 ? b : a));
confere(recorde.mes === "2026-01", `recorde do SM real em ${recorde.mes}`);
const vezes = +fim.sm_real_inpc_set2026 / +inicio.sm_real_inpc_set2026;
confere(Math.round(vezes) === 3, `"três vezes o do começo de 1995": ${vezes.toFixed(2)}`);
// o recorde anual também é 2026 (o gancho fala do mínimo de hoje)
confere(ANUAL.every((x) => x.ano === 2026 || +x.sm_real_inpc_set2026 < +ano(2026).sm_real_inpc_set2026), "2026 é o maior SM real anual");

// --- cesta de SP, real, média do ano ----------------------------------------------------------
const anos = ANUAL.map((x) => x.ano);
confere(anos[0] === 1995 && anos.at(-1) === 2026 && anos.length === 32, "anos 1995–2026");
const cesta = ANUAL.map((x) => r(+x.cesta_sp_real_inpc_set2026, 1));
const ate2011 = ANUAL.filter((x) => x.ano <= 2011).map((x) => +x.cesta_sp_real_inpc_set2026);
const media2011 = ate2011.reduce((a, b) => a + b, 0) / ate2011.length;
confere(Math.round(media2011 / 10) * 10 === 570, `"perto de 570 até 2011": média ${media2011.toFixed(1)}`);
confere(Math.round(+ano(2026).cesta_sp_real_inpc_set2026) === 918, `"hoje custa 918": ${ano(2026).cesta_sp_real_inpc_set2026}`);
confere(ANUAL.every((x) => +x.cesta_sp_real_inpc_set2026 <= +ano(2026).cesta_sp_real_inpc_set2026), "2026 é a cesta real mais cara");

// --- cestas por salário mínimo (SP e painel de 13 capitais) ------------------------------------
const cestas = ANUAL.map((x) => r(+x.cestas_sp_por_sm, 3));
const painel = ANUAL.map((x) => r(+x.cestas_painel_por_sm, 3));
const c = (a) => +ano(a).cestas_sp_por_sm;
confere(r(c(1995), 1) === 1.0, `1995 "uma cesta": ${c(1995)}`);
confere(c(2017) > 2 && r(c(2017)) === 2.16, `2017 "mais de duas" (2,16): ${c(2017)}`);
confere(ANUAL.every((x) => +x.cestas_sp_por_sm <= c(2017)), "2017 é o melhor ano em cestas de SP");
confere(r(c(2022), 1) === 1.6 && r(c(2022)) === 1.59, `2022 "1,6" (1,59): ${c(2022)}`);
confere(ANUAL.filter((x) => x.ano > 2004 && x.ano !== 2022).every((x) => +x.cestas_sp_por_sm > c(2022)) && c(2004) < c(2022),
  "2022 é o pior desde 2004");
confere(r(c(2026)) === 1.79 && r(c(2026), 1) === 1.8, `2026 "1,79" e "1,8": ${c(2026)}`);
const p = (a) => +ano(a).cestas_painel_por_sm;
confere(r(p(2018)) === 2.46 && ANUAL.every((x) => +x.cestas_painel_por_sm <= p(2018)), "painel: 2,46 em 2018, o melhor");
confere(r(p(2026)) === 2.12, `painel 2026: ${p(2026)}`);

// --- minutos de trabalho por 1 kg (SP) ------------------------------------------------------------
const hm = (min) => [Math.floor(Math.round(min) / 60), Math.round(min) % 60];
const arroz = +ano(2026).min_arroz_sp, carne = +ano(2026).min_carne_sp, carne18 = +ano(2018).min_carne_sp;
confere(Math.round(arroz) === 36 && ANUAL.every((x) => +x.min_arroz_sp >= arroz), `arroz "36 minutos", o menor: ${arroz}`);
confere(hm(carne).join(":") === "7:23", `carne "7 horas e 23": ${carne}`);
confere(hm(carne18).join(":") === "5:36", `carne 2018 "5 horas e 36": ${carne18}`);

// --- ganho real de cada reajuste (o maior é o de maio de 1995) -----------------------------------
const reaj = REAJ.map((x) => ({ ano: +x.ciclo, v: +x.ganho_real_pct }));
const maior = reaj.reduce((a, b) => (b.v > a.v ? b : a));
confere(maior.ano === 1995 && r(maior.v, 1) === 22.6, `maior ganho real: ${maior.ano} ${maior.v}`);
confere(REAJ.find((x) => x.ciclo === "1995").vigencia === "1995-05", "reajuste de 1995 em maio");
confere(reaj.map((x) => x.ano).join() === anos.join(), "um ciclo de reajuste por ano");

// --- faixas dos mandatos: só as datas ------------------------------------------------------------
const faixas = MAND.map((x) => ({ de: x.inicio, ate: x.fim }));
confere(faixas[0].de === "1995-01" && faixas.at(-1).ate === "2026-09" && faixas.length === 9, "9 faixas de 1995-01 a 2026-09");

const D = {
  anos,
  sm: { mensal: sm, inicio: r(+inicio.sm_real_inpc_set2026, 1), fim: r(+fim.sm_real_inpc_set2026, 1), recorde: r(+recorde.sm_real_inpc_set2026, 2), iRecorde: MENSAL.indexOf(recorde), vezes: r(vezes) },
  cesta: { anual: cesta, media2011: r(media2011, 1), hoje: r(+ano(2026).cesta_sp_real_inpc_set2026, 1) },
  cestas: { sp: cestas, painel },
  minutos: { arroz: r(arroz, 1), carne: r(carne, 1), carne2018: r(carne18, 1) },
  reajustes: reaj,
  faixas,
};
writeFileSync(SAIDA, `${JSON.stringify(D)}\n`);
console.log(`ok: SM ${D.sm.inicio} → ${D.sm.fim} (×${D.sm.vezes}), recorde ${recorde.mes} ${D.sm.recorde}; cesta ${D.cesta.media2011} → ${D.cesta.hoje};`,
  `cestas 1995 ${c(1995)} · 2017 ${c(2017)} · 2022 ${c(2022)} · 2026 ${c(2026)}; arroz ${arroz} min, carne ${carne} (2018: ${carne18}); maior reajuste ${maior.ano} +${maior.v}%`);
