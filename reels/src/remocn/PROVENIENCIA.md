# Componentes vindos do remocn

Copiados de [Remocn/remocn](https://github.com/Remocn/remocn) (**MIT**), no modelo
copy-paste da biblioteca: o código passa a ser nosso e pode ser editado à vontade.
Não há dependência npm da remocn — só `remotion` e `@remotion/google-fonts`, que
o projeto já tinha.

| Componente | O que faz |
|---|---|
| `stop-motion` | Relógio quantizado (passo de 3 frames) + jitter determinístico. Base de todos os outros |
| `brush` | Fitas de pincel com afinamento por pressão |
| `handwrite` | Texto manuscrito (fonte Caveat) surgindo caractere a caractere |
| `paper-wobble` | Tremor por pose: faz o conteúdo parecer posto à mão na mesa |
| `marker-highlight` | Bloco de marca-texto desenhado atrás de uma frase |
| `ink-underline` | Sublinhado de pincel varrendo o texto |
| `ink-arrow` | Seta de tinta que se desenha de um ponto a outro |
| `scribble-circle` | Círculo de caneta rodeando uma região |
| `paper-sticker` | Cartão de papel que "cola" na cena em duas poses |

## Edições nossas (não voltar atrás sem entender por quê)

- **`handwrite`**: o original renderiza todos os caracteres num único `inline-block`,
  então `\n` não quebrava linha — o texto saía todo emendado. Reescrito para quebrar
  por linha preservando o índice global do caractere (a ordem de revelação depende dele).
- **`marker-highlight`**: o original pinta `background: "white"` no container, o que
  cobria o fundo de papel. Trocado por `transparent` para ser componível.
- Imports com alias `@/lib/remocn/...` trocados por caminhos relativos, e os
  `config.ts` (que serviam ao site de documentação da remocn) removidos.
