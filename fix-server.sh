#!/bin/bash
set -e

# Устанавливаем Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Проверяем директории
cd /opt/deep-agg
mkdir -p data/cache/html data/db/products data/idx data/state data/files/pdf loads/urls secrets/apis

# Создаем тестовые URL
cat > loads/urls/test.txt << 'EOF'
https://www.chipdip.ru/product/lm317t
https://www.chipdip.ru/product/1n4148
https://www.chipdip.ru/product/ne555p
https://www.chipdip.ru/product/ldb-500l
EOF

# Создаем секреты
cat > secrets/apis/scraperapi.txt << 'EOF'
a91efbc32580c3e8ab8b06ce9b6dc509
EOF

cat > secrets/apis/scrapingbee.txt << 'EOF'
ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ
1KYSOEVR8THW8U46DCJRVN23D1BUXT7YO7AGH4GCFDLOFJV7U9UCI8S6W2DXIZ1L50IT9QN0VBZBJK0A
EOF

cat > secrets/apis/scrapingbot.txt << 'EOF'
YObdDv4IEG9tXWW5Fd614JLNZ
EOF

# Устанавливаем зависимости
npm install

# Запускаем процессы
npm run rates:refresh
npm run data:ingest:chipdip -- --limit 200
npm run data:index:build

# Настраиваем systemd
cat > /etc/systemd/system/deep-aggregator.service << 'EOF'
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
EOF

# Настраиваем Nginx
cat > /etc/nginx/sites-available/deep-agg.conf << 'EOF'
server {
  listen 80;
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
EOF

ln -sf /etc/nginx/sites-available/deep-agg.conf /etc/nginx/sites-enabled/deep-agg.conf
rm -f /etc/nginx/sites-enabled/default

# Перезапускаем сервисы
systemctl daemon-reload
systemctl restart deep-aggregator
nginx -t && systemctl restart nginx

# Проверяем результаты
echo "=== РЕЗУЛЬТАТЫ ==="
echo "Health API:"
curl -s http://localhost/api/health
echo
echo "Search API (LM317):"
curl -s "http://localhost/api/search?q=LM317" | head -c 300
echo
