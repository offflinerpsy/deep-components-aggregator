@echo off
echo === Deploying to Amsterdam VPS ===

echo Step 1: Uploading archive...
pscp.exe -batch -pw "hKsxPKR+2ayZ^c" deploy.tar.gz root@5.129.228.88:/tmp/app.tar.gz

echo Step 2: Extracting and installing...
plink.exe -batch -ssh root@5.129.228.88 -pw "hKsxPKR+2ayZ^c" "cd /opt && rm -rf deep-agg && mkdir -p deep-agg && cd deep-agg && tar -xzf /tmp/app.tar.gz && npm install --production"

echo Step 3: Creating .env file...
plink.exe -batch -ssh root@5.129.228.88 -pw "hKsxPKR+2ayZ^c" "cd /opt/deep-agg && cat > .env" < .env

echo Step 4: Starting server...
plink.exe -batch -ssh root@5.129.228.88 -pw "hKsxPKR+2ayZ^c" "cd /opt/deep-agg && nohup node server.js > /var/log/deep-agg.log 2>&1 &"

echo Step 5: Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo Step 6: Testing API...
plink.exe -batch -ssh root@5.129.228.88 -pw "hKsxPKR+2ayZ^c" "curl -s 'http://localhost:9201/api/search?q=LM317' | python3 -m json.tool | head -n 30"

echo.
echo === DONE! ===
echo Server should be running at http://5.129.228.88:9201
