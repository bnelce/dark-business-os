# YouTube (canal A2LO, @a2lo_dev)

Publicação e relatório pela YouTube Data API v3 e pela YouTube Analytics API v2, com fetch nativo, sem SDK.

## Onde ficam as credenciais

Ficam em `../A2LO/secrets/`, fora do git; para usar outra pasta, defina `YT_SECRETS_DIR`. Este repositório tem remoto
público, então nada de credencial aqui.

- `youtube-oauth-client.json`: JSON baixado do Google Cloud. A credencial é do tipo "App para computador", criada no
  projeto `tecnomind`, com a YouTube Data API v3 e a YouTube Analytics API ativadas.
- `youtube-token.json`: refresh token gravado pelo `autorizar.js` (permissão 600).

A tela de consentimento OAuth precisa estar **"Em produção"**. Em "Teste", a autorização vence em 7 dias.

## Uso

```bash
node scripts/youtube/autorizar.js                       # uma vez: abre o navegador, escolha o canal A2LO
node scripts/youtube/publicar.js <pasta>                # envio PRIVADO (teste)
node scripts/youtube/publicar.js <pasta> --publico --pode-publicar
node scripts/youtube/publicar.js <pasta> --agendar 2026-11-14T19:00:00-03:00 --pode-publicar
node scripts/youtube/analisar.js --dias 28 [--salvar <pasta>]
node --test scripts/youtube/*.test.js
```

A pasta precisa ter o vídeo (`short.mp4`, `video.mp4` ou `reel.mp4`) e um `youtube.json`:
`{ titulo, descricao, tags[], categoria?, formato?: "short", playlist?, comentario?, sintetico? }`.
O resultado do envio fica gravado em `publicado-youtube.json`.

## Travas

- **Aprovação:** vídeo público, não listado ou agendado só sai com `--pode-publicar`. Só passe essa flag depois de um
  "pode publicar" explícito do Abner.
- **Canal certo:** se a autorização for de outro canal (`config.js`, `CANAL_ESPERADO`), o script não envia.
- **Sem duplicata:** a mesma pasta não é enviada duas vezes, a menos que se passe `--de-novo`.
- **Metadados:** título, descrição e tags são validados antes de qualquer chamada. O título tem até 100 caracteres, a
  descrição até 5000 bytes, e nenhum dos dois pode ter `<` ou `>`. As tags somam até 500 caracteres.
- **Projeto sem auditoria:** se o vídeo foi pedido público e o YouTube devolver privado, é a trava de projeto não
  auditado, e o registro avisa. Até a auditoria sair, troque para público pelo Studio.
- **Comentário fixado:** a API não tem "fixar". O script posta o comentário quando o vídeo já está público, e fixar
  continua sendo à mão no Studio.
