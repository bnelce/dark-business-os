import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { env, uploadParaCloudinary } from "./lib/cloudinary.js";
import { graphPost, graphGet, esperarContainer } from "./lib/graph.js";

async function postarCarrossel(pasta) {
  const igUserId = env("META_IG_USER_ID");
  const accessToken = env("META_PAGE_ACCESS_TOKEN");

  const pastaImagens = join(pasta, "instagram");
  const arquivos = (await readdir(pastaImagens))
    .filter((nome) => /^slide-\d+\.png$/.test(nome))
    .sort();

  if (arquivos.length === 0) throw new Error(`Nenhum slide encontrado em ${pastaImagens}`);

  const legenda = await readFile(join(pasta, "legenda.md"), "utf-8");

  console.log(`Subindo ${arquivos.length} slide(s) pro Cloudinary...`);
  const urls = [];
  for (const arquivo of arquivos) {
    const url = await uploadParaCloudinary(join(pastaImagens, arquivo));
    urls.push(url);
    console.log(`  ${arquivo} -> ${url}`);
  }

  // A Graph API às vezes falha de forma transitória na criação do container
  // ("Only photo or video can be accepted as media type") — resolve no retry,
  // recriando os containers do zero (containers filho não são reutilizáveis).
  async function criarContainer() {
    if (urls.length === 1) {
      const container = await graphPost(`${igUserId}/media`, {
        image_url: urls[0],
        caption: legenda,
        access_token: accessToken,
      });
      return container.id;
    }

    console.log("Criando containers do carrossel...");
    const childIds = [];
    for (const url of urls) {
      const child = await graphPost(`${igUserId}/media`, {
        image_url: url,
        is_carousel_item: "true",
        access_token: accessToken,
      });
      childIds.push(child.id);
    }
    const carousel = await graphPost(`${igUserId}/media`, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption: legenda,
      access_token: accessToken,
    });
    return carousel.id;
  }

  const TENTATIVAS = 3;
  let creationId;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      creationId = await criarContainer();
      console.log("Aguardando processamento...");
      await esperarContainer(creationId, accessToken);
      break;
    } catch (err) {
      if (tentativa === TENTATIVAS) throw err;
      console.log(`Tentativa ${tentativa} falhou (${err.message}), tentando de novo...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log("Publicando...");
  const { id: mediaId } = await graphPost(`${igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: accessToken,
  });

  // A partir daqui o post JÁ ESTÁ NO AR — se a busca do link falhar (rate limit, rede),
  // isso não pode virar "falha" pra quem chama, senão a automação tenta de novo e duplica.
  console.log(`\n✓ Publicado (media id: ${mediaId})`);
  let permalink = null;
  try {
    ({ permalink } = await graphGet(mediaId, { fields: "permalink", access_token: accessToken }));
    console.log(`  Link: ${permalink}`);
  } catch (err) {
    console.log(`  (não deu pra buscar o link agora: ${err.message} — mas o post foi publicado, media id ${mediaId})`);
  }

  return { mediaId, permalink };
}

const pasta = process.argv[2];
if (!pasta) {
  console.error("Uso: node scripts/postar-instagram.js <pasta-do-carrossel>");
  process.exit(1);
}

postarCarrossel(pasta).catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
