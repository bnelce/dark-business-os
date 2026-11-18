---
name: novo-canal
description: Adiciona um canal novo à rede de canais dark. Valida o nicho (demanda × concorrência, RPM, risco de política), propõe nomes e confere os handles, grava o canal no banco da rede pelo MCP dark-rede (perfil, identidade, palavras do Radar e 20 a 40 canais de referência) e gera o tema visual no Remotion. Use quando o usuário disser "novo canal", "adicionar canal", "criar canal de X", "trocar o canal Y por outro nicho", ou /novo-canal.
---

# /novo-canal

Cria um canal novo na rede, do nicho à estrutura de pastas. **Não cria contas
nem publica nada.** Contas de YouTube, Instagram e TikTok são criadas pelo
usuário.

## Passo 1: entender o pedido

Se o usuário já trouxe nicho e ângulo, seguir. Se não, perguntar uma coisa só:
"Qual assunto esse canal cobre e por que alguém assistiria 15 minutos sobre ele?"

**Pré-requisitos:** o MCP `dark-rede` respondendo (`rede_listar_canais`) e a
`YT_API_KEY` no `.env` da raiz. Sem a chave, os passos 2 e 5 não têm dados reais:
avisar e oferecer o `/instalar` antes de seguir.

Ler antes:
- `rede_listar_canais` (MCP), para não repetir nicho nem colidir com outro canal;
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

## Passo 4: gravar o canal no banco

Slug em kebab-case. Tudo vai para o banco, nada para o repo (o repo é só o motor):

- `canal_criar(slug, nome, nicho)` se o canal ainda não existe (os candidatos do
  roadmap já existem: usar `canal_obter`);
- `canal_atualizar` com:
  - `perfil`: ângulo (o que torna cada vídeo autêntico), público, idioma (inglês),
    voz TTS, cadência (piloto: 2 longos + 6 cortes por semana), motor visual base
    do `reels/`, produto low cost, riscos e regras do canal;
  - `identidade`: paleta (4 a 6 cores com hex), tipografia (Google Fonts), estilo
    de thumbnail, vinheta de 3s, lower-thirds;
  - `handle` escolhido e `fase` (`PILOTO` ou `CANDIDATO`).

## Passo 5: configurar o Radar do canal

É o que alimenta as pautas: sem canais de referência o Radar não acha outliers.

1. **Palavras de busca** (5 a 10, em inglês, por tema e não pelo nome do nicho:
   "why is rent so high", não "economics") e **categorias do YouTube**
   (`videoCategoryId`, ex.: 27 Education, 25 News & Politics, 22 People & Blogs).
   Gravar com `canal_atualizar(palavrasRadar, categoriasYoutube)`.
2. **Levantar de 20 a 40 canais de referência**: buscar pelas palavras na YouTube
   Data API (`scripts/validar-nicho.js --consultas "..."` e `search.list` de canais),
   e incluir os canais de origem dos outliers achados no passo 2. Para cada canal:
   inscritos, nº de vídeos, idade, mediana de views dos últimos 30 vídeos e o maior
   múltiplo (views ÷ mediana). Priorizar uma mistura: grandes (o teto do nicho) e
   **pequenos ou novos com outliers** (as brechas). Cuidar da cota: busca custa 100
   unidades; parar antes de 2.000 por canal configurado.
3. Mostrar a tabela ao usuário com uma linha de motivo por canal. **O usuário
   confirma** quais entram (pode cortar ou acrescentar).
4. Gravar os confirmados com `radar_adicionar_referencia(slug, youtubeId, nota)`.
   Se essa ferramenta ainda não existir no MCP (etapa 2 da spec em construção),
   deixar a lista confirmada no resumo do passo 8 para gravar depois, e avisar.

## Passo 6: 10 pautas iniciais

Do material dos passos 2 e 5, propor 10 pautas. Cada uma com tese, ângulo
próprio, 3 títulos candidatos, ideia de thumbnail, vídeo-outlier de referência
(link + views ÷ mediana do canal de origem) e fontes primárias prováveis.
Uma pauta sem outlier comprovado não entra (regra 3). Gravar com `pauta_criar`
(status `PROPOSTA`, aguardando o usuário) quando a ferramenta existir; até lá,
entregar a lista no resumo.

## Passo 7: tema visual

Adicionar um tema para o canal no arquivo de temas do `reels/`, lendo cores e
fontes da `identidade` do banco. Não criar componentes novos por canal: só o
tema muda. Os valores ficam no banco; o tema só os referencia pelo slug.

## Passo 8: fechar

Mostrar ao usuário:
- o que foi gravado (perfil, identidade, palavras, nº de canais de referência,
  pautas);
- o que **ele** precisa fazer: criar as contas com o handle escolhido (brand
  account própria no YouTube), copiar `canais/_modelo.env.example` para
  `canais/<slug>/.env` e rodar o OAuth do YouTube do canal
  (`scripts/youtube/autorizar.js`);
- a pauta mais forte para o vídeo-piloto.

Nunca commitar `.env` nem credenciais.
