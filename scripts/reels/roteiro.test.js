import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validarRoteiro, normalizarPalavra } from "./roteiro.js";

function roteiroValido() {
  return {
    formato: "quiz-relampago",
    disciplina: "fisica",
    tema: "MRU",
    beats: [
      { id: "gancho", textoTela: "Você sabe\nresponder isso?", narracao: "Teste seus conhecimentos!" },
      { id: "pergunta", textoTela: "60 km/h por 2h\n= quantos km?", narracao: "Um carro a sessenta quilômetros por hora durante duas horas percorre quantos quilômetros?" },
      { id: "resposta", textoTela: "120 km", narracao: "Cento e vinte quilômetros.", enfase: "120" },
      { id: "cta", textoTela: "Salva pra revisar", narracao: "Salva esse pra revisar antes da prova." },
    ],
    legenda: { corpo: "Revisão de MRU.", cta: "Salva pra revisar depois." },
    hashtags: ["#fisica", "#enem"],
  };
}

test("aceita um roteiro bem formado", () => {
  const { ok, erros } = validarRoteiro(roteiroValido());
  assert.deepEqual(erros, []);
  assert.equal(ok, true);
});

test("rejeita formato desconhecido", () => {
  const r = roteiroValido();
  r.formato = "dancinha";
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("formato")));
});

test("rejeita beat onde textoTela e narracao são iguais", () => {
  const r = roteiroValido();
  r.beats[0].narracao = r.beats[0].textoTela;
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("beats[0]") && e.includes("iguais")));
});

test("compara textoTela e narracao ignorando quebra de linha e caixa", () => {
  const r = roteiroValido();
  r.beats[0].textoTela = "Você Sabe\nResponder Isso?";
  r.beats[0].narracao = "você sabe responder isso?";
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false, "quebra de linha e caixa não devem mascarar duplicação");
  assert.ok(erros.some((e) => e.includes("iguais")));
});

test("rejeita roteiro sem beats", () => {
  const r = roteiroValido();
  r.beats = [];
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("beats")));
});

test("rejeita beat com campo obrigatório faltando", () => {
  const r = roteiroValido();
  delete r.beats[2].narracao;
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("beats[2]") && e.includes("narracao")));
});

test("rejeita CTA com preço ou link, que a fase atual proíbe", () => {
  const r = roteiroValido();
  r.beats[3].textoTela = "Combo por R$47";
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("CTA de venda")));
});

test("acumula todos os erros em vez de parar no primeiro", () => {
  const { erros } = validarRoteiro({ formato: "dancinha", beats: [] });
  assert.ok(erros.length >= 3, `esperava vários erros, veio ${erros.length}`);
});

test("rejeita beat com 'link na bio' na narracao", () => {
  const r = roteiroValido();
  r.beats[3].narracao = "Salva esse pra revisar — link na bio para mais";
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("beats[3]") && e.includes("CTA de venda")));
});

test("rejeita beat com URL no textoTela", () => {
  const r = roteiroValido();
  r.beats[3].textoTela = "Clique em https://revisaorapida1ano.com";
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("beats[3]") && e.includes("CTA de venda")));
});

test("rejeita legenda.corpo com preço", () => {
  const r = roteiroValido();
  r.legenda.corpo = "Revisão de MRU. Combo completo por R$47.";
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("legenda.corpo") && e.includes("CTA de venda")));
});

test("rejeita legenda.cta com link", () => {
  const r = roteiroValido();
  r.legenda.cta = "Compre em https://hotmart.com/revisaorapida";
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("legenda.cta") && e.includes("CTA de venda")));
});

test("aceita roteiro sem legenda.cta (campo opcional)", () => {
  const r = roteiroValido();
  delete r.legenda.cta;
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, true);
  assert.deepEqual(erros, []);
});

// --- ênfase --------------------------------------------------------------
//
// A ênfase é comparada palavra a palavra depois de tirar a pontuação, nos DOIS
// lados. Comparando a palavra limpa com a ênfase crua, "90%" e "Salva." — os
// valores do roteiro de exemplo do próprio design — nunca casam, e o reel sai
// sem destaque nenhum sem erro em lugar nenhum.

test("normaliza palavra e ênfase do mesmo jeito, pontuação inclusa", () => {
  assert.equal(normalizarPalavra("90%"), normalizarPalavra("90"));
  assert.equal(normalizarPalavra("Salva."), normalizarPalavra("salva"));
  assert.equal(normalizarPalavra("120"), "120");
  assert.notEqual(normalizarPalavra("120"), normalizarPalavra("121"));
});

test("aceita ênfase com pontuação que aparece no textoTela", () => {
  const r = roteiroValido();
  r.beats[2].textoTela = "Cai em 90%\ndas provas";
  r.beats[2].enfase = "90%";
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, true, `não deveria reclamar: ${erros.join(" | ")}`);
});

test("aceita ênfase escrita sem a pontuação que a palavra da tela tem", () => {
  const r = roteiroValido();
  r.beats[3].textoTela = "Salva. Revisa depois";
  r.beats[3].enfase = "Salva";
  const { ok } = validarRoteiro(r);
  assert.equal(ok, true);
});

test("rejeita ênfase que não aparece no textoTela do beat", () => {
  const r = roteiroValido();
  r.beats[2].enfase = "130";
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("beats[2]") && e.includes("enfase")));
});

test("rejeita ênfase que só existe na narração, não na tela", () => {
  const r = roteiroValido();
  r.beats[1].enfase = "quilômetros";
  const { ok, erros } = validarRoteiro(r);
  assert.equal(ok, false);
  assert.ok(erros.some((e) => e.includes("beats[1]")));
});

// O componente Remotion vive noutro pacote npm e não dá pra importar daqui.
// Esta é a checagem barata de que ele normaliza os dois lados da comparação —
// sem isso a validação acima passaria e o destaque ainda sumiria no vídeo.
test("Cartela.tsx normaliza também a ênfase, não só a palavra", () => {
  const fonte = readFileSync(join(import.meta.dirname, "../../reels/src/componentes/Cartela.tsx"), "utf-8");
  assert.match(fonte, /normalizarPalavra\(palavra\)\s*===\s*normalizarPalavra\(enfase/);
});
