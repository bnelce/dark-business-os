# Roadmap — rede de 10 canais dark (inglês)

**Status:** rascunho para aprovação · 18/11/2026
**Base:** [relatório de nichos e métodos](reports/Nichos%20e%20métodos%20canais%20dark.md) + estilos que já existem neste workspace.

---

## 1. A tese em 5 linhas

1. **10 canais em inglês**, um nicho cada, com vídeos de 10 a 20 min no YouTube (16:9). Receita principal: AdSense no mercado que paga melhor.
2. **Cada vídeo longo vira de 3 a 5 cortes** (9:16) para Shorts, Reels e TikTok. Os cortes trazem alcance e levam tráfego para o vídeo longo e para os produtos.
3. **Padrão no formato, autenticidade no conteúdo.** Cada canal tem estrutura, visual e voz fixos, mas cada vídeo tem tese, pesquisa e dados próprios. É isso que protege a rede da regra de "conteúdo inautêntico" do YouTube (em vigor desde 15/07/2025).
4. **Uma fábrica, dez marcas.** O pipeline é um só (pauta → roteiro → narração → render → cortes → publicação), com "pele" diferente por canal.
5. **Produto low cost por canal** (US$ 7 a 29), vendido pelo link fixado e pelos cortes. É a segunda fonte de receita e não depende do YPP (o Programa de Parcerias do YouTube, que libera a monetização).

---

## 2. Os 10 canais

> Os nomes são **candidatos**. Antes de criar qualquer canal, falta conferir se o @ está livre no YouTube, Instagram e TikTok, e se o domínio .com está disponível.

| # | Canal (candidato) | Nicho | Ângulo, ou o que torna o canal autêntico | RPM est.* | Risco de política |
|---|---|---|---|---|---|
| 1 | **Margin Notes** | Economia explicada | Uma pergunta econômica por vídeo, respondida com dados públicos (FRED, World Bank) e gráficos próprios | Alto | Baixo |
| 2 | **Rise & Ruin** | Histórias de empresas | Ascensão e queda de uma empresa, com a decisão que mudou tudo | Alto | Baixo |
| 3 | **Megabuilt** | Megaprojetos e engenharia | Como foi construído, quanto custou, o que deu errado | Médio-alto | Baixo |
| 4 | **Borderline** | Geografia e geopolítica | "Por que esse país/fronteira/cidade é assim", com mapas animados | Médio-alto | Baixo |
| 5 | **Inside Out Lab** | Ciência do corpo humano | O que acontece no corpo em X situações, com fontes científicas citadas | Médio-alto | Médio: saúde exige fonte e nada de conselho médico |
| 6 | **The Lost Chapter** | História em docudrama | Episódios pouco contados, narrados como história | Médio | Baixo-médio |
| 7 | **Unsolved Atlas** | Mistérios e casos não resolvidos | Caso + linha do tempo + mapa + hipóteses, com fontes | Médio | Médio: true crime exige cuidado com vítimas reais |
| 8 | **Old Gods Archive** | Mitologia e folclore mundial | Um mito por vídeo, com a origem histórica real | Médio | Baixo |
| 9 | **Quiet Compound** | Finanças pessoais (EUA) | Matemática do dinheiro com simulações próprias, sem recomendar ativos | Muito alto | Médio: exige revisão e aviso de que não é recomendação |
| 10 | **Ratio Room** | Dados e estatística do mundo | "O mundo em números": rankings, comparações, bar chart races | Médio | Baixo |

\*Faixas do relatório: finanças e negócios de US$ 8 a 25; educação, ciência, geografia e história de US$ 3 a 12. São estimativas de terceiros. O número real só aparece depois de 2 ou 3 meses de canal monetizado.

**Reserva para trocar canais que não funcionarem:** desastres aéreos, criaturas marinhas, "Living in [país]", tecnologia e IA explicadas, lore de livros de fantasia.

**Ficaram de fora de propósito:** estoicismo, motivacional, histórias de Reddit, "for sleep" e curiosidades aleatórias. Estão saturados e são os mais expostos à regra de conteúdo inautêntico.

---

## 3. Estilo de vídeo, usando o que já temos

### O que já existe neste workspace

| Ativo | Onde | Serve para |
|---|---|---|
| ~35 reels de jornalismo de dados (gráficos, mapas, contadores, linha do tempo) | `reels/src/ciencia/` | Canais 1, 9 e 10 |
| Explicativo estilo Vox com narração e família de mapas | skill `motion-graphics` | Canais 2, 3 e 4 |
| Bar chart race / CSV → vídeo | skill `chart-animation` | Canal 10 e cortes do 1 |
| Aula multicena (caderno, retratos, setas) | `/aula-reel`, `reels/src/aula/` | Canal 8 e explicações do 5 |
| Mapa mental (comparativo e radial) | `/mapa-mental` | Cortes de 6, 7 e 8 |
| Quiz relâmpago | `/reel` | Cortes de engajamento de qualquer canal |
| Narração TTS + legenda sincronizada (`*-tempos.json`) | pipeline `/reel` | Todos |
| Publicação Instagram + YouTube API (99 uploads/dia) | `scripts/`, `manager/` | Todos |

### O que falta construir (melhorias da estrutura)

1. **Formato longo 16:9:** hoje tudo é 9:16 de até 90s. Precisa de uma composição longa com **capítulos** (cada capítulo é uma cena reaproveitável), já que o vídeo de 15 min é uma sequência de 8 a 12 cenas.
2. **Voz em inglês:** uma voz fixa por canal, para virar marca. Precisa escolher o provedor de TTS e testar a naturalidade em narração longa.
3. **Kit visual por canal:** paleta, tipografia, vinheta de 3s, lower-thirds e thumbnail template (tokens em `reels/src/tokens.ts`, um tema por canal).
4. **Banco de imagens licenciado:** domínio público (Wikimedia, Library of Congress, NASA), mapas (Natural Earth) e dados (FRED, World Bank, Our World in Data). Nada de banco de imagem com só zoom em cima, que é o exemplo citado pela própria política do YouTube.
5. **Cortador automático:** do roteiro marcado com `[CORTE]` sai cada short em 9:16, com gancho próprio e CTA para o vídeo longo.
6. **Gerador de thumbnail:** HTML → PNG, como o `/carrossel`, com 3 variações por vídeo para teste A/B no YouTube.
7. **Manager multicanal:** um `Project` por canal, credenciais isoladas, fila de pauta → aprovação → publicação.

### Esqueleto de roteiro (igual em todos os canais, conteúdo sempre novo)

```
0:00  Gancho: a pergunta ou o fato estranho (≤15s)
0:15  Promessa: o que o espectador vai entender até o fim
0:45  Contexto: 2 a 3 capítulos
~8:00 Virada: o dado ou fato que muda a leitura
~12:00 Desfecho + resposta à pergunta do gancho
final  CTA: próximo vídeo + produto
```

Título e thumbnail são definidos **antes** do roteiro (método Paddy Galloway). A pauta só entra se tiver um outlier comprovado no nicho (método Peter Jordan).

---

## 4. Produtos low cost

**Regra:** cada produto nasce do material que o canal já produz (dados, mapas, pesquisa). Custo marginal quase zero.

| Canal | Produto | Preço |
|---|---|---|
| Margin Notes | Pack de planilhas "economia em gráficos" + guia PDF | US$ 9–15 |
| Rise & Ruin | E-book "50 decisões que fizeram ou quebraram empresas" | US$ 9 |
| Megabuilt | Pôsteres digitais (printable) dos megaprojetos | US$ 5–12 |
| Borderline | Pack de mapas em alta resolução (printables e para professores) | US$ 7–19 |
| Inside Out Lab | Infográficos do corpo humano (pack para estudantes) | US$ 7–12 |
| The Lost Chapter | Linha do tempo ilustrada (printable) + e-book de episódios | US$ 9 |
| Unsolved Atlas | "Case files" em PDF (dossiê com linha do tempo e fontes) | US$ 5–9 por caso, ou pack |
| Old Gods Archive | Bestiário/enciclopédia ilustrada em PDF | US$ 9–15 |
| Quiet Compound | Planilhas de orçamento e simulador de juros compostos | US$ 9–19 |
| Ratio Room | Datasets limpos + templates de visualização | US$ 9–29 |

- **Onde vender:** Gumroad ou Stan Store (aceitam vendas internacionais). O link fica na descrição, no comentário fixado e na bio dos cortes.
- **Escada de oferta, depois que um canal provar tração:** bundle de toda a rede (US$ 29–49) e um mini-curso em vídeo (US$ 19–29) nos 2 ou 3 canais que mais converterem.

---

## 5. Fases

| Fase | Duração | Entregas | Para avançar, é preciso |
|---|---|---|---|
| **0. Fundação** | 2 semanas | Nomes validados e handles reservados; kit visual dos 10; voz EN escolhida; formato longo 16:9 + cortador funcionando | Um vídeo-piloto de 12 min aprovado por você |
| **1. Piloto** | 6 semanas | 3 canais (sugestão: Margin Notes, Borderline e Unsolved Atlas, um de dados, um de mapas e um de narrativa); 2 longos + 6 cortes por semana em cada; primeiro produto no ar | Retenção média ≥35% e CTR ≥4% em pelo menos 2 canais |
| **2. Expansão** | 6 semanas | Outros 7 canais, com o formato já calibrado; manager multicanal | Os 3 do piloto a caminho do YPP (1.000 inscritos + 4.000 h) |
| **3. Escala** | contínuo | 10 canais × 2 longos/semana; dublagem PT/ES em faixa de áudio nos melhores; troca de canais fracos pelos da reserva | Receita (AdSense + produtos) acima do custo de produção |

**Cadência-alvo em regime:** 20 longos + 60 a 100 cortes por semana na rede, sempre passando pela tua aprovação de pauta e de vídeo final.

---

## 6. Métricas que vamos acompanhar

- **Por vídeo:** CTR da thumbnail, retenção média e em 30s, views em 7 dias.
- **Por canal:** inscritos/semana, horas assistidas (meta do YPP), RPM depois de monetizar e vendas de produto.
- **Por pauta:** taxa de outlier (views ÷ média do canal). As pautas vencedoras viram série.

## 7. Riscos

| Risco | Como evitar |
|---|---|
| Desmonetização por conteúdo inautêntico | Tese e dado próprios por vídeo; nada de reaproveitar roteiro; revisão humana (sua) antes de publicar |
| Direitos autorais de imagem e música | Só domínio público, licença aberta ou material gerado por nós; trilha própria ou livre de royalties |
| Saúde, finanças, true crime | Fontes citadas na tela, avisos, nada de conselho; casos tratados com respeito às vítimas |
| Limite da API (Meta e YouTube) | Fila no manager, upload espaçado, um OAuth por canal |
| Rede inteira ligada a uma conta só | Separar os canais em brand accounts do YouTube e manter credenciais isoladas no manager |

---

## 8. Decisões em aberto

1. Aprovar ou trocar os **10 nichos e nomes** da seção 2.
2. **Provedor de voz em inglês** (custo × naturalidade). Vou fazer amostras das opções.
3. **Quais 3 canais no piloto.**
4. Se a rede vira um **negócio próprio no workspace** (`negocios/<slug>/`, via `/instalar`) ou um negócio por canal.
