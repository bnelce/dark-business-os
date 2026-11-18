// Números do reel da Voyager 1 a um dia-luz (ciencia/Voyager). Lê o contas.json que o conta-horizons.py
// tira das respostas da JPL Horizons, confere cada número que a fala diz e grava o JSON da composição.
// Para se algum número da fala deixar de bater.
//
//   python3 -I <pasta>/dados/conta-horizons.py
//   node scripts/gerar-voyager.mjs ../<pasta>/dados src/ciencia/voyager.json
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-voyager.mjs <pasta dados> <saída.json>");
const c = JSON.parse(readFileSync(join(DADOS, "contas.json"), "utf-8"));

// Fatos que não saem da Horizons (fonte no README do reel).
const FATOS = {
  lancamento: "5/9/1977",
  heliopausa: { data: "25/8/2012", ua: 121 }, // NASA/JPL
  paleBlueDot: { data: "14/2/1990", km: 6e9 }, // NASA, PIA23645: "approximately 6 billion kilometers"
  oort: { inicioUa: 2000, anos: 300 }, // NASA: borda interna estimada em 2.000–5.000 UA; ~300 anos pra chegar
};

const erros = [];
const confere = (ok, msg) => { if (!ok) erros.push(msg); };
confere(Math.abs(c.voyager_lt_s - 86400) < 1, `tempo de luz no instante da NASA: ${c.voyager_lt_s} s`);
confere(c.cruzamento_serie_horaria_ut.startsWith("18/11 10:16"), `cruzamento: ${c.cruzamento_serie_horaria_ut}`);
confere(c.lua_s > 1 && c.lua_s < 1.5, `"pouco mais de um segundo" até a Lua: ${c.lua_s}`);
confere(Math.floor(c.sol_s / 60) === 8, `"8 minutos" até o Sol: ${c.sol_s}`);
confere(Math.floor(c.netuno_s / 3600) === 4, `"4 horas" até Netuno: ${c.netuno_s}`);
confere(c.voyager_sobre_netuno >= 5.5 && c.voyager_sobre_netuno < 6, `"quase seis vezes" Netuno: ${c.voyager_sobre_netuno}`);
confere((c.voyager_km / 1e9).toFixed(1) === "25.9", `"25,9 bilhões de km": ${c.voyager_km}`);
confere(c.ida_e_volta_s >= 2 * 86400 && c.ida_e_volta_s < 2 * 86400 + 60, `ida e volta "na sexta": ${c.ida_e_volta_s}`);
confere(c.resposta_chega_ut.startsWith("20/11"), `resposta chega: ${c.resposta_chega_ut}`);
const quarto = FATOS.paleBlueDot.km / c.voyager_km;
confere(quarto > 0.2 && quarto < 0.3, `"um quarto dessa distância": ${quarto}`);
if (erros.length) throw new Error(`números da fala não batem:\n  ${erros.join("\n  ")}`);

const D = {
  contas: c,
  fatos: FATOS,
  // Paradas da corrida (tempo de luz no instante da NASA, do centro da Terra).
  paradas: [
    { id: "lua", nome: "LUA", s: c.lua_s, rotulo: "1,3 S" },
    { id: "sol", nome: "SOL", s: c.sol_s, rotulo: `${Math.floor(c.sol_s / 60)} MIN ${Math.round(c.sol_s % 60)} S` },
    { id: "netuno", nome: "NETUNO", s: c.netuno_s, rotulo: `${Math.floor(c.netuno_s / 3600)} H ${String(Math.round((c.netuno_s % 3600) / 60)).padStart(2, "0")} MIN` },
    { id: "voyager", nome: "VOYAGER 1", s: c.voyager_lt_s, rotulo: "24 H" },
  ],
};
writeFileSync(SAIDA, `${JSON.stringify(D, null, 1)}\n`);
console.log(`ok: ${D.paradas.map((p) => `${p.nome} ${p.rotulo}`).join(" · ")} · ${(c.voyager_km / 1e9).toFixed(3)} bi km · ${c.voyager_sobre_netuno}× Netuno · PBD ${quarto.toFixed(2)}`);
