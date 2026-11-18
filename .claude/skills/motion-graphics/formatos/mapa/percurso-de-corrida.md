# Mapa · percurso de corrida (mapa do percurso)

Apresenta o percurso de uma corrida de rua: abertura com a marca e as distâncias, a câmera desce no pórtico de largada, o percurso se desenha pelas ruas reais com marcadores de km, hidratação, retorno e a diferença entre os trajetos de cada distância, a altimetria se preenche junto, chegada no pórtico e cartão final com retirada de kit e inscrição.

**Para:** corrida de rua, caminhada, passeio ciclístico, desfile ou procissão com trajeto. **CTA sugerido:** "Inscreva-se: [link]". **Duração:** 25 s. **Peças do motor:** §3, §4.6 (trajeto real), §4.7 (corredor na cidade), §4.10 (altimetria), §4.1 (pino do pórtico/pontos), §4.9 (opcional, contagem).

**Exemplo real que o usuário quer fazer:** corrida de rua organizada por um órgão público.

## Campos obrigatórios

- Nome do evento, organizador, marca e cores do organizador
- Data e hora da largada
- Distâncias (ex.: 5K e 10K)
- Ponto de largada e de chegada (nome do local, com o pórtico)
- **Percurso oficial:** GPX, KML, GeoJSON ou lista de coordenadas de cada distância (preferido); senão, a lista ordenada de ruas de cada distância com o sentido e a metragem de cada trecho
- Posições de hidratação e de retorno; marcadores de km oficiais, se o organizador tiver
- Kit: local, datas e horários de retirada
- Link de inscrição
- **Autorização escrita para usar a marca de órgão público** (qualquer um)

## Preparar o percurso

```bash
SK=~/.claude/skills/motion-graphics/scripts
# GPX oficial (um arquivo por distância, ou um GPX com várias <trk>; <wpt> viram hidratação, retorno etc.)
node $SK/percurso.cjs assets/5k.gpx assets/10k.gpx --nomes "5K,10K" --saida assets/percurso.json
# Sem GPX: lista de ruas, na ordem oficial (fica esquemático)
node $SK/percurso.cjs --segmentos assets/ruas.txt --saida assets/percurso.json
```

`ruas.txt`:

```
== 5K
[RUA_1] | L | 1200
@ Hidratação 1
[RUA_2] | S | 300
@ Retorno
...
== 10K
...
```

O script imprime a distância medida de cada trajeto, os marcos de km e a faixa de altitude. Confira com a distância oficial: diferença de algumas dezenas de metros é normal no GPX; mostre na tela a distância **oficial** ("5 km"), não a medida. Marcadores de km oficiais do organizador têm prioridade sobre os calculados.

## Prompt

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, 25s) um reel do percurso da [EVENTO], de [ORGANIZADOR], em [CIDADE]: cidade 3D branca procedural no estilo de app de mapa genérico (sem logo, pin ou interface do Google ou de qualquer app), com um corredor aberto ao longo do percurso real (assets/percurso.json embutido na página), câmera em órbita contínua que acompanha a ponta do percurso sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), névoa pela distância, um trajeto por distância em cores diferentes ([COR_5K] para o 5K, [COR_10K] para o 10K), marcadores de km, copos nos pontos de hidratação, seta no retorno, placas com os nomes reais das ruas, faixa de altimetria [se houver dado], pórtico de largada e chegada com a marca do evento, e trilha em Web Audio a 132 BPM. Parta de ~/.claude/skills/motion-graphics/formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (§3, §4.6, §4.7 e §4.10), em 9:16: fov 52, interface entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do organizador (assets/logo.svg, cores [CORES], fonte [FONTE]).

Evento: [EVENTO] | Organizador: [ORGANIZADOR] | Data: [DIA] de [MES], largada às [HORA] | Distâncias: [5K] e [10K] | Largada: [LOCAL_LARGADA] | Chegada: [LOCAL_CHEGADA] | Percurso: assets/percurso.json ([GPX oficial | esquemático a partir da lista de ruas]) | Ruas, em ordem: 5K: [RUA_1] → [RUA_2] → …; 10K: [RUA_1] → … | Hidratação: [km X, km Y] | Retorno: [onde] | Kit: [LOCAL_KIT], [DATAS_KIT] | Inscrição: [LINK]

Cenas: 0s abertura: marca do evento, "[DIA] [MES]" e "[5K] · [10K]" em tipografia grande → 2,2s a câmera desce na largada: pórtico com a marca e "LARGADA" → 3,8s buzina; o percurso do [5K] se desenha pelas ruas reais na [COR_5K], com as placas das ruas na ordem; "1 km", "2 km"... surgem quando a ponta passa; copo nos pontos de hidratação; seta no retorno; a faixa de altimetria embaixo se preenche junto → 10,5s a partir do ponto onde os trajetos se separam, o trecho exclusivo do [10K] continua na [COR_10K], com os mesmos marcadores, e a legenda de cores aparece → 17,8s chegada no pórtico: "CHEGADA", confete e plateia → 20s cartão final: data, horário da largada, local e horário de retirada do kit, "Inscreva-se: [LINK]" e as marcas do organizador.
```

Pórtico: duas colunas (caixas) e uma viga com a marca em textura de canvas, na posição do primeiro/último ponto do trajeto; "LARGADA"/"CHEGADA" na viga.

**Som:** 132 BPM; buzina de largada (duas notas quadradas); passos ritmados (cliques filtrados) durante o desenho; blip a cada km; "glub" curto nos copos; ruído rosa filtrado subindo como plateia na chegada; riser antes do cartão.

## Checklist da variante

- [ ] Percurso veio do organizador (mapa oficial ou GPX). **Nunca inventar o trajeto.**
- [ ] Se esquemático (lista de ruas): legenda avisa que o mapa oficial está no link de inscrição
- [ ] Distâncias, ruas, hidratação e retorno conferidos com o mapa oficial
- [ ] **Marca de órgão público (ex.: prefeitura) só com autorização escrita do organizador**, anotada no `prompt.md` (quem autorizou e quando)
- [ ] Altimetria só com dado real do GPX; sem dado, sem faixa
- [ ] Data, horário, kit e link conferidos no regulamento
- [ ] Crédito do OpenStreetMap se o traçado veio do OSM
