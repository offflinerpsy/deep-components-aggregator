# Infrastructure Setup Plan — prosnab.tech
**Date**: 12 октября 2025  
**Domain**: prosnab.tech → 5.129.228.88  
**Current Status**: DNS настроен ✅, Фронт на :3000, SSL нет ❌, Почта нет ❌

---

## 🎯 ЦЕЛИ

1. ✅ DNS A-запись настроена (prosnab.tech → 5.129.228.88)
2. ❌ Вывести фронт на порт 80/443 (без :3000)
3. ❌ Установить SSL-сертификат (Let's Encrypt)
4. ❌ Настроить почтовый сервер (mail@prosnab.tech)
5. ❌ Клиентские почтовые ящики с доступом по IMAP/SMTP

---

## 📋 ПЛАН ДЕЙСТВИЙ

### ЭТАП 1: NGINX + SSL (приоритет HIGH)

#### 1.1 Установка Nginx
```bash
apt update
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
systemctl start nginx
```

#### 1.2 Конфигурация Nginx для фронтенда
**Файл**: `/etc/nginx/sites-available/prosnab.tech`

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name prosnab.tech www.prosnab.tech;
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS main site
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name prosnab.tech www.prosnab.tech;
    
    # SSL certificates (будут созданы certbot)
    ssl_certificate /etc/letsencrypt/live/prosnab.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prosnab.tech/privkey.pem;
    
    # SSL configuration (Mozilla Modern)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    # Proxy to Next.js (PM2 deep-v0 на :3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

#### 1.3 Активация конфигурации
```bash
ln -s /etc/nginx/sites-available/prosnab.tech /etc/nginx/sites-enabled/
nginx -t  # Проверка синтаксиса
systemctl reload nginx
```

#### 1.4 Получение SSL-сертификата
```bash
# ВАЖНО: перед этим нужно убедиться что порт 80 доступен извне
certbot --nginx -d prosnab.tech -d www.prosnab.tech --non-interactive --agree-tos --email admin@prosnab.tech

# Автопродление (добавится автоматически в cron)
certbot renew --dry-run
```

**Результат**: https://prosnab.tech откроется без :3000, с SSL-сертификатом

---

### ЭТАП 2: ПОЧТОВЫЙ СЕРВЕР (приоритет MEDIUM)

#### 2.1 Выбор решения

**Рекомендую**: **Mailcow-dockerized** (лучший вариант для вас)

**Почему Mailcow?**
- ✅ Полный стек (Postfix + Dovecot + Rspamd + SOGo + Webmail)
- ✅ Docker-based (изолированно от основной системы)
- ✅ Веб-админка (управление ящиками через браузер)
- ✅ IMAP/SMTP из коробки (настройка на телефоне за 2 минуты)
- ✅ Антиспам (Rspamd), DKIM, SPF, DMARC автоматически
- ✅ Webmail (SOGo + Roundcube) — доступ через браузер
- ✅ Поддержка aliases, sieve-фильтров, ActiveSync

**Альтернативы** (не рекомендую):
- ❌ **Postfix + Dovecot вручную** — сложно, долго, легко ошибиться
- ❌ **iRedMail** — устаревший, плохая поддержка
- ❌ **Zimbra** — тяжелый, overkill для вашей задачи
- ❌ **Mail-in-a-Box** — проще, но менее гибкий

#### 2.2 Требования к DNS (в ISPmanager)

**Обязательные записи**:

```dns
# A-запись (уже есть)
prosnab.tech.          A     5.129.228.88
www.prosnab.tech.      A     5.129.228.88

# MX-запись (почтовый сервер)
prosnab.tech.          MX    10 mail.prosnab.tech.

# A-запись для почтового сервера
mail.prosnab.tech.     A     5.129.228.88

# SPF (защита от спуфинга)
prosnab.tech.          TXT   "v=spf1 mx ~all"

# DMARC (политика обработки спама)
_dmarc.prosnab.tech.   TXT   "v=DMARC1; p=quarantine; rua=mailto:postmaster@prosnab.tech"

# DKIM (будет сгенерирован Mailcow, добавить позже)
# default._domainkey.prosnab.tech. TXT "v=DKIM1; k=rsa; p=..."

# Autodiscover (для Outlook/Thunderbird автонастройки)
autodiscover.prosnab.tech.  CNAME  mail.prosnab.tech.
autoconfig.prosnab.tech.    CNAME  mail.prosnab.tech.
```

#### 2.3 Установка Mailcow

**Требования**:
- Docker + Docker Compose
- 4GB RAM минимум (у вас достаточно)
- Порты: 25, 110, 143, 465, 587, 993, 995, 4190

**Установка**:
```bash
cd /opt
git clone https://github.com/mailcow/mailcow-dockerized
cd mailcow-dockerized

# Генерация конфигурации
./generate_config.sh

# Редактирование mailcow.conf:
# MAILCOW_HOSTNAME=mail.prosnab.tech
# MAILCOW_TZ=Europe/Moscow

# Запуск
docker-compose pull
docker-compose up -d

# Проверка статуса
docker-compose ps
```

**Веб-интерфейс**: https://mail.prosnab.tech
- **Логин**: admin
- **Пароль**: moohoo (изменить сразу!)

#### 2.4 Настройка Nginx для Mailcow

**Файл**: `/etc/nginx/sites-available/mail.prosnab.tech`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name mail.prosnab.tech autodiscover.prosnab.tech autoconfig.prosnab.tech;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mail.prosnab.tech autodiscover.prosnab.tech autoconfig.prosnab.tech;
    
    ssl_certificate /etc/letsencrypt/live/mail.prosnab.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mail.prosnab.tech/privkey.pem;
    
    # SSL config (аналогично основному сайту)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://127.0.0.1:8080;  # Mailcow UI port
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/mail.prosnab.tech /etc/nginx/sites-enabled/
certbot --nginx -d mail.prosnab.tech -d autodiscover.prosnab.tech -d autoconfig.prosnab.tech
nginx -t && systemctl reload nginx
```

#### 2.5 Создание почтовых ящиков

**Через веб-админку** (https://mail.prosnab.tech):
1. Логин: admin / moohoo
2. Меню: **Mailboxes** → **Add mailbox**
3. Заполнить:
   - **Local part**: `sales` (будет sales@prosnab.tech)
   - **Domain**: prosnab.tech
   - **Name**: Отдел продаж
   - **Password**: сложный пароль
   - **Quota**: 5GB (по умолчанию)
4. Сохранить

**Через CLI** (для автоматизации):
```bash
docker-compose exec mailcow-mailcow doveadm mailbox create -u sales@prosnab.tech INBOX
```

#### 2.6 Настройка на телефоне (iOS/Android)

**Автоматическая** (если DNS правильно настроен):
1. Почта → Добавить аккаунт
2. Email: `sales@prosnab.tech`
3. Пароль: `***`
4. Система автоматически найдет настройки через Autodiscover

**Ручная**:
- **IMAP (входящая почта)**:
  - Сервер: `mail.prosnab.tech`
  - Порт: `993` (SSL/TLS)
  - Логин: `sales@prosnab.tech`
  - Пароль: `***`

- **SMTP (исходящая почта)**:
  - Сервер: `mail.prosnab.tech`
  - Порт: `587` (STARTTLS) или `465` (SSL/TLS)
  - Логин: `sales@prosnab.tech`
  - Пароль: `***`
  - Требует аутентификацию: ДА

---

### ЭТАП 3: БЕЗОПАСНОСТЬ

#### 3.1 Firewall (UFW)
```bash
apt install -y ufw

# Разрешить SSH (ВАЖНО! иначе потеряете доступ)
ufw allow 22/tcp

# Веб-сервер
ufw allow 80/tcp
ufw allow 443/tcp

# Почтовый сервер
ufw allow 25/tcp    # SMTP (входящая)
ufw allow 587/tcp   # Submission (STARTTLS)
ufw allow 465/tcp   # SMTPS (SSL)
ufw allow 993/tcp   # IMAPS
ufw allow 143/tcp   # IMAP (опционально)

# Включить firewall
ufw enable
ufw status verbose
```

#### 3.2 Fail2Ban (защита от брутфорса)
```bash
apt install -y fail2ban

# Конфигурация для Mailcow
cat > /etc/fail2ban/jail.d/mailcow.conf <<EOF
[mailcow-postfix]
enabled = true
filter = mailcow-postfix
logpath = /opt/mailcow-dockerized/data/logs/postfix-mailcow/*.log
maxretry = 3
bantime = 86400
findtime = 600

[mailcow-dovecot]
enabled = true
filter = mailcow-dovecot
logpath = /opt/mailcow-dockerized/data/logs/dovecot-mailcow/*.log
maxretry = 3
bantime = 86400
findtime = 600
EOF

systemctl restart fail2ban
```

#### 3.3 Reverse DNS (PTR-запись)

**КРИТИЧЕСКИ ВАЖНО для почты!**

В админке хостинга (ISPmanager или у провайдера VPS) нужно настроить PTR-запись:
```
5.129.228.88 → mail.prosnab.tech
```

Проверка:
```bash
dig +short -x 5.129.228.88
# Должно вернуть: mail.prosnab.tech.
```

Без PTR многие почтовые серверы (Gmail, Outlook) будут отклонять вашу почту как спам!

---

## 🔧 ПЛАН ВЫПОЛНЕНИЯ (пошагово)

### ШАГ 1: Nginx + SSL (30 минут)
```bash
# 1. Установить nginx
apt update && apt install -y nginx certbot python3-certbot-nginx

# 2. Создать конфигурацию (скопировать из ЭТАП 1.2)
nano /etc/nginx/sites-available/prosnab.tech

# 3. Активировать
ln -s /etc/nginx/sites-available/prosnab.tech /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 4. Получить SSL
certbot --nginx -d prosnab.tech -d www.prosnab.tech --email admin@prosnab.tech

# 5. Проверить
curl -I https://prosnab.tech
```

**Результат**: https://prosnab.tech работает без :3000

---

### ШАГ 2: DNS для почты (10 минут)

В ISPmanager добавить записи:
```
MX    prosnab.tech.    10 mail.prosnab.tech.
A     mail.prosnab.tech.    5.129.228.88
TXT   prosnab.tech.    "v=spf1 mx ~all"
TXT   _dmarc.prosnab.tech.    "v=DMARC1; p=quarantine; rua=mailto:postmaster@prosnab.tech"
CNAME autodiscover.prosnab.tech.    mail.prosnab.tech.
CNAME autoconfig.prosnab.tech.      mail.prosnab.tech.
```

**Проверка**:
```bash
dig MX prosnab.tech +short
dig A mail.prosnab.tech +short
dig TXT prosnab.tech +short
```

---

### ШАГ 3: Mailcow установка (60 минут)
```bash
# 1. Установить Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 2. Клонировать Mailcow
cd /opt
git clone https://github.com/mailcow/mailcow-dockerized
cd mailcow-dockerized

# 3. Генерация конфига
./generate_config.sh
# Hostname: mail.prosnab.tech
# Timezone: Europe/Moscow

# 4. Настройка mailcow.conf
nano mailcow.conf
# MAILCOW_HOSTNAME=mail.prosnab.tech
# HTTP_PORT=8080
# HTTP_BIND=127.0.0.1

# 5. Запуск
docker-compose pull
docker-compose up -d

# 6. Ждать 2-3 минуты, проверить
docker-compose ps
curl -I http://localhost:8080
```

---

### ШАГ 4: Nginx для Mailcow + SSL (20 минут)
```bash
# 1. Создать конфигурацию (скопировать из ЭТАП 2.4)
nano /etc/nginx/sites-available/mail.prosnab.tech

# 2. Активировать
ln -s /etc/nginx/sites-available/mail.prosnab.tech /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 3. SSL
certbot --nginx -d mail.prosnab.tech -d autodiscover.prosnab.tech -d autoconfig.prosnab.tech

# 4. Проверить
curl -I https://mail.prosnab.tech
```

**Результат**: https://mail.prosnab.tech — веб-админка Mailcow

---

### ШАГ 5: Создать первый ящик (5 минут)
1. Открыть https://mail.prosnab.tech
2. Логин: `admin`, Пароль: `moohoo`
3. Сменить пароль админа!
4. Mailboxes → Add mailbox
5. Создать: `admin@prosnab.tech`

---

### ШАГ 6: Настроить на телефоне (5 минут)
1. Почта → Добавить аккаунт → IMAP
2. Email: `admin@prosnab.tech`
3. Пароль: (созданный в веб-админке)
4. IMAP: `mail.prosnab.tech:993` (SSL)
5. SMTP: `mail.prosnab.tech:587` (STARTTLS)

---

### ШАГ 7: DKIM (10 минут)
```bash
# 1. Открыть Mailcow веб-админку
# 2. Configuration → Configuration & Details → ARC/DKIM keys
# 3. Скопировать DKIM public key

# 4. Добавить в ISPmanager DNS:
# default._domainkey.prosnab.tech.  TXT  "v=DKIM1; k=rsa; p=MIGfMA0GCSq..."
```

**Проверка**:
```bash
dig TXT default._domainkey.prosnab.tech +short
```

---

### ШАГ 8: Firewall (10 минут)
```bash
apt install -y ufw
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 25
ufw allow 587
ufw allow 465
ufw allow 993
ufw enable
```

---

### ШАГ 9: PTR-запись (через тикет к хостеру)

Написать тикет хостингу VPS:
```
Тема: Настройка PTR-записи для IP 5.129.228.88

Здравствуйте!

Прошу настроить обратную DNS-запись (PTR) для IP 5.129.228.88:
5.129.228.88 → mail.prosnab.tech

Спасибо!
```

---

## ✅ ФИНАЛЬНАЯ ПРОВЕРКА

### Проверка веб-сайта:
```bash
curl -I https://prosnab.tech
# Должен вернуть: HTTP/2 200
```

### Проверка почты:
```bash
# MX-запись
dig MX prosnab.tech +short

# Подключение к SMTP
openssl s_client -connect mail.prosnab.tech:587 -starttls smtp

# Подключение к IMAP
openssl s_client -connect mail.prosnab.tech:993

# Отправка тестового письма
echo "Test" | mail -s "Test from prosnab.tech" test@gmail.com
```

### Онлайн-тесты:
- **SSL**: https://www.ssllabs.com/ssltest/analyze.html?d=prosnab.tech
- **Email**: https://mxtoolbox.com/SuperTool.aspx?action=mx:prosnab.tech
- **DKIM**: https://mxtoolbox.com/dkim.aspx
- **SPF**: https://mxtoolbox.com/spf.aspx

---

## 📊 ИТОГОВАЯ АРХИТЕКТУРА

```
Internet (80/443)
    ↓
Nginx (reverse proxy)
    ↓ https://prosnab.tech → :3000
    ↓ https://mail.prosnab.tech → :8080
    ├── PM2 deep-v0 (Next.js) :3000
    └── Mailcow (Docker) :8080
        ├── Postfix (SMTP) :25, :587, :465
        ├── Dovecot (IMAP) :993
        ├── Rspamd (антиспам)
        ├── SOGo (webmail)
        └── MySQL/Redis
```

---

## 💰 ЗАТРАТЫ

- **Nginx**: бесплатно
- **SSL (Let's Encrypt)**: бесплатно
- **Mailcow**: бесплатно (open source)
- **Время**: 2-3 часа на всё

---

## 🔐 БЕЗОПАСНОСТЬ

### Обязательные меры:
- ✅ SSL-сертификаты (Let's Encrypt)
- ✅ Firewall (UFW)
- ✅ Fail2Ban (защита от брутфорса)
- ✅ SPF + DKIM + DMARC (антиспам)
- ✅ PTR-запись (репутация IP)
- ✅ Сложные пароли (минимум 16 символов)

### Рекомендуемые:
- 🔸 SSH только по ключам (отключить пароли)
- 🔸 2FA для админки Mailcow
- 🔸 Регулярные бэкапы (daily)
- 🔸 Мониторинг (Prometheus + Grafana)

---

## 📱 ИСПОЛЬЗОВАНИЕ ПОЧТЫ

### Создание ящика:
1. https://mail.prosnab.tech → Mailboxes → Add
2. Заполнить данные (email, пароль, квота)

### Настройка на телефоне (iOS):
1. Настройки → Почта → Учётные записи → Новый
2. Email: `name@prosnab.tech`
3. Пароль: `***`
4. Система автоматически настроит (если Autodiscover работает)

### Настройка на телефоне (Android):
1. Gmail/K-9 Mail → Добавить аккаунт → Другой
2. IMAP: `mail.prosnab.tech:993` (SSL)
3. SMTP: `mail.prosnab.tech:587` (STARTTLS)

### Webmail (доступ через браузер):
https://mail.prosnab.tech → Apps → SOGo Webmail

---

## 🆘 TROUBLESHOOTING

### Проблема: "SSL certificate verification failed"
**Решение**: Проверить что certbot выполнен успешно, перезагрузить nginx

### Проблема: "Connection refused" на порт 993
**Решение**: Проверить firewall (`ufw status`), проверить Docker (`docker-compose ps`)

### Проблема: Письма уходят в спам
**Решение**: 
1. Проверить SPF/DKIM/DMARC
2. Убедиться что PTR-запись настроена
3. Прогреть IP (отправить 10-20 писем вручную)

### Проблема: "502 Bad Gateway" на https://prosnab.tech
**Решение**: Проверить что PM2 запущен (`pm2 list`), проверить логи nginx

---

## 📞 КОНТАКТЫ

**Документация**:
- Mailcow: https://docs.mailcow.email/
- Nginx: https://nginx.org/ru/docs/
- Let's Encrypt: https://letsencrypt.org/docs/

**Поддержка**:
- Mailcow community: https://community.mailcow.email/

---

**Готов начать установку?** Скажи когда готов, и я запущу автоматизированный скрипт для быстрой настройки!
