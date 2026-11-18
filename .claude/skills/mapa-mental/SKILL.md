---
name: mapa-mental
description: >
  Gera reels de mapa mental com estética de caderno — papel, letra manuscrita, setas de
  tinta e adesivos coloridos — renderizados em vídeo 1080x1920 pelo Remotion. Dois
  formatos: comparativo (várias figuras/correntes respondendo à mesma pergunta) e radial
  (um conceito central com ramos). Use quando o usuário pedir "mapa mental de [tema]",
  "compara [A], [B] e [C]", "reel de mapa mental", "mapa mental em vídeo", ou /mapa-mental.
---

# /mapa-mental — Reel de mapa mental em estética de caderno

Formato de reel que resolve o problema de ritmo dos formatos de cartela: em vez de telas
que se substituem, **uma página que vai sendo preenchida**. Retrato entra, adesivo cola,
seta desenha, frase se escreve. Não existe trecho de tela parada, que é onde o reel morre.

Mapa mental também é um dos produtos vendidos (`_memoria/empresa.md`) — o reel é amostra
grátis do que o material pago entrega.

## Dependências

- **Projeto Remotion:** `reels/` (compartilhado entre negócios, fica na raiz)
- **Componentes:** `reels/src/remocn/` — ver `PROVENIENCIA.md` ali, inclusive os consertos
  que fizemos e que não devem ser revertidos
- **Formatos:** `reels/src/formatos/MapaComparativo.tsx` e `MapaMental.tsx`
- **Registro das composições:** `reels/src/Root.tsx`
- **Fotos:** `reels/public/fotos/` — creditar em `identidade/fotos/creditos.md` do negócio
- **Tom de voz:** `_memoria/preferencias.md` do negócio

---

## Escolher o formato

**Comparativo** (`MapaComparativo`) — quando existem 2 a 4 figuras, correntes ou modelos
que respondem à **mesma pergunta** de jeitos diferentes. É o formato mais forte, porque é
esse o recorte que cai em prova: não "o que fulano disse", e sim "qual dos três explicaria
esse fenômeno assim".

Serve pra: os 3 pilares da Sociologia · Iluminismo × Absolutismo · modelos atômicos ·
tipos de ligação química · escolas literárias · correntes econômicas.

**Radial** (`MapaMental`) — um conceito central com 3 a 4 ramos que o decompõem. Use quando
não há comparação, e sim um tema que se abre.

Serve pra: fundamentos de um autor · partes da célula · tipos de relevo · leis de Newton.

---

## Fluxo

1. **Escolher o eixo.** Antes de escrever qualquer conteúdo, definir a pergunta única que
   as figuras respondem diferente. Sem eixo, o mapa vira lista e não ensina a comparar.
2. **Escrever o conteúdo** — ver estrutura de dados abaixo.
3. **CHECKPOINT:** mostrar o texto (pergunta, conceitos, frases, eixos) e esperar aprovação.
4. **Buscar retratos**, se o tema pedir — ver "Imagens" abaixo.
5. **Editar as props** em `reels/src/Root.tsx` e rodar `npx tsc --noEmit` dentro de `reels/`.
6. **Renderizar:**
   ```bash
   cd reels && npx remotion render MapaComparativo <saída>.mp4
   ```
7. **Conferir antes de mostrar.** Gerar folha de contato e olhar:
   ```bash
   ffmpeg -i <saída>.mp4 -vf "fps=1.2,scale=220:-1,tile=4x5" -frames:v 1 folha.png
   ```
   Procurar: adesivo cortado na borda, sobreposição no rodapé, texto estourando a coluna.
8. **CHECKPOINT:** mandar o MP4 pro usuário. **Nunca publicar sem "pode publicar" explícito.**

---

## Estrutura de dados

Todo o conteúdo vive num array — trocar de tema é trocar o array e as fotos.

```ts
// MapaComparativo
{
  materia: "Sociologia",
  pergunta: "o que move a sociedade?",   // manuscrita, no topo
  figuras: [
    {
      nome: "Durkheim", datas: "1858 — 1917", foto: "fotos/emile-durkheim.jpg",
      conceito: "FATO SOCIAL",            // adesivo colorido
      eixo: "o todo",                     // marcador do fechamento
      cor: "#4facfe",                     // paleta da marca
      frase: "a sociedade existe antes de você\ne te molda por coerção",
      y: 560, at: 46,
    },
  ],
  totalFrames: 570,
}
```

**Espaçamento que funciona (1080x1920):** figuras em `y` 560 / 890 / 1220, com `at` 46 /
166 / 286 — cerca de 4 segundos por figura. Fechamento entra em `at` da última + 105.

---

## As sete regras do padrão visual

Enunciado canônico, com o motivo de cada uma e o que quebra sem ela:
**`templates/formatos-video/PADRAO-MAPA-MENTAL.md`** — ler antes de alterar qualquer coisa
visual. Esqueletos de roteiro pra preencher estão na mesma pasta.

Resumo:

1. **Substrato de papel** — creme `#FBF7EC`, grade de caderno, deriva lenta e tremor por
   pose. Nunca fundo chapado.
2. **Duas tipografias com papéis distintos** — Poppins pesada para estrutura (títulos,
   nomes, adesivos); Caveat manuscrita para o raciocínio (as frases). É isso que separa
   "slide" de "caderno de alguém".
3. **Cor só nos adesivos** — a paleta da marca aparece nos conceitos-chave, nunca no fundo
   nem no texto corrido. A cor de cada figura se repete no marcador de eixo, criando o vínculo.
4. **Construção progressiva** — nada aparece pronto. Sem isso o formato perde a razão de existir.
5. **Física de papel** — tremor, inclinação, passo de stop-motion em tudo. É o que impede
   de parecer template.
6. **Fechamento que nomeia o eixo** — marca-texto na palavra que importa, mais os
   marcadores coloridos amarrando as figuras.
7. **Rodapé fixo** — adesivo de CTA acima, `@revisaorapida1ano` discreto embaixo.

---

## Imagens

Retratos históricos: **Wikimedia Commons**, filtrando por domínio público. Autor morto há
mais de 70 anos costuma resolver.

```bash
UA="RevisaoRapida-EducationalContent/1.0 (email)"
curl -sS -H "User-Agent: $UA" \
  "https://commons.wikimedia.org/w/api.php?action=query&titles=File:<Arquivo>&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=960&format=json"
```

Conferir `LicenseShortName` antes de baixar. Salvar em `reels/public/fotos/` e **sempre**
registrar em `identidade/fotos/creditos.md` do negócio.

Foto escura come o fundo. Medir antes de compensar no olho:
```bash
ffmpeg -i foto.jpg -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null -
```
Abaixo de ~90 pede ganho de brilho no componente.

---

## Regras

- O eixo vem antes do conteúdo. Mapa sem eixo é lista.
- Frases manuscritas curtas — duas linhas, quebradas com `\n`. Três linhas estouram a coluna.
- Conceito no adesivo em CAIXA ALTA e curto; `whiteSpace: nowrap` corta o que passar.
- Cores sempre da paleta da marca (`identidade/design-guide.md`), uma por figura.
- CTA de crescimento enquanto não houver produto na Hotmart (ver `_memoria/estrategia.md`).
- Conferir o render na folha de contato **antes** de mandar pro usuário.
- Sem áudio ainda: os tempos (`at`) são escolhidos à mão. Quando a narração TTS entrar,
  eles passam a vir da duração real de cada fala, como em `scripts/reels/timeline.js`.
