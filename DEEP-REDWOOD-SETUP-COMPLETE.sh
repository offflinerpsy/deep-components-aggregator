#!/bin/bash
# ПОЛНАЯ НАСТРОЙКА СЕРВЕРА DEEP-REDWOOD-317
# Выполнить ПОСЛЕ восстановления SSH доступа

set -e

echo "=== DEEP-REDWOOD-317-SYNC/END-TO-END ==="

# 0) Префлайт на сервере (root)
echo "[0] Префлайт сервера..."
whoami && lsb_release -ds
apt-get update -y
apt-get install -y git ca-certificates curl gnupg lsb-release

# 1) SSH: добавить ключ и проверить вход
echo "[1] Настройка SSH ключей..."
install -d -m 700 /root/.ssh
printf '%s\n' 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEumPVQnXNE5xC8yOWT8JSGgodOx0qnLBnV8FHCZp9YN win-proxy' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

echo "SSH ключ добавлен. Проверьте с клиента:"
echo "ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 root@89.104.69.77 'echo OK-SSH'"

# 2) Базовая защита (UFW) — только нужные порты
echo "[2] Настройка UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
yes | ufw enable
ufw status verbose

# 3) Swap 2 ГБ (на 2 ГБ RAM обязательно)
echo "[3] Создание swap 2GB..."
fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
swapon --show && free -h

# 4) Готовим деплой через git (bare-repo + post-receive)
echo "[4] Настройка Git деплоя..."
mkdir -p /opt/deploy /opt/deep-agg
git init --bare /opt/deploy/deep-agg.git

cat >/opt/deploy/deep-agg.git/hooks/post-receive <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
GIT_DIR="/opt/deploy/deep-agg.git"
WORK_TREE="/opt/deep-agg"
export GIT_DIR GIT_WORK_TREE="$WORK_TREE"

git checkout -f               # выложить присланную ветку в рабочее дерево
cd "$WORK_TREE"
git rev-parse HEAD > .deployed-sha
HOOK
chmod +x /opt/deploy/deep-agg.git/hooks/post-receive

echo "Git bare-repo настроен: /opt/deploy/deep-agg.git"

# 5) Node.js LTS + PM2
echo "[5] Установка Node.js 22.x..."
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main' \
  > /etc/apt/sources.list.d/nodesource.list
apt-get update -y
apt-get install -y nodejs
node -v && npm -v

echo "[5.2] Установка PM2..."
npm i -g pm2
pm2 startup systemd -u root --hp /root

# 6) NGINX как reverse-proxy (опционально)
echo "[6] Настройка NGINX reverse proxy..."
apt-get install -y nginx
cat >/etc/nginx/sites-available/deep-aggregator <<'NGINX'
server {
  listen 80;
  server_name _;

  location / {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass http://127.0.0.1:9201;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/deep-aggregator /etc/nginx/sites-enabled/deep-aggregator
nginx -t && systemctl reload nginx

echo "=== НАСТРОЙКА ЗАВЕРШЕНА ==="
echo "Следующие шаги:"
echo "1. Проверить SSH ключ с клиента"
echo "2. Настроить git remote локально"
echo "3. Запустить приложение через PM2"
echo "4. Ужесточить SSH (после проверки ключей)"
