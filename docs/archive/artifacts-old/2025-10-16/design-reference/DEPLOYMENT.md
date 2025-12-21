# 🚀 Деплой Diponika Frontend на сервер

Пошаговая инструкция по развертыванию Next.js фронтенда на production сервере.

---

## 📋 Требования

### Сервер
- **ОС:** Ubuntu 20.04+ или Debian 11+
- **RAM:** Минимум 2GB (рекомендуется 4GB)
- **CPU:** 2+ ядра
- **Диск:** 20GB+ свободного места
- **Доступ:** SSH с sudo правами

### Софт
- **Node.js:** 18.x или выше
- **npm:** 9.x или выше
- **PM2:** Для управления процессами
- **Nginx:** Для reverse proxy
- **Git:** Для клонирования репозитория
- **Certbot:** Для SSL сертификатов

---

## 🛠 Шаг 1: Подготовка сервера

### 1.1 Подключение к серверу

\`\`\`bash
# Подключись по SSH
ssh root@your-server-ip

# Или с пользователем
ssh username@your-server-ip
\`\`\`

### 1.2 Обновление системы

\`\`\`bash
# Обнови список пакетов
sudo apt update

# Обнови установленные пакеты
sudo apt upgrade -y

# Установи базовые утилиты
sudo apt install -y curl wget git build-essential
\`\`\`

### 1.3 Установка Node.js

\`\`\`bash
# Добавь репозиторий NodeSource для Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Установи Node.js и npm
sudo apt install -y nodejs

# Проверь версии
node --version  # Должно быть v18.x.x или выше
npm --version   # Должно быть 9.x.x или выше
\`\`\`

### 1.4 Установка PM2

\`\`\`bash
# Установи PM2 глобально
sudo npm install -g pm2

# Проверь установку
pm2 --version
\`\`\`

### 1.5 Установка Nginx

\`\`\`bash
# Установи Nginx
sudo apt install -y nginx

# Запусти Nginx
sudo systemctl start nginx

# Включи автозапуск
sudo systemctl enable nginx

# Проверь статус
sudo systemctl status nginx
\`\`\`

### 1.6 Установка Certbot (для SSL)

\`\`\`bash
# Установи Certbot и плагин для Nginx
sudo apt install -y certbot python3-certbot-nginx

# Проверь установку
certbot --version
\`\`\`

---

## 📦 Шаг 2: Клонирование проекта

### 2.1 Создание директории

\`\`\`bash
# Создай папку для веб-проектов
sudo mkdir -p /var/www

# Перейди в неё
cd /var/www
\`\`\`

### 2.2 Клонирование репозитория

\`\`\`bash
# Клонируй проект из GitHub
sudo git clone https://github.com/[your-username]/v0-components-aggregator-page.git diponika-frontend

# Дай права текущему пользователю
sudo chown -R $USER:$USER diponika-frontend

# Перейди в папку проекта
cd diponika-frontend

# Проверь что файлы на месте
ls -la
\`\`\`

### 2.3 Переключение на нужную ветку (если нужно)

\`\`\`bash
# Посмотри доступные ветки
git branch -a

# Переключись на ветку с интеграцией
git checkout backend-integration

# Или создай новую ветку
git checkout -b production
\`\`\`

---

## ⚙️ Шаг 3: Настройка проекта

### 3.1 Установка зависимостей

\`\`\`bash
# Установи npm пакеты (production режим)
npm install --production

# Или все зависимости (если нужны dev tools)
npm install

# Проверь что node_modules создана
ls -la node_modules/
\`\`\`

### 3.2 Создание .env.local

\`\`\`bash
# Создай файл с переменными окружения
nano .env.local
\`\`\`

**Содержимое `.env.local`:**

\`\`\`env
# URL бэкенда
# Если бэкенд на том же сервере:
NEXT_PUBLIC_API_URL=http://localhost:9201

# Если бэкенд на другом сервере:
# NEXT_PUBLIC_API_URL=https://api.diponika.ru

# Режим (production)
NODE_ENV=production
\`\`\`

**Сохрани файл:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 3.3 Сборка проекта

\`\`\`bash
# Собери Next.js проект для продакшена
npm run build

# Процесс займет 1-3 минуты
# Должно быть:
# ✓ Compiled successfully
# ✓ Collecting page data
# ✓ Generating static pages
# ✓ Finalizing page optimization

# Проверь что .next папка создана
ls -la .next/
\`\`\`

---

## 🚀 Шаг 4: Запуск через PM2

### 4.1 Запуск приложения

\`\`\`bash
# Запусти Next.js через PM2
pm2 start npm --name "diponika-frontend" -- start

# Должно быть:
# [PM2] Starting npm in fork_mode (1 instance)
# [PM2] Done.
\`\`\`

### 4.2 Проверка статуса

\`\`\`bash
# Проверь статус процесса
pm2 status

# Должно быть:
# ┌─────┬──────────────────────┬─────────┬─────────┬─────────┬──────────┐
# │ id  │ name                 │ mode    │ ↺       │ status  │ cpu      │
# ├─────┼──────────────────────┼─────────┼─────────┼─────────┼──────────┤
# │ 0   │ diponika-frontend    │ fork    │ 0       │ online  │ 0%       │
# └─────┴──────────────────────┴─────────┴─────────┴─────────┴──────────┘

# Посмотри логи
pm2 logs diponika-frontend --lines 20

# Должно быть:
# ▲ Next.js 14.x.x
# - Local:        http://localhost:3000
# ✓ Ready in 2.3s
\`\`\`

### 4.3 Сохранение конфигурации PM2

\`\`\`bash
# Сохрани текущие процессы PM2
pm2 save

# Настрой автозапуск при перезагрузке сервера
pm2 startup

# PM2 выдаст команду типа:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username

# Скопируй и выполни эту команду
\`\`\`

### 4.4 Полезные команды PM2

\`\`\`bash
# Перезапустить приложение
pm2 restart diponika-frontend

# Остановить приложение
pm2 stop diponika-frontend

# Удалить из PM2
pm2 delete diponika-frontend

# Посмотреть логи в реальном времени
pm2 logs diponika-frontend

# Посмотреть использование ресурсов
pm2 monit
\`\`\`

---

## 🌐 Шаг 5: Настройка Nginx

### 5.1 Создание конфигурации

\`\`\`bash
# Создай конфиг для фронтенда
sudo nano /etc/nginx/sites-available/diponika-frontend
\`\`\`

**Содержимое конфига (базовая версия без SSL):**

\`\`\`nginx
server {
    listen 80;
    server_name diponika.ru www.diponika.ru;

    # Логи
    access_log /var/log/nginx/diponika-frontend-access.log;
    error_log /var/log/nginx/diponika-frontend-error.log;

    # Основное приложение Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE для real-time поиска (важно!)
    location /api/live/ {
        proxy_pass http://localhost:9201;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Остальные API запросы
    location /api/ {
        proxy_pass http://localhost:9201;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # OAuth авторизация
    location /auth/ {
        proxy_pass http://localhost:9201;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Кэширование статики Next.js
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
\`\`\`

**Сохрани файл:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 5.2 Активация конфигурации

\`\`\`bash
# Создай символическую ссылку
sudo ln -s /etc/nginx/sites-available/diponika-frontend /etc/nginx/sites-enabled/

# Проверь конфигурацию на ошибки
sudo nginx -t

# Должно быть:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Перезапусти Nginx
sudo systemctl restart nginx

# Проверь статус
sudo systemctl status nginx
\`\`\`

### 5.3 Проверка работы

\`\`\`bash
# Открой в браузере (замени на свой домен)
http://diponika.ru

# Или проверь через curl
curl -I http://diponika.ru

# Должно быть:
# HTTP/1.1 200 OK
\`\`\`

---

## 🔒 Шаг 6: Настройка SSL (HTTPS)

### 6.1 Получение SSL сертификата

\`\`\`bash
# Получи сертификат от Let's Encrypt
sudo certbot --nginx -d diponika.ru -d www.diponika.ru

# Certbot задаст вопросы:
# 1. Email для уведомлений: введи свой email
# 2. Согласие с ToS: введи "Y"
# 3. Подписка на новости: введи "N" (опционально)
# 4. Redirect HTTP → HTTPS: выбери "2" (рекомендуется)

# Certbot автоматически:
# - Получит сертификат
# - Обновит конфиг Nginx
# - Настроит автообновление
\`\`\`

### 6.2 Проверка SSL

\`\`\`bash
# Открой в браузере
https://diponika.ru

# Должен быть зеленый замочек в адресной строке

# Проверь через curl
curl -I https://diponika.ru

# Должно быть:
# HTTP/2 200
\`\`\`

### 6.3 Автообновление сертификата

\`\`\`bash
# Проверь что автообновление настроено
sudo certbot renew --dry-run

# Должно быть:
# Congratulations, all simulated renewals succeeded

# Certbot автоматически обновит сертификат за 30 дней до истечения
\`\`\`

---

## ✅ Шаг 7: Финальная проверка

### 7.1 Чек-лист

Проверь что все работает:

\`\`\`bash
# 1. PM2 процесс запущен
pm2 status
# Статус должен быть "online"

# 2. Nginx работает
sudo systemctl status nginx
# Статус должен быть "active (running)"

# 3. Сайт открывается
curl -I https://diponika.ru
# HTTP/2 200

# 4. SSE работает (в другом терминале)
curl -N https://diponika.ru/api/live/search?query=test
# Должны приходить события

# 5. Логи без ошибок
pm2 logs diponika-frontend --lines 50
sudo tail -f /var/log/nginx/error.log
\`\`\`

### 7.2 Тестирование в браузере

Открой сайт и проверь:

- [ ] Главная страница загружается
- [ ] Анимированный фон работает
- [ ] Поисковая строка работает
- [ ] Поиск возвращает результаты в реальном времени
- [ ] Карточка товара открывается
- [ ] Цены отображаются
- [ ] OAuth кнопки работают
- [ ] Профиль загружается (после входа)
- [ ] Футер отображается
- [ ] Мобильная версия работает
- [ ] HTTPS работает (зеленый замочек)

---

## 🔧 Troubleshooting

### Проблема: PM2 процесс в статусе "errored"

\`\`\`bash
# Посмотри логи
pm2 logs diponika-frontend --lines 100

# Частые причины:
# 1. Не собран проект - запусти npm run build
# 2. Нет .env.local - создай файл
# 3. Порт 3000 занят - измени порт или останови другой процесс

# Перезапусти процесс
pm2 restart diponika-frontend
\`\`\`

### Проблема: Nginx возвращает 502 Bad Gateway

\`\`\`bash
# Проверь что Next.js запущен
pm2 status

# Проверь что порт 3000 слушается
sudo netstat -tlnp | grep 3000

# Проверь логи Nginx
sudo tail -f /var/log/nginx/error.log

# Перезапусти оба сервиса
pm2 restart diponika-frontend
sudo systemctl restart nginx
\`\`\`

### Проблема: SSE поиск не работает

\`\`\`bash
# Проверь что в Nginx конфиге есть настройки для SSE
sudo nano /etc/nginx/sites-available/diponika-frontend

# Должно быть:
# location /api/live/ {
#     proxy_buffering off;
#     proxy_cache off;
#     ...
# }

# Перезапусти Nginx
sudo systemctl restart nginx
\`\`\`

### Проблема: SSL сертификат не получается

\`\`\`bash
# Проверь что домен указывает на сервер
dig diponika.ru

# Проверь что порт 80 открыт
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# Попробуй получить сертификат снова
sudo certbot --nginx -d diponika.ru -d www.diponika.ru
\`\`\`

---

## 🔄 Обновление проекта

### Получение новых изменений

\`\`\`bash
# Перейди в папку проекта
cd /var/www/diponika-frontend

# Получи изменения из Git
git pull origin main

# Установи новые зависимости (если есть)
npm install

# Пересобери проект
npm run build

# Перезапусти PM2
pm2 restart diponika-frontend

# Проверь логи
pm2 logs diponika-frontend --lines 50
\`\`\`

### Откат к предыдущей версии

\`\`\`bash
# Посмотри историю коммитов
git log --oneline

# Откатись к нужному коммиту
git checkout <commit-hash>

# Пересобери
npm run build

# Перезапусти
pm2 restart diponika-frontend
\`\`\`

---

## 📊 Мониторинг

### Логи

\`\`\`bash
# PM2 логи
pm2 logs diponika-frontend

# Nginx access логи
sudo tail -f /var/log/nginx/diponika-frontend-access.log

# Nginx error логи
sudo tail -f /var/log/nginx/diponika-frontend-error.log

# Системные логи
sudo journalctl -u nginx -f
\`\`\`

### Ресурсы

\`\`\`bash
# Использование ресурсов PM2 процессами
pm2 monit

# Использование диска
df -h

# Использование RAM
free -h

# Загрузка CPU
top
\`\`\`

---

## 🎉 Готово!

Твой фронтенд успешно задеплоен и работает на production сервере!

**Что дальше:**
- Настрой мониторинг (например, UptimeRobot)
- Настрой бэкапы базы данных
- Настрой CDN для статики (Cloudflare)
- Настрой логирование ошибок (Sentry)

**Полезные ссылки:**
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
