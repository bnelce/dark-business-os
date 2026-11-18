# Saída, proporções e zonas seguras

## Proporções

| Uso | Tamanho | `MOTION` | Observação |
|---|---|---|---|
| Reels, TikTok, Shorts, Stories | 1080x1920 (9:16) | `w:1080, h:1920` | **padrão** para conteúdo de perfil e para a família de mapas |
| YouTube, anúncio horizontal, site | 1920x1080 (16:9) | `w:1920, h:1080` | o formato do teste |
| Feed do Instagram (4:5) | 1080x1350 | `w:1080, h:1350` | o feed corta o Reels para 4:5 na grade: mantenha o essencial no miolo |
| Quadrado | 1080x1080 | `w:1080, h:1080` | anúncio em carrossel |

Um arquivo por proporção (`index-9x16.html`, `index.html`). Passe `--arquivo` aos scripts; o tamanho vem de `window.MOTION`.

## Zonas seguras do Reels (1080x1920)

```
┌──────────────────────────┐
│  250 px: topo (nome do perfil, áudio, "Reels")
├──────────────────────┬───┤
│                      │140│  direita: curtir, comentar, compartilhar
│   área segura        │ px│
│   ~940 x 1250        │   │
├──────────────────────┴───┤
│  ~420 px: legenda, @perfil, botão de seguir
└──────────────────────────┘
```

- Nada importante (texto, logo, CTA, número) nos 250 px de cima, nos ~420 px de baixo nem nos ~140 px da direita.
- Fundo, cidade, cor e movimento podem ocupar o quadro inteiro.
- Confira com `?guias` (o `base.html` desenha as faixas) e `capturar.cjs --query guias`.
- No grid do perfil o Reels aparece cortado em 4:5 (1080x1350 centrado): o título da capa deve caber nessa faixa.

## Recompor 16:9 → 9:16

Não é escala. Refaça a composição:

- **Empilhe em vez de lado a lado**: produto em cima, texto embaixo (dentro da área segura).
- **Câmera 3D**: a fov da `PerspectiveCamera` é vertical. Com fov 40 em 9:16, o campo horizontal cai de 66° para 23° e a cena vira um corredor. Use fov 50–60 e afaste ~1,3x nas tomadas abertas.
- **Movimento**: prefira trajetos que correm de cima para baixo na tela (rota, queda, rolagem).
- **Texto**: quebras mais curtas (até ~16 caracteres por linha em título), tamanhos maiores.
- **Interface presa ao 3D** (placas, rótulos): limite a posição projetada à área segura (`x` entre 60 e W−140−largura, `y` entre 250+altura e H−420).

## Exportação

`gravar.cjs` padrão: H.264 high, yuv420p, CRF 18, 30 fps, AAC 192 kbps 48 kHz, `+faststart`, no tamanho da janela. É o que o Instagram e o TikTok aceitam sem recompressão estranha.

- 60 fps: `--fps 60` (dobra o tempo de exportação; vale para movimento muito rápido em 16:9).
- Menor: `--escala 0.6667` (1080p → 720p) ou `--saida-w 1280`.
- Rascunho: `--fps 15 --escala 0.5`.
- Tamanho típico: 20 s em 1080x1920 a CRF 18 fica entre 4 e 25 MB conforme o grão e o borrão (o cartão em 1920x1080 deu 22 MB).

Tempo de exportação medido: 15 s de Three.js com 24 sub-quadros em 1920x1080 → 53 s (áudio em tempo real + 465 quadros).

## Entrega pelo Google Drive

O conector do Drive aceita no máximo ~10 MB por envio, já em base64, o que dá ~7,4 MB de arquivo. Para arquivos maiores:

```bash
bash ~/.claude/skills/motion-graphics/scripts/drive.sh peca.mp4            # → peca-drive.mp4, ~6,4 MB
bash ~/.claude/skills/motion-graphics/scripts/drive.sh peca.mp4 out.mp4 5  # alvo menor
```

Duas passadas de x264 com bitrate calculado pela duração (áudio AAC 128 kbps). Se o bitrate de vídeo cair abaixo de ~1,4 Mbps, o script reduz para 720 no lado menor. Teste: 15,5 s em 1920x1080 de 22,1 MB → 6,34 MB (≈ 8,46 MB em base64). Mande o original por outro meio quando a qualidade importar (WeTransfer, link do Drive enviado pelo navegador).
