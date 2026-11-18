// Dados do reel do roubo da Binance (ciencia/Binance), a partir do snapshot da DefiLlama
// (dados/defillama-hacks-2026-10-31.json, api.llama.fi/hacks) e dos fatos do roteiro-v2.md.
//
//   node scripts/gerar-binance.mjs <dados/ do reel> src/ciencia/binance.json
//
// Nenhum número do vídeo é digitado na composição: sai tudo daqui, e o script confere contra
// o que a narração diz (1.269 ataques com valor sem a Binance, ditos "quase 1.300"; 62%; mediana
// abaixo de 1 milhão; 23%; IPCA 3,097 → R$ 510 mi; US$ 6,4 bi a 5,42 = R$ 34,7 bi; razão acima de 60). Se um dado mudar e
// a fala ficar errada, o script para. Os 71% (com a própria Binance na conta) ficam só como
// conferência interna: não vão pra tela nem pra fala.
//
// A bolha é por ÁREA: r² ∝ valor em todas, numa escala só, com a Binance em US$ 6,36 bi (o valor
// da DefiLlama, a mesma base das outras bolhas). Só entram os ataques com valor informado: as 60
// linhas sem valor (54 nulas, 6 zeradas) não têm tamanho pra desenhar. Quem é pequeno demais pra
// um pixel fica com um ponto mínimo de 1px de raio.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-binance.mjs <dados/> <saída.json>");

const confere = (ok, msg) => { if (!ok) throw new Error(`não confere: ${msg}`); };
const perto = (a, b, tol, msg) => confere(Math.abs(a - b) <= tol, `${msg}: ${a} (esperado ${b})`);

// Fatos que não vêm da DefiLlama (roteiro-v2.md). Correção de fato: mudar aqui.
const FATOS = {
  elliptic: 6.43e9, estimativaBinance: 6.3e9, // na tela arredondado: US$ 6,4 bi
  transacao: 2.53e9, // numa transação; o relógio marca só essa transação, não o início do roubo
  inicio: "17h20", fim: "17h24", // Brasília
  autorizacoes: 50, validas: 1,
  congelado: 2.85e9, pctCongelado: 44, pctStable: 94,
  usdtTravado: 1.18e9, minutosUsdt: 37,
  btc: 18270, enderecos: 19,
  reposto: 95,
  // Mediana dos 1.269 ataques com valor informado, sem a Binance. A fala diz "menos de 1 milhão".
  medianaComValor: 933000, tetoMediana: 1e6,
  fortaleza: { nominalMi: 164.7, ipca: 3.097, toneladas: 3.5, dolar: 5.42 },
};

const H = JSON.parse(readFileSync(join(DADOS, "defillama-hacks-2026-10-31.json"), "utf-8"));
const valor = (x) => Number(x.amount) || 0;
const BIN = H.find((x) => x.name === "Binance CEX");
const total = H.reduce((s, x) => s + valor(x), 0);
const semBin = H.filter((x) => x !== BIN);
const totalSemBin = total - valor(BIN);

// --- os números da fala ---------------------------------------------------------------------
const comValorSemBin = semBin.filter((x) => valor(x) > 0);
confere(H.length === 1330, `${H.length} linhas`);
confere(H.filter((x) => !valor(x)).length === 60, "60 linhas sem valor");
confere(H.filter((x) => valor(x) > 0).length === 1270, "1.270 com valor, contando a Binance");
confere(comValorSemBin.length === 1269, `${comValorSemBin.length} com valor, sem a Binance`);
confere(valor(BIN) === 6.36e9, `Binance na base: ${valor(BIN)}`);
const CLASSES = { chave: "Key Compromise", sistema: "Frontend & Infrastructure", gente: "Social Engineering" };
const soma = (lista, classe) => lista.filter((x) => x.classification === classe).reduce((s, x) => s + valor(x), 0);

// Conferência interna: com a Binance na conta dá os 71% da v1, que saíram da fala.
const pct71 = (100 * Object.values(CLASSES).reduce((s, c) => s + soma(H, c), 0)) / total;
confere(Math.round(pct71) === 71, `com a Binance: ${pct71}`);
// O número da fala: a Binance fora do numerador e do denominador.
const parte = (c) => (100 * soma(semBin, c)) / totalSemBin;
const chave = parte(CLASSES.chave), sistema = parte(CLASSES.sistema), gente = parte(CLASSES.gente);
const pct62 = chave + sistema + gente;
perto(pct62, 62.4, 0.05, "chave + sistema + gente, sem a Binance");
confere(Math.round(pct62) === 62, `sem a Binance: ${pct62}`);
confere(comValorSemBin.length < 1300 && Math.round(comValorSemBin.length / 100) * 100 === 1300, "1.269 é \"quase 1.300\"");

// Mediana só dos ataques com valor informado, sem a Binance. Linha sem valor não entra como zero:
// valor desconhecido não é ataque de zero dólar.
const mediana = (v) => { const s = [...v].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const med = mediana(comValorSemBin.map(valor));
confere(med === FATOS.medianaComValor, `mediana ${med}`);
confere(med < FATOS.tetoMediana, `mediana ${med} não é "menos de 1 milhão"`);

const pctBin = (100 * valor(BIN)) / total;
confere(Math.round(pctBin) === 23, `Binance ${pctBin}%`);

// --- Fortaleza × Binance, em reais de set/2026 ---------------------------------------------
const FZ = FATOS.fortaleza;
const corrigidoMi = FZ.nominalMi * FZ.ipca;
confere(FZ.ipca === 3.097, "fator do IPCA");
confere(Math.round(corrigidoMi) === 510, `Fortaleza corrigido R$ ${corrigidoMi} mi`);
const binanceReaisBi = 6.4 * FZ.dolar;
perto(binanceReaisBi, 34.7, 0.05, "Binance em reais");
const razao = (binanceReaisBi * 1000) / corrigidoMi;
confere(razao > 60, `razão ${razao}`); // "mais de 60 vezes"

// --- as bolhas -------------------------------------------------------------------------------
// Empacotamento físico (colisão + gravidade), sem nada aleatório entre uma execução e outra.
// Layout A: os outros ataques com valor. Layout B: a Binance nasce no centro e empurra tudo.
// A gravidade em y é mais forte: o palco é mais largo que alto.
const R_BIN = 190; // raio da Binance em px; a área de todas as outras sai dessa escala
const k = R_BIN ** 2 / valor(BIN);
const raio = (v) => Math.max(1, Math.sqrt(v * k));
const CX = 540, CY = 790, PY = 1.32, FOLGA = 0.5;

// A Binance Bridge (2022) vai com o nome: o logo da BNB não aparece em nenhum ponto do vídeo.
const LOGOS = {
  "Bybit": "bybit", "Ronin Bridge": "ronin", "Poly Network": "poly-network", "Coincheck": "coincheck",
  "Mt. Gox": "mtgox", "FTX": "ftx", "Bitget": "bitget", "Portal": "portal",
};
const NOMES = { "LuBian": "LUBIAN", "Liquid Network": "LIQUID", "Binance Bridge": "BINANCE BRIDGE" }; // sem logo: vai o nome
const TOPO = 12; // quantas bolhas, das maiores, levam logo ou nome

const comValor = [...comValorSemBin].sort((a, b) => valor(b) - valor(a));
const corpos = comValor.map((x, i) => {
  const a = i * 2.39996, d = 7 * Math.sqrt(i + 1); // filotaxia: as maiores começam no meio
  return { nome: x.name, v: valor(x), r: raio(valor(x)), x: CX + d * Math.cos(a), y: CY + (d * Math.sin(a)) / PY };
});

/** Um passo: gravidade fraca e colisão. Grade pros pequenos; os grandes testam contra todos. */
const passo = (lista, grav) => {
  for (const c of lista) { if (c.fixo) continue; c.x += (CX - c.x) * grav; c.y += (CY - c.y) * grav * PY; }
  const grandes = lista.filter((c) => c.r > 14), pequenos = lista.filter((c) => c.r <= 14);
  const separa = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r + FOLGA;
    if (d >= min) return;
    const o = (min - d) / d;
    const pa = a.fixo ? 0 : b.fixo ? 1 : b.r ** 2 / (a.r ** 2 + b.r ** 2), pb = b.fixo ? 0 : 1 - pa;
    a.x -= dx * o * pa; a.y -= dy * o * pa; b.x += dx * o * pb; b.y += dy * o * pb;
  };
  for (let i = 0; i < grandes.length; i++) {
    for (let j = i + 1; j < grandes.length; j++) separa(grandes[i], grandes[j]);
    for (const p of pequenos) separa(grandes[i], p);
  }
  const L = 30, grade = new Map();
  const cel = (x, y) => `${Math.floor(x / L)},${Math.floor(y / L)}`;
  for (const p of pequenos) { const c = cel(p.x, p.y); if (!grade.has(c)) grade.set(c, []); grade.get(c).push(p); }
  for (const p of pequenos) {
    const gx = Math.floor(p.x / L), gy = Math.floor(p.y / L);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      for (const q of grade.get(`${gx + ox},${gy + oy}`) ?? []) if (p !== q && p.r + p.x * 1e-6 > q.r + q.x * 1e-6) separa(p, q);
    }
  }
};
for (let i = 0; i < 500; i++) passo(corpos, 0.02 * (1 - i / 700));
for (let i = 0; i < 80; i++) passo(corpos, 0);
const A = corpos.map((c) => [c.x, c.y]);

const bin = { nome: "Binance CEX", v: valor(BIN), r: 1, x: CX, y: CY, fixo: true };
const comBin = [bin, ...corpos];
for (let i = 0; i < 260; i++) { bin.r = Math.min(R_BIN, 4 + (R_BIN * i) / 180); passo(comBin, 0.004); }
for (let i = 0; i < 80; i++) passo(comBin, 0);

const bolhas = corpos.map((c, i) => ({
  a: [+A[i][0].toFixed(1), +A[i][1].toFixed(1)], b: [+c.x.toFixed(1), +c.y.toFixed(1)], r: +c.r.toFixed(2),
  d: Math.round(Math.hypot(A[i][0] - CX, A[i][1] - CY)),
  ...(i < TOPO - 1 && (LOGOS[c.nome] ? { logo: LOGOS[c.nome] } : { nome: NOMES[c.nome] ?? c.nome.toUpperCase() })),
}));

// Área: confere a escala nas bolhas acima do ponto mínimo.
for (const [i, c] of corpos.entries()) if (c.r > 1.01) perto(c.r ** 2 / c.v, k, k * 1e-9, `área da bolha ${i}`);
confere(bolhas.length === 1269, `${bolhas.length} bolhas + a da Binance`);
const noMinimo = corpos.filter((c) => c.r <= 1).length;
const areaBin = R_BIN ** 2 / corpos.reduce((s, c) => s + c.r ** 2, R_BIN ** 2);
perto(areaBin, valor(BIN) / total, 0.03, "fração da área da Binance na tela");
const extremos = (l) => [Math.min(...l.map((c) => c[0])), Math.max(...l.map((c) => c[0])), Math.min(...l.map((c) => c[1])), Math.max(...l.map((c) => c[1]))].map(Math.round);
const iLubian = corpos.findIndex((c) => c.nome === "LuBian");
confere(iLubian === 0 && corpos[0].v === 3.5e9, "LuBian é a 2ª maior, US$ 3,5 bi");
// A bolha do "ataque típico": a de valor igual à mediana; entre as que empatam, a mais perto do
// centro da nuvem.
const distMed = (c) => Math.abs(c.v - med);
const menor = Math.min(...corpos.map(distMed));
const candidatas = corpos.map((c, i) => [c, i]).filter(([c]) => distMed(c) === menor);
const tipica = candidatas.sort((p, q) => Math.hypot(p[0].x - CX, p[0].y - CY) - Math.hypot(q[0].x - CX, q[0].y - CY))[0][1];

const semValor = H.filter((x) => !valor(x)).length;
const valores = H.map(valor).filter(Boolean);
confere(corpos[tipica].v === med, "a bolha típica tem o valor da mediana");
const D = {
  fatos: FATOS,
  nLinhas: H.length, semValor, nBolhas: valores.length, nComValorSemBinance: comValorSemBin.length,
  total, binance: valor(BIN), mediana: med,
  pctBin: +pctBin.toFixed(2), pct62: +pct62.toFixed(1),
  partes: [
    { id: "chave", nome: "CHAVE", pct: +chave.toFixed(1) },
    { id: "sistema", nome: "SISTEMA", pct: +sistema.toFixed(1) },
    { id: "gente", nome: "GENTE ENGANADA", pct: +gente.toFixed(1) },
    { id: "resto", nome: "OUTROS", pct: +(100 - pct62).toFixed(1) },
  ],
  fortaleza: { ...FZ, corrigidoMi: +corrigidoMi.toFixed(1), binanceReaisBi: +binanceReaisBi.toFixed(1), razao: +razao.toFixed(1) },
  rBin: R_BIN, centro: [CX, CY], tipica, bolhas,
};
writeFileSync(SAIDA, `${JSON.stringify(D)}\n`);
console.log(`${D.nLinhas} linhas · ${semValor} sem valor · ${D.nBolhas} com valor · total ${(total / 1e9).toFixed(2)} bi · Binance ${D.pctBin}% · 62 → ${D.pct62}% (conferência 71 → ${pct71.toFixed(1)}%)`);
console.log(`mediana ${med} nos ${D.nComValorSemBinance} com valor, sem a Binance`);
console.log(`Fortaleza R$ ${D.fortaleza.corrigidoMi} mi · Binance R$ ${D.fortaleza.binanceReaisBi} bi · ${D.fortaleza.razao}×`);
console.log(`bolhas: ${D.nBolhas} · ${noMinimo} no ponto mínimo · área da Binance ${(100 * areaBin).toFixed(1)}% · A x/y ${extremos(A)} · B x/y ${extremos(corpos.map((c) => [c.x, c.y]))} · típica #${tipica} (US$ ${corpos[tipica].v}, r ${corpos[tipica].r.toFixed(1)})`);
