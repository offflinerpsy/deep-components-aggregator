@echo off
echo Killing all Node processes...
plink.exe -batch -ssh root@89.104.69.77 -pw DCIIcWfISxT3R4hT "killall node"
timeout /t 2 /nobreak >nul
echo.
echo Starting fresh server...
plink.exe -batch -ssh root@89.104.69.77 -pw DCIIcWfISxT3R4hT "cd /opt/deep-agg && nohup node server.js > logs/server.log 2>&1 &"
timeout /t 4 /nobreak >nul
echo.
echo Testing search API...
plink.exe -batch -ssh root@89.104.69.77 -pw DCIIcWfISxT3R4hT "curl -s 'http://localhost:9201/api/search?q=LM317' | head -c 500"
echo.
echo.
echo Server logs (last 20 lines):
plink.exe -batch -ssh root@89.104.69.77 -pw DCIIcWfISxT3R4hT "tail -n 20 /opt/deep-agg/logs/server.log"
