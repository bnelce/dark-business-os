# Mapa · do estacionamento à sala

Trajeto interno de um prédio comercial: a torre vista de fora se abre em corte, e a rota vai da entrada da garagem à vaga, ao elevador, ao andar e à porta da sala, com cronômetro. Ex.: "do estacionamento até a Sala 214 em 1 minuto".

**Para:** clínica ou escritório em torre comercial, consultório em shopping ou centro médico, coworking. **CTA sugerido:** "Do estacionamento à Sala [N] em [TEMPO]. Agende pelo WhatsApp". **Duração:** 20 s. **Peças do motor:** §3, §4.1, §4.8 (prédio em corte), §4.9 (cronômetro).

## Campos obrigatórios

- Negócio, logo (vai na porta) e ícone
- Nome do prédio e endereço; rua da entrada do estacionamento
- Nível da garagem (G1, subsolo 2...) e tipo: rotativo, conveniado, gratuito, pago (com valor, se quiser mostrar)
- Elevador (bloco, torre, social ou serviço), andar e número da sala
- Portaria: precisa se identificar? cadastro? documento?
- **Tempo real cronometrado** do carro até a porta
- Foto da recepção e da porta (referência de textura); conselho, se regulamentado

## Prompt

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, 20s) um reel "do estacionamento à sala" para [NEGOCIO], [SEGMENTO], na [SALA] do [PREDIO] em [CIDADE]: cidade 3D branca procedural ao redor no estilo de app de mapa genérico (sem logo, pin ou interface do Google ou de qualquer app), câmera em órbita contínua sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), torre comercial que se abre em corte (clipping planes) mostrando garagem, poço do elevador e o andar, rota interna que se desenha no piso e sobe pelo elevador como um tubo de luz, cronômetro amarrado ao progresso, e trilha em Web Audio a 120 BPM. Parta de ~/.claude/skills/motion-graphics/formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (§3, §4.1, §4.8 e §4.9), em 9:16: fov 52, interface entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do cliente (assets/logo.svg, cores [CORES], fonte [FONTE]).

Negócio: [NEGOCIO] | Prédio: [PREDIO] · [ENDERECO] | Garagem: entrada pela [RUA_GARAGEM], nível [NIVEL], [rotativo|conveniado|pago] | Elevador: [BLOCO] | Andar: [ANDAR]º | Sala: [SALA] | Portaria: [identifique-se na recepção | acesso livre] | Tempo real: [TEMPO] | CTA: [CTA] | Conselho: [CONSELHO]

Cenas: 0s a torre vista de fora em órbita, com o nome [PREDIO] na fachada → 2s corte: o topo e a fachada se abrem e mostram o prédio por dentro → 3,4s garagem [NIVEL]: a rota entra pela [RUA_GARAGEM], vai até uma vaga e da vaga ao elevador; placa "Estacionamento [tipo]"; o cronômetro começa em 0:00 → 7s elevador: o tubo de luz sobe pelo poço, contador "[NIVEL] → [ANDAR]º andar" → 9,6s [se houver portaria: "Identifique-se na recepção" no hall do andar] → 10,5s corredor do [ANDAR]º andar: a rota vai do elevador até a porta → 13s porta com o logo e "Sala [SALA]": "Você chegou!" e o cronômetro para em [TEMPO] → 15s a câmera recua para fora da torre → 16,5s cartão final: "Do estacionamento à Sala [SALA] em [TEMPO]", endereço, [CTA] e [CONSELHO].
```

**Som:** whoosh no corte; passos discretos (cliques filtrados) na garagem e no corredor; "ding" de elevador e zumbido subindo com o contador; sino na porta; riser antes do cartão.

## Cuidados

- O tempo do título tem que ser verdade: cronometre ou peça ao cliente para cronometrar no horário de pico.
- A planta é esquemática (o cliente não precisa entregar a planta real), mas a ordem e os nomes sim: rua da garagem, nível, elevador, andar, sala.
- Estacionamento pago: diga. Vaga PCD e elevador acessível, se houver, valem uma placa.
- Saúde: conselho no cartão final; sem promessa.
