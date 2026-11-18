#!/usr/bin/env bash
# Confere o que a máquina e o repositório têm para rodar o Dark Business OS.
# Só lê: não instala nada e nunca imprime o valor de uma chave (só se está preenchida).
# Uso: bash scripts/verificar-instalacao.sh
set -u
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"

ok()   { printf "  ✓ %s\n" "$1"; }
falta(){ printf "  ✗ %s\n" "$1"; }
aviso(){ printf "  ! %s\n" "$1"; }

echo "== Programas"
for p in node npm ffmpeg ffprobe yt-dlp python3 gh git; do
  if command -v "$p" >/dev/null 2>&1; then ok "$p"; else falta "$p"; fi
done
if command -v node >/dev/null 2>&1; then
  maior=$(node -p 'process.versions.node.split(".")[0]')
  [ "$maior" -ge 20 ] && ok "node $maior (>= 20, aceita --env-file)" || falta "node $maior: precisa ser 20 ou mais"
fi
if command -v python3 >/dev/null 2>&1; then
  python3 -c "import faster_whisper" 2>/dev/null && ok "faster-whisper (transcrição)" || aviso "faster-whisper ausente (opcional: transcrever vídeos de referência)"
fi

echo "== Dependências npm"
for d in . reels manager; do
  if [ -f "$d/package.json" ]; then
    [ -d "$d/node_modules" ] && ok "$d/node_modules" || falta "$d: rodar npm install"
  fi
done
ls ~/Library/Caches/ms-playwright 2>/dev/null | grep -q chromium && ok "Chromium do Playwright (thumbnails)" || falta "Chromium do Playwright: npx playwright install chromium"

# Mostra se cada chave está preenchida, sem mostrar o valor.
checar_env() {
  arquivo="$1"; shift
  if [ ! -f "$arquivo" ]; then falta "$arquivo não existe"; return; fi
  for chave in "$@"; do
    valor=$(grep -E "^${chave}=" "$arquivo" | head -1 | cut -d= -f2-)
    if [ -n "$valor" ]; then ok "$chave"; else falta "$chave vazia"; fi
  done
}

echo "== .env da raiz"
checar_env .env YT_API_KEY OPENAI_API_KEY VOZ_TTS CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET

echo "== manager/.env"
checar_env manager/.env DATABASE_URL ADMIN_USERNAME ADMIN_PASSWORD AUTH_SECRET ENCRYPTION_KEY

echo "== Canais"
for c in canais/*/; do
  slug=$(basename "$c")
  [ "$slug" = "_modelo" ] && continue
  [ -f "$c/canal.md" ] || continue
  echo "-- $slug"
  checar_env "$c.env" YT_CANAL_ID YT_CANAL_URL META_IG_USER_ID META_PAGE_ACCESS_TOKEN
  if [ -d "$c/secrets" ] && ls "$c/secrets" 2>/dev/null | grep -q token; then ok "OAuth do YouTube autorizado"; else falta "OAuth do YouTube não autorizado"; fi
done
