# Import do sistema antigo

O sistema antigo guarda estado em arquivo:

```
marketing/conteudo/<disciplina>-<tema>-<data>/
├── conteudo.json          fonte editorial
├── carrossel.html         gerado
├── instagram/slide-NN.png mídia
├── legenda.md             legenda
├── pendente.md            aprovado, aguardando publicação
└── publicado.md           já foi ao ar (data + link)
```

## Regras do import

- **Nada é apagado, movido ou renomeado na origem.** Só leitura.
- **Idempotente:** `sourcePath` é único. Rodar de novo não duplica.
- **Não sobrescreve:** publicação já importada fica como está, inclusive se você
  editou depois.
- **Nada entra agendado.** Aprovado sim, agendado não.
- **Parcial é desfeito:** se o upload de mídia falhar no meio, a publicação
  criada é removida, para não sobrar publicação aprovada sem todas as mídias.

## Como o estado é lido

| Na origem | Vira |
|---|---|
| `publicado.md` presente | `PUBLISHED`, com data e link |
| só `pendente.md` | `APPROVED`, **sem** agendamento |
| nenhum dos dois | `DRAFT` |
| pasta sem imagem | ignorada |

`pendente.md` registra "Aprovado (texto e formato): sim" — é evidência de
aprovação, e por isso vira `APPROVED`. Agendar continua sendo ato explícito seu.

## Uso

```bash
npm run import                       # dry-run, só relata
npm run import -- --commit           # aplica
npm run import -- --projeto=<slug>   # outro projeto de destino
npm run import -- --raiz=<caminho>   # outra origem
```

O dry-run mostra avisos por pasta: legenda faltando, arquivo acima do limite,
data ilegível, `publicado.md` com mais de um link.

## Resultado da primeira execução (2026-09-05)

```
69 pastas · 414 mídias · 90 MB
APPROVED   55
PUBLISHED  14
```

Um aviso: `biologia-reino-monera-2026-09-04` tem dois links no `publicado.md`
(o post duplicado do incidente). O import usa o primeiro
(`Dc5dyQyG5jN`), que é o que está no ar — confirmado consultando a conta.

## Ainda não coberto

- **Reels.** `marketing/reels/` ainda não existe. O formato de `publicado.md`
  de lá é diferente e vai precisar de leitor próprio.
- **Re-sincronizar legendas.** O import copia `legenda.md` pro banco. Se o lado
  editorial reescrever as legendas, o banco fica velho — hoje a correção é
  manual, no dashboard.
