---
name: instalar
description: >
  Instala e configura o Dark Business OS numa máquina: confere programas, roda npm install,
  conduz o preenchimento do .env da raiz, do manager e de cada canal (com passo a passo para
  criar cada chave) e o OAuth do YouTube por canal. Pode ser rodada de novo: só pergunta o que
  falta. Use quando o usuário disser "instalar", "/instalar", "configurar o repo", "primeiro
  setup", "o que falta configurar", ou logo depois de clonar o repositório.
---

# /instalar — setup do Dark Business OS

Conversa, não formulário: **uma pergunta por vez**, esperando a resposta. O objetivo é sair
daqui com a máquina pronta para pesquisar, narrar, renderizar e (quando aprovado) publicar.
A parte editorial de cada canal (nicho, identidade, pautas) é do `/novo-canal`, não daqui.

## Regras

- **Nunca imprimir, repetir ou commitar o valor de uma chave.** Ao conferir, só dizer se está
  preenchida. Se o usuário colar uma chave no chat, gravar no `.env` certo e não repeti-la.
- **Chave paga ou conta nova: perguntar antes.** Dizer o custo esperado e esperar o "sim".
- Quem cria contas e roda OAuth é o usuário. Claude explica o passo a passo e confere depois.
- Pular o que já está pronto. Se tudo estiver pronto, dizer isso e mostrar o resumo.
- Chave que o usuário não quer criar agora fica vazia e entra como pendente no resumo.

## Fase 1: diagnóstico

Rodar `bash scripts/verificar-instalacao.sh` e mostrar ao usuário só as linhas com ✗ e !,
agrupadas. Isso define o que as fases seguintes cobrem.

## Fase 2: programas e dependências

Para cada programa faltando, dar o comando (macOS, Homebrew) e pedir para o usuário rodar ou
autorizar:

| Falta | Comando | Para quê |
|---|---|---|
| node < 20 | `brew install node` | scripts e `--env-file` |
| ffmpeg/ffprobe | `brew install ffmpeg` | duração da narração, cortes 9:16 |
| yt-dlp | `brew install yt-dlp` | baixar vídeos de referência para estudo |
| gh | `brew install gh && gh auth login` | `/salvar` |
| faster-whisper | `pip3 install faster-whisper` | opcional, transcrever referências |
| Chromium | `npx playwright install chromium` | thumbnails HTML → PNG |

Depois, `npm install` na raiz, em `reels/` e em `manager/` (os que faltarem), e
`npx tsc --noEmit` em `reels/` e `manager/`. Relatar se compila.
Vulnerabilidades do `npm audit`: só relatar. Nunca rodar `npm audit fix --force` sem pedir.

## Fase 3: `.env` da raiz

Se não existir, `cp .env.example .env`. Seguir a ordem abaixo, uma chave por vez, com o passo
a passo que está no comentário do `.env.example`:

1. `YT_API_KEY` (grátis). É a primeira porque destrava o `/novo-canal`. Depois de gravada,
   testar com uma chamada barata (sem imprimir a chave):
   `node --env-file=.env -e "fetch('https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key='+process.env.YT_API_KEY).then(r=>console.log(r.status))"`
   → 200 é sucesso; 403 normalmente é a API não ativada no projeto.
2. `OPENAI_API_KEY` + `VOZ_TTS` (**paga**). Perguntar antes. Se o provedor de TTS ainda não foi
   escolhido (Fase 0, passo 2 do HANDOFF), oferecer deixar para depois das amostras de voz.
3. `CLOUDINARY_*` (plano grátis). Só necessária para publicar no Instagram; pode ficar para
   quando houver o primeiro vídeo aprovado.

## Fase 4: manager

Perguntar se o usuário quer rodar o manager agora (fila de publicação multicanal). Se não,
pular e marcar como pendente. Se sim:
- `cp manager/.env.example manager/.env`;
- `AUTH_SECRET`: `openssl rand -base64 32`; `ENCRYPTION_KEY`: `openssl rand -hex 32`
  (gerar e gravar direto no arquivo, sem mostrar). Avisar: perder a `ENCRYPTION_KEY` invalida
  as credenciais de canal guardadas no banco;
- `ADMIN_USERNAME`/`ADMIN_PASSWORD`: perguntar ao usuário;
- `DATABASE_URL`: Postgres local (`docker compose up -d` em `manager/`) ou outro que o usuário
  indicar. Ver `manager/README.md`;
- `PUBLISHING_DRY_RUN=true` até o usuário dizer o contrário.

## Fase 5: canais

Ler `canais/_rede.md`. Para cada canal com `canal.md`:
1. Se não tiver `.env`, `cp canais/_modelo.env.example canais/<slug>/.env`.
2. Perguntar se a conta do YouTube (brand account própria) já existe. Se não, explicar como
   criar: youtube.com → Configurações → Adicionar ou gerenciar canais → Criar canal (gera brand
   account separada). Lembrar que nome e handle saem do `/novo-canal`. Não seguir para o
   próximo item sem a conta.
3. Preencher `YT_CANAL_ID`, `YT_CANAL_URL` e `YT_SECRETS_DIR=canais/<slug>/secrets`.
4. OAuth: o usuário coloca o `client_secret.json` (Google Cloud → Credenciais → ID do cliente
   OAuth, tipo "App para computador") em `canais/<slug>/secrets/` e roda
   `node --env-file=.env --env-file=canais/<slug>/.env scripts/youtube/autorizar.js`.
   **Atenção:** até o passo 5 da Fase 0 (OAuth por canal) estar feito, `scripts/youtube/config.js`
   cai num padrão herdado (`../A2LO/secrets` e o canal da A2LO) quando falta variável. Conferir
   que `YT_CANAL_ID` e `YT_SECRETS_DIR` estão preenchidos antes de autorizar.
5. Instagram (`META_*`): só quando o canal tiver conta profissional. Pode ficar pendente.

## Fase 6: resumo

Rodar o verificador de novo e mostrar:

```
✓ Programas e dependências
✓ .env da raiz: YT_API_KEY · ✗ OPENAI_API_KEY (pendente: escolher TTS)
✓ manager | pulado
Canais:
  margin-notes   ✓ YouTube  ✓ OAuth  ✗ Instagram
  borderline     ✗ conta ainda não criada
  unsolved-atlas ✗ conta ainda não criada
```

E o próximo passo: se falta algum canal do piloto, `/novo-canal`; senão, seguir a Fase 0 do
`docs/HANDOFF.md`. Para salvar o trabalho no GitHub, `/salvar`.
