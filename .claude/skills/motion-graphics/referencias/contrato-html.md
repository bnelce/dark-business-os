# Contrato do HTML

O que toda peça precisa cumprir para rodar ao vivo, congelar em qualquer segundo e exportar igual. `assets/base.html` implementa tudo isto: comece dele e troque a cena e a trilha.

## Sumário

1. Pasta da peça
2. `window.MOTION`
3. Relógio único e `renderFrame(t)`
4. Início, fim e parâmetros de URL
5. Motion blur por sub-quadros (Three.js, Canvas, DOM)
6. Modo `?preview`
7. Som em Web Audio
8. Fontes e imagens
9. Texto, leitura e composição
10. Armadilhas de JavaScript vistas no teste
11. Antes de entregar

## 1. Pasta da peça

```
<peça>/
  index.html            (ou index-9x16.html, index-4x5.html: um arquivo por proporção)
  assets/               logo.svg, fotos, narracao.mp3, percurso.json... tudo copiado para cá
  prompt.md             o prompt preenchido (registro do que foi pedido)
```

Caminhos sempre relativos (`assets/logo.svg`). A pasta tem que funcionar sozinha: é ela que o `capturar.cjs` e o `gravar.cjs` servem por http. Se for inevitável usar `../`, passe `--raiz` aos scripts.

Uma proporção por arquivo. Recompor 16:9 em 9:16 é outra composição, não um `scale`: ver `saida-e-zonas-seguras.md`.

Bibliotecas por CDN com versão fixa (`three@0.160.0` por importmap, `gsap@3.12.5`). Fontes do Google Fonts.

## 2. `window.MOTION`

Num `<script>` comum no `<head>`, antes de qualquer módulo:

```html
<script>window.MOTION = { w: 1080, h: 1920, dur: 20, atraso: 0.15, pronto: false };</script>
```

- `w`, `h`: tamanho do quadro. Os scripts ajustam a janela a ele.
- `dur`: duração em segundos (os scripts param aí, mais uma cauda de 0,5 s).
- `atraso`: folga entre o clique e o t=0 (o som é agendado em `ctx.currentTime + atraso`).
- `pronto`: vire `true` só quando fontes, imagens e cena estiverem prontas. Os scripts esperam por isso antes de clicar.
- No clique, publique `MOTION.audio = { ctx, t0 }`: o `gravar.cjs` alinha o áudio exato por aí.

## 3. Relógio único e `renderFrame(t)`

```js
const Q = new URLSearchParams(location.search);
const T_FIXO = Q.has('t') ? Math.min(DUR, Math.max(0, parseFloat(Q.get('t')) || 0)) : null;
let ctx = null, T0 = 0, P0 = 0, rodando = false;
function agora() {
  if (T_FIXO !== null) return T_FIXO;
  if (!rodando) return 0;
  return ctx ? ctx.currentTime - T0 : (performance.now() - P0) / 1000;
}
function laco() {
  const t = Math.min(agora(), DUR);
  renderFrame(Math.max(0, t));
  if (t >= DUR) { rodando = false; MOTION.terminou = true; return; }
  requestAnimationFrame(laco);
}
```

`renderFrame(t)` é **função pura de t**: desenha o estado do instante t sem depender do quadro anterior. Qualquer t, em qualquer ordem, dá o mesmo desenho. Se a fps cair, quadros são pulados, mas cada um mostra o momento certo. É isso que permite prints em tempo real, `?t=` e exportação iguais.

Como cada tecnologia entra no relógio:

- **Three.js**: `setState(t)` posiciona câmera e objetos a partir de t; nada de `clock.getDelta()` acumulando.
- **Canvas 2D**: `cena(ctx2d, t)` redesenha tudo.
- **DOM**: `ui(t)` escreve `style.transform`/`opacity` a partir de t. Sem `transition` nem `@keyframes` soltos.
- **GSAP**: monte a timeline pausada e posicione: `const tl = gsap.timeline({ paused: true }); ... tl.time(t)`. Foi assim no Vox.
- **Física** (mola, queda, partícula): fórmula fechada em t (`mola(t - t0)`), nunca integração passo a passo.

O relógio virtual do `gravar.cjs` também segura `setTimeout`, `setInterval`, `Date.now` e animações CSS/WAAPI, mas coreografia nessas peças fica frágil e não congela com `?t=`. Não use para movimento.

## 4. Início, fim e parâmetros de URL

```js
async function comecar(comSom = true) {
  document.getElementById('start').style.display = 'none';
  if (comSom) {
    ctx = new AudioContext();
    const out = barramento(ctx);          // conecta ao destino já no clique
    await ctx.resume();
    T0 = ctx.currentTime + MOTION.atraso;
    trilha(ctx, out, T0);                 // agenda TUDO agora, em tempos absolutos
    MOTION.audio = { ctx, t0: T0 };
  } else P0 = performance.now() + MOTION.atraso * 1000;
  rodando = true; requestAnimationFrame(laco);
}
```

- `<button id="start">` cobrindo o quadro, desabilitado ("Carregando…") até `MOTION.pronto`. Os scripts clicam em `#start`, depois `[data-start]`, depois o primeiro botão visível, por último o centro da tela.
- `?t=<s>`: esconde o botão e renderiza só aquele instante (útil para conferir um quadro: `index.html?t=12.4`).
- `?preview`: modo leve (seção 6). `?guias`: zonas seguras por cima. `?mudo`: começa sem clique e sem som.
- **Fim**: fique no último quadro. Nada de botão "assistir de novo" visível: ele entrou nos últimos quadros dos MP4 do mapa, do e-commerce e da música. Recomece com clique no quadro e esconda qualquer controle quando `navigator.webdriver` for verdadeiro (Playwright).
- `window.renderAt = (t) => renderFrame(t)` ajuda a depurar pelo console.

## 5. Motion blur por sub-quadros

O borrão de movimento real é a média de várias amostras do tempo dentro do obturador (`OBTURADOR = 1/48`, 180° a 24 fps). É caro: N amostras = N renders da cena por quadro.

**Three.js** (padrão do mapa e do cartão): acumula em alvo HalfFloat com blend aditivo e peso 1/SUB, depois aplica tom/vinheta.

```js
const rtCena = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const rtAcc  = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
// accMat: fragment = texture(rtCena) * (1/SUB); blending One + One. outMat: lê rtAcc e escreve na tela.
function renderFrame(t) {
  for (let i = 0; i < SUB; i++) {
    setState(t - OBTURADOR * (1 - (i + .5) / SUB));
    renderer.setRenderTarget(rtCena); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(rtAcc); if (i === 0) renderer.clear(); renderer.render(accScene, quadCam);
  }
  renderer.setRenderTarget(null); renderer.render(outScene, quadCam);
  setState(t); ui(t);                    // DOM preso ao 3D usa o estado do instante exato
}
```

O cartão somou também jitter de lente por sub-quadro (profundidade de campo) com `SUB = 24` e ficou a 25 fps. Bonito, mas use 12–16 e deixe os 24 para a exportação se precisar. Sombra de cena estática: `renderer.shadowMap.autoUpdate = false` (calcula uma vez).

**Canvas 2D**: média corrente numa camada fora da tela (alpha `1/(i+1)` dá a média exata).

```js
for (let i = 0; i < SUB; i++) {
  cena(gAmostra, t - OBTURADOR * (1 - (i + .5) / SUB));
  gAcc.globalAlpha = 1 / (i + 1); gAcc.drawImage(amostra, 0, 0);
}
g.drawImage(acumulado, 0, 0);
```

Mais barato: blur por elemento, só quando ele anda rápido (o e-commerce media a velocidade de cada camada e usava de 1 a 12 amostras; a música fazia o mesmo por elemento e rodou a 56 fps).

**DOM**: não há borrão real. Para um elemento rápido, use um filtro SVG direcional atualizado por quadro (`<feGaussianBlur stdDeviation="dx 0">`, com dx proporcional à velocidade) só enquanto ele se move, ou desenhe o elemento no canvas.

Molas e easing: nada linear, nada só com fade. `eBack` e `mola(t, f, z)` com overshoot para entradas, `eIn` para saídas, `eInOut` para câmera.

## 6. Modo `?preview`

O que muda (e só isso; tempo e composição ficam iguais):

- sub-quadros: 1–4 em vez de 10–24;
- turbulência SVG (`feTurbulence`) com semente parada em vez de animada, ou desligada;
- menos partículas, sem profundidade de campo, sombras mais baratas.

Meta: perto de 60 fps no `capturar.cjs --preview`. O `gravar.cjs` usa `?preview` só na passada de áudio (alivia a CPU enquanto o som toca em tempo real); o vídeo sai sempre na qualidade cheia.

## 7. Som em Web Audio

- Uma cadeia: fontes → `master` (gain) → `DynamicsCompressor` (limitador) → `ctx.destination`. Conecte o master ao destino no clique.
- **Agende tudo no clique**, em tempos absolutos: `const at = (s) => T0 + s`. Som disparado de dentro do laço de quadros atrasa quando a fps cai.
- Frequências entre 20 Hz e 18 kHz (`hz(f)`): acima de 24 kHz o navegador avisa e corta.
- Rampa exponencial nunca chega a 0: use `0.0001`.
- Narração e trilha pronta: `fetch` + `decodeAudioData` + `BufferSource` no mesmo contexto. Nada de `<audio>` solto (o gravador tem desvio para `<audio>`, mas o sincronismo é pior).
- BPM como grade: cortes e palavras na batida (`BATIDA = 60 / BPM`).
- Mixagem: sob narração, abaixe os efeitos (ducking) ~4 dB. Pico abaixo de 0 dB, média em torno de −16 a −20 dB.

## 8. Fontes e imagens

```js
await Promise.race([
  document.fonts.ready.then(() => Promise.all(['800 150px Inter', '500 34px Inter'].map((f) => document.fonts.load(f)))),
  new Promise((r) => setTimeout(r, 4000)),
]);
const img = new Image(); img.src = 'assets/logo.svg'; await img.decode();
```

Texto desenhado em canvas ou textura antes da fonte carregar sai com fonte de sistema e não se corrige depois. SVG de logo: use o arquivo real do cliente; para textura em Three.js, desenhe o SVG num canvas e crie `CanvasTexture` com `colorSpace = SRGBColorSpace`.

## 9. Texto, leitura e composição

- Tempo de tela: todo texto fica **parado** pelo menos ~0,3 s + 0,06 s por caractere depois de chegar.
- Tamanho mínimo em 1080x1920: corpo 44 px, títulos 64 px ou mais. Em 1920x1080: corpo 28 px, títulos 56 px.
- Nada cortado na borda (no e-commerce, a tipografia cinética encostou na margem direita) e nada sobreposto (no cartão, "4 visitas" atropelou "compras lá fora"; na música, a frase vazou do balão).
- Densidade: no máximo um benefício ou ideia a cada ~1,5–2 s. O cartão tentou 6 benefícios em 15 s e a cena do globo virou uma colagem ilegível.
- Toda cena tem conteúdo. Se a ficha diz "player abre", diga o que o player mostra.
- Nada de nome de marca, app ou produto inventado: pergunte.
- Zonas seguras do 9:16 em `saida-e-zonas-seguras.md`.

## 10. Armadilhas de JavaScript vistas no teste

- **Chave repetida em objeto literal**: `{type:'arrow', d:'M690,140 C…', t:3.0, d:0.25}`. JavaScript aceita sem erro, o segundo `d` vence, e o código que fazia `d.match(...)` quebrou o `init` inteiro. Use nomes distintos e fixos: `path` (SVG), `t` (início), `dur` (duração), `x`/`y`, `txt`.
- **`init` assíncrono sem `catch`**: um erro ali deixa a página parada na tela de início. O `capturar.cjs` acusa como "nada se mexeu" e código 2.
- **Timeout de fonte com `setTimeout`**: no relógio virtual ele só dispara quando o tempo anda; os scripts avançam o tempo enquanto esperam `MOTION.pronto`, mas não dependa disso para nada além do fallback.
- **`Math.random()` no layout**: cada render sai diferente. Use `rng(semente)`.

## 11. Antes de entregar

1. `node scripts/capturar.cjs <pasta>`: código 0, sem `[pageerror]` nem `[http 404]` no `log.txt`, "quadros distintos" alto.
2. Folha conferida contra a linha do tempo, com `--query guias` no 9:16.
3. `capturar.cjs --preview`: prévia fluida.
4. `gravar.cjs` e `folha.cjs` no MP4.
