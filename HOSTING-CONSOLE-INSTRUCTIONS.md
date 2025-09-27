# 🖥️ ИНСТРУКЦИИ ДЛЯ КОНСОЛИ ХОСТИНГА

## 📦 У ТЕБЯ ЕСТЬ ГОТОВЫЙ ПАКЕТ: `deploy.zip` (121KB)

### ШАГ 1: Загрузи файл на сервер
1. Открой веб-интерфейс твоего хостинга
2. Найди **File Manager** или **Файловый менеджер**
3. Загрузи файл `deploy.zip` в папку `/tmp/` или в домашнюю директорию

### ШАГ 2: Открой консоль Ubuntu
1. В панели хостинга найди **Console**, **Terminal** или **SSH Console**
2. Откроется черный терминал Ubuntu

### ШАГ 3: Выполни команды в консоли

Скопируй и вставь эти команды **ОДНУ ЗА ОДНОЙ**:

```bash
# 1. Переходим в папку с загруженным файлом
cd /tmp

# 2. Распаковываем проект
unzip -o deploy.zip

# 3. Останавливаем старые процессы
pkill -f node || true

# 4. Очищаем и создаем директорию
rm -rf /opt/deep-agg/*
mkdir -p /opt/deep-agg

# 5. Копируем файлы проекта
cp -r server.js package.json src adapters public lib /opt/deep-agg/

# 6. Переходим в директорию проекта
cd /opt/deep-agg

# 7. Устанавливаем зависимости
npm install --production

# 8. Запускаем сервер в фоне
nohup node server.js > server.log 2>&1 &

# 9. Ждем 3 секунды
sleep 3

# 10. Проверяем что сервер запустился
ps aux | grep 'node server.js' | grep -v grep

# 11. Тестируем API
curl http://127.0.0.1:9201/api/search?q=LM317
```

### ШАГ 4: Настройка nginx (если нужно)

Если API работает только локально, настрой nginx:

```bash
# Создаем конфиг nginx
cat > /etc/nginx/sites-available/deep-agg << 'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:9201;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Активируем конфиг
ln -sf /etc/nginx/sites-available/deep-agg /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### ШАГ 5: Проверка результата

После выполнения команд:

1. **Внутренний тест**: `curl http://127.0.0.1:9201/api/search?q=LM317`
   - Должен вернуть JSON с результатами поиска

2. **Внешний тест**: Открой в браузере `http://95.217.134.12/api/search?q=LM317`
   - Должен показать те же результаты

3. **Главная страница**: `http://95.217.134.12/`
   - Должна открыться страница поиска компонентов

### 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:
- ✅ Node.js сервер работает на порту 9201
- ✅ API возвращает 34+ результатов для LM317
- ✅ Главная страница загружается
- ✅ Поиск работает через веб-интерфейс

### 🆘 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:

```bash
# Проверить логи сервера
tail -50 /opt/deep-agg/server.log

# Проверить статус процессов
ps aux | grep node

# Перезапустить сервер
cd /opt/deep-agg && pkill -f node && nohup node server.js > server.log 2>&1 &
```

### 📞 СООБЩИ МНЕ:
После выполнения скажи какой результат получился и я помогу с дальнейшей настройкой!
