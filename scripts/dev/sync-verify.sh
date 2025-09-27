#!/usr/bin/env bash
set -euo pipefail

# Настройка:
HOST="${HOST:-deep-prod}"                  # из ~/.ssh/config
REMOTE_DIR="${REMOTE_DIR:-/root}"          # путь проекта на сервере
LOCAL_DIR="${LOCAL_DIR:-$(pwd)}"           # путь локального проекта

# Параметры сравнения:
# --filter=':- .gitignore' => rsync учитывает правила из .gitignore (merge-фильтр)
# -n (dry-run), -a (рекурсивно/права), -v (подробно), -c (checksum для строгого сравнения)
# --delete: смотреть удалённые файлы тоже (но в dry-run ничего не трогаем)
RSYNC_FLAGS=(-n -avc --delete --filter=':- .gitignore' --exclude ".git/" --exclude "node_modules/")

echo "[1/3] Сверка содержимого (DRY-RUN, строгая по checksum)"
rsync "${RSYNC_FLAGS[@]}" -e "ssh -o ControlMaster=auto -o ControlPersist=10m" \
  "$LOCAL_DIR/" "$HOST:$REMOTE_DIR/" | tee /tmp/rsync-diff.txt

echo "[2/3] Коммиты git (если есть на обеих сторонах)"
if [ -d "$LOCAL_DIR/.git" ]; then
  LOCAL_HEAD=$(git -C "$LOCAL_DIR" rev-parse HEAD)
  REMOTE_HEAD=$(ssh "$HOST" "git -C '$REMOTE_DIR' rev-parse HEAD 2>/dev/null || echo 'no-git'")
  echo "LOCAL:  $LOCAL_HEAD"
  echo "REMOTE: $REMOTE_HEAD"
fi

echo "[3/3] Контрольные суммы lock-файлов (если есть)"
for f in package-lock.json pnpm-lock.yaml yarn.lock; do
  if [ -f "$LOCAL_DIR/$f" ]; then
    echo -n "LOCAL $f:  "; sha256sum "$LOCAL_DIR/$f" | cut -d' ' -f1
    echo -n "REMOTE $f: "; ssh "$HOST" "sha256sum '$REMOTE_DIR/$f' 2>/dev/null | cut -d' ' -f1 || echo 'absent'"
  fi
done

echo
echo "Итог: если /tmp/rsync-diff.txt пуст или только 'sending incremental file list' — каталоги эквивалентны."
