# Publication Manager

Infraestrutura pessoal de publicação de conteúdo. Um operador, vários projetos
(marcas), vários canais, uma fila só.

Não é SaaS: não existe cadastro, plano, cobrança, equipe nem multi-tenancy.
Existe um usuário administrativo — você — e projetos são só a forma de
organizar operações diferentes suas.

```
VOCÊ → Publication Manager → Projeto → Publicação → Fila → Worker → Canal
```

## Subir o ambiente

```bash
cd manager
cp .env.example .env          # preencha ADMIN_*, AUTH_SECRET, ENCRYPTION_KEY
docker compose up -d postgres minio
docker compose up minio-init  # cria o bucket
npm install
npm run db:migrate            # cria as tabelas
npm run db:seed               # cria os projetos
npm run import                # dry-run: relata o que viria do sistema antigo
npm run import -- --commit    # aplica
```

Dois processos:

```bash
npm run dev      # dashboard em http://localhost:3100
npm run worker   # executor da fila
```

O worker **não** é opcional: sem ele nada publica, mesmo com publicação agendada.
O painel avisa quando há publicação vencida e worker offline.

## Segurança do padrão

`PUBLISHING_DRY_RUN=true` vem ligado no `.env.example`. Com ele, o pipeline
inteiro roda e nada é publicado de verdade. Desligue só quando for para
produção — e leia `docs/operations.md` antes, porque o sistema antigo
(`scripts/publicar-proximo-pendente.js` via launchd) ainda existe e não pode
rodar junto com o worker.

## Testes

```bash
npm run db:test:setup   # cria o banco de teste (uma vez)
npm test
```

Testes de integração rodam contra Postgres e MinIO reais, num banco separado
(`publication_manager_test`). Se apontarem pro banco de desenvolvimento, falham
de propósito.

## Documentação

| Documento | Assunto |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Modelo de dados, camadas, decisões |
| [docs/projects.md](docs/projects.md) | Projetos, canais e credenciais |
| [docs/queue.md](docs/queue.md) | Máquina de estados, fila, lock, retry |
| [docs/publishing.md](docs/publishing.md) | Idempotência e a regra de ouro |
| [docs/instagram.md](docs/instagram.md) | Integração com a Graph API |
| [docs/minio.md](docs/minio.md) | Storage e URL pública das mídias |
| [docs/migration.md](docs/migration.md) | Import do sistema antigo |
| [docs/operations.md](docs/operations.md) | Operação diária e diagnóstico |
