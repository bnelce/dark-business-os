# Arquitetura

## Princípio

O sistema é **infraestrutura de distribuição**, não ferramenta editorial.
Ele organiza, agenda, armazena, executa, monitora e registra. Ele não decide o
que publicar, não gera conteúdo, não escreve legenda e não aprova nada sozinho.

A separação que sustenta isso:

```
PLANEJAMENTO EDITORIAL          PUBLICATION MANAGER           DISTRIBUIÇÃO
(skills, cronograma,      →     (fila, estado, worker)   →    (Instagram, …)
 disciplina do dia)
```

Regra de cronograma ("segunda é Biologia") vive no lado editorial. O worker só
pergunta uma coisa: *qual publicação aprovada e agendada está pronta agora?*

## Camadas

```
src/domain/      máquina de estados, classificação de erro — sem I/O
src/queue/       fila, lock, retry, transições, eventos
src/publishers/  contrato Publisher + InstagramPublisher + DryRunPublisher
src/storage/     contrato StorageProvider + MinIO
src/publicurl/   contrato PublicUrlProvider + MinIO/Cloudinary
src/worker/      loop, execução, recuperação, heartbeat
src/import/      leitura do sistema antigo
src/app/         dashboard (Next.js App Router)
```

O domínio não conhece SDK nenhum. Trocar MinIO por S3, ou acrescentar YouTube,
é implementar uma interface — nada em `domain/` ou `queue/` muda.

## Modelo de dados

```
Project ──┬── ChannelConfig        (credenciais cifradas, por projeto e canal)
          └── Publication ──┬── Media
                            └── PublicationEvent

WorkerInstance                     (heartbeat)
```

Uma publicação pertence a exatamente um projeto. Nada é compartilhado entre
projetos além da infraestrutura.

### Campos que existem por um motivo específico

| Campo | Por quê |
|---|---|
| `remoteContainerId`, `publishRequestedAt`, `captionFingerprint` | Permitem reconciliar um publish que respondeu erro mas foi processado. Ver [publishing.md](publishing.md). |
| `metadataSyncedAt` | Separa "publicou" de "tem permalink". Falha de metadados nunca reabre a publicação. |
| `lockedAt`, `lockedBy` | Lock do worker, com recuperação por timeout. |
| `attempts`, `nextAttemptAt`, `lastErrorKind` | Retry controlado, com backoff diferente para rate limit. |
| `sourcePath` (único) | Torna o import do sistema antigo idempotente. |

## Decisões

**PostgreSQL como fila, sem Redis.** `FOR UPDATE SKIP LOCKED` resolve
concorrência com a mesma transação que já grava o estado. Um broker separado
acrescentaria um segundo lugar onde a verdade pode divergir, para um volume de
poucas publicações por dia.

**Sem tabela de sessão.** Um operador, JWT assinado em cookie httpOnly.

**Storage e URL pública separados.** O MinIO é a fonte de verdade; a URL que a
plataforma consegue baixar é outra coisa. Ver [minio.md](minio.md).

**PUBLISHED é terminal.** Nenhuma transição sai dele. É a defesa estrutural
contra republicação — nem uma ação manual consegue devolver uma publicação
concluída para a fila.
