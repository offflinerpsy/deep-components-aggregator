#!/usr/bin/env bash
set -euo pipefail

# --- CONFIG ---
APP_DIR="/opt/deep-agg"
SERVICE="deep-aggregator"
GIT_REPO="https://github.com/offflinerpsy/deep-components-aggregator.git"
GIT_BRANCH="feature/scraping-pipeline-final"
DIAG_DIR="${APP_DIR}/_diag"
TS=$(date -u +%Y%m%dT%H%M%SZ)
DIAG_PATH="${DIAG_DIR}/${TS}"

# --- FUNCTIONS ---
log_diag() {
  mkdir -p "${DIAG_PATH}"
  echo "$@" >> "${DIAG_PATH}/SUMMARY.txt"
  echo "$@"
}

# --- DEPLOYMENT ---
log_diag "=== [0/9] Ensure deps (git,curl,node,jq,nginx) ..."
apt-get update -y
apt-get install -y git curl jq nginx ca-certificates
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

log_diag "=== [1/9] Stopping service..."
systemctl stop ${SERVICE} || log_diag "Service not running, continuing..."

log_diag "=== [2/9] Updating code from git..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch --all
  git clean -fdx # Clean untracked files and directories
  git reset --hard origin/${GIT_BRANCH}
  git checkout ${GIT_BRANCH}
  git pull origin ${GIT_BRANCH}
else
  rm -rf "$APP_DIR"
  git clone --depth=1 -b ${GIT_BRANCH} ${GIT_REPO} "$APP_DIR"
  cd "$APP_DIR"
fi

log_diag "=== [3/9] Installing dependencies..."
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm i --no-audit --no-fund
fi

log_diag "=== [4/9] Setting up secrets..."
# Secrets are expected to be copied via scp to /root/secrets and symlinked
mkdir -p "${APP_DIR}/secrets/apis"
ln -sfn /root/secrets/apis/scraperapi.txt "${APP_DIR}/secrets/apis/scraperapi.txt"
ln -sfn /root/secrets/apis/scrapingbee.txt "${APP_DIR}/secrets/apis/scrapingbee.txt"
ln -sfn /root/secrets/apis/scrapingbot.txt "${APP_DIR}/secrets/apis/scrapingbot.txt"
log_diag "Secrets symlinked."

log_diag "=== [5/9] Building data..."
# Copy test URLs for ingest
mkdir -p loads/urls
cat > loads/urls/prod-test.txt <<'EOF'
https://www.chipdip.ru/product/lm317t
https://www.chipdip.ru/product/1n4148
https://www.chipdip.ru/product/ne555p
https://www.chipdip.ru/product0/8003348587
https://www.chipdip.ru/product/ldb-500l
EOF

# Создаем необходимые директории
mkdir -p data/cache/html data/db/products data/idx data/state data/files/pdf

# Запускаем скрипты сборки данных
node scripts/refresh-rates.mjs
node scripts/ingest-chipdip-urls.mjs --limit 200
node scripts/build-index.mjs
log_diag "Data build complete."

log_diag "=== [6/9] Ensure systemd unit..."
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
systemctl start ${SERVICE}
log_diag "Service started."

log_diag "=== [7/9] Nginx config :80 -> :9201..."
cat >/etc/nginx/sites-available/deep-agg.conf <<NGINX
server {
    listen 80 default_server;
    server_name _;
    access_log /var/log/nginx/deep-agg.access.log;
    error_log /var/log/nginx/deep-agg.error.log;

    root ${APP_DIR}/public;
    index index.html;

    location = / {
        return 302 /index.html;
    }

    location = /health {
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:9201;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_read_timeout 1h;
    }

    location /api/live/ {
        proxy_pass http://127.0.0.1:9201;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_read_timeout 1h;
        proxy_buffering off;
        add_header X-Accel-Buffering no always;
    }

    location /files/ {
        alias ${APP_DIR}/data/files/;
        expires 1y;
        access_log off;
        log_not_found off;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/deep-agg.conf /etc/nginx/sites-enabled/deep-agg.conf
[ -f /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default
nginx -t >> "${DIAG_PATH}/NGINX.txt" 2>&1
systemctl reload nginx
log_diag "Nginx configured and reloaded."

log_diag "=== [8/9] Post-checks (:9201 & :80) ..."
sleep 5 # Give service time to fully start

# Check Node.js directly
NODE_HEALTH=$(curl -sS http://127.0.0.1:9201/api/health)
log_diag "Node /api/health: ${NODE_HEALTH}"
if ! echo "${NODE_HEALTH}" | jq -e '.status == "ok"' >/dev/null; then
  log_diag "FAIL: Node /api/health check failed."
  exit 1
fi

NODE_SEARCH_LM317=$(curl -sS "http://127.0.0.1:9201/api/search?q=LM317")
log_diag "Node /api/search?q=LM317: ${NODE_SEARCH_LM317}"
if ! echo "${NODE_SEARCH_LM317}" | jq -e '.count > 0' >/dev/null; then
  log_diag "FAIL: Node /api/search?q=LM317 check failed (count=0)."
  exit 1
fi

# Check via Nginx
NGINX_ROOT_HEAD=$(curl -sS -I http://127.0.0.1/)
log_diag "Nginx /: ${NGINX_ROOT_HEAD}"
if ! echo "${NGINX_ROOT_HEAD}" | grep -q "HTTP/1.1 200 OK"; then
  log_diag "FAIL: Nginx / check failed."
  exit 1
fi

NGINX_HEALTH=$(curl -sS http://127.0.0.1/api/health)
log_diag "Nginx /api/health: ${NGINX_HEALTH}"
if ! echo "${NGINX_HEALTH}" | jq -e '.status == "ok"' >/dev/null; then
  log_diag "FAIL: Nginx /api/health check failed."
  exit 1
fi

NGINX_SEARCH_LM317=$(curl -sS "http://127.0.0.1/api/search?q=LM317")
log_diag "Nginx /api/search?q=LM317: ${NGINX_SEARCH_LM317}"
if ! echo "${NGINX_SEARCH_LM317}" | jq -e '.count > 0' >/dev/null; then
  log_diag "FAIL: Nginx /api/search?q=LM317 check failed (count=0)."
  exit 1
fi

NGINX_SEARCH_TRANSISTOR=$(curl -sS "http://127.0.0.1/api/search?q=транзистор")
log_diag "Nginx /api/search?q=транзистор: ${NGINX_SEARCH_TRANSISTOR}"
if ! echo "${NGINX_SEARCH_TRANSISTOR}" | jq -e '.count > 0' >/dev/null; then
  log_diag "FAIL: Nginx /api/search?q=транзистор check failed (count=0)."
  exit 1
fi

NGINX_SEARCH_LDB500L=$(curl -sS "http://127.0.0.1/api/search?q=LDB-500L")
log_diag "Nginx /api/search?q=LDB-500L: ${NGINX_SEARCH_LDB500L}"
if ! echo "${NGINX_SEARCH_LDB500L}" | jq -e '.count > 0 or .status == "pending"' >/dev/null; then
  log_diag "FAIL: Nginx /api/search?q=LDB-500L check failed (count=0 and not pending)."
  exit 1
fi

log_diag "=== [9/9] Final report ..."
FINAL_HEALTH=$(curl -sS http://127.0.0.1/api/health)
log_diag "Final health check: ${FINAL_HEALTH}"

log_diag "--- DEPLOYMENT FINISHED OK ---"
chmod -R a+r "${DIAG_PATH}"

# Инструкции по откату:
cat > "${DIAG_PATH}/ROLLBACK.txt" <<'ROLLBACK'
# Инструкция по откату:

# 1. Остановка сервиса
systemctl stop deep-aggregator

# 2. Откат кода
cd /opt/deep-agg
git reset --hard HEAD~1  # или конкретный коммит

# 3. Очистка кеша и индекса (опционально)
rm -rf data/cache data/idx data/state

# 4. Перезапуск
systemctl start deep-aggregator

# 5. Проверка
curl -s http://127.0.0.1:9201/api/health | jq
ROLLBACK

log_diag "Rollback instructions saved to ${DIAG_PATH}/ROLLBACK.txt"