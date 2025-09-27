# 🚀 БЫСТРАЯ НАСТРОЙКА VULTR (10 МИНУТ)

## ШАГ 1: Создание сервера (3 минуты)

1. **Иди на vultr.com**
2. **Нажми "Sign Up"** (регистрация)
3. **Подтверди email**
4. **Добавь способ оплаты** (карта/PayPal)
5. **Deploy New Server:**
   - **Server Type**: Cloud Compute - Regular Performance
   - **Location**: Выбери ближайший (Amsterdam/Frankfurt для Европы)
   - **Operating System**: Ubuntu 20.04 x64
   - **Server Size**: $2.50/месяц (512MB RAM, 10GB SSD)
   - **Нажми "Deploy Now"**

## ШАГ 2: Получение доступа (2 минуты)

1. **Дождись статуса "Running"** (1-2 минуты)
2. **Скопируй IP адрес** сервера
3. **Скопируй пароль** (показывается в панели)
4. **Готово!** У тебя есть сервер

## ШАГ 3: Подключение и деплой (5 минут)

Открой **PowerShell** или **Git Bash** на Windows:

```bash
# Подключись к серверу (вставь свой IP)
ssh root@ТВО_IP_АДРЕС

# Когда спросит пароль - вставь из панели Vultr
# При первом подключении напиши "yes"

# Вставь эту ОДНУ команду для полного деплоя:
cd /tmp && apt update && apt install -y wget unzip curl && wget https://github.com/offflinerpsy/deep-components-aggregator/archive/refs/heads/main.zip -O project.zip && unzip -o project.zip && mkdir -p /opt/deep-agg && cp -r deep-components-aggregator-main/* /opt/deep-agg/ && cd /opt/deep-agg && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs nginx && npm install --production && nohup node server.js > server.log 2>&1 & && sleep 5 && cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:9201;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF
systemctl reload nginx && curl http://127.0.0.1:9201/api/search?q=LM317 && echo "🎉 ДЕПЛОЙ ЗАВЕРШЕН!"
```

## ШАГ 4: Проверка результата

После выполнения команды:

1. **Увидишь JSON с результатами LM317** ✅
2. **Открой в браузере**: `http://ТВО_IP_АДРЕС/`
3. **Должна загрузиться главная страница** ✅
4. **Тест API**: `http://ТВО_IP_АДРЕС/api/search?q=LM317` ✅

## 💰 СТОИМОСТЬ:
- **$2.50/месяц** = 250 рублей/месяц
- **Первые $100 бесплатно** при регистрации (промо-коды)
- **Можно удалить сервер** в любой момент

## 🎯 РЕЗУЛЬТАТ:
- ✅ Свежий Ubuntu 20.04
- ✅ Node.js сервер на порту 9201
- ✅ Nginx прокси на порту 80
- ✅ Все наши парсеры и воркеры
- ✅ API возвращает результаты поиска
- ✅ Веб-интерфейс работает

**ГОТОВ ПОПРОБОВАТЬ?** Это займет максимум 10 минут и точно сработает!
