# PowerShell скрипт для деплоя на продакшн-сервер
param(
    [string]$Host = "89.104.69.77",
    [string]$User = "root",
    [string]$Pass = "DCIIcWfISxT3R4hT"
)

Write-Host "=== DEPLOYING TO $Host ===" -ForegroundColor Green

# Создаем архив проекта
Write-Host "Creating deployment archive..." -ForegroundColor Yellow
if (Test-Path "deploy.tgz") { Remove-Item "deploy.tgz" }
tar -czf deploy.tgz --exclude=.git --exclude=node_modules --exclude=.secrets --exclude=_diag --exclude=dist .

# Создаем скрипт установки
Write-Host "Creating install script..." -ForegroundColor Yellow
$installScript = @'
#!/bin/bash
set -e
echo "=== Starting deployment ==="

# Останавливаем сервис если запущен
systemctl stop deep-aggregator 2>/dev/null || true

# Создаем директорию приложения
mkdir -p /opt/deep-agg

# Распаковываем архив
cd /root
tar -xzf deploy.tgz -C /opt/deep-agg/

# Переходим в директорию приложения
cd /opt/deep-agg

# Создаем необходимые директории
mkdir -p data/cache/html data/db/products data/idx data/state data/files/pdf loads/urls

# Создаем секреты
mkdir -p secrets/apis
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

# Создаем тестовые URL для инжеста
cat > loads/urls/test.txt << 'EOF'
https://www.chipdip.ru/product/lm317t
https://www.chipdip.ru/product/1n4148
https://www.chipdip.ru/product/ne555p
https://www.chipdip.ru/product/ldb-500l
EOF

# Устанавливаем зависимости
echo "Installing dependencies..."
npm install --production

# Обновляем курсы валют
echo "Refreshing currency rates..."
npm run rates:refresh || true

# Запускаем инжест данных
echo "Running data ingestion..."
npm run data:ingest:chipdip -- --limit 200 || true

# Строим поисковый индекс
echo "Building search index..."
npm run data:index:build || true

# Создаем systemd сервис
echo "Creating systemd service..."
cat > /etc/systemd/system/deep-aggregator.service << 'UNIT'
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

# Перезагружаем systemd и запускаем сервис
systemctl daemon-reload
systemctl enable deep-aggregator
systemctl start deep-aggregator

# Настраиваем Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/deep-agg << 'NGINX'
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

ln -sf /etc/nginx/sites-available/deep-agg /etc/nginx/sites-enabled/deep-agg
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "=== Deployment completed ==="
echo "Testing endpoints..."
sleep 5

# Проверяем работу
echo "Health check:"
curl -s http://localhost/api/health || echo "Health check failed"

echo "Search test:"
curl -s "http://localhost/api/search?q=LM317" || echo "Search failed"

'@

$installScript | Out-File -FilePath "install.sh" -Encoding UTF8

# Загружаем файлы на сервер
Write-Host "Uploading files to server..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no deploy.tgz "${User}@${Host}:/root/"
scp -o StrictHostKeyChecking=no install.sh "${User}@${Host}:/root/"

# Выполняем установку
Write-Host "Running installation on server..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no "${User}@${Host}" "chmod +x /root/install.sh && bash /root/install.sh"

# Проверяем результат
Write-Host "=== FINAL CHECKS ===" -ForegroundColor Green
Write-Host "Testing health endpoint..."
ssh -o StrictHostKeyChecking=no "${User}@${Host}" "curl -s http://localhost/api/health"

Write-Host "Testing search endpoint..."
ssh -o StrictHostKeyChecking=no "${User}@${Host}" "curl -s 'http://localhost/api/search?q=LM317'"

Write-Host "Testing external access..."
try {
    $response = Invoke-WebRequest -Uri "http://$Host/api/health" -TimeoutSec 10
    Write-Host "External health check: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "External health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== DEPLOYMENT COMPLETED ===" -ForegroundColor Green
