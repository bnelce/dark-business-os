# Mapa · evento

O local do evento com entradas, estacionamento e pontos de referência, uma rota curta de acesso, e a data em contagem regressiva no cartão final.

**Para:** festa, show, baile, feira, congresso, formatura, evento com inscrição. Corrida ou passeio com trajeto: use `percurso-de-corrida`. **CTA sugerido:** "Inscreva-se no link da bio" / "Garanta seu ingresso". **Duração:** 20 s. **Peças do motor:** §3, §4.1, §4.2 (rótulos de entrada e referência), rota da §2, §4.9 (contagem).

## Campos obrigatórios

- Nome do evento, organizador, marca e cores do evento
- Data e hora; **data de publicação do reel** (a contagem "faltam N dias" só vale nesse dia)
- Local: nome e endereço
- Entradas (nome e rua de cada uma), estacionamento (onde, se é pago, se tem vaga para PCD), 2 a 3 pontos de referência
- Via principal de acesso
- Link ou CTA de inscrição
- Autorização escrita para usar marca de órgão público ou patrocinador, se houver

## Prompt

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, 20s) um reel de evento para [EVENTO], de [ORGANIZADOR], em [CIDADE]: cidade 3D branca procedural no estilo de app de mapa genérico (sem logo, pin ou interface do Google ou de qualquer app), câmera em órbita contínua sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), névoa pela distância, pin na cor [COR_EVENTO] com o ícone do evento (assets/icone.svg) e tamanho constante na tela, rótulos presos ao 3D para entradas e estacionamento, e trilha em Web Audio a [124] BPM. Parta de ~/.claude/skills/motion-graphics/formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (§3, §4.1, §4.2 e §4.9), em 9:16: fov 52, rótulos entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do evento (assets/logo.svg, cores [CORES], fonte [FONTE]).

Evento: [EVENTO] | Data: [DIA] de [MES], [HORA] | Local: [LOCAL] · [ENDERECO] | Entradas: [ENTRADA_1] ([RUA]), [ENTRADA_2] ([RUA]) | Estacionamento: [ONDE] · [pago|gratuito] | Referências: [REF_1], [REF_2] | Acesso: pela [VIA_PRINCIPAL] | Publicação do reel: [DATA_PUBLICACAO] (faltam [N] dias) | CTA: [CTA]

Cenas: 0s a data "[DIA] [MES]" estoura em tipografia grande no centro e vira o pin → 1,4s mergulho no local → 3s card do evento: nome, data, horário, local → 4,8s órbita ao redor do local: seta e rótulo "[ENTRADA_1]" no portão da [RUA] → 7s "[ENTRADA_2]" → 8,8s estacionamento: área com "P", vagas desenhadas e "[ONDE] · [pago|gratuito]" → 10,6s referências: "[REF_1]" e "[REF_2]" como marcos cinza → 12,4s rota curta desde a [VIA_PRINCIPAL] até a [ENTRADA_1] → 15s cartão final: logo do evento, "Faltam [N] dias" com os dígitos rolando até [N], data e hora, [CTA].
```

**Som:** batida de [124] BPM desde o começo; impacto grave quando a data estoura; whoosh a cada rótulo; riser na rota; acorde cheio e "tique" na rolagem dos dígitos.

## Cuidados

- A contagem usa datas explícitas no código (publicação → evento), nunca `Date.now()`. Se a data de publicação não estiver fechada, troque por "dia [DIA] de [MES]".
- Planta do local é esquemática; entradas, estacionamento e referências são reais e confirmados.
- Marca de órgão público, patrocinador ou artista: só com autorização escrita (anote quem autorizou no `prompt.md`).
