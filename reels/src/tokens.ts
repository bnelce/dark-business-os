import { loadFont } from "@remotion/google-fonts/Poppins";

// Espelha a paleta de identidade/design-guide.md (seção "Cores") e de
// scripts/gerar-carrossel-educativo.js. Reel e carrossel dividem o mesmo feed:
// paleta diferente faria os dois lerem como contas diferentes.
// Ao mudar a paleta lá, mudar aqui.

// Texto: #FAFAF7 sobre fundo escuro/vívido, #1A1A1A sobre fundo claro —
// exatamente a regra do design-guide, e o mesmo `claro` do gerador de carrossel.
export const TEXTO_CLARO = "#FAFAF7";
export const TEXTO_ESCURO = "#1A1A1A";

const RGB: Record<string, string> = {
  [TEXTO_CLARO]: "250,250,247",
  [TEXTO_ESCURO]: "26,26,26",
};

export type Cor = {
  fundo: string;
  texto: string;
  /** Cor da palavra em ênfase e da barra do cronômetro. */
  destaque: string;
  /** Texto secundário (marca), na cor do texto com opacidade. */
  textoSuave: string;
  /** Trilho do cronômetro, na cor do texto com opacidade baixa. */
  trilha: string;
};

// destaque = a cor da paleta com maior contraste medido contra o fundo,
// descartando a própria cor do texto. Em fundo claro isso dá sempre o roxo
// escuro; em fundo vívido, a cor de texto oposta ou o verde.
function cor(fundo: string, texto: string, destaque: string): Cor {
  return {
    fundo,
    texto,
    destaque,
    textoSuave: `rgba(${RGB[texto]},0.75)`,
    trilha: `rgba(${RGB[texto]},0.2)`,
  };
}

// Uma cor da marca por disciplina, seguindo o cronograma de cor do design-guide
// ("Biologia: roxo/verde, Química: rosa/azul, Física: azul/roxo,
// História/Geografia: coral/roxo escuro"). O roxo #667eea, fundo principal da
// marca, fica de padrão pras disciplinas ainda sem cor própria.
export const CORES: Record<string, Cor> = {
  biologia: cor("#43e97b", TEXTO_ESCURO, "#764ba2"),
  quimica: cor("#f093fb", TEXTO_ESCURO, "#764ba2"),
  fisica: cor("#4facfe", TEXTO_ESCURO, "#764ba2"),
  historia: cor("#fa709a", TEXTO_CLARO, TEXTO_ESCURO),
  geografia: cor("#764ba2", TEXTO_CLARO, "#43e97b"),
};

export const COR_PADRAO: Cor = cor("#667eea", TEXTO_CLARO, TEXTO_ESCURO);

export function coresDa(disciplina: string): Cor {
  return CORES[disciplina] ?? COR_PADRAO;
}

const { fontFamily } = loadFont("normal", {
  weights: ["700", "800", "900"],
  subsets: ["latin", "latin-ext"],
});

export const FONTE = `${fontFamily}, system-ui, -apple-system, sans-serif`;
