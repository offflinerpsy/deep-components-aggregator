#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-deep-prod}"
REMOTE_DIR="${REMOTE_DIR:-/opt/deep-agg}"

echo "[setup] Настройка git-деплоя на сервере"

ssh "$HOST" bash -lc "
  set -euo pipefail

  # Создание bare-repo для деплоя
  sudo mkdir -p /opt/deploy && sudo chown -R \$USER:\$USER /opt/deploy
  cd /opt/deploy
  git init --bare deep-agg.git

  # Рабочая директория релиза
  sudo mkdir -p $REMOTE_DIR && sudo chown -R \$USER:\$USER $REMOTE_DIR

  echo '[setup] Bare-repo создан: /opt/deploy/deep-agg.git'
  echo '[setup] Рабочая директория: $REMOTE_DIR'
"

echo "[setup] Создание post-receive hook"
cat > /tmp/post-receive << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
TARGET="/opt/deep-agg"
GIT_DIR="/opt/deploy/deep-agg.git"
BRANCH="main"

read oldrev newrev refname
if [ "$refname" = "refs/heads/$BRANCH" ]; then
  echo "[deploy] updating $TARGET to $newrev"
  git --work-tree="$TARGET" --git-dir="$GIT_DIR" checkout -f "$BRANCH"
  cd "$TARGET"
  if [ -f package-lock.json ]; then npm ci; fi
  if command -v pm2 >/dev/null 2>&1; then pm2 restart deep-aggregator || pm2 start ecosystem.config.cjs; pm2 save; fi
fi
EOF

scp /tmp/post-receive "$HOST:/opt/deploy/deep-agg.git/hooks/post-receive"
ssh "$HOST" "chmod +x /opt/deploy/deep-agg.git/hooks/post-receive"

echo "[setup] Git-деплой настроен!"
echo "[setup] Локально добавьте: git remote add prod ssh://$HOST/opt/deploy/deep-agg.git"
