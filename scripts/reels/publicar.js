import { access, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { env, uploadParaCloudinary } from "../lib/cloudinary.js";
import { graphPost, graphGet, esperarContainer } from "../lib/graph.js";
import { carregarRoteiro, verificarSinaisDeVenda } from "./roteiro.js";
import { validarMp4 } from "./validar-mp4.js";

const TIMEOUT_DE_VIDEO_MS = 600_000; // vídeo processa bem mais devagar que imagem; 80s de vídeo já passou de 5 min

// error_subcode do Meta quando a conta não atinge o mínimo de seguidores
// exigido pra reels de teste ("Application does not have permission for
// this action" / "Número insuficiente de seguidores para reels de teste").
export const SUBCODE_SEGUIDORES_INSUFICIENTES = 2207081;

export function montarParametrosDeReel({ videoUrl, legenda, accessToken, trial = false, thumbOffsetMs = 0, coverUrl }) {
  const base = {
    media_type: "REELS",
    video_url: videoUrl,
    caption: legenda,
    access_token: accessToken,
    // Sem isto o Instagram usa o quadro 0 como capa. Se a composição abrir com
    // animação entrando, a capa sai em branco — já aconteceu e apareceu na grade.
    // A capa correta é responsabilidade da composição (abrir num quadro completo);
    // este parâmetro é a garantia de que é esse quadro que a Meta escolhe.
    thumb_offset: String(thumbOffsetMs),
    // capa.png da pasta, quando existe: é ela que vai pra grade do perfil, no
    // lugar do quadro 0. A Meta dá precedência ao cover_url sobre o thumb_offset.
    ...(coverUrl ? { cover_url: coverUrl } : {}),
  };
  if (!trial) return base;
  return { ...base, trial_params: JSON.stringify({ graduation_strategy: "SS_PERFORMANCE" }) };
}

export function montarLegenda(roteiro) {
  return `${roteiro.legenda.corpo}\n\n${roteiro.legenda.cta ?? ""}\n\n${roteiro.hashtags.join(" ")}\n`;
}

// Tipo gravado no publicado.md. O colher lê isto: "trial reel" entra no fluxo de
// graduação; "reel normal" (com ou sem o motivo do fallback) só colhe métricas.
function descreverTipo({ foiTrial, pediuTrial }) {
  if (foiTrial) return "trial reel (graduation_strategy SS_PERFORMANCE)";
  if (pediuTrial) return "reel normal (conta ainda não atinge o mínimo de seguidores pra trial reel)";
  return "reel normal";
}

export function montarRegistro({ mediaId, permalink, publicadoEm, roteiro, foiTrial = false, pediuTrial = foiTrial }) {
  return [
    `# Publicado`, ``,
    `- **Tipo:** ${descreverTipo({ foiTrial, pediuTrial })}`,
    `- **Media ID:** ${mediaId}`,
    `- **Permalink:** ${permalink}`,
    `- **Publicado em:** ${publicadoEm}`,
    `- **Formato:** ${roteiro.formato}`,
    `- **Disciplina:** ${roteiro.disciplina}`,
    `- **Tema:** ${roteiro.tema}`,
    ...(foiTrial ? [`- **Graduou:** pendente`] : []),
    ``,
  ].join("\n");
}

async function existe(caminho) {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

// Deriva disciplina, tema e FORMATO do nome da pasta, pra reels sem roteiro.json.
// O sufixo antes da data codifica o formato — a convenção já existia com "-aula", e
// aqui ela só virou tabela em vez de um replace solto:
//   <disciplina>-<tema>-aula-<data> → aula-reel
//   <disciplina>-<tema>-viz-<data>  → visualizacao
//   <disciplina>-<tema>-<data>      → aula-reel (padrão, compatível com o que existia)
const FORMATO_POR_SUFIXO = { aula: "aula-reel", viz: "visualizacao" };

function derivarMetaDaPasta(pasta) {
  let nome = basename(pasta).replace(/-\d{4}-\d{2}-\d{2}$/, "");
  let formato = "aula-reel";
  const m = nome.match(/-([a-z]+)$/);
  if (m && FORMATO_POR_SUFIXO[m[1]]) {
    formato = FORMATO_POR_SUFIXO[m[1]];
    nome = nome.slice(0, -(m[1].length + 1));
  }
  const [disciplina, ...resto] = nome.split("-");
  return { formato, disciplina, tema: resto.join(" ") };
}

// Pra reels do formato aula-reel (várias cenas, sem beats/roteiro.json): a
// legenda.md já é a legenda pronta, gerada e aprovada pela skill /aula-reel.
// Mesma proteção de CTA de venda do roteiro.json — a fase do negócio não muda
// por causa do formato do reel.
async function carregarConteudo(pasta) {
  const caminhoRoteiro = join(pasta, "roteiro.json");
  if (await existe(caminhoRoteiro)) {
    const roteiro = await carregarRoteiro(caminhoRoteiro);
    return { legenda: montarLegenda(roteiro), meta: { formato: roteiro.formato, disciplina: roteiro.disciplina, tema: roteiro.tema } };
  }

  const caminhoLegenda = join(pasta, "legenda.md");
  if (await existe(caminhoLegenda)) {
    const legenda = `${(await readFile(caminhoLegenda, "utf-8")).trim()}\n`;
    if (verificarSinaisDeVenda(legenda)) {
      throw new Error(`${caminhoLegenda}: CTA de venda (preço ou link) não é permitido nesta fase. Use CTA de crescimento: salvar, seguir.`);
    }
    return { legenda, meta: derivarMetaDaPasta(pasta) };
  }

  throw new Error(`Nem roteiro.json nem legenda.md encontrados em ${pasta}`);
}

export async function publicarReel(pasta, opcoes = {}) {
  const caminhoPublicado = join(pasta, "publicado.md");

  // Idempotência: rerun distraído duplicaria o post, e post duplicado é caro de desfazer.
  if (await existe(caminhoPublicado)) {
    throw new Error(`${caminhoPublicado} já existe — esse reel já foi publicado. Apague o arquivo se quiser mesmo republicar.`);
  }

  const igUserId = opcoes.igUserId ?? env("META_IG_USER_ID");
  const accessToken = opcoes.accessToken ?? env("META_PAGE_ACCESS_TOKEN");

  const d = opcoes.deps ?? {};
  const upload = d.upload ?? ((caminho) => uploadParaCloudinary(caminho, { resourceType: "video" }));
  const uploadCapa = d.uploadCapa ?? ((caminho) => uploadParaCloudinary(caminho, { resourceType: "image" }));
  const validar = d.validar ?? validarMp4;
  const post = d.graphPost ?? graphPost;
  const get = d.graphGet ?? graphGet;
  const esperar = d.esperar ?? ((id) => esperarContainer(id, accessToken, { timeoutMs: TIMEOUT_DE_VIDEO_MS }));
  const limite = d.limite ?? (async () => {
    const dados = await get(`${igUserId}/content_publishing_limit`, { fields: "quota_usage", access_token: accessToken });
    return { uso: dados.data?.[0]?.quota_usage ?? 0 };
  });

  // Passa pelo validador como todo o resto do pipeline: a legenda publicada é
  // o único conteúdo que chega ao público, e uma edição à mão entre o render e
  // o publish não pode escapar da regra de CTA sem venda. Funciona tanto pro
  // formato com roteiro.json (quiz relâmpago etc.) quanto pro aula-reel (legenda.md).
  const { legenda, meta } = d.carregarConteudo ? await d.carregarConteudo(pasta) : await carregarConteudo(pasta);
  const video = join(pasta, "reel.mp4");

  // Aula-reel mira até 90s (ver .claude/skills/aula-reel) — bem acima da faixa
  // curta do quiz relâmpago, que é o default do validador.
  // Cada formato tem sua faixa de duração. Dois baldes (curto/longo) não davam conta:
// um cartão de consulta de 27s passa do teto curto de 25s e não alcança o piso longo
// de 30s. O teto de 90s em todos é o limite da aba Reels do Instagram.
const LIMITES_POR_FORMATO = {
  "aula-reel": { duracaoMinS: 30, duracaoMaxS: 90 },
  "resolucao-questao": { duracaoMinS: 30, duracaoMaxS: 90 },
  revelacao: { duracaoMinS: 30, duracaoMaxS: 90 },
  consulta: { duracaoMinS: 15, duracaoMaxS: 45 },
  // Visualização de algoritmo (ver motion-studio, skill algoritmo-reel): a peça dura o
  // tempo da busca rodando, que não é o tempo de uma aula. 22s é uma peça completa aqui.
  visualizacao: { duracaoMinS: 12, duracaoMaxS: 60 },
  // Reel de dados narrado (ex.: apuração do 2º turno): várias cenas, como a aula-reel.
  dados: { duracaoMinS: 30, duracaoMaxS: 90 },
  // "Você sabia" narrado em várias cenas (ex.: roadster voador, 72s).
  "voce-sabia": { duracaoMinS: 30, duracaoMaxS: 90 },
};
  const limitesMp4 = LIMITES_POR_FORMATO[meta.formato] ?? {};
  const erros = validar(video, limitesMp4);
  if (erros.length > 0) throw new Error(`MP4 não conforme, não vou subir:\n  - ${erros.join("\n  - ")}`);

  // Sem essa checagem, estourar a cota vira um erro ilegível lá na frente.
  const { uso } = await limite();
  if (uso >= 100) throw new Error(`Cota de publicação estourada: ${uso}/100 nas últimas 24h.`);
  console.log(`Cota de publicação: ${uso}/100`);

  console.log("Subindo o vídeo pro Cloudinary...");
  const videoUrl = await upload(video);

  const capa = join(pasta, "capa.png");
  let coverUrl;
  if (await existe(capa)) {
    console.log("Subindo a capa pro Cloudinary...");
    coverUrl = await uploadCapa(capa);
  }

  // Padrão é reel normal: vai pra grade do perfil e pros seguidores. Trial reel
  // (testa só com não-seguidores antes de graduar pro feed) esconde o post da
  // base de seguidores, então só sai quando pedido explicitamente (--trial ou
  // opcoes.trial). Trial exige um mínimo de seguidores — nesse caminho, e só
  // nele, cai pra reel normal no erro específico, sem mascarar outros erros.
  const pediuTrial = opcoes.trial === true;
  let creationId;
  let foiTrial = false;
  if (pediuTrial) {
    console.log("Criando o container do trial reel...");
    try {
      ({ id: creationId } = await post(`${igUserId}/media`, montarParametrosDeReel({ videoUrl, legenda, accessToken, trial: true, coverUrl })));
      foiTrial = true;
    } catch (err) {
      if (err.subcode !== SUBCODE_SEGUIDORES_INSUFICIENTES) throw err;
      console.log("Conta não atinge o mínimo de seguidores pra trial reel — publicando como reel normal.");
      ({ id: creationId } = await post(`${igUserId}/media`, montarParametrosDeReel({ videoUrl, legenda, accessToken, trial: false, coverUrl })));
    }
  } else {
    console.log("Criando o container do reel...");
    ({ id: creationId } = await post(`${igUserId}/media`, montarParametrosDeReel({ videoUrl, legenda, accessToken, trial: false, coverUrl })));
  }

  console.log("Aguardando processamento do vídeo (pode levar minutos)...");
  await esperar(creationId);

  console.log("Publicando...");
  const { id: mediaId } = await post(`${igUserId}/media_publish`, { creation_id: creationId, access_token: accessToken });

  // A partir daqui o post está NO AR. O registro tem que existir em disco antes
  // de qualquer outra chamada falível: sem ele a guarda de idempotência passa no
  // próximo run e o mesmo reel sai duas vezes, e o colher nunca vê esse post.
  const agora = new Date().toISOString();
  await writeFile(caminhoPublicado, montarRegistro({ mediaId, permalink: "pendente", publicadoEm: agora, roteiro: meta, foiTrial, pediuTrial }));

  let permalink = null;
  try {
    ({ permalink } = await get(mediaId, { fields: "permalink", access_token: accessToken }));
    await writeFile(caminhoPublicado, montarRegistro({ mediaId, permalink, publicadoEm: agora, roteiro: meta, foiTrial, pediuTrial }));
  } catch (err) {
    // Falhar aqui não desfaz a publicação — o registro fica com o permalink
    // pendente e o operador completa à mão. Nunca jogar o registro fora.
    console.error(`\n! Reel publicado (media id ${mediaId}), mas a busca do permalink falhou: ${err.message}`);
    console.error(`  ${caminhoPublicado} ficou gravado com "**Permalink:** pendente". Preencha à mão se precisar.`);
    if (foiTrial) console.log(`  Rode o colher daqui uns 3 dias pra ver se graduou.`);
    return { mediaId, permalink: null };
  }

  console.log(`\n✓ ${foiTrial ? "Trial reel" : "Reel"} publicado: ${permalink}`);
  if (foiTrial) console.log(`  Rode o colher daqui uns 3 dias pra ver se graduou.`);
  return { mediaId, permalink };
}

// Sem flag nenhuma = reel normal. É assim que o launchd (publicar-agendado.sh)
// chama, então o padrão tem que ser o seguro pra base de seguidores.
export function lerArgumentos(args) {
  return {
    pasta: args.find((a) => !a.startsWith("--")),
    trial: args.includes("--trial"),
    desconhecidas: args.filter((a) => a.startsWith("--") && a !== "--trial"),
  };
}

if (import.meta.filename === process.argv[1]) {
  const { pasta, trial, desconhecidas } = lerArgumentos(process.argv.slice(2));
  if (!pasta || desconhecidas.length > 0) {
    if (desconhecidas.length > 0) console.error(`Opção desconhecida: ${desconhecidas.join(" ")}`);
    console.error("Uso: node --env-file=.env scripts/reels/publicar.js <pasta-do-reel> [--trial]");
    console.error("  Padrão: reel normal (grade + seguidores). --trial: trial reel (só não-seguidores).");
    process.exit(1);
  }
  await publicarReel(pasta, { trial }).catch((err) => {
    console.error(`\n✗ ${err.message}`);
    process.exit(1);
  });
}
