# Marcas, dados reais e profissões regulamentadas

Checklist genérico. Não substitui o código de ética de cada conselho nem orientação jurídica: na dúvida, corte o elemento e pergunte ao cliente.

## Marcas de terceiros

- O teste usou Google Maps, Shopify e Nubank como exercício. **Em conteúdo publicado, nunca recrie logo, pin, ícone, interface ou paleta de assinatura de outra empresa** (pin de quatro cores do Google, sacola da Shopify, roxo + "nu", tela do iFood, carro do Uber, balão do WhatsApp com o logo).
- Use os assets reais do cliente (logo em SVG, fotos, cores e fontes do `identidade/design-guide.md`), com caminho relativo dentro da pasta da peça.
- "Estilo de app de mapa" ou "estilo de app de streaming" é genérico: cartões brancos, rota, player. Não é cópia de uma marca.
- Marco de terceiro (shopping, universidade, terminal, estádio) aparece **só como texto**, sem logo.
- Nome de app, produto, plataforma ou artista: só os reais, fornecidos pelo cliente. Se não houver, a interface fica sem nome. O teste da música inventou "PULSO" para o app.

## Órgão público e marca de organizador

- Marca de órgão público (ex.: prefeitura, secretaria) **só com autorização escrita do organizador**. Registre quem autorizou e quando na pasta da peça.
- Brasão, hino e símbolos oficiais: não use sem norma do órgão.

## Dados reais

- Nome de rua, bairro, marco, endereço, horário, tempo de trajeto, prazo de entrega, raio de atendimento, distância de prova: **reais e confirmados com o cliente por escrito**. Guarde a lista confirmada junto do prompt.
- Tempo de trajeto: medido (app de mapa no horário comum) e escrito como "cerca de" ou "~".
- Percurso de corrida: só do organizador (mapa oficial ou GPX). Nunca invente trajeto. Se o desenho for esquemático (lista de ruas), avise na legenda que o oficial está no link.
- Dado do OpenStreetMap (ruas ou contornos reais): crédito "© colaboradores do OpenStreetMap" na legenda ou no cartão final.
- Profissional que atende em domicílio: não mostre o endereço da casa dele. Use o bairro como centro.
- Paciente, cliente ou aluno: nada de nome, rosto ou caso sem autorização de uso de imagem por escrito.

## Profissões regulamentadas

Vale para o cartão final, a legenda e qualquer texto de tela.

| Profissão | Identificação obrigatória no cartão final | Evitar |
|---|---|---|
| Dentista | nome do responsável técnico e CRO-UF nº (clínica: também o número de inscrição da clínica no CRO) | preço, promoção, desconto, parcelamento em destaque, superlativo ("o melhor", "o único"), garantia de resultado, antes/depois, depoimento de paciente |
| Médico | nome e CRM-UF nº; com especialidade, também o RQE | os mesmos, mais "cura", "sem dor", "100%" |
| Advogado | nome e OAB-UF nº (escritório: registro da sociedade) | mercantilização: preço, promoção, captação de cliente ("ligue agora"), promessa de resultado, menção a causas ganhas |
| Farmácia | nome e CRF-UF nº do farmacêutico responsável técnico quando exigido; autorização da ANVISA/vigilância quando cabível | anunciar medicamento manipulado, prometer efeito ("emagrece", "trata"), preço de medicamento, "sem receita" |
| Outros conselhos (nutrição CRN, psicologia CRP, fisioterapia CREFITO, veterinária CRMV, educação física CREF) | nome e número do conselho | promessa de resultado, antes/depois, preço como chamada |

Para todas: CTA de agendamento ou contato ("Agende pelo WhatsApp", "Envie sua receita") é aceitável; desconto e urgência ("só hoje") não.

## Trilha e voz

- Trilha sintetizada em Web Audio na própria página: sem direito de terceiro.
- Música pronta: só com licença do cliente ou biblioteca com licença comercial. Entra por `--audio trilha.wav` no `gravar.cjs`.
- Voz do `say` do macOS: rascunho para acertar o tempo. Para publicar, locução real ou TTS com licença comercial.
