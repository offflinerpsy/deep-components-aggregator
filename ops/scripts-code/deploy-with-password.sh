#!/bin/bash

# scripts/deploy-with-password.sh - деплой с вводом пароля вручную
set -e

SERVER_IP="95.217.134.12"
SERVER_PATH="/opt/deep-agg"
PASSWORD="NDZzHCYzPRKWfKRd"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="test-results-${TIMESTAMP}"

echo "🚀 Starting deployment with password at $(date)"

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

# Подготовка
echo "🔧 Preparing local environment..."
mkdir -p "$RESULTS_DIR"

echo "🔑 Using password authentication"
echo "Password will be prompted for each SSH operation"

# 1. Остановка старых процессов
echo "🛑 Stopping old processes..."
echo "Enter password when prompted:"
run_remote "pkill -f 'node server.js' || true; pkill -f 'npm start' || true"

# 2. Подготовка сервера
echo "📁 Preparing server directory..."
run_remote "mkdir -p $SERVER_PATH"

# 3. Копирование файлов
echo "📦 Copying project files..."
copy_files

# 4. Установка зависимостей
echo "📦 Installing dependencies..."
run_remote "cd $SERVER_PATH && npm install --production"

# 5. Запуск сервера
echo "🚀 Starting server..."
run_remote "cd $SERVER_PATH && nohup node server.js > server.log 2>&1 &"

# 6. Ожидание запуска
echo "⏳ Waiting for server startup..."
sleep 10

# 7. Проверка статуса
echo "🔍 Checking server status..."
SERVER_STATUS=$(run_remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9201/ || echo '000'")

if [ "$SERVER_STATUS" != "200" ]; then
    echo "❌ Server failed to start (HTTP: $SERVER_STATUS)"
    run_remote "cd $SERVER_PATH && tail -20 server.log"
    exit 1
fi

echo "✅ Server is running (HTTP: $SERVER_STATUS)"

# 8. Тест API
echo "🧪 Testing API..."
API_TEST=$(run_remote "curl -s 'http://127.0.0.1:9201/api/search?q=LM317' | grep -c '\"count\"' || echo '0'")

if [ "$API_TEST" -gt 0 ]; then
    echo "✅ API test passed"
else
    echo "❌ API test failed"
fi

# 9. Получаем результат поиска
echo "📊 API search results:"
run_remote "curl -s 'http://127.0.0.1:9201/api/search?q=LM317' | head -200"

# 10. Статистика сервера
echo "📊 Server statistics:"
run_remote "ps aux | grep 'node server.js' | grep -v grep || echo 'No server process'"
run_remote "cd $SERVER_PATH && tail -10 server.log"

# 11. Получаем логи
echo "📋 Fetching server logs..."
scp -o ConnectTimeout=10 root@$SERVER_IP:$SERVER_PATH/server.log "$RESULTS_DIR/"

echo ""
echo "🎉 DEPLOYMENT COMPLETED!"
echo "🌐 Server URL: http://$SERVER_IP:9201/"
echo "📊 Test results: $RESULTS_DIR/"
echo "📋 Server logs: $RESULTS_DIR/server.log"

# Показываем статус
echo "📈 FINAL STATUS:"
echo "- Server: $([ "$SERVER_STATUS" = "200" ] && echo "✅ Running" || echo "❌ Failed")"
echo "- API: $([ "$API_TEST" -gt 0 ] && echo "✅ Working" || echo "❌ Failed")"
echo "- Logs: $RESULTS_DIR/server.log"
