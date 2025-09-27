#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-deep-prod}"
REMOTE_DIR="${REMOTE_DIR:-/root}"
LOCAL_DIR="${LOCAL_DIR:-$(pwd)}"

# Быстрая синхронизация (mtime/size) обычно достаточно:
FAST=${FAST:-1}
if [ "$FAST" = "1" ]; then
  RSYNC_FLAGS=(-avz --delete --filter=':- .gitignore' --exclude ".git/" --exclude "node_modules/")
else
  # Строгая синхронизация по checksum (дороже, но точнее)
  RSYNC_FLAGS=(-avzc --delete --filter=':- .gitignore' --exclude ".git/" --exclude "node_modules/")
fi

echo "[push] $LOCAL_DIR -> $HOST:$REMOTE_DIR"
rsync "${RSYNC_FLAGS[@]}" -e "ssh -o ControlMaster=auto -o ControlPersist=10m" \
  "$LOCAL_DIR/" "$HOST:$REMOTE_DIR/"

# Без интерактивщины: проверка Node и зависимостей, без 'pm2 logs'
echo "[post] npm ci (если lock-файл изменился) и легкий рестарт приложения"
ssh -o ControlMaster=auto -o ControlPersist=10m "$HOST" bash -lc "
  set -euo pipefail
  cd '$REMOTE_DIR'
  if command -v node >/dev/null 2>&1; then node -v; fi
  if [ -f package-lock.json ]; then npm ci; fi
  if command -v pm2 >/dev/null 2>&1; then pm2 status || true; fi
"
