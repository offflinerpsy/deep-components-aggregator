@echo off
echo Copying mouser client...
pscp.exe -batch -pw DCIIcWfISxT3R4hT src\integrations\mouser\client.mjs root@89.104.69.77:/opt/deep-agg/src/integrations/mouser/client.mjs

echo Copying tme client...
pscp.exe -batch -pw DCIIcWfISxT3R4hT src\integrations\tme\client.mjs root@89.104.69.77:/opt/deep-agg/src/integrations/tme/client.mjs

echo Copying farnell client...
pscp.exe -batch -pw DCIIcWfISxT3R4hT src\integrations\farnell\client.mjs root@89.104.69.77:/opt/deep-agg/src/integrations/farnell/client.mjs

echo Restarting server...
plink.exe -batch -ssh root@89.104.69.77 -pw DCIIcWfISxT3R4hT "pkill -9 node ; cd /opt/deep-agg && nohup node server.js > /var/log/deep-agg.log 2>&1 &"

echo Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo Testing API...
plink.exe -batch -ssh root@89.104.69.77 -pw DCIIcWfISxT3R4hT "curl -s 'http://localhost:9201/api/search?q=LM317' | head -c 500"

echo.
echo Done! Check http://89.104.69.77:9201/?q=LM317
