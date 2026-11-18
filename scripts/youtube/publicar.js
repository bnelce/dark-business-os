// Publica um vídeo/Short no YouTube da A2LO a partir de uma pasta com o MP4 e o youtube.json.
//
//   node scripts/youtube/publicar.js <pasta>                         → envio PRIVADO (teste; não publica)
//   node scripts/youtube/publicar.js <pasta> --publico --pode-publicar
//   node scripts/youtube/publicar.js <pasta> --agendar 2026-11-14T19:00:00-03:00 --pode-publicar
//
// Público ou agendado exige --pode-publicar: só rodar com um "pode publicar" explícito do Abner.
// youtube.json: { titulo, descricao, tags[], categoria?, playlist?, comentario?, sintetico? }
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { montarMetadados } from "./metadados.js";
import { obterAccessToken } from "./oauth.js";
import { criarCliente } from "./api.js";
import { DIR_SECRETS, CANAL_ESPERADO, CANAL_URL } from "./config.js";

const existe = (p) => access(p).then(() => true, () => false);
export const REGISTRO = "publicado-youtube.json";
const CANDIDATOS = ["short.mp4", "video.mp4", "reel.mp4"];

export async function acharArquivo(pasta, arquivo) {
  if (arquivo) return join(pasta, arquivo);
  for (const nome of CANDIDATOS) if (await existe(join(pasta, nome))) return join(pasta, nome);
  throw new Error(`nenhum MP4 em ${pasta} (procurei ${CANDIDATOS.join(", ")})`);
}

export async function publicarNoYouTube(pasta, opcoes = {}, deps = {}) {
  const {
    privacidade = "private", publicarEm, aprovado = false, arquivo, deNovo = false,
  } = opcoes;
  const d = {
    obterAccessToken: deps.obterAccessToken ?? (() => obterAccessToken(DIR_SECRETS)),
    criarCliente: deps.criarCliente ?? criarCliente,
    canalEsperado: deps.canalEsperado ?? CANAL_ESPERADO,
    canalUrl: deps.canalUrl ?? CANAL_URL,
    log: deps.log ?? console.log,
  };

  const vaiAparecer = privacidade !== "private" || Boolean(publicarEm);
  if (vaiAparecer && !aprovado) {
    throw new Error("público, não listado ou agendado só com --pode-publicar (precisa do \"pode publicar\" explícito). Sem a flag, rode sem --publico/--agendar para um envio privado de teste.");
  }
  const registroPath = join(pasta, REGISTRO);
  if (!deNovo && (await existe(registroPath))) {
    throw new Error(`já enviado (${REGISTRO} existe). Para enviar outra cópia, use --de-novo.`);
  }

  const cfg = JSON.parse(await readFile(join(pasta, "youtube.json"), "utf8"));
  const metadados = montarMetadados(cfg, { privacidade, publicarEm }); // valida antes de qualquer chamada
  const mp4 = await acharArquivo(pasta, arquivo);
  const ehShort = /short/i.test(mp4) || cfg.formato === "short";

  const yt = d.criarCliente(await d.obterAccessToken());
  const conf = await yt.confirmarCanal(d.canalEsperado, d.canalUrl);
  if (conf.ok === false) {
    throw new Error(`a autorização é de outro canal: ${conf.autor ?? conf.id} (conferido por ${conf.via}). Apague secrets/youtube-token.json, rode autorizar.js e escolha o canal A2LO.`);
  }
  if (conf.ok === null && vaiAparecer) {
    throw new Error(`não deu para confirmar o canal antes do envio (${conf.via}). Faça antes um envio privado: o canal é conferido pela resposta do envio.`);
  }
  d.log(`Canal: ${conf.ok ? `confirmado (${conf.autor ?? conf.id}, via ${conf.via})` : "a confirmar pela resposta do envio"}. Enviando ${mp4.split("/").pop()} como ${publicarEm ? `agendado para ${publicarEm}` : privacidade}...`);

  const video = await yt.enviarVideo(mp4, metadados, { log: d.log });
  const videoId = video.id;
  const url = ehShort ? `https://www.youtube.com/shorts/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`;
  d.log(`Enviado: ${url}`);

  const avisos = [];
  // A resposta do envio diz em que canal o vídeo caiu: é a conferência definitiva.
  const canalDoVideo = video.snippet?.channelId ?? null;
  const canalErrado = canalDoVideo !== null && canalDoVideo !== d.canalEsperado;
  if (canalErrado) avisos.push(`O VÍDEO CAIU NO CANAL ERRADO (${canalDoVideo}). Apague pelo YouTube Studio desse canal e reautorize escolhendo o canal A2LO.`);
  // Projeto de API sem auditoria: o YouTube trava o vídeo em privado mesmo pedindo público.
  const obtida = video.status?.privacyStatus;
  const pedida = metadados.status.privacyStatus;
  if (pedida !== "private" && obtida === "private") {
    avisos.push("o YouTube travou o vídeo em PRIVADO: o projeto do Google Cloud precisa passar pela auditoria da API (formulário de auditoria do YouTube API Services). Até lá, mude para público pelo Studio.");
  }

  let playlist = null;
  if (cfg.playlist && !canalErrado) {
    try {
      const p = await yt.acharOuCriarPlaylist(cfg.playlist);
      await yt.adicionarNaPlaylist(p.id, videoId);
      playlist = { titulo: cfg.playlist, id: p.id, criada: p.criada };
    } catch (e) { avisos.push(`playlist "${cfg.playlist}" não aplicada: ${e.message}`); }
  }

  let comentario = null;
  if (cfg.comentario && !canalErrado) {
    if (obtida === "public") {
      try { await yt.comentar(videoId, cfg.comentario); comentario = "postado (fixar à mão no Studio)"; }
      catch (e) { avisos.push(`comentário não postado: ${e.message}`); }
    } else comentario = "pendente: postar e fixar quando o vídeo estiver público";
  }

  const registro = {
    videoId, url, canal: { id: canalDoVideo, confirmadoAntesPor: conf.ok ? conf.via : null },
    arquivo: mp4.split("/").pop(), titulo: metadados.snippet.title,
    privacidadePedida: publicarEm ? `agendado ${metadados.status.publishAt}` : pedida,
    privacidadeObtida: obtida ?? null,
    publishAt: metadados.status.publishAt ?? null,
    enviadoEm: new Date().toISOString(),
    playlist, comentario, avisos,
  };
  await writeFile(registroPath, JSON.stringify(registro, null, 2) + "\n");
  for (const a of avisos) d.log(`ATENÇÃO: ${a}`);
  if (canalErrado) throw new Error(avisos[0]);
  return registro;
}

export function lerArgumentos(args) {
  const o = { privacidade: "private" };
  let pasta;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--publico") o.privacidade = "public";
    else if (a === "--nao-listado") o.privacidade = "unlisted";
    else if (a === "--agendar") o.publicarEm = args[++i];
    else if (a === "--pode-publicar") o.aprovado = true;
    else if (a === "--arquivo") o.arquivo = args[++i];
    else if (a === "--de-novo") o.deNovo = true;
    else if (a.startsWith("--")) throw new Error(`opção desconhecida: ${a}`);
    else pasta = a;
  }
  if (!pasta) throw new Error("uso: node scripts/youtube/publicar.js <pasta> [--publico|--nao-listado|--agendar ISO] [--pode-publicar]");
  return { pasta, opcoes: o };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { pasta, opcoes } = lerArgumentos(process.argv.slice(2));
    const r = await publicarNoYouTube(pasta, opcoes);
    console.log(`\nRegistro em ${join(pasta, REGISTRO)}: ${r.url} (${r.privacidadeObtida})`);
  } catch (e) {
    console.error(`Erro: ${e.message}`);
    process.exit(1);
  }
}
