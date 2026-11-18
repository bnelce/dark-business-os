// Gera os dados do reel do voto branco e nulo (ciencia/VotoNulo) a partir dos Boletins de
// Urna do 2º turno de 2026, com o exterior: brancos, nulos, válidos e a grade de pontos
// (um ponto = 100 mil votos) que o vídeo desenha.
//
//   node scripts/gerar-voto-nulo.mjs <pasta dados/ do reel da apuração> src/ciencia/voto-nulo.json
import { writeFileSync } from "node:fs";
import { lerSecoes } from "./secoes.mjs";

const [DADOS, SAIDA] = process.argv.slice(2);
if (!DADOS || !SAIDA) throw new Error("uso: gerar-voto-nulo.mjs <dados/> <saída.json>");

const OFICIAL = { lula: 64256232, flavio: 59826041 };
const COD = { lula: "13", flavio: "22", branco: "95", nulo: "96" };

const t = { aptos: 0, comparecimento: 0, lula: 0, flavio: 0, branco: 0, nulo: 0 };
for (const s of lerSecoes(DADOS)) {
  t.aptos += s.aptos;
  t.comparecimento += s.comparecimento;
  for (const [k, cod] of Object.entries(COD)) t[k] += s.votos[cod] ?? 0;
}
for (const c of ["lula", "flavio"]) if (t[c] !== OFICIAL[c]) throw new Error(`${c}: ${t[c]} votos, oficial ${OFICIAL[c]}`);
const soma = t.lula + t.flavio + t.branco + t.nulo;
if (soma !== t.comparecimento) throw new Error(`votos (${soma}) não fecham com o comparecimento (${t.comparecimento})`);

const validos = t.lula + t.flavio;
const pct = (n, total) => +((100 * n) / total).toFixed(2);

// Grade: maiores restos, pra soma dos pontos fechar com o comparecimento arredondado.
const UM_PONTO = 100_000;
const cats = ["lula", "flavio", "branco", "nulo"];
const alvo = Math.round(t.comparecimento / UM_PONTO);
const grade = Object.fromEntries(cats.map((c) => [c, Math.floor(t[c] / UM_PONTO)]));
const sobra = alvo - cats.reduce((s, c) => s + grade[c], 0);
[...cats].sort((a, b) => (t[b] % UM_PONTO) - (t[a] % UM_PONTO)).slice(0, sobra).forEach((c) => grade[c]++);

const saida = {
  fonte: "TSE, Boletim de Urna, 2º turno de 25/10/2026, Presidente",
  ...t, validos,
  dosValidos: { lula: pct(t.lula, validos), flavio: pct(t.flavio, validos) },
  doComparecimento: { branco: pct(t.branco, t.comparecimento), nulo: pct(t.nulo, t.comparecimento) },
  umPonto: UM_PONTO, grade,
};
writeFileSync(SAIDA, `${JSON.stringify(saida, null, 2)}\n`);
console.log(JSON.stringify(saida));
