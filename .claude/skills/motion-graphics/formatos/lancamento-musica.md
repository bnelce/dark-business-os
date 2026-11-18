# Lançamento de música (tudo na batida)

Piso de LED, clarão, player, show desenhado em código, a letra entrando palavra por palavra e um karaokê no fim, tudo travado numa grade de BPM. Canvas 2D, 18–20 s.

**Serve para:** artista ou banda lançando single, festa ou evento com música própria, marca com jingle ou slogan cantado, qualquer "frase na batida". No teste foi **o mais fraco** (5º de 5): rodou a 56 fps, mas com cenas vazias e invenções. Use este formato só com todos os campos preenchidos e cada cena descrita em detalhe.

**Para estudar a técnica:** `~/Projetos/VENDAS-IG/saidas/outros/teste-prompts-motion-2026-11-14/03-musica/index.html` (com o app inventado "PULSO"; só referência de código, nunca base de peça publicada), com prints e `log.txt` em `_captura/`.

## Campos obrigatórios

- Nome da música e do artista (reais)
- Plataforma: nome real, ou "player genérico sem marca" (nunca deixe em aberto: o teste inventou o app "PULSO")
- Capa real (assets/capa.jpg, quadrada, 3000x3000 ou 1080x1080)
- BPM real da faixa; se houver a faixa, ela entra com `--audio` no `gravar.cjs` e a página sincroniza pelo mesmo BPM
- 3 a 4 linhas da letra, com a palavra de destaque de cada linha marcada
- Onde ouvir (CTA) e data de lançamento

## Prompt 16:9 (o do teste, generalizado e com as cenas detalhadas)

```text
Crie em HTML (canvas, 1920x1080, 60fps, [20]s) o lançamento da música [MUSICA] de [ARTISTA]: [direção de arte, ex.: preto com neon rosa], tudo travado numa grade de [BPM] BPM (cortes e palavras na batida), molas com overshoot, motion blur pela velocidade de cada elemento e trilha [original sintetizada em Web Audio | da faixa assets/faixa.wav, só para sincronizar]. Nenhum nome de app ou marca além dos listados. Siga o contrato da skill motion-graphics.

Música: [MUSICA] | Artista: [ARTISTA] | Plataforma: [PLATAFORMA ou "player genérico sem marca"] | Capa: assets/capa.jpg | Letra: [LINHA_1] / [LINHA_2] / [LINHA_3] / [LINHA_4] | Destaques: [PALAVRA_1], [PALAVRA_2], [PALAVRA_3], [PALAVRA_4] | CTA: [ONDE_OUVIR] · [DATA]

Cenas: 0s piso de LED visto de cima, a câmera dá um chicote a cada batida → 2s clarão branco e o ícone de play surge no centro → 3,1s o player abre e PREENCHE a tela: capa à esquerda (assets/capa.jpg, 600px), à direita título, artista, barra de progresso andando e botão de pause → 4,6s show desenhado em código: palco, telão com o nome do artista em pixels, lasers e plateia em silhueta → 5,8s [LINHA_1] palavra por palavra, uma por batida, [PALAVRA_1] em destaque → 8,2s [LINHA_2] em P&B, a frase inteira em 2 linhas ocupando 90% da largura, cada palavra batendo e tremendo no grave → 11,3s [LINHA_3] dentro de um balão de fala que cresce para caber a frase inteira, com folga de 60px → 14,9s capa inteira centralizada, girando 8° e voltando, com "NOVO SINGLE" → 16,4s karaokê de [LINHA_4] (a cor preenche palavra por palavra na batida) e [CTA] embaixo.
```

## Prompt 9:16

```text
Crie em HTML (canvas, 1080x1920, 60fps na prévia, [18]s) o lançamento da música [MUSICA] para Reels: [mesma direção, grade e som]. Zonas seguras: nada importante nos 250px de cima, nos 420px de baixo nem nos 140px da direita.

[mesmos campos]

Cenas: 0s piso de LED com chicote por batida → 1,8s clarão e play → 2,8s player em tela cheia: capa em cima (800px, centrada, y 330–1130), título, artista e barra de progresso embaixo dela → 4,3s show em código (palco em perspectiva vertical) → 5,5s [LINHA_1] palavra por palavra, centrada, até 3 linhas → 8s [LINHA_2] em P&B, 2 a 3 linhas ocupando 90% da largura → 11s [LINHA_3] no balão que cresce até caber a frase → 14,2s capa centralizada com "NOVO SINGLE" → 15,6s karaokê de [LINHA_4] e [CTA] acima de y=1450.
```

## O que o teste mostrou

- A cena "player abre" saiu como um retângulo vazio com uma seta: o prompt não dizia o que o player mostra.
- "Quando o grave bate o chão vira gigante em P&B" virou um "O" sozinho ocupando a tela: "gigante" foi lido como uma letra enorme. Diga o tamanho em relação ao quadro e que a frase inteira aparece.
- O nome do app ("PULSO") foi inventado porque o prompt dizia só "app de streaming".
- A frase do balão vazou para fora dele ("Hoje ninguém" saiu sobreposto), e a capa ficou cortada na borda esquerda.
- Ponto forte: a grade de BPM (cortes e palavras na batida) e o canvas leve (56 fps).
- A tela de início foi desenhada no canvas, sem `<button>`: os scripts clicaram no centro. Use `<button id="start">`.

## Cuidados com cliente real

- Letra, capa e nome do artista com autorização. Trilha do teste foi sintetizada; faixa real só com licença (`--audio` no `gravar.cjs`).
- Logo e interface de Spotify, Deezer ou YouTube Music: não recrie. Se a plataforma for real, escreva o nome como texto ou use o selo oficial que o artista recebeu.
