# Storage e URL pública

Duas coisas diferentes, que o sistema mantém separadas de propósito:

| | Contrato | Para quê |
|---|---|---|
| **Storage** | `StorageProvider` | Guardar o arquivo. Fonte de verdade. |
| **URL pública** | `PublicUrlProvider` | Dar à plataforma uma URL que ela consiga baixar. |

## Por que separado

A Meta baixa a mídia por URL. `localhost:9000` não é alcançável pela internet,
então o MinIO local **não pode** ser a URL de publicação em desenvolvimento.
Amarrar os dois deixaria o sistema com uma escolha ruim: ou não publicar em dev,
ou trocar o storage.

Duas implementações, escolhidas por `PUBLIC_URL_PROVIDER`:

- `minio` — **produção.** O bucket é servido por DNS próprio
  (`MEDIA_PUBLIC_BASE_URL`, ex.: `https://media.seudominio.com`) atrás de proxy
  reverso. A chave do objeto é o caminho, então a URL é estável e não expira.
  Recusa base sem `https`, porque a Meta recusa `http`.
- `cloudinary` — **desenvolvimento.** Espelha o objeto no Cloudinary só pra
  gerar a URL. O MinIO continua sendo a fonte; o espelho é descartável.

> O dry-run **usa** o provider configurado. Com Cloudinary, ele espelha as
> mídias de verdade — é assim que se prova que a URL funciona. Só a chamada de
> publicação é que não acontece.

## Layout do bucket

```
projects/{projectId}/publications/{publicationId}/original/{posição}-{nome}
```

Bucket: `publication-media` (nome neutro — o sistema atende vários projetos).

IDs em vez de slugs: renomear um projeto não pode invalidar mídia já publicada.
A posição no nome mantém o carrossel legível no console do MinIO.

## Acesso pelo dashboard

O bucket nunca é servido direto. O preview passa por `/api/media/[...chave]`,
que exige sessão, recusa travessia de diretório e só serve chaves sob
`projects/`. O console admin do MinIO fica preso em `127.0.0.1:9001`.
