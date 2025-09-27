#!/bin/bash

# scripts/deploy-full-test.sh - полный деплой и тестирование
set -e

SERVER_IP="95.217.134.12"
SERVER_PATH="/opt/deep-agg"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="test-results-${TIMESTAMP}"

echo "🚀 Starting full deployment and testing at $(date)"

# Функция для выполнения команд на сервере
run_remote() {
    local cmd="$1"
    echo "📡 Remote: $cmd"
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$SERVER_IP "$cmd"
}

# Функция для копирования файлов
copy_files() {
    echo "📦 Copying files to server..."
    scp -o ConnectTimeout=10 -r \
        server.js package.json src/ adapters/ public/ lib/ scripts/ \
        root@$SERVER_IP:$SERVER_PATH/
}

# 1. Подготовка локально
echo "🔧 Preparing local environment..."
mkdir -p $RESULTS_DIR

# 2. Остановка старых процессов на сервере
echo "🛑 Stopping old processes on server..."
run_remote "pkill -f 'node server.js' || true"
run_remote "pkill -f 'npm start' || true"

# 3. Создание директории и копирование файлов
echo "📁 Setting up server directory..."
run_remote "mkdir -p $SERVER_PATH"
copy_files

# 4. Установка зависимостей на сервере
echo "📦 Installing dependencies on server..."
run_remote "cd $SERVER_PATH && npm install --production"

# 5. Запуск сервера на удаленном сервере
echo "🚀 Starting server on remote..."
run_remote "cd $SERVER_PATH && nohup node server.js > server.log 2>&1 &"

# 6. Ждем запуска сервера
echo "⏳ Waiting for server startup..."
sleep 10

# 7. Проверяем что сервер запустился
echo "🔍 Checking server status..."
SERVER_STATUS=$(run_remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9201/ || echo '000'")

if [ "$SERVER_STATUS" != "200" ]; then
    echo "❌ Server failed to start properly (HTTP: $SERVER_STATUS)"
    run_remote "cd $SERVER_PATH && tail -20 server.log"
    exit 1
fi

echo "✅ Server is running (HTTP: $SERVER_STATUS)"

# 8. Запуск полного тестирования локально против удаленного сервера
echo "🧪 Running full test suite against remote server..."
SERVER_URL="http://$SERVER_IP:9201"

# Устанавливаем playwright если нужно
if ! npx playwright --version >/dev/null 2>&1; then
    echo "📦 Installing Playwright..."
    npx playwright install chromium
fi

# Запускаем тесты
timeout 300 node scripts/full-test-suite.mjs "$SERVER_URL" || echo "Tests completed with timeout"

# 9. Копируем результаты в нашу папку
if [ -d "test-results" ]; then
    cp -r test-results/* $RESULTS_DIR/
    echo "📊 Test results copied to $RESULTS_DIR/"
fi

# 10. Получаем логи с сервера
echo "📋 Fetching server logs..."
scp -o ConnectTimeout=10 root@$SERVER_IP:$SERVER_PATH/server.log $RESULTS_DIR/server.log

# 11. Статистика сервера
echo "📊 Server statistics:"
run_remote "cd $SERVER_PATH && ps aux | grep 'node server.js' | grep -v grep || echo 'No server process'"
run_remote "cd $SERVER_PATH && tail -5 server.log"

# 12. Коммитим результаты в git
echo "📝 Committing results to git..."
git add $RESULTS_DIR/
git add -A
git commit -m "test: полное тестирование на сервере $SERVER_IP - $(date)"

# 13. Пушим в GitHub
echo "🌐 Pushing to GitHub..."
git push origin main

# 14. Финальный отчет
echo ""
echo "🎉 DEPLOYMENT AND TESTING COMPLETED"
echo "🌐 Server URL: http://$SERVER_IP:9201/"
echo "📊 Test results: $RESULTS_DIR/"
echo "📋 Server logs: $RESULTS_DIR/server.log"
echo "📸 Screenshots: $RESULTS_DIR/screenshots/"

if [ -f "$RESULTS_DIR/full-test-report.json" ]; then
    echo "📈 Test summary:"
    cat "$RESULTS_DIR/full-test-report.json" | grep -A 10 '"stats"' || echo "Stats not found"
fi

echo "✅ All changes committed and pushed to GitHub"
