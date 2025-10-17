## Внешний почтовый релей: Mailgun (EU) и Brevo (Sendinblue)

Цель: гарантированная доставляемость писем (Gmail/Yandex) через внешний провайдер, минуя ограничения PTR/rDNS.

Поддержаны провайдеры:
- Mailgun HTTP API (EU) — платный после фри-лимита
- Brevo (Sendinblue) — есть бесплатный тариф
- Mailjet — есть бесплатный тариф
- Elastic Email — дешёвый тариф/бесплатный лимит

Переключение через переменную окружения MAIL_PROVIDER:
- MAIL_PROVIDER=mailgun_api
- MAIL_PROVIDER=brevo_api
- MAIL_PROVIDER=mailjet_api
- MAIL_PROVIDER=elasticemail_api

### Переменные окружения

- MAIL_PROVIDER=mailgun_api
- MAIL_FROM=«Prosnab <no-reply@prosnab.tech>»
- MG_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- MG_DOMAIN=mg.prosnab.tech (или подтверждённый домен/поддомен в Mailgun)
- MG_BASE_URL=https://api.eu.mailgun.net (по умолчанию EU)

Для Brevo (Sendinblue):
- MAIL_PROVIDER=brevo_api
- MAIL_FROM=«Prosnab <no-reply@prosnab.tech>»
- BREVO_API_KEY=xkeysib-… (или SENDINBLUE_API_KEY)
- BREVO_BASE_URL=https://api.brevo.com (по умолчанию)

Для Mailjet:
- MAIL_PROVIDER=mailjet_api
- MJ_API_KEY=…
- MJ_API_SECRET=…
- MJ_BASE_URL=https://api.mailjet.com (по умолчанию)

Для Elastic Email:
- MAIL_PROVIDER=elasticemail_api
- EE_API_KEY=… (или ELASTICEMAIL_API_KEY)
- EE_BASE_URL=https://api.elasticemail.com (по умолчанию)

SMTP-путь остаётся по умолчанию (MAIL_PROVIDER пуст). Для SMTP используются переменные SMTP_HOST/PORT/USER/PASS/SMTP_FROM.

### Настройка Mailgun

1) Создать домен в Mailgun EU (рекомендуется поддомен mg.prosnab.tech)
2) Прописать DNS записи из кабинета Mailgun:
   - SPF: TXT @ → v=spf1 include:mailgun.org ~all
   - DKIM: TXT krs._domainkey.mg … (2 записи)
   - Tracking/CNAME: email.mg → mailgun.org
3) Подтвердить домен (status: Verified)
4) Создать API Key (Private API Key)

### Переключение приложения

1) Экспортировать переменные окружения (в .env локально или в менеджере секретов на проде):

   MAIL_PROVIDER=mailgun_api
   MAIL_FROM="Prosnab <no-reply@prosnab.tech>"
   MG_API_KEY=key-…
   MG_DOMAIN=mg.prosnab.tech
   MG_BASE_URL=https://api.eu.mailgun.net

2) Перезапустить приложение/PM2.

3) Проверка (Mailgun):
   - npm run mail:relay:test -- offflinerpsy@gmail.com
   - npm run mail:relay:test -- alexmohor@gmail.com
   Артефакты: docs/_artifacts/<date>/mail-relay-test-*.json

4) Проверка (Brevo):
   - установить MAIL_PROVIDER=brevo_api и BREVO_API_KEY
   - npm run mail:relay:test -- offflinerpsy@gmail.com
   - Артефакты: docs/_artifacts/<date>/mail-relay-test-*.json

5) Проверка (Mailjet/Elastic Email):
   - MAIL_PROVIDER=mailjet_api и задать ключи, затем mail:relay:test
   - MAIL_PROVIDER=elasticemail_api и задать ключ, затем mail:relay:test

### Откат

Чтобы вернуться к SMTP, очистить MAIL_PROVIDER или установить значение, отличное от mailgun_api. Остальные SMTP переменные остаются без изменений.

### Примечания по безопасности

- Секреты не коммитим. Хранить MG_API_KEY в переменных окружения.
- Для Brevo — BREVO_API_KEY хранить только в окружении.
- Отправитель MAIL_FROM должен совпадать с доменом, подтверждённым в Mailgun (SPF/DKIM alignment).
- После подтверждения стабильной доставки — можно вернуть DMARC на p=quarantine/reject.
