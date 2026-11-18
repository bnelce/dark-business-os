# Projetos e canais

Um projeto é uma operação sua: uma marca, um perfil, um negócio.

```
Revisão Rápida       → Instagram → conta A
Abner Oliveira Dev   → (sem canal configurado ainda)
Projeto futuro       → Instagram → conta B
                     → YouTube   → canal próprio
```

Projetos **não** são tenants. Não há isolamento de segurança entre eles, não há
usuário por projeto, não há cobrança. É organização: uma publicação pertence a
exatamente um projeto, e o dashboard filtra por projeto ou consolida em "Todos".

## Criar um projeto

Hoje, por `prisma/seed.ts` ou direto no banco. O seed é idempotente: rodar de
novo não duplica e não sobrescreve credencial já configurada.

## Canais e credenciais

`ChannelConfig` guarda a credencial do par (projeto, canal), **cifrada em
AES-256-GCM** com `ENCRYPTION_KEY`. Não se assume que todas as marcas publicam
na mesma conta.

Ordem de resolução na hora de publicar:

1. `ChannelConfig` do projeto para aquele canal;
2. se não existir, as variáveis `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_ACCOUNT_ID`
   (compatibilidade com o sistema antigo);
3. se nada, erro **permanente** com instrução — não fica retentando.

Projeto sem canal é estado válido e testado: "Abner Oliveira Dev" existe assim
até a conta existir. O dashboard mostra "nenhum canal configurado".

## Trocar `ENCRYPTION_KEY`

Invalida todas as credenciais cifradas. O sistema detecta e dá erro permanente
("não foi possível decifrar"), sem retentar. Reconfigure os canais.
