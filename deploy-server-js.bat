@echo off
echo Uploading server.js to production...
pscp.exe -pw DCIIcWfISxT3R4hT server.js root@89.104.69.77:/opt/deep-agg/server.js
echo.
echo Restarting server...
plink.exe -batch -ssh root@89.104.69.77 -pw DCIIcWfISxT3R4hT "cd /opt/deep-agg && pkill -f 'node server.js' && nohup node server.js > logs/server.log 2>&1 &"
timeout /t 3 /nobreak >nul
echo.
echo Testing API...
plink.exe -batch -ssh root@89.104.69.77 -pw DCIIcWfISxT3R4hT "curl -s http://localhost:9201/api/search?q=LM317"
echo.
echo Done!
