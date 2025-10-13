# Infrastructure Documentation — prosnab.tech
**Created**: October 12, 2025  
**Domain**: prosnab.tech  
**IP**: 5.129.228.88

---

## 📚 ДОКУМЕНТЫ

### 1. **QUICK-START-CHECKLIST.md** ⭐ НАЧАТЬ ОТСЮДА
**Для кого**: Вы (администратор)  
**Что**: Пошаговый чек-лист с галочками  
**Время**: 2-3 часа  

👉 Открыть: [QUICK-START-CHECKLIST.md](./QUICK-START-CHECKLIST.md)

---

### 2. **DNS-SETUP-GUIDE.md** 
**Для кого**: Работа в ISPmanager  
**Что**: Детальная инструкция по добавлению DNS-записей  
**Время**: 10 минут  

👉 Открыть: [DNS-SETUP-GUIDE.md](./DNS-SETUP-GUIDE.md)

**Что добавить**:
- A-запись для mail
- MX-запись (маршрутизация почты)
- TXT SPF (защита от спуфинга)
- TXT DMARC (политика спама)
- CNAME autodiscover/autoconfig (автонастройка)
- (позже) TXT DKIM (подпись писем)

---

### 3. **INFRASTRUCTURE-PLAN.md**
**Для кого**: Технические детали  
**Что**: Полный план инфраструктуры с объяснениями  
**Время**: 30 минут (чтение)  

👉 Открыть: [INFRASTRUCTURE-PLAN.md](./INFRASTRUCTURE-PLAN.md)

**Содержание**:
- Архитектура (Nginx + PM2 + Mailcow)
- Подробная конфигурация Nginx
- Установка и настройка Mailcow
- Безопасность (Firewall, Fail2Ban)
- Troubleshooting

---

## 🤖 АВТОМАТИЗАЦИЯ

### Скрипт установки
**Путь**: `/opt/deep-agg/scripts/setup-infrastructure.sh`

**Что делает**:
1. Устанавливает Nginx
2. Настраивает SSL (Let's Encrypt)
3. Создаёт конфигурацию для prosnab.tech
4. Настраивает Firewall (UFW)
5. (опционально) Устанавливает Mailcow
6. (опционально) Настраивает SSL для mail.prosnab.tech

**Запуск**:
```bash
sudo /opt/deep-agg/scripts/setup-infrastructure.sh
```

---

## 🎯 БЫСТРЫЙ СТАРТ (3 шага)

### Шаг 1: DNS в ISPmanager (10 мин)
```bash
# Открыть DNS-SETUP-GUIDE.md
# Добавить 6 записей в ISPmanager
```

### Шаг 2: Запустить скрипт (30 мин)
```bash
sudo /opt/deep-agg/scripts/setup-infrastructure.sh
# Согласиться на Mailcow: y
```

### Шаг 3: Первая настройка (10 мин)
```bash
# 1. Открыть https://mail.prosnab.tech
# 2. Войти: admin / moohoo
# 3. СМЕНИТЬ ПАРОЛЬ
# 4. Создать ящик admin@prosnab.tech
# 5. Скопировать DKIM → добавить в ISPmanager
```

**ГОТОВО!** ✅

---

## 📊 ЦЕЛИ И РЕЗУЛЬТАТЫ

### Что мы решаем:

#### Проблема 1: Сайт доступен только на :3000
❌ **Было**: http://5.129.228.88:3000/  
✅ **Стало**: https://prosnab.tech/ (без порта)

**Решение**: Nginx reverse proxy на порт 80/443

---

#### Проблема 2: Нет SSL-сертификата
❌ **Было**: http:// (небезопасно)  
✅ **Стало**: https:// (зелёный замок)

**Решение**: Let's Encrypt (бесплатный SSL)

---

#### Проблема 3: Нет корпоративной почты
❌ **Было**: Gmail/Yandex (сторонние сервисы)  
✅ **Стало**: admin@prosnab.tech (свой домен)

**Решение**: Mailcow (полноценный почтовый сервер)

---

#### Проблема 4: Нет доступа к почте на телефоне
❌ **Было**: Только webmail  
✅ **Стало**: IMAP/SMTP (любой клиент)

**Решение**: Dovecot (IMAP) + Postfix (SMTP) в Mailcow

---

## 🏗️ АРХИТЕКТУРА (упрощённо)

```
┌────────────────────────────────┐
│   https://prosnab.tech         │ ← Пользователь открывает сайт
└──────────────┬─────────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Nginx (порт 80/443)         │ ← Reverse proxy
│  - SSL сертификаты           │
│  - Перенаправление на :3000  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  PM2 deep-v0 (порт 3000)     │ ← Ваш Next.js сайт
│  - Frontend                  │
└──────────────────────────────┘


┌────────────────────────────────┐
│   admin@prosnab.tech           │ ← Почтовый ящик
└──────────────┬─────────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Mailcow (Docker)            │ ← Почтовый сервер
│  - Postfix (SMTP)            │
│  - Dovecot (IMAP)            │
│  - Webmail (SOGo)            │
└──────────────────────────────┘
```

---

## 📱 КАК ПОЛЬЗОВАТЬСЯ ПОЧТОЙ

### Веб-интерфейс (с любого устройства):
1. Открыть https://mail.prosnab.tech
2. Войти под своим ящиком
3. Читать/отправлять письма

### На телефоне (iOS/Android):
1. Почта → Добавить аккаунт
2. Email: `admin@prosnab.tech`
3. Пароль: `***`
4. Автонастройка через Autodiscover

### На компьютере (Outlook/Thunderbird):
1. Добавить аккаунт → IMAP
2. IMAP: `mail.prosnab.tech:993` (SSL)
3. SMTP: `mail.prosnab.tech:587` (STARTTLS)

---

## 🔐 БЕЗОПАСНОСТЬ

### Что настроено автоматически:
- ✅ **SSL/TLS шифрование** (Let's Encrypt)
- ✅ **Firewall** (UFW) — закрыты все порты кроме нужных
- ✅ **SPF** — защита от подделки отправителя
- ✅ **DKIM** — цифровая подпись писем
- ✅ **DMARC** — политика обработки спама
- ✅ **Security headers** (HSTS, X-Frame-Options, etc.)

### Что нужно настроить вручную:
- ⚠️ **PTR-запись** (через тикет хостингу) — КРИТИЧНО!
- ⚠️ **Сложные пароли** (минимум 16 символов)
- ⚠️ **Регулярные обновления** (apt update && apt upgrade)

---

## 🆘 ЧАСТЫЕ ПРОБЛЕМЫ

### 1. Сайт не открывается без :3000
**Проверка**:
```bash
systemctl status nginx
pm2 list
```

**Решение**:
```bash
systemctl restart nginx
pm2 restart deep-v0
```

---

### 2. "Небезопасное соединение" (SSL не работает)
**Проверка**:
```bash
ls -la /etc/letsencrypt/live/prosnab.tech/
```

**Решение**:
```bash
certbot --nginx -d prosnab.tech -d www.prosnab.tech
systemctl reload nginx
```

---

### 3. Письма уходят в спам
**Причина**: Нет PTR-записи

**Проверка**:
```bash
dig +short -x 5.129.228.88
# Должно вернуть: mail.prosnab.tech.
```

**Решение**: Отправить тикет хостингу (шаблон в QUICK-START-CHECKLIST.md)

---

### 4. Mailcow не запускается
**Проверка**:
```bash
cd /opt/mailcow-dockerized
docker-compose ps
```

**Решение**:
```bash
docker-compose down
docker-compose pull
docker-compose up -d
```

---

## 📞 ПОДДЕРЖКА И РЕСУРСЫ

### Документация:
- **Mailcow**: https://docs.mailcow.email/
- **Nginx**: https://nginx.org/ru/docs/
- **Let's Encrypt**: https://letsencrypt.org/ru/docs/

### Онлайн-инструменты:
- **SSL Test**: https://www.ssllabs.com/ssltest/analyze.html?d=prosnab.tech
- **MX Toolbox**: https://mxtoolbox.com/SuperTool.aspx?action=mx:prosnab.tech
- **Mail Tester**: https://www.mail-tester.com/
- **DKIM Validator**: https://dkimvalidator.com/

### Сообщество:
- **Mailcow Forum**: https://community.mailcow.email/
- **Nginx Forum**: https://forum.nginx.org/

---

## 💡 РЕКОМЕНДАЦИИ

### Почтовый софт (альтернативы Mailcow):

**НЕ РЕКОМЕНДУЮ** (слишком сложно/устарело):
- ❌ Postfix + Dovecot вручную (2-3 дня настройки)
- ❌ iRedMail (плохая поддержка)
- ❌ Zimbra (тяжёлый, overkill)

**Mailcow — лучший выбор** потому что:
- ✅ Всё в Docker (изолированно)
- ✅ Веб-админка (не нужны командная строка)
- ✅ Webmail из коробки
- ✅ IMAP/SMTP автоматически
- ✅ Антиспам (Rspamd)
- ✅ Автонастройка (Autodiscover/Autoconfig)

---

## 🎉 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ

После завершения установки у вас будет:

### Веб-сайт:
- 🌐 https://prosnab.tech (без :3000)
- 🔒 SSL-сертификат (зелёный замок)
- 🚀 Быстрый (Nginx кэширование)
- 📱 Мобильная версия (responsive)

### Почтовый сервер:
- 📧 Неограниченное количество ящиков
- 📱 Доступ с телефона (IMAP/SMTP)
- 💻 Webmail (SOGo + Roundcube)
- 🛡️ Защита от спама (Rspamd)
- ✉️ DKIM/SPF/DMARC (репутация)

### Администрирование:
- 🖥️ Веб-админка (https://mail.prosnab.tech)
- 📊 Статистика (логи, метрики)
- 🔐 Управление пользователями
- 💾 Бэкапы (автоматические)

---

## 📅 РЕГУЛЯРНОЕ ОБСЛУЖИВАНИЕ

### Еженедельно:
- [ ] Проверить работоспособность (curl https://prosnab.tech)
- [ ] Проверить логи Mailcow (`docker-compose logs --tail=100`)

### Ежемесячно:
- [ ] Обновить систему (`apt update && apt upgrade`)
- [ ] Обновить Mailcow (`cd /opt/mailcow-dockerized && ./update.sh`)
- [ ] Проверить репутацию IP (https://mxtoolbox.com/blacklists.aspx)

### Ежеквартально:
- [ ] Проверить SSL-сертификаты (`certbot certificates`)
- [ ] Проверить размер логов (`du -sh /var/log`)
- [ ] Ротация логов (`logrotate -f /etc/logrotate.conf`)

---

## ✅ ГОТОВНОСТЬ К ЗАПУСКУ

**Перед началом убедитесь**:
- ✅ У вас есть root-доступ к серверу (SSH)
- ✅ У вас есть доступ к ISPmanager (DNS)
- ✅ Домен prosnab.tech уже направлен на 5.129.228.88
- ✅ Сервер доступен из интернета (ping 5.129.228.88)
- ✅ Порт 80 открыт (проверка: `nc -zv 5.129.228.88 80`)

**Если всё готово** → откройте [QUICK-START-CHECKLIST.md](./QUICK-START-CHECKLIST.md) и начинайте! 🚀

---

**Автор**: GitHub Copilot (GPT-5)  
**Дата**: 12 октября 2025  
**Версия**: 1.0
