@echo off
SETLOCAL

REM Configuration
SET HOST=89.104.69.77
SET USER=root
SET PASSWORD=DCIIcWfISxT3R4hT
SET LOCAL_REPO_PATH=%CD%
SET REMOTE_REPO_PATH=/opt/deep-agg
SET SECRETS_DIR=secrets\apis
SET REMOTE_SECRETS_DIR=%REMOTE_REPO_PATH%/secrets/apis

REM --- Step 1: Copy secrets to the server ---
echo Copying secrets to %USER%@%HOST%:%REMOTE_SECRETS_DIR%...
plink -ssh %USER%@%HOST% -pw %PASSWORD% "mkdir -p %REMOTE_SECRETS_DIR%"
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create remote secrets directory.
    GOTO :EOF
)

pscp -pw %PASSWORD% "%LOCAL_REPO_PATH%\%SECRETS_DIR%\*" %USER%@%HOST%:%REMOTE_SECRETS_DIR%/
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy secrets.
    GOTO :EOF
)
echo Secrets copied successfully.

REM --- Step 2: Copy Nginx configuration to the server ---
echo Copying Nginx configuration to %USER%@%HOST%...
pscp -pw %PASSWORD% "%LOCAL_REPO_PATH%\nginx-deep-agg-live.conf" %USER%@%HOST%:/etc/nginx/conf.d/
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy Nginx configuration.
    GOTO :EOF
)
echo Nginx configuration copied successfully.

REM --- Step 3: Execute deployment script on the server ---
echo Executing deployment script on %USER%@%HOST%...
plink -ssh %USER%@%HOST% -pw %PASSWORD% "bash -lc '
  set -e
  cd %REMOTE_REPO_PATH%
  git fetch --all
  git reset --hard origin/main
  npm ci
  npm run rates:refresh
  npm run data:index:build || true
  systemctl restart deep-aggregator
  systemctl reload nginx
  sleep 2
  curl -fsS http://127.0.0.1:9201/api/health
  curl -fsS \"http://127.0.0.1:9201/api/search?q=LM317\" | head -c 400
  curl -fsSI \"http://127.0.0.1:9201/api/live/search?q=LM317\" | egrep -i \"text/event-stream|X-Accel-Buffering\"
'"
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Deployment script failed on remote server.
    GOTO :EOF
)
echo Deployment script executed successfully.

echo ALL DONE.
ENDLOCAL