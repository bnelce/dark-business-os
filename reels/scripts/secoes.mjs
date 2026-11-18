// Leitura das seções agregadas por scripts/eleicoes/baixa.sh (um CSV por UF em
// <dados>/secoes/), pros scripts que geram dados de reel. Cada linha é uma seção:
// hora de chegada, UF, município, zona, seção, aptos, comparecimento e os votos em JSON
// (13 = Lula, 22 = Flávio, 95 = branco, 96 = nulo, no 2º turno de 2026).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** CSV mínimo: o csv.writer do Python só põe aspas quando precisa, e dobra as internas. */
const campos = (linha) => {
  const out = [];
  let i = 0;
  while (i <= linha.length) {
    if (linha[i] === '"') {
      let s = "";
      i++;
      for (;;) {
        const j = linha.indexOf('"', i);
        s += linha.slice(i, j);
        if (linha[j + 1] === '"') { s += '"'; i = j + 2; } else { i = j + 2; break; }
      }
      out.push(s);
    } else {
      const j = linha.indexOf(",", i);
      const fim = j < 0 ? linha.length : j;
      out.push(linha.slice(i, fim));
      i = fim + 1;
    }
  }
  return out;
};

export function lerSecoes(dados) {
  const secoes = [];
  for (const arq of readdirSync(join(dados, "secoes")).filter((a) => a.endsWith(".csv")).sort()) {
    for (const linha of readFileSync(join(dados, "secoes", arq), "utf-8").split("\n")) {
      if (!linha) continue;
      const [hora, uf, mun, nome, , , aptos, comparecimento, v] = campos(linha);
      secoes.push({ hora, uf, mun, nome, aptos: +aptos, comparecimento: +comparecimento, votos: JSON.parse(v) });
    }
  }
  return secoes;
}

/** Semente fixa: o vídeo sai igual a cada geração. */
export const sorteador = (semente) => {
  let a = semente;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
};
