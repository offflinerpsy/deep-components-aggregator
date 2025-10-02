@echo off
setlocal enabledelayedexpansion

echo === Deploying to production server 89.104.69.77 ===

set SERVER=89.104.69.77
set USER=root
set PASS=DCIIcWfISxT3R4hT
set REMOTE_ROOT=/root
set TIMEOUT=120

REM Проверяем доступность scp/ssh в системе
where scp >nul 2>nul || (echo Error: scp not found. Please install OpenSSH Client. && exit /b 1)

echo === Creating secrets directory on server ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 %USER%@%SERVER% "mkdir -p %REMOTE_ROOT%/secrets/apis"

echo === Copying secrets to server ===
scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 .secrets-for-deploy/apis/scraperapi.txt %USER%@%SERVER%:%REMOTE_ROOT%/secrets/apis/
scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 .secrets-for-deploy/apis/scrapingbee.txt %USER%@%SERVER%:%REMOTE_ROOT%/secrets/apis/
scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 .secrets-for-deploy/apis/scrapingbot.txt %USER%@%SERVER%:%REMOTE_ROOT%/secrets/apis/

echo === Copying deployment script to server ===
scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 prod-deploy.sh %USER%@%SERVER%:%REMOTE_ROOT%/

echo === Running deployment script on server ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=%TIMEOUT% %USER%@%SERVER% "chmod +x %REMOTE_ROOT%/prod-deploy.sh && bash %REMOTE_ROOT%/prod-deploy.sh"

echo === Checking deployment status ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 %USER%@%SERVER% "curl -s http://localhost/api/health | jq"

echo === Testing basic search ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 %USER%@%SERVER% "curl -s 'http://localhost/api/search?q=LM317' | jq"

echo === Deployment completed ===

endlocal
