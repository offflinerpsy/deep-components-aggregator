@echo off
setlocal enabledelayedexpansion

REM ---- 0) Локальные переменные (правь при необходимости)
set -e
set HOST=89.104.69.77
set USER=root
set PASS=DCIIcWfISxT3R4hT
set BRANCH=feature/scraping-pipeline-final

echo === ONE-SHOT DEPLOY TO %HOST% ===

REM ---- 1) Подготовка секретов (ключи API, что ты прислал)
echo Creating secrets directory...
mkdir ".secrets-for-deploy" 2>nul
mkdir ".secrets-for-deploy\apis" 2>nul

> ".secrets-for-deploy\apis\scraperapi.txt" (
  echo a91efbc32580c3e8ab8b06ce9b6dc509
)
> ".secrets-for-deploy\apis\scrapingbee.txt" (
  echo ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ
  echo 1KYSOEVR8THW8U46DCJRVN23D1BUXT7YO7AGH4GCFDLOFJV7U9UCI8S6W2DXIZ1L50IT9QN0VBZBJK0A
)
> ".secrets-for-deploy\apis\scrapingbot.txt" (
  echo YObdDv4IEG9tXWW5Fd614JLNZ
)

REM ---- 2) Упаковать проект (без .git и node_modules)
echo Creating deployment archive...
tar -czf deploy.tgz --exclude=.git --exclude=node_modules --exclude=.secrets --exclude=_diag --exclude=dist .

REM ---- 3) Закинуть архив и подготовить удалённый скрипт (PuTTY: pscp/plink)
echo Uploading archive to server...
pscp -pw %PASS% deploy.tgz %USER%@%HOST%:/root/deploy.tgz

REM ---- 4) Сформировать удалённый скрипт восстановления/деплоя
echo Creating remote deployment script...
(
echo #!/usr/bin/env bash
echo set -euo pipefail
echo export DEBIAN_FRONTEND=noninteractive
echo BRANCH="%BRANCH%"
echo APP_DIR=/opt/deep-agg
echo SECR_DIR=/opt/deep-agg/secrets/apis
echo mkdir -p "$APP_DIR" "$SECR_DIR"
echo tar -xzf /root/deploy.tgz -C "$APP_DIR"
echo mkdir -p "$SECR_DIR"
echo cat ^> "$SECR_DIR/scraperapi.txt" ^<^<'EOF1'
echo a91efbc32580c3e8ab8b06ce9b6dc509
echo EOF1
echo cat ^> "$SECR_DIR/scrapingbee.txt" ^<^<'EOF2'
echo ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ
echo 1KYSOEVR8THW8U46DCJRVN23D1BUXT7YO7AGH4GCFDLOFJV7U9UCI8S6W2DXIZ1L50IT9QN0VBZBJK0A
echo EOF2
echo cat ^> "$SECR_DIR/scrapingbot.txt" ^<^<'EOF3'
echo YObdDv4IEG9tXWW5Fd614JLNZ
echo EOF3
echo apt-get update -y ^> /dev/null 2^>^&1 ^|^| true
echo apt-get install -y nginx git curl ca-certificates ^> /dev/null 2^>^&1 ^|^| true
echo "node -v ^>/dev/null 2^>^&1 ^|^| curl -fsSL https://deb.nodesource.com/setup_20.x ^| bash - ^&^& apt-get install -y nodejs" ^> /dev/null
echo cd "$APP_DIR"
echo git rev-parse --is-inside-work-tree ^>/dev/null 2^>^&1 ^|^| ^(git init ^&^& git config user.email nop@n.op ^&^& git config user.name nop^)
echo git remote remove origin ^>/dev/null 2^>^&1 ^|^| true
echo git add -A ^> /dev/null 2^>^&1 ^|^| true
echo git commit -m "sync" ^> /dev/null 2^>^&1 ^|^| true
echo npm ci ^> /dev/null 2^>^&1 ^|^| npm install ^> /dev/null
echo npm run rates:refresh ^> /dev/null 2^>^&1 ^|^| true
echo npm run data:ingest:chipdip ^> /dev/null 2^>^&1 ^|^| true
echo npm run data:index:build ^> /dev/null 2^>^&1 ^|^| true
echo cat ^>/etc/systemd/system/deep-aggregator.service ^<^<'UNIT'
echo [Unit]
echo Description=Deep Aggregator
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
echo systemctl daemon-reload
echo systemctl enable deep-aggregator ^> /dev/null 2^>^&1 ^|^| true
echo systemctl restart deep-aggregator
echo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
echo cat ^>/etc/nginx/sites-available/deep-agg.conf ^<^<'NGX'
echo server {
echo   listen 80;
echo   server_name _;
echo   root /opt/deep-agg/public;
echo   index index.html;
echo   location /api/live/ {
echo     proxy_pass http://127.0.0.1:9201;
echo     proxy_http_version 1.1;
echo     proxy_set_header Connection '';
echo     proxy_buffering off;  # SSE: disable buffers ^(nginx docs^)
echo     add_header X-Accel-Buffering no always;
echo   }
echo   location /api/ {
echo     proxy_pass http://127.0.0.1:9201;
echo   }
echo   location / {
echo     try_files $uri $uri/ /index.html;
echo   }
echo }
echo NGX
echo ln -sf /etc/nginx/sites-available/deep-agg.conf /etc/nginx/sites-enabled/deep-agg.conf
echo nginx -t ^&^& systemctl restart nginx
echo echo "== POST-CHECKS =="
echo curl -s -o /dev/null -w "ROOT %%{http_code}\n" http://127.0.0.1/
echo curl -s http://127.0.0.1/api/health ^| head -c 200 ^| sed -e 's/$/\\n/'
echo curl -s "http://127.0.0.1/api/search?q=LM317" ^| head -c 200 ^| sed -e 's/$/\\n/'
echo curl -s "http://127.0.0.1/api/search?q=1N4148" ^| head -c 200 ^| sed -e 's/$/\\n/'
echo curl -s "http://127.0.0.1/api/search?q=LDB-500L" ^| head -c 200 ^| sed -e 's/$/\\n/'
echo echo "== IF EMPTY: force ingestion from loads/urls and re-index =="
echo if ls loads/urls/*.txt ^> /dev/null 2^>^&1; then
echo   npm run data:ingest:chipdip ^> /dev/null 2^>^&1 ^|^| true
echo   npm run data:index:build ^> /dev/null 2^>^&1 ^|^| true
echo   curl -s "http://127.0.0.1/api/search?q=LM317" ^| head -c 200 ^| sed -e 's/$/\\n/'
echo fi
) > remote-setup.sh

REM ---- 5) Закинуть и выполнить удалённый скрипт (неинтерактивно)
echo Uploading and executing remote script...
pscp -pw %PASS% remote-setup.sh %USER%@%HOST%:/root/prod-recover.sh
plink -batch -pw %PASS% %USER%@%HOST% "sed -i 's/\r$//' /root/prod-recover.sh && chmod +x /root/prod-recover.sh && bash /root/prod-recover.sh"

REM ---- 6) Внешние проверки с твоей машины (порт 80)
echo === FINAL EXTERNAL CHECKS ===
echo Testing root page...
curl -I http://%HOST%/
echo.
echo Testing health API...
curl -s http://%HOST%/api/health
echo.
echo Testing search APIs...
curl -s "http://%HOST%/api/search?q=LM317" | head -c 300 & echo.
curl -s "http://%HOST%/api/search?q=1N4148" | head -c 300 & echo.
curl -s "http://%HOST%/api/search?q=LDB-500L" | head -c 300 & echo.

echo === DONE ===
echo If search is empty: populate loads/urls/*.txt and restart from step 2 (archive->upload->script).

endlocal
