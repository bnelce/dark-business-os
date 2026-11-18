---
name: motion-graphics
description: Cria vídeos de motion graphics em HTML (Three.js, Canvas ou DOM, trilha em Web Audio) e exporta para MP4 quadro a quadro em 9:16, 16:9 ou 4:5, com QA de prints e fps. Formatos testados: família de mapas para negócio local (reel de como chegar, área de entrega, mapa de bairros, onde estamos, nossas unidades, rastreio de pedido animado, atendimento em domicílio, evento, mudamos de endereço, do estacionamento à sala, percurso de corrida/mapa do percurso), lançamento de loja online, lançamento de música, comercial do produto e explicativo estilo Vox com narração. Use quando pedirem motion graphics, vídeo animado em HTML, anúncio animado, reel de mapa, comercial do produto, explicativo estilo Vox ou exportar animação HTML para MP4, para perfil próprio ou cliente (dentista, farmácia, loja, evento). Não use para os reels educativos em Remotion do VENDAS-IG (/reel, /aula-reel, /mapa-mental), que têm roteiro, TTS e publicação próprios; no repositório motion-studio, use o /motion-reel de lá.
---

# Motion graphics em HTML → MP4

Cada peça é **uma página HTML** (Three.js, Canvas 2D ou DOM) com trilha sintetizada em Web Audio. Ela roda ao vivo no navegador para a prévia e é exportada para MP4 **quadro a quadro**, com relógio virtual, então a qualidade final não depende da máquina.

Os formatos vieram de um teste em 2026-11-14 com 5 prompts de um post de Instagram, gerados de uma vez por agentes sem contexto: 4 de 5 rodaram de primeira, e o ranking foi Vox (depois de corrigido) > mapa ≈ e-commerce > cartão > música. Material do teste: `~/Projetos/VENDAS-IG/saidas/outros/teste-prompts-motion-2026-11-14/`.

## Quando não usar

- **Reels educativos do VENDAS-IG** (`/reel`, `/aula-reel`, `/mapa-mental`): rodam em Remotion, com roteiro, narração TTS e publicação próprios. Esta skill não substitui nenhum deles.
- **Repositório motion-studio** (`EDICAO-VIDEOS/motion-studio`): tem motor próprio (`/motion-reel`, `/motion-historia`). Lá, use o de lá.
- Post ou carrossel estático: `/carrossel`.

## Formatos

| Formato | Ficha | Serve para | Base | fps ao vivo no teste (M4) |
|---|---|---|---|---|
| **Família de mapas** (prioridade) | `formatos/mapa/_motor.md` + uma ficha por variante | negócio local: clínica, loja, delivery, rede, evento | Three.js | 18 no teste; 60 com `?preview` na referência |
| Lançamento de loja online | `formatos/lancamento-ecommerce.md` | e-commerce, app, site novo | Canvas 2D | 48 |
| Lançamento de música | `formatos/lancamento-musica.md` | artista, festa, frase na batida | Canvas 2D | 56 |
| Comercial de produto | `formatos/comercial-produto.md` | produto-herói com benefícios | Three.js | 25 |
| Explicativo estilo Vox | `formatos/explicativo-vox.md` | história, "como funciona", educativo | DOM + SVG + GSAP | 19 |

Variantes do mapa, em `formatos/mapa/`: `como-chegar`, `area-de-entrega`, `estamos-perto`, `unidades`, `rastreio-do-pedido`, `atendimento-em-domicilio`, `evento`, `mudamos-de-endereco`, `do-estacionamento-a-sala`, `percurso-de-corrida`. Leia sempre o `_motor.md` junto com a ficha da variante.

Pedido que não cabe em nenhum formato: use o esqueleto de prompt abaixo, o contrato e `assets/base.html` do mesmo jeito.

## Fluxo

1. **Briefing.** Descubra de quem é a peça. Em workspace multi-negócio, siga o CLAUDE.md do projeto (ler `_memoria/` e `identidade/design-guide.md` do negócio ou do cliente). Pergunte só o que faltar: objetivo, formato, proporção (padrão 1080x1920), duração (15–25 s para Reels), CTA, assets reais (logo em SVG, fotos, cores, fontes), dados obrigatórios do conselho, trilha ou narração.
2. **Escolha o formato** e leia a ficha. Cada ficha tem campos obrigatórios: sem eles, não gere.
3. **Preencha o template do prompt** da ficha. Todo prompt segue este esqueleto:
   ```
   Crie em HTML ([Three.js | canvas | JS puro], [1080x1920], [60fps na prévia], [N]s) [o que é]:
   [direção de arte] + [física: motion blur por sub-quadros, molas com overshoot, nada linear, nada só com fade]
   + [som em Web Audio a N BPM]
   [Campo]: [VALOR] | [Campo]: [VALOR] ...
   Cenas: 0s … → 1,5s … → 3,6s … (linha do tempo com segundos)
   ```
   Cada cena precisa dizer **o que está na tela**, com o texto exato. Cena vaga vira enchimento: no teste da música, "player abre" saiu como uma tela vazia e "gigante em P&B" virou um "O" sozinho.
   Em peça de cliente, mostre a linha do tempo com os textos de tela e espere o ok antes de gerar.
4. **Gere o HTML** numa pasta da peça (`index.html`, ou `index-9x16.html`, e `assets/` com tudo copiado para dentro). Comece de `assets/base.html` (ou de `formatos/mapa/referencia-16x9.html` na família de mapas) e siga `referencias/contrato-html.md`. Se delegar a um subagente, passe o prompt preenchido, o contrato e a ficha.
5. **Teste de carregamento e QA ao vivo** com `scripts/capturar.cjs` (abaixo). Código de saída 2 = erro de página, requisição falha ou animação parada: corrija antes de qualquer outra coisa. Olhe a `folha.png` cena por cena contra a linha do tempo. Depois rode com `--preview` e confira se a prévia fica perto de 60 fps.
6. **Exporte** com `scripts/gravar.cjs`. Revise o MP4 de verdade com `scripts/folha.cjs video.mp4`, e olhe a linha de áudio (média e pico em dB) que o script imprime.
7. **Entregue** pelo checklist do fim. Para o Google Drive, rode `scripts/drive.sh`.

## Regras do HTML (detalhes e código em `referencias/contrato-html.md`)

- **Relógio único.** Todo movimento sai de `renderFrame(t)`, uma função pura do tempo alimentada por `AudioContext.currentTime` (ou `performance.now` sem som). Nada de cadeias de `setTimeout` para coreografia, nem de animação CSS solta. É isso que faz a prévia, o `?t=` e a exportação mostrarem o mesmo quadro.
- **`?t=<s>`** congela num segundo, **`?preview`** liga o modo leve, **`?guias`** mostra as zonas seguras, **`?mudo`** começa sem clique e sem som.
- **"Clique para começar"** num `<button id="start">`, por causa da política de autoplay de áudio. Espere `document.fonts.ready` (e `document.fonts.load` das fontes usadas) e as imagens antes de liberar o botão.
- **`window.MOTION = { w, h, dur, atraso, pronto }`** num `<script>` comum no `<head>`, e `MOTION.audio = { ctx, t0 }` no clique: os scripts leem o tamanho, a duração e alinham o áudio por aí.
- **Nada desenhado por cima no fim.** Botão "assistir de novo" visível entrou nos últimos quadros de 3 dos 5 MP4 do teste. Recomece com clique no quadro e esconda qualquer botão quando `navigator.webdriver` for verdadeiro.
- **Aleatório com semente** (mulberry32). `Math.random` em layout faz cada render sair diferente.
- **Som só pelo AudioContext.** Narração entra por `decodeAudioData` num `BufferSource`. Limite os osciladores a 20 Hz–18 kHz: o e-commerce gerou 14 avisos de frequência acima de 24 kHz.
- **Chaves distintas em objetos de dados.** O bug do Vox foi `{type:'arrow', d:'M…', t:3, d:0.25}`: o segundo `d` apagou o path e quebrou o `init` (`d.match is not a function`). Use `path`, `t` (início) e `dur` (duração).
- **Sem `<video>` tocando sozinho.** O relógio virtual não controla vídeo nativo.
- **Assets do cliente com caminho relativo**, dentro da pasta da peça.

### Desempenho medido no teste (Apple M4)

| Peça | Técnica cara | fps ao vivo |
|---|---|---|
| Cartão | 24 renders da cena por quadro (`SUB = 24`, blur + profundidade de campo) | 25 |
| Mapa | 16 sub-quadros | 18 |
| Vox | filtros SVG `feTurbulence` + `feDisplacementMap` com blur e `mix-blend-mode` | 19 (nos chicotes) |
| E-commerce | blur por camada, só quando a camada anda rápido | 48 |
| Música | Canvas 2D, blur por elemento | 56 |

Regra: a prévia ao vivo usa `?preview` (1–4 sub-quadros, turbulência parada, menos partículas) e a qualidade final sai **sempre** do `gravar.cjs`, que não depende da máquina. Na referência do mapa, `?preview` levou de 17–27 fps para 60.

## Scripts

Todos em `scripts/`, rodam de qualquer pasta. O Playwright é procurado no projeto atual, depois na pasta do HTML, depois em `~/Projetos/VENDAS-IG/node_modules/playwright` (ou em `PLAYWRIGHT_PATH`). O ffmpeg desta máquina **não tem drawtext**: nada de texto queimado pelo ffmpeg. `--help` em qualquer script mostra todas as opções.

```bash
SK=~/.claude/skills/motion-graphics/scripts

# QA ao vivo: fps por segundo (sem prints), prints em tempo real, erros, folha.png
node $SK/capturar.cjs <pasta> [--arquivo index-9x16.html] [--query guias] [--tempos 1,3.5,8]
node $SK/capturar.cjs <pasta> --preview          # fps da prévia leve

# MP4: áudio em tempo real + vídeo quadro a quadro com relógio virtual
node $SK/gravar.cjs <pasta> saida.mp4 [--fps 30] [--escala 1] [--crf 18]
node $SK/gravar.cjs <pasta> rascunho.mp4 --fps 15 --escala 0.5      # rascunho rápido
node $SK/gravar.cjs <pasta> saida.mp4 --audio trilha.wav             # trilha externa no lugar do Web Audio

# Folha de contato de uma pasta de prints ou do MP4 exportado
node $SK/folha.cjs saida.mp4 [--n 12 | --tempos 1,4,9]

# Versão para o conector do Google Drive (~10 MB em base64 ≈ 7,4 MB de arquivo; mira 6,4 MB)
bash $SK/drive.sh saida.mp4 [saida-drive.mp4] [6.4]

# Narração com tempos por frase (explicativo): frases.txt → narracao.mp3 + tempos.json
node $SK/narracao.cjs frases.txt <pasta> [--voz Luciana]

# Trajeto real (GPX/KML/GeoJSON/CSV) ou lista ordenada de ruas → percurso.json no plano da cidade
node $SK/percurso.cjs 5k.gpx 10k.gpx --nomes "5K,10K"
node $SK/percurso.cjs --segmentos ruas.txt
```

Sem `--w/--h`, os scripts usam o tamanho declarado em `window.MOTION` (senão 1920x1080). Sem `--dur`, a duração de `MOTION.dur`. O `gravar.cjs` grava quadros e áudio numa pasta temporária, não suja a pasta da peça, e avisa quando o MP4 passa de 7,4 MB.

## Marcas, conteúdo publicado e profissões regulamentadas

Detalhes em `referencias/conformidade.md`. O essencial:

- Google Maps, Shopify e Nubank entraram no teste só como exercício. Em peça publicada, **nunca falsifique logo, pin ou interface de marca de terceiros**. Use os assets reais do cliente, com caminho relativo. Marco de terceiro (shopping, universidade) aparece só como texto.
- Marca de órgão público (ex.: prefeitura) só com autorização escrita do organizador.
- Dentista (CRO), médico (CRM), advogado (OAB), farmácia (CRF/ANVISA) e outros conselhos: nome e número de registro do responsável no cartão final; sem preço, promoção, superlativo ("o melhor"), promessa de resultado nem antes/depois. Farmácia: não anuncie medicamento manipulado nem prometa efeito, e inclua o farmacêutico responsável quando exigido.
- Nome de rua, bairro, tempo de trajeto, prazo e endereço: sempre reais e confirmados com o cliente.

## Checklist de entrega

- [ ] `capturar.cjs` sem erro grave (código 0) e `folha.png` conferida cena por cena contra a linha do tempo
- [ ] Nenhuma cena vazia, nenhum texto cortado na borda ou sobreposto a outro, todo texto parado tempo bastante para ler (~0,3 s + 0,06 s por caractere)
- [ ] Zonas seguras respeitadas no 9:16 (`--query guias`): nada importante nos 250 px de cima, nos ~420 px de baixo nem nos ~140 px da direita
- [ ] Nenhum logo, pin ou interface de terceiro; nenhum nome de marca inventado (o teste da música inventou um app "PULSO")
- [ ] Dados do conselho no cartão final, se a profissão for regulamentada
- [ ] MP4 exportado pelo `gravar.cjs` e revisado com `folha.cjs`; áudio com média acima de −30 dB e pico abaixo de 0 dB; sem botão de replay nos últimos quadros
- [ ] Prévia `?preview` fluida, se o cliente for assistir ao HTML
- [ ] Entregue o MP4 (e `-drive.mp4` se for pelo Drive), o `index.html` com `assets/` e o prompt preenchido, na pasta que o projeto usa para conteúdo
