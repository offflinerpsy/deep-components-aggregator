#!/bin/bash
# EMERGENCY-RECOVER-SSH+HTTP (V1) - Server Recovery Script
# Выполнять на сервере через Console/KVM

set -e

echo "🚨 EMERGENCY RECOVERY: SSH + HTTP Services"
echo "=========================================="

# B1. Снять возможный бан Fail2Ban и открыть UFW
echo "🔓 Step B1: Unbanning and opening UFW ports..."

# Снять бан по всем тюрьмам
fail2ban-client unban --all 2>/dev/null || echo "Fail2ban not installed or no bans"

# UFW: открыть 22,80,443
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw status || echo "UFW status check failed"

# B2. Починить SSH-доступ ключами
echo "🔑 Step B2: Fixing SSH access..."

# 1) гарантируем правильные права
install -d -m 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# 2) добавляем публичный ключ (ЗАМЕНИТЬ НА РЕАЛЬНЫЙ КЛЮЧ)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEumPVQnXNE5xC8yOWT8JSGgodOx0qnLBnV8FHCZp9YN win-proxy" >> /root/.ssh/authorized_keys

# 3) sshd_config — включаем ключи, краткосрочно разрешаем пароль
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#\?ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?UsePAM.*/UsePAM yes/' /etc/ssh/sshd_config

# 4) перезапуск sshd
systemctl restart ssh || systemctl restart sshd
systemctl status ssh --no-pager -l || echo "SSH service status check failed"

# B3. Проверка портов/слушателей
echo "🔍 Step B3: Checking listening ports..."
ss -lntp | egrep '(:22|:80|:443|:9201)' || echo "No expected ports listening"

# B4. Установить/поднять NGINX
echo "🌐 Step B4: Installing and configuring NGINX..."
apt-get update
apt-get install -y nginx

cat >/etc/nginx/sites-available/deep-agg.conf <<'NGINX'
server {
  listen 80 default_server;
  server_name _;

  root /opt/deep-agg/public;
  index index.html;

  location = /health { return 200 "ok\n"; add_header Content-Type text/plain; }
  location = / { return 302 /ui/search.html; }

  # обычные API-запросы
  location ^~ /api/ {
    proxy_pass http://127.0.0.1:9201/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 60s;
  }

  # SSE-стрим без буферизации
  location = /api/live-stream {
    proxy_pass http://127.0.0.1:9201/api/live-stream;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_read_timeout 1h;
    add_header X-Accel-Buffering no;
    gzip off;
  }
}
NGINX

ln -sf /etc/nginx/sites-available/deep-agg.conf /etc/nginx/sites-enabled/deep-agg.conf
[ -f /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
curl -fsS http://127.0.0.1/health || echo "NGINX health check failed"

# B5. Установить Node/PM2 и поднять backend
echo "🚀 Step B5: Installing Node/PM2 and starting backend..."

# Node & PM2
npm i -g pm2
pm2 -v

cd /opt/deep-agg || { echo "Directory /opt/deep-agg not found!"; exit 8; }

# установка зависимостей
[ -f package-lock.json ] && npm ci || npm i

# старт бэкенда
pm2 start server.js --name deep-aggregator -- --host 127.0.0.1 --port 9201

# автозапуск PM2
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME

# B6. Финальные проверки
echo "✅ Step B6: Final checks..."

# с самого сервера
curl -fsS http://127.0.0.1/health
curl -fsS -X POST http://127.0.0.1/api/live-search -H 'Content-Type: application/json' -d '{"q":"1N4148"}' | head -c 200

echo "🎉 Emergency recovery completed!"
echo "📋 Next steps:"
echo "1. Test SSH access from your local machine"
echo "2. Test HTTP access: http://89.104.69.77/"
echo "3. Run B7 to disable password authentication"
