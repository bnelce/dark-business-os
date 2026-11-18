#!/bin/zsh
# Agenda a publicação de UM reel já aprovado, numa data e hora, via launchd de uso único.
# Quem dispara é scripts/reels/publicar-agendado.sh, que publica e remove o agendamento.
#
#   scripts/reels/agendar-reel.sh <nome> <AAAA-MM-DD> <HH:MM> <pasta-do-reel> [negócio]
#   ex.: scripts/reels/agendar-reel.sh fogo-para 2026-10-28 18:00 negocios/ciencia-visual/marketing/reels/fogo-para-2026-10-28
#
# Cancelar antes da hora: launchctl bootout gui/$(id -u)/com.<negócio sem hífen>.reel.<nome>
set -eu
cd "$(dirname "$0")/../.."

nome=$1; data=$2; hora=$3; pasta=$4; negocio=${5:-ciencia-visual}
[ -f "$pasta/reel.mp4" ] || { echo "sem reel.mp4 em $pasta"; exit 1; }
[ -f "$pasta/legenda.md" ] || [ -f "$pasta/roteiro.json" ] || { echo "sem legenda.md nem roteiro.json em $pasta"; exit 1; }
[ ! -f "$pasta/publicado.md" ] || { echo "$pasta já foi publicado (publicado.md existe)"; exit 1; }

label="com.${negocio//-/}.reel.$nome"
plist="$HOME/Library/LaunchAgents/$label.plist"
raiz=$(pwd)
mes=$((10#${data:5:2})); dia=$((10#${data:8:2})); h=$((10#${hora%%:*})); m=$((10#${hora##*:}))

cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>$label</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/zsh</string>
        <string>scripts/reels/publicar-agendado.sh</string>
        <string>$label</string>
        <string>$data</string>
        <string>$negocio</string>
        <string>$pasta</string>
    </array>
    <key>WorkingDirectory</key><string>$raiz</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Month</key><integer>$mes</integer>
        <key>Day</key><integer>$dia</integer>
        <key>Hour</key><integer>$h</integer>
        <key>Minute</key><integer>$m</integer>
    </dict>
    <key>StandardOutPath</key><string>$raiz/scripts/reels/agendado.log</string>
    <key>StandardErrorPath</key><string>$raiz/scripts/reels/agendado.log</string>
</dict>
</plist>
EOF
plutil -lint "$plist" >/dev/null
launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "agendado: $label → $data $hora ($pasta)"
