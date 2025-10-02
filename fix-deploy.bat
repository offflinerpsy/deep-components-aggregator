@echo off
echo === FIXING DEPLOYMENT ON SERVER ===
echo.

set HOST=89.104.69.77
set USER=root
set PASS=DCIIcWfISxT3R4hT

echo Creating fix script...
(
echo #!/bin/bash
echo set -e
echo echo "=== FIXING DEPLOYMENT ==="
echo
echo # Install Node.js if missing
echo if ! command -v node &> /dev/null; then
echo   echo "Installing Node.js..."
echo   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
echo   apt-get install -y nodejs
echo fi
echo
echo cd /opt/deep-agg
echo
echo # Ensure directories exist
echo mkdir -p data/cache/html data/db/products data/idx data/state data/files/pdf loads/urls
echo
echo # Create test URLs if needed
echo if [ ! -f loads/urls/test.txt ]; then
echo   mkdir -p loads/urls
echo   cat > loads/urls/test.txt << 'EOF'
echo https://www.chipdip.ru/product/lm317t
echo https://www.chipdip.ru/product/1n4148
echo https://www.chipdip.ru/product/ne555p
echo https://www.chipdip.ru/product/ldb-500l
echo EOF
echo fi
echo
echo # Run data processing
echo echo "Refreshing currency rates..."
echo npm run rates:refresh || true
echo
echo echo "Running data ingestion..."
echo npm run data:ingest:chipdip -- --limit 200 || true
echo
echo echo "Building search index..."
echo npm run data:index:build || true
echo
echo # Restart services
echo systemctl restart deep-aggregator
echo systemctl restart nginx
echo
echo # Check results
echo echo "=== CHECKING RESULTS ==="
echo curl -s http://localhost/api/health
echo curl -s "http://localhost/api/search?q=LM317" | head -c 200
echo
echo echo "=== FIX COMPLETED ==="
) > fix-script.sh

echo Uploading fix script...
pscp -pw %PASS% fix-script.sh %USER%@%HOST%:/root/fix-script.sh

echo Running fix script on server...
plink -batch -pw %PASS% %USER%@%HOST% "chmod +x /root/fix-script.sh && bash /root/fix-script.sh"

echo === FIX COMPLETE ===
pause
