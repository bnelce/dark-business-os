// Metadados de um vídeo do YouTube (videos.insert, partes snippet + status) a partir do youtube.json da pasta.
// Limites conferidos na referência da Data API v3: título até 100 caracteres, descrição até 5000 bytes,
// nenhum dos dois aceita < ou >, e as tags somam até 500 caracteres contando aspas e vírgulas.

export const CATEGORIA_CIENCIA_TECNOLOGIA = "28";

/** Tamanho das tags como o YouTube conta: tag com espaço ganha aspas, e há uma vírgula entre tags. */
export function contarCaracteresDeTags(tags = []) {
  const corpo = tags.reduce((soma, t) => soma + t.length + (t.includes(" ") ? 2 : 0), 0);
  return corpo + Math.max(0, tags.length - 1);
}

/**
 * @param {{ titulo: string, descricao: string, tags?: string[], categoria?: string, idioma?: string }} cfg
 * @param {{ privacidade?: "private" | "unlisted" | "public", publicarEm?: string }} opcoes
 */
export function montarMetadados(cfg, { privacidade = "private", publicarEm } = {}) {
  const titulo = (cfg.titulo ?? "").trim();
  const descricao = cfg.descricao ?? "";
  const tags = cfg.tags ?? [];
  const idioma = cfg.idioma ?? "pt-BR";

  if (!titulo) throw new Error("título vazio");
  if (titulo.length > 100) throw new Error(`título com ${titulo.length} caracteres (máximo 100)`);
  if (/[<>]/.test(titulo)) throw new Error("título com < ou > (o YouTube recusa)");
  const bytes = Buffer.byteLength(descricao, "utf8");
  if (bytes > 5000) throw new Error(`descrição com ${bytes} bytes (máximo 5000)`);
  if (/[<>]/.test(descricao)) throw new Error("descrição com < ou > (o YouTube recusa)");
  const nTags = contarCaracteresDeTags(tags);
  if (nTags > 500) throw new Error(`tags somam ${nTags} caracteres (máximo 500)`);
  if (!["private", "unlisted", "public"].includes(privacidade)) throw new Error(`privacidade inválida: ${privacidade}`);

  const status = {
    privacyStatus: privacidade,
    selfDeclaredMadeForKids: false,
    // Narrador sintético genérico sobre gráficos não é o "conteúdo alterado realista" da regra do YouTube.
    // Se um vídeo imitar pessoa real ou cena real, o youtube.json deve trazer "sintetico": true.
    containsSyntheticMedia: cfg.sintetico === true,
    embeddable: true,
  };
  if (publicarEm) {
    const quando = new Date(publicarEm);
    if (Number.isNaN(quando.getTime())) throw new Error(`data de agendamento inválida: ${publicarEm}`);
    if (quando.getTime() <= Date.now()) throw new Error(`agendamento no passado: ${publicarEm}`);
    // O YouTube só agenda vídeo privado: no horário, ele mesmo vira público.
    status.privacyStatus = "private";
    status.publishAt = quando.toISOString();
  }

  return {
    snippet: {
      title: titulo,
      description: descricao,
      tags,
      categoryId: cfg.categoria ?? CATEGORIA_CIENCIA_TECNOLOGIA,
      defaultLanguage: idioma,
      defaultAudioLanguage: idioma,
    },
    status,
  };
}
