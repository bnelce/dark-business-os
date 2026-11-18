#!/bin/zsh
# Roda o /radar do Ciência Visual sem ninguém olhando e avisa por notificação do macOS.
# Disparado pelo launchd (~/Library/LaunchAgents/com.cienciavisual.radar.plist) toda manhã.
# Uso manual: scripts/radar-diario.sh [atualizacao]
set -u
cd "$(dirname "$0")/.."

export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
hoje=$(TZ=America/Sao_Paulo date +%F)
arquivo="negocios/ciencia-visual/marketing/radar/$hoje.md"

echo "=== $(date '+%F %T') radar $hoje"

# Só pesquisa e escreve o arquivo do dia: nenhuma ferramenta de shell ou publicação liberada.
modo=${1:-}
saida=$(claude -p "/radar $modo" \
  --allowedTools "WebSearch" "WebFetch" "Read" "Glob" "Grep" "Write(negocios/ciencia-visual/marketing/radar/**)" "Edit(negocios/ciencia-visual/marketing/radar/**)" "Skill" "Agent" \
  --permission-mode acceptEdits 2>&1)
rc=$?
echo "$saida"

if [[ $rc -eq 0 && "$modo" == "atualizacao" && "$(echo "$saida" | sed '/^[[:space:]]*$/d' | tail -1)" == *"sem novidade"* ]]; then
  exit 0
elif [[ $rc -eq 0 && -f "$arquivo" ]]; then
  tema=$(echo "$saida" | sed '/^[[:space:]]*$/d' | tail -1 | tr -d '"\\' | cut -c1-120)
  osascript -e "display notification \"$tema\" with title \"Radar Ciência Visual\" subtitle \"$hoje\" sound name \"Glass\""
else
  osascript -e "display notification \"Falhou — ver scripts/radar.log\" with title \"Radar Ciência Visual\" sound name \"Basso\""
fi
