#!/bin/bash
# ЗАПУСК ПРИЛОЖЕНИЯ НА СЕРВЕРЕ
# Выполнить на сервере после деплоя

set -e

echo "=== ЗАПУСК ПРИЛОЖЕНИЯ ==="

# 1. Переходим в рабочую директорию
cd /opt/deep-agg

# 2. Устанавливаем зависимости
echo "[1] Установка зависимостей..."
if [ -f package-lock.json ]; then
    npm ci
else
    npm install
fi

# 3. Запускаем через PM2
echo "[2] Запуск через PM2..."
if [ -f ecosystem.config.cjs ]; then
    pm2 start ecosystem.config.cjs
else
    pm2 start server.js --name deep-aggregator -- --port 9201
fi

# 4. Сохраняем конфигурацию PM2
pm2 save

# 5. Проверяем статус
echo "[3] Статус приложения..."
pm2 status

# 6. Дым-тест
echo "[4] Дым-тест..."
curl -sSf http://127.0.0.1:9201/ | head -n 3 || echo "Приложение не отвечает"

echo "=== ПРИЛОЖЕНИЕ ЗАПУЩЕНО ==="
