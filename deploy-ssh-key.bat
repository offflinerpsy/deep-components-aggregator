@echo off
setlocal enabledelayedexpansion

set HOST=89.104.69.77
set USER=root
set PASS=DCIIcWfISxT3R4hT

echo === ONE-SHOT DEPLOY WITH SSH KEY SETUP ===

REM Генерируем SSH ключ если его нет
if not exist "deploy_key" (
    echo Generating SSH key...
    ssh-keygen -t rsa -b 2048 -f deploy_key -N "" -C "deploy@local"
)

REM Копируем публичный ключ на сервер
echo Copying SSH key to server...
type deploy_key.pub | ssh -o StrictHostKeyChecking=no %USER%@%HOST% "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

REM Создаем архив
echo Creating archive...
tar -czf deploy.tgz --exclude=.git --exclude=node_modules --exclude=.secrets --exclude=_diag --exclude=dist .

REM Загружаем архив
echo Uploading archive...
scp -i deploy_key -o StrictHostKeyChecking=no deploy.tgz %USER%@%HOST%:/root/

REM Создаем скрипт установки
echo Creating install script...
(
echo #!/bin/bash
echo set -e
echo echo "=== DEPLOYMENT STARTED ==="
echo
echo # Останавливаем сервис
echo systemctl stop deep-aggregator 2^>/dev/null ^|^| true
echo
echo # Создаем директории
echo mkdir -p /opt/deep-agg
echo mkdir -p /opt/deep-agg/data/cache/html
echo mkdir -p /opt/deep-agg/data/db/products
echo mkdir -p /opt/deep-agg/data/idx
echo mkdir -p /opt/deep-agg/data/state
echo mkdir -p /opt/deep-agg/data/files/pdf
echo mkdir -p /opt/deep-agg/loads/urls
echo mkdir -p /opt/deep-agg/secrets/apis
echo
echo # Распаковываем архив
echo cd /root
echo tar -xzf deploy.tgz -C /opt/deep-agg/
echo cd /opt/deep-agg
echo
echo # Создаем секреты
echo cat ^> secrets/apis/scraperapi.txt ^<^<'EOF'
echo a91efbc32580c3e8ab8b06ce9b6dc509
echo EOF
echo cat ^> secrets/apis/scrapingbee.txt ^<^<'EOF'
echo ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ
echo 1KYSOEVR8THW8U46DCJRVN23D1BUXT7YO7AGH4GCFDLOFJV7U9UCI8S6W2DXIZ1L50IT9QN0VBZBJK0A
echo EOF
echo cat ^> secrets/apis/scrapingbot.txt ^<^<'EOF'
echo YObdDv4IEG9tXWW5Fd614JLNZ
echo EOF
echo
echo # Создаем тестовые URL
echo cat ^> loads/urls/test.txt ^<^<'EOF'
echo https://www.chipdip.ru/product/lm317t
echo https://www.chipdip.ru/product/1n4148
echo https://www.chipdip.ru/product/ne555p
echo https://www.chipdip.ru/product/ldb-500l
echo EOF
echo
echo # Устанавливаем зависимости
echo echo "Installing dependencies..."
echo npm install --production
echo
echo # Обновляем курсы валют
echo echo "Refreshing currency rates..."
echo npm run rates:refresh ^|^| true
echo
echo # Запускаем инжест
echo echo "Running data ingestion..."
echo npm run data:ingest:chipdip -- --limit 200 ^|^| true
echo
echo # Строим индекс
echo echo "Building search index..."
echo npm run data:index:build ^|^| true
echo
echo # Создаем systemd сервис
echo echo "Creating systemd service..."
echo cat ^> /etc/systemd/system/deep-aggregator.service ^<^<'UNIT'
echo [Unit]
echo Description=Deep Aggregator API
echo After=network.target
echo [Service]
echo Type=simple
echo WorkingDirectory=/opt/deep-agg
echo ExecStart=/usr/bin/node /opt/deep-agg/server.js
echo Restart=always
echo Environment=NODE_ENV=production
echo [Install]
echo WantedBy=multi-user.target
echo UNIT
echo
echo # Настраиваем systemd
echo systemctl daemon-reload
echo systemctl enable deep-aggregator
echo systemctl start deep-aggregator
echo
echo # Настраиваем Nginx
echo echo "Configuring Nginx..."
echo cat ^> /etc/nginx/sites-available/deep-agg ^<^<'NGINX'
echo server {
echo     listen 80 default_server;
echo     server_name _;
echo     root /opt/deep-agg/public;
echo     index index.html;
echo     location /api/live/ {
echo         proxy_pass http://127.0.0.1:9201;
echo         proxy_http_version 1.1;
echo         proxy_set_header Connection '';
echo         proxy_buffering off;
echo         add_header X-Accel-Buffering no always;
echo     }
echo     location /api/ {
echo         proxy_pass http://127.0.0.1:9201;
echo     }
echo     location / {
echo         try_files $uri $uri/ /index.html;
echo     }
echo }
echo NGINX
echo
echo ln -sf /etc/nginx/sites-available/deep-agg /etc/nginx/sites-enabled/deep-agg
echo rm -f /etc/nginx/sites-enabled/default
echo nginx -t ^&^& systemctl restart nginx
echo
echo echo "=== DEPLOYMENT COMPLETED ==="
echo echo "Testing endpoints..."
echo sleep 5
echo curl -s http://localhost/api/health ^|^| echo "Health check failed"
echo curl -s "http://localhost/api/search?q=LM317" ^|^| echo "Search failed"
) > install.sh

REM Загружаем скрипт установки
echo Uploading install script...
scp -i deploy_key -o StrictHostKeyChecking=no install.sh %USER%@%HOST%:/root/

REM Выполняем установку
echo Running installation...
ssh -i deploy_key -o StrictHostKeyChecking=no %USER%@%HOST% "chmod +x /root/install.sh && bash /root/install.sh"

REM Проверяем результат
echo === FINAL CHECKS ===
echo Testing external access...
ssh -i deploy_key -o StrictHostKeyChecking=no %USER%@%HOST% "curl -s http://localhost/api/health"

echo === DONE ===
endlocal
