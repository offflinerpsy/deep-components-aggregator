# 🚀 НАСТРОЙКА DEBIAN 12 НА ТВОЕМ ХОСТИНГЕ

## 🎯 ВЫБОР: **Debian 12**

**Почему именно Debian:**
- ✅ **Самая стабильная** из всех Linux систем
- ✅ **Минимум багов** и капризов
- ✅ **Отличная поддержка Node.js**
- ✅ **Простая настройка SSH**
- ✅ **Надежная работа** веб-серверов

## 📋 ШАГ ЗА ШАГОМ:

### 1. Переустановка сервера
1. **Выбери "Debian 12"** в списке ОС
2. **В разделе SSH-ключи выбери "Без SSH"** (используем пароль)
3. **Нажми "Переустановить образ"**
4. **Дождись завершения** (5-10 минут)

### 2. Получение доступа
После переустановки:
1. **IP остается тот же**: `95.217.134.12`
2. **Логин**: `root`
3. **Пароль**: Покажется в панели или придет на email

### 3. Подключение и деплой

Открой **PowerShell** или **Git Bash**:

```bash
# Подключись к серверу
ssh root@95.217.134.12

# Когда спросит пароль - введи из панели
# При первом подключении напиши "yes"

# ОДНА КОМАНДА ДЛЯ ПОЛНОГО ДЕПЛОЯ:
apt update && apt install -y wget unzip curl nginx && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs && cd /tmp && wget https://github.com/offflinerpsy/deep-components-aggregator/archive/refs/heads/main.zip -O project.zip && unzip -o project.zip && rm -rf /opt/deep-agg && mkdir -p /opt/deep-agg && cp -r deep-components-aggregator-main/* /opt/deep-agg/ && cd /opt/deep-agg && npm install --production && pkill -f node || true && nohup node server.js > server.log 2>&1 & && sleep 5 && cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:9201;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
systemctl reload nginx && echo "🎉 ДЕПЛОЙ ЗАВЕРШЕН!" && curl http://127.0.0.1:9201/api/search?q=LM317 | head -100
```

### 4. Проверка результата

После выполнения команды должен увидеть:
- ✅ **JSON с результатами LM317**
- ✅ **"🎉 ДЕПЛОЙ ЗАВЕРШЕН!"**

Затем открой в браузере:
- **Главная**: `http://95.217.134.12/`
- **API тест**: `http://95.217.134.12/api/search?q=LM317`

## ⏰ ВРЕМЯ ВЫПОЛНЕНИЯ:
- **Переустановка ОС**: 10 минут
- **Подключение**: 1 минута
- **Деплой**: 3 минуты
- **ИТОГО**: 15 минут

## 🎯 РЕЗУЛЬТАТ:
- ✅ Свежий Debian 12
- ✅ Node.js 20 + все зависимости
- ✅ Наш проект полностью настроен
- ✅ Nginx проксирует на порт 80
- ✅ API возвращает результаты поиска
- ✅ Веб-интерфейс работает

**ГОТОВ? Выбирай Debian 12 и переустанавливай!**
