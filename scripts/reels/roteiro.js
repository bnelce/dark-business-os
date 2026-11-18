import { readFile } from "node:fs/promises";

export const FORMATOS = ["quiz-relampago", "erro-comum", "tema-em-15s", "voce-sabia", "resolucao-questao", "revelacao", "consulta", "dados"];

const CAMPOS_DE_BEAT = ["id", "textoTela", "narracao"];

// A fase atual do negócio proíbe CTA de venda (ver _memoria/estrategia.md).
const SINAIS_DE_VENDA = [/R\$\s*\d/, /link na bio/i, /https?:\/\//i];

function normalizar(texto) {
  return String(texto).replace(/\s+/g, " ").trim().toLowerCase();
}

// Mesma normalização do componente Cartela (reels/src/componentes/Cartela.tsx):
// sem ela "90%" e "Salva." nunca casam com a ênfase e o destaque some calado.
export function normalizarPalavra(texto) {
  return String(texto).replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
}

export function verificarSinaisDeVenda(texto) {
  return SINAIS_DE_VENDA.some((re) => re.test(texto));
}

export function validarRoteiro(roteiro) {
  const erros = [];

  if (!roteiro || typeof roteiro !== "object") {
    return { ok: false, erros: ["roteiro precisa ser um objeto"] };
  }

  if (!FORMATOS.includes(roteiro.formato)) {
    erros.push(`formato inválido: ${JSON.stringify(roteiro.formato)}. Esperado um de: ${FORMATOS.join(", ")}`);
  }

  for (const campo of ["disciplina", "tema"]) {
    if (!roteiro[campo]) erros.push(`campo obrigatório ausente: ${campo}`);
  }

  if (!Array.isArray(roteiro.beats) || roteiro.beats.length === 0) {
    erros.push("beats precisa ser um array com pelo menos um item");
  } else {
    roteiro.beats.forEach((beat, i) => {
      for (const campo of CAMPOS_DE_BEAT) {
        if (!beat?.[campo]) erros.push(`beats[${i}]: campo obrigatório ausente: ${campo}`);
      }
      if (beat?.textoTela && beat?.narracao && normalizar(beat.textoTela) === normalizar(beat.narracao)) {
        erros.push(`beats[${i}]: textoTela e narracao são iguais. Tela é pra ler em meio segundo, narração é pra ouvir — escreva os dois.`);
      }
      if (beat?.enfase && beat?.textoTela) {
        const alvo = normalizarPalavra(beat.enfase);
        const casa = String(beat.textoTela).split(/\s+/).some((p) => normalizarPalavra(p) === alvo);
        if (!casa) {
          erros.push(`beats[${i}]: enfase ${JSON.stringify(beat.enfase)} não aparece como palavra em textoTela — o destaque sairia sem efeito e sem erro nenhum.`);
        }
      }
      const texto = `${beat?.textoTela ?? ""} ${beat?.narracao ?? ""}`;
      if (verificarSinaisDeVenda(texto)) {
        erros.push(`beats[${i}]: CTA de venda (preço ou link) não é permitido nesta fase. Use CTA de crescimento: salvar, seguir.`);
      }
    });
  }

  if (!roteiro.legenda?.corpo) erros.push("legenda.corpo é obrigatório");
  if (roteiro.legenda?.corpo && verificarSinaisDeVenda(roteiro.legenda.corpo)) {
    erros.push(`legenda.corpo: CTA de venda (preço ou link) não é permitido nesta fase. Use CTA de crescimento: salvar, seguir.`);
  }
  if (roteiro.legenda?.cta && verificarSinaisDeVenda(roteiro.legenda.cta)) {
    erros.push(`legenda.cta: CTA de venda (preço ou link) não é permitido nesta fase. Use CTA de crescimento: salvar, seguir.`);
  }
  if (!Array.isArray(roteiro.hashtags) || roteiro.hashtags.length === 0) {
    erros.push("hashtags precisa ser um array com pelo menos um item");
  }

  return { ok: erros.length === 0, erros };
}

export async function carregarRoteiro(caminho) {
  const roteiro = JSON.parse(await readFile(caminho, "utf-8"));
  const { ok, erros } = validarRoteiro(roteiro);
  if (!ok) throw new Error(`Roteiro inválido (${caminho}):\n  - ${erros.join("\n  - ")}`);
  return roteiro;
}
