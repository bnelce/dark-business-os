import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lerRegistro, atualizarRegistro, colher } from "./colher.js";

const REGISTRO = [
  "# Publicado", "",
  "- **Tipo:** trial reel (graduation_strategy SS_PERFORMANCE)",
  "- **Media ID:** MEDIA1",
  "- **Permalink:** https://instagram.com/p/abc",
  "- **Publicado em:** 2026-09-01T10:00:00.000Z",
  "- **Graduou:** pendente", "",
].join("\n");

test("extrai media id, data e status pendente", () => {
  const r = lerRegistro(REGISTRO);
  assert.equal(r.mediaId, "MEDIA1");
  assert.equal(r.graduou, "pendente");
  assert.equal(r.publicadoEm.toISOString(), "2026-09-01T10:00:00.000Z");
});

test("marca como graduado e anexa as métricas", () => {
  const novo = atualizarRegistro(REGISTRO, { graduou: true, metricas: { views: 4200, saves: 88 } });
  assert.ok(novo.includes("- **Graduou:** sim"));
  assert.ok(novo.includes("4200"));
  assert.ok(novo.includes("88"));
  assert.ok(!novo.includes("pendente"), "não pode sobrar o status antigo");
});

test("marca como não graduado", () => {
  const novo = atualizarRegistro(REGISTRO, { graduou: false, metricas: { views: 120, saves: 1 } });
  assert.ok(novo.includes("- **Graduou:** não"));
});

test("preserva o media id ao reescrever", () => {
  const novo = atualizarRegistro(REGISTRO, { graduou: true, metricas: {} });
  assert.equal(lerRegistro(novo).mediaId, "MEDIA1");
});

// --- colher() -----------------------------------------------------------
//
// Fixtures vivem em diretórios temporários (mkdtemp), nunca em
// marketing/reels/ — essa pasta só passa a existir na Task 11. `deps.graphGet`
// é sempre injetado e `accessToken` é sempre passado explicitamente, então
// nenhum teste aqui toca a API real nem lê META_PAGE_ACCESS_TOKEN via env().

function registroTexto({ mediaId = "MEDIA1", horasAtras, graduou = "pendente" }) {
  const publicadoEm = new Date(Date.now() - horasAtras * 3_600_000).toISOString();
  return [
    "# Publicado", "",
    "- **Tipo:** trial reel (graduation_strategy SS_PERFORMANCE)",
    `- **Media ID:** ${mediaId}`,
    "- **Permalink:** https://instagram.com/p/abc",
    `- **Publicado em:** ${publicadoEm}`,
    `- **Graduou:** ${graduou}`, "",
  ].join("\n");
}

async function criarPasta(raiz, nome, conteudo) {
  const pasta = join(raiz, nome);
  await mkdir(pasta, { recursive: true });
  if (conteudo !== null) {
    await writeFile(join(pasta, "publicado.md"), conteudo);
  }
  return pasta;
}

test("colher: pasta fora da janela de 72h com registro pendente é colhida e o arquivo é reescrito", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const pasta = await criarPasta(raiz, "reel-1", registroTexto({ horasAtras: 100 }));

  const chamadas = [];
  const graphGet = async (mediaId, params) => {
    chamadas.push({ mediaId, params });
    return { is_shared_to_feed: true, like_count: 42, comments_count: 7 };
  };

  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].pasta, "reel-1");
  assert.equal(resultados[0].graduou, true);
  assert.equal(chamadas.length, 1, "graphGet deve ser chamado exatamente uma vez");
  assert.equal(chamadas[0].mediaId, "MEDIA1");

  const textoFinal = await readFile(join(pasta, "publicado.md"), "utf-8");
  assert.ok(textoFinal.includes("- **Graduou:** sim"));
  assert.ok(textoFinal.includes("42"));
  assert.ok(textoFinal.includes("7"));
  assert.ok(!textoFinal.includes("pendente"));
});

test("colher: pasta dentro da janela de 72h é deixada em paz e graphGet nunca é chamado", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const pasta = await criarPasta(raiz, "reel-2", registroTexto({ horasAtras: 10 }));
  const textoAntes = await readFile(join(pasta, "publicado.md"), "utf-8");

  let chamado = false;
  const graphGet = async () => {
    chamado = true;
    return { is_shared_to_feed: true, like_count: 1, comments_count: 1 };
  };

  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.equal(resultados.length, 0);
  assert.equal(chamado, false, "graphGet não pode ser chamado dentro da janela de 72h");

  const textoDepois = await readFile(join(pasta, "publicado.md"), "utf-8");
  assert.equal(textoDepois, textoAntes, "o arquivo não pode mudar quando ainda está na janela");
});

test("colher: registro já resolvido (Graduou: sim) é pulado e graphGet nunca é chamado", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const pasta = await criarPasta(raiz, "reel-3", registroTexto({ horasAtras: 200, graduou: "sim" }));
  const textoAntes = await readFile(join(pasta, "publicado.md"), "utf-8");

  let chamado = false;
  const graphGet = async () => {
    chamado = true;
    return { is_shared_to_feed: true, like_count: 1, comments_count: 1 };
  };

  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.equal(resultados.length, 0);
  assert.equal(chamado, false, "graphGet não pode ser chamado pra registro já resolvido");

  const textoDepois = await readFile(join(pasta, "publicado.md"), "utf-8");
  assert.equal(textoDepois, textoAntes, "um registro já resolvido não pode ser reescrito");
});

test("colher: registro já resolvido (Graduou: não) também é pulado e graphGet nunca é chamado", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const pasta = await criarPasta(raiz, "reel-3b", registroTexto({ horasAtras: 200, graduou: "não" }));
  const textoAntes = await readFile(join(pasta, "publicado.md"), "utf-8");

  let chamado = false;
  const graphGet = async () => {
    chamado = true;
    return { is_shared_to_feed: true, like_count: 1, comments_count: 1 };
  };

  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.equal(resultados.length, 0);
  assert.equal(chamado, false);

  const textoDepois = await readFile(join(pasta, "publicado.md"), "utf-8");
  assert.equal(textoDepois, textoAntes);
});

test("colher: reel que não graduou é gravado como 'não' no arquivo, não só no retorno", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const pasta = await criarPasta(raiz, "reel-4", registroTexto({ horasAtras: 100 }));

  const graphGet = async () => ({ is_shared_to_feed: false, like_count: 3, comments_count: 0 });

  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].graduou, false);

  const textoFinal = await readFile(join(pasta, "publicado.md"), "utf-8");
  assert.ok(textoFinal.includes("- **Graduou:** não"));
  assert.ok(!textoFinal.includes("- **Graduou:** sim"));
});

test("colher: pasta sem publicado.md é pulada sem lançar, e as outras seguem sendo colhidas", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  await criarPasta(raiz, "reel-sem-publicado", null);
  await criarPasta(raiz, "reel-com-publicado", registroTexto({ horasAtras: 100 }));

  const graphGet = async () => ({ is_shared_to_feed: true, like_count: 1, comments_count: 1 });

  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].pasta, "reel-com-publicado");
});

test("colher: is_shared_to_feed ausente não vira veredito — o registro fica pendente", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const pasta = await criarPasta(raiz, "reel-ambiguo", registroTexto({ horasAtras: 100 }));
  const textoAntes = await readFile(join(pasta, "publicado.md"), "utf-8");

  const graphGet = async () => ({ media_product_type: "REELS", like_count: 5, comments_count: 0 });

  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.equal(resultados.length, 0, "resposta ambígua não é reel colhido");

  const textoDepois = await readFile(join(pasta, "publicado.md"), "utf-8");
  assert.equal(textoDepois, textoAntes, "gravar 'não' fecha o registro pra sempre com um veredito inventado");
  assert.ok(lerRegistro(textoDepois).graduou === "pendente");
});

test("colher: is_shared_to_feed null também deixa o registro pendente", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const pasta = await criarPasta(raiz, "reel-nulo", registroTexto({ horasAtras: 100 }));

  const graphGet = async () => ({ is_shared_to_feed: null, like_count: 1, comments_count: 1 });
  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.equal(resultados.length, 0);
  assert.equal(lerRegistro(await readFile(join(pasta, "publicado.md"), "utf-8")).graduou, "pendente");
});

test("colher: raiz inexistente devolve lista vazia em vez de ENOENT cru", async () => {
  const raiz = join(await mkdtemp(join(tmpdir(), "colher-")), "marketing", "reels");

  let chamado = false;
  const graphGet = async () => { chamado = true; return {}; };

  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.deepEqual(resultados, [], "a primeira colheita roda antes de existir qualquer reel");
  assert.equal(chamado, false);
});

test("colher: registro sem data legível é pulado sem quebrar as outras pastas", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const semData = [
    "# Publicado", "",
    "- **Media ID:** MEDIA-SEM-DATA",
    "- **Graduou:** pendente", "",
  ].join("\n");
  await criarPasta(raiz, "reel-sem-data", semData);
  await criarPasta(raiz, "reel-ok", registroTexto({ mediaId: "MEDIA-OK", horasAtras: 100 }));

  const vistos = [];
  const graphGet = async (mediaId) => {
    vistos.push(mediaId);
    return { is_shared_to_feed: true, like_count: 1, comments_count: 1 };
  };

  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.deepEqual(vistos, ["MEDIA-OK"]);
  assert.equal(resultados.length, 1);
});

// --- reel normal --------------------------------------------------------
//
// Reel normal já está no feed: o colher só registra métricas uma vez, sem
// pedir nem interpretar is_shared_to_feed.

function registroNormal({ tipo = "reel normal", horasAtras }) {
  const publicadoEm = new Date(Date.now() - horasAtras * 3_600_000).toISOString();
  return [
    "# Publicado", "",
    `- **Tipo:** ${tipo}`,
    "- **Media ID:** MEDIA-N",
    "- **Permalink:** https://instagram.com/p/n",
    `- **Publicado em:** ${publicadoEm}`, "",
  ].join("\n");
}

test("colher: reel normal depois de 72h registra métricas sem veredito de graduação", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const pasta = await criarPasta(raiz, "reel-normal", registroNormal({ horasAtras: 100 }));

  const chamadas = [];
  const graphGet = async (mediaId, params) => {
    chamadas.push({ mediaId, params });
    return { like_count: 50, comments_count: 4 };
  };

  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });

  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].normal, true);
  assert.equal(resultados[0].graduou, null, "reel normal não tem veredito de graduação");
  assert.ok(!chamadas[0].params.fields.includes("is_shared_to_feed"));

  const texto = await readFile(join(pasta, "publicado.md"), "utf-8");
  assert.ok(!texto.includes("Graduou"), "não pode inventar linha de graduação");
  assert.ok(texto.includes("- **Colhido em:**"));
  assert.ok(texto.includes("- **curtidas:** 50"));
  assert.ok(texto.includes("- **comentarios:** 4"));
});

test("colher: reel normal já colhido não é colhido de novo", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const pasta = await criarPasta(raiz, "reel-normal", registroNormal({ horasAtras: 100 }));
  const graphGet = async () => ({ like_count: 1, comments_count: 1 });

  await colher({ raiz, accessToken: "fake-token", deps: { graphGet } });
  const depoisDaPrimeira = await readFile(join(pasta, "publicado.md"), "utf-8");

  let chamado = false;
  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet: async () => { chamado = true; return {}; } } });
  assert.equal(resultados.length, 0);
  assert.equal(chamado, false);
  assert.equal(await readFile(join(pasta, "publicado.md"), "utf-8"), depoisDaPrimeira);
});

test("colher: reel normal do antigo fallback do trial também só registra métricas", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  const pasta = await criarPasta(raiz, "reel-fallback", registroNormal({
    tipo: "reel normal (conta ainda não atinge o mínimo de seguidores pra trial reel)", horasAtras: 100,
  }));
  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet: async () => ({ like_count: 2, comments_count: 0 }) } });

  assert.equal(resultados[0].normal, true);
  assert.ok(!(await readFile(join(pasta, "publicado.md"), "utf-8")).includes("Graduou"));
});

test("colher: reel normal dentro da janela de 72h é deixado em paz", async () => {
  const raiz = await mkdtemp(join(tmpdir(), "colher-"));
  await criarPasta(raiz, "reel-normal", registroNormal({ horasAtras: 5 }));
  let chamado = false;
  const resultados = await colher({ raiz, accessToken: "fake-token", deps: { graphGet: async () => { chamado = true; return {}; } } });
  assert.equal(resultados.length, 0);
  assert.equal(chamado, false);
});
