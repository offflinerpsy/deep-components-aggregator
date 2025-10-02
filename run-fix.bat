@echo off
echo === FIXING SERVER ISSUES ===

set HOST=89.104.69.77
set USER=root
set PASS=DCIIcWfISxT3R4hT

echo Uploading fix script...
pscp -batch -pw %PASS% fix-server.sh %USER%@%HOST%:/root/fix-server.sh

echo Running fix script on server...
plink -batch -pw %PASS% %USER%@%HOST% "chmod +x /root/fix-server.sh && bash /root/fix-server.sh"

echo === FIX COMPLETED ===
echo Testing server...
curl -s http://89.104.69.77/api/health
echo.
curl -s "http://89.104.69.77/api/search?q=LM317" | head -c 300
echo.

echo === DONE ===
