#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/deep-agg"
SERVICE="deep-aggregator"

# 1) Пакеты
apt-get update -y
apt-get install -y git nginx jq curl ca-certificates

# 2) Node.js 20
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2-3)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# 3) Код
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git fetch --all && git reset --hard origin/main
else
  rm -rf "$APP_DIR"
  git clone --depth=1 -b main https://github.com/offflinerpsy/deep-components-aggregator.git "$APP_DIR"
fi
cd "$APP_DIR"

# 4) Зависяки
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm i  --no-audit --no-fund
fi

# 5) Мини-корпус, чтобы /api/search не был пуст
mkdir -p data
if [ ! -s data/corpus.json ]; then
  cat > data/corpus.json <<'JSON'
[
  {"id":"LM317","url":"https://chipdip.ru/product/lm317t","title":"LM317 adjustable regulator","brand":"ST","sku":"LM317","mpn":"LM317","text":"adjustable voltage regulator"},
  {"id":"1N4148","url":"https://chipdip.ru/product/1n4148","title":"1N4148 diode","brand":"Diodes Inc","sku":"1N4148","mpn":"1N4148","text":"signal diode"},
  {"id":"2N7002","url":"https://chipdip.ru/product/2n7002","title":"2N7002 n-mosfet","brand":"onsemi","sku":"2N7002","mpn":"2N7002","text":"n-channel mosfet"}
]
JSON
fi

# 6) systemd unit
cat >/etc/systemd/system/${SERVICE}.service <<UNIT
[Unit]
Description=Deep Aggregator API
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable ${SERVICE}
systemctl restart ${SERVICE}

# 7) Nginx site (SSE без буферизации)
cat >/etc/nginx/sites-available/deep-agg.conf <<NGINX
server {
  listen 80 default_server;
  server_name _;
  access_log /var/log/nginx/deep-agg.access.log;
  error_log  /var/log/nginx/deep-agg.error.log;

  root ${APP_DIR}/public;
  index index.html;

  location = / { return 302 /ui/search.html; }
  location = /health { return 200 "ok\n"; add_header Content-Type text/plain; }

  location /api/ {
    proxy_pass http://127.0.0.1:9201/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 1h;
  }
  location /api/live/ {
    proxy_pass http://127.0.0.1:9201/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 1h;
    proxy_buffering off;
    add_header X-Accel-Buffering no always;
  }
}
NGINX

ln -sf /etc/nginx/sites-available/deep-agg.conf /etc/nginx/sites-enabled/deep-agg.conf
[ -f /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# 8) Пробы
curl -fsS http://127.0.0.1/health | grep -q ok
COUNT=$(curl -fsS "http://127.0.0.1/api/search?q=LM317" | jq -r ".count // (.items|length)")
echo "search_count=${COUNT}"
test "${COUNT}" -ge 1

TS=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p ${APP_DIR}/_diag/${TS}
{
  echo "ts: ${TS}"
  echo "svc: $(systemctl is-active ${SERVICE})"
  echo "rev: $(git -C ${APP_DIR} rev-parse --short HEAD)"
  echo "health: $(curl -fsS http://127.0.0.1/health)"
  echo "search LM317 count: ${COUNT}"
} > ${APP_DIR}/_diag/${TS}/SUMMARY.txt
chmod -R a+r ${APP_DIR}/_diag/${TS}
echo "OK"
