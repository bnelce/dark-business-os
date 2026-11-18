---
name: novo-canal
description: Adiciona um canal novo à rede de canais dark. Valida o nicho (demanda × concorrência, RPM, risco de política), propõe nomes e confere os handles, cria canais/<slug>/ com canal.md, identidade.md e pautas.md, gera o tema visual no Remotion e registra o canal em canais/_rede.md. Use quando o usuário disser "novo canal", "adicionar canal", "criar canal de X", "trocar o canal Y por outro nicho", ou /novo-canal.
---

# /novo-canal

Cria um canal novo na rede, do nicho à estrutura de pastas. **Não cria contas
nem publica nada.** Contas de YouTube, Instagram e TikTok são criadas pelo
usuário.

## Passo 1: entender o pedido

Se o usuário já trouxe nicho e ângulo, seguir. Se não, perguntar uma coisa só:
"Qual assunto esse canal cobre e por que alguém assistiria 15 minutos sobre ele?"

Ler antes:
- `canais/_rede.md`, para não repetir nicho nem colidir com outro canal;
- `docs/pesquisa/roadmap-rede-canais-dark.md` (seções 2 e 3);
- `docs/pesquisa/reports/` (RPM e risco por nicho).

## Passo 2: validar o nicho

Pesquisar na web e no YouTube e entregar um quadro curto:

| Critério | O que medir |
|---|---|
| Demanda | Vídeos do nicho com muitas views publicados nos últimos 90 dias |
| Concorrência | Quantos canais ativos; se há canais pequenos com outliers (3x ou mais a média) |
| RPM | Faixa estimada para público dos EUA (citar a fonte, avisar que é estimativa) |
| Formato longo | Dá para fazer 10 a 20 min com tese própria toda semana? Listar 10 pautas de exemplo |
| Cortes | Os vídeos rendem shorts com gancho próprio? |
| Política | Risco de "conteúdo inautêntico", desinformação, saúde, finanças ou violência |
| Produto | Um produto low cost (US$ 5 a 29) que nasce do material do canal |

Usar `scripts/validar-nicho.js --consultas "q1,q2"` (mede a concorrência pela
YouTube Data API; precisa de `YT_API_KEY`) quando houver credencial.

**Recomendação:** dizer se vale ou não seguir. Se o nicho for fraco, dizer e
sugerir um da lista de reserva do roadmap.

## Passo 3: nome e handle

Propor de 3 a 5 nomes em inglês: curtos, pronunciáveis, sem marca registrada
óbvia, sem a palavra "official".

Para cada nome, conferir se está livre:
- YouTube: buscar `@handle`;
- Instagram e TikTok: buscar o perfil;
- domínio `.com`.

Mostrar a tabela e o usuário escolhe.

## Passo 4: criar a estrutura

Slug em kebab-case. Criar:

```
canais/<slug>/
  canal.md
  identidade.md
  pautas.md
  videos/.gitkeep
```

**canal.md:** nicho, ângulo (o que torna cada vídeo autêntico), público,
idioma (inglês), voz TTS escolhida, cadência (piloto: 2 longos + 6 cortes por
semana), estilo de vídeo base (qual motor do `reels/`), produto low cost, fase,
riscos e regras específicas do canal.

**identidade.md:** paleta (4 a 6 cores com hex), tipografia (Google Fonts),
estilo de thumbnail, vinheta de 3s, lower-thirds.

**pautas.md:** 10 pautas iniciais. Cada uma com título candidato, ideia da
thumbnail, vídeo-outlier de referência (link + views ÷ média do canal) e
fontes primárias prováveis.

## Passo 5: tema visual

Adicionar um tema para o canal em `reels/src/tokens.ts` (ou no arquivo de
temas que existir), com as cores e fontes de `identidade.md`. Não criar
componentes novos por canal: só o tema muda.

## Passo 6: registrar na rede

Adicionar uma linha em `canais/_rede.md`:
`| <nome> | <slug> | <nicho> | <fase> | <data de criação> |`

## Passo 7: fechar

Mostrar ao usuário:
- o que foi criado;
- o que **ele** precisa fazer: criar as contas com o handle escolhido, rodar o
  OAuth do YouTube do canal (`scripts/youtube/autorizar.js`) e guardar as
  credenciais em `canais/<slug>/.env`;
- a primeira pauta sugerida para o vídeo-piloto.

Nunca commitar `.env` nem credenciais.
