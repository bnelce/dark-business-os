# Operação

## O básico

```bash
cd manager
docker compose up -d postgres minio   # infraestrutura
npm run dev                           # dashboard, porta 3100
npm run worker                        # executor da fila
```

**O worker não é opcional.** Publicação agendada sem worker no ar simplesmente
não sai. O painel mostra um alerta vermelho quando há publicação vencida e
nenhum heartbeat recente.

## Coexistência com o sistema antigo — leia antes de desligar o dry-run

O sistema antigo continua funcionando:

```
~/Library/LaunchAgents/com.revisaorapida.publicar.plist
  → scripts/publicar-proximo-pendente.js  (12h e 20h)
```

**Os dois não podem rodar ao mesmo tempo.** Cada um tem sua própria noção de
"o que já foi publicado" — o antigo olha `publicado.md`, o novo olha o banco.
Rodando juntos, o mesmo carrossel sai duas vezes.

Ordem de corte:

```bash
launchctl unload ~/Library/LaunchAgents/com.revisaorapida.publicar.plist  # 1. desliga o antigo
launchctl list | grep revisaorapida                                        # 2. confirma
# 3. só então PUBLISHING_DRY_RUN=false e sobe o worker
```

Para voltar atrás: pare o worker, `launchctl load` no plist.

## Diagnóstico

```bash
curl -s localhost:3100/api/health | jq       # app, banco, MinIO, worker
docker compose ps                             # containers
tail -f /tmp/pm-worker.log | jq               # log do worker (JSON, uma linha por evento)
```

O log é estruturado e passa por um redator: token, senha e segredo nunca saem.

## Situações

**Publicação presa em `PUBLISHING`.** O worker recupera sozinho depois de
`LOCK_TIMEOUT_MS` (15 min). A exceção é quando a plataforma não respondeu à
consulta de reconciliação — aí ela fica presa **de propósito**, com o motivo na
timeline. Confira a conta manualmente antes de qualquer coisa.

**Publicação `PUBLISHED` sem link.** Não é falha. O post está no ar; só o
permalink não veio. Use "Sincronizar metadados" no detalhe.

**Rate limit em cascata.** O backoff de rate limit começa em 30 min e vai até
4 h. Não force retry manual em sequência — foi assim que a cota queimou em
2026-09-05.

**Erro permanente.** Não é retentado sozinho. Corrija a causa (token, canal
desativado, mídia) e use "Tentar de novo", que reabre o teto de tentativas.

**Fila parada com tudo aprovado.** Aprovado não é agendado. Agende no detalhe da
publicação ou use "Publicar agora".

## Cadência

O worker executa **uma publicação por ciclo**. O espaçamento entre posts vem do
agendamento, não do worker — publicar em rajada divide a distribuição do
Instagram entre vários posts e pode ler como spam.

## Backup

O que importa:

- **Origem editorial:** `marketing/conteudo/` — versionado no git, nunca tocado
  pelo manager.
- **Banco:** `docker exec pm-postgres pg_dump -U pm publication_manager > backup.sql`
- **MinIO:** volume `manager_pm-minio`. As mídias também continuam na origem,
  então o bucket é reconstruível rodando o import de novo.
- **`.env`:** não versionado. `ENCRYPTION_KEY` perdida = credenciais de canal
  perdidas (reconfiguráveis).
