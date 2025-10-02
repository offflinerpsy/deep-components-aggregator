@echo off
setlocal enabledelayedexpansion

set HOST=89.104.69.77
set USER=root
set PASS=DCIIcWfISxT3R4hT

echo === SIMPLE DEPLOY TO %HOST% ===

REM Создаем архив проекта
echo Creating archive...
tar -czf deploy.tgz --exclude=.git --exclude=node_modules --exclude=.secrets --exclude=_diag --exclude=dist .

REM Загружаем архив на сервер (один пароль)
echo Uploading archive...
pscp -pw %PASS% deploy.tgz %USER%@%HOST%:/root/

REM Создаем простой скрипт установки
echo Creating install script...
(
echo #!/bin/bash
echo set -e
echo cd /root
echo tar -xzf deploy.tgz -C /opt/deep-agg/
echo cd /opt/deep-agg
echo npm install
echo npm run rates:refresh
echo npm run data:ingest:chipdip -- --limit 200
echo npm run data:index:build
echo systemctl restart deep-aggregator
echo echo "Deploy completed"
) > install.sh

REM Загружаем скрипт установки
echo Uploading install script...
pscp -pw %PASS% install.sh %USER%@%HOST%:/root/

REM Выполняем установку
echo Running installation...
plink -batch -pw %PASS% %USER%@%HOST% "chmod +x /root/install.sh && bash /root/install.sh"

REM Проверяем результат
echo Checking deployment...
plink -batch -pw %PASS% %USER%@%HOST% "curl -s http://localhost/api/health"

echo === DONE ===
endlocal
