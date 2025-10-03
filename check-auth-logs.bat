@echo off
setlocal enabledelayedexpansion
set SERVER=5.129.228.88
set USER=root
set PASSWORD="hKsxPKR+2ayZ^c"

echo === Check Server Logs for Auth Errors ===
echo.
echo [1/2] Last 50 lines of server.log
plink.exe -batch -ssh %USER%@%SERVER% -pw %PASSWORD% "tail -n 50 /opt/deep-agg/logs/server.log | grep -A 3 -B 3 -i 'register\|validation\|error' || tail -n 50 /opt/deep-agg/logs/server.log"

echo.
echo [2/2] Check if auth.js exists
plink.exe -batch -ssh %USER%@%SERVER% -pw %PASSWORD% "ls -lh /opt/deep-agg/api/auth.js && head -n 5 /opt/deep-agg/api/auth.js"

echo.
echo === Logs Check Complete ===
