# Dark Business OS

Rede de canais faceless em inglês: vídeos longos no YouTube + cortes para Shorts, Reels e TikTok + produto low cost por canal.

- Regras e estrutura: `CLAUDE.md`
- Plano: `docs/pesquisa/roadmap-rede-canais-dark.md`
- Estado e decisões: `docs/HANDOFF.md`
- Canais: `canais/_rede.md`

## Instalação

Pré-requisitos: macOS, [Homebrew](https://brew.sh), Node 20+, Claude Code.

1. Clone o repositório e abra a pasta no VS Code com o Claude Code.
2. Rode **`/instalar`**. Ele confere os programas, roda os `npm install` e conduz, uma chave
   por vez, o preenchimento de:
   - `.env` (raiz): chaves compartilhadas, modelo em `.env.example`;
   - `manager/.env`: fila de publicação, modelo em `manager/.env.example`;
   - `canais/<slug>/.env`: credenciais de cada canal, modelo em `canais/_modelo.env.example`.
3. Para ver o que falta a qualquer momento: `bash scripts/verificar-instalacao.sh`.

Sem o Claude Code, siga os mesmos passos em `.claude/skills/instalar/SKILL.md`.

Os scripts leem as chaves com `node --env-file=.env [--env-file=canais/<slug>/.env] <script>`.
Nenhum `.env` nem pasta `secrets/` vai para o git.

## Uso

- Canal novo: `/novo-canal`
- Shorts e reels: `/reel`, `/aula-reel`, `/mapa-mental`
- Salvar no GitHub: `/salvar`
