# Explicativo estilo Vox (colagem com narração)

Colagem em papel envelhecido sobre uma mesa: gravuras P&B recortadas como adesivo caem na mesa, o carimbo vermelho do ano bate, a legenda é datilografada em fita, a palavra-chave entra em letras recortadas de jornal ou escrita à mão com círculo vermelho, no tempo da narração. Câmera em chicote entre capítulos e, no fim, tudo vira uma página de jornal. DOM + SVG + GSAP (timeline pausada), 20–30 s.

**Serve para:** história de algo ("a história do implante dentário"), "como funciona" em 3 a 5 passos, linha do tempo de uma marca, conteúdo educativo de perfil. Foi **o melhor do teste**, depois de corrigido um bug de uma linha.

Fica nesta skill, e não numa separada, porque o motor, o QA, a exportação e a entrega são os mesmos dos outros formatos. O que ele tem a mais é o passo da narração, coberto por `scripts/narracao.cjs`.

**Para estudar a técnica:** `~/Projetos/VENDAS-IG/saidas/outros/teste-prompts-motion-2026-11-14/05-vox/index.html` (já com o bug corrigido; `index.tiro-unico.html` é a versão original com o bug; só referência de código, nunca base de peça publicada), com prints e `log.txt` em `_captura/`.

## Fluxo próprio

1. **Roteiro**: uma frase de abertura + uma frase por capítulo (3 a 5 capítulos), cada uma com até ~15 palavras. Datas e fatos conferidos em fonte confiável.
2. **Narração com tempos**: `node scripts/narracao.cjs frases.txt <pasta>/assets` gera `narracao.mp3` e `tempos.json` (início e fim de cada frase). A voz do `say` é rascunho; troque cada linha por um arquivo de locução real e rode de novo, que os tempos se refazem.
3. **Imagens**: fotos reais do cliente recortadas (PNG com fundo transparente; o HTML põe a borda branca de adesivo), gravuras de domínio público com a fonte anotada, ou gravura desenhada em SVG (o teste não recebeu imagens e desenhou zootrópio, máquina e computadores em SVG com hachura, e ficou bom).
4. **HTML**: a timeline lê `tempos.json` (embutido num `<script type="application/json">`). A palavra-chave entra quando é dita: ponha-a numa frase curta própria ou estime `t = ini + (fim − ini) × (caracteres antes dela ÷ caracteres da frase)`.
5. Duração = total da narração + ~1,5 s para o fecho.

## Campos obrigatórios

- Tema e título (vai no cabeçalho do jornal final)
- Capítulos: `[ANO ou ETAPA · frase]`, 3 a 5
- Palavra-chave de cada capítulo e como entra (recortada ou à mão)
- Narração (`assets/narracao.mp3` + `tempos.json`)
- Imagens por capítulo (caminhos) ou "desenhar em SVG: [o quê]"

## Prompt 16:9 (o do teste, generalizado)

```text
Crie em HTML (DOM + SVG + GSAP com timeline pausada posicionada por tl.time(t), 1920x1080, [DUR]s) um explicativo no estilo Vox sobre [TEMA]: colagem em papel envelhecido, gravuras P&B recortadas como adesivo ([IMAGENS]), carimbos vermelhos com as datas, legendas datilografadas em fita, letras recortadas de jornal, anotações à mão com círculo vermelho, câmera em chicote entre os capítulos e efeitos sonoros em Web Audio sob a narração assets/narracao.mp3 (decodificada com decodeAudioData no mesmo AudioContext; tempos de cada frase em assets/tempos.json). Siga o contrato da skill motion-graphics. Em objetos de dados use chaves distintas: path para o desenho SVG, t para o início, dur para a duração.

Capítulos: [[ANO_1] · [FRASE_1]] | [[ANO_2] · [FRASE_2]] | [[ANO_3] · [FRASE_3]] | [[ANO_4] · [FRASE_4]]

Cenas: cada capítulo num papel → a gravura cai na mesa → o carimbo do ano bate → a legenda é datilografada → a palavra-chave entra recortada ou escrita à mão, no tempo da fala → no fim a câmera se afasta e mostra tudo como uma página de jornal com [TITULO] e o carimbo "FIM".
```

## Prompt 9:16

```text
[mesmo prompt], em 1080x1920 para Reels: cada capítulo é uma folha vertical (gravura em cima, carimbo e legenda embaixo), o chicote de câmera é vertical (de uma folha para a de baixo), e o fecho mostra as folhas numa página de jornal vertical em grade 2x2. Nada importante nos 250px de cima, nos 420px de baixo nem nos 140px da direita.
```

## O que o teste mostrou

- **O bug**: `{type:'arrow', d:'M690,140 C680,170 660,185 640,196', t:3.0, d:0.25}`. A segunda chave `d` (duração) sobrescreveu o path, e `d.match(...)` quebrou o `init` com `d.match is not a function`. Nada animava. A correção foi renomear o path para `path`. Por isso o prompt pede chaves distintas, e o `capturar.cjs` acusa "nada se mexeu" com código 2.
- Desempenho: `feTurbulence` + `feDisplacementMap` (borda rasgada do papel), blur e `mix-blend-mode` derrubaram a prévia para 19 fps nos chicotes. No `?preview`, deixe a turbulência parada (semente fixa) ou desligada; a exportação mantém tudo.
- Pontos fortes: GSAP em timeline pausada no relógio do áudio, palavra-chave no tempo da fala, gravuras SVG convincentes e o fecho em página de jornal.
- O narrador do teste foi o `say -v Luciana` do macOS, frase a frase com 0,4 s de silêncio no começo e 0,5 s entre frases: é exatamente o que o `narracao.cjs` faz.

## Cuidados com cliente real

- Conteúdo de saúde ou jurídico: fato conferido, sem promessa de resultado, com os dados do conselho no fecho (`referencias/conformidade.md`).
- Gravura de terceiros só de domínio público, com a fonte anotada no `prompt.md`.
- Locução para publicar: real ou TTS com licença comercial.
