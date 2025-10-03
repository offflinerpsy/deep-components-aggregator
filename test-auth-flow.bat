@echo off
setlocal enabledelayedexpansion
set SERVER=5.129.228.88
set USER=root
set PASSWORD="hKsxPKR+2ayZ^c"

echo === Complete Auth and Orders Flow Test ===
echo.

echo [1/6] Test Registration (new user)
set EMAIL=test-flow-%RANDOM%@example.com
set PASS=TestPass123!
echo Email: %EMAIL%
plink.exe -batch -ssh %USER%@%SERVER% -pw %PASSWORD% "curl -s -X POST http://localhost:9201/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"%EMAIL%\",\"password\":\"%PASS%\",\"confirmPassword\":\"%PASS%\",\"name\":\"Test User\"}' | jq -r '.message // .error // \"Registration failed\"'"

echo.
echo [2/6] Test Login (get session cookie)
plink.exe -batch -ssh %USER%@%SERVER% -pw %PASSWORD% "curl -s -c /tmp/cookies.txt -X POST http://localhost:9201/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"%EMAIL%\",\"password\":\"%PASS%\"}' | jq -r '.message // .error // \"Login failed\"'"

echo.
echo [3/6] Verify Session (/auth/me)
plink.exe -batch -ssh %USER%@%SERVER% -pw %PASSWORD% "curl -s -b /tmp/cookies.txt http://localhost:9201/auth/me | jq -r '.email // \"Session verification failed\"'"

echo.
echo [4/6] Check Active Sessions Count
plink.exe -batch -ssh %USER%@%SERVER% -pw %PASSWORD% "cd /opt/deep-agg && node -e \"const db = require('better-sqlite3')('var/db/deepagg.sqlite'); console.log('Active sessions:', db.prepare('SELECT COUNT(*) as cnt FROM sessions').get().cnt);\""

echo.
echo [5/6] Create Test Order
plink.exe -batch -ssh %USER%@%SERVER% -pw %PASSWORD% "curl -s -b /tmp/cookies.txt -X POST http://localhost:9201/api/orders -H 'Content-Type: application/json' -d '{\"mpn\":\"LM317\",\"quantity\":100,\"notes\":\"Test order from flow\"}' | jq -r '.message // .error // \"Order creation failed\"'"

echo.
echo [6/6] Verify Order in Database
plink.exe -batch -ssh %USER%@%SERVER% -pw %PASSWORD% "cd /opt/deep-agg && node -e \"const db = require('better-sqlite3')('var/db/deepagg.sqlite'); const order = db.prepare('SELECT o.id, o.mpn, o.quantity, o.status, u.email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 1').get(); console.log(JSON.stringify(order || {message: 'No orders found'}, null, 2));\""

echo.
echo === Flow Test Complete! ===
