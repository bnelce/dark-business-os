---
name: reel
description: >
  Cria e publica reels educativos no Instagram (reel normal; trial só se pedido) — roteiro, narração TTS,
  render em vídeo via Remotion e publicação via Meta Graph API. Formato atual: quiz relâmpago.
  Use quando o usuário pedir "reel de [disciplina]", "reel sobre [tema]", "cria um reel",
  ou /reel.
---

# /reel — Reel educativo

## Dependências

- `_memoria/preferencias.md` — tom de voz
- `_memoria/estrategia.md` — se o CTA pode ser de venda (hoje: não, só crescimento)
- `_memoria/empresa.md` — cronograma por disciplina
- `identidade/design-guide.md` — cores, espelhadas em `reels/src/tokens.ts`
- Spec: `docs/superpowers/specs/2026-09-04-reels-trial-design.md`

## Fluxo

1. **Roteiro.** Escrever os beats do formato pedido e salvar em
   `marketing/reels/<formato>-<tema>-<AAAA-MM-DD>/roteiro.json`.
   `textoTela` é curto e quebrado em linha; `narracao` é frase inteira. Nunca iguais.
   Sem preço e sem link enquanto não houver produto na Hotmart.
   Antes de mostrar, passar o roteiro pelo checklist de viralização abaixo (itens 1–9).
2. **CHECKPOINT:** mostrar o texto dos beats e esperar aprovação.
3. **Narrar:** `node --env-file=.env scripts/reels/narrar.js <pasta>`
   Se o total sair fora de 15-25s, reescrever a narração e repetir.
4. **Renderizar:** `node scripts/reels/render.js <pasta>`
   O script recusa MP4 fora de 1080x1920/30fps/h264/com áudio.
5. **CHECKPOINT:** mandar o `reel.mp4` e a legenda pro usuário. **Nunca publicar sem
   um "pode publicar" explícito.**
6. **Publicar:** `node --env-file=.env scripts/reels/publicar.js <pasta>` (reel normal).
   Trial reel só se o usuário pedir: acrescentar `--trial`.
7. **Colher, 3 dias depois:** `node --env-file=.env scripts/reels/colher.js <pasta-de-reels>`
   — trial: verifica se graduou; reel normal: só registra as métricas.

## Livro do reel

Vale para negócio que tem `marketing/livros-dos-reels.md` (hoje, o Ciência Visual). A lista
guarda o livro de cada reel e o link de afiliado da Amazon.

1. **Achar o livro.** Primeiro ver se algum livro da lista casa com o tema. Se nenhum casar,
   sugerir um livro novo que:
   - tenha edição em português **à venda na amazon.com.br**, conferida na busca, nunca de memória.
     Não inventar título: se não achar, o reel sai sem livro;
   - siga a régua do item 6: nada de título partidário. Em tema político, só livro que trate os
     dois lados (ex.: Jairo Nicolau);
   - ou seja nenhum: um livro forçado é pior que nenhum.
2. **Link.** Livro que já está na lista usa o link curto de lá. Para livro novo, pedir ao
   usuário o link curto de afiliado (`link.amazon/...`, gerado na barra SiteStripe da Amazon).
   Abrir o link com `curl -sL -o /dev/null -w "%{url_effective}"` e conferir que leva ao livro
   certo e que traz `tag=`.
3. **Página da bio.** Acrescentar o livro na seção "Livros dos reels" de
   `bio/public/bio/index.html`: título, autor e uma linha "No reel sobre X", com
   `rel="sponsored noopener"`. O rodapé precisa manter "Como associado da Amazon, recebemos por
   compras qualificadas." Publicar com `npx wrangler deploy` dentro de `negocios/<slug>/bio/`,
   depois do "pode publicar".
4. **Legenda.** No máximo uma linha, antes da fonte: "O livro por trás deste reel está na
   página do perfil." Nunca "link na bio", que o validador barra.
5. **Story.** No dia do reel, um story com a capa do reel, o título do livro e a figurinha de
   link apontando pro link curto. O usuário posta pelo app, porque a API não põe figurinha de
   link. Mandar o texto pronto.
6. **Registrar** o livro e o link em `livros-dos-reels.md`.

## Formatos

Hoje só `quiz-relampago` tem composição no Remotion. Os outros três do spec
(`erro-comum`, `tema-em-15s`, `voce-sabia`) precisam de um componente novo em
`reels/src/formatos/` e de uma entrada em `COMPOSICAO_POR_FORMATO` e
`BASE_POR_FORMATO` no `render.js` antes de serem usáveis.

## Checklist de viralização

Vale pra todo reel. A pesquisa com as fontes de cada item está em
`marketing/viralizacao.md` (seção 8); a nossa tabela de métricas, na seção 7.

**Antes de produzir (roteiro)**
1. O tema parte de algo que a pessoa já viu ou já se perguntou.
2. O reel cabe numa frase com um número ou um paradoxo, e essa frase é o gancho.
3. Tem um objeto visual que se mexe e muda (curva, corrida, ranking, mapa).
4. Dá pra dizer pra quem a pessoa mandaria. Envio por alcance é o sinal que mais pesa pra não seguidor.
5. Espanto, surpresa ou utilidade, nunca raiva contra um grupo.
6. Se for político: os dois lados na mesma régua, na mesma cor e com o mesmo tipo de número.
7. A pergunta do vídeo é sobre mecanismo, não sobre quem tem razão. Nada de recorte regional que puxe xenofobia.
8. Todo número conferido na fonte oficial.
9. Print ou vídeo de terceiro só com análise própria por cima.

**Produção (antes do checkpoint do MP4)**
10. Quadro 0 com movimento, o número grande e o assunto escrito.
11. A fala começa no quadro 0, sem logo e sem cenário vazio.
12. Legenda queimada, sincronizada com a fala, no terço de baixo (y≈1170–1550, longe dos botões da direita).
13. A tela muda a cada 2 a 5 s.
14. Todo número abstrato traduzido em algo conhecido.
15. Uma pergunta abre a segunda metade.
16. A promessa do gancho é paga antes do fim.
17. O final emenda com o começo: sem créditos, sem "segue" falado, CTA escrito pequeno só no último 1,5 s.
18. Até 90 s.
19. Mix em −14 LUFS, voz clara, trilha baixa.

**Publicação**
20. A primeira linha da legenda é o gancho, com as palavras que alguém buscaria.
21. Até 5 hashtags específicas e a fonte dos dados no fim.
22. Comentário fixado com o método ou a resposta à dúvida previsível. Nunca "comenta X" ou "marca um amigo".
23. Capa legível na grade, com 2 a 5 palavras.
24. Se é sequência, ligar como série e anunciar no final.
25. Livro do reel resolvido: na lista, na página da bio e com o story pronto, ou decidido que não tem (ver "Livro do reel").

**Depois**
26. Em 24 a 48 h: pulos, segundos médios, compartilhamentos por mil views e o ponto de queda no
    gráfico de retenção. Se o tema foi político, conferir o Status da conta.

## Regras

- Gancho nos 2 primeiros segundos. Sem vinheta, sem logo na abertura.
- A marca só no fim, escrita e pequena (item 17).
- CTA de crescimento enquanto não houver produto na Hotmart: pergunta aberta ou "segue" escrito, nunca isca de engajamento (item 22).
- Nunca publicar sem aprovação explícita do MP4.
- Um reel por dia, seg a sex, seguindo a disciplina do cronograma.
- Publicação padrão é **reel normal** (grade do perfil + seguidores). Trial reel
  (`trial_params`, só não-seguidores) esconde o post da base de seguidores, então só
  com `--trial` explícito. Se a conta não for elegível pro trial (erro 2207081), o
  script cai pra reel normal sozinho.
