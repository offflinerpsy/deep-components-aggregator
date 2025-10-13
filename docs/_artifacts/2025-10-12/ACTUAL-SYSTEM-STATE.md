# АКТУАЛЬНОЕ СОСТОЯНИЕ СИСТЕМЫ (после зачистки legacy)

**Дата**: 12 октября 2025  
**Папка**: `/opt/deep-agg/`  
**Версия**: 3.2  

---

## ✅ 1. УДАЛЁННЫЙ LEGACY-КОД

**Удалены** (путаница исключена):

```bash
# Старые файлы со скрапингом ChipDip/Promelec/Electronshik
/opt/deep-agg/api/live-search.mjs
/opt/deep-agg/src/api/live-search.mjs
/opt/deep-agg/src/parsers/chipdip/
/opt/deep-agg/src/parsers/promelec/
/opt/deep-agg/src/parsers/electronshik/
/opt/deep-agg/data/raw-promelec/
/opt/deep-agg/scripts/worker-promelec.mjs
/opt/deep-agg/scripts/test-parsers.mjs
/opt/deep-agg/scripts/find-real-urls.mjs
/opt/deep-agg/scripts/test-import.mjs
```

**Причина удаления**: Эти файлы **НЕ используются** в `server.js`. Вся логика поиска реализована через `orchestrateProviderSearch` в `providerOrchestrator.mjs` с официальными API (Mouser/DigiKey/TME/Farnell).

---

## 🏗️ 2. АКТУАЛЬНАЯ АРХИТЕКТУРА

### Backend (Express.js)

**Локация**: `/opt/deep-agg/server.js` (1222 строки)  
**Порт**: 9201  
**База данных**: SQLite (`/opt/deep-agg/data/db/cache.db`)  

#### 2.1 Провайдеры (официальные API)

| Провайдер | API Тип | Ключи ENV | Статус |
|-----------|---------|-----------|--------|
| **Mouser** | REST API | `MOUSER_API_KEY` | ✅ Работает |
| **DigiKey** | OAuth2 | `DIGIKEY_CLIENT_ID`, `DIGIKEY_CLIENT_SECRET` | ✅ Работает |
| **TME** | HMAC API | `TME_TOKEN`, `TME_SECRET` | ✅ Работает (через WARP) |
| **Farnell** | REST API | `FARNELL_API_KEY`, `FARNELL_REGION` | ✅ Работает |

**Важно**: НЕТ скрапинга российских сайтов (ChipDip/Promelec). Все данные — через официальные API.

#### 2.2 Прокси (WARP для обхода гео-блокировок)

**Файл**: `/opt/deep-agg/src/bootstrap/proxy.mjs` (23 строки)  
**Логика**:

```javascript
import { setGlobalDispatcher, ProxyAgent } from 'undici';

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

if (proxy && /^https?:\/\//.test(proxy)) {
  setGlobalDispatcher(new ProxyAgent({
    uri: proxy,
    connectTimeout: 2500,
    headersTimeout: 10_000
  }));
  console.log(`🔒 Global HTTP proxy enabled: ${proxy}`);
} else {
  setGlobalDispatcher(new Agent({ ... }));
  console.log('📡 Direct connections (no HTTP_PROXY set)');
}
```

**Текущие настройки** (`.env`):

```bash
HTTP_PROXY=http://127.0.0.1:25345
HTTPS_PROXY=http://127.0.0.1:25345
NO_PROXY=localhost,127.0.0.1
```

**Как работает WARP**:

1. **Cloudflare WARP** запущен на сервере как SOCKS5 прокси (порт неизвестен, но доступен).
2. **HTTP→SOCKS мост** (Node.js скрипт) слушает на `127.0.0.1:25345` и транслирует HTTP→SOCKS5.
3. **Undici ProxyAgent** подключается к `127.0.0.1:25345` и все запросы идут через WARP.
4. **Результат**: API-запросы к TME/DigiKey/Farnell идут с IP Cloudflare (обход блокировок РФ).

**Исключения** (`NO_PROXY`):
- `localhost` — локальные запросы БЕЗ прокси
- `127.0.0.1` — локальные запросы БЕЗ прокси

**Критичность**: Без WARP **TME** возвращает `E_ACTION_FORBIDDEN` (гео-блокировка).

#### 2.3 Поисковый оркестратор

**Файл**: `/opt/deep-agg/src/search/providerOrchestrator.mjs` (450+ строк)  
**Функция**: `orchestrateProviderSearch(query, keys)`

**Алгоритм**:

1. **Нормализация запроса** (RU→EN) — см. раздел 3.
2. **Параллельные запросы** к провайдерам (макс. 4 одновременно):
   - Mouser: `mouserSearchByKeyword()`
   - DigiKey: `digikeySearch()`
   - TME: `tmeSearchProducts()` → `tmeGetProduct()` (2 шага!)
   - Farnell: `farnellByKeyword()`
3. **Timeout**: 9.5 сек на провайдера (AbortController).
4. **Дедупликация**: Убирает дубли по `source::mpn`.
5. **Ранжирование**:
   - Точное совпадение MPN → выше
   - Частичное совпадение (title/manufacturer) → средний приоритет
   - Наличие stock/цены → бонус к рангу
6. **Возврат**: до 60 результатов (отранжированных).

**Метрики** (Prometheus):
- `api_calls_total{source="mouser", status="success"}` — счётчик вызовов
- `api_call_duration_seconds{source="digikey"}` — латентность

#### 2.4 Кэш (SQLite FTS5)

**Файл**: `/opt/deep-agg/src/db/sql.mjs`  
**Таблицы**:
- `products` — кэш товаров (MPN, title, manufacturer, цены, склад)
- `products_fts` — FTS5 индекс для полнотекстового поиска

**TTL**: 7 дней (автоматическая чистка через SQLite trigger).

**Логика** (в `server.js`):

```javascript
// GET /api/search
const cached = readCachedSearch(db, normalizedQuery);
if (cached.length > 0) {
  return res.json({ rows: cached, meta: { source: 'cache' } });
}

// Если кэш пуст → запрос к провайдерам
const aggregated = await orchestrateProviderSearch(q, keys);
cacheSearch(db, aggregated.rows); // Сохранить в кэш
return res.json({ rows: aggregated.rows, meta: { source: 'live' } });
```

**Важно**: Кэш **НЕ fallback**, а **first-class citizen**. Если есть результаты в кэше → сразу отдаём, без запросов к API.

#### 2.5 Конвертация валют

**Файл**: `/opt/deep-agg/src/currency/cbr.mjs`  
**Источник**: ЦБ РФ (https://www.cbr-xml-daily.ru/daily_json.js)

**Функция**: `toRUB(amount, currency)`

**Пример**:
```javascript
toRUB(10, 'USD') // → 811.90₽ (курс: 81.19)
toRUB(5, 'EUR')  // → 470.25₽ (курс: 94.05)
```

**Обновление**: Раз в сутки (автоматически при старте сервера).

---

## 🔍 3. НОРМАЛИЗАЦИЯ РУССКОГО ЯЗЫКА

**Файл**: `/opt/deep-agg/src/search/normalizeQuery.mjs` (170 строк)

### 3.1 Алгоритм

**Вход**: `"транзистор LM317"` (русский + латиница)  
**Выход**:

```json
{
  "original": "транзистор LM317",
  "hasCyrillic": true,
  "transliterated": "tranzistor LM317",
  "normalized": "transistor LM317",
  "allQueries": ["transistor LM317", "chip LM317", "ic LM317"],
  "tokens": ["transistor", "lm317"]
}
```

### 3.2 Шаги

1. **Определить кириллицу**: `/[А-Яа-яЁё]/` (регулярка)
2. **Транслитерация** (GOST 7.79 System B):
   ```
   а→a, б→b, в→v, т→t, р→r, н→n, з→z, и→i, с→s, о→o
   "транзистор" → "tranzistor"
   ```
3. **Синонимы** (17 пар):
   ```javascript
   {
     'транзистор': ['transistor'],
     'tranzistor': ['transistor'],
     'резистор': ['resistor'],
     'конденсатор': ['capacitor'],
     'микросхема': ['chip', 'ic'],
     'светодиод': ['led'],
     // ... ещё 11 пар
   }
   ```
4. **Нормализация**: Если есть синоним — используем английское слово, иначе транслит.

### 3.3 Где применяется

| Эндпоинт | Нормализация | Примечания |
|----------|--------------|------------|
| `/api/search` | ✅ **ДА** | Запрос сначала нормализуется, потом идёт в FTS5 кэш |
| `/api/live/search` | ✅ **ДА** | SSE-поиск использует `orchestrateProviderSearch` (внутри нормализация) |
| `/api/vitrine/list` | ✅ **ДА** | Витрина использует FTS5 кэш (нормализация в SQL-запросе) |
| `/api/product` | ❌ **НЕТ** | Запрос по точному MPN (не нужна нормализация) |

### 3.4 Пример работы

**Запрос**: `"резистор 10к"`

**Шаг 1** — Транслит:  
`"rezistor 10k"`

**Шаг 2** — Синоним:  
`"resistor 10k"` (из словаря `резистор → resistor`)

**Шаг 3** — Провайдеры получают:  
```
Mouser API: keyword="resistor 10k"
DigiKey API: keyword="resistor 10k"
TME API: SearchParameter="resistor 10k"
Farnell API: term="resistor 10k"
```

**Результат**: Провайдеры возвращают резисторы (потому что поиск на английском).

---

## 🌐 4. FRONTEND (Next.js)

**Локация**: `/opt/deep-agg/v0-components-aggregator-page/`  
**Порт**: 3000  
**Дизайн**: v0.dev (glass morphism, responsive)

### 4.1 Rewrites (API Proxy)

**Файл**: `next.config.mjs`

```javascript
async rewrites() {
  return {
    beforeFiles: [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:9201/api/:path*',
      },
      {
        source: '/auth/:path*',
        destination: 'http://127.0.0.1:9201/auth/:path*',
      },
    ],
  }
}
```

**Как работает**:

1. Пользователь открывает `http://localhost:3000/`
2. Фронт делает запрос: `fetch('/api/search?q=LM317')`
3. Next.js **автоматически** перенаправляет на `http://127.0.0.1:9201/api/search?q=LM317`
4. Бэкенд возвращает JSON
5. Фронт рендерит результаты

**Безопасность**: CORS не нужен (запросы идут с того же origin), API-ключи не попадают в браузер.

### 4.2 Страницы

#### Главная (`/`)

**Файл**: `app/page.tsx`  
**Логика**: Отображает **hardcoded** список из 28 компонентов (ПРОБЛЕМА — не использует `/api/vitrine/list`).

**Компоненты**:
- Поисковая строка → перенаправляет на `/search?q=...`
- Сетка компонентов (4 колонки, responsive)
- Диагностика (DiagChip) — показывает статус бэкенда

#### Поиск (`/search`)

**Файл**: `app/search/page.tsx`  
**Логика**:

1. Читает `?q=...` из URL
2. Открывает SSE: `new EventSource('/api/live/search?q=...')`
3. Слушает события:
   - `search:start` → "Поиск начат"
   - `provider:partial` → Статус провайдера (Mouser: 10 результатов)
   - `provider:error` → Ошибка провайдера
   - `result` → Финальные результаты
4. Рендерит карточки товаров

**SSE события** (сервер → клиент):

```
event: search:start
data: {"query":"LM317","timestamp":1696000000}

event: provider:partial
data: {"provider":"mouser","count":25,"elapsed":1234}

event: provider:partial
data: {"provider":"digikey","count":15,"elapsed":2345}

event: result
data: {"rows":[...],"meta":{...}}
```

**Важно**: Фронт использует **типизированные события** (не `message`), как требует WHATWG SSE Spec.

#### Карточка товара (`/product/[mpn]`)

**Файл**: `app/product/[mpn]/page.tsx`  
**Логика**:

1. Запрос: `fetch('/api/product?mpn=LM317T')`
2. Бэкенд:
   - Ищет в кэше
   - Если нет → запрос к 4 провайдерам
   - Мержит данные (`mergeProductData`)
3. Фронт рендерит:
   - Спецификации (таблица)
   - Офферы (цена/склад/регион)
   - Даташиты (ссылки)
   - Производитель/Package/Packaging

---

## 🔒 5. БЕЗОПАСНОСТЬ И НЮАНСЫ

### 5.1 Секреты

**Файл**: `.env` (НЕ коммитится в git)

```bash
MOUSER_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DIGIKEY_CLIENT_ID=xxxxxxxx
DIGIKEY_CLIENT_SECRET=xxxxxxxx
TME_TOKEN=xxxxxxxx
TME_SECRET=xxxxxxxx
FARNELL_API_KEY=xxxxxxxx
FARNELL_REGION=uk.farnell.com

HTTP_PROXY=http://127.0.0.1:25345
HTTPS_PROXY=http://127.0.0.1:25345
NO_PROXY=localhost,127.0.0.1

SESSION_SECRET=xxxxxxxx
```

**Правила**:
- Секреты **ТОЛЬКО** через ENV (не в коде)
- `.env` в `.gitignore`
- `.env.example` — шаблон без реальных ключей

### 5.2 WARP Прокси (детали)

**Проблема**: TME блокирует запросы из России (403 Forbidden).  
**Решение**: Все HTTP-запросы идут через Cloudflare WARP (IP из EU/US).

**Схема**:

```
Backend (Node.js)
  → Undici ProxyAgent (HTTP_PROXY=127.0.0.1:25345)
    → HTTP→SOCKS мост (Node.js, порт 25345)
      → Cloudflare WARP (SOCKS5)
        → TME API (Польша) ✅
```

**Критичные моменты**:

1. **NO_PROXY**: Localhost НЕ должен идти через прокси (иначе зацикливание).
2. **Timeout**: ProxyAgent имеет `connectTimeout: 2500ms` (быстрый фейл, если WARP упал).
3. **Fallback**: Если `HTTP_PROXY` не задан → прямые подключения (DigiKey/Mouser работают без прокси).

**Проверка работоспособности**:

```bash
# 1. WARP активен?
systemctl status warp-svc

# 2. HTTP→SOCKS мост слушает?
lsof -i :25345

# 3. Dispatcher использует прокси?
grep "Global HTTP proxy enabled" /var/log/deep-agg.log
```

### 5.3 Ограничения провайдеров

| Провайдер | Rate Limit | Ограничения |
|-----------|------------|-------------|
| Mouser | 1000 req/день | Лимит на API-ключ |
| DigiKey | 1000 req/час | OAuth2 токен expires раз в 30 мин |
| TME | Нет официальных лимитов | Требует EU IP (без WARP → 403) |
| Farnell | 500 req/час | Региональная блокировка (нужен UK IP) |

**Стратегия**:
- Кэш (7 дней) снижает нагрузку
- Timeout (9.5 сек) → быстрый фейл, если провайдер лагает
- Параллельные запросы (4 одновременно) → общее время ~10 сек вместо 40

### 5.4 SSE Anti-Buffering

**Проблема**: Nginx/реверс-прокси буферизуют SSE → события приходят пачками.  
**Решение**: Заголовок `X-Accel-Buffering: no` в SSE-ответе.

**Код** (server.js):

```javascript
app.get('/api/live/search', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // ← Критично!
  // ...
});
```

**Heartbeat**: Комментарий `: ping\n\n` каждые 15 сек → держит соединение живым.

---

## 📊 6. МЕТРИКИ И МОНИТОРИНГ

**Файл**: `metrics/registry.js`  
**Эндпоинт**: `GET /metrics` (Prometheus format)

**Примеры метрик**:

```
# Поиск
search_requests_total 1234
search_errors_total{reason="timeout"} 5
search_latency_seconds{quantile="0.99"} 2.345

# Провайдеры
api_calls_total{source="mouser",status="success"} 567
api_call_duration_seconds{source="digikey"} 1.234

# Кэш
cache_operations_total{operation="hit"} 890
cache_operations_total{operation="miss"} 123
```

**Алерты** (TODO):
- `search_errors_total > 10` → уведомление в Telegram
- `api_call_duration_seconds > 5` → провайдер тормозит

---

## 🎯 7. ПРОБЛЕМЫ И TODO

### Проблемы

1. **Главная страница** (`/`) использует hardcoded список → **нужно**: `fetch('/api/vitrine/list?limit=28')`
2. **TME Pricing** — иногда отсутствует (fallback на Search API без цен)
3. **Нет пагинации** на `/search` — показывает макс. 60 результатов

### TODO

- [ ] Подключить `/api/vitrine/list` на главной
- [ ] Пагинация на `/search` (offset/limit)
- [ ] Фильтры (по производителю, package, stock)
- [ ] Сортировка (по цене, наличию)
- [ ] Админ-панель (управление кэшем, ценами, наценками)
- [ ] E2E тесты (Playwright)

---

## 🚀 8. ДЕПЛОЙ (production)

**Сервис**: systemd unit `deep-agg.service`

**Файл**: `/etc/systemd/system/deep-agg.service`

```ini
[Unit]
Description=Deep Components Aggregator
After=network.target warp-svc.service http-to-socks-proxy.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/deep-agg
EnvironmentFile=/etc/deep-agg.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Команды**:

```bash
# Старт
sudo systemctl start deep-agg

# Логи
journalctl -u deep-agg -f

# Проверка статуса
curl http://127.0.0.1:9201/api/health
```

---

## ✅ 9. VERIFICATION CHECKLIST

**Перед коммитом/деплоем**:

- [ ] Legacy-код удалён (проверено: `find /opt/deep-agg -name "*chipdip*"` → пусто)
- [ ] `HTTP_PROXY` задан и WARP активен
- [ ] Все 4 провайдера возвращают результаты (`/api/search?q=LM317`)
- [ ] SSE работает (`/api/live/search?q=LM317` → события приходят по одному, не пачками)
- [ ] Нормализация работает (`"транзистор"` → находит транзисторы)
- [ ] Rewrites настроены (фронт `:3000/api/*` → бэкенд `:9201/api/*`)
- [ ] Секреты не в коде (только в `.env`)
- [ ] Метрики доступны (`/metrics`)

---

**Последнее обновление**: 12 октября 2025, 23:45 UTC  
**Автор**: GitHub Copilot  
**Версия документа**: 1.0
