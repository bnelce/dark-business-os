# Mapa · mudamos de endereço

O pin salta do endereço antigo para o novo, com a rota entre os dois se desenhando embaixo, e cai com "Agora estamos aqui".

**Para:** qualquer negócio que mudou de lugar: clínica, loja, escritório, academia. **CTA sugerido:** "Agora estamos aqui. Mesmo WhatsApp". **Duração:** 18 s. **Peças do motor:** §3, §4.1, rota da §2 (de um endereço ao outro), fachada (`facadeTex`).

## Campos obrigatórios

- Negócio, logo e ícone
- Endereço antigo e endereço novo (rua, número, complemento, bairro)
- Data a partir da qual atende no novo endereço
- Foto da fachada nova (para a textura)
- 2 referências perto do novo endereço
- O que não muda (telefone, WhatsApp, horário), se o cliente quiser dizer
- Conselho, se regulamentado (endereço novo também muda no registro da clínica)

## Prompt

```text
Crie em HTML (Three.js, 1080x1920, 60fps na prévia, 18s) um reel "mudamos de endereço" para [NEGOCIO], [SEGMENTO] em [CIDADE]: cidade 3D branca procedural no estilo de app de mapa genérico (sem logo, pin ou interface do Google ou de qualquer app), câmera em órbita contínua sem cortes, motion blur real (16 sub-quadros na exportação, 2 com ?preview), névoa pela distância, pin na cor [COR_MARCA] com o ícone assets/icone.svg e tamanho constante na tela, salto do pin em arco com rastro, rota entre os dois endereços, e trilha em Web Audio a 120 BPM. Parta de ~/.claude/skills/motion-graphics/formatos/mapa/referencia-16x9.html e do motor em formatos/mapa/_motor.md (§3 e §4.1), em 9:16: fov 52, interface entre y=250 e y=1500 e longe dos 140px da direita. Cartão final com a identidade do cliente (assets/logo.svg, cores [CORES], fonte [FONTE]).

Negócio: [NEGOCIO] | Antes: [ENDERECO_ANTIGO] · [BAIRRO_ANTIGO] | Agora: [ENDERECO_NOVO] · [BAIRRO_NOVO] (fachada em assets/fachada.jpg) | A partir de: [DATA] | Referências perto: [REF_1], [REF_2] | Não muda: [mesmo WhatsApp/telefone/horário] | CTA: [CTA] | Conselho: [CONSELHO]

Cenas: 0s o pin da marca no endereço antigo, desbotado, com a etiqueta "Antes: [ENDERECO_ANTIGO]" → 2s o pin salta num arco alto, com rastro e borrão, enquanto a rota entre os dois endereços se desenha embaixo → 5s o pin cai no endereço novo com quique e anéis → 5,8s "Agora estamos aqui" e a câmera desce até a fachada nova → 9s referências perto: "[REF_1]" e "[REF_2]" → 11,5s a câmera sobe; o endereço antigo fica com um "x" discreto → 13,5s cartão final: endereço novo, "a partir de [DATA]", "[NAO_MUDA]", [CTA] e [CONSELHO].
```

Arco do salto (em `setState`): `u = eInOut((ts - 2) / 3)`, posição = `lerp(antigo, novo, u)` com `y = base + 4 * ALTURA * u * (1 - u)`; o rastro são 6 cópias do pin com opacidade decrescente em `u − 0,03k`.

**Som:** "boing" grave subindo na decolagem; whoosh longo no arco; impacto + sinos na queda; whoosh na descida até a fachada; riser antes do cartão.

## Cuidados

- O endereço antigo aparece claramente como antigo (desbotado, "Antes:"), para ninguém salvar o errado.
- Data confirmada; se houver período de transição, diga.
- Profissão regulamentada: o cartão traz o endereço novo junto com o registro.
