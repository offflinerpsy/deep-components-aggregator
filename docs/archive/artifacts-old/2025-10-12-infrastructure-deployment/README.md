# Infrastructure Deployment — Artifacts

Документация развёртывания инфраструктуры для prosnab.tech (12 октября 2025).

## Файлы

### 1. [`DEPLOYMENT-REPORT.md`](./DEPLOYMENT-REPORT.md)
**Полный технический отчёт о развёртывании**

Содержит:
- Executive Summary (статус Part 1 и Part 2)
- Детальный список установленных пакетов и конфигураций
- Таблицу DNS-записей
- URL-адреса всех сервисов
- Результаты тестов (HTTPS, SSL, Firewall, Docker)
- Список созданных/изменённых файлов
- Security considerations (применённые и ожидающие)
- Performance metrics (до/после)
- Rollback plan (если что-то пойдёт не так)
- Troubleshooting guide (частые проблемы и решения)
- Deployment checklist (что сделано, что осталось)
- Technical debt (планы улучшений)

**Для кого**: tech lead, DevOps, системный администратор

---

### 2. [`NEXT-STEPS.md`](./NEXT-STEPS.md)
**Пошаговая инструкция для завершения установки Mailcow**

Содержит:
- Команды для запуска контейнеров Mailcow
- Настройка Nginx для mail.prosnab.tech
- Получение SSL-сертификата
- Смена дефолтного пароля admin
- Создание первого почтового ящика
- Добавление DKIM-ключа в DNS
- Запрос PTR-записи у хостинга
- Отправка тестового письма
- Настройка мобильного клиента
- Настройка бэкапов
- Мониторинг и troubleshooting
- Финальный чек-лист

**Для кого**: любой участник команды (понятные команды copy-paste)

---

## Текущий статус

**Дата**: 12 октября 2025, 19:05 MSK

### ✅ Завершено (Part 1: Frontend)

- [x] Nginx установлен и настроен
- [x] SSL-сертификаты получены для prosnab.tech и www.prosnab.tech
- [x] HTTP → HTTPS редирект работает
- [x] Фронтенд доступен по https://prosnab.tech (без :3000)
- [x] Firewall (UFW) настроен
- [x] Docker установлен
- [x] Fail2Ban установлен

### ⏳ В процессе (Part 2: Email Server)

- [x] Mailcow репозиторий клонирован
- [x] Mailcow конфигурация создана (`mailcow.conf`)
- [x] DNS-записи настроены (A, MX, SPF, DMARC, CNAME)
- [x] Nginx конфиг для mail.prosnab.tech создан
- [ ] **Docker-образы загружаются** (18/159 слоёв, ~5 минут осталось) ← **ТЕКУЩИЙ ШАГ**
- [ ] Контейнеры запущены
- [ ] SSL для mail.prosnab.tech получен
- [ ] Mailcow UI доступен
- [ ] Пароль admin изменён
- [ ] Первый mailbox создан
- [ ] DKIM-ключ в DNS
- [ ] PTR-запись запрошена

---

## Быстрый старт (после завершения pull)

```bash
# 1. Запустить Mailcow
cd /opt/mailcow-dockerized
sudo docker compose up -d

# 2. Проверить статус
sudo docker compose ps
# Все контейнеры должны быть "Up (healthy)"

# 3. Включить Nginx для mail.prosnab.tech
cat > /tmp/mail-temp.conf << 'EOF'
server {
    listen 80;
    server_name mail.prosnab.tech;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
sudo mv /tmp/mail-temp.conf /etc/nginx/sites-available/mail.prosnab.tech
sudo ln -s /etc/nginx/sites-available/mail.prosnab.tech /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 4. Получить SSL
sudo certbot --nginx -d mail.prosnab.tech --non-interactive --agree-tos --email admin@prosnab.tech --redirect

# 5. Открыть UI
# https://mail.prosnab.tech
# Логин: admin / moohoo (СМЕНИТЬ!)
```

Подробности в [`NEXT-STEPS.md`](./NEXT-STEPS.md).

---

## Важные URL

| Сервис | URL | Статус | Логин |
|--------|-----|--------|-------|
| **Фронтенд (главный сайт)** | https://prosnab.tech | ✅ **РАБОТАЕТ** | - |
| **Mailcow UI (почта)** | https://mail.prosnab.tech | ⏳ Ожидает запуска | `admin` / `moohoo` |
| **SOGo Webmail** | https://mail.prosnab.tech/SOGo | ⏳ Ожидает запуска | Почтовый ящик |

---

## Контакты для завершения установки

### Техподдержка хостинга (для PTR-записи)

**Провайдер**: timeweb.ru  
**Запрос**: Установить PTR-запись `5.129.228.88` → `mail.prosnab.tech`  
**Срок**: 24-48 часов  
**Как связаться**: support@timeweb.ru или через личный кабинет (тикет)

---

## Логи и диагностика

### Проверка работы фронтенда

```bash
# HTTP редирект
curl -I http://prosnab.tech | grep Location
# Ожидается: Location: https://prosnab.tech/

# HTTPS ответ
curl -I https://prosnab.tech | grep "HTTP"
# Ожидается: HTTP/1.1 200 OK

# SSL сертификат
openssl s_client -connect prosnab.tech:443 -servername prosnab.tech < /dev/null 2>&1 | grep "Verify return code"
# Ожидается: Verify return code: 0 (ok)
```

### Проверка статуса Mailcow (после запуска)

```bash
# Все контейнеры
cd /opt/mailcow-dockerized
sudo docker compose ps

# Логи конкретного контейнера
sudo docker compose logs -f postfix-mailcow
sudo docker compose logs -f dovecot-mailcow
sudo docker compose logs -f nginx-mailcow

# Очередь почты
sudo docker compose exec postfix-mailcow mailq
```

### Проверка DNS

```bash
# A записи
dig prosnab.tech +short
dig www.prosnab.tech +short
dig mail.prosnab.tech +short
# Все должны возвращать: 5.129.228.88

# MX запись
dig MX prosnab.tech +short
# Должна возвращать: 10 mail.prosnab.tech.

# SPF
dig TXT prosnab.tech +short | grep spf
# Должна возвращать: "v=spf1 mx ~all"

# DMARC
dig TXT _dmarc.prosnab.tech +short
# Должна возвращать: "v=DMARC1; p=quarantine; rua=mailto:postmaster@prosnab.tech"

# DKIM (после добавления в DNS)
dig TXT dkim._domainkey.prosnab.tech +short
# Должна возвращать: "v=DKIM1; k=rsa; p=MIIBIjAN..."

# PTR (после запроса у хостинга)
dig -x 5.129.228.88 +short
# Должна возвращать: mail.prosnab.tech.
```

---

## Backup & Restore

### Создать бэкап Mailcow

```bash
cd /opt/mailcow-dockerized
sudo ./helper-scripts/backup_and_restore.sh backup all
```

Архив будет сохранён в `/opt/mailcow-dockerized/backups/`.

### Восстановить из бэкапа

```bash
cd /opt/mailcow-dockerized
sudo ./helper-scripts/backup_and_restore.sh restore /path/to/backup-file.tar.gz
```

### Бэкап базы данных (MySQL)

```bash
cd /opt/mailcow-dockerized
sudo docker compose exec -T mysql-mailcow mysqldump \
  --default-character-set=utf8mb4 \
  -u root \
  -p$(grep DBROOT mailcow.conf | cut -d= -f2) \
  vmail > mailcow-db-$(date +%Y-%m-%d).sql
```

---

## Мониторинг

### Uptime проверки

Рекомендуем настроить внешний мониторинг:
- **UptimeRobot** (бесплатно, 50 мониторов): https://uptimerobot.com/
- **Pingdom**: https://www.pingdom.com/
- **StatusCake**: https://www.statuscake.com/

Мониторить:
- https://prosnab.tech (главный сайт)
- https://mail.prosnab.tech (почтовый сервер UI)
- SMTP порт 25 (mail.prosnab.tech:25)
- IMAP порт 993 (mail.prosnab.tech:993)

### Email deliverability тесты

После настройки отправить тестовое письмо на:
- **Mail-tester**: https://www.mail-tester.com/
- **MXToolbox**: https://mxtoolbox.com/EmailHealth.aspx

Должны получить оценку **9-10/10** (SPF/DKIM/DMARC = PASS, PTR настроен).

---

## Финальный чек-лист

**Перед закрытием задачи проверить:**

- [ ] https://prosnab.tech открывается и показывает фронтенд
- [ ] HTTPS работает, сертификат валиден (не expired, не self-signed)
- [ ] https://mail.prosnab.tech открывается и показывает Mailcow UI
- [ ] Все Docker-контейнеры Mailcow в статусе `Up (healthy)`
- [ ] Пароль admin изменён с `moohoo` на сложный
- [ ] Создан почтовый ящик `admin@prosnab.tech`
- [ ] Отправлено тестовое письмо на Gmail, прошло SPF/DKIM/DMARC
- [ ] DKIM-ключ добавлен в DNS (проверено через `dig`)
- [ ] PTR-запись запрошена у хостинга (timeweb.ru)
- [ ] Настроены ежедневные бэкапы (cron)
- [ ] Документация обновлена (этот README и NEXT-STEPS)

---

**Deployment Lead**: GitHub Copilot (automated infrastructure setup)  
**Date**: October 12, 2025  
**Version**: 1.0 (Part 1 complete, Part 2 in progress)  
**Next Review**: After Mailcow containers are up and tested
