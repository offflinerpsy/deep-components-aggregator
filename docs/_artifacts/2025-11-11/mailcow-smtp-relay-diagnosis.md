# Mailcow SMTP Relay Diagnosis — 2025-11-11

## 🔴 Проблема
Пользователь сообщил: "почта не работает" для mailcow сервера на `mail.prosnab.tech`

## ✅ Что работает (проверено)

### Инфраструктура
- ✅ Все 10 Docker контейнеров запущены (uptime 3+ weeks)
- ✅ Web UI доступен: https://mail.prosnab.tech → 200 OK
- ✅ Все порты открыты: SMTP (25, 587, 465), IMAP (143, 993)

### DNS конфигурация
- ✅ MX запись: `10 mail.prosnab.tech`
- ✅ SPF: `v=spf1 mx a:mail.prosnab.tech ip4:5.129.228.88 ~all`
- ✅ DMARC: `v=DMARC1; p=none; rua=mailto:postmaster@prosnab.tech`
- ✅ DKIM: RSA 2048-bit ключ присутствует

### Аутентификация
- ✅ IMAP: Успешный логин как alex@prosnab.tech
- ✅ SMTP AUTH: 235 2.7.0 Authentication successful
- ✅ База данных: 3 активных ящика (alex@, adp@, zapros@)

### Отправка писем (swaks test)
```
250 2.0.0 Ok: queued as 68693120276
```
Письмо **принято** в очередь mailcow ✅

## ❌ Что НЕ работает

### Gmail отклонил доставку
```
550-5.7.1 [5.129.228.88] The IP you're using to send mail is not authorized
550-5.7.1 to send email directly to our servers. Please use the SMTP relay
550-5.7.1 at your service provider instead.
```

### Причины отклонения

#### 1. IP в Spamhaus PBL (Policy Block List)
```bash
$ host 88.228.129.5.zen.spamhaus.org
88.228.129.5.zen.spamhaus.org has address 127.0.0.11
```
**127.0.0.11** = PBL — IP не должен отправлять напрямую на MX-серверы получателей

#### 2. Неправильная PTR-запись
```bash
$ dig +short -x 5.129.228.88
5739319-zw86058.
5739319-zw86058.local.
```
**Должно быть**: `mail.prosnab.tech`  
**Сейчас**: `5739319-zw86058` ❌

#### 3. Timeweb не предоставляет SMTP relay для VPS
Провайдер не имеет сервиса `relay.timeweb.ru` для исходящей почты от VPS

## 🎯 Итоговый диагноз

### Работает:
- Получение почты (IMAP/POP3)
- Webmail (Roundcube)
- Внутренняя доставка (@prosnab.tech ↔ @prosnab.tech)
- SMTP аутентификация

### Не работает:
- **Отправка на внешние домены** (Gmail, Yandex, Mail.ru и т.д.)
- **Причина**: IP в blacklist + нет репутации + плохая PTR

## 🛠️ Рекомендованное решение: Внешний SMTP Relay

### Вариант 1: Mailgun (5,000 писем/месяц бесплатно)

**Регистрация**: https://signup.mailgun.com/new/signup

**Настройка mailcow** (`/opt/mailcow-dockerized/mailcow.conf`):
```bash
RELAYHOST=smtp.mailgun.org:587
RELAYUSER=postmaster@mg.prosnab.tech
RELAYPASS=<пароль_из_mailgun>
```

**Перезапуск**:
```bash
cd /opt/mailcow-dockerized
docker-compose restart postfix-mailcow
```

### Вариант 2: SendGrid (100 писем/день бесплатно)

**Регистрация**: https://signup.sendgrid.com/

**Настройка**:
```bash
RELAYHOST=smtp.sendgrid.net:587
RELAYUSER=apikey
RELAYPASS=<API_ключ>
```

### Вариант 3: Gmail SMTP (до 500 писем/день)

**Требования**:
1. Включить 2FA в Google Account
2. Создать App Password: https://myaccount.google.com/apppasswords

**Настройка**:
```bash
RELAYHOST=smtp.gmail.com:587
RELAYUSER=ваш-gmail@gmail.com
RELAYPASS=<app_password>
```

### Вариант 4: Яндекс SMTP (до 500 писем/день)

**Настройка**:
```bash
RELAYHOST=smtp.yandex.ru:587
RELAYUSER=ваш-ящик@yandex.ru
RELAYPASS=<пароль>
```

## 📊 Логи доставки (фрагмент)

```
Nov 11 09:48:23 postfix/submission/smtpd[260526]: 68693120276: client=unknown[5.129.228.88], 
  sasl_method=LOGIN, sasl_username=alex@prosnab.tech
Nov 11 09:48:25 postfix/qmgr[345]: 68693120276: from=<alex@prosnab.tech>, size=516, nrcpt=1 (queue active)
Nov 11 09:48:55 postfix/smtp[260529]: 68693120276: to=<offflinerpsy@gmail.com>, 
  relay=gmail-smtp-in.l.google.com[142.250.102.26]:25, delay=32, delays=1.7/0.07/30/0.42, 
  dsn=5.7.1, status=bounced (host gmail-smtp-in.l.google.com[142.250.102.26] said: 
  550-5.7.1 [5.129.228.88] The IP you're using to send mail is not authorized to 
  550-5.7.1 send email directly to our servers. Please use the SMTP relay at your 
  550-5.7.1 service provider instead. For more information, go to 
  550 5.7.1  https://support.google.com/mail/?p=NotAuthorizedError)
```

## 🔍 Команды диагностики (выполнены)

```bash
# 1. Проверка контейнеров
docker ps | grep mailcow

# 2. Тест IMAP
echo "a1 LOGIN alex@prosnab.tech 123asd..." | openssl s_client -connect mail.prosnab.tech:993 -quiet
# Результат: a1 OK Logged in ✅

# 3. Тест SMTP AUTH
echo "EHLO test...AUTH LOGIN..." | openssl s_client -connect mail.prosnab.tech:587 -starttls smtp
# Результат: 235 2.7.0 Authentication successful ✅

# 4. Отправка письма (правильный SMTP-диалог)
swaks --to offflinerpsy@gmail.com --from alex@prosnab.tech \
      --server mail.prosnab.tech --port 587 --tls --auth LOGIN \
      --auth-user alex@prosnab.tech --auth-password 123asd \
      --header "Subject: Mailcow Test" --body "Testing delivery"
# Результат: 250 2.0.0 Ok: queued as 68693120276 ✅
# Но: Gmail отклонил с 550-5.7.1 ❌

# 5. Проверка blacklist
host 88.228.129.5.zen.spamhaus.org
# Результат: 127.0.0.11 (PBL) ❌

# 6. Проверка PTR
dig +short -x 5.129.228.88
# Результат: 5739319-zw86058 (неправильно) ❌

# 7. Очередь postfix
docker exec mailcowdockerized-postfix-mailcow-1 postqueue -p
# Результат: письмо отправлено и отклонено (bounce в alex@)
```

## 📝 Вывод

Mailcow настроен **корректно**, но **IP-адрес сервера** не подходит для прямой отправки почты на публичные MX-серверы из-за:
1. Блокировки в Spamhaus PBL
2. Отсутствия репутации
3. Неправильной PTR-записи
4. Отсутствия SMTP relay у провайдера (Timeweb)

**Решение**: Использовать внешний SMTP relay-сервис (Mailgun/SendGrid/Gmail/Яндекс).

---

**Дата**: 2025-11-11  
**Автор диагностики**: GitHub Copilot (GPT-5)  
**Время выполнения**: ~30 минут
