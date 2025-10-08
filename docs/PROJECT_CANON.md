# DEEP Components Aggregator — Каноническая спецификация v1.0 (2025-10-08)
Кодовое слово-якорь: **DEEP-CANON-2025-10-08**

> Это опорный документ «как должно быть». Любые расхождения считаются задачами на приведение к канону.

## 0) Цели и границы
**Цель.** Агрегатор электронных компонентов с живым поиском (HTTP+SSE), канонизацией карточки товара, write-through кэшем/БД, оформлением заказов и админ-настройками (наценка/фич-флаги).
**Не-цели.** Полный «мертвый» каталог как основной режим работы; показ дилеров пользователю; тяжелые ETL.
**Принципы.** 12-Factor, ASVS, модульность провайдеров, идемпотентность.
- **NO_TRY_CATCH blanket.** Нет ковровых try/catch; guard-условия и централизованный error-middleware.
- **SSE-first** с HTTP-фолбэком.
- **Write-through cache**: все «живые» результаты кладём в кэш.

## 1) Архитектура
**Процессы/порты:** API :9201; опц. рендер :9123; опц. proxy dashboard :9125.
**Блоки:** search/ (оркестратор), providers/ (DigiKey, Mouser, TME, Farnell, pricing), canon/, cache/ (SQLite+файлы), orders/, admin/, security/.
**Поток:** Client → `/api/live/search` или `/api/search` → провайдеры → канон → конверсия в ₽ (+наценка) → кэш/файлы → ответ (SSE/JSON). Заказы → orders.

## 2) Дерево проекта (канон)
```
/ (repo root)
  server.js
  package.json
  .env.example
  /src
    /api
      search.http.js          # GET /api/search
      search.sse.js           # GET /api/live/search
      product.js              # GET /api/product?mpn|url
      order.js                # POST /api/order, GET /api/user/orders
      admin.settings.js       # GET/PATCH /api/admin/settings
      health.js               # GET /api/health
      metrics.js              # GET /api/metrics (Prometheus)
    /core
      orchestrator.js         # конкурентность, таймауты, агрегация
      canon.js                # слияние полей в CanonProduct
      currency.js             # курсы ЦБ РФ, convert()
      logger.js               # структурные логи
      errors.js               # типы ошибок, фабрики
    /providers
      digikey.js
      mouser.js
      tme.js
      farnell.js
      pricing.oemstrade.js    # цены/склады/регионы (скрыто в UI)
      util.http.js            # fetch/ретраи/сигнатуры
    /db
      conn.js                 # better-sqlite3
      schema.sql              # CREATE TABLE ... (см. §5)
      dao.products.js         # CRUD статичных товаров
      dao.orders.js
      dao.cache.js            # canonical_cache, docs
      dao.settings.js         # pricing_policy, feature_flags
    /security
      auth.local.js           # email+password
      auth.oauth.js           # Google/Yandex (опция)
      rateLimit.js            # лимиты
      validate.js             # AJV схемы
    /ui                       # статические шаблоны (опц.)
  /public                     # статика (favicon, /ui/*)
  /data
    /db                       # *.sqlite
    /idx                      # индексы
    /cache
      /html                   # HTML снапшоты
      /pdf                    # datasheets локально
      /img                    # изображения локально
  /docs
    PROJECT_CANON.md          # ← этот документ
    RUNBOOKS.md               # дежурные процедуры
    SECURITY.md               # политика безопасности
    CHANGELOG.md
    /_artifacts               # health/metrics/скрины/логи
  /scripts                    # smoke, diagnose, rates, build-index
  /e2e                        # Playwright
  /systemd                    # unit-файлы
```

## 3) API контракты (стабильные)
**Поиск**  
`GET /api/search?q=&limit=&lang=&region=` → `{ items: CanonProduct[], tookMs, source:{live|cache} }`  
`GET /api/live/search?q=` (SSE `text/event-stream`) события: `search:start`, `provider:partial`, `provider:error`, `result`, `done`; heartbeat каждые 15s.

**Карточка**  `GET /api/product?mpn=…` или `?url=…` → `CanonProduct`

**Заказ**  `POST /api/order` → `{ id, status:'new' }`; `GET /api/user/orders`, `/api/user/orders/:id`

**Админ**  `GET|PATCH /api/admin/settings` (pricingPolicy, featureFlags), `GET /api/health`, `GET /api/metrics`

**Общее**  AJV-валидация, нормализованные ошибки `{ error:{code,message,details} }`, CORS allowlist, SSE `Cache-Control: no-transform`.

## 4) CanonProduct (единая модель)
```json
{
  "mpn": "1N4148",
  "manufacturer": "Diodes Inc.",
  "title": "Switching Diode",
  "package": "SOD-123",
  "images": ["/data/img/..."],
  "datasheets": ["/data/pdf/..."],
  "description": "…",
  "specs": { "vr": "100V", "if": "150mA", "vf@": "1mA/0.62V", "trr": "4ns" },
  "availability": [
    { "region": "EU", "stock": 120000, "minQty": 10, "price": 0.012 }
  ],
  "source": { "providers": ["digikey","mouser","tme","farnell"], "pricedBy": "oemstrade" }
}
```
**UI-политика:** дилеры не показываются; только агрегированные цены/регионы; наценка поверх.

## 5) БД/схема (SQLite, better-sqlite3)
Фрагменты `schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS rates(
  code TEXT PRIMARY KEY, rate_to_rub REAL NOT NULL, fetched_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings(
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL
); -- 'pricing_policy', 'feature_flags'
CREATE TABLE IF NOT EXISTS canonical_cache(
  mpn TEXT PRIMARY KEY, manufacturer TEXT, json TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cache_updated ON canonical_cache(updated_at);
CREATE TABLE IF NOT EXISTS docs(
  id INTEGER PRIMARY KEY, mpn TEXT, kind TEXT CHECK(kind IN('pdf','img','html')),
  path TEXT NOT NULL, sha256 TEXT, added_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY, mpn TEXT, qty INTEGER NOT NULL,
  contact_name TEXT, contact_email TEXT, contact_messenger TEXT,
  status TEXT NOT NULL DEFAULT 'new', created_at INTEGER NOT NULL,
  admin_notes TEXT, dealer_links TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY, mpn TEXT, manufacturer TEXT, title TEXT,
  json TEXT NOT NULL, visibility INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_mpn ON products(mpn);
```

## 6) Провайдеры и сеть
**Провайдеры:** `digikey`, `mouser`, `tme`, `farnell`, `pricing.oemstrade`.
Контракты возврата: `{ ok, items, partial, errors, tookMs }`.
**Proxy/WARP:** режимы `DIRECT`, `HTTP(S)_PROXY`, `WARP via Local Proxy`; переменные `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`.
**Таймауты/конкурентность:** `CONNECT_TIMEOUT=2500ms`, `PROVIDER_TIMEOUT=9500ms`, `MAX_CONCURRENCY=4`; ретраи только для идемпотентных GET.

## 7) Безопасность (ASVS-костяк)
Аутентификация (email+password, OAuth — опция), HttpOnly/SameSite, CSRF для изменяющих запросов, AJV-валидация, структурные логи без PII, секреты только через env, CORS allowlist, минимальные права на `data/`.

## 8) Деплой и systemd
**/etc/default/deep-agg**
```
PORT=9201
NODE_ENV=production
HTTP_PROXY=http://127.0.0.1:18080
HTTPS_PROXY=http://127.0.0.1:18080
NO_PROXY=localhost,127.0.0.1
```
**/etc/systemd/system/warp-bridge.service**
```
[Unit]
Description=WARP local proxy bridge
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
ExecStart=/usr/local/bin/warp-bridge --listen 127.0.0.1:18080
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
```
**/etc/systemd/system/deep-agg.service**
```
[Unit]
Description=Deep Components Aggregator API
After=warp-bridge.service
Requires=warp-bridge.service
[Service]
EnvironmentFile=/etc/default/deep-agg
WorkingDirectory=/opt/deep-aggregator
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
LimitNOFILE=65535
[Install]
WantedBy=multi-user.target
```
**Пост-инстал**
```
systemctl daemon-reload
systemctl enable --now warp-bridge deep-agg
```

## 9) .env (пример)
```
PORT=9201
NODE_ENV=production
LOG_LEVEL=info
DIGIKEY_CLIENT_ID=…
DIGIKEY_CLIENT_SECRET=…
MOUSER_API_KEY=…
TME_API_KEY=…
FARNELL_API_KEY=…
CBR_ENDPOINT=https://www.cbr-xml-daily.ru/daily_json.js
HTTP_PROXY=http://127.0.0.1:18080
HTTPS_PROXY=http://127.0.0.1:18080
NO_PROXY=localhost,127.0.0.1
```

## 10) Тесты и качество
**Smokes:** health, metrics, 3 эталона (`LM317`, `1N4148`, `LDB-500L`), ₽-конверсия, SSE `done`.
**Playwright:** кириллица «транзистор», live-поиск, заказ+наценка, CORS/скорость/рейты (негатив).
**Статика:** ESLint strict; запрет коврового try/catch; централизованный error-handler.

## 11) RUNBOOKS (кратко)
1) Быстрый прод-чек: `/api/health` (ok), `/api/metrics` (есть провайдер-метрики), `/api/live/search?q=1N4148` (start→result→done), `/api/search?q=LM317`.
2) Если «живые» молчат: `systemctl status warp-bridge`, внешний IP, `EnvironmentFile`, `journalctl -u deep-agg -n 200`.
3) Кэш и курсы: `scripts/rates-refresh.sh`, `scripts/build-index.sh`.

## 12) Критерии приёмки релиза
✅ health/metrics зелёные; ✅ SSE (ping+done, TTFB<10s); ✅ 3 эталона с ценами и ₽; ✅ заказ виден в админке, наценка применена; ✅ логи без PII; ✅ артефакты в `docs/_artifacts/<YYYY-MM-DD>/`.

## 13) Долги/расширения
Docs по источнику цен/регионам (oemstrade); Admin CRUD для `products`; UI-спека (табличная выдача + модальная карточка).

## 14) Глоссарий
SSE, Write-through cache, CanonProduct, Pricing Policy.

## 15) Как пользоваться каноном
Сверять все фичи с §1–5; отклонения фиксировать в `docs/_artifacts/` и раз-в-неделю синхронизировать сюда патчем.