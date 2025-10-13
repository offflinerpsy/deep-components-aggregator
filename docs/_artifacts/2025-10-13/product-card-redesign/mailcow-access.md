# Mailcow Access Cheat Sheet (2025-10-13)

## Accounts
| Mailbox | Default password |
| --- | --- |
| alex@prosnab.tech | 123asd |
| adp@prosnab.tech | 123asd |
| zapros@prosnab.tech | 123asd |

> Рекомендовано сменить пароль сразу после первого входа (16+ символов, буквы в разных регистрах, цифры, спецсимволы).

## Webmail (browser)
- URL: https://mail.prosnab.tech/
- Нажать кнопку "Webmail" (Roundcube)
- Логин: полный адрес ящика (например, alex@prosnab.tech)
- Пароль: из таблицы выше

## Admin (Mailcow UI)
- URL: https://mail.prosnab.tech/admin/
- Использовать админский аккаунт Mailcow
- Здесь можно сбросить пароль, задать квоты, включить переадресацию и т. д.

## Настройки для почтовых клиентов (телефон, планшет, ПК)
### IMAP (получение)
- Сервер: mail.prosnab.tech
- Порт: 993
- Шифрование: SSL/TLS
- Аутентификация: обычный пароль
- Логин: полный e-mail

### SMTP (отправка)
- Сервер: mail.prosnab.tech
- Порт: 587
- Шифрование: STARTTLS (при необходимости можно брать 465 + SSL/TLS)
- Аутентификация: обязательна, логин = полный e-mail, пароль как для IMAP

### Мини-шаги подключения
1. В клиенте выбрать тип аккаунта IMAP.
2. Ввести полный адрес (пример: alex@prosnab.tech) и пароль 123asd.
3. Прописать серверы и порты, как указано выше.
4. Убедиться, что включено шифрование (SSL/TLS или STARTTLS).
5. После подключения проверить отправку и прием письма (например, на offflinerpsy@gmail.com).

## Telegram-ready текст
```
Mailcow / prosnab.tech
Webmail: https://mail.prosnab.tech/
Admin: https://mail.prosnab.tech/admin/

Ящики (пароль 123asd, попросите сменить):
- alex@prosnab.tech
- adp@prosnab.tech
- zapros@prosnab.tech

IMAP (прием): mail.prosnab.tech, порт 993, SSL/TLS, логин = полный e-mail.
SMTP (отправка): mail.prosnab.tech, порт 587, STARTTLS, авторизация обязательна.
```
