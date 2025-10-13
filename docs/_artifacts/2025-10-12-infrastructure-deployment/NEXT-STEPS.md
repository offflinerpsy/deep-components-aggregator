# Следующие шаги — Mailcow Email Server

## Статус инфраструктуры

✅ **ГОТОВО**:
- Фронт работает на https://prosnab.tech (без :3000)
- SSL от Let's Encrypt настроен и авто-обновляется
- Firewall (UFW) настроен, разрешены только нужные порты
- Docker установлен
- Mailcow код скачан, конфиг создан

⏳ **В ПРОЦЕССЕ**:
- Docker-образы Mailcow загружаются (18/159 слоёв, ~5 минут осталось)

## Команды для завершения установки

### 1. Дождаться окончания `docker compose pull`

Проверить статус:
```bash
cd /opt/mailcow-dockerized
sudo docker compose pull
```

Когда завершится, увидите:
```
✔ clamd-mailcow Pulled
✔ unbound-mailcow Pulled
...
✔ olefy-mailcow Pulled
```

### 2. Запустить все контейнеры Mailcow

```bash
cd /opt/mailcow-dockerized
sudo docker compose up -d
```

Проверить статус:
```bash
sudo docker compose ps
```

Должно быть ~15-20 контейнеров в статусе `Up` (healthy).

### 3. Включить Nginx конфиг для mail.prosnab.tech

Сначала временный HTTP-only (для получения SSL):
```bash
# Создать временный конфиг без HTTPS-блока
cat > /tmp/mail-temp.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name mail.prosnab.tech;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
EOF

sudo mv /tmp/mail-temp.conf /etc/nginx/sites-available/mail.prosnab.tech
sudo ln -s /etc/nginx/sites-available/mail.prosnab.tech /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Получить SSL для mail.prosnab.tech

```bash
sudo certbot --nginx -d mail.prosnab.tech --non-interactive --agree-tos --email admin@prosnab.tech --redirect
```

Certbot автоматически добавит HTTPS-блок в конфиг.

### 5. Открыть Mailcow UI и сменить пароль

**URL**: https://mail.prosnab.tech

**Дефолтный логин**:
- Email: `admin`
- Пароль: `moohoo`

**⚠️ СМЕНИТЬ СРАЗУ!**

1. Войти в UI
2. Перейти в `System` → `Access` → `Edit Administrator`
3. Новый пароль: **[выбрать сложный]**
4. Save

### 6. Создать первый почтовый ящик

1. Перейти в `Email` → `Mailboxes` → `Add Mailbox`
2. Заполнить:
   - **Email**: `admin@prosnab.tech`
   - **Full name**: `Prosnab Admin`
   - **Password**: **[выбрать сложный пароль]**
   - **Quota (MiB)**: `10240` (10GB)
3. Нажать `Add`

### 7. Добавить DKIM-ключ в DNS

1. В Mailcow UI: `Configuration` → `Configuration & Details` → `DKIM` → **Show DKIM keys**
2. Скопировать значение для `prosnab.tech` (TXT-запись)
3. В ISPmanager:
   - DNS → Добавить запись
   - Тип: `TXT`
   - Поддомен: `dkim._domainkey`
   - Значение: **[вставить из Mailcow]** (например: `v=DKIM1; k=rsa; p=MIIBIjAN...`)
   - Сохранить
4. Проверить через 5 минут:
   ```bash
   dig TXT dkim._domainkey.prosnab.tech +short
   ```

### 8. Запросить PTR-запись у хостинга

**Критично для доставки почты!**

Написать в техподдержку timeweb.ru:
```
Тема: Запрос на настройку PTR-записи

Здравствуйте!

Прошу настроить PTR-запись для IP-адреса:
- IP: 5.129.228.88
- PTR: mail.prosnab.tech

Почтовый сервер установлен, необходимо для корректной доставки писем.

Спасибо!
```

Обычно делают за 24-48 часов.

Проверить после установки:
```bash
dig -x 5.129.228.88 +short
# Должно вернуть: mail.prosnab.tech
```

### 9. Отправить тестовое письмо

**Способ 1: Через веб-интерфейс SOGo**

1. Открыть https://mail.prosnab.tech/SOGo
2. Войти как `admin@prosnab.tech` (пароль из шага 6)
3. Отправить письмо на свой Gmail/Outlook

**Способ 2: Через командную строку**

```bash
echo "Test email from prosnab.tech" | mail -s "Test" -a "From: admin@prosnab.tech" your-gmail@gmail.com
```

**Проверить заголовки письма:**
- SPF: `PASS`
- DKIM: `PASS`
- DMARC: `PASS`

Если все три `PASS` — почта настроена правильно.

### 10. Настроить мобильный клиент (опционально)

**IMAP (входящая почта)**:
- Сервер: `mail.prosnab.tech`
- Порт: `993`
- Безопасность: `SSL/TLS`
- Логин: `admin@prosnab.tech`
- Пароль: **[из шага 6]**

**SMTP (исходящая почта)**:
- Сервер: `mail.prosnab.tech`
- Порт: `587`
- Безопасность: `STARTTLS`
- Логин: `admin@prosnab.tech`
- Пароль: **[из шага 6]**

---

## Автоматический запуск (после перезагрузки сервера)

Mailcow настроен на автозапуск. После `systemctl reboot` все контейнеры поднимутся автоматически.

Проверить:
```bash
sudo docker compose ps
# Все контейнеры должны быть в статусе Up (healthy)
```

---

## Бэкапы

### Бэкап базы данных (ежедневно)

Создать cron-задачу:
```bash
sudo crontab -e
```

Добавить строку:
```
0 3 * * * cd /opt/mailcow-dockerized && docker compose exec -T mysql-mailcow mysqldump --default-character-set=utf8mb4 -u root -p$(grep DBROOT /opt/mailcow-dockerized/mailcow.conf | cut -d= -f2) vmail > /opt/backups/mailcow-$(date +\%Y-\%m-\%d).sql
```

Создать папку для бэкапов:
```bash
sudo mkdir -p /opt/backups
```

### Бэкап Mailcow (еженедельно)

```bash
cd /opt/mailcow-dockerized
sudo ./helper-scripts/backup_and_restore.sh backup all
```

Сохранять архивы в `/opt/backups/` или на внешнее хранилище (S3, Backblaze).

---

## Мониторинг

### Проверка здоровья Mailcow

```bash
cd /opt/mailcow-dockerized
sudo docker compose ps
```

Если контейнер в статусе `Restarting` или `Exited`:
```bash
sudo docker compose logs -f [имя-контейнера]
# Например: sudo docker compose logs -f postfix-mailcow
```

### Проверка очереди почты

```bash
cd /opt/mailcow-dockerized
sudo docker compose exec postfix-mailcow mailq
```

Если очередь пустая: `Mail queue is empty`  
Если есть застрявшие письма — проверить логи.

### Проверка логов

```bash
# Postfix (входящая/исходящая почта)
sudo docker compose logs -f postfix-mailcow

# Dovecot (IMAP/POP3)
sudo docker compose logs -f dovecot-mailcow

# Rspamd (спам-фильтр)
sudo docker compose logs -f rspamd-mailcow

# Nginx (веб-интерфейс)
sudo docker compose logs -f nginx-mailcow
```

---

## Troubleshooting

### Почта не отправляется

**Симптомы**: письма застревают в очереди

**Проверить**:
1. PTR-запись установлена: `dig -x 5.129.228.88 +short`
2. Порт 25 не заблокирован: `telnet smtp.gmail.com 25`
3. Логи Postfix: `sudo docker compose logs postfix-mailcow | grep -i error`

### Почта не приходит

**Симптомы**: письма не доходят до ящика

**Проверить**:
1. MX-запись: `dig MX prosnab.tech +short` → должно быть `mail.prosnab.tech`
2. Firewall: `sudo ufw status | grep 25` → должен быть разрешён
3. Логи Dovecot: `sudo docker compose logs dovecot-mailcow | grep -i error`

### Веб-интерфейс недоступен

**Симптомы**: https://mail.prosnab.tech не открывается

**Проверить**:
1. Контейнер Nginx: `sudo docker compose ps nginx-mailcow`
2. Nginx основной: `sudo systemctl status nginx`
3. SSL сертификат: `sudo certbot certificates | grep mail.prosnab.tech`

### Контейнер постоянно перезапускается

**Проверить логи**:
```bash
sudo docker compose logs --tail=100 [имя-контейнера]
```

**Частые причины**:
- Недостаточно RAM (минимум 4GB для Mailcow)
- Конфликт портов (проверить: `sudo netstat -tulpn | grep :25`)
- Проблемы с IPv6 (отключить в `mailcow.conf`: `ENABLE_IPV6=false`, перезапустить)

---

## Полезные ссылки

- **Mailcow Документация**: https://docs.mailcow.email/
- **Mailcow GitHub**: https://github.com/mailcow/mailcow-dockerized
- **Тест почты (MXToolbox)**: https://mxtoolbox.com/SuperTool.aspx?action=mx:prosnab.tech
- **SPF/DKIM/DMARC проверка**: https://www.mail-tester.com/

---

## Чек-лист завершения установки

- [ ] Docker-образы загружены (`docker compose pull`)
- [ ] Контейнеры запущены (`docker compose up -d`)
- [ ] Все контейнеры в статусе `Up (healthy)`
- [ ] Nginx для mail.prosnab.tech включён
- [ ] SSL для mail.prosnab.tech получен
- [ ] Mailcow UI доступен по https://mail.prosnab.tech
- [ ] Пароль admin изменён с дефолтного
- [ ] Создан mailbox `admin@prosnab.tech`
- [ ] DKIM-ключ добавлен в DNS
- [ ] PTR-запись запрошена у хостинга (ждём ответа)
- [ ] Тестовое письмо отправлено на Gmail
- [ ] Проверены заголовки (SPF/DKIM/DMARC = PASS)
- [ ] Настроен мобильный клиент (опционально)
- [ ] Настроены ежедневные бэкапы (cron)

---

**Последнее обновление**: 12 октября 2025, 19:05 MSK  
**Статус**: Ждём завершения `docker compose pull`, затем запуск контейнеров.
