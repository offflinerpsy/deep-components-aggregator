#!/bin/bash
set -e

# Переменные
SERVER="89.104.69.77"
USER="root"
PASSWORD="DCIIcWfISxT3R4hT"
REMOTE_DIR="/opt/deep-agg"

# Функция для выполнения команд на удаленном сервере
remote_exec() {
  sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" "$1"
}

# Функция для копирования файлов на удаленный сервер
remote_copy() {
  sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no -r "$1" "$USER@$SERVER:$2"
}

echo "Начинаем деплой на $SERVER..."

# Создаем архив проекта
echo "Создаем архив проекта..."
tar --exclude="node_modules" --exclude=".git" --exclude="data/cache" -czf deploy.tgz .

# Копируем архив на сервер
echo "Копируем архив на сервер..."
remote_copy "deploy.tgz" "$REMOTE_DIR/"

# Разархивируем на сервере
echo "Разархивируем на сервере..."
remote_exec "cd $REMOTE_DIR && tar -xzf deploy.tgz"

# Устанавливаем зависимости
echo "Устанавливаем зависимости..."
remote_exec "cd $REMOTE_DIR && npm ci"

# Создаем необходимые директории
echo "Создаем необходимые директории..."
remote_exec "mkdir -p $REMOTE_DIR/data/db $REMOTE_DIR/data/cache/html $REMOTE_DIR/data/files/pdf $REMOTE_DIR/data/state"

# Выполняем миграцию SQLite
echo "Выполняем миграцию SQLite..."
remote_exec "cd $REMOTE_DIR && node scripts/migrate-sqlite.mjs"

# Копируем конфигурацию Nginx
echo "Копируем конфигурацию Nginx..."
remote_copy "nginx-deep-agg-live.conf" "/etc/nginx/sites-available/deep-agg.conf"
remote_exec "ln -sf /etc/nginx/sites-available/deep-agg.conf /etc/nginx/sites-enabled/deep-agg.conf"

# Перезапускаем Nginx
echo "Перезапускаем Nginx..."
remote_exec "nginx -t && systemctl reload nginx"

# Создаем systemd сервис
echo "Создаем systemd сервис..."
cat > deep-aggregator.service << EOF
[Unit]
Description=Deep Components Aggregator
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$REMOTE_DIR
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

remote_copy "deep-aggregator.service" "/etc/systemd/system/"

# Перезапускаем сервис
echo "Перезапускаем сервис..."
remote_exec "systemctl daemon-reload && systemctl restart deep-aggregator && systemctl enable deep-aggregator"

# Проверяем статус
echo "Проверяем статус сервиса..."
remote_exec "systemctl status deep-aggregator --no-pager"

# Проверяем доступность API
echo "Проверяем доступность API..."
sleep 5
remote_exec "curl -s http://localhost:9201/api/health"

echo "Деплой завершен успешно!"