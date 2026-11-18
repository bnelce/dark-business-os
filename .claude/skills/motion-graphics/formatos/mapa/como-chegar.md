# Mapa · como chegar

Rota de um ponto conhecido da cidade até o negócio, com placas de GPS nas ruas reais, e "Você chegou!" na fachada ou na torre. É a variante mais próxima da referência (`referencia-16x9.html` é exatamente um "como chegar" em 16:9).

**Para:** clínica, consultório, loja, restaurante, escritório. **CTA sugerido:** "Agende pelo WhatsApp" / "Salve o endereço". **Duração:** 20 s. **Peças do motor:** §2 inteira, §3, §4.1; torre comercial: §4.8 numa versão curta (ou emende com a variante `do-estacionamento-a-sala`).

**Exemplo em produção:** reel de um dentista em Fortaleza, em um projeto de cliente (fora deste repo). Só para consulta: outro agente trabalha nessa pasta, não edite nada lá. Quando ele for aprovado, é o melhor ponto de partida em 9:16 para esta variante.

## Campos obrigatórios

- Negócio: nome, segmento (ex.: "Odontologia"), logo em SVG e ícone para o pin
- Endereço completo: rua, número, complemento (sala, andar, loja), bairro, cidade
- Fachada: térrea, loja de rua, loja de shopping ou torre (nome do prédio, andar, sala) + foto para desenhar a textura
- Foto real da recepção ou da fachada para o card do lugar (opcional; no reel do dentista ela deixou o card com cara de ficha real)
- Ponto de partida conhecido de quem vai assistir (shopping, cruzamento, terminal), real
- Ruas do trajeto, em ordem, com a manobra: "Siga pela [RUA_1]" → "Vire à direita na [RUA_2]" (2 a 3 ruas)
- Tempo real do trajeto e o modo (carro, a pé)
- Referência perto da porta ("ao lado de…"), opcional
- CTA e, se regulamentado, nome e número do conselho

## Prompt

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, 20s) um reel de como chegar para [NEGOCIO], [SEGMENTO] em [CIDADE]: cidade 3D branca procedural no estilo de app de mapa genérico (sem logo, pin ou interface do Google ou de qualquer app), câmera em órbita contínua que mistura as tomadas sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), névoa pela distância, pin na cor [COR_MARCA] com o ícone assets/icone.svg e tamanho constante na tela, placas de GPS com os nomes reais das ruas, e trilha com whooshes em Web Audio a 120 BPM. Parta de ~/.claude/skills/motion-graphics/formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (§3 e §4.1), em 9:16: fov 52, interface entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do cliente (assets/logo.svg, cores [CORES], fonte [FONTE]).

Lugar: [NEGOCIO] | Tipo: [SEGMENTO] | Endereço: [RUA], [NUMERO] · [COMPLEMENTO] · [BAIRRO], [CIDADE] | Fachada: [TERREA | LOJA | TORRE: [PREDIO], [ANDAR]º andar, sala [SALA]] (textura a partir de assets/fachada.jpg) | Partida: [PONTO_DE_PARTIDA] | Trajeto: Siga pela [RUA_1] → Vire à [direita|esquerda] na [RUA_2] → [RUA_3] | Tempo: ~[X] min de [carro|a pé] | Referência: [REFERENCIA] | CTA: [CTA] | Conselho: [NOME] · [CONSELHO]-[UF] [NUMERO]

Cenas: 0s o logo do cliente se monta no centro e vira o pin → 1s mergulho na cidade até o pin → 2,8s card do lugar (nome, tipo, endereço, botão "Como chegar" tocado em 3,6s) → 4,2s visão geral com o ponto "você está aqui" em [PONTO_DE_PARTIDA] → 5,4s a rota se desenha de cima para baixo na tela; pílula de GPS "Siga pela [RUA_1]" e placa presa à rua → 8,5s "Vire à [direita] na [RUA_2]" com a placa → 11s [REFERENCIA] aparece como marco cinza → 12,5s fachada: "Você chegou!" com anéis no pin → 14,5s [se torre: a câmera sobe pela fachada até o [ANDAR]º andar e a etiqueta "Sala [SALA]" acende] → 16,8s cartão final: logo, nome, endereço, "~[X] min de [PONTO_DE_PARTIDA]", [CTA] e [CONSELHO].
```

**Som:** base 120 BPM; whoosh em 1 s, 4,2 s, 12,5 s e 16,8 s; blip no toque do botão e em cada placa; três sinos na chegada; riser de 15 s a 16,8 s.

## Cuidados

- Ponto de partida é um lugar público conhecido, nunca "a casa do paciente".
- Torre comercial: a fachada de prédio alto pede outra textura (vidro, número do prédio, portaria). Se a dúvida do público é "onde estaciono e qual sala", faça a variante `do-estacionamento-a-sala`.
- Saúde: nada de "o melhor dentista da cidade" nem preço. CRO no cartão final.
- Nota e número de avaliações no card ("5,0 · 55 avaliações"): só se reais e atuais, sem logo de plataforma, e em profissão regulamentada confira o código do conselho antes, porque pode contar como depoimento.
- Ruas e manobras conferidas no mapa e com o cliente; o tempo escrito com "~".
