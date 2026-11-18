// Números do reel do Ueno Bank no Paraguai (ciencia/Paraguai). Confere cada número que a fala diz
// contra os arquivos em dados/ ou contra FATOS (o que só existe na imprensa), e para se algum não bater.
//
//   cd reels && node scripts/gerar-paraguai.mjs ../<pasta do reel>/dados src/ciencia/paraguai.json
//
// dados/ tem:
//   ine-proyeccion-nacional-1950-2050-rev2024.xlsx  INE, "Estimaciones y Proyecciones Nacional por año
//                                                   1950-2050. Revisión 2024" (baixado em 9/11/2026)
//   fix-ueno-bank-2026-04.pdf                       FIX SCR, informe de calificación do Ueno, 31/3/2026
//                                                   (participação nos depósitos em dez/2025, dados do BCP)
// A base do BCP (bcp.gov.py) devolveu 403 do Cloudflare em todas as páginas em 9/11/2026, então a fatia
// do Ueno no sistema vem da Moody's (set/2026) e da FIX (dez/2025), não de conta nossa.
//
// Correção de fato: mudar FATOS. Cada um tem a fonte ao lado.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-paraguai.mjs <pasta dados/> <saída.json>");

const FATOS = {
  clientes: 2941996, // jun/2026, número do banco (Perfil, 3/11/2026); não diz se são pessoas únicas
  depositosUsd: 2.8e9, // Bloomberg (Bloomberg Línea, 5/11); a AP dá US$ 2.836 mi a set/2026
  fatiaDepositos: 9, // % dos depósitos do sistema bancário, Moody's, set/2026 (InfoNegocios, La República)
  solvencia: 5.56, // % (Perfil, 3/11/2026)
  solvenciaMinima: 12, // % exigido pela norma (Perfil)
  resolucaoAprovada: "2/11", // diretoria do BCP, por unanimidade, Lei 2.334/2003 (Perfil)
  resolucaoComunicada: "3/11", // anúncio do BCP (AP; Primicias)
  trava: "4/11", // app, cartões e transferências param; agências fechadas (AP)
  primeiroPagamento: "5/11", // até G$ 10 mi (Infobae; Perfil)
  primeiraParcelaGs: 10e6,
  primeiraParcelaUsd: 1600, // "about $1,600" (AP); Infobae também dá ~1.600
  limiteSalarios: 75, // salários mínimos por pessoa e por banco (Perfil: G$ 228,3 mi)
  limiteGs: 228.3e6,
  clientesCobertos: 97, // % com o saldo todo coberto, estimativa preliminar do BCP (AP; InfoNegocios)
  valorDentroLimite: 30, // % do valor dos depósitos dentro da cobertura, Moody's, ago/2026 (InfoNegocios)
  ipsUsd: 355e6, // IPS, previdência pública (Perfil; AP via Infobae)
  destituicao: "6/11",
  votosSim: 44, votosNao: 0, ausentes: 1, senadores: 45, // Senado (Gazeta do Povo; Primicias; Infobae)
  acionistaAte: "mar/2025", // Peña, acionista de empresa do grupo (Ueno Holding) até março de 2025 (Primicias; Gazeta)
  fundadorPreso: "5/11", // seis executivos em prisão preventiva, entre eles o fundador, Miguel Vázquez (AP)
};

// --- INE: população a meados de 2026 e de 2022 (Total País, folha "Poblac a mitad de año 1950-2050") ---
const folha = execFileSync("unzip", ["-p", join(DADOS, "ine-proyeccion-nacional-1950-2050-rev2024.xlsx"), "xl/worksheets/sheet2.xml"], { maxBuffer: 64 << 20 }).toString();
const linha = (n) => {
  const m = folha.match(new RegExp(`<row r="${n}"[^>]*>(.*?)</row>`, "s"));
  if (!m) throw new Error(`INE: linha ${n} não achada`);
  return Object.fromEntries([...m[1].matchAll(/<c r="([A-Z]+)\d+"[^>]*?(?:t="(\w+)")?[^>]*>(?:<v>([^<]*)<\/v>)?<\/c>/g)].map(([, col, t, v]) => [col, { t, v }]));
};
const anos = linha(5), total = linha(7);
const colDoAno = (a) => Object.entries(anos).find(([, c]) => c.t !== "s" && Number(c.v) === a)?.[0];
const pop = (a) => {
  const col = colDoAno(a);
  if (!col) throw new Error(`INE: ano ${a} não achado`);
  return Number(total[col].v);
};
const pop2026 = pop(2026), pop2022 = pop(2022);
if (pop2026 < 6e6 || pop2026 > 7e6) throw new Error(`INE: população de 2026 estranha: ${pop2026}`);

// --- FIX: participação nos depósitos em dez/2025 (texto do informe) ---
const fix = execFileSync("pdftotext", [join(DADOS, "fix-ueno-bank-2026-04.pdf"), "-"]).toString().replace(/\s+/g, " ");
const mFix = fix.match(/5to en captaciones de dep[oó]sitos con una participaci[oó]n de mercado del ([\d,]+)% y ([\d,]+)%/);
if (!mFix) throw new Error("FIX: frase da participação não achada");
const fixDepositos = Number(mFix[2].replace(",", "."));

// --- conferências: cada número da fala ---
const erros = [];
const confere = (ok, msg) => { if (!ok) erros.push(msg); };
confere(FATOS.clientes > 2.9e6 && FATOS.clientes < 3e6, `"quase 3 milhões" pede entre 2,9 e 3 mi: ${FATOS.clientes}`);
confere(Math.round(pop2026 / 1e5) / 10 === 6.5, `"6,5 milhões de pessoas" pede 6,45–6,55 mi: ${pop2026}`);
confere(Math.round(FATOS.depositosUsd / 1e8) / 10 === 2.8, `"2,8 bilhões": ${FATOS.depositosUsd}`);
confere(FATOS.fatiaDepositos >= 8 && FATOS.fatiaDepositos < 10, `"quase 1 em cada 10" pede 8–10%: ${FATOS.fatiaDepositos}`);
confere(Math.abs(fixDepositos - FATOS.fatiaDepositos) <= 1.5, `FIX (${fixDepositos}%) longe da Moody's (${FATOS.fatiaDepositos}%)`);
confere(FATOS.solvencia < FATOS.solvenciaMinima / 2, `"abaixo da metade do mínimo": ${FATOS.solvencia} × ${FATOS.solvenciaMinima}`);
confere(FATOS.clientesCobertos === 97, `"97%": ${FATOS.clientesCobertos}`);
confere(FATOS.valorDentroLimite === 30, `"30%": ${FATOS.valorDentroLimite}`);
confere(FATOS.votosSim === 44 && FATOS.votosNao === 0 && FATOS.votosSim + FATOS.ausentes === FATOS.senadores, `"44 a 0": ${FATOS.votosSim}–${FATOS.votosNao}`);
// "quatro dias depois": da resolução aprovada (2/11) à destituição (6/11)
const dia = (s) => Number(s.split("/")[0]);
confere(dia(FATOS.destituicao) - dia(FATOS.resolucaoAprovada) === 4, `"quatro dias depois": ${FATOS.resolucaoAprovada} → ${FATOS.destituicao}`);
confere(FATOS.acionistaAte.endsWith("2025"), `"até 2025": ${FATOS.acionistaAte}`);
if (erros.length) throw new Error(`números da fala não batem:\n  - ${erros.join("\n  - ")}`);

const D = {
  fatos: FATOS,
  ine: { pop2026, pop2022, fonte: "INE, Estimaciones y Proyecciones Nacional, Revisión 2024 (mitad de año)" },
  fix: { depositosDez2025: fixDepositos },
  // conta nossa, só pra conferência (não vai pra fala: cliente não é pessoa única)
  razaoClientesPop: +(FATOS.clientes / pop2026).toFixed(4),
};
writeFileSync(SAIDA, `${JSON.stringify(D, null, 1)}\n`);
console.log(`INE 2026: ${pop2026} (2022: ${pop2022}) · clientes/pop ${(D.razaoClientesPop * 100).toFixed(1)}% · FIX dez/2025 ${fixDepositos}% · Moody's set/2026 ${FATOS.fatiaDepositos}%`);
