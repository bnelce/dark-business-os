#!/bin/zsh
# Deixa o MP4 dentro da especificação de Reels da Graph API: sem edit list, moov no início,
# GOP fechado, 4:2:0, CFR. O render do Remotion e o `-c:v copy` saem com edit list e moov no fim,
# e o Instagram pode descompassar áudio e vídeo ao processar (reel de 31/10/2026).
#
# O atrim tira as 1024 amostras que o encoder AAC acrescenta no início: sem edit list pra descontá-las,
# o muxer esticaria o 1º quadro em 21 ms e o vídeo deixaria de ter taxa fixa.
#
#   scripts/reels/conformar-mp4.sh <entrada.mp4> <saída.mp4> [filtro de áudio]
set -eu
entrada=$1; saida=$2; filtro=${3:-anull}

ffmpeg -v error -y -i "$entrada" -map 0:v:0 -map 0:a:0 \
  -vf "scale=in_range=pc:out_range=tv,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slow -crf 17 -maxrate 20M -bufsize 40M \
  -bf 0 -g 30 -keyint_min 30 -sc_threshold 0 -flags +cgop -fps_mode cfr -r 30 \
  -af "$filtro,aresample=48000,atrim=start_sample=1024" -c:a aac -ar 48000 -ac 2 -b:a 128k -shortest \
  -movflags +faststart -use_editlist 0 "$saida"
