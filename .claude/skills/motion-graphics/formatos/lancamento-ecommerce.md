# Lançamento de loja online (celular 3D)

Um celular 3D com espessura gira, acende e desbloqueia; o app ou site da loja abre, os produtos sobem em 3D, chega o primeiro visitante e a notificação da primeira venda toca com som de caixa. Canvas 2D (o teste fez o 3D do celular em JS puro), 15–20 s.

**Serve para:** loja que estreia e-commerce, app novo, site novo, catálogo online, agendamento online (clínica). No teste ficou em 3º (empatado com o mapa): rodou de primeira, a 48 fps.

**Para estudar a técnica:** `~/Projetos/VENDAS-IG/saidas/outros/teste-prompts-motion-2026-11-14/02-ecommerce/index.html` (com a marca da Shopify; só referência de código, nunca base de peça publicada), com prints e `log.txt` em `_captura/`.

## Campos obrigatórios

- Nome da loja e logo (SVG do cliente)
- Telas reais do app ou site (prints em PNG, 1170x2532 ou parecido) para a tela do celular
- 3 produtos com nome e foto recortada (PNG com fundo transparente); preço só se o segmento permitir
- Frase-conceito (até ~8 palavras, vai em tipografia cinética)
- O que a notificação diz e se é ilustrativa (ex.: "Pedido #1001 · R$ 189,00" ou "Agendamento confirmado · qui 14h")
- Cores da marca e fonte

## Prompt 16:9 (o do teste, generalizado)

```text
Crie em HTML (canvas, 1920x1080, 60fps, [20]s) o lançamento da loja online [LOJA]: fundo [COR_FUNDO] com brilho [COR_MARCA], celular 3D realista com espessura mostrando as telas reais em assets/telas/, motion blur pela velocidade de cada camada (só quando a camada anda rápido), easing forte com overshoot (nada linear, nada só com fade) e som em Web Audio a 120 BPM. Logo: assets/logo.svg. Siga o contrato da skill motion-graphics (relógio único, ?t, ?preview, window.MOTION).

Loja: [LOJA] | Produtos: [PRODUTO_1] (assets/produtos/1.png), [PRODUTO_2], [PRODUTO_3] | Frase: [FRASE] | Notificação: [TEXTO_NOTIFICACAO] (ilustrativa)

Cenas: 0s logo se monta peça por peça → 1,5s celular gira, acende e desbloqueia (tela de bloqueio com hora 9:41) → 3,6s app abre na tela assets/telas/home.png e os 3 produtos saem do celular como cartões 3D com nome [e preço] → 8,4s tela "ao vivo": mapa-múndi de pontos e o 1º visitante em [CIDADE] → 11,3s [FRASE] em tipografia cinética, uma palavra por batida, dentro da área central → 15s notificação "[TEXTO_NOTIFICACAO]" desce no topo com som de caixa → 16,4s logo e [CTA: site ou @perfil].
```

## Prompt 9:16

```text
Crie em HTML (canvas, 1080x1920, 60fps na prévia, [18]s) o lançamento da loja online [LOJA] para Reels: [mesma direção de arte, física e som do 16:9]. Respeite as zonas seguras (nada importante nos 250px de cima, nos 420px de baixo nem nos 140px da direita).

[mesmos campos]

Cenas: 0s logo se monta no centro → 1,3s celular entra de baixo girando e ocupa 60% da altura, acende e desbloqueia → 3,2s app abre (assets/telas/home.png) e os 3 produtos saem do celular como cartões empilhados na vertical, um por batida → 7,5s o celular recua e o 1º visitante aparece num globo acima dele → 10,5s [FRASE] em 2 a 3 linhas, palavra por palavra, centrada entre y=500 e y=1300 → 13,8s notificação "[TEXTO_NOTIFICACAO]" desce até y=300 com som de caixa → 15,2s logo + [CTA] no centro.
```

## O que o teste mostrou

- 48 fps ao vivo em 1920x1080: o blur por camada (1 a 12 amostras conforme a velocidade da camada) é o jeito barato de ter borrão real em canvas.
- Gerou 14 avisos de oscilador acima de 24 kHz (o "brilho" do som de caixa): limite com `hz()`.
- A tipografia cinética encostou na borda direita, e o quadro entre a notificação e o logo ficou quase vazio por ~0,5 s. Peça margem lateral fixa e um elemento de transição.
- A interface do app foi inventada em canvas. Com cliente, use os prints reais na tela do celular.
- "Use o SVG oficial do logo" fez o modelo reconstruir de memória o logo da Shopify. Com cliente, entregue o arquivo e diga o caminho.
- O botão "clique para assistir de novo" entrou no fim do MP4.

## Cuidados com cliente real

- Nada de interface, sacola ou verde da Shopify (nem de outra plataforma): é a loja do cliente.
- Número de pedido, valor e visitante são ilustrativos: não sugira faturamento que não existe.
- Segmento regulamentado (farmácia, clínica): sem preço de medicamento ou procedimento; troque "pedido" por "agendamento confirmado" ou "receita recebida". Ver `referencias/conformidade.md`.
