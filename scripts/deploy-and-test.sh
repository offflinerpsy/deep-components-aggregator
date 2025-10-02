#!/bin/bash

# scripts/deploy-and-test.sh - деплой на удаленный сервер и автоматическое тестирование
# Использование: ./scripts/deploy-and-test.sh [server_ip] [password]

SERVER_IP=${1:-"95.217.134.12"}
SERVER_PATH="/opt/deep-agg"
LOCAL_PATH="."

echo "🚀 Deploying to Ubuntu server: $SERVER_IP"

# Функция для выполнения команд на сервере
run_remote() {
    local cmd="$1"
    echo "📡 Remote: $cmd"
    sshpass -p "$2" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$SERVER_IP "$cmd"
}

# Функция для копирования файлов
copy_files() {
    echo "📦 Copying files to server..."
    sshpass -p "$2" scp -o ConnectTimeout=10 -r \
        server.js package.json src/ adapters/ public/ lib/ \
        root@$SERVER_IP:$SERVER_PATH/
}

# Проверяем наличие sshpass
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass not found. Installing..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y sshpass
    elif command -v yum &> /dev/null; then
        sudo yum install -y sshpass
    else
        echo "❌ Cannot install sshpass automatically. Please install it manually."
        exit 1
    fi
fi

# Запрашиваем пароль если не передан
if [ -z "$2" ]; then
    echo -n "🔑 Enter server password: "
    read -s SERVER_PASSWORD
    echo
else
    SERVER_PASSWORD="$2"
fi

# 1. Останавливаем старые процессы
echo "🛑 Stopping old processes..."
run_remote "pkill -f 'node server.js' || true" "$SERVER_PASSWORD"
run_remote "pkill -f 'npm start' || true" "$SERVER_PASSWORD"

# 2. Создаем директорию если нужно
echo "📁 Ensuring directory exists..."
run_remote "mkdir -p $SERVER_PATH" "$SERVER_PASSWORD"

# 3. Копируем файлы
copy_files "$SERVER_PASSWORD"

# 4. Устанавливаем зависимости
echo "📦 Installing dependencies..."
run_remote "cd $SERVER_PATH && npm install --production" "$SERVER_PASSWORD"

# 5. Запускаем сервер в фоне
echo "🚀 Starting server..."
run_remote "cd $SERVER_PATH && nohup node server.js > server.log 2>&1 &" "$SERVER_PASSWORD"

# 6. Ждем запуска
echo "⏳ Waiting for server to start..."
sleep 5

# 7. Тестируем API
echo "🧪 Testing API..."
API_RESPONSE=$(run_remote "curl -s 'http://127.0.0.1:9201/api/search?q=LM317' | jq '.count' 2>/dev/null || echo 'error'" "$SERVER_PASSWORD")

if [ "$API_RESPONSE" != "error" ] && [ "$API_RESPONSE" -gt 0 ]; then
    echo "✅ API test passed: $API_RESPONSE results found"
else
    echo "❌ API test failed"
    run_remote "cd $SERVER_PATH && tail -20 server.log" "$SERVER_PASSWORD"
    exit 1
fi

# 8. Тестируем главную страницу
echo "🏠 Testing homepage..."
HOMEPAGE_TEST=$(run_remote "curl -s 'http://127.0.0.1:9201/' | grep -c 'DeepAgg' || echo '0'" "$SERVER_PASSWORD")

if [ "$HOMEPAGE_TEST" -gt 0 ]; then
    echo "✅ Homepage test passed"
else
    echo "❌ Homepage test failed"
fi

# 9. Проверяем статус процесса
echo "📊 Server status:"
run_remote "ps aux | grep 'node server.js' | grep -v grep || echo 'No server process found'" "$SERVER_PASSWORD"

# 10. Показываем логи
echo "📋 Recent logs:"
run_remote "cd $SERVER_PATH && tail -10 server.log" "$SERVER_PASSWORD"

echo "🎉 Deployment completed!"
echo "🌐 Server URL: http://$SERVER_IP:9201/"
echo "📊 API URL: http://$SERVER_IP:9201/api/search?q=LM317"
