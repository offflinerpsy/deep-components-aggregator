#!/bin/bash
set -e

# Конфигурация
SERVER="89.104.69.77"
USER="root"
PASSWORD="DCIIcWfISxT3R4hT"
REMOTE_DIR="/opt/deep-agg"
LOCAL_DIR="."

echo "Деплой на удаленный сервер для тестирования..."

# 1. Создаем архив текущего состояния проекта
echo "Создание архива проекта..."
tar --exclude='node_modules' --exclude='.git' -czf deploy-temp.tar.gz .

# 2. Копируем архив на сервер
echo "Копирование архива на сервер..."
sshpass -p "$PASSWORD" scp deploy-temp.tar.gz $USER@$SERVER:/tmp/

# 3. Разворачиваем архив на сервере
echo "Разворачивание архива на сервере..."
sshpass -p "$PASSWORD" ssh $USER@$SERVER "
  mkdir -p $REMOTE_DIR
  tar -xzf /tmp/deploy-temp.tar.gz -C $REMOTE_DIR
  rm /tmp/deploy-temp.tar.gz
  
  # Создаем необходимые директории
  cd $REMOTE_DIR
  mkdir -p secrets/apis data/cache/html data/cache/meta data/db/products data/idx data/state logs/_diag loads/urls
  
  # Устанавливаем зависимости
  cd $REMOTE_DIR
  npm install express undici cheerio fast-xml-parser nanoid
  
  # Копируем конфигурацию Nginx
  cp $REMOTE_DIR/nginx-deep-agg-live.conf /etc/nginx/conf.d/deep-agg-live.conf
  systemctl reload nginx
  
  # Запускаем сервер в фоновом режиме
  cd $REMOTE_DIR
  pkill -f 'node server.js' || true
  nohup node server.js > logs/server.log 2>&1 &
  
  # Проверяем, что сервер запустился
  sleep 2
  if curl -s http://localhost:9201/api/health > /dev/null; then
    echo 'Сервер успешно запущен!'
  else
    echo 'Ошибка при запуске сервера!'
    tail -n 20 logs/server.log
    exit 1
  fi
"

# 4. Удаляем временный архив
echo "Удаление временного архива..."
rm deploy-temp.tar.gz

echo "Деплой завершен!"
echo "Для проверки: http://$SERVER/"
echo "API здоровья: http://$SERVER/api/health"
echo "Поиск: http://$SERVER/ui/search.html?q=LM317"
