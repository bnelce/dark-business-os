# Handoff — origem do projeto e estado em 18/11/2026

Este documento existe para que uma sessão nova comece sabendo tudo o que foi
decidido na sessão que criou o workspace (aberta no VENDAS-IG).

## Como chegamos aqui

1. **Estudo do @afonsomolina** (2,75 mi de seguidores, cerca de 16 posts/dia).
   A lição que vale para a rede: volume, gancho de quebra de padrão, CTA no
   final e formatos sem fala. O que não vale: o método dele depende do rosto.
   Análise em `VENDAS-IG/saidas/pesquisa-afonsomolina/`.
2. **Pesquisa de nichos e métodos** (5 frentes: nichos BR, nichos gringos,
   listas de ideias em vídeos, Peter Jordan/Paddy Galloway e outros, e o vídeo
   da Mari C.). Relatório em `docs/pesquisa/reports/` e notas em
   `docs/pesquisa/research_notes/`.
3. **Roadmap** em `docs/pesquisa/roadmap-rede-canais-dark.md`.

## Decisões tomadas pelo usuário

| Decisão | Escolha |
|---|---|
| Idioma | **Inglês** (CPM dos EUA é cerca de 9x o do Brasil). Dublagem PT/ES em faixa de áudio fica para a fase de escala |
| Conteúdo | "Os vídeos terão um certo padrão, mas ainda serão autênticos": formato fixo por canal, tese e pesquisa próprias por vídeo |
| Nichos e nomes | Os 10 do roadmap aprovados (nomes ainda candidatos, falta conferir handle) |
| Piloto | 3 canais: **Margin Notes** (economia/dados), **Borderline** (geografia/mapas), **Unsolved Atlas** (mistérios) |
| Workspace | Repo próprio, privado: `github.com/bnelce/dark-business-os` |
| Manager | Veio junto agora, não ficou para a fase 2 |
| Canais novos | Skill `/novo-canal` |

## Divisão de trabalho assumida (o usuário pode corrigir)

- Claude pesquisa, escreve o roteiro, narra (TTS em inglês), monta e corta.
- O usuário **aprova a pauta e o vídeo final** antes de qualquer publicação.
  Nunca publicar sem um "pode publicar" explícito.
- O usuário cria as contas (YouTube, Instagram, TikTok) e roda os OAuth.

## Estado do repositório

**Pronto:**
- `CLAUDE.md`: regras da rede.
- `canais/_rede.md` e as pastas dos 3 canais do piloto (`canal.md` preenchido;
  `identidade.md` e `pautas.md` vazios).
- `.claude/skills/novo-canal/`: a skill nova.
- Base copiada do VENDAS-IG: `reels/` (Remotion), `scripts/` (publicação
  YouTube/Instagram, narração), `manager/`, skills de vídeo.

**Não funciona ainda:**
- `npm install` não foi rodado em `reels/` nem em `manager/`.
- As skills `/reel`, `/aula-reel`, `/mapa-mental`, `/radar` e `/carrossel`
  ainda apontam para `negocios/<slug>/` e geram conteúdo em português.
  Adaptar no primeiro uso.
- `reels/src/` ainda tem o código dos reels do Ciência Visual (`ciencia/`) e da
  Flor (`flor/`), porque o `Root.tsx` importa esses arquivos. As mídias
  (`reels/public/ciencia`, `flor`, `fotos`) foram removidas. Esses reels não
  renderizam mais, mas servem de referência de código. Limpar o `Root.tsx`
  quando os formatos da rede existirem.
- `scripts/publicar-proximo-pendente.js` e `scripts/postar-story.js` têm
  caminhos padrão de `negocios/ciencia-visual/`.
- Não existe formato longo 16:9: tudo no motor é 9:16, de até 90s.
- Nenhuma credencial foi copiada. Cada canal vai ter `canais/<slug>/.env`.

## Fase 0: Fundação (próximas 2 semanas)

1. Rodar `/novo-canal` para os 3 canais do piloto: confirmar handle/domínio,
   fazer o `identidade.md` e 10 pautas com outlier de referência.
2. Escolher a voz em inglês: fazer amostras de 2 ou 3 provedores de TTS em
   narração de 2 min e o usuário escolhe pelo ouvido e pelo custo.
3. Construir o formato longo 16:9 em capítulos (cenas reaproveitáveis) +
   cortador `[CORTE]` → 9:16 + gerador de thumbnail (HTML → PNG, 3 variações).
4. Fazer o vídeo-piloto de cerca de 12 min de um dos canais. O usuário aprova.
5. Adaptar o upload do YouTube (`scripts/youtube/`) para um OAuth por canal.

**Critério para sair da fase 0:** vídeo-piloto aprovado pelo usuário.

## Questões em aberto

1. **[RESOLVIDO 18/11]** Copiado o útil: `scripts/validar-nicho.js` (com
   `--consultas`) e as regras 8 a 10 do CLAUDE.md. O YT-DARK fica intocado.
   Texto original: **Projeto antigo `~/Projetos/YT-DARK`** (agosto/2026): canal único de
   história da tecnologia, em PT. Tem `scripts/validar-nicho.js` (mede a
   concorrência via YouTube Data API), regras de conformidade e o prazo do YPP.
   Sobrepõe-se a Rise & Ruin e Megabuilt. **Perguntar ao usuário** se
   incorpora ao DARK ou mantém separado. Não mexer nele sem resposta.
2. **Prazo do YPP:** o YT-DARK anota que o requisito sobe de 4.000 h/12 meses
   para 8.000 h/365 dias para canais novos a partir de 01/02/2027. Isso vem de
   uma fonte só; conferir na página oficial do YouTube. Se for real, o piloto
   precisa monetizar antes disso.
3. **Provedor de TTS** em inglês: custo × naturalidade.
4. **Brand accounts:** separar cada canal numa brand account do YouTube, sem
   ligar todos a uma conta só.

## Referências úteis no VENDAS-IG (não copiadas)

- Business Discovery da Graph API para estudar perfis de concorrentes no
  Instagram (token de um perfil próprio, limite de cerca de 1.500 posts/hora).
- Transcrição local: faster-whisper `small` int8, alimentado com um array numpy
  vindo do ffmpeg, porque o PyAV desse ambiente quebra o `decode_audio`.
- OCR nativo do macOS via Vision (helper Swift).
