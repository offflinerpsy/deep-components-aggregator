@echo off
setlocal

rem Переменные
set SERVER=89.104.69.77
set USER=root
set PASSWORD=DCIIcWfISxT3R4hT
set REMOTE_DIR=/opt/deep-agg

echo Начинаем деплой на %SERVER%...

rem Создаем архив проекта
echo Создаем архив проекта...
tar --exclude=node_modules --exclude=.git --exclude=data/cache -czf deploy.tgz .

rem Копируем архив на сервер
echo Копируем архив на сервер...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "mkdir -p %REMOTE_DIR%"
pscp -batch -pw %PASSWORD% deploy.tgz %USER%@%SERVER%:%REMOTE_DIR%/

rem Разархивируем на сервере
echo Разархивируем на сервере...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "cd %REMOTE_DIR% && tar -xzf deploy.tgz"

rem Устанавливаем зависимости
echo Устанавливаем зависимости...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "cd %REMOTE_DIR% && npm ci"

rem Создаем необходимые директории
echo Создаем необходимые директории...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "mkdir -p %REMOTE_DIR%/data/db %REMOTE_DIR%/data/cache/html %REMOTE_DIR%/data/files/pdf %REMOTE_DIR%/data/state"

rem Выполняем миграцию SQLite
echo Выполняем миграцию SQLite...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "cd %REMOTE_DIR% && node scripts/migrate-sqlite.mjs"

rem Копируем конфигурацию Nginx
echo Копируем конфигурацию Nginx...
pscp -batch -pw %PASSWORD% nginx-deep-agg-live.conf %USER%@%SERVER%:/etc/nginx/sites-available/deep-agg.conf
plink -batch -pw %PASSWORD% %USER%@%SERVER% "ln -sf /etc/nginx/sites-available/deep-agg.conf /etc/nginx/sites-enabled/deep-agg.conf"

rem Перезапускаем Nginx
echo Перезапускаем Nginx...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "nginx -t && systemctl reload nginx"

rem Создаем systemd сервис
echo Создаем systemd сервис...
echo [Unit] > deep-aggregator.service
echo Description=Deep Components Aggregator >> deep-aggregator.service
echo After=network.target >> deep-aggregator.service
echo. >> deep-aggregator.service
echo [Service] >> deep-aggregator.service
echo Type=simple >> deep-aggregator.service
echo User=root >> deep-aggregator.service
echo WorkingDirectory=%REMOTE_DIR% >> deep-aggregator.service
echo ExecStart=/usr/bin/node server.js >> deep-aggregator.service
echo Restart=on-failure >> deep-aggregator.service
echo Environment=NODE_ENV=production >> deep-aggregator.service
echo. >> deep-aggregator.service
echo [Install] >> deep-aggregator.service
echo WantedBy=multi-user.target >> deep-aggregator.service

pscp -batch -pw %PASSWORD% deep-aggregator.service %USER%@%SERVER%:/etc/systemd/system/

rem Перезапускаем сервис
echo Перезапускаем сервис...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "systemctl daemon-reload && systemctl restart deep-aggregator && systemctl enable deep-aggregator"

rem Проверяем статус
echo Проверяем статус сервиса...
plink -batch -pw %PASSWORD% %USER%@%SERVER% "systemctl status deep-aggregator --no-pager"

rem Проверяем доступность API
echo Проверяем доступность API...
timeout /t 5 /nobreak > nul
plink -batch -pw %PASSWORD% %USER%@%SERVER% "curl -s http://localhost:9201/api/health"

echo Деплой завершен успешно!
endlocal