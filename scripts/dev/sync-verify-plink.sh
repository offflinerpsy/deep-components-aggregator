#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-89.104.69.77}"
USER="${USER:-root}"
PASS="${PASS:-OPYgPpOEqUSQmUqI}"
REMOTE_DIR="${REMOTE_DIR:-/root}"
LOCAL_DIR="${LOCAL_DIR:-$(pwd)}"

echo "[1/3] Сравнение ключевых файлов"
for file in package.json server.js; do
  if [ -f "$LOCAL_DIR/$file" ]; then
    echo "=== $file ==="
    echo "LOCAL:"
    head -5 "$LOCAL_DIR/$file"
    echo "REMOTE:"
    plink -ssh -batch -pw "$PASS" "$USER@$HOST" "head -5 '$REMOTE_DIR/$file' 2>/dev/null || echo 'absent'"
    echo
  fi
done

echo "[2/3] Коммиты git"
if [ -d "$LOCAL_DIR/.git" ]; then
  LOCAL_HEAD=$(git -C "$LOCAL_DIR" rev-parse HEAD)
  REMOTE_HEAD=$(plink -ssh -batch -pw "$PASS" "$USER@$HOST" "git -C '$REMOTE_DIR' rev-parse HEAD 2>/dev/null || echo 'no-git'")
  echo "LOCAL:  $LOCAL_HEAD"
  echo "REMOTE: $REMOTE_HEAD"
fi

echo "[3/3] Контрольные суммы lock-файлов"
for f in package-lock.json; do
  if [ -f "$LOCAL_DIR/$f" ]; then
    echo -n "LOCAL $f:  "; sha256sum "$LOCAL_DIR/$f" | cut -d' ' -f1
    echo -n "REMOTE $f: "; plink -ssh -batch -pw "$PASS" "$USER@$HOST" "sha256sum '$REMOTE_DIR/$f' 2>/dev/null | cut -d' ' -f1 || echo 'absent'"
  fi
done

echo
echo "Итог: сравнение завершено"
