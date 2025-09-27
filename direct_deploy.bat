@echo off
echo 🔥 DIRECT SERVER RESET AND DEPLOY
echo.

set SERVER=95.217.134.12
set PASSWORD=NDZzHCYzPRKWfKRd

echo 📡 Testing server connectivity...
curl -m 5 http://%SERVER%/ >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Server is accessible
) else (
    echo ❌ Server not accessible
    exit /b 1
)

echo.
echo 🔧 Server commands to run manually:
echo.
echo === COPY AND PASTE THESE COMMANDS ON SERVER ===
echo.
echo # 1. Clean up
echo pkill -f node ^|^| true
echo rm -rf /opt/deep-agg/*
echo mkdir -p /opt/deep-agg
echo.
echo # 2. Install Node.js 20
echo curl -fsSL https://deb.nodesource.com/setup_20.x ^| bash -
echo apt-get install -y nodejs
echo.
echo # 3. Setup nginx proxy
echo cat ^> /etc/nginx/sites-available/deep-agg ^<^< 'EOF'
echo server {
echo     listen 80;
echo     server_name _;
echo     location / {
echo         proxy_pass http://127.0.0.1:9201;
echo         proxy_http_version 1.1;
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo     }
echo }
echo EOF
echo.
echo # 4. Enable nginx config
echo ln -sf /etc/nginx/sites-available/deep-agg /etc/nginx/sites-enabled/
echo rm -f /etc/nginx/sites-enabled/default
echo nginx -t ^&^& systemctl reload nginx
echo.
echo # 5. Create systemd service
echo cat ^> /etc/systemd/system/deep-agg.service ^<^< 'EOF'
echo [Unit]
echo Description=Deep Components Aggregator
echo After=network.target
echo.
echo [Service]
echo Type=simple
echo User=root
echo WorkingDirectory=/opt/deep-agg
echo ExecStart=/usr/bin/node server.js
echo Restart=always
echo Environment=NODE_ENV=production
echo Environment=PORT=9201
echo.
echo [Install]
echo WantedBy=multi-user.target
echo EOF
echo.
echo # 6. Enable service
echo systemctl daemon-reload
echo systemctl enable deep-agg
echo.
echo === END OF SERVER COMMANDS ===
echo.
echo 📋 After running commands above, use these to deploy:
echo.
echo # 7. Upload files (run locally)
echo scp -r server.js package.json src adapters public lib root@%SERVER%:/opt/deep-agg/
echo.
echo # 8. Start service (run on server)
echo cd /opt/deep-agg
echo npm install --production
echo systemctl start deep-agg
echo systemctl status deep-agg
echo.
echo # 9. Test
echo curl http://127.0.0.1:9201/api/search?q=LM317
echo.
echo 🎯 MANUAL DEPLOYMENT INSTRUCTIONS GENERATED
echo Connect to server and run the commands above
pause
