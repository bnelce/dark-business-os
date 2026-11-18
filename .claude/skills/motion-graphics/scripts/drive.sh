#!/usr/bin/env bash
# Versão do MP4 que cabe no conector do Google Drive.
# O conector aceita ~10 MB por envio já em base64 (= ~7,4 MB de arquivo).
# Recomprime em duas passadas com x264 mirando ~6,4 MB (folga para o contêiner e o base64).
#
# Uso: drive.sh <entrada.mp4> [saida.mp4] [alvo_MB=6.4]
# Padrão de saída: <entrada>-drive.mp4
set -euo pipefail

if [[ $# -lt 1 || "$1" == "-h" || "$1" == "--help" ]]; then
  sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

ENTRADA="$1"
SAIDA="${2:-${ENTRADA%.*}-drive.mp4}"
ALVO_MB="${3:-6.4}"
AUDIO_K=128

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$ENTRADA")
TEM_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$ENTRADA" | head -1)
LARG=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$ENTRADA")
ALT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$ENTRADA")
[[ -z "$TEM_AUDIO" ]] && AUDIO_K=0

# kbps de vídeo = (alvo em kbit / duração) - áudio, com 3% de folga para o contêiner
VIDEO_K=$(awk -v mb="$ALVO_MB" -v d="$DUR" -v a="$AUDIO_K" 'BEGIN { v = int(mb * 8000 * 0.97 / d - a); print (v < 200 ? 200 : v) }')

# Bitrate baixo demais para o tamanho do quadro: reduz para 720 no lado menor.
ESCALA=()
if (( VIDEO_K < 1400 )) && (( LARG > 720 && ALT > 720 )); then
  if (( LARG < ALT )); then ESCALA=(-vf "scale=720:-2:flags=lanczos"); else ESCALA=(-vf "scale=-2:720:flags=lanczos"); fi
  echo "bitrate de ${VIDEO_K} kbps é pouco para ${LARG}x${ALT}: reduzindo para 720 no lado menor"
fi

LOG=$(mktemp -t x264pass)
trap 'rm -f "$LOG"*' EXIT
echo "duração ${DUR}s · alvo ${ALVO_MB} MB · vídeo ${VIDEO_K} kbps · áudio ${AUDIO_K} kbps"

ffmpeg -v error -y -i "$ENTRADA" ${ESCALA[@]+"${ESCALA[@]}"} -c:v libx264 -preset slow -b:v "${VIDEO_K}k" -pass 1 -passlogfile "$LOG" \
  -pix_fmt yuv420p -an -f mp4 /dev/null
if [[ "$AUDIO_K" -gt 0 ]]; then AUD=(-c:a aac -b:a "${AUDIO_K}k"); else AUD=(-an); fi
ffmpeg -v error -y -i "$ENTRADA" ${ESCALA[@]+"${ESCALA[@]}"} -c:v libx264 -preset slow -b:v "${VIDEO_K}k" -pass 2 -passlogfile "$LOG" \
  -pix_fmt yuv420p "${AUD[@]}" -movflags +faststart "$SAIDA"

BYTES=$(stat -f%z "$SAIDA" 2>/dev/null || stat -c%s "$SAIDA")
awk -v b="$BYTES" -v s="$SAIDA" 'BEGIN {
  mb = b / 1e6; b64 = b * 4 / 3 / 1e6
  printf "%s: %.2f MB (≈ %.2f MB em base64)%s\n", s, mb, b64, (b64 > 10 ? "  << ainda grande demais: rode de novo com alvo menor" : "  ok para o conector do Drive")
}'
