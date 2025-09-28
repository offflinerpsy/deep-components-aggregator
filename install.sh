#/bin/bash
set -e
echo "=== DEPLOYMENT STARTED ==="
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Останавливаем сервис
systemctl stop deep-aggregator 2>/dev/null || true
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Создаем директории
mkdir -p /opt/deep-agg
mkdir -p /opt/deep-agg/data/cache/html
mkdir -p /opt/deep-agg/data/db/products  
mkdir -p /opt/deep-agg/data/idx
mkdir -p /opt/deep-agg/data/state
mkdir -p /opt/deep-agg/data/files/pdf
mkdir -p /opt/deep-agg/loads/urls
mkdir -p /opt/deep-agg/secrets/apis
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Распаковываем архив
cd /root
tar -xzf deploy.tgz -C /opt/deep-agg/
cd /opt/deep-agg
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Создаем секреты
cat > secrets/apis/scraperapi.txt <<'EOF'
a91efbc32580c3e8ab8b06ce9b6dc509
EOF
cat > secrets/apis/scrapingbee.txt <<'EOF'
ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ
1KYSOEVR8THW8U46DCJRVN23D1BUXT7YO7AGH4GCFDLOFJV7U9UCI8S6W2DXIZ1L50IT9QN0VBZBJK0A
EOF
cat > secrets/apis/scrapingbot.txt <<'EOF'
YObdDv4IEG9tXWW5Fd614JLNZ
EOF
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Создаем тестовые URL
cat > loads/urls/test.txt <<'EOF'
https://www.chipdip.ru/product/lm317t
https://www.chipdip.ru/product/1n4148
https://www.chipdip.ru/product/ne555p
https://www.chipdip.ru/product/ldb-500l
EOF
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Устанавливаем зависимости
echo "Installing dependencies..."
npm install --production
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Обновляем курсы валют
echo "Refreshing currency rates..."
npm run rates:refresh || true
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Запускаем инжест
echo "Running data ingestion..."
npm run data:ingest:chipdip -- --limit 200 || true
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Строим индекс
echo "Building search index..."
npm run data:index:build || true
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Создаем systemd сервис
echo "Creating systemd service..."
cat > /etc/systemd/system/deep-aggregator.service <<'UNIT'
[Unit]
Description=Deep Aggregator API
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
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Настраиваем systemd
systemctl daemon-reload
systemctl enable deep-aggregator
systemctl start deep-aggregator
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
# Настраиваем Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/deep-agg <<'NGINX'
server {
    listen 80 default_server;
    server_name _;
    root /opt/deep-agg/public;
    index index.html;
    location /api/live/ {
        proxy_pass http://127.0.0.1:9201;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        add_header X-Accel-Buffering no always;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:9201;
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
ln -sf /etc/nginx/sites-available/deep-agg /etc/nginx/sites-enabled/deep-agg
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
����� �뢮�� ������ �� �࠭ (ECHO) �⪫�祭.
echo "=== DEPLOYMENT COMPLETED ==="
echo "Testing endpoints..."
sleep 5
curl -s http://localhost/api/health || echo "Health check failed"
curl -s "http://localhost/api/search?q=LM317" || echo "Search failed"
