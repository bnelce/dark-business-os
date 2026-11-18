# Mapa · rastreio do pedido

Uma moto (ou carro) sai da loja e anda pela rota com o tempo de chegada caindo, até a porta: "Seu pedido chegou!".

**Para:** delivery próprio de restaurante, confeitaria, mercado, farmácia, lavanderia. **CTA sugerido:** "Peça agora pelo [canal]". **Duração:** 18 s. **Peças do motor:** §3, §4.1, §4.5 (veículo e tempo de chegada).

## Campos obrigatórios

- Negócio, logo (vai no baú ou na sacola) e ícone
- Veículo: moto, carro ou bicicleta
- Tempo médio real de entrega
- Loja de saída (endereço) e um bairro de destino real, perto, que sirva de exemplo
- 2 a 3 ruas reais do caminho, em ordem
- Canal de pedido e horário

## Prompt

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, 18s) um reel de rastreio de pedido para [NEGOCIO], [SEGMENTO] em [CIDADE]: cidade 3D branca procedural no estilo de app de mapa genérico (sem logo, pin ou interface do Google, iFood ou de qualquer app), câmera de perseguição em órbita contínua sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), névoa pela distância, [moto|carro] low-poly com o baú na cor [COR_MARCA] e o logo, rota que se desenha atrás do veículo, placas com os nomes reais das ruas, chip de tempo de chegada caindo, e trilha em Web Audio a 120 BPM com ronco de motor filtrado. Parta de ~/.claude/skills/motion-graphics/formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (§3, §4.1 e §4.5), em 9:16: fov 52, interface entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do cliente (assets/logo.svg, cores [CORES], fonte [FONTE]).

Negócio: [NEGOCIO] | Saída: [ENDERECO_LOJA] | Destino de exemplo: [BAIRRO_DESTINO] | Caminho: [RUA_1] → [RUA_2] → [RUA_3] | Veículo: [moto] | Tempo médio: ~[X] min | Canal: [CANAL] | Horário: [HORARIO]

Cenas: 0s notificação com o ícone e o nome do cliente desce até y=300: "Seu pedido saiu para entrega" → 1,4s mergulho até a loja; a [moto] sai pela porta → 3s a [moto] anda pela rota com câmera de perseguição, a rota se desenha atrás e o chip "Chega em [X] min" vai caindo; placa "[RUA_1]" → 6,5s curva na [RUA_2] com a placa → 9,5s [RUA_3] → 11,8s a [moto] para na porta de uma casa genérica em [BAIRRO_DESTINO] → 12,6s "Seu pedido chegou!" com check e o tempo final "~[X] min" → 14,5s cartão final: logo, "Peça agora pelo [CANAL]" e o horário.
```

**Som:** ronco de dente-de-serra 60–90 Hz com passa-baixa acompanhando a velocidade; whoosh nas curvas; blip a cada minuto que cai; campainha na chegada; riser antes do cartão.

## Cuidados

- "Tempo médio" ou "cerca de": o vídeo não pode virar promessa de prazo.
- Destino genérico (um bairro), nunca o endereço de uma pessoa.
- Sem visual de app de entrega de terceiros; a notificação é do cliente.
- Farmácia: nada de medicamento na sacola nem na tela.
