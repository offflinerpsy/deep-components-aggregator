# Digi-Key Credentials Issue

## Проблема
Оба окружения (production и sandbox) возвращают **403 Forbidden**:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.3",
  "title": "Forbidden",
  "status": 403,
  "detail": "The supplied client credentials are not authorized to perform this request."
}
```

## Что это значит
Ваше приложение (`mt0wx2AcFbqaGgEcKJkXAgEWmQ769JcOTggr0TxynL2pP8cm`) **не подключено к Product Information API v4**.

## Решение

### 1. Проверьте на https://developer.digikey.com/

1. Войдите в аккаунт
2. Перейдите в **My Apps** → выберите ваше приложение
3. Проверьте секцию **API Products** или **Subscriptions**
4. Должен быть активен **Product Information v4**

### 2. Если API v4 не подключен:

**Вариант A: Добавить к текущему приложению**
- Нажмите **Add API** или **Request Access**
- Выберите **Product Information v4**
- Заполните форму (обычно одобряют за 1-2 дня)

**Вариант B: Создать новое приложение**
- **Recommended** → My Apps → **Create New Application**
- Название: любое (например, "Aggregator v2")
- Description: "Electronic components search aggregator"
- Product Information API v4: **Enable**
- После создания скопируйте новые Client ID и Client Secret

### 3. Обновите credentials:

После получения правильных credentials:

```bash
# На сервере 5.129.228.88
nano /opt/deep-agg/.env

# Измените:
DIGIKEY_CLIENT_ID=<новый_client_id>
DIGIKEY_CLIENT_SECRET=<новый_secret>
DIGIKEY_API_BASE=https://api.digikey.com

# Перезапустите:
pkill -f 'node server.js'
cd /opt/deep-agg
nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null &
```

## Проверка после обновления

```bash
# Локально запустите:
python scripts/test_digikey_direct.py
```

Должно вернуться 200 + access_token (а не 403).

## Важно
Без активного Product Information v4 API ни один endpoint не будет работать (ни search, ни productdetails).

Токен получается успешно (200), но любой запрос к `/products/v4/*` возвращает 403.
