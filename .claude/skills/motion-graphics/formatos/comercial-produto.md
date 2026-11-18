# Comercial de produto (produto-herói 3D)

Macro no detalhe do produto, ele gira e revela o nome, o fundo vira de cor, cada benefício entra com letras extra bold subindo da linha de base (com número contando, se houver), e fecha na tagline e no logo. Three.js com motion blur e profundidade de campo por soma de sub-quadros, 15 s.

**Serve para:** produto físico com forma reconhecível (cartão, frasco, embalagem, aparelho, kit), cartão de fidelidade, plano ou assinatura com "cartão". No teste ficou em 4º: visual de comercial de verdade, mas pesado (25 fps) e denso demais no fim.

**Para estudar a técnica:** `~/Projetos/VENDAS-IG/saidas/outros/teste-prompts-motion-2026-11-14/04-cartao/index.html` (com a marca do Nubank; só referência de código, nunca base de peça publicada), com prints e `log.txt` em `_captura/`.

## Campos obrigatórios

- Marca e nome do produto
- O que o objeto real tem, e só isso (no teste: "logo SVG oficial, chip, aproximação, bandeira, nome"); medidas ou proporção
- Arte real da superfície: rótulo, estampa ou foto do produto (assets/rotulo.png) e logo em SVG
- No máximo **4 benefícios** para 15 s, cada um com até ~5 palavras e, se tiver, o número exato
- Tagline e CTA
- Cores (as duas que alternam no fundo) e fonte extra bold

## Prompt 16:9 (o do teste, generalizado)

```text
Crie em HTML (Three.js, 1920x1080, 15s) o comercial do [PRODUTO] da [MARCA]: [PRODUTO] 3D com bisel e reflexo correndo, só com o que o real tem ([ELEMENTOS_REAIS]; arte em assets/rotulo.png, logo em assets/logo.svg), motion blur e profundidade de campo reais por soma de sub-quadros (12 na prévia com ?preview reduzido a 2; 16 na exportação), fundo alternando [COR_1] e [COR_2], letras extra bold subindo da linha de base e som em Web Audio a 120 BPM. Siga o contrato da skill motion-graphics.

Marca: [MARCA] | Produto: [PRODUTO] | Benefícios: [B1] · [B2] · [B3] · [B4] | Tagline: [TAGLINE] | CTA: [CTA]

Cenas: 0s macro no [DETALHE] → 2s o produto gira e revela [NOME] → 4s vira o fundo → [B1] (com o número contando) → 6s [B2] → 8s [B3] → 10s [B4] → 12s [TAGLINE] → 13,5s logo e [CTA]. Cada benefício fica parado e legível pelo menos 1,2s; nunca dois textos ao mesmo tempo.
```

## Prompt 9:16

```text
Crie em HTML (Three.js, 1080x1920, 15s) o comercial do [PRODUTO] da [MARCA] para Reels: [mesma direção, física e som]. Composição empilhada: produto na metade de cima (y 300–1000), texto na metade de baixo (y 1050–1450), nada nos 250px de cima, nos 420px de baixo nem nos 140px da direita. Câmera com fov 50.

[mesmos campos]

Cenas: 0s macro no [DETALHE] ocupando a tela → 2s o produto gira de pé e revela [NOME] embaixo dele → 4s fundo vira, [B1] embaixo com número contando → 6s [B2] → 8s [B3] → 10s [B4] → 12s [TAGLINE] em 2 linhas → 13,5s logo e [CTA] no centro.
```

## O que o teste mostrou

- `SUB = 24` sub-quadros (borrão + profundidade de campo com jitter de lente) deram o visual mais "caro" do teste e a menor fps: 25 ao vivo, 27–30 nos 4 s de macro. Prévia com `?preview` e 2 sub-quadros; exportação com 16 já basta.
- Seis benefícios em 15 s: a cena do globo empilhou quatro deles e "4 visitas" atropelou "compras lá fora". Limite a 4 e um por vez.
- Com muito borrão, o texto em trânsito fica ilegível nos prints; tudo bem se ele parar legível depois. Confira os quadros parados na folha do MP4.
- "Só com o que o real tem" funcionou: o cartão saiu sem elementos inventados. Mantenha essa frase.
- `Math.random()` no jitter dos sub-quadros deixa cada render levemente diferente. Use `rng(semente)`.

## Cuidados com cliente real

- O objeto é do cliente: arte, logo e cores dele. Nada de roxo + "nu" ou bandeira de cartão sem contrato (Mastercard, Visa: só com a regra de marca do emissor).
- Produto 3D procedural (caixa com bisel `RoundedBoxGeometry`, frasco por `LatheGeometry`) com a arte real como textura, ou modelo GLB fornecido pelo cliente.
- Farmácia, clínica, suplemento: benefício não é promessa de efeito. Sem preço de medicamento. Ver `referencias/conformidade.md`.
