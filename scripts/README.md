# scripts/ — utilitários compartilhados entre negócios

Compartilhado por todos os negócios em `negocios/<slug>/` (ver `CLAUDE.md` da raiz, seção "Multi-negócio") — nenhum script aqui é específico da Revisão Rápida, mesmo que os exemplos abaixo usem ela.

> **Coexistência com o Publication Manager (`manager/`).** Estes scripts
> continuam sendo a produção. O sistema novo roda em paralelo, em dry-run.
> Os dois têm noções diferentes de "já publicado" — o antigo olha
> `publicado.md`, o novo olha o banco — então **nunca podem executar juntos**.
> Antes de ligar o worker do manager, descarregue o launchd:
> `launchctl unload ~/Library/LaunchAgents/com.revisaorapida.publicar.plist`.
> Ver `manager/docs/operations.md`.

## Scripts ativos

| Script | O que faz | Chamado por |
|---|---|---|
| `gerar-carrossel-educativo.js` | Lê `conteudo.json` (schema documentado em `.claude/skills/carrossel-educativo/SKILL.md`) e monta o `carrossel.html` com 6 slides, cores por disciplina, foto de fundo opcional na capa | `/carrossel-educativo` |
| `render.js` (copiado de `scripts/_render-template.js` pra cada pasta de conteúdo) | Playwright tira screenshot 1080x1350 de cada `.slide` do `carrossel.html` | `/carrossel-educativo`, `/publicar-carrossel`, `gerar-post-flor.mjs` |
| `gerar-post-flor.mjs` | Lê `conteudo.json` (slides tipo capa/sentimento/ocasiao/cta) e monta o `carrossel.html` no estilo Flor de Gostosura (selo da flor + cor sólida rotativa) | Flor de Gostosura, geração de posts |
| `postar-instagram.js` | Sobe as PNGs pro Cloudinary (a API do Instagram exige `image_url` público), cria os containers (single ou carrossel) e publica via Meta Graph API | `/publicar-carrossel` |
| `publicar-proximo-pendente.js` | Escolhe o próximo carrossel pendente (tem `pendente.md`, não tem `publicado.md`) num negócio — aceita `--raiz=negocios/<slug>/marketing/conteudo` e `--negocio-env=negocios/<slug>/.env` (default: Revisão Rápida) — e publica via `postar-instagram.js`. Cronograma de disciplina por dia é específico da Revisão Rápida; outro negócio com automação própria usa seu próprio mapeamento | `launchd` (um job por negócio que tiver automação, ver abaixo) |
| `gerar-logos.js <slug>` | Renderiza os PNGs do logo a partir de `negocios/<slug>/identidade/logo-fonte.html` | Manual, quando a marca mudar |
| `reels/checar-ambiente.js` | Confere as 6 variáveis de ambiente, ffmpeg/ffprobe e o token da Meta antes de qualquer coisa do pipeline de reels | Manual, ao configurar |
| `reels/narrar.js` | Gera a narração TTS, um MP3 por beat, e grava as durações lidas pelo ffprobe | `/reel` |
| `reels/render.js` | Monta a timeline, renderiza o MP4 via Remotion e recusa vídeo fora de 1080x1920/30fps/h264/15-25s | `/reel` |
| `reels/publicar.js` | Sobe o MP4 pro Cloudinary e publica como **reel normal** (grade + seguidores) via Meta Graph API. `--trial` publica como trial reel (só não-seguidores) | `/reel` |
| `reels/colher.js` | 72h depois, registra as métricas; pra trial reel, verifica também se graduou pro feed | `/reel` |

## Pré-requisitos

**Node.js 20+** e **Playwright** (`npm install` na raiz já traz tudo — está em `package.json`).

**.env** dentro de cada `negocios/<slug>/` (nunca commitado — está no `.gitignore`):
```bash
META_PAGE_ACCESS_TOKEN=...
META_PAGE_ID=...
META_IG_USER_ID=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
OPENAI_API_KEY=...
```

## Publicação automática (launchd)

Do Ciência Visual (ex-Revisão Rápida, mesma conta do Instagram), configurado em `~/Library/LaunchAgents/com.cienciavisual.publicar.plist` (fora do repo, é local da máquina), com `--raiz=negocios/ciencia-visual/marketing/conteudo --negocio-env=negocios/ciencia-visual/.env`. Um negócio novo com automação própria ganha seu próprio `.plist`, apontando pra sua própria pasta. Roda `publicar-proximo-pendente.js` 2x/dia, às 12h e 20h. **Desligado desde 2026-10-27** (`launchctl disable`) durante a troca de marca — religar com `launchctl enable gui/$(id -u)/com.cienciavisual.publicar && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.cienciavisual.publicar.plist` só quando o primeiro lote do Ciência Visual estiver aprovado.

Log em `scripts/publicar.log` (ignorado pelo git).

Comandos úteis:
```bash
launchctl list | grep revisaorapida          # confirma se está carregado
launchctl unload ~/Library/LaunchAgents/com.revisaorapida.publicar.plist   # pausa
launchctl load ~/Library/LaunchAgents/com.revisaorapida.publicar.plist     # retoma
```

**Importante:** só publica pastas que já têm `pendente.md` (aprovado no chat) — nunca gera nem aprova conteúdo novo sozinho.

## Pegadinha conhecida: "Application request limit reached" no media_publish

Em 2026-09-05 esse erro apareceu no `media_publish` várias vezes seguidas, mas **o post foi ao ar mesmo assim** em quase todos os casos (confirmado consultando `GET /{ig-user-id}/media` logo depois). Parece um comportamento da própria Graph API — retorna erro de rate limit na resposta, mas processa a ação de qualquer forma.

Isso já causou publicação duplicada uma vez (a automação via o "erro" e tentava de novo). Correção aplicada: o sucesso do `media_publish` agora é sempre registrado antes de tentar buscar o link (que pode falhar sem afetar o que já foi publicado). Mesmo assim, **se esse erro aparecer de novo, sempre conferir a API antes de tentar de novo** — não assumir que falhou de verdade.
