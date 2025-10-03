@echo off
echo === Production Health & Auth Check ===
set SERVER=5.129.228.88

echo [1] Health check...
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^c" "curl -s http://localhost:9201/api/health | head -c 500"
echo.

echo [2] Auth /me (should be unauthorized)...
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^c" "curl -s http://localhost:9201/auth/me | head -c 300"
echo.

echo [3] Check orders table...
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^c" "cd /opt/deep-agg && sqlite3 var/db/deepagg.sqlite 'SELECT COUNT(*) FROM orders'"
echo.

echo [4] Check users table...
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^c" "cd /opt/deep-agg && sqlite3 var/db/deepagg.sqlite 'SELECT COUNT(*) FROM users'"
echo.

echo [5] Check Product Card v2...
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^c" "curl -s -I http://localhost:9201/ui/product-v2.html | head -n 1"
echo.

echo === Check Complete! ===
