# PROJECT-MAP.md — Карта проекта Deep Components Aggregator

**Обновлено**: 21 декабря 2025  
**Ветка**: `audit/cleanup-2025-12-21`  
**Домен**: https://prosnab.tech

---

## 🌐 FRONTEND PAGES (Next.js App Router)

| Route | Файл | Описание | API вызовы |
|-------|------|----------|------------|
| `/` | `app/page.tsx` | Главная страница | `/api/vitrine/list` |
| `/results?q=` | `app/results/page.tsx` | Результаты поиска | `/api/search`, `/api/live/search` (SSE) |
| `/product/[mpn]` | `app/product/[mpn]/page.tsx` | Карточка товара | `/api/product?mpn=` |
| `/catalog` | `app/catalog/page.tsx` | Корневой каталог | `/api/catalog/categories` |
| `/catalog/[...slug]` | `app/catalog/[...slug]/page.tsx` | Категория каталога | `/api/catalog/categories/:slug`, `/api/catalog/breadcrumb/:slug` |
| `/page/[slug]` | `app/page/[slug]/page.tsx` | CMS страница | `/api/pages/:slug` |

---

## 🔌 API ENDPOINTS (Express, порт 9201)

### Публичные

| Method | Endpoint | Описание | Handler |
|--------|----------|----------|---------|
| GET | `/api/health` | Healthcheck | server.js:242 |
| GET | `/api/search?q=` | Поиск товаров | server.js:684 |
| GET | `/api/live/search?q=` | SSE Live поиск | server.js:600 |
| GET | `/api/autocomplete?q=` | Подсказки поиска | server.js:585 |
| GET | `/api/product?mpn=` | Карточка товара | server.js:813 |
| GET | `/api/vitrine/list` | Товары витрины | api/vitrine.mjs |
| GET | `/api/vitrine/sections` | Секции витрины | api/vitrine.mjs |
| GET | `/api/catalog/categories` | Категории каталога | api/catalog.mjs |
| GET | `/api/catalog/categories/:slug` | Подкатегории | api/catalog.mjs |
| GET | `/api/catalog/breadcrumb/:slug` | Хлебные крошки | api/catalog.mjs |
| GET | `/api/static-pages` | Список CMS страниц | server.js:501 |
| GET | `/api/pages/:slug` | CMS страница | server.js:502 |
| GET | `/api/currency/rates` | Курсы валют | server.js:419 |
| GET | `/api/metrics` | Prometheus метрики | server.js:444 |
| POST | `/api/order` | Создание заказа | server.js:476 |
| GET | `/api/order/:id/stream` | SSE статус заказа | server.js:480 |
| GET | `/api/image` | Проксирование картинок | server.js:1315 |
| GET | `/api/pdf` | Проксирование даташитов | server.js:1357 |

### Административные

| Method | Endpoint | Описание | Handler |
|--------|----------|----------|---------|
| GET | `/admin/*` | AdminJS панель | src/admin/setup.mjs |
| GET | `/admin/health` | Healthcheck админки | server.js:493 |
| POST | `/api/admin/orders` | Создание заказа (admin) | server.js:503 |

### Диагностика

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/diag/net` | Сетевая диагностика |
| GET | `/api/diag/runtime` | Runtime диагностика |
| GET | `/api/digikey/selftest` | Тест DigiKey API |

---

## 🧩 REACT КОМПОНЕНТЫ

| Компонент | Файл | Используется на |
|-----------|------|-----------------|
| `AutocompleteSearch` | components/AutocompleteSearch.tsx | Все страницы (header) |
| `ResultsClient` | components/ResultsClient.tsx | /results |
| `CatalogLayout` | components/CatalogLayout.tsx | /catalog/* |
| `CatalogNav` | components/CatalogNav.tsx | /catalog/* |
| `OrderModal` | components/OrderModal.tsx | /product/[mpn] |
| `Navigation` | components/Navigation.tsx | Layout (все страницы) |
| `Footer` | components/Footer.tsx | Layout (все страницы) |
| `MicrochipLoader` | components/MicrochipLoader.tsx | Загрузка |
| `PageLoader` | components/PageLoader.tsx | Переходы |
| `ProductImageCell` | components/ProductImageCell.tsx | Таблица результатов |
| `DiagChip` | components/DiagChip.tsx | Диагностика |
| `theme-provider` | components/theme-provider.tsx | Root layout |

---

## 🔗 ИНТЕГРАЦИИ (АКТИВНЫЕ)

| Провайдер | Папка | Search | Product | Autocomplete |
|-----------|-------|--------|---------|--------------|
| **Mouser** | src/integrations/mouser/ | ✅ | ✅ | ✅ |
| **DigiKey** | src/integrations/digikey/ | ✅ | ✅ | ✅ |
| **TME** | src/integrations/tme/ | ✅ | ✅ | ✅ |
| **Farnell** | src/integrations/farnell/ | ✅ | ✅ | ✅ |

### Файлы интеграций:

```
src/integrations/
├── mouser/
│   ├── client.mjs      # API клиент
│   ├── normalize.mjs   # Нормализация ответа
│   └── scraper.mjs     # (не используется)
├── digikey/
│   ├── client.mjs      # API клиент
│   ├── normalize.mjs   # Нормализация ответа
│   └── oauth.mjs       # OAuth токены
├── tme/
│   ├── client.mjs      # API клиент
│   └── normalize.mjs   # Нормализация ответа
├── farnell/
│   ├── client.mjs      # API клиент
│   └── normalize.mjs   # Нормализация ответа
└── suggest/
    ├── mouser.suggest.mjs
    ├── digikey.suggest.mjs
    ├── tme.suggest.mjs
    └── farnell.suggest.mjs
```

---

## 🗄️ БАЗА ДАННЫХ (SQLite)

**Файл**: `var/db/deepagg.sqlite`

### Основные таблицы:

| Таблица | Назначение |
|---------|------------|
| `users` | Пользователи (OAuth + local) |
| `sessions` | express-session store |
| `orders` | Заказы клиентов |
| `settings` | Настройки (наценка, pricing_policy) |
| `searches` | Кэш поисковых запросов |
| `search_rows` | Результаты поиска (JSON) |
| `products_fts` | FTS5 полнотекстовый индекс |
| `static_pages` | CMS страницы |
| `catalog_categories` | Категории каталога (1193 шт) |
| `vitrine_pins` | Закреплённые товары на главной |
| `autocomplete_cache` | Кэш подсказок (TTL 1 час) |
| `admin_users` | Администраторы |
| `admin_notifications` | Уведомления админа |
| `api_keys` | API ключи провайдеров |
| `api_health` | Мониторинг API |
| `manual_products` | Ручные товары |
| `manual_product_fields` | Доп. поля ручных товаров |

---

## 📁 СТРУКТУРА ПРОЕКТА

```
/opt/deep-agg/
├── server.js                    # Express сервер (порт 9201)
├── package.json                 # Backend зависимости
├── ecosystem.config.cjs         # PM2 конфигурация
│
├── api/                         # API роуты
│   ├── vitrine.mjs             # Витрина главной
│   ├── catalog.mjs             # Каталог категорий
│   ├── static-pages.mjs        # CMS страницы
│   ├── order.js                # Заказы
│   └── ...
│
├── src/
│   ├── integrations/           # API клиенты провайдеров
│   ├── search/                 # Логика поиска
│   │   ├── providerOrchestrator.mjs
│   │   ├── autocompleteOrchestrator.mjs
│   │   └── manualProducts.mjs
│   ├── currency/               # Конвертация валют (ЦБ РФ)
│   ├── utils/                  # Утилиты
│   │   └── markup.mjs          # Наценка
│   ├── admin/                  # AdminJS настройка
│   ├── db/                     # Модели Sequelize
│   └── i18n/                   # RU→EN нормализация
│
├── var/db/                     # SQLite база
│   └── deepagg.sqlite
│
├── v0-components-aggregator-page/  # FRONTEND (Next.js)
│   ├── app/                    # Pages (App Router)
│   ├── components/             # React компоненты
│   ├── next.config.mjs         # Rewrites на :9201
│   └── package.json
│
├── docs/                       # Документация
├── logs/                       # PM2 логи
├── nginx/                      # nginx конфиги
└── scripts/                    # Утилиты
```

---

## 🔄 FLOW: Поиск товара

```
1. User: /results?q=LM317
2. Next.js SSR → fetch /api/search?q=LM317
3. server.js:684 → providerOrchestrator.mjs
4. Параллельные запросы (PQueue concurrency=4):
   ├── Mouser API
   ├── DigiKey API
   ├── TME API
   └── Farnell API
5. Normalize → Dedupe → Rank → applyMarkup
6. Response: { ok, rows[], meta }
```

## 🔄 FLOW: Карточка товара

```
1. User: /product/LM317
2. Next.js → fetch /api/product?mpn=LM317
3. server.js:813:
   a) checkManualProduct(mpn)
   b) readCachedProduct(db, mpn)
   c) Promise.allSettled([mouser, digikey, tme, farnell])
4. mergeProductData() — приоритет specs/images
5. cacheProduct(db, mpn, product)
6. Response: { ok, product, meta }
```

## 🔄 FLOW: Автокомплит

```
1. User typing: "LM3"
2. Frontend debounce 300ms → fetch /api/autocomplete?q=LM3
3. autocompleteOrchestrator.mjs:
   a) Check SQLite cache (TTL 1h)
   b) Parallel: [mouser, digikey, farnell, tme].suggest()
4. Dedupe → Sort → Cache result
5. Response: { suggestions[], meta }
```

---

## ⚙️ КОНФИГУРАЦИЯ

### Порты:
- **Backend**: `127.0.0.1:9201`
- **Frontend**: `127.0.0.1:3000`
- **WARP Proxy**: `127.0.0.1:40000`

### Next.js rewrites:
```javascript
// next.config.mjs
rewrites: [
  { source: '/api/:path*', destination: 'http://127.0.0.1:9201/api/:path*' },
  { source: '/auth/:path*', destination: 'http://127.0.0.1:9201/auth/:path*' }
]
```

### PM2 процессы:
- `deep-agg` — Express backend
- `deep-v0` — Next.js frontend

---

## 🔐 АДМИНКА

**URL**: https://prosnab.tech/admin

### Ресурсы AdminJS:
- Settings — настройки системы
- Orders — заказы
- Static Pages — CMS страницы
- Manual Products — ручные товары
- Admin Users — администраторы
- Admin Notifications — уведомления
- API Health — мониторинг API
- API Keys — ключи провайдеров
