# Как создать Production DigiKey App

## Текущая ситуация
У вас есть **Sandbox App** с sandbox.ProductInformation V4.
- Sandbox работает только с `sandbox-api.digikey.com`
- Sandbox имеет ограниченную тестовую базу данных
- Для реальных данных нужен **Production App**

## Создание Production App

### 1. Создайте новое приложение

На https://developer.digikey.com/:

1. Перейдите в **My Apps** (где вы сейчас)
2. Нажмите **"+ Create Production App"** или **"Create New Application"**
3. Заполните форму:
   - **App Name**: `Deep Components Aggregator` (или любое другое)
   - **Description**: `Electronic components search aggregator with multi-supplier integration`
   - **Website** (опционально): URL вашего сервиса
   - **OAuth Redirect URI**: `https://deep-agg.offlinerspy.workers.dev/auth/digikey/callback`
     (или `http://localhost:9201/auth/callback` если будете тестировать локально)

### 2. Выберите API Products

В секции **API Products** выберите:
- ☑️ **Product Information** (V4) — это главное!
- (опционально) Order Support, BarCode Scanning если нужны

### 3. Дождитесь одобрения

- DigiKey проверяет Production App вручную
- Обычно одобряют за **1-2 рабочих дня**
- Вы получите email когда одобрят

### 4. После одобрения

1. Перейдите в новое приложение
2. Скопируйте **Client ID** и **Client Secret**
3. Обновите на сервере:

```bash
ssh root@5.129.228.88
nano /opt/deep-agg/.env

# Замените:
DIGIKEY_CLIENT_ID=<новый_production_client_id>
DIGIKEY_CLIENT_SECRET=<новый_production_secret>
DIGIKEY_API_BASE=https://api.digikey.com

# Перезапустите:
pkill -f 'node server.js'
cd /opt/deep-agg
nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null &
```

## Временное решение: Sandbox

Пока ждём одобрения Production App, можем использовать Sandbox:

**Плюсы**:
- Работает прямо сейчас
- Те же API endpoints
- Можно тестировать интеграцию

**Минусы**:
- Ограниченная база (несколько тысяч товаров)
- Тестовые данные (может быть неточная спецификация)
- Неполные результаты поиска

Но для проверки что **вся инфраструктура работает** (WARP, proxy, код) — Sandbox идеален.

## Что делать сейчас?

### Вариант A: Создать Production App и подождать одобрения
Рекомендую! Тогда получите полную базу DigiKey.

### Вариант B: Использовать Sandbox временно
Я могу переключить на Sandbox **прямо сейчас**, чтобы проверить что всё работает технически.
После одобрения Production App — просто обновим credentials.

**Что предпочитаете?**
1. Создать Production App (мне нужны новые Client ID/Secret после одобрения)
2. Переключиться на Sandbox сейчас (я задеплою за 2 минуты)
