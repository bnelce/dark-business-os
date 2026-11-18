// Autoriza o canal A2LO uma vez: abre o navegador, guarda o refresh token em <secrets>/youtube-token.json
// e confere que o canal autorizado é o esperado.
//   node scripts/youtube/autorizar.js
//
// O token é salvo ANTES da checagem do canal: se a checagem falhar por cota ou rede, a autorização não se perde
// (o publicar.js confere o canal de novo antes de cada envio). Se o canal for outro, o token é apagado.
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { autorizarNoNavegador, salvarToken, ARQUIVO_TOKEN } from "./oauth.js";
import { criarCliente } from "./api.js";
import { DIR_SECRETS, CANAL_ESPERADO, CANAL_URL } from "./config.js";

try {
  const r = await autorizarNoNavegador(DIR_SECRETS);
  const dados = { refresh_token: r.refreshToken, escopos: r.escopos, canal_id: null, autorizado_em: new Date().toISOString() };
  await salvarToken(DIR_SECRETS, dados);
  console.log(`Autorização recebida e salva em ${DIR_SECRETS}/${ARQUIVO_TOKEN} (permissão 600).`);
  if (r.faltando.length) console.log(`ATENÇÃO: permissões não concedidas: ${r.faltando.join(", ")}. Rode de novo e marque todas.`);

  const conf = await criarCliente(r.accessToken).confirmarCanal(CANAL_ESPERADO, CANAL_URL);
  if (conf.ok === false) {
    await rm(join(DIR_SECRETS, ARQUIVO_TOKEN), { force: true });
    console.error(`Autorizou OUTRO canal: ${conf.autor ?? conf.id} (conferido por ${conf.via}). Autorização apagada. Rode de novo e escolha o canal A2LO Desenvolvimento.`);
    process.exit(1);
  }
  if (conf.ok === null) {
    console.log(`Canal ainda não confirmável (${conf.via}). Ele é conferido pela resposta do primeiro envio privado.`);
  } else {
    await salvarToken(DIR_SECRETS, { ...dados, canal_id: CANAL_ESPERADO, canal_conferido_por: conf.via });
    console.log(`Canal conferido: A2LO (${conf.autor ?? conf.id}, via ${conf.via}).`);
  }
} catch (e) {
  console.error(`Erro: ${e.message}`);
  process.exit(1);
}
