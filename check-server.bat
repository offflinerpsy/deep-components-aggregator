@echo off
echo === CHECKING SERVER STATUS ===
echo.

set HOST=89.104.69.77
set USER=root
set PASS=DCIIcWfISxT3R4hT

echo Testing root page...
curl -I http://%HOST%/
echo.

echo Testing health API...
curl -s http://%HOST%/api/health
echo.
echo.

echo Testing search API (LM317)...
curl -s "http://%HOST%/api/search?q=LM317" | head -c 300
echo.
echo.

echo Testing search API (1N4148)...
curl -s "http://%HOST%/api/search?q=1N4148" | head -c 300
echo.
echo.

echo Testing search API (LDB-500L)...
curl -s "http://%HOST%/api/search?q=LDB-500L" | head -c 300
echo.
echo.

echo === CHECK COMPLETE ===
pause
