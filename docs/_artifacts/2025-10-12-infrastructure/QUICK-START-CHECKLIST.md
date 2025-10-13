# Infrastructure Setup Checklist — prosnab.tech
**Date**: October 12, 2025

---

## 🎯 КРАТКИЙ ПЛАН ДЕЙСТВИЙ

### Этап 1: DNS (СДЕЛАТЬ СЕЙЧАС В ISPMANAGER) ✋

**Время**: 10 минут  
**Где**: ISPmanager → Домены → prosnab.tech → DNS-записи

Добавить записи:
- [ ] **A** `mail` → `5.129.228.88`
- [ ] **MX** `@` → `mail.prosnab.tech.` (приоритет 10)
- [ ] **TXT** `@` → `v=spf1 mx ~all`
- [ ] **TXT** `_dmarc` → `v=DMARC1; p=quarantine; rua=mailto:postmaster@prosnab.tech`
- [ ] **CNAME** `autodiscover` → `mail.prosnab.tech.`
- [ ] **CNAME** `autoconfig` → `mail.prosnab.tech.`

**Проверка**:
```bash
dig MX prosnab.tech +short
# Ожидаемый результат: 10 mail.prosnab.tech.
```

---

### Этап 2: Nginx + SSL (АВТОМАТИЧЕСКИ) 🤖

**Время**: 10 минут  
**Команда**:

```bash
sudo /opt/deep-agg/scripts/setup-infrastructure.sh
```

Скрипт выполнит:
- [ ] Установка Nginx
- [ ] Конфигурация для prosnab.tech
- [ ] Получение SSL-сертификата (Let's Encrypt)
- [ ] Настройка Firewall (UFW)
- [ ] Перенаправление :3000 → :80/443

**Результат**: https://prosnab.tech работает БЕЗ :3000

---

### Этап 3: Mailcow (АВТОМАТИЧЕСКИ ИЛИ ВРУЧНУЮ) 📧

**Время**: 30 минут  
**Вариант A** (автоматически, рекомендуется):

```bash
# Скрипт спросит: "Install Mailcow now? (y/n)"
# Ответить: y
```

**Вариант B** (вручную):

```bash
cd /opt
git clone https://github.com/mailcow/mailcow-dockerized
cd mailcow-dockerized
./generate_config.sh
# Hostname: mail.prosnab.tech
# Timezone: Europe/Moscow

docker-compose pull
docker-compose up -d
```

Скрипт выполнит:
- [ ] Установка Docker
- [ ] Клонирование Mailcow
- [ ] Генерация конфигурации
- [ ] Запуск контейнеров
- [ ] Настройка Nginx для mail.prosnab.tech
- [ ] Получение SSL для mail

**Результат**: https://mail.prosnab.tech — веб-админка

---

### Этап 4: Первоначальная настройка Mailcow 🔐

**Время**: 10 минут  
**Где**: https://mail.prosnab.tech

- [ ] Войти: `admin` / `moohoo`
- [ ] **СРАЗУ СМЕНИТЬ ПАРОЛЬ** (Administration → Edit admin)
- [ ] Создать первый ящик (Mailboxes → Add mailbox):
  - Email: `admin@prosnab.tech`
  - Password: (сложный пароль)
  - Quota: 5GB
- [ ] Скопировать DKIM-ключ (Configuration → ARC/DKIM keys)

---

### Этап 5: Добавить DKIM в DNS 🔑

**Время**: 5 минут  
**Где**: ISPmanager → DNS-записи

- [ ] Скопировать DKIM public key из Mailcow
- [ ] Добавить TXT-запись:
  - Имя: `default._domainkey`
  - Значение: `v=DKIM1; k=rsa; p=MIGfMA0GCSq...` (длинная строка)

**Проверка**:
```bash
dig TXT default._domainkey.prosnab.tech +short
```

---

### Этап 6: PTR-запись (КРИТИЧНО!) 🚨

**Время**: 24-48 часов (зависит от хостера)  
**Где**: Тикет в поддержку VPS-хостинга

**Шаблон тикета**:
```
Тема: Настройка PTR-записи для IP 5.129.228.88

Здравствуйте!

Прошу настроить обратную DNS-запись (PTR) для IP-адреса:
5.129.228.88 → mail.prosnab.tech

Это необходимо для корректной работы почтового сервера.

Спасибо!
```

- [ ] Отправить тикет
- [ ] Дождаться подтверждения

**Проверка**:
```bash
dig +short -x 5.129.228.88
# Ожидаемый результат: mail.prosnab.tech.
```

**БЕЗ PTR ПОЧТА НЕ БУДЕТ РАБОТАТЬ!** (Gmail/Outlook отклонят письма)

---

### Этап 7: Тестирование 🧪

**Время**: 15 минут

#### Тест веб-сайта:
- [ ] Открыть https://prosnab.tech (без :3000)
- [ ] Проверить SSL: https://www.ssllabs.com/ssltest/analyze.html?d=prosnab.tech
- [ ] Проверить HTTP→HTTPS редирект: `curl -I http://prosnab.tech`

#### Тест почты:
- [ ] Открыть https://mail.prosnab.tech
- [ ] Войти под созданным ящиком
- [ ] Отправить тестовое письмо на Gmail
- [ ] Проверить что письмо НЕ в спаме
- [ ] Проверить заголовки (SPF, DKIM, DMARC PASS)

#### Онлайн-тесты:
- [ ] **MX Toolbox**: https://mxtoolbox.com/SuperTool.aspx?action=mx:prosnab.tech
- [ ] **Mail Tester**: https://www.mail-tester.com/ (отправить письмо, получить оценку)
- [ ] **DKIM Validator**: https://dkimvalidator.com/

---

### Этап 8: Настройка на телефоне 📱

**Время**: 5 минут

#### iOS (iPhone):
1. Настройки → Почта → Учётные записи → Новая
2. Email: `admin@prosnab.tech`
3. Пароль: `***`
4. Система автоматически настроит (если Autodiscover работает)

#### Android:
1. Gmail/K-9 Mail → Добавить аккаунт → Другой
2. **IMAP**:
   - Сервер: `mail.prosnab.tech`
   - Порт: `993`
   - Безопасность: SSL/TLS
3. **SMTP**:
   - Сервер: `mail.prosnab.tech`
   - Порт: `587`
   - Безопасность: STARTTLS

**Проверка**: Отправить письмо с телефона

---

## 🎉 ГОТОВО!

После выполнения всех этапов у вас будет:

✅ **Веб-сайт**: https://prosnab.tech (без :3000, с SSL)  
✅ **Почтовый сервер**: mail.prosnab.tech (Mailcow)  
✅ **Почтовые ящики**: admin@prosnab.tech, sales@prosnab.tech, ...  
✅ **Защита**: SSL, Firewall, SPF, DKIM, DMARC  
✅ **Доступ**: Webmail, IMAP/SMTP, мобильные устройства

---

## 📊 ИТОГОВАЯ АРХИТЕКТУРА

```
┌─────────────────────────────────────────────┐
│          INTERNET (Client Requests)         │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────▼─────────┐
        │  DNS (ISPmanager) │
        │  prosnab.tech     │
        │  → 5.129.228.88   │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │   Firewall (UFW)  │
        │   Ports: 80, 443  │
        │          25, 587, │
        │          465, 993 │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────────────────┐
        │      Nginx (Reverse Proxy)    │
        │  ┌────────────┬──────────────┐ │
        │  │ :80/443    │  :80/443     │ │
        │  │ prosnab.   │  mail.       │ │
        │  │ tech       │  prosnab.    │ │
        │  └────┬───────┴──────┬───────┘ │
        └───────┼──────────────┼─────────┘
                │              │
        ┌───────▼───────┐  ┌──▼────────────┐
        │  PM2 deep-v0  │  │  Mailcow      │
        │  (Next.js)    │  │  (Docker)     │
        │  Port: 3000   │  │  Port: 8080   │
        │               │  │               │
        │  Frontend:    │  │  - Postfix    │
        │  - Main page  │  │  - Dovecot    │
        │  - Results    │  │  - Rspamd     │
        │  - Products   │  │  - SOGo       │
        └───────────────┘  │  - MySQL      │
                           └───────────────┘
```

---

## 🆘 ЕСЛИ ЧТО-ТО ПОШЛО НЕ ТАК

### Проблема 1: "Connection refused" на https://prosnab.tech

**Диагностика**:
```bash
systemctl status nginx
pm2 list
curl -I http://localhost:3000
```

**Решение**:
```bash
systemctl restart nginx
pm2 restart deep-v0
```

---

### Проблема 2: "502 Bad Gateway"

**Причина**: PM2 не запущен или упал

**Решение**:
```bash
pm2 list
pm2 restart deep-v0
pm2 logs deep-v0
```

---

### Проблема 3: Письма уходят в спам

**Диагностика**:
```bash
# Проверить SPF
dig TXT prosnab.tech +short

# Проверить DKIM
dig TXT default._domainkey.prosnab.tech +short

# Проверить PTR
dig +short -x 5.129.228.88
```

**Решение**:
1. Убедиться что все DNS-записи добавлены
2. Проверить PTR-запись (критично!)
3. Отправить письма на https://www.mail-tester.com/
4. Прогреть IP (отправить 20-30 писем вручную)

---

### Проблема 4: "SSL certificate verification failed"

**Решение**:
```bash
certbot renew --dry-run
systemctl reload nginx
```

---

### Проблема 5: Mailcow не запускается

**Диагностика**:
```bash
cd /opt/mailcow-dockerized
docker-compose ps
docker-compose logs --tail=50
```

**Решение**:
```bash
docker-compose down
docker-compose pull
docker-compose up -d
```

---

## 📞 КОНТАКТЫ И ДОКУМЕНТАЦИЯ

**Документация**:
- Mailcow: https://docs.mailcow.email/
- Nginx: https://nginx.org/ru/docs/
- Let's Encrypt: https://letsencrypt.org/ru/docs/

**Онлайн-инструменты**:
- SSL Test: https://www.ssllabs.com/ssltest/
- MX Toolbox: https://mxtoolbox.com/
- Mail Tester: https://www.mail-tester.com/
- DKIM Validator: https://dkimvalidator.com/

**Ваши файлы**:
- План: `/opt/deep-agg/docs/_artifacts/2025-10-12-infrastructure/INFRASTRUCTURE-PLAN.md`
- DNS: `/opt/deep-agg/docs/_artifacts/2025-10-12-infrastructure/DNS-SETUP-GUIDE.md`
- Скрипт: `/opt/deep-agg/scripts/setup-infrastructure.sh`

---

## ✅ ФИНАЛЬНЫЙ ЧЕКЛИСТ

**Перед началом**:
- [ ] Доступ к ISPmanager (DNS-управление)
- [ ] Root-доступ к серверу (SSH)
- [ ] Домен prosnab.tech направлен на 5.129.228.88 (уже сделано)

**DNS (ISPmanager)**:
- [ ] A-запись для mail
- [ ] MX-запись
- [ ] TXT SPF
- [ ] TXT DMARC
- [ ] CNAME autodiscover, autoconfig
- [ ] (позже) TXT DKIM

**Установка (SSH)**:
- [ ] Запустить `/opt/deep-agg/scripts/setup-infrastructure.sh`
- [ ] Согласиться на установку Mailcow (y)

**Mailcow**:
- [ ] Сменить пароль админа
- [ ] Создать почтовый ящик
- [ ] Скопировать DKIM в DNS

**Дополнительно**:
- [ ] Отправить тикет на PTR-запись
- [ ] Протестировать веб-сайт
- [ ] Протестировать почту
- [ ] Настроить на телефоне

---

**Время выполнения**: 2-3 часа (с учётом ожидания DNS/PTR)  
**Сложность**: Средняя (автоматизировано на 80%)  
**Стоимость**: $0 (всё бесплатно, open source)

**ГОТОВЫ НАЧАТЬ?** 🚀
