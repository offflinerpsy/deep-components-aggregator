@echo off
setlocal
REM Full deployment with auth + orders backend to production
REM Target: root@5.129.228.88:/opt/deep-agg

set SERVER=5.129.228.88
set REMOTE_DIR=/opt/deep-agg
set SCRIPT_DIR=%~dp0
set KEY_PATH=%SCRIPT_DIR%deploy_key
set AUTH_MODE=

if defined DEPLOY_PASSWORD (
	set "AUTH_MODE=password"
) else if exist "%KEY_PATH%" (
	set "AUTH_MODE=key"
) else (
	echo [ERROR] No authentication configured. Set DEPLOY_PASSWORD or place deploy_key next to this script.
	endlocal
	exit /b 1
)

goto :main

:run_ssh
if "%AUTH_MODE%"=="password" (
	plink.exe -batch -ssh -pw "%DEPLOY_PASSWORD%" root@%SERVER% %*
) else (
	ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i "%KEY_PATH%" root@%SERVER% %*
)
exit /b %errorlevel%

:run_scp
if "%AUTH_MODE%"=="password" (
	pscp.exe -batch -pw "%DEPLOY_PASSWORD%" %*
) else (
	scp -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i "%KEY_PATH%" %*
)
exit /b %errorlevel%

:main
echo ========================================
echo   Full Auth Deploy to %SERVER%
echo ========================================

REM 1. Kill existing server
echo [1/8] Stopping existing server...
call :run_ssh "pkill -9 node || true"
timeout /t 2 /nobreak > nul

REM 2. Backup current state
echo [2/8] Backing up current state...
call :run_ssh "cd %REMOTE_DIR% && tar -czf backup-$(date +%%Y%%m%%d-%%H%%M%%S).tar.gz server.js api/ config/ db/ middleware/ metrics/ schemas/ ui/ 2>/dev/null || true"

REM 3. Copy server core & manifests
echo [3/8] Copying server core and manifests...
call :run_scp server.js root@%SERVER%:%REMOTE_DIR%/server.js
call :run_scp package.json root@%SERVER%:%REMOTE_DIR%/package.json
call :run_scp package-lock.json root@%SERVER%:%REMOTE_DIR%/package-lock.json

REM 4. Copy auth & session modules
echo [4/8] Copying auth modules...
call :run_scp -r config root@%SERVER%:%REMOTE_DIR%/
call :run_scp -r api root@%SERVER%:%REMOTE_DIR%/
call :run_scp -r middleware root@%SERVER%:%REMOTE_DIR%/
call :run_scp -r metrics root@%SERVER%:%REMOTE_DIR%/
call :run_scp -r schemas root@%SERVER%:%REMOTE_DIR%/
call :run_scp -r src root@%SERVER%:%REMOTE_DIR%/

REM 5. Copy UI and static assets
echo [5/8] Copying UI and public assets...
call :run_scp -r ui root@%SERVER%:%REMOTE_DIR%/
call :run_scp -r public root@%SERVER%:%REMOTE_DIR%/

REM 6. Copy migrations
echo [6/8] Copying migrations...
call :run_scp -r db root@%SERVER%:%REMOTE_DIR%/
call :run_scp -r scripts root@%SERVER%:%REMOTE_DIR%/

REM 7. Install deps, run migrations & start server
echo [7/8] Installing dependencies, running migrations and starting server...
call :run_ssh "cd %REMOTE_DIR% && mkdir -p logs && npm install --production --no-audit --no-fund && node scripts/apply_migration.mjs && nohup node server.js > logs/server.log 2>&1 &"

echo Waiting 5 seconds for server startup...
timeout /t 5 /nobreak > nul

REM 8. Smoke tests
echo [8/8] Running smoke tests...
echo.
echo --- Health Check ---
call :run_ssh "curl -s http://localhost:9201/api/health | head -c 200"
echo.
echo.
echo --- Register Test User ---
call :run_ssh "curl -s -c /tmp/cookies.txt -X POST http://localhost:9201/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"deploy_test@example.com\",\"password\":\"testpass123\",\"confirmPassword\":\"testpass123\",\"name\":\"Deploy Test\"}' | head -c 300"
echo.
echo.
echo --- Check Auth Me ---
call :run_ssh "curl -s -b /tmp/cookies.txt http://localhost:9201/auth/me | head -c 200"
echo.
echo.
echo --- Search Test ---
call :run_ssh "curl -s 'http://localhost:9201/api/search?q=LM317' | head -c 300"
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
