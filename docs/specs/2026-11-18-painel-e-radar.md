# Spec — Painel da rede e Radar

Data: 18/11/2026 · Status: rascunho para aprovação

## Objetivo

1. Tornar o repositório **reutilizável**: o repo carrega só o motor (código, skills,
   modelos). Todo dado de uma rede (canais, pautas, roteiros, fontes, métricas) vive no
   banco, nos `.env` ou no storage de mídia.
2. Dar um **painel** para enxergar o processo de 9 etapas (radar → análise) de todos os
   canais, com os dois portões de aprovação do usuário.
3. Construir primeiro o **Radar** (etapa 1), porque ele precisa de cerca de 2 semanas de
   coleta antes de dar sinal confiável.

## Decisões

| Tema | Decisão |
|---|---|
| Onde fica o dado | Postgres (estado e conteúdo), `.env` (segredos e conexão), MinIO (mídia) |
| Prova de processo (YPP) | Tabela de revisões: cada salvamento de pauta e roteiro grava uma versão imutável com data e autor (usuário, Claude ou LLM). Export em Markdown/ZIP sob demanda |
| Hospedagem | Mac local: `docker compose` com Postgres e MinIO. Migrar para VPS trocando só o `.env` |
| Base do painel | Evoluir o `manager/` existente (Next.js + Prisma + worker), sem app novo |
| Claude ↔ painel | Servidor MCP no `manager/` (stdio). Claude Code lê e grava pelo MCP. LLMs por API rodam no worker e gravam no mesmo banco |
| Julgamento | O código mede (views, mediana, velocidade). Interpretar e propor ângulo é do Claude. Nenhuma pauta ou roteiro nasce automático de uma notícia (regra 8) |

## Consequências no repositório

- `canais/<slug>/` sai do git. Os 3 canais do piloto são importados para o banco por um
  script (`npm run import:canais`) e a pasta entra no `.gitignore`. **Atenção:** os
  `canal.md` atuais já foram publicados no commit público `b52d62d`; removê-los do repo não
  apaga o que já foi visto.
- Skills (`/novo-canal`, `/reel`, `/radar`...) passam a ler e gravar pelo MCP, não mais em
  `canais/<slug>/*.md`.
- `CLAUDE.md`: a regra 2 passa a dizer "toda afirmação tem fonte registrada no painel; o
  histórico de revisões é a prova de processo".
- `.env.example` ganha `DATABASE_URL` e as variáveis do MinIO. Credenciais por canal
  (OAuth do YouTube, Meta) vão para `ChannelConfig`, cifradas com `ENCRYPTION_KEY`, como o
  manager já faz.

## Modelo de dados (novo, ao lado do que o manager já tem)

```
Network            1 linha: nome da rede, idioma, configurações gerais
DarkChannel        slug, nome, handle, nicho, ângulo, público, voz, cadência, produto,
                   identidade (json: paleta, fontes, template de thumb), fase, status
                   → liga ao Project existente do manager (publicação)
ReferenceChannel   canal do YouTube monitorado: youtubeId, título, inscritos, nº de vídeos,
                   data de criação, ativo; N:N com DarkChannel
RefVideo           youtubeId, canal, título, publicadoEm, duração, thumb
RefVideoSnapshot   vídeo, capturadoEm, views, likes, comentários
TrendRun           região, categoria, palavra-chave, rodadoEm; resultados em RefVideo
Signal             vídeo, tipo (OUTLIER | VELOCIDADE | BRECHA | TENDENCIA), score,
                   mediana do canal, múltiplo, status (NOVO | VIRA_PAUTA | DESCARTADO),
                   nota do Claude (por que funcionou)
Pauta              canal, sinal de origem, tese, ângulo, títulos[], thumbs[], status
Video              pauta, etapa (enum abaixo), datas por etapa, ids publicados
Revision           alvo (pauta | roteiro | embalagem), versão, conteúdo, autor, criadoEm
Source             vídeo, url, título, acessadoEm, arquivo (MinIO), afirmação que sustenta
Asset              vídeo, tipo (narração | render | corte | thumb), caminho, metadados
Metric             vídeo, data, CTR, retenção média, retenção 30s, views
```

Etapas do `Video`: `PAUTA → EMBALAGEM (✋) → PESQUISA → ROTEIRO → VOZ → MONTAGEM →
REVISAO (✋) → AGENDADO → NO_AR → ANALISE`. As transições com ✋ só acontecem por ação do
usuário no painel.

## Radar

**Coleta (worker, cron diário às 06:00):**
1. Para cada `ReferenceChannel` ativo: `playlistItems.list` do upload playlist (vídeos dos
   últimos 60 dias) e `videos.list(statistics)` em lotes de 50 → `RefVideoSnapshot`.
   Custo: cerca de 2 unidades por canal por dia.
2. `videos.list?chart=mostPopular` em US, nas categorias de cada canal (1 unidade cada).
3. Busca por palavra-chave (100 unidades cada): no máximo 20 por dia, com as palavras do
   `DarkChannel`, filtrando vídeos de mais de 20 min da semana.
4. Orçamento: aborta acima de 8.000 unidades por dia e registra o motivo.

**Análise (depois da coleta):**
- `OUTLIER`: views ≥ 3 × mediana dos últimos 30 vídeos do mesmo canal (já com 7 dias ou mais).
- `VELOCIDADE`: views/hora nas primeiras 72h ≥ 3 × a mediana de views/hora do canal.
- `BRECHA`: vídeo de busca com views altas num canal com menos de 10 mil inscritos ou com menos de 6 meses.
- `TENDENCIA`: tema que aparece em 3 ou mais sinais de canais diferentes na mesma semana.
- Score = múltiplo × peso por tipo, normalizado de 0 a 100.

**Interpretação (Claude, via MCP):** `radar_listar_sinais(canal, status=NOVO)` → Claude
assiste ou lê o título, a thumb e a transcrição (yt-dlp + faster-whisper), registra a nota
"por que funcionou" e propõe uma pauta com o nosso ângulo e 5 títulos (`pauta_criar`). No
painel, o usuário vê a pauta ao lado do sinal e aprova ou descarta.

**Semente de canais de referência:** na primeira rodada, o Claude levanta de 20 a 40
canais por canal da rede (busca + `validar-nicho.js`) e o usuário confirma a lista no painel.

## Ferramentas MCP (primeira versão)

`rede_listar_canais` · `canal_obter` · `canal_atualizar` · `radar_adicionar_referencia` ·
`radar_listar_sinais` · `radar_anotar_sinal` · `pauta_criar` · `pauta_listar` ·
`video_mover_etapa` (recusa as etapas ✋) · `roteiro_salvar` (gera uma Revision) ·
`fonte_registrar` · `asset_registrar`

## Telas

| Tela | Conteúdo |
|---|---|
| Rede | Cards dos canais: fase, vídeos por etapa, CTR e retenção médios |
| Radar | Sinais por canal com filtro de tipo, gráfico de views/hora, botões "virar pauta" e "descartar". Uso da cota do dia |
| Pipeline | Kanban dos vídeos por etapa, filtrável por canal |
| Vídeo | Embalagem, roteiro com histórico de revisões, fontes, prévia do render, cortes e botões de aprovação |
| Fila | A fila de publicação que o manager já tem |

## Fora do escopo agora

TikTok Shop, geração de música, publicação automática no TikTok, multiusuário.

## Ordem de construção

1. Schema novo + migração + `import:canais` + MCP mínimo (`rede_*`, `canal_*`).
2. Coleta do Radar + análise + MCP do Radar. **Ligar a coleta o quanto antes.**
3. Telas Rede e Radar.
4. Pauta, Video, Revision e Source + telas Pipeline e Vídeo.
5. Adaptar `/novo-canal` e as outras skills para o MCP. Tirar `canais/` do git.

## Pré-requisitos do usuário

- `YT_API_KEY` (grátis), via `/instalar`.
- Docker Desktop no Mac.
