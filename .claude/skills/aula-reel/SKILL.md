---
name: aula-reel
description: >
  Cria reels-aula de 60 a 90 segundos com várias cenas: cada tema é construído, apagado
  por uma varredura, e o próximo se desenha por cima. Estética de caderno com blocos de
  sombra dura, retratos, letra manuscrita e setas grossas. Use quando o tema for grande
  demais pra uma tela só — "aula sobre X", "explica X completo", "os N tipos de X",
  "compara A, B e C a fundo", ou /aula-reel.
---

# /aula-reel — Aula em várias cenas

Formato longo, pra tema que não cabe numa tela. Diferente do `/mapa-mental`, que é uma
página única sendo preenchida, aqui **cada cena tem vida própria**: é construída, apagada
por uma varredura de baixo pra cima, e a próxima se desenha.

Implementação: `reels/src/aula/cena.tsx` (framework) e `MarxAula.tsx` / `PilaresAula.tsx`
(exemplos). Padrão visual: `templates/formatos-video/PADRAO-MAPA-MENTAL.md`.

## Limite duro

**90 segundos** é o teto pra entrar na aba Reels do Instagram. Mirar 80-86s. Se o conteúdo
não couber, cortar uma cena — nunca acelerar todas até ficarem ilegíveis.

---

## A armadilha que já custou caro

`Cena` **precisa** ser um `<Sequence>` do Remotion. Se for só renderização condicional, o
`useCurrentFrame()` dos filhos devolve o frame **global**, e como cada cena agenda seus
elementos em frames pequenos (`at={60}`, `at={190}`), da segunda cena em diante tudo
aparece pronto no primeiro frame. O vídeo fica com movimento só na cena 1.

Isso já aconteceu e foi corrigido. Não reverter. É a mesma família de erro da quebra de
linha comida por `inline-block` no `handwrite` e no `TituloCena`: **contexto que não estava
isolado onde se supunha que estava.** Ao criar componente novo, checar sempre os dois:
o relógio é local? o `\n` sobrevive?

---

## Estrutura que funciona

**Abertura** (~14s) — a pergunta única, e os itens aparecendo com sua resposta curta.
**Mergulhos** (~18s cada) — um por item: retrato grande, nome, 3 conceitos com etiqueta
colorida e legenda manuscrita, fechando com a dica do que cai em prova.
**Comparativo** (~17s) — a tabela lado a lado. É a cena que faz o reel valer o salvamento.

Três mergulhos + abertura + comparativo dá 5 cenas e ~86s. Quatro mergulhos não cabem.

Pra tema sem comparação (um autor, um processo), trocar os mergulhos por etapas e o
comparativo por uma recapitulação.

---

## Vocabulário visual

De `reels/src/aula/cena.tsx`:

| Peça | Pra quê |
|---|---|
| `Cena` | Sequência com saída por apagamento |
| `Bloco` | Caixa colorida com borda preta e sombra dura — conceitos e termos |
| `Balao` | Balão de anotação, fundo claro — explicações |
| `TituloCena` | Display pesado com sombra deslocada, letra a letra |
| `SetaGrossa` | Seta preta curva que se desenha |
| `Fundo` | Papel com grade e tremor de pose |

Retratos, etiquetas de papel e letra manuscrita vêm de `reels/src/remocn/`.

---

## Fluxo

1. **Definir o eixo** — a pergunta única que atravessa as cenas. Sem eixo, viram capítulos
   soltos.
2. **Dividir em cenas** e escrever o conteúdo de cada uma.
3. **CHECKPOINT:** mostrar o texto de todas as cenas e esperar aprovação.
4. **Buscar retratos** em domínio público, se o tema pedir (Wikimedia — ver `/mapa-mental`).
5. Escrever a composição em `reels/src/aula/`, registrar em `Root.tsx`, `npx tsc --noEmit`.
6. **Renderizar:** `cd reels && npx remotion render <Composicao> <saída>.mp4`
7. **Conferir DENTRO de cada cena**, não só o vídeo inteiro:
   ```bash
   ffmpeg -i saida.mp4 -vf "select='eq(n\,975)+eq(n\,1120)+eq(n\,1360)',scale=200:-1,tile=3x1" -frames:v 1 check.png
   ```
   Amostrar frames de uma cena do meio e confirmar que os elementos **entram em
   sequência**. Se aparecerem todos juntos, o `<Sequence>` quebrou.
8. **CHECKPOINT:** mandar o MP4. **Nunca publicar sem "pode publicar" explícito.**

---

## Regras

- Máximo 90s; mirar 86s.
- Cada cena precisa de construção progressiva própria — verificar amostrando dentro dela.
- Texto de bloco curto: o `nowrap` das etiquetas corta sem avisar.
- Em tabela comparativa de 3 colunas, contar com ~290px por coluna e deixar o texto
  quebrar linha em vez de transbordar.
- Cores sempre da paleta do negócio (`identidade/design-guide.md`).
- CTA de crescimento enquanto não houver produto na Hotmart.
- Conteúdo de referência de terceiros (transcrição, PDF, mapa de concorrente) serve pra
  analisar ESTRUTURA. Não vira fonte de texto, não é reproduzido, e não entra no
  repositório — que tem remoto público.
