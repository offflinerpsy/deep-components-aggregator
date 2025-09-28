@echo off
echo === DEPLOYING TO 89.104.69.77 ===
echo This script will deploy the application to production server
echo Press any key to continue or Ctrl+C to cancel
pause

set HOST=89.104.69.77
set USER=root
set PASS=DCIIcWfISxT3R4hT

echo Step 1: Creating archive...
tar -czf deploy.tgz --exclude=.git --exclude=node_modules --exclude=.secrets --exclude=_diag --exclude=dist .
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to create archive
    pause
    exit /b 1
)

echo Step 2: Uploading archive to server...
scp deploy.tgz %USER%@%HOST%:/root/
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to upload archive
    pause
    exit /b 1
)

echo Step 3: Creating deployment script...
(
echo #!/bin/bash
echo set -e
echo echo "Starting deployment..."
echo
echo # Stop service if running
echo systemctl stop deep-aggregator 2^>/dev/null ^|^| true
echo
echo # Create directories
echo mkdir -p /opt/deep-agg
echo mkdir -p /opt/deep-agg/data/cache/html
echo mkdir -p /opt/deep-agg/data/db/products
echo mkdir -p /opt/deep-agg/data/idx
echo mkdir -p /opt/deep-agg/data/state
echo mkdir -p /opt/deep-agg/data/files/pdf
echo mkdir -p /opt/deep-agg/loads/urls
echo mkdir -p /opt/deep-agg/secrets/apis
echo
echo # Extract archive
echo cd /root
echo tar -xzf deploy.tgz -C /opt/deep-agg/
echo cd /opt/deep-agg
echo
echo # Create API secrets
echo echo "Creating API secrets..."
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
echo # Create test URLs
echo cat ^> loads/urls/test.txt ^<^<'EOF'
echo https://www.chipdip.ru/product/lm317t
echo https://www.chipdip.ru/product/1n4148
echo https://www.chipdip.ru/product/ne555p
echo https://www.chipdip.ru/product/ldb-500l
echo EOF
echo
echo # Install dependencies
echo echo "Installing dependencies..."
echo npm install --production
echo
echo # Refresh currency rates
echo echo "Refreshing currency rates..."
echo npm run rates:refresh ^|^| true
echo
echo # Run data ingestion
echo echo "Running data ingestion..."
echo npm run data:ingest:chipdip -- --limit 200 ^|^| true
echo
echo # Build search index
echo echo "Building search index..."
echo npm run data:index:build ^|^| true
echo
echo # Create systemd service
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
echo # Configure systemd
echo systemctl daemon-reload
echo systemctl enable deep-aggregator
echo systemctl start deep-aggregator
echo
echo # Configure Nginx
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
echo curl -s http://localhost/api/health
echo curl -s "http://localhost/api/search?q=LM317"
echo echo "=== ALL DONE ==="
) > install.sh

echo Step 4: Uploading install script...
scp install.sh %USER%@%HOST%:/root/
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to upload install script
    pause
    exit /b 1
)

echo Step 5: Running installation on server...
echo This may take several minutes...
ssh %USER%@%HOST% "chmod +x /root/install.sh && bash /root/install.sh"

echo Step 6: Testing deployment...
echo Testing health endpoint:
ssh %USER%@%HOST% "curl -s http://localhost/api/health"

echo.
echo Testing search endpoint:
ssh %USER%@%HOST% "curl -s 'http://localhost/api/search?q=LM317'"

echo.
echo === DEPLOYMENT COMPLETED ===
echo You can now access the application at:
echo http://89.104.69.77/
echo.
echo Press any key to exit
pause
