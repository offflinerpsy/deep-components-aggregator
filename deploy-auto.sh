#!/bin/bash

echo "🚀 Автоматический деплой с паролем..."

# Создаем expect скрипт
cat > deploy.exp << 'EOF'
#!/usr/bin/expect -f
set timeout 30
set password "OPYgPpOEqUSQmUqI"

# Загружаем архив
spawn scp deploy.tar.gz root@89.104.69.77:/root/
expect "password:"
send "$password\r"
expect eof

# Подключаемся и деплоим
spawn ssh root@89.104.69.77
expect "password:"
send "$password\r"
expect "#"

# Выполняем команды деплоя
send "cd /root\r"
expect "#"
send "rm -rf aggregator-v2\r"
expect "#"
send "tar -xzf deploy.tar.gz\r"
expect "#"
send "cd aggregator-v2\r"
expect "#"
send "npm install\r"
expect "#"
send "npm run build:corpus\r"
expect "#"
send "npm run build:index\r"
expect "#"
send "npm run serve &\r"
expect "#"
send "echo 'Деплой завершен!'\r"
expect "#"
send "exit\r"
expect eof
EOF

chmod +x deploy.exp
./deploy.exp

echo "✅ Деплой завершен!"
echo "🌐 Сервер: http://89.104.69.77:9201"


