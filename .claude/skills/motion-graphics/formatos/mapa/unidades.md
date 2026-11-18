# Mapa · unidades (nossas unidades)

Vários pins (filiais ou pontos de venda) surgem pela cidade e a câmera visita cada um com nome e bairro.

**Para:** rede, franquia, revenda, farmácia ou clínica com filiais, "agora somos N lojas". **CTA sugerido:** "Encontre a mais perto de você". **Duração:** 20 s para 3 unidades (+2,6 s por unidade a mais; acima de 5, visite só as principais e mostre o resto no cartão). **Peças do motor:** §3, §4.1, §4.2 (vários pins).

## Campos obrigatórios

- Marca, logo e ícone
- Unidades: nome ou apelido, endereço completo, bairro, cidade, e a posição relativa entre elas
- Ordem de visita: cronológica (a mais antiga primeiro) se a história for "crescemos", senão geográfica (de cima para baixo na tela)
- Mensagem central, com número real ("agora são três lojas", "de 1 para 3 lojas em 5 meses")
- CTA e, se regulamentado, conselho e responsável técnico

## Prompt

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, [20]s) um reel "nossas unidades" para [MARCA], [SEGMENTO] em [CIDADE/REGIÃO]: cidade 3D branca procedural no estilo de app de mapa genérico (sem logo, pin ou interface do Google ou de qualquer app), câmera em órbita contínua que mistura as tomadas sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), névoa pela distância, um pin por unidade na cor [COR_MARCA] com o ícone assets/icone.svg e tamanho constante na tela, e trilha em Web Audio a 120 BPM. Parta de ~/.claude/skills/motion-graphics/formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (§3, §4.1 e §4.2), em 9:16: fov 52, cards entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do cliente (assets/logo.svg, cores [CORES], fonte [FONTE]).

Marca: [MARCA] | Unidades (na ordem de visita, com posição relativa): 1) [NOME_1] · [ENDERECO_1] · [BAIRRO_1], [CIDADE_1] | 2) [NOME_2] · [ENDERECO_2] · [BAIRRO_2], [CIDADE_2] | 3) [NOME_3] · [ENDERECO_3] · [BAIRRO_3], [CIDADE_3] | Mensagem: [MENSAGEM] | CTA: [CTA] | Responsável técnico: [NOME] · [CONSELHO]-[UF] [NUMERO]

Cenas: 0s o logo se monta no centro → 1,2s visão alta da região, a câmera em órbita lenta → 2s os pins caem um a um (0,25s entre eles) e um contador sobe até "[N] lojas" → 3,6s a câmera vai até a unidade 1: card "[NOME_1] · [BAIRRO_1]" com o endereço curto → 6,2s unidade 2 → 8,8s unidade 3 → 11,4s volta ao alto, os pins pulsam e linhas finas ligam as unidades → 13,5s "[MENSAGEM]" em tipografia grande → 15,5s cartão final: logo, as unidades em lista (nome · bairro), [CTA] e o responsável técnico.
```

**Som:** pop por pin (subindo um semitom a cada um); whoosh em cada ida a unidade; blip na entrada de cada card; acorde cheio na mensagem; riser antes do cartão.

## Exemplo real: ManipulePharma (só ilustração; não crie arquivo de cliente a partir daqui)

Farmácia de manipulação que saiu de 1 para 3 lojas em 5 meses. Ideia do reel: "agora são três lojas"; a câmera visita cada uma e fecha em "envie sua receita para a loja mais perto".

- Matriz: Av. Eusébio de Queiroz, 2880, loja 03, Palmares Open Mall, Eusébio
- Filial: Av. Washington Soares, 4000, loja 03, Parque Manibura, Fortaleza
- Filial: Av. Antônio Sales, 2333, Dionísio Torres, Fortaleza

Geografia relativa a respeitar (confirme com o cliente): Dionísio Torres fica mais ao norte, perto da Aldeota; Parque Manibura fica a sudeste, ao longo da Washington Soares; Eusébio fica ainda mais a sudeste, já na região metropolitana. Visitando matriz → Washington Soares → Antônio Sales, a câmera sobe na tela de sul para norte, o que conta a história de crescimento em direção à cidade. "Palmares Open Mall" entra só como texto.

Regras de farmácia (ver `referencias/conformidade.md`): CRF e farmacêutico responsável quando exigido, nada de anunciar medicamento manipulado nem prometer efeito. "Envie sua receita" é um CTA aceitável.

## Cuidados

- Endereço com complemento exato ("loja 03"); confirme cada unidade.
- Número da mensagem real e com prazo certo ("em 5 meses").
- Shopping onde a loja fica: nome como texto, sem logo.
