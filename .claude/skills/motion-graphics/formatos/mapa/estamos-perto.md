# Mapa · estamos perto (onde estamos)

Anéis de 5, 10 e 15 minutos se expandem a partir do negócio, e marcos conhecidos (shopping, universidade, terminal) aparecem com o tempo até lá.

**Para:** quem quer dizer "é perto de você": clínica, academia, escola, curso, loja de bairro, salão. **CTA sugerido:** "Pertinho de você. Agende pelo WhatsApp". **Duração:** 18 s. **Peças do motor:** §3, §4.1, §4.2 (marcos), §4.4 (anéis).

## Campos obrigatórios

- Negócio, endereço, logo e ícone
- Modo de deslocamento dos anéis: carro, a pé ou ônibus (um só)
- 3 marcos reais, cada um com o tempo **medido** até o negócio e a direção relativa (norte, sul...)
- CTA e, se regulamentado, conselho

## Prompt

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, 18s) um reel "estamos perto" para [NEGOCIO], [SEGMENTO] em [CIDADE]: cidade 3D branca procedural no estilo de app de mapa genérico (sem logo, pin ou interface do Google ou de qualquer app), câmera em órbita contínua que mistura as tomadas sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), névoa pela distância, pin na cor [COR_MARCA] com o ícone assets/icone.svg e tamanho constante na tela, anéis de tempo que se expandem com overshoot, marcos em pins cinza menores, e trilha em Web Audio a 120 BPM. Parta de ~/.claude/skills/motion-graphics/formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (§3, §4.1, §4.2 e §4.4), em 9:16: fov 52, rótulos entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do cliente (assets/logo.svg, cores [CORES], fonte [FONTE]).

Negócio: [NEGOCIO] | Endereço: [ENDERECO] | Modo: de [carro|a pé|ônibus] | Anéis: 5, 10 e 15 min (estilizados) | Marcos: [MARCO_1] ([DIRECAO]) · ~[T1] min | [MARCO_2] ([DIRECAO]) · ~[T2] min | [MARCO_3] ([DIRECAO]) · ~[T3] min | CTA: [CTA] | Conselho: [CONSELHO]

Cenas: 0s o logo vira o pin → 1,2s a câmera sobe em órbita → 2,6s anel de 5 min se expande do pin com o rótulo "5 min de [carro]" → 4s anel de 10 min → 5,4s anel de 15 min → 6,8s a câmera vai até [MARCO_1]: pin cinza, "[MARCO_1] · ~[T1] min" e uma linha tracejada até o negócio → 8,6s [MARCO_2] do mesmo jeito → 10,4s [MARCO_3] → 12,2s volta ao negócio, os anéis pulsam e aparece "Pertinho de você" → 14,5s cartão final: logo, endereço, "~[T1] min do [MARCO_1]", [CTA] e [CONSELHO].
```

**Som:** pop no pin; para cada anel, um pulso de sub grave com brilho agudo; whoosh em cada ida a marco; sino na volta; riser antes do cartão.

## Cuidados

- Tempo real não é um círculo: os anéis são estilização. O que precisa estar certo é a ordem e a direção dos marcos (um marco a ~4 min aparece dentro do anel de 5).
- Tempo medido num app de mapa em horário comum, escrito com "~", e o modo explícito ("de carro").
- Marco é só texto: nada de logo de shopping ou universidade.
