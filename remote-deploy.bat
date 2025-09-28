@echo off
echo === Deploying to production server 89.104.69.77 ===

REM Проверяем доступность scp/ssh в системе
where scp >nul 2>nul || (echo Error: scp not found. Please install OpenSSH Client. && exit /b 1)

echo === Copying deployment script to server ===
scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 prod-deploy.sh root@89.104.69.77:/root/

echo === Running deployment script on server ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@89.104.69.77 "chmod +x /root/prod-deploy.sh && bash -x /root/prod-deploy.sh"

echo === Checking deployment status ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@89.104.69.77 "curl -s http://localhost/api/health | jq"

echo === Deployment completed ===
