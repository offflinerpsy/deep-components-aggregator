@echo off
setlocal
REM Temporary deploy script with hardcoded password
set SERVER=5.129.228.88
set REMOTE_DIR=/opt/deep-agg

echo ========================================
echo   Full Auth Deploy to %SERVER%
echo ========================================

REM 1. Kill existing server
echo [1/8] Stopping existing server...
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^^c" "pkill -9 node || true"
timeout /t 2 /nobreak > nul

REM 2. Backup current state
echo [2/8] Backing up current state...
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^^c" "cd %REMOTE_DIR% && tar -czf backup-$(date +%%Y%%m%%d-%%H%%M%%S).tar.gz server.js api/ config/ db/ middleware/ metrics/ schemas/ ui/ 2>/dev/null || true"

REM 3. Copy server core & manifests
echo [3/8] Copying server core and manifests...
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" server.js root@%SERVER%:%REMOTE_DIR%/server.js
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" package.json root@%SERVER%:%REMOTE_DIR%/package.json
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" package-lock.json root@%SERVER%:%REMOTE_DIR%/package-lock.json

REM 4. Copy auth & session modules
echo [4/8] Copying auth modules...
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" -r config root@%SERVER%:%REMOTE_DIR%/
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" -r api root@%SERVER%:%REMOTE_DIR%/
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" -r middleware root@%SERVER%:%REMOTE_DIR%/
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" -r metrics root@%SERVER%:%REMOTE_DIR%/
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" -r schemas root@%SERVER%:%REMOTE_DIR%/
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" -r src root@%SERVER%:%REMOTE_DIR%/

REM 5. Copy UI and static assets
echo [5/8] Copying UI and public assets...
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" -r ui root@%SERVER%:%REMOTE_DIR%/
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" -r public root@%SERVER%:%REMOTE_DIR%/

REM 6. Copy migrations
echo [6/8] Copying migrations...
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" -r db root@%SERVER%:%REMOTE_DIR%/
pscp.exe -batch -pw "hKsxPKR+2ayZ^^c" -r scripts root@%SERVER%:%REMOTE_DIR%/

REM 7. Install deps, run migrations & start server
echo [7/8] Installing dependencies, running migrations and starting server...
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^^c" "cd %REMOTE_DIR% && mkdir -p logs && npm install --production --no-audit --no-fund && node scripts/apply_migration.mjs && nohup node server.js > logs/server.log 2>&1 &"

echo Waiting 5 seconds for server startup...
timeout /t 5 /nobreak > nul

REM 8. Smoke tests
echo [8/8] Running smoke tests...
echo.
echo --- Health Check ---
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^^c" "curl -s http://localhost:9201/api/health | head -c 200"
echo.
echo.
echo --- Register Test User ---
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^^c" "curl -s -c /tmp/cookies.txt -X POST http://localhost:9201/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"deploy_test@example.com\",\"password\":\"testpass123\",\"confirmPassword\":\"testpass123\",\"name\":\"Deploy Test\"}' | head -c 300"
echo.
echo.
echo --- Check Auth Me ---
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^^c" "curl -s -b /tmp/cookies.txt http://localhost:9201/auth/me | head -c 200"
echo.
echo.
echo --- Search Test ---
plink.exe -batch -ssh root@%SERVER% -pw "hKsxPKR+2ayZ^^c" "curl -s 'http://localhost:9201/api/search?q=LM317' | head -c 300"
echo.
echo.
echo ========================================
echo   Deploy Complete!
echo ========================================
echo.
echo Production URLs:
echo   Health:  http://%SERVER%:9201/api/health
echo   UI:      http://%SERVER%:9201/
echo   Auth:    http://%SERVER%:9201/ui/auth.html
echo   Orders:  http://%SERVER%:9201/ui/my-orders.html
echo.
endlocal
