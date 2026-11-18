# Mapa · área de entrega

Os bairros atendidos acendem um a um, cada um com o prazo de entrega, e fecha em "peça pelo link da bio".

**Para:** delivery, confeitaria, restaurante, mercado de bairro, lavanderia, farmácia com entrega. **CTA sugerido:** "Peça pelo link da bio" / "Chama no WhatsApp". **Duração:** 18 s. **Peças do motor:** §3, §4.1, §4.3 (bairros).

## Campos obrigatórios

- Negócio, logo, ícone para o pin (bolo, sacola, prato)
- Bairro de origem (onde fica a cozinha ou a loja)
- Bairros atendidos, reais e confirmados, com o prazo ou a faixa de cada um ("até 40 min", "mesmo dia")
- Posição relativa de cada bairro em relação ao negócio (norte, sul, leste, oeste; quem faz divisa com quem)
- Horário de entrega e canal de pedido
- Taxa ou pedido mínimo, se o cliente quiser mostrar

## Prompt

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, 18s) um reel de área de entrega para [NEGOCIO], [SEGMENTO] em [CIDADE]: cidade 3D branca procedural no estilo de app de mapa genérico (sem logo, pin ou interface do Google ou de qualquer app de delivery), câmera em órbita contínua que mistura as tomadas sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), névoa pela distância, pin na cor [COR_MARCA] com o ícone assets/icone.svg e tamanho constante na tela, bairros que acendem na cor da marca com contorno, e trilha em Web Audio a 120 BPM. Parta de ~/.claude/skills/motion-graphics/formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (§3, §4.1 e §4.3), em 9:16: fov 52, rótulos entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do cliente (assets/logo.svg, cores [CORES], fonte [FONTE]).

Negócio: [NEGOCIO] | Origem: [BAIRRO_0] | Bairros (do mais perto ao mais longe, com posição relativa): [BAIRRO_1] ([N|S|L|O]) · [PRAZO_1] | [BAIRRO_2] ([…]) · [PRAZO_2] | [BAIRRO_3] · [PRAZO_3] | [BAIRRO_4] · [PRAZO_4] | [BAIRRO_5] · [PRAZO_5] | Horário: [HORARIO] | Canal: [CANAL] | [Taxa/pedido mínimo: …]

Cenas: 0s o logo vira o pin em [BAIRRO_0] → 1,2s a câmera sobe em órbita até ver a cidade de cima (inclinação 70°) → 2,6s [BAIRRO_0] acende com a etiqueta "[BAIRRO_0] · [PRAZO_0]" → a cada 1,2s o próximo bairro acende com "[BAIRRO] · [PRAZO]" (até 7 bairros, do mais perto ao mais longe) → 11s todos acesos, o contorno geral pulsa e aparece "Entregamos em toda essa área" → 13s a câmera desce de volta ao pin → 14,5s cartão final: logo, "Peça pelo link da bio", horário de entrega e [CANAL].
```

**Som:** pop grave no pin; uma nota da escala por bairro, subindo um grau a cada um; whoosh na subida e na descida da câmera; riser de 13 s a 14,5 s.

## Cuidados

- Bairro fora da lista não acende, nem "por estética". A posição relativa tem que bater com a cidade real.
- Prazo é compromisso: confirme com o cliente e use "até" ou faixa.
- Sem logo, cor ou tela de iFood, Rappi ou similar.
- Mais de 7 bairros: acenda em grupos (zona norte, zona sul) e liste todos no cartão final ou na legenda.
