// Chamadas da YouTube Data API v3 e da YouTube Analytics API v2, com fetch nativo (sem SDK).
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

const DATA = "https://www.googleapis.com/youtube/v3";
const UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos";
const ANALYTICS = "https://youtubeanalytics.googleapis.com/v2/reports";

export function criarCliente(accessToken, { fetchFn = fetch } = {}) {
  const auth = { Authorization: `Bearer ${accessToken}` };

  async function chamar(url, init = {}) {
    const r = await fetchFn(url, { ...init, headers: { ...auth, ...(init.headers ?? {}) } });
    const texto = await r.text();
    const j = texto ? JSON.parse(texto) : {};
    if (!r.ok) {
      const e = j.error ?? {};
      const motivo = e.errors?.[0]?.reason ?? e.status ?? r.status;
      throw Object.assign(new Error(`YouTube API ${r.status} (${motivo}): ${e.message ?? texto}`), { status: r.status, motivo });
    }
    return j;
  }
  const get = (caminho, params) => chamar(`${DATA}/${caminho}?${new URLSearchParams(params)}`);
  const post = (caminho, params, corpo) => chamar(`${DATA}/${caminho}?${new URLSearchParams(params)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

  return {
    chamar,

    /** O canal dono da autorização (mine=true). */
    async canalAtual() {
      const j = await get("channels", { part: "snippet,statistics,contentDetails", mine: "true" });
      const c = j.items?.[0];
      if (!c) throw new Error("a autorização não tem canal do YouTube associado");
      return { id: c.id, titulo: c.snippet.title, handle: c.snippet.customUrl, inscritos: Number(c.statistics.subscriberCount ?? 0), videos: Number(c.statistics.videoCount ?? 0), uploads: c.contentDetails?.relatedPlaylists?.uploads };
    },

    /**
     * Upload retomável (protocolo resumable): 1) POST com os metadados devolve a URL da sessão;
     * 2) PUT do arquivo. Se cair no meio, pergunta ao servidor quanto já chegou e continua dali.
     */
    async enviarVideo(arquivo, metadados, { tentativas = 4, log = () => {} } = {}) {
      const tamanho = (await stat(arquivo)).size;
      const params = new URLSearchParams({ uploadType: "resumable", part: "snippet,status", notifySubscribers: "true" });
      const r = await fetchFn(`${UPLOAD}?${params}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Length": String(tamanho), "X-Upload-Content-Type": "video/mp4" },
        body: JSON.stringify(metadados),
      });
      if (!r.ok) { const t = await r.text(); throw new Error(`YouTube recusou abrir o envio (${r.status}): ${t}`); }
      const sessao = r.headers.get("location");
      if (!sessao) throw new Error("YouTube não devolveu a URL da sessão de envio");

      let inicio = 0;
      for (let k = 1; k <= tentativas; k++) {
        try {
          const corpo = Readable.toWeb(createReadStream(arquivo, { start: inicio }));
          const headers = { ...auth, "Content-Type": "video/mp4", "Content-Length": String(tamanho - inicio) };
          if (inicio > 0) headers["Content-Range"] = `bytes ${inicio}-${tamanho - 1}/${tamanho}`;
          log(`Enviando ${((tamanho - inicio) / 1e6).toFixed(1)} MB${inicio ? ` (retomando do byte ${inicio})` : ""}...`);
          const p = await fetchFn(sessao, { method: "PUT", headers, body: corpo, duplex: "half" });
          if (p.status === 200 || p.status === 201) return await p.json();
          if (p.status < 500 && p.status !== 308) { const t = await p.text(); throw Object.assign(new Error(`envio recusado (${p.status}): ${t}`), { definitivo: true }); }
        } catch (e) {
          if (e.definitivo || k === tentativas) throw e;
          log(`Falhou (${e.message}); tentando de novo.`);
        }
        // pergunta quanto já chegou
        const q = await fetchFn(sessao, { method: "PUT", headers: { ...auth, "Content-Length": "0", "Content-Range": `bytes */${tamanho}` } });
        if (q.status === 200 || q.status === 201) return await q.json();
        const range = q.headers.get("range");
        inicio = range ? Number(range.split("-")[1]) + 1 : 0;
        await new Promise((ok) => setTimeout(ok, 2000 * k));
      }
      throw new Error("envio não concluído depois das tentativas");
    },

    async acharOuCriarPlaylist(titulo, { descricao = "", privacidade = "public" } = {}) {
      let token;
      do {
        const j = await get("playlists", { part: "snippet", mine: "true", maxResults: "50", ...(token ? { pageToken: token } : {}) });
        const achada = j.items?.find((p) => p.snippet.title.trim().toLowerCase() === titulo.trim().toLowerCase());
        if (achada) return { id: achada.id, criada: false };
        token = j.nextPageToken;
      } while (token);
      const nova = await post("playlists", { part: "snippet,status" }, { snippet: { title: titulo, description: descricao, defaultLanguage: "pt-BR" }, status: { privacyStatus: privacidade } });
      return { id: nova.id, criada: true };
    },

    adicionarNaPlaylist: (playlistId, videoId) => post("playlistItems", { part: "snippet" }, { snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } } }),

    /** Comentário do próprio canal no vídeo. Fixar ainda é manual: a API não tem "fixar". */
    comentar: (videoId, texto) => post("commentThreads", { part: "snippet" }, { snippet: { videoId, topLevelComment: { snippet: { textOriginal: texto } } } }),

    /** Estado do vídeo depois do envio (processamento, privacidade, motivo de rejeição). */
    async estadoDoVideo(videoId) {
      const j = await get("videos", { part: "status,processingDetails,snippet", id: videoId });
      return j.items?.[0] ?? null;
    },

    /**
     * Confere de que canal é a autorização. Primeiro por channels.list (cota geral); se a cota geral estiver
     * zerada/esgotada, pelos vídeos que a Analytics API devolve para channel==MINE, descobrindo o dono de cada um
     * pelo oEmbed público. Devolve { ok: true|false|null, id?, autor?, via }: null = não deu pra saber
     * (canal sem vídeo público ainda).
     */
    async confirmarCanal(idEsperado, urlEsperada) {
      try {
        const c = await this.canalAtual();
        return { ok: c.id === idEsperado, id: c.id, autor: c.titulo, via: "channels.list" };
      } catch (e) {
        if (e.motivo !== "quotaExceeded") throw e;
      }
      const fim = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
      const r = await this.relatorio({ startDate: "2010-01-01", endDate: fim, metrics: "views", dimensions: "video", sort: "-views", maxResults: "10" });
      for (const [videoId] of r.rows ?? []) {
        const o = await fetchFn(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (!o.ok) continue;
        const k = await o.json();
        const autorUrl = (k.author_url ?? "").toLowerCase().replace(/\/$/, "");
        return { ok: autorUrl === urlEsperada.toLowerCase(), autor: `${k.author_name} (${k.author_url})`, via: `analytics+oembed (${videoId})` };
      }
      return { ok: null, via: "analytics+oembed: nenhum vídeo público para conferir" };
    },

    videos: (ids) => get("videos", { part: "snippet,statistics,contentDetails,status", id: ids.join(","), maxResults: "50" }),
    listarUploads: (playlistId, pageToken) => get("playlistItems", { part: "contentDetails,snippet", playlistId, maxResults: "50", ...(pageToken ? { pageToken } : {}) }),
    relatorio: (params) => chamar(`${ANALYTICS}?${new URLSearchParams({ ids: "channel==MINE", ...params })}`),
  };
}
