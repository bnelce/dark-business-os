# Motor da família de mapas

Todas as variantes de mapa usam este motor: uma cidade 3D branca procedural, uma câmera que nunca para de orbitar e mistura as tomadas sem cortes, motion blur por sub-quadros, névoa pela distância, pin da marca com tamanho constante na tela, rota que se desenha, placas de GPS com nome real de rua, cartão do lugar, trilha em Web Audio e cartão final de CTA com a identidade do cliente.

**Implementação de referência:** `referencia-16x9.html`, nesta pasta. É o teste 01-mapa (gerado de uma vez, 20 s, 1920x1080), sem a marca do Google, com `window.MOTION` e `?preview`. Rodou sem erro: 17–27 fps no modo completo e 60 fps com `?preview` (M4). **Comece copiando esse arquivo** para a pasta da peça como `index-9x16.html`, adapte para 9:16 (seção 3) e troque dados e coreografia pela ficha da variante. As peças da seção 4 não existem na referência: os trechos de código ali são o ponto de partida.

## Sumário

1. Regras da família
2. O que existe na referência (e onde)
3. Adaptar para 9:16
4. Peças novas: pin com ícone, vários pins, bairros, anéis, veículo, trajeto real, corredor na cidade, prédio em corte, contagens
5. Som
6. Desempenho
7. Esqueleto do prompt e checklist da família

## 1. Regras da família

- **Nunca logo, pin nem interface do Google Maps** (nem Waze, Apple Maps, iFood, Uber, 99). A peça é de um cliente real. O pin tem a cor da marca e o ícone do cliente no bulbo. O estilo é "app de mapa genérico": cidade branca, cartões brancos, rota em cor forte.
- **Ruas, bairros e marcos sempre reais, confirmados com o cliente** por escrito (guarde a lista no `prompt.md`). A cidade é procedural, mas as posições relativas têm que bater: o bairro que fica ao norte fica ao norte, o que faz divisa faz divisa, a avenida que cruza cruza. Quando o traçado importar (percurso de corrida, rota longa), use o traçado real com `scripts/percurso.cjs`.
- **Vertical 1080x1920 é o padrão**, dentro das zonas seguras do Reels (250 px em cima, ~420 px embaixo, ~140 px à direita).
- **O cartão final de CTA usa a identidade do cliente**: logo, cores e fonte do `identidade/design-guide.md`, endereço, CTA e, se for profissão regulamentada, nome e número do conselho.
- Tempo de trajeto, prazo de entrega, raio: confirmados e escritos com "cerca de" ou "~". Marco de terceiro (shopping, universidade, terminal) só como texto, sem logo.
- Rota na cor da marca. Se a cor for clara demais contra a cidade branca, use a cor escura da paleta, com borda.

## 2. O que existe na referência

Nomes de função e variável de `referencia-16x9.html`:

| Peça | Onde | Como funciona |
|---|---|---|
| Palco e qualidade | `W, H, DUR, SUB, SHUTTER`, `PREVIEW` | `SUB = PREVIEW ? 2 : 16`; obturador de 1/48 s |
| Cidade procedural | bloco "cidade procedural": `P`, `N`, `swx/swz`, `heightFor`, `addBuilding`, `bld`, `blocks`, `parks`, `trees` | grade de quarteirões (`P = 130` unidades de quadra + rua, `N = 18` quadras de raio); duas vias principais mais largas com faixa amarela; prédios em `InstancedMesh` de caixas com tom levemente variado; altura limitada perto do lugar (`capAt`) para a câmera ver a fachada; parques e árvores; semente fixa (`mulberry`) |
| Sombra | `renderer.shadowMap.autoUpdate = false` | cidade estática: sombra calculada uma vez |
| Nome de rua no chão | `textTex()`, `streetLabels()` | textura de canvas com contorno branco, repetida ao longo da via |
| Fachada do lugar | `facadeTex()`, `cafeG` | fachada desenhada em canvas como textura (letreiro, vitrine, número), toldo, platibanda, vasos |
| Pin | `pinProfile()`, `pinGroup`, `pinMat` | `LatheGeometry` em gota; billboard (copia o quaternion da câmera); escala = distância/300 → **tamanho constante na tela**; sempre por cima (`clearDepth` no `onBeforeRender`); quica na chegada |
| Rota | `pathAt(s)`, `routeAt(u)`, `ribbon()`, `setRoute(p)`, `routeProg(t)` | trajeto por trechos (reta + arco + reta) amostrado em 600 pontos; fita com borda e miolo; `setDrawRange` desenha até `p`; ponta com brilho que cresce com a distância da câmera |
| Você está aqui | `meG`, `meHalo` | ponto azul com halo pulsante |
| Câmera | `theta(t)`, `K(t, alvo, dist, pitch)`, `evalKeys(t)`, `setState(ts)` | órbita contínua: o ângulo `theta` só cresce. As chaves (alvo, log da distância, inclinação) são interpoladas por Hermite: as tomadas se misturam sem corte. Névoa e planos near/far acompanham a distância |
| Motion blur | `rtScene`, `rtAcc`, `accMat`, `outMat`, `renderFrame(t)` | `SUB` renders em alvo HalfFloat somados com peso 1/SUB; saída com vinheta |
| Interface presa ao 3D | `project(v)`, `banner()`, `ui(t)` | projeta um ponto 3D em pixels e posiciona o DOM; placas de rua com haste e ícone; painel de direções; pílula de GPS que troca de rua; "Você chegou!" com anéis; cartão final com desfoque do fundo |
| Trilha | `scheduleScore(ctx, T)` | 120 BPM, whooshes casados com os movimentos de câmera, sinos na chegada, riser antes do cartão final |

O que trocar sempre: `CAFE` (posição do lugar), as duas vias e seus nomes, `facadeTex()` (fachada do cliente), textos do DOM, `--marca`, as chaves de câmera `K(...)` e a trilha.

## 3. Adaptar para 9:16

1. `window.MOTION = { w: 1080, h: 1920, ... }` e `const W = 1080, H = 1920`. Renderer e alvos já usam `W, H`.
2. **fov vertical 50–55** na `PerspectiveCamera`. Com 40 (o da referência), o campo horizontal cai para 23° e a cidade vira um corredor.
3. **Oriente a rota de cima para baixo na tela**: escolha a fase de `theta(t)` para que, na cena da rota, a câmera olhe ao longo do trajeto. Afaste ~1,3x as tomadas abertas.
4. **Interface dentro da área segura**: cartões entre y=250 e y=H−420; margem direita de 140 px ou mais; pílula de GPS com `bottom` ≥ 460 px; em `banner()`, limite `x` entre 60 e `W − 140 − largura` e `y` entre `250 + altura` e `H − 420`.
5. Tipos maiores: placa de rua ≥ 44 px, nome do lugar ≥ 72 px, "Você chegou!" ≥ 80 px.
6. Cartão final centralizado em ~45% da altura, com o CTA acima de y=1450.
7. Confira com `capturar.cjs --query guias` (acrescente as guias do `assets/base.html` ao HTML).

## 4. Peças novas

Trechos em Three.js r160 que usam os nomes da referência (`eOutCubic`, `eOutBack`, `eInOut`, `sstep`, `boxG`, `M4`, `V3`, `Q0`, `S3`, `COR_MARCA`, `pinProfile`, `ribbon`, `routeAt`, `K`, `project`). Ajuste escalas. Todos são funções de t, chamadas dentro de `setState(ts)` (3D) ou `ui(t)` (DOM).

Estado de teste (2026-11-14): 4.1 a 4.5 foram colados como estão numa cópia 9:16 da referência (fov 52) e rodaram sem erro, a 60 fps com `?preview`. O `percurso.cjs` da 4.6 foi testado à parte (GPX com duas distâncias e lista de ruas). 4.7 a 4.10 são roteiro de implementação: confira com `capturar.cjs` ao usar pela primeira vez.

### 4.1 Pin da marca com ícone

```js
// O ícone do cliente vai num disco na frente do bulbo (o pin é billboard, então o disco sempre encara a câmera).
async function texturaIcone(src, fundo = '#ffffff') {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = fundo; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
  g.drawImage(img, 48, 48, 160, 160);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function criarPin(cor, icone, { primeiro = false } = {}) {
  const pin = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.LatheGeometry(pinProfile(), 56),
    new THREE.MeshPhongMaterial({ color: cor, specular: '#444444', shininess: 70, transparent: true, fog: false }));
  const disco = new THREE.Mesh(new THREE.CircleGeometry(6.4, 48), new THREE.MeshBasicMaterial({ map: icone, transparent: true, fog: false }));
  disco.position.set(0, 21, 9.3);
  corpo.renderOrder = 990; disco.renderOrder = 991;
  if (primeiro) corpo.onBeforeRender = (r) => r.clearDepth();   // com vários pins, limpe a profundidade só no primeiro
  pin.add(corpo, disco);
  return pin;
}
// Em setState(ts): tamanho constante na tela, queda com quique a partir de "nasce".
function atualizarPin(pin, ts, nasce, escala = 1) {
  pin.quaternion.copy(camera.quaternion);
  const q = ts - nasce, queda = q <= 0 ? 0 : 1 - Math.exp(-7 * q) * Math.cos(16 * q);
  pin.scale.setScalar(Math.max(1e-3, camera.position.distanceTo(pin.position) / 300 * escala * queda));
  pin.visible = q > 0;
}
```

Ícone: o logo simplificado do cliente (símbolo, sem texto) ou um ícone do segmento (dente, frasco, bolo). Fundo do disco branco ou a cor clara da paleta.

### 4.2 Vários pins (unidades, marcos, pontos de entrega)

```js
const UNIDADES = [   // posição em unidades da cena, na geografia relativa real
  { nome: 'Matriz', bairro: '[BAIRRO_1]', x: 900, z: 1400, nasce: 2.0 },
  { nome: 'Unidade 2', bairro: '[BAIRRO_2]', x: 300, z: 300, nasce: 2.25 },
];
const pins = UNIDADES.map((u, i) => { const p = criarPin(COR_MARCA, ICONE, { primeiro: i === 0 }); p.position.set(u.x, 23, u.z); scene.add(p); return p; });
// setState: pins.forEach((p, i) => atualizarPin(p, ts, UNIDADES[i].nasce));
// Câmera visita cada um: uma chave K por unidade, com a órbita contínua por baixo.
UNIDADES.forEach((u, i) => { K(4 + i * 2.6, [u.x, 20, u.z], 420, 38); K(4 + i * 2.6 + 1.6, [u.x, 20, u.z], 380, 34); });
```

Marcos secundários (shopping, terminal): pin cinza menor (`escala = 0.7`), sem ícone, rótulo DOM com o nome e o tempo ("Shopping Iguatemi · ~6 min"). Rótulo DOM: um `.banner` da referência por pin, posicionado com `project()`.

### 4.3 Bairros que acendem

Bairro = conjunto de quarteirões cuja semente mais próxima é a dele (Voronoi sobre a grade). As sementes ficam na geografia relativa real.

```js
// 1) Guarde i, j de cada quarteirão ao montar a cidade: blocks.push({ x0, x1, z0, z1, i, j }).
const BAIRROS = [
  { nome: 'Aldeota', x: 600, z: -300, rotulo: 'até 40 min', acende: 3.0 },
  { nome: 'Meireles', x: 200, z: -900, rotulo: 'até 35 min', acende: 4.6 },
];
const dono = new Map();   // "i,j" → índice do bairro
for (const b of blocks) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  let melhor = -1, dmin = 1e9;
  BAIRROS.forEach((s, k) => { const d = Math.hypot(cx - s.x, cz - s.z); if (d < dmin) { dmin = d; melhor = k; } });
  if (dmin < 900) dono.set(`${b.i},${b.j}`, melhor);   // longe de toda semente: fica fora de qualquer bairro
}
// 2) Uma InstancedMesh de placas por bairro (opacidade animada por bairro) e o contorno:
//    lado de célula cujo vizinho é de outro bairro (ou de nenhum) vira uma fita fina.
const camadas = BAIRROS.map((s, k) => {
  const meus = blocks.filter((b) => dono.get(`${b.i},${b.j}`) === k);
  const mat = new THREE.MeshBasicMaterial({ color: COR_MARCA, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const placas = new THREE.InstancedMesh(boxG, mat, meus.length);
  meus.forEach((b, n) => { M4.compose(V3.set((b.x0 + b.x1) / 2, 0.9, (b.z0 + b.z1) / 2), Q0, S3.set(b.x1 - b.x0 + 22, 0.4, b.z1 - b.z0 + 22)); placas.setMatrixAt(n, M4); });
  placas.frustumCulled = false; scene.add(placas);
  const lados = [];
  for (const b of meus) for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (dono.get(`${b.i + di},${b.j + dj}`) === k) continue;
    lados.push({ b, di, dj });   // monte uma fita (BoxGeometry fina) na borda da célula, do lado di/dj
  }
  return { mat, lados, centro: new THREE.Vector3(s.x, 2, s.z) };
});
// 3) setState: camadas[k].mat.opacity = 0.42 * eOutCubic((ts - BAIRROS[k].acende) / 0.4)
//    ui: rótulo DOM no centro projetado: nome em cima, prazo embaixo; entra com eOutBack.
```

No 9:16, até ~7 bairros com rótulo legível. Mais que isso: acenda em grupos e mostre a lista no cartão final.

### 4.4 Anéis de raio e de tempo

```js
function criarAnel(raio, cor) {
  const g = new THREE.Group(), w = Math.max(6, raio * 0.012);   // borda proporcional: anel grande visto de longe some com 12 u
  const borda = new THREE.Mesh(new THREE.RingGeometry(raio - w, raio + w, 160).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: cor, transparent: true, depthWrite: false, fog: false }));
  const miolo = new THREE.Mesh(new THREE.CircleGeometry(raio, 160).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.07, depthWrite: false, fog: false }));
  borda.position.y = 1.6; miolo.position.y = 1.5;
  g.add(miolo, borda); return g;
}
// setState: expande de 0 a 1 com overshoot e pulsa a borda depois.
function atualizarAnel(anel, ts, t0) {
  const e = eOutBack((ts - t0) / 0.7);
  anel.scale.setScalar(Math.max(1e-3, e));
  anel.visible = ts > t0;
  anel.children[1].material.opacity = 0.9 - 0.25 * Math.max(0, Math.sin((ts - t0 - 0.7) * 4));
}
```

Os anéis são **estilizados, não em escala métrica**: tempo real de deslocamento não é um círculo. O que tem que estar certo é a ordem e a direção dos marcos (o que fica a ~4 min aparece dentro do anel de 5). Rótulo do anel ("5 min", "10 min") preso ao ponto da borda mais perto do centro da tela, projetado com `project()`.

### 4.5 Veículo na rota com tempo de chegada

```js
function criarMoto(cor) {   // low-poly basta: a câmera fica a 250–600 unidades
  const g = new THREE.Group(), escuro = new THREE.MeshLambertMaterial({ color: '#2b2b2b' });
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 8).translate(0, 2.4, 0), escuro);
  const bau = new THREE.Mesh(new THREE.BoxGeometry(4.6, 4.2, 4.6).translate(0, 5.6, -2.6), new THREE.MeshLambertMaterial({ color: cor }));
  const rodas = [-3, 3].map((z) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1, 18).rotateZ(Math.PI / 2), escuro); r.position.set(0, 1.5, z); return r; });
  g.add(corpo, bau, ...rodas); return g;
}
const moto = criarMoto(COR_MARCA); scene.add(moto);
const progressoMoto = (t) => sstep(3.0, 12.0, t);   // pode ter pausas nas curvas: some trechos de sstep
function posicionarNaRota(obj, u) {
  const a = routeAt(u), b = routeAt(Math.min(1, u + 0.003));
  obj.position.set(a.x, 1.2, a.y);
  obj.rotation.y = Math.atan2(b.x - a.x, b.y - a.y);
  obj.scale.setScalar(Math.max(1, camera.position.distanceTo(obj.position) / 260));   // legível de longe
}
// setState: posicionarNaRota(moto, progressoMoto(ts)); setRoute(progressoMoto(ts)) desenha a rota atrás dela.
// ui: tempo de chegada = Math.ceil(MIN_TOTAL * (1 - progressoMoto(t))); quando o número muda, o novo entra com eOutBack.
// Câmera de perseguição: chaves K a cada ~1,2 s com alvo em routeAt(progressoMoto(tk) + 0.04), dist 300, pitch 42.
```

Baú com o logo: textura de canvas na face de trás (`MeshBasicMaterial({ map })` num plano). Carro: troque o corpo por duas caixas (chassi e cabine).

### 4.6 Trajeto real a partir do `percurso.json`

```bash
node ~/.claude/skills/motion-graphics/scripts/percurso.cjs assets/5k.gpx assets/10k.gpx --nomes "5K,10K" --saida assets/percurso.json
node ~/.claude/skills/motion-graphics/scripts/percurso.cjs --segmentos assets/ruas.txt --saida assets/percurso.json   # sem GPX
```

Saída em metros, x = leste, z = sul (norte = −z), pontos a cada 5 m, marcos de km, altimetria (se o GPX tiver `<ele>`), waypoints (`<wpt>`: hidratação, retorno) e, no modo `--segmentos`, o nome da rua por faixa de distância. Embuta o JSON na página (`<script type="application/json" id="percurso">`): assim funciona até aberto direto do disco.

```js
const PERC = JSON.parse(document.getElementById('percurso').textContent);
const ESC = 1.25;   // metros → unidades da cena (quadra de 130 u ≈ 105 m). Percurso longo: diminua e aumente N.
const trajeto = PERC.trajetos.find((t) => t.nome === '10K');
const pts = trajeto.pontos.map(([x, z]) => new THREE.Vector2(x * ESC, z * ESC));
const routeAt = (u) => pts[Math.min(pts.length - 1, Math.round(clamp(u) * (pts.length - 1)))];   // passo fixo: u ∝ distância
const fita = new THREE.Mesh(ribbon(pts, 16, 1.3), routeMatC);   // ribbon() e setDrawRange da referência
// Marcos de km: trajeto.km → { km, x, z }. Ruas para as placas: trajeto.ruas → { nome, de_m, ate_m }.
```

Dimensione a cidade pelo percurso: `N = Math.ceil(Math.max(|caixa|) * ESC / P) + 4`.

### 4.7 Cidade que respeita o traçado real

Com trajeto real, a grade procedural não coincide com as ruas. Abra um corredor: nenhum prédio perto da rota, e a rota vira via (fita amarela por baixo da fita da rota, com o nome no chão).

```js
const CEL = 40, grade = new Map();
for (const p of pts) { const k = `${Math.floor(p.x / CEL)},${Math.floor(p.y / CEL)}`; if (!grade.has(k)) grade.set(k, []); grade.get(k).push(p); }
function pertoDaRota(x, z, r) {
  const ci = Math.floor(x / CEL), cj = Math.floor(z / CEL), n = Math.ceil(r / CEL);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++)
    for (const p of grade.get(`${ci + i},${cj + j}`) || []) if (Math.hypot(p.x - x, p.y - z) < r) return true;
  return false;
}
// Em addBuilding(x0, x1, z0, z1): if (pertoDaRota((x0 + x1) / 2, (z0 + z1) / 2, Math.max(x1 - x0, z1 - z0) / 2 + 20)) return;
// Via: ribbon(pts, 34, 0.05) com aveMat por baixo da rota.
```

Para a grade parecer a da cidade, gire a cidade inteira pelo rumo dominante das ruas reais (média dos ângulos dos trechos, módulo 90°).

### 4.8 Prédio em corte (trajeto interno)

Para "do estacionamento à sala": a torre vista de fora, depois cortada para mostrar garagem, elevador e andar.

```js
renderer.localClippingEnabled = true;
const corteTopo = new THREE.Plane(new THREE.Vector3(0, -1, 0), 999);   // corta tudo acima de "constant"
const corteFrente = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 999); // tira a fachada voltada para a câmera
const matParede = new THREE.MeshLambertMaterial({ color: '#f4f5f7', clippingPlanes: [corteTopo, corteFrente], clipShadows: true });
const ANDAR = 4.2, N_ANDARES = 12, LAJE = 0.5;
// lajes: BoxGeometry(LARG, LAJE, PROF) em y = k * ANDAR; garagem no k = -1 com vagas (textura de faixas brancas) e 3 carros low-poly.
// planta do andar-alvo: lista de paredes [x0, z0, x1, z1] (caixas finas, altura ANDAR - LAJE) com vãos de porta;
// porta da sala: plano com textura de canvas "Sala 214" + logo do cliente.
// setState: corteTopo.constant = lerp(N_ANDARES * ANDAR + 5, (ANDAR_ALVO + 1) * ANDAR - 0.2, eInOut((ts - 2) / 1.2));
//           corteFrente.constant anda de fora para dentro no mesmo intervalo.
// Rota interna: fita no piso da garagem (entrada → elevador), tubo vertical que cresce no poço do elevador
// (CylinderGeometry com scale.y = progresso), fita no corredor do andar (elevador → porta).
// ui: contador de andar ("G1 → 2º andar") enquanto o tubo sobe; cronômetro "0:00 → 1:00" amarrado ao progresso.
```

Planta e tempo vêm do cliente (foto da recepção, número da sala, se precisa se identificar na portaria, tempo real cronometrado a pé). A planta é esquemática: não precisa ser a real, mas a ordem (garagem → elevador → corredor → porta) e os nomes sim.

### 4.9 Contagem regressiva e cronômetro

```js
// Dias até o evento: datas EXPLÍCITAS. Nunca Date.now(): no MP4 o vídeo fica pronto, e no gravar.cjs Date.now é virtual.
const FALTAM = Math.round((Date.parse('2026-12-12T00:00:00-03:00') - Date.parse('2026-11-20T00:00:00-03:00')) / 864e5);  // data de publicação → data do evento
// Rolagem: os dígitos giram de FALTAM + 9 até FALTAM entre 15,2 s e 16,4 s (eOut), cada dígito numa coluna com overflow hidden.
// Cronômetro: const seg = Math.round(TEMPO_REAL_S * progresso); texto = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`.
```

Se a data de publicação não estiver fechada, troque a contagem pela data escrita ("12 de dezembro, 7h").

### 4.10 Faixa de altimetria

Só se o GPX tiver altitude (`trajeto.altimetria`). Nunca desenhe um perfil inventado.

```js
// SVG ou canvas numa faixa acima da zona segura de baixo (ex.: y 1300–1460 no 9:16).
// path: d → x proporcional à distância, ele → y com exagero vertical (a faixa toda cobre min..max).
// Preenchimento: clipPath com largura = progresso da rota (o mesmo u da rota); marcador do km atual em cima.
// Rótulos: "altimetria", mínimo e máximo em metros, ganho total (trajeto.ganho_m).
```

## 5. Som

- Base de 120 BPM (corrida: 128–140), whoosh em cada movimento grande de câmera, blip quando um cartão ou placa entra, sino na chegada, riser antes do cartão final (padrão de `scheduleScore`).
- Variantes: pin caindo = "pop" curto e grave; bairro acendendo = nota da escala (sobe um grau a cada bairro); anel = pulso de sub grave + brilho; moto = ronco filtrado (dente-de-serra 60–90 Hz com passa-baixa) que acompanha a velocidade; buzina de largada (corrida) = duas notas quadradas; plateia na chegada = ruído rosa filtrado com volume subindo.
- Frequências entre 20 Hz e 18 kHz.

## 6. Desempenho

- Referência a 1920x1080 com 16 sub-quadros: 17–27 fps ao vivo; com `?preview` (2 sub-quadros): 60 fps. 1080x1920 tem o mesmo número de pixels: espere o mesmo.
- Pins, bairros, anéis e veículo custam pouco. O caro é o número de sub-quadros e a sombra (calcule uma vez).
- Exportação: 20 s em 30 fps = 600 quadros, perto de 1–2 min no M4.

## 7. Esqueleto do prompt e checklist da família

Toda ficha de variante preenche este esqueleto:

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, [DUR]s) um reel de [VARIANTE] para [NEGÓCIO]: cidade 3D branca procedural no estilo de app de mapa genérico (sem logo, pin ou interface do Google ou de qualquer app), câmera em órbita contínua que mistura as tomadas sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), névoa pela distância, pin na cor [COR_MARCA] com o ícone assets/icone.svg e tamanho constante na tela, placas de GPS com os nomes reais das ruas, e trilha com whooshes em Web Audio a [BPM] BPM. Parta de formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (seções [PEÇAS]), adaptado para 9:16: fov 52, interface entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do cliente (assets/logo.svg, cores [CORES], fonte [FONTE]).

[CAMPOS DA VARIANTE]

Cenas: [LINHA DO TEMPO DA VARIANTE]
```

Checklist da família, além do checklist geral do `SKILL.md`:

- [ ] Nenhum logo, pin, ícone ou interface do Google, Waze ou outro app
- [ ] Ruas, bairros e marcos conferidos com o cliente por escrito; posições relativas certas
- [ ] Tempos, prazos e raios confirmados e escritos com "cerca de" / "~"
- [ ] Pin com a cor e o ícone do cliente; cartão final com logo, cores e fonte dele
- [ ] 9:16 dentro das zonas seguras (`capturar.cjs --query guias`)
- [ ] Dados do conselho no cartão final, se regulamentado
- [ ] Crédito "© colaboradores do OpenStreetMap" se usou dado do OSM
- [ ] Atendimento em domicílio: endereço residencial do profissional fora da peça
