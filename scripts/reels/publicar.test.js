import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { montarParametrosDeReel, montarLegenda, montarRegistro, publicarReel, lerArgumentos, SUBCODE_SEGUIDORES_INSUFICIENTES } from "./publicar.js";

test("por padrão monta reel normal, sem trial_params", () => {
  const p = montarParametrosDeReel({ videoUrl: "https://x/v.mp4", legenda: "oi", accessToken: "t" });
  assert.equal(p.media_type, "REELS");
  assert.equal("trial_params" in p, false, "trial esconde o post dos seguidores — só quando pedido");
});

test("marca o post como trial reel com a estratégia exata quando pedido", () => {
  const p = montarParametrosDeReel({ videoUrl: "https://x/v.mp4", legenda: "oi", accessToken: "t", trial: true });
  assert.equal(p.media_type, "REELS");
  assert.equal(p.video_url, "https://x/v.mp4");
  assert.equal(p.trial_params, JSON.stringify({ graduation_strategy: "SS_PERFORMANCE" }));
});

test("a estratégia é case-sensitive e não pode ser reescrita", () => {
  const p = montarParametrosDeReel({ videoUrl: "u", legenda: "c", accessToken: "t", trial: true });
  assert.ok(p.trial_params.includes("SS_PERFORMANCE"), "a Meta rejeita qualquer outra caixa");
});

test("monta a legenda com corpo, cta e hashtags", () => {
  const legenda = montarLegenda({
    legenda: { corpo: "MRU é isso.", cta: "Salva pra revisar." },
    hashtags: ["#fisica", "#enem"],
  });
  assert.ok(legenda.includes("MRU é isso."));
  assert.ok(legenda.includes("Salva pra revisar."));
  assert.ok(legenda.trim().endsWith("#fisica #enem"));
});

async function pastaDeReel({ comPublicado } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "reel-"));
  await writeFile(join(dir, "roteiro.json"), JSON.stringify({
    formato: "quiz-relampago", disciplina: "fisica", tema: "MRU",
    beats: [{ id: "gancho", textoTela: "a", narracao: "b" }],
    legenda: { corpo: "corpo", cta: "cta" }, hashtags: ["#fisica"],
  }));
  await writeFile(join(dir, "reel.mp4"), "fake");
  if (comPublicado) await writeFile(join(dir, "publicado.md"), "# já publicado");
  return dir;
}

test("recusa publicar quando publicado.md já existe", async () => {
  const dir = await pastaDeReel({ comPublicado: true });
  await assert.rejects(() => publicarReel(dir, { deps: {} }), /já foi publicado/);
});

test("recusa publicar com a cota de 24h estourada", async () => {
  const dir = await pastaDeReel();
  const deps = { upload: async () => "u", validar: () => [], limite: async () => ({ uso: 100 }) };
  await assert.rejects(() => publicarReel(dir, { deps, igUserId: "IG", accessToken: "T" }), /Cota de publicação estourada/);
});

test("recusa publicar com MP4 não conforme e nunca chama o upload", async () => {
  const dir = await pastaDeReel();
  let uploadChamado = false;

  const deps = {
    upload: async () => {
      uploadChamado = true;
      return "https://cdn/v.mp4";
    },
    validar: () => ["Dimensões erradas: 1080x1080, esperado 1080x1920 (9:16)"],
    limite: async () => ({ uso: 3 }),
  };

  await assert.rejects(
    () => publicarReel(dir, { deps, igUserId: "IG", accessToken: "T" }),
    /não conforme/
  );
  assert.equal(uploadChamado, false, "um gate que dispara depois do upload não é gate");
});

test("CLI: sem flag é reel normal; --trial pede trial; flag desconhecida é recusada", () => {
  assert.deepEqual(lerArgumentos(["pasta/x"]), { pasta: "pasta/x", trial: false, desconhecidas: [] });
  assert.deepEqual(lerArgumentos(["pasta/x", "--trial"]), { pasta: "pasta/x", trial: true, desconhecidas: [] });
  assert.deepEqual(lerArgumentos(["--trial", "pasta/x"]), { pasta: "pasta/x", trial: true, desconhecidas: [] });
  assert.deepEqual(lerArgumentos(["pasta/x", "--trail"]).desconhecidas, ["--trail"]);
});

test("registro de reel normal não tem linha de Graduou", () => {
  const r = montarRegistro({ mediaId: "M", permalink: "p", publicadoEm: "x", roteiro: { formato: "f", disciplina: "d", tema: "t" } });
  assert.ok(r.includes("- **Tipo:** reel normal\n"));
  assert.ok(!r.includes("Graduou"));
});

function depsDePublicacao({ chamadas, falharTrialCom } = {}) {
  return {
    upload: async () => "https://cdn/v.mp4",
    validar: () => [],
    graphPost: async (caminho, params) => {
      chamadas?.push({ caminho, params });
      if (falharTrialCom && params.trial_params) {
        const err = new Error("Graph API falhou");
        err.subcode = falharTrialCom;
        throw err;
      }
      return { id: caminho.endsWith("media_publish") ? "MEDIA1" : "CONT1" };
    },
    graphGet: async () => ({ permalink: "https://instagram.com/p/abc" }),
    esperar: async () => {},
    limite: async () => ({ uso: 3 }),
  };
}

test("sem opção nenhuma publica reel normal: nenhuma chamada leva trial_params", async () => {
  const dir = await pastaDeReel();
  const chamadas = [];
  await publicarReel(dir, { deps: depsDePublicacao({ chamadas }), igUserId: "IG", accessToken: "T" });

  assert.equal(chamadas.length, 2, "um container e um media_publish, sem retentativa");
  assert.ok(chamadas.every((c) => !("trial_params" in c.params)));
  const registro = await readFile(join(dir, "publicado.md"), "utf-8");
  assert.ok(registro.includes("- **Tipo:** reel normal\n"));
  assert.ok(!registro.includes("Graduou"), "reel normal já está no feed, não há o que graduar");
});

test("reel normal: erro 2207081 não é engolido — o fallback só existe no caminho trial", async () => {
  const dir = await pastaDeReel();
  const chamadas = [];
  const deps = depsDePublicacao({ chamadas });
  deps.graphPost = async (caminho, params) => {
    chamadas.push({ caminho, params });
    const err = new Error("Graph API falhou");
    err.subcode = SUBCODE_SEGUIDORES_INSUFICIENTES;
    throw err;
  };
  await assert.rejects(() => publicarReel(dir, { deps, igUserId: "IG", accessToken: "T" }), /Graph API falhou/);
  assert.equal(chamadas.length, 1, "sem retentativa fora do caminho trial");
});

test("opcoes.trial publica trial reel e registra Graduou pendente", async () => {
  const dir = await pastaDeReel();
  const chamadas = [];
  await publicarReel(dir, { trial: true, deps: depsDePublicacao({ chamadas }), igUserId: "IG", accessToken: "T" });

  assert.equal(chamadas[0].params.trial_params, JSON.stringify({ graduation_strategy: "SS_PERFORMANCE" }));
  const registro = await readFile(join(dir, "publicado.md"), "utf-8");
  assert.ok(registro.includes("- **Tipo:** trial reel (graduation_strategy SS_PERFORMANCE)"));
  assert.ok(registro.includes("- **Graduou:** pendente"));
});

test("trial com conta inelegível (2207081) cai pra reel normal e registra o motivo", async () => {
  const dir = await pastaDeReel();
  const chamadas = [];
  await publicarReel(dir, {
    trial: true,
    deps: depsDePublicacao({ chamadas, falharTrialCom: SUBCODE_SEGUIDORES_INSUFICIENTES }),
    igUserId: "IG", accessToken: "T",
  });

  assert.ok(chamadas[0].params.trial_params, "primeiro tenta o trial");
  assert.equal("trial_params" in chamadas[1].params, false, "depois repete sem trial");
  const registro = await readFile(join(dir, "publicado.md"), "utf-8");
  assert.ok(registro.includes("reel normal (conta ainda não atinge o mínimo de seguidores pra trial reel)"));
  assert.ok(!registro.includes("Graduou"));
});

test("trial com outro erro não cai pra reel normal", async () => {
  const dir = await pastaDeReel();
  const chamadas = [];
  await assert.rejects(() => publicarReel(dir, {
    trial: true,
    deps: depsDePublicacao({ chamadas, falharTrialCom: 9999 }),
    igUserId: "IG", accessToken: "T",
  }), /Graph API falhou/);
  assert.equal(chamadas.length, 1);
});

test("publica e grava publicado.md com o id e o permalink", async () => {
  const dir = await pastaDeReel();
  const chamadas = [];

  const deps = {
    upload: async () => "https://cdn/v.mp4",
    validar: () => [],
    graphPost: async (caminho, params) => {
      chamadas.push({ caminho, params });
      return { id: caminho.endsWith("media_publish") ? "MEDIA1" : "CONT1" };
    },
    graphGet: async () => ({ permalink: "https://instagram.com/p/abc" }),
    esperar: async () => {},
    limite: async () => ({ uso: 3 }),
  };

  const r = await publicarReel(dir, { deps, igUserId: "IG", accessToken: "T" });

  assert.equal(r.mediaId, "MEDIA1");
  assert.equal(r.permalink, "https://instagram.com/p/abc");
  assert.equal(chamadas[0].params.media_type, "REELS");
  assert.equal(chamadas[1].params.creation_id, "CONT1");

  const registro = await readFile(join(dir, "publicado.md"), "utf-8");
  assert.ok(registro.includes("MEDIA1"));
  assert.ok(registro.includes("https://instagram.com/p/abc"));
  assert.ok(registro.includes("- **Tipo:** reel normal"), "precisa registrar o tipo, pro colher saber o que fazer depois");
});

test("permalink que falha não pode apagar o registro: o post já está no ar", async () => {
  const dir = await pastaDeReel();

  const deps = {
    upload: async () => "https://cdn/v.mp4",
    validar: () => [],
    graphPost: async (caminho) => ({ id: caminho.endsWith("media_publish") ? "MEDIA9" : "CONT9" }),
    graphGet: async () => {
      throw new Error("Graph API falhou (MEDIA9): permalink indisponível");
    },
    esperar: async () => {},
    limite: async () => ({ uso: 3 }),
  };

  const r = await publicarReel(dir, { trial: true, deps, igUserId: "IG", accessToken: "T" });
  assert.equal(r.mediaId, "MEDIA9", "publicar não pode lançar depois do media_publish bem-sucedido");

  const registro = await readFile(join(dir, "publicado.md"), "utf-8");
  assert.ok(registro.includes("MEDIA9"), "sem o media id em disco o colher nunca acha o post");
  assert.ok(registro.includes("**Permalink:** pendente"));
  assert.ok(registro.includes("- **Graduou:** pendente"));
});

test("roteiro com preço na legenda é recusado antes de qualquer upload", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reel-"));
  await writeFile(join(dir, "roteiro.json"), JSON.stringify({
    formato: "quiz-relampago", disciplina: "fisica", tema: "MRU",
    beats: [{ id: "gancho", textoTela: "a", narracao: "b" }],
    legenda: { corpo: "Combo completo por R$47.", cta: "cta" }, hashtags: ["#fisica"],
  }));
  await writeFile(join(dir, "reel.mp4"), "fake");

  let tocouAlgumaCoisa = false;
  const marcar = () => { tocouAlgumaCoisa = true; };
  const deps = {
    upload: async () => { marcar(); return "u"; },
    validar: () => { marcar(); return []; },
    limite: async () => { marcar(); return { uso: 0 }; },
    graphPost: async () => { marcar(); return { id: "X" }; },
  };

  await assert.rejects(
    () => publicarReel(dir, { deps, igUserId: "IG", accessToken: "T" }),
    /CTA de venda/
  );
  assert.equal(tocouAlgumaCoisa, false, "a legenda publicada é o último ponto onde a regra ainda dá pra aplicar");
});

test("capa: cover_url só entra quando há capa", () => {
  assert.equal("cover_url" in montarParametrosDeReel({ videoUrl: "u", legenda: "c", accessToken: "t" }), false);
  const p = montarParametrosDeReel({ videoUrl: "u", legenda: "c", accessToken: "t", coverUrl: "https://cdn/capa.png" });
  assert.equal(p.cover_url, "https://cdn/capa.png");
});

test("capa.png na pasta sobe e vai como cover_url no container", async () => {
  const dir = await pastaDeReel();
  await writeFile(join(dir, "capa.png"), "png");
  const chamadas = [];
  const deps = depsDePublicacao({ chamadas });
  let subiu;
  deps.uploadCapa = async (caminho) => { subiu = caminho; return "https://cdn/capa.png"; };
  await publicarReel(dir, { deps, igUserId: "IG", accessToken: "T" });
  assert.equal(subiu, join(dir, "capa.png"));
  assert.equal(chamadas[0].params.cover_url, "https://cdn/capa.png");
});

test("sem capa.png não sobe capa nem manda cover_url", async () => {
  const dir = await pastaDeReel();
  const chamadas = [];
  const deps = depsDePublicacao({ chamadas });
  deps.uploadCapa = async () => { throw new Error("não devia subir capa"); };
  await publicarReel(dir, { deps, igUserId: "IG", accessToken: "T" });
  assert.equal("cover_url" in chamadas[0].params, false);
});
