#/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
BRANCH="feature/scraping-pipeline-final"
APP_DIR=/opt/deep-agg
SECR_DIR=/opt/deep-agg/secrets/apis
mkdir -p "$APP_DIR" "$SECR_DIR"
tar -xzf /root/deploy.tgz -C "$APP_DIR"
mkdir -p "$SECR_DIR"
cat > "$SECR_DIR/scraperapi.txt" <<'EOF1'
a91efbc32580c3e8ab8b06ce9b6dc509
EOF1
cat > "$SECR_DIR/scrapingbee.txt" <<'EOF2'
ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ
1KYSOEVR8THW8U46DCJRVN23D1BUXT7YO7AGH4GCFDLOFJV7U9UCI8S6W2DXIZ1L50IT9QN0VBZBJK0A
EOF2
cat > "$SECR_DIR/scrapingbot.txt" <<'EOF3'
YObdDv4IEG9tXWW5Fd614JLNZ
EOF3
apt-get update -y > /dev/null 2>&1 || true
apt-get install -y nginx git curl ca-certificates > /dev/null 2>&1 || true
"node -v ^>/dev/null 2^>^&1 ^|^| curl -fsSL https://deb.nodesource.com/setup_20.x ^| bash - ^&^& apt-get install -y nodejs" > /dev/null
cd "$APP_DIR"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || (git init && git config user.email nop@n.op && git config user.name nop)
git remote remove origin >/dev/null 2>&1 || true
git add -A > /dev/null 2>&1 || true
git commit -m "sync" > /dev/null 2>&1 || true
npm ci > /dev/null 2>&1 || npm install > /dev/null
npm run rates:refresh > /dev/null 2>&1 || true
npm run data:ingest:chipdip > /dev/null 2>&1 || true
npm run data:index:build > /dev/null 2>&1 || true
cat >/etc/systemd/system/deep-aggregator.service <<'UNIT'
[Unit]
Description=Deep Aggregator
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/deep-agg
ExecStart=/usr/bin/node /opt/deep-agg/server.js
Restart=always
Environment=NODE_ENV=production
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable deep-aggregator > /dev/null 2>&1 || true
systemctl restart deep-aggregator
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
cat >/etc/nginx/sites-available/deep-agg.conf <<'NGX'
server {
  listen 80;
  server_name _;
  root /opt/deep-agg/public;
  index index.html;
  location /api/live/ {
    proxy_pass http://127.0.0.1:9201;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;  # SSE: disable buffers (nginx docs)
    add_header X-Accel-Buffering no always;
  }
  location /api/ {
    proxy_pass http://127.0.0.1:9201;
  }
  location / {
    try_files $uri $uri/ /index.html;
  }
}
NGX
ln -sf /etc/nginx/sites-available/deep-agg.conf /etc/nginx/sites-enabled/deep-agg.conf
nginx -t && systemctl restart nginx
echo "== POST-CHECKS =="
curl -s -o /dev/null -w "ROOT %{http_code}\n" http://127.0.0.1/
curl -s http://127.0.0.1/api/health | head -c 200 | sed -e 's/$/\\n/'
curl -s "http://127.0.0.1/api/search?q=LM317" | head -c 200 | sed -e 's/$/\\n/'
curl -s "http://127.0.0.1/api/search?q=1N4148" | head -c 200 | sed -e 's/$/\\n/'
curl -s "http://127.0.0.1/api/search?q=LDB-500L" | head -c 200 | sed -e 's/$/\\n/'
echo "== IF EMPTY: force ingestion from loads/urls and re-index =="
if ls loads/urls/*.txt > /dev/null 2>&1; then
  npm run data:ingest:chipdip > /dev/null 2>&1 || true
  npm run data:index:build > /dev/null 2>&1 || true
  curl -s "http://127.0.0.1/api/search?q=LM317" | head -c 200 | sed -e 's/$/\\n/'
fi
