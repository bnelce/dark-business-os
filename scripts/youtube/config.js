// Onde ficam a credencial e o token, e qual canal deve estar autorizado.
// A credencial OAuth e o refresh token moram no repositório da A2LO (secrets/, fora do git), não aqui:
// este repositório tem remoto público.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const DIR_SECRETS = process.env.YT_SECRETS_DIR ?? resolve(RAIZ, "../A2LO/secrets");

// Canal A2LO (ex-Camada Zero, @a2lo_dev). Trava contra autorizar/publicar no canal errado:
// a mesma conta Google pode ter mais de um canal.
export const CANAL_ESPERADO = process.env.YT_CANAL_ID ?? "UChcwhhCNdJSZog3iGc00lWg";
// URL pública do canal, para conferir pelo oEmbed quando a cota geral da Data API estiver zerada.
export const CANAL_URL = process.env.YT_CANAL_URL ?? "https://www.youtube.com/@a2lo_dev";
