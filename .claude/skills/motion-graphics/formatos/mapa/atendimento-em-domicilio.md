# Mapa · atendimento em domicílio

O raio de atendimento se expande a partir do bairro-base e os bairros dentro dele acendem em onda.

**Para:** manicure, cabeleireira, técnico de informática ou de ar-condicionado, personal, fisioterapeuta, cuidador, chaveiro. **CTA sugerido:** "Vou até você. Agende pelo WhatsApp". **Duração:** 17 s. **Peças do motor:** §3, §4.1, §4.3 (bairros), §4.4 (anel do raio).

## Campos obrigatórios

- Profissional ou negócio, serviço, logo ou ícone do serviço
- **Bairro-base** (nunca o endereço da casa do profissional)
- Raio de atendimento em km
- Bairros atendidos dentro do raio, confirmados (e se algum bairro fora do raio também é atendido)
- Taxa de deslocamento, se houver e se o segmento permitir mostrar
- Horários e CTA; conselho, se regulamentado (fisioterapia CREFITO, educação física CREF)

## Prompt

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, 17s) um reel de atendimento em domicílio para [PROFISSIONAL], [SERVICO] em [CIDADE]: cidade 3D branca procedural no estilo de app de mapa genérico (sem logo, pin ou interface do Google ou de qualquer app), câmera em órbita contínua sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), névoa pela distância, pin na cor [COR_MARCA] com o ícone assets/icone.svg no centro do bairro-base, anel de raio que se expande com overshoot, bairros que acendem em onda, e trilha em Web Audio a 120 BPM. Parta de ~/.claude/skills/motion-graphics/formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (§3, §4.1, §4.3 e §4.4), em 9:16: fov 52, rótulos entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do cliente (assets/logo.svg, cores [CORES], fonte [FONTE]).

Profissional: [PROFISSIONAL] | Serviço: [SERVICO] | Base: [BAIRRO_BASE] (centro do bairro, sem endereço) | Raio: [R] km | Bairros atendidos: [BAIRRO_1], [BAIRRO_2], [BAIRRO_3], [BAIRRO_4], [BAIRRO_5], [BAIRRO_6] | Horários: [HORARIOS] | [Taxa: …] | CTA: [CTA] | Conselho: [CONSELHO]

Cenas: 0s o ícone do serviço vira o pin no centro de [BAIRRO_BASE] → 1,2s a câmera sobe em órbita → 2,4s o raio se expande até [R] km com borda pulsante e o rótulo "Atendo até [R] km" → 4,2s os bairros dentro do raio acendem em onda, do centro para fora, cada um com o nome → 9s ícones de casa com check surgem em 4 a 5 pontos dentro do raio, um por batida, com "Vou até você" → 11,5s a câmera dá uma volta lenta mostrando a área → 13,5s cartão final: nome, serviço, "Atendo [lista curta] e região", horários, [CTA] e [CONSELHO].
```

**Som:** pop no pin; pulso grave quando o raio abre; notas em arpejo na onda de bairros; um "plim" por casa; riser antes do cartão.

## Cuidados

- **Privacidade:** o centro do raio é o bairro, não a casa de quem atende. Nada de rua ou número da residência.
- Casas com check são genéricas, sem endereço de cliente.
- Raio e bairros confirmados; se o atendimento fora do raio tem taxa extra, diga no cartão ou na legenda.
