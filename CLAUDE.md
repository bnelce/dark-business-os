# Dark Business OS — rede de canais faceless em inglês

Sistema de operação de uma rede de canais dark (sem rosto) **em inglês**:
vídeos longos de 10 a 20 min no YouTube (16:9), cortados em 3 a 5 shorts
(9:16) para YouTube Shorts, Instagram Reels e TikTok, com um produto low cost
por canal.

Plano completo: `docs/pesquisa/roadmap-rede-canais-dark.md`.
Pesquisa de nichos e métodos: `docs/pesquisa/reports/`.

---

## Estrutura

```
canais/
  _rede.md                 lista de todos os canais (status, nicho, fase)
  <slug>/
    canal.md               nicho, ângulo, público, voz, cadência, produto
    identidade.md          paleta, tipografia, vinheta, template de thumbnail
    pautas.md              backlog de pautas (com outlier de referência)
    videos/<data>-<tema>/  roteiro.md, fontes/, thumbs/, cortes/, publicado.md
    .env                   credenciais do canal (nunca versionar)
reels/                     motor Remotion compartilhado (temas por canal)
scripts/                   narração, render, publicação (YouTube e Instagram)
manager/                   fila e publicação multicanal (Next.js + Postgres)
docs/                      pesquisa, roadmap, specs
```

**Convenção:** quando uma skill fala em `canal.md`, `identidade.md`,
`pautas.md` ou `videos/`, é relativo a `canais/<slug>/`. Se não estiver claro
de qual canal se trata, perguntar antes de tocar nesses arquivos.

Tooling (`reels/`, `scripts/`, `.claude/skills/`, `manager/`) é compartilhado.
Nunca duplicar por canal: a diferença entre canais é **tema e conteúdo**, não
código.

---

**Dados da rede ficam fora do repo** (desde 18/11/2026): canais, pautas,
roteiros, fontes e métricas vivem no Postgres do `manager/`; mídia no MinIO;
segredos nos `.env`. O Claude lê e grava pelo MCP `dark-rede` (`.mcp.json`).
O repo é só o motor, reutilizável por outra rede. `canais/` é legado e sai do
git quando as skills estiverem no MCP. Spec: `docs/specs/2026-11-18-painel-e-radar.md`.

## Regras editoriais (inegociáveis)

A política de "conteúdo inautêntico" do YouTube (desde 15/07/2025) avalia o
**canal inteiro**. Por isso:

1. **Padrão no formato, autenticidade no conteúdo.** Cada vídeo tem tese,
   pesquisa e dados próprios. Nunca reaproveitar roteiro trocando nomes.
2. **Toda afirmação factual tem fonte**, registrada no painel (`Source`, com
   cópia no MinIO). Cada versão de pauta, embalagem e roteiro fica salva como
   `Revision` imutável no banco: esse histórico é a prova de processo para o YPP.
3. **Título e thumbnail antes do roteiro.** Uma pauta só entra no backlog se
   tiver um outlier comprovado no nicho (vídeo com 3x ou mais a média do canal
   de origem).
4. **Imagens:** só domínio público, licença aberta ou material gerado por nós.
   Nada de banco de imagem com só zoom em cima.
5. **Voz ou imagem sintética:** marcar a flag de conteúdo alterado no upload.
6. **Saúde, finanças e true crime:** fontes na tela, aviso de que não é
   recomendação, respeito às vítimas reais.
7. **Nada é publicado sem aprovação explícita do usuário**, nem a pauta nem o
   vídeo final.
8. **O pipeline entrega pautas, nunca roteiro gerado direto de uma notícia.**
9. **Sem data ou ano no título** (mata o evergreen) e sem título que prometa o
   que o vídeo não entrega.
10. **No máximo 2 vídeos longos por semana por canal nos primeiros 90 dias.**
    (Herdado do YT-DARK. O usuário ainda não confirmou essa regra para a rede.)

## Esqueleto de roteiro (todos os canais)

```
0:00   Gancho (≤15s)
0:15   Promessa
0:45   Contexto: 2 a 3 capítulos
~8:00  Virada
~12:00 Desfecho + resposta ao gancho
final  CTA: próximo vídeo + produto
```

Cada capítulo é uma cena Remotion reaproveitável. Trechos marcados com
`[CORTE]` no roteiro viram shorts.

---

## Fluxo de trabalho

Antes de qualquer tarefa, verificar se existe skill em `.claude/skills/`.

- **Setup da máquina e credenciais** → `/instalar`
- **Canal novo** → `/novo-canal`
- **Shorts e reels** → `/reel`, `/aula-reel`, `/mapa-mental`, `chart-animation`
- **Explicativo e mapas** → `motion-graphics`
- **Pautas do dia** → `/radar` (precisa ser adaptado para a rede)
- **Salvar no GitHub** → `/salvar`

As skills `/reel`, `/aula-reel`, `/mapa-mental`, `/radar` e `/carrossel` vieram
do VENDAS-IG e ainda falam em `negocios/<slug>/` e em português. Precisam ser
adaptadas para `canais/<slug>/` e inglês quando forem usadas pela primeira vez.

## Aprender com correções

Quando o usuário corrigir algo com valor duradouro, perguntar: "Quer que eu
salve isso pra não precisar repetir?" e salvar em:

- `canais/<slug>/canal.md`, se for regra de um canal;
- este `CLAUDE.md`, se for regra da rede.

## Fases (ver roadmap)

0. Fundação · 1. Piloto (Margin Notes, Borderline, Unsolved Atlas) ·
2. Expansão para 10 canais · 3. Escala.

Prazo crítico: entrar no YouTube Partner Program antes de 01/02/2027, quando o
requisito de horas sobe para novos canais (anotado no projeto anterior
`~/Projetos/YT-DARK`; conferir na página oficial do YPP).
