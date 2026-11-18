// Publica UMA imagem como story no Instagram (sem figurinha de link: a API não suporta).
//   node --env-file=negocios/<slug>/.env scripts/postar-story.js <imagem.png>
import { env, uploadParaCloudinary } from "./lib/cloudinary.js";
import { graphPost, esperarContainer } from "./lib/graph.js";

const imagem = process.argv[2];
if (!imagem) { console.error("Uso: node scripts/postar-story.js <imagem.png>"); process.exit(1); }
try {
  const igUserId = env("META_IG_USER_ID"), accessToken = env("META_PAGE_ACCESS_TOKEN");
  const url = await uploadParaCloudinary(imagem);
  const { id } = await graphPost(`${igUserId}/media`, { image_url: url, media_type: "STORIES", access_token: accessToken });
  await esperarContainer(id, accessToken);
  const { id: mediaId } = await graphPost(`${igUserId}/media_publish`, { creation_id: id, access_token: accessToken });
  console.log(`✓ Story publicado (media id: ${mediaId})`);
} catch (err) { console.error(`✗ ${err.message}`); process.exit(1); }
