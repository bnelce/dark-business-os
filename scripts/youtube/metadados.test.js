import { test } from "node:test";
import assert from "node:assert/strict";
import { montarMetadados, contarCaracteresDeTags } from "./metadados.js";

const base = { titulo: "Hackers esquentaram geladeiras", descricao: "Texto.\n\nhttps://a2lo.dev", tags: ["hacker", "segurança digital"] };

test("monta snippet e status com os padrões da A2LO", () => {
  const m = montarMetadados(base);
  assert.equal(m.snippet.title, base.titulo);
  assert.equal(m.snippet.description, base.descricao);
  assert.deepEqual(m.snippet.tags, base.tags);
  assert.equal(m.snippet.categoryId, "28", "Ciência e tecnologia");
  assert.equal(m.snippet.defaultLanguage, "pt-BR");
  assert.equal(m.snippet.defaultAudioLanguage, "pt-BR");
  assert.equal(m.status.privacyStatus, "private", "sem pedir nada, sobe privado");
  assert.equal(m.status.selfDeclaredMadeForKids, false);
  assert.equal(m.status.containsSyntheticMedia, false);
  assert.equal("publishAt" in m.status, false);
});

test("público quando pedido", () => {
  assert.equal(montarMetadados(base, { privacidade: "public" }).status.privacyStatus, "public");
});

test("agendado: força privado + publishAt, que é como o YouTube agenda", () => {
  const quando = new Date(Date.now() + 3_600_000).toISOString();
  const m = montarMetadados(base, { privacidade: "public", publicarEm: quando });
  assert.equal(m.status.privacyStatus, "private");
  assert.equal(m.status.publishAt, quando);
});

test("recusa agendamento no passado", () => {
  assert.throws(() => montarMetadados(base, { publicarEm: "2020-01-01T10:00:00Z" }), /passado/);
});

test("recusa título vazio, longo ou com < >", () => {
  assert.throws(() => montarMetadados({ ...base, titulo: "" }), /título/);
  assert.throws(() => montarMetadados({ ...base, titulo: "x".repeat(101) }), /100/);
  assert.throws(() => montarMetadados({ ...base, titulo: "a < b" }), /< ou >/);
});

test("recusa descrição acima de 5000 bytes ou com < >", () => {
  assert.throws(() => montarMetadados({ ...base, descricao: "é".repeat(2600) }), /5000/);
  assert.throws(() => montarMetadados({ ...base, descricao: "menor <que>" }), /< ou >/);
});

test("tags: conta como o YouTube (aspas em tag com espaço, vírgula entre elas) e recusa acima de 500", () => {
  assert.equal(contarCaracteresDeTags(["ab", "c d"]), 2 + 1 + (3 + 2));
  const muitas = Array.from({ length: 60 }, (_, i) => `tag numero ${i}`);
  assert.throws(() => montarMetadados({ ...base, tags: muitas }), /500/);
});

test("categoria e idioma podem ser trocados", () => {
  const m = montarMetadados({ ...base, categoria: "27", idioma: "en" });
  assert.equal(m.snippet.categoryId, "27");
  assert.equal(m.snippet.defaultLanguage, "en");
});
