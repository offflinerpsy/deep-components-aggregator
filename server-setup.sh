#!/bin/bash
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
