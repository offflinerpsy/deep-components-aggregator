# Блок 6: Провайдеры и Сетевой Доступ (WARP) — Артефакты

## WARP CLI Статус

**Версия**: `warp-cli 2025.7.176.0`  
**Статус**: ✅ **Connected**

```bash
$ warp-cli status
Status update: Connected
```

---

## Доступность API провайдеров через WARP

### 1. DigiKey OAuth Endpoint

**Endpoint**: `https://api.digikey.com/oauth/token`  
**Статус**: ✅ **302 Found** (редирект на авторизацию)

```http
HTTP/1.1 302 Found
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Connection: close
Content-Length: 0
Content-Type: text/html; charset=utf-8
```

**Вывод**: Endpoint доступен, редирект на OAuth форму — ожидаемое поведение.

---

### 2. Mouser API Search Endpoint

**Endpoint**: `https://api.mouser.com/api/v1/search/partnumber`  
**Статус**: ✅ **404 Not Found** (ожидаемо без параметров)

```http
HTTP/2 404 
x-opnet-transaction-trace: 542adfad-e319-49bc-8b0b-3e3262fef020-32892-528370
x-aspnet-version: 4.0.30319
content-type: application/json; charset=utf-8
strict-transport-security: max-age=31622400
x-frame-options: sameorigin
content-length: 120
```

**Вывод**: API доступен, 404 из-за отсутствия query params — нормально для HEAD-запроса.

---

### 3. TME OAuth Endpoint

**Endpoint**: `https://api.tme.eu/oauth2/token`  
**Статус**: ⚠️ **403 Forbidden** (Cloudflare защита)

```http
HTTP/2 403 
date: Wed, 08 Oct 2025 17:59:13 GMT
content-type: application/json
cf-ray: 98b787e77ebd0e35-AMS
cache-control: no-cache
cf-cache-status: DYNAMIC
set-cookie: __cf_bm=Y97r96pvRX922JMWQLge5Gma83k8zpO_se.gX9TNv04-...
```

**Вывод**: Cloudflare блокирует HEAD-запрос без User-Agent/заголовков. Реальные POST с токенами должны работать (проверить через `adapters/providers/tme.js` с полным контекстом).

---

### 4. Farnell API Search Endpoint

**Endpoint**: `https://api.farnell.com/api/v2/search`  
**Статус**: ❌ **596 Service Not Found** (Mashery Proxy ошибка)

```http
HTTP/2 596 
date: Wed, 08 Oct 2025 17:59:16 GMT
content-type: text/xml
content-length: 30
x-mashery-error-code: ERR_596_SERVICE_NOT_FOUND
server: Mashery Proxy
```

**Вывод**: Farnell API требует специфичный путь/ключ. Mashery (их API gateway) не нашёл ресурс. Проверить в `adapters/providers/farnell.js` правильный endpoint.

---

## Сводка по доступности провайдеров

| Провайдер | Endpoint проверен | HTTP код | Доступен через WARP | Примечание |
|-----------|-------------------|----------|---------------------|------------|
| **DigiKey** | `/oauth/token` | 302 | ✅ Да | Редирект на OAuth форму |
| **Mouser** | `/api/v1/search/partnumber` | 404 | ✅ Да | Требует query params |
| **TME** | `/oauth2/token` | 403 | ⚠️ Частично | Cloudflare bot protection |
| **Farnell** | `/api/v2/search` | 596 | ❌ Неверный URL | Mashery ошибка, проверить endpoint в коде |

---

## E2E Gap для Блока 6

⚠️ **TME**: Cloudflare блокирует простые curl запросы — нужно проверить:
- Работает ли `adapters/providers/tme.js` с реальными токенами
- Есть ли обход через WARP+User-Agent
- Требуется ли дополнительный Cloudflare bypass

❌ **Farnell**: Mashery ошибка 596 — неверный endpoint в тесте:
- Проверить в `adapters/providers/farnell.js` реальный URL
- Обновить E2E тест с корректным путём

---

## Команды для повтора проверки

```bash
# WARP статус
warp-cli status

# Провайдеры (HEAD requests)
curl -I -m 5 https://api.digikey.com/oauth/token
curl -I -m 5 https://api.mouser.com/api/v1/search/partnumber
curl -I -m 5 https://api.tme.eu/oauth2/token
curl -I -m 5 https://api.farnell.com/api/v2/search
```

---

**Артефакты сохранены**:
- `docs/_artifacts/2025-10-08/e2e/block-6-providers-warp.md` — этот отчёт
