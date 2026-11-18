---
name: radar
description: >
  Radar diário do Ciência Visual: uma equipe de agentes acha o maior assunto do dia em qualquer
  área (notícias, ciência, interesse real), procura dado público pra gerar número próprio, checa os
  fatos e devolve 3 a 5 pautas com o porquê, a janela, o dado e o ângulo visual. Salva em
  `marketing/radar/<data>.md`. Roda via launchd e também sob demanda. Use quando o usuário disser
  "radar", "o que tá em alta hoje", "tema quente", "o que bombou", "pauta do dia", ou /radar.
---

# /radar — Equipe de pauta do Ciência Visual

O perfil cresce quando transforma **o assunto do momento em número próprio**: os reels da apuração tiveram 2,4 milhões de
views, e os de conceito sem evento, de 17 a 38 mil. O radar antigo só olhava ciência e não viu o maior roubo de cripto da
história, em 29/10/2026. Por isso o filtro agora é: **é grande, tem dado e rende imagem?**

O negócio é sempre `ciencia-visual`, não perguntar.

## Modos

- `/radar`: rodada completa. Grava `negocios/ciencia-visual/marketing/radar/<AAAA-MM-DD>.md`.
- `/radar atualizacao`: rodada curta, só com `radar-noticias`, e `radar-checador` se houver candidato. Só escreve se surgir
  assunto maior que o tema 1 do dia, numa seção `## Atualização HHh` no arquivo do dia. Se não houver nada, a última linha
  da resposta é só `sem novidade`.

## Equipe

| Agente | Papel |
|---|---|
| `radar-noticias` | Maiores notícias de qualquer área e interesse real (Trends, Wikipedia) |
| `radar-ciencia` | Ciência e tecnologia das últimas 48h e eventos dos próximos 3 dias |
| `radar-dados` | Base pública e cálculo original para cada pauta |
| `radar-checador` | Tenta derrubar cada pauta |

## Workflow

1. **Contexto.** Ler `_memoria/{empresa,estrategia,preferencias}.md`, `identidade/design-guide.md`, `marketing/editorial.md`,
   `marketing/ideias.md`, o relatório de growth mais recente e os radares dos últimos 7 dias.
2. **Pendências.** Conferir cada item "Aberto" de `marketing/radar/acompanhar.md` do jeito que o item manda. Se saiu, vira o
   tema 1 e passa para "Resolvido", com a data. Se não saiu, registrar em uma linha na seção "Acompanhando". Assunto em `acompanhar.md` continua concorrendo: se for o maior do dia, entra nas pautas e não só em "Acompanhando".
3. **Reportagem.** Chamar `radar-noticias` e `radar-ciencia` em paralelo, passando a data de hoje em America/Sao_Paulo.
4. **Seleção.** Juntar, tirar repetidos e ficar com até 6 pautas, usando a nota abaixo.
5. **Dados e checagem.** Chamar `radar-dados` e `radar-checador` em paralelo, com as pautas e os links. Pauta `derrubada` sai.
6. **Escrever** o arquivo do dia e entregar.

### Nota de cada pauta (0 a 3 em cada)

- **Tamanho:** recorde, ou algo de que todo mundo vai falar?
- **Dado:** `dado próprio` vale 3, `só dado de terceiros` vale 1, `sem dado` vale 0.
- **Imagem:** a animação explica em 3 segundos?
- **Janela:** ainda dá tempo de produzir e publicar?

Um assunto gigante com nota 3 em tamanho nunca fica fora do radar, mesmo sem ser ciência. Se não render imagem, entra
como pauta fraca e diz por quê.

## Arquivo do dia

```markdown
# Radar — DD/MM/AAAA

**Escolha rápida:** <tema 1> — <uma frase de por quê>

## 1. <Tema> (nota X/12)
- **Por que hoje:** fato concreto, em 1 ou 2 frases
- **Janela:** horas, 2-3 dias ou semana
- **Dado:** base, cálculo proposto e veredito
- **Ângulo visual:** quadro a quadro, em 2 ou 3 linhas
- **Gancho (primeiros 2s):** frase ou imagem de abertura
- **Formato:** reel de dados, reel curto (/reel), aula (/aula-reel) ou mapa mental (/mapa-mental)
- **Checagem:** veredito, número que diverge, o que é só atribuído
- **Risco:** lado político, selo, conselho de investimento (omitir se nada)
- **Fontes:** links

## Acompanhando
- <item> — estado (conferido em <fonte>, HH:MM)

## Descartados
- <tema> — motivo
```

Ficar com 3 a 5 pautas. Dia fraco entrega menos: nunca encher com tema morno.

## Entregar

No chat: a escolha rápida e a lista (título, nota e ângulo em uma linha), apontando pro arquivo. Fechar com "Qual vira reel
hoje?". Quando rodar sem ninguém olhando (launchd), a última linha da resposta deve ser só o título do tema 1: o script usa
essa linha na notificação.

## Regras

- **Não produzir nem publicar nada.** Publicação só com "pode publicar" explícito.
- **Fonte acima de hype.** Na dúvida, apontar em "Checagem" em vez de afirmar.
- **Sem neon obrigatório.** O usuário prefere foto oficial quando o tema pede. Traço neon fica para conceito e ciência.
- **Tema político:** dados dos dois lados e nenhuma causa atribuída. O perfil pode perguntar, não pode responder por um lado.
- **Dinheiro:** nunca dizer o que comprar, vender ou onde guardar.
- Tom seguindo `_memoria/preferencias.md`: direto, sem jargão de guru.
