# Instagram (Meta Graph API)

Versão da API: `v21.0`. O cliente é porte direto de `scripts/lib/graph.js`, que
publica desde o primeiro carrossel — mesmo endpoint, mesmo formato de corpo, com
erro tipado por cima.

## Fluxo

```
carrossel:  N × POST /{ig-user-id}/media (is_carousel_item)
            → POST /{ig-user-id}/media (media_type=CAROUSEL, children=…)
imagem:     POST /{ig-user-id}/media (image_url, caption)
reel:       POST /{ig-user-id}/media (media_type=REELS, video_url)

→ GET /{container-id}?fields=status_code   até FINISHED
→ [grava remoteContainerId e publishRequestedAt]
→ POST /{ig-user-id}/media_publish
→ GET /{media-id}?fields=permalink         (falhar aqui não é falha)
```

## Pré-requisitos da plataforma

- Conta Instagram **Business**, conectada a uma Página do Facebook (exigência da
  Meta mesmo sem usar a Página).
- Token de longa duração da Página.
- **A mídia precisa estar numa URL pública alcançável pela Meta.** Ver [minio.md](minio.md).

## Limites respeitados

| Limite | Onde |
|---|---|
| 2 a 10 mídias por carrossel | validado antes de qualquer chamada |
| 8 MB por imagem, 1 GB por vídeo | validado no import e no upload |
| 100 publicações por 24 h | `content_publishing_limit` consultado antes de subir mídia |

## Comportamentos observados em produção

**Container falha de forma transitória.** "Only photo or video can be accepted as
media type" aparece às vezes na criação e resolve na tentativa seguinte. O
publisher retenta a criação até 3 vezes, recriando os containers do zero —
containers filhos não são reutilizáveis. Retentar aqui é seguro: nada foi
publicado ainda.

**`media_publish` mente.** Pode responder "Application request limit reached" e
ter processado a publicação. Ver [publishing.md](publishing.md).

## Tipos

Implementados: `IMAGE`, `CAROUSEL`, `REEL`.
Modelados, não implementados: `STORY`, `VIDEO` — pedir um deles dá erro
permanente explícito, em vez de fingir suporte.

## Outros canais

`Publisher` é a interface; `InstagramPublisher` é uma implementação. Acrescentar
YouTube ou TikTok é implementar a interface e registrar no worker. O worker não
conhece a API de canal nenhum.
