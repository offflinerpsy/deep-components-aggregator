#!/bin/bash

echo "🚀 Запускаем деплой с паролем..."

# Проверяем наличие архива
if [ ! -f "deploy.tar.gz" ]; then
    echo "❌ Архив deploy.tar.gz не найден!"
    exit 1
fi

echo "📦 Архив найден, загружаем на сервер..."

# Загружаем архив
scp deploy.tar.gz root@89.104.69.77:/root/

echo "📁 Распаковываем и настраиваем на сервере..."

# Создаем скрипт для выполнения на сервере
cat > server-setup.sh << 'EOF'
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
EOF

# Загружаем скрипт на сервер
scp server-setup.sh root@89.104.69.77:/root/

echo "🔧 Выполняем настройку на сервере..."
echo "Введите пароль: OPYgPpOEqUSQmUqI"

# Подключаемся и выполняем скрипт
ssh root@89.104.69.77 "chmod +x /root/server-setup.sh && /root/server-setup.sh"

echo "🎉 Деплой завершен!"
echo "🌐 Проверь сервер: http://89.104.69.77:9201"


