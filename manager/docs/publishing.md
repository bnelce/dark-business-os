# Idempotência — a regra de ouro

## O incidente que define este documento

Em 2026-09-05, publicando o carrossel de Reino Monera:

```
media_publish  →  "Application request limit reached"
script         →  leu como falha
automação      →  tentou de novo
resultado      →  o mesmo carrossel foi ao ar duas vezes
```

O erro era mentira. A Graph API respondeu erro numa chamada que ela processou.

## A regra

> Depois que houver evidência suficiente de que a plataforma aceitou o
> conteúdo, a publicação está concluída. Nenhuma falha posterior pode gerar
> nova publicação.

Isso significa separar duas coisas que antes eram uma só:

```
PUBLICAÇÃO                          SINCRONIZAÇÃO DE METADADOS
media_publish aceito         ≠      buscar permalink, contagens, etc.
→ status PUBLISHED                  → falhar aqui não muda nada
→ externalId gravado                → externalUrl fica nulo
                                    → metadataSyncedAt fica nulo
```

## As três defesas

### 1. Erro no publish não é veredito

Quando `media_publish` responde erro, o publisher **não conclui falha**. Ele
consulta a conta: apareceu mídia nova, depois do momento em que a publicação foi
pedida, com a mesma legenda? Se sim, aquele post é este — o sistema o adota
(`RECONCILED`) em vez de publicar outro.

A busca casa por legenda normalizada (espaço e caixa) e exige timestamp posterior
ao pedido, com 5 minutos de folga para diferença de relógio. Post antigo com a
mesma legenda **não** é adotado: republicar um tema é legítimo, e adotar o post
errado seria pior do que não reconciliar.

Se a própria consulta falhar, o erro original é preservado e vira retry normal.

### 2. O pedido é gravado antes de sair

`remoteContainerId`, `publishRequestedAt` e `captionFingerprint` são gravados
**antes** da chamada de publicação. Se o processo morrer exatamente ali, a
recuperação sabe que houve um pedido em voo e reconcilia em vez de republicar.

### 3. `PUBLISHED` é terminal

Nenhuma transição sai de `PUBLISHED` — nem worker, nem ação manual, nem retry.
Falha de permalink registra `METADATA_SYNC_FAILED` e para por aí.

## O que fica visível

Uma publicação que saiu sem permalink aparece no detalhe com um aviso
explicando que aquilo **não** é falha, e um botão "Sincronizar metadados" que
só toca em metadados.

## Testes

`tests/idempotency.test.ts` cobre, entre outros:

- publish responde rate limit **e** publicou → adota o post, um único `media_publish`
- publish responde rate limit e **não** publicou → erro sobe, vira retry
- permalink falha depois do publish → `PUBLISHED`, `externalUrl` nulo
- a reconciliação em si falha → erro original preservado
- post antigo com a mesma legenda não é adotado
- container é gravado antes do publish

E `tests/worker.integration.test.ts` cobre a recuperação de publicação presa
nos quatro desfechos possíveis.
