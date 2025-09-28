#!/usr/bin/env bash
set -euo pipefail

# --- CONFIG ---
APP_DIR="/opt/deep-agg"
SERVICE="deep-aggregator"
GIT_REPO="https://github.com/offflinerpsy/deep-components-aggregator.git"
GIT_BRANCH="feature/scraping-pipeline-final"

# --- FUNCTIONS ---
log(){ echo "[deploy] $*"; }
need_pkg(){ command -v "$1" >/dev/null 2>&1; }

TS=$(date -u +%Y%m%dT%H%M%SZ)
DIAG_DIR="${APP_DIR}/_diag/${TS}"

log "=== [0/9] Ensure deps (git,curl,node,jq,nginx) ..."
if ! need_pkg git || ! need_pkg curl || ! need_pkg jq || ! need_pkg nginx; then
  apt-get update -y && apt-get install -y git curl ca-certificates jq nginx
fi
if ! need_pkg node || [ "${FORCE_NODE:-0}" = "1" ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

log "=== [1/9] Stopping service ..."
systemctl stop ${SERVICE} || true

log "=== [2/9] Updating code from git ..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git remote set-url origin "$GIT_REPO" || true
  if git fetch origin "$GIT_BRANCH"; then
    git reset --hard FETCH_HEAD
    git clean -fd
  else
    cd /
    rm -rf "$APP_DIR"
    git clone --depth=1 -b "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
    cd "$APP_DIR"
  fi
else
  rm -rf "$APP_DIR"
  git clone --depth=1 -b "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

log "=== [3/9] Installing dependencies ..."
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm i --no-audit --no-fund
fi

log "=== [4/9] Setting up secrets ..."
mkdir -p secrets/apis
install -m 600 /dev/stdin secrets/apis/scraperapi.txt <<'EOF'
a91efbc32580c3e8ab8b06ce9b6dc509
EOF
install -m 600 /dev/stdin secrets/apis/scrapingbee.txt <<'EOF'
ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ
1KYSOEVR8THW8U46DCJRVN23D1BUXT7YO7AGH4GCFDLOFJV7U9UCI8S6W2DXIZ1L50IT9QN0VBZBJK0A
9JRSP19RHKA1DB7WXZU96VZ5P9BSX4A7C4QEE7SXCJXDMFLSEIFPMRXFRVYFPPGLNLNO0LKY9EL9244E
EOF
install -m 600 /dev/stdin secrets/apis/scrapingbot.txt <<'EOF'
YObdDv4IEG9tXWW5Fd614JLNZ
EOF

log "=== [5/9] Building data ..."
mkdir -p loads/urls
install -m 644 /dev/stdin loads/urls/prod-test.txt <<'EOF'
https://www.chipdip.ru/product/lm317t
https://www.chipdip.ru/product/1n4148
https://www.chipdip.ru/product/ne555p
https://www.chipdip.ru/product0/8003348587
EOF
npm run rates:refresh
npm run data:ingest:chipdip
npm run data:index:build

log "=== [6/9] Ensure systemd unit ..."
install -m 644 /dev/stdin "/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=Deep Aggregator API
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Environment=NODE_ENV=production
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable ${SERVICE} || true
systemctl restart ${SERVICE}

log "=== [7/9] Nginx config :80 → :9201 ..."
install -m 644 /dev/stdin /etc/nginx/sites-available/deep-agg.conf <<EOF
server {
  listen 80 default_server;
  server_name _;
  access_log /var/log/nginx/deep-agg.access.log;
  error_log /var/log/nginx/deep-agg.error.log;
  root ${APP_DIR}/public;
  index index.html;

  location = /health { return 200 "ok\n"; add_header Content-Type text/plain; }
  location = / { try_files /index.html =404; }

  location /api/live/ {
    proxy_pass http://127.0.0.1:9201/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 1h;
    proxy_buffering off;
    add_header X-Accel-Buffering no always;
  }
  location /api/ {
    proxy_pass http://127.0.0.1:9201/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 300s;
  }
}
EOF
ln -sf /etc/nginx/sites-available/deep-agg.conf /etc/nginx/sites-enabled/deep-agg.conf
[ -f /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

log "=== [8/9] Post-checks (:9201 и :80) ..."
sleep 3
set +e
A1=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9201/)
A2=$(curl -s http://127.0.0.1:9201/api/health)
A3=$(curl -s http://127.0.0.1:9201/api/search?q=LM317 | jq -r '.count // 0')
B1=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/)
B2=$(curl -s http://127.0.0.1/api/health)
B3=$(curl -s http://127.0.0.1/api/search?q=LM317 | jq -r '.count // 0')
set -e

mkdir -p "$DIAG_DIR"
{
  echo "ts: ${TS}"
  echo "rev: $(git -C ${APP_DIR} rev-parse --short HEAD)"
  echo "svc: $(systemctl is-active ${SERVICE})"
  echo "/9201 / => ${A1}"
  echo "/9201 /api/health => ${A2}"
  echo "/9201 /api/search LM317 => ${A3}"
  echo "/80 / => ${B1}"
  echo "/80 /api/health => ${B2}"
  echo "/80 /api/search LM317 => ${B3}"
} > "${DIAG_DIR}/SUMMARY.txt"
nginx -T | head -n 200 > "${DIAG_DIR}/NGINX.txt"
if [ -f data/state/ingest-report.json ]; then cp data/state/ingest-report.json "${DIAG_DIR}/INGEST.json"; fi

log "--- DEPLOYMENT FINISHED OK ---"
