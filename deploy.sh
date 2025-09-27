#!/bin/bash

echo "🚀 Начинаем деплой на сервер..."

# Проверяем наличие архива
if [ ! -f "deploy.tar.gz" ]; then
    echo "❌ Архив deploy.tar.gz не найден!"
    exit 1
fi

echo "📦 Архив найден, загружаем на сервер..."

# Загружаем архив
scp deploy.tar.gz root@89.104.69.77:/root/

echo "📁 Распаковываем на сервере..."

# Подключаемся и распаковываем
ssh root@89.104.69.77 << 'EOF'
cd /root
echo "🗑️ Удаляем старую версию..."
rm -rf aggregator-v2

echo "📦 Распаковываем новую версию..."
tar -xzf deploy.tar.gz

echo "📋 Содержимое после распаковки:"
ls -la

echo "📁 Переходим в проект..."
cd aggregator-v2

echo "📋 Содержимое проекта:"
ls -la

echo "📦 Устанавливаем зависимости..."
npm install

echo "🔍 Строим корпус для поиска..."
npm run build:corpus

echo "🔍 Строим поисковый индекс..."
npm run build:index

echo "🚀 Запускаем сервер..."
npm run serve &

echo "✅ Деплой завершен!"
echo "🌐 Сервер должен быть доступен на http://89.104.69.77:9201"
EOF

echo "🎉 Деплой завершен!"


