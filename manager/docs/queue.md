# Fila, estados e retry

## Máquina de estados

```
DRAFT ──→ APPROVED ──→ SCHEDULED ──→ PUBLISHING ──→ PUBLISHED
  │           │            │              │
  │           │            │              └──→ FAILED ──→ RETRYING ──→ PUBLISHING
  └───────────┴────────────┴──→ CANCELLED ──→ DRAFT
```

**Aprovar e agendar são atos diferentes.** Criar ou importar uma publicação
nunca a torna publicável: ela precisa de uma aprovação explícita e depois de um
agendamento explícito. Nenhum caminho pula essas duas etapas.

Detalhes que valem saber:

- **Reagendar não é transição.** Continua `SCHEDULED`, só muda `scheduledAt`.
  Fica fora da máquina de propósito, senão qualquer estado poderia "transicionar
  para si mesmo".
- **`PUBLISHING` não cancela.** Uma vez em voo, só o worker decide o desfecho.
- **`PUBLISHED` é terminal.** Sem saída, por nenhuma ação.
- **`CANCELLED` reabre como `DRAFT`**, com tentativas zeradas.

Fonte: `src/domain/publication-state.ts`. Testes: `tests/state-machine.test.ts`.

## Elegibilidade

O worker considera elegível:

```sql
(status = 'SCHEDULED' AND scheduledAt <= agora)
OR (status = 'RETRYING' AND nextAttemptAt <= agora)
```

Nada além disso. Sem dia da semana, sem disciplina, sem prioridade editorial.

## Lock

A aquisição é um comando só:

```sql
WITH elegivel AS (
  SELECT id FROM "Publication" WHERE … ORDER BY … LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE "Publication" SET status='PUBLISHING', lockedBy=…, attempts=attempts+1
FROM elegivel WHERE …
```

`SKIP LOCKED` faz workers concorrentes pularem linhas já travadas em vez de
esperarem. Seleção e marcação acontecem juntas — não existe janela entre
"escolhi" e "é minha".

`attempts` incrementa na **aquisição**, não no resultado: uma tentativa que
morre no meio já contou, senão um processo em loop de crash retentaria para
sempre sem gastar tentativa.

## Recuperação de publicação presa

Publicação em `PUBLISHING` além de `LOCK_TIMEOUT_MS` é tratada pelo worker
antes de qualquer trabalho novo, nesta ordem:

1. **Não chegou a pedir publicação** (`publishRequestedAt` nulo) → volta pra fila.
2. **Pediu, e a plataforma tem o post** → adota o post (`PUBLISHED`, reconciliada).
3. **Pediu, e a plataforma não tem** → volta pra fila.
4. **Pediu, e não deu pra perguntar** → **fica presa de propósito**. Consulta que
   falhou não é prova de que nada foi publicado. Aparece no dashboard para
   resolução manual.

## Retry

| Situação | Comportamento |
|---|---|
| Erro permanente (token, mídia recusada, config errada) | `FAILED` na hora, sem retry |
| Erro transitório (timeout, 5xx, rede) | backoff a partir de 2 min, fator 3 |
| Rate limit | backoff a partir de **30 min**, fator 3, teto de 4 h |
| Tentativas esgotadas | `FAILED`, aguardando decisão do operador |

O regime separado para rate limit existe por um caso real: em 2026-09-05 a mesma
publicação foi retentada de 30 em 30 minutos por 4 horas contra uma janela que
não tinha reaberto.

"Tentar de novo" no dashboard reabre o teto de tentativas — sem isso a
publicação voltaria pra fila só para falhar de novo imediatamente.
