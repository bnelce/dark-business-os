import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { getInputProps } from "remotion";

// Paleta trocável: render com --props='{"marca":"a2lo"}' usa a identidade da A2LO
// (A2LO/identidade: tinta, papel, verde; âmbar como 2ª cor de comparação; Geist).
const A2LO = (getInputProps() as { marca?: string })?.marca === "a2lo";

// Espelha negocios/ciencia-visual/identidade/design-guide.md. Ao mudar a paleta lá,
// mudar aqui. Nada de Poppins nem papel: essa é a identidade do Ciência Visual, não a
// da Revisão Rápida (tokens.ts e lab/base.tsx continuam sendo da marca antiga).

export const FUNDO = A2LO ? "#0E0E0E" : "#05070C";
export const FUNDO_CENTRO = A2LO ? "#16201B" : "#0C1424";
export const CIANO = A2LO ? "#2FD196" : "#5CE1FF";
export const LARANJA = A2LO ? "#E5A93A" : "#FF7A45"; // um único ponto quente por peça
export const TEXTO = A2LO ? "#F2F0EB" : "#E8F4FF";
export const TEXTO_2 = A2LO ? "#9BA19E" : "#8592AB";

const { fontFamily: sora } = loadSora("normal", { weights: ["300", "400"], subsets: ["latin", "latin-ext"] });
const { fontFamily: mono } = loadMono("normal", { weights: ["300", "400"], subsets: ["latin", "latin-ext"] });

const geist = A2LO ? loadGeist("normal", { weights: ["300", "400"], subsets: ["latin", "latin-ext"] }).fontFamily : "";
const geistMono = A2LO ? loadGeistMono("normal", { weights: ["300", "400"], subsets: ["latin", "latin-ext"] }).fontFamily : "";
export const SORA = A2LO ? `${geist}, system-ui, sans-serif` : `${sora}, system-ui, sans-serif`;
export const MONO = A2LO ? `${geistMono}, ui-monospace, monospace` : `${mono}, ui-monospace, monospace`;

/** Número no formato brasileiro, com vírgula. */
export const br = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");
