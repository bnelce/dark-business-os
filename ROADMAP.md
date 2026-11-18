# Roadmap — Dark Business OS

Proposta viva: muda conforme o piloto ensina. Última revisão: 18/11/2026.

## O que é

Um sistema operacional para uma **rede de canais faceless no YouTube em inglês**.
Cada canal publica vídeos longos (10 a 20 min, 16:9), cortados em 3 a 5 shorts (9:16)
para Shorts, Reels e TikTok, e vende um produto low cost do próprio nicho.

O repositório é **só o motor**, reutilizável por outra rede: código, skills do Claude
Code e modelos. Os dados de cada rede (canais, pautas, roteiros, fontes, métricas)
ficam no banco, a mídia no MinIO e os segredos nos `.env`.

## Como funciona

Claude faz a pesquisa e a produção. LLMs por API e servidores MCP ajudam. Um humano aprova nos
portões. O **painel** (Next.js + Postgres, em `manager/`) mostra o processo inteiro.

```
1 Radar → 2 Pauta → 3 Embalagem ✋ → 4 Pesquisa → 5 Roteiro → 6 Voz → 7 Montagem
        → Revisão ✋ → 8 Publicação → 9 Análise ─┐
   ▲                                              │
   └──────── vencedores viram série ──────────────┘
```

| Etapa | O que acontece | Ferramenta |
|---|---|---|
| 1 Radar | Coleta diária dos canais de referência; detecta outliers (≥3x a mediana do canal), velocidade, brechas e tendências | YouTube Data API + worker do painel |
| 2 Pauta | Claude interpreta o sinal ("por que funcionou") e propõe o nosso ângulo | MCP `dark-rede` |
| 3 Embalagem ✋ | 5 a 10 títulos e 3 thumbnails antes do roteiro | Gerador de thumb (HTML → PNG) |
| 4 Pesquisa | Fontes primárias registradas, dado próprio | gpt-researcher (a avaliar) |
| 5 Roteiro | Esqueleto fixo (gancho, promessa, capítulos, virada, desfecho, CTA) com `[CORTE]` marcado | Claude + revisões no banco |
| 6 Voz | TTS em inglês, uma voz por canal | Kokoro / Chatterbox / OpenAI (amostras) |
| 7 Montagem | Longo 16:9 em cenas reaproveitáveis + cortes 9:16 | Remotion |
| Revisão ✋ | Humano aprova o vídeo final | Painel |
| 8 Publicação | YouTube + cortes espalhados na semana | Fila do painel |
| 9 Análise | CTR, retenção, views ÷ média → ajusta o canal | YouTube Analytics |

## Regras que não mudam

- Política de "conteúdo inautêntico" do YouTube: padrão no formato, **autenticidade no
  conteúdo** (tese, pesquisa e dados próprios em cada vídeo).
- Toda afirmação tem fonte. Cada versão de pauta e roteiro fica salva (prova de processo).
- Imagens só de domínio público, licença aberta ou geradas por nós. Marcar voz sintética no upload.
- Nada é publicado sem aprovação explícita.

## Fases

### Fase 0 — Fundação (agora)
- [x] Estrutura do repo, regras, skills `/novo-canal` e `/instalar`
- [x] Repo público e limpo (motor sem dados)
- [x] Banco da rede (schema de canais, Radar, pautas, vídeos, revisões), import dos canais
- [x] MCP `dark-rede` mínimo (canais)
- [ ] **Radar**: coleta diária + detecção de sinais + MCP do Radar
- [ ] Canais de referência dos 3 canais do piloto (20 a 40 cada)
- [ ] Telas Rede e Radar no painel
- [ ] Amostras de voz TTS em inglês e escolha
- [ ] Formato longo 16:9 em capítulos + cortador `[CORTE]` → 9:16 + gerador de thumbnail
- [ ] Pipeline no painel (kanban por etapa, revisões, fontes)
- [ ] Vídeo-piloto de ~12 min aprovado ← **critério de saída**

### Fase 1 — Piloto (6 semanas)
3 canais: **Margin Notes** (economia com dados), **Borderline** (geografia e mapas),
**Unsolved Atlas** (mistérios). 2 longos + 6 cortes por semana por canal. Primeiro produto
no ar. Meta: retenção média ≥35% e CTR ≥4% em pelo menos 2 canais.

### Fase 2 — Expansão
Até 10 canais (Rise & Ruin, Megabuilt, Inside Out Lab, The Lost Chapter, Old Gods
Archive, Quiet Compound, Ratio Room). OAuth por canal, painel de métricas por canal.

### Fase 3 — Escala
Dublagem PT/ES em faixa de áudio, VPS para coleta 24h, séries a partir dos vencedores.

## Prazo crítico

Entrar no YouTube Partner Program antes de **01/02/2027**: segundo uma fonte ainda não
confirmada, o requisito para canais novos sobe de 4.000 h/12 meses para 8.000 h/365 dias.
Conferir na página oficial.

## Em aberto

- Provedor de TTS (custo × naturalidade)
- Cadência real que cabe na aprovação humana (3 canais × 2 longos/semana = 6 aprovações)
- Brand account separada por canal no YouTube
- Assinar ou não ferramentas pagas (ex.: PlaySquad): hoje a recomendação é construir com a API oficial e modelos locais

## Documentos

- Spec do painel e do Radar: `docs/specs/2026-11-18-painel-e-radar.md`
- Pesquisa de nichos e métodos: `docs/pesquisa/`
- Plano dos 10 canais: `docs/pesquisa/roadmap-rede-canais-dark.md`
- Decisões e estado: `docs/HANDOFF.md`
