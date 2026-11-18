#!/bin/zsh
# Publica UM reel já aprovado numa data marcada e se desagenda em seguida.
# Disparado por um launchd de uso único (~/Library/LaunchAgents/<label>.plist), criado
# só depois do "pode publicar" explícito do usuário para aquele MP4.
#
#   scripts/reels/publicar-agendado.sh <label> <AAAA-MM-DD> <negócio> <pasta-do-reel>
#
# O StartCalendarInterval do launchd repete todo ano, então este script confere a data
# e remove o próprio agendamento depois de rodar, com sucesso ou não: falha não vira
# nova tentativa automática, porque a decisão de republicar é do usuário.
set -u
cd "$(dirname "$0")/../.."

label=$1; data=$2; negocio=$3; pasta=$4
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
plist="$HOME/Library/LaunchAgents/$label.plist"

desagendar() {
  rm -f "$plist"
  launchctl bootout "gui/$(id -u)/$label" 2>/dev/null
}

echo "=== $(date '+%F %T') $label"
if [ "$(TZ=America/Sao_Paulo date +%F)" != "$data" ]; then
  echo "hoje não é $data — nada a fazer, desagendando"
  desagendar
  exit 0
fi

node --env-file="negocios/$negocio/.env" scripts/reels/publicar.js "$pasta"
rc=$?
if [ $rc -eq 0 ]; then
  osascript -e "display notification \"Reel publicado: $(basename "$pasta")\" with title \"Ciência Visual\""
else
  osascript -e "display notification \"Falhou a publicação de $(basename "$pasta") — ver scripts/reels/agendado.log\" with title \"Ciência Visual\""
fi
desagendar
exit $rc
