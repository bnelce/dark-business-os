// Dados do reel "O patrimônio de quem te representa" (ciencia/Patrimonio). Lê a conta feita sobre os
// arquivos do TSE (dados/resultado-patrimonio.json, saída do scripts/patrimonio.py do reel), as tabelas
// do IBGE (dados/ibge) e as faixas do IRPF divulgadas pela Receita (dados/receita), confere cada número
// que a narração e a tela dizem, e grava o que a composição usa. Nenhum CPF entra aqui.
//
//   cd reels && node scripts/gerar-patrimonio.mjs ../<pasta>/dados src/ciencia/patrimonio.json
//
// Para no primeiro número que não bater.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-patrimonio.mjs <pasta dados> <saída.json>");
const ler = (a) => JSON.parse(readFileSync(join(DADOS, a), "utf-8"));
const R = ler("resultado-patrimonio.json");
const RF = ler("receita/irpf-2026-faixas-patrimonio.json");
const serie = (a) => ler(a)[0].resultados;
const renda = Number(serie("ibge/t7438-2025.json").find((r) => r.classificacoes[0].categoria["49264"]).series[0].serie["2025"]);
const ipcaS = serie("ibge/ipca-1737.json")[0].series[0].serie;
const ipca = (Number(ipcaS["202608"]) / Number(ipcaS["202208"]) - 1) * 100;

const confere = (ok, msg) => { if (!ok) throw new Error(`não bate: ${msg}`); console.log(`ok  ${msg}`); };
const G = R.geral;
const anos = G.mediana / (renda * 12);
const top = R.top10[0];
const partidos = R.por_partido;
const medP = partidos.map((p) => p.mediana);
const RE = R.reeleitos.mesmo_cargo;

confere(G.n === 586 && R.contagem["DEPUTADO FEDERAL"] === 505 && R.contagem.SENADOR === 54 && R.contagem.GOVERNADOR === 27, "586 eleitos: 505 + 54 + 27");
confere(R.sit_amapa_depfed["#NULO | #NE"] === 91 && Object.keys(R.sit_amapa_depfed).length === 1, "Amapá: nenhum dos 91 candidatos a dep. federal com situação na base (os 8 eleitos ficam de fora)");
confere(Math.round(G.pct_milionarios / 10) === 6, `"seis em cada dez" com 1 milhão ou mais (${G.milionarios}/${G.n} = ${G.pct_milionarios}%)`);
confere(Math.round(RF.faixas.acima_de_1_milhao.pct) === 7, `"7 em cada 100" declarantes do IR (${RF.faixas.acima_de_1_milhao.pct}%)`);
confere(Math.abs(G.mediana - 1_450_000) < 5_000, `"1 milhão e 450 mil" de mediana (${G.mediana})`);
confere(renda === 1490, `renda domiciliar per capita mediana 2025 = R$ ${renda}`);
confere(Math.floor(anos) === 81, `"81 anos" (${G.mediana} / (${renda} × 12) = ${anos.toFixed(2)})`);
confere(top.urna === "OTAVIANO PIVETTA" && top.cargo === "GOVERNADOR" && top.uf === "MT", "o maior é o governador eleito de MT, Otaviano Pivetta");
confere(Math.floor(top.patrimonio / 1e6) === 575, `"575 milhões" (${top.patrimonio})`);
confere(G.zero === 8 && R.sem_bens === 8, `"oito eleitos não declararam bem nenhum" (zero: ${G.zero}, sem linha de bem: ${R.sem_bens})`);
confere(partidos.length === 20, "20 partidos com eleitos");
confere(Math.round(Math.min(...medP) / 1000) === 172, `mediana mínima por partido "172 mil" (${Math.min(...medP)})`);
confere(Math.round(Math.max(...medP) / 1e5) === 43, `mediana máxima por partido "4 milhões e 300 mil" (${Math.max(...medP)})`);
confere(RE.n_com_bens_2022 === 289, `"289 reeleitos" com bens em 2022 (de ${RE.n} cruzados pelo CPF)`);
confere(Math.floor(RE.mediana_var_pct) === 39, `"subiu 39%" na mediana (${RE.mediana_var_pct}%)`);
confere(ipca > 19 && ipca < 20, `"quase 20%" de IPCA 08/2022–08/2026 (${ipca.toFixed(1)}%)`);
confere(RE.cairam === 68 && RE.cresceram + RE.cairam + RE.iguais === 289, `"68 declararam menos" (${RE.cresceram} mais, ${RE.cairam} menos, ${RE.iguais} iguais)`);
confere(R.valores_ordenados.length === 586 && R.valores_ordenados.at(-1) === top.patrimonio, "a escada tem os 586 e termina no maior");

const out = {
  n: G.n,
  cargos: { dep: R.contagem["DEPUTADO FEDERAL"], sen: R.contagem.SENADOR, gov: R.contagem.GOVERNADOR },
  milionarios: G.milionarios,
  pctMil: G.pct_milionarios,
  pctIR: RF.faixas.acima_de_1_milhao.pct,
  mediana: G.mediana,
  renda,
  anos: Math.floor(anos),
  maior: { nome: top.urna, cargo: top.cargo, uf: top.uf, valor: top.patrimonio },
  zero: G.zero,
  valores: R.valores_ordenados,
  partidos: [...partidos].sort((a, b) => b.mediana - a.mediana).map((p) => ({ p: p.partido, n: p.n, med: p.mediana })),
  re: { n: RE.n_com_bens_2022, var: RE.mediana_var_pct, mais: RE.cresceram, menos: RE.cairam, iguais: RE.iguais },
  ipca: Math.round(ipca * 10) / 10,
  ufs: R.por_uf.map((u) => ({ uf: u.uf, n: u.n, med: u.mediana })),
};
writeFileSync(SAIDA, `${JSON.stringify(out, null, 1)}\n`);
console.log(`gravado ${SAIDA}`);
