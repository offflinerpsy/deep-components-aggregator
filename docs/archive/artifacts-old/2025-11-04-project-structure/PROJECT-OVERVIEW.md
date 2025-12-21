# Deep Components Aggregator — Архитектурная сводка

**Дата**: 4 ноября 2025  
**Версия**: 3.2 (backend), Next.js 14.2.16 (frontend)  
**Статус**: Production, оба сервиса онлайн

---

## Архитектура проекта

### Backend: Express.js (порт 9201)
- **Entry point**: `/opt/deep-agg/server.js` (1417 строк)
- **PM2 процесс**: `deep-agg` (id:2, uptime 10 дней, 1806 рестартов)
- **База данных**: SQLite `/opt/deep-agg/var/db/deepagg.sqlite` (3 MB, 31 таблица)
- **Логи**: `/opt/deep-agg/logs/{out.log, err.log}` (11 MB)

### Frontend: Next.js App Router (порт 3001)
- **Директория**: `/opt/deep-agg/v0-components-aggregator-page/`
- **PM2 процесс**: `deep-v0` (id:8, uptime 17 дней, 0 рестартов)
- **Rewrites**: `/api/*` → `http://127.0.0.1:9201/api/*` (в next.config.mjs)

---

## Структура директорий

```
/opt/deep-agg/
├── server.js                    # Backend entry point
├── package.json                 # Dependencies (Express, AdminJS, better-sqlite3, Cheerio)
├── .env                         # Секреты (API ключи, SESSION_SECRET, прокси)
│
├── src/                         # Backend исходники
│   ├── bootstrap/
│   │   └── proxy.mjs           # Undici ProxyAgent (WARP), setGlobalDispatcher
│   ├── db/
│   │   └── sql.mjs             # SQLite queries (openDb, cacheSearch, cacheProduct)
│   ├── integrations/           # Провайдеры
│   │   ├── mouser/client.mjs
│   │   ├── digikey/client.mjs
│   │   ├── tme/client.mjs
│   │   └── farnell/client.mjs
│   ├── search/
│   │   ├── providerOrchestrator.mjs   # Агрегация результатов от всех провайдеров
│   │   └── manualProducts.mjs         # Ручные ("мертвые") карточки
│   ├── currency/
│   │   ├── toRUB.mjs           # Конвертация валют
│   │   └── cbr.mjs             # ЦБ РФ курсы
│   └── services/
│       ├── fetcher.js
│       ├── search-tokenizer.js
│       └── (8 файлов total)
│
├── api/                         # Backend endpoints
│   ├── diag.net.mjs            # GET /api/diag/net (проверка WARP/провайдеров)
│   ├── order.js                # POST /api/order (создание заказов)
│   ├── auth.js                 # /api/auth/* (регистрация/логин)
│   ├── admin.*.js              # /api/admin/* (админка)
│   └── static-pages.mjs        # /api/pages/* (статические страницы)
│
├── lib/
│   ├── sse.mjs                 # SSE helpers (для live-поиска)
│   └── net.js                  # Undici ProxyAgent helper
│
├── adapters/                   # (старые адаптеры, частично удалены)
│
├── var/
│   └── db/deepagg.sqlite       # База данных (3 MB)
│
├── data/
│   ├── corpus.json             # Корпус для нормализации
│   └── rates.json              # Кэш курсов валют
│
├── v0-components-aggregator-page/   # Frontend (Next.js)
│   ├── app/
│   │   ├── page.tsx            # Главная (/)
│   │   ├── results/page.tsx    # Результаты поиска (/results?q=...)
│   │   └── product/[mpn]/page.tsx  # Карточка товара
│   ├── components/
│   │   └── ui/                 # v0 компоненты (НЕ менять сетку!)
│   ├── hooks/
│   ├── lib/
│   └── next.config.mjs         # Rewrites для /api/*
│
└── docs/
    ├── API-CONTRACT.md         # Контракт UI↔Backend
    ├── _artifacts/
    │   ├── 2025-10-17-autocomplete/   # План автодополнения (Oct 17)
    │   │   ├── ANALYSIS.md
    │   │   ├── PLAN.md
    │   │   └── ENV-EXPLAINED.md
    │   └── 2025-11-04-autocomplete-research/  # Исследование провайдеров (Nov 4)
    │       ├── COMPREHENSIVE-RESEARCH.md
    │       ├── EXECUTIVE-SUMMARY.md
    │       └── EVIDENCE.md
    └── (множество других документов)
```

---

## Ключевые точки входа (API endpoints)

### Backend (Express на 9201)

| Endpoint | Метод | Назначение |
|----------|-------|------------|
| `/api/health` | GET | Здоровье бэкенда (status, version, sources) |
| `/api/search?q=LM317` | GET | Поиск по кэшу (SQLite FTS5) |
| `/api/live/search` | GET (SSE) | Live-поиск (агрегация 4 провайдеров) |
| `/api/product?mpn=LM317T` | GET | Карточка товара (кэш + live fetch) |
| `/api/order` | POST | Создание заказа |
| `/api/diag/net` | GET | Диагностика WARP + провайдеры |

### Frontend (Next.js на 3001)

| Маршрут | Файл | Описание |
|---------|------|----------|
| `/` | `app/page.tsx` | Главная (поисковая строка) |
| `/results?q=LM317` | `app/results/page.tsx` | Результаты поиска |
| `/product/LM317T` | `app/product/[mpn]/page.tsx` | Карточка товара |

**Rewrites** (Next.js → Express):
```javascript
// next.config.mjs
rewrites: async () => [
  {
    source: '/api/:path*',
    destination: 'http://127.0.0.1:9201/api/:path*'
  }
]
```

---

## Провайдеры контента (4 активных)

| Провайдер | API документация | Латентность | Лимиты |
|-----------|------------------|-------------|--------|
| **Mouser** | https://www.mouser.com/api-hub/ | 300-800ms | 1000/день |
| **DigiKey** | https://developer.digikey.com/ | 500-1500ms | 1000/день |
| **TME** | https://developers.tme.eu/ | 600-1200ms | неизвестно |
| **Farnell** | https://partner.element14.com/docs/ | 500-1000ms | business акк |

**❌ НЕТ autocomplete/suggestions API** у провайдеров — только полнотекстовый поиск.

---

## База данных (SQLite)

### Основные таблицы

```sql
-- Кэш продуктов (из живого поиска)
products (id, mpn, title, manufacturer, image_url, datasheet_url, ...)

-- FTS5 индекс для быстрого поиска (prefix='2 3 4')
search_rows_fts (mpn, title, description)

-- Ручные ("мертвые") карточки
manual_products (mpn, title, description, ...)

-- Заказы
orders (id, user_email, items_json, total_rub, created_at, ...)

-- Админка
admin_users, admin_notifications, settings, static_pages, ...
```

### FTS5 конфигурация

```sql
CREATE VIRTUAL TABLE search_rows_fts USING fts5(
  mpn, title, description,
  tokenize='porter unicode61',
  prefix='2 3 4'  -- ✅ Префиксный поиск готов!
);
```

**Пример запроса**:
```sql
SELECT * FROM search_rows_fts 
WHERE search_rows_fts MATCH 'lm31*' 
LIMIT 10;
```
→ Латентность: **5-15ms** (vs 300-1500ms у провайдеров)

---

## WARP Proxy (обход гео-блокировок)

### Конфигурация

```bash
# .env
HTTP_PROXY=http://127.0.0.1:40000
HTTPS_PROXY=http://127.0.0.1:40000
NO_PROXY=localhost,127.0.0.1,::1
```

### Systemd сервис
- **Сервис**: `warp-tunnel.service`
- **Порт**: `127.0.0.1:40000` (SOCKS5 + HTTP)
- **Статус**: активен 2+ недели (с 16 октября)
- **Процесс**: `warp-svc` (PID 802)

### Интеграция в Node.js
```javascript
// src/bootstrap/proxy.mjs
import { setGlobalDispatcher, ProxyAgent } from 'undici';

const proxy = process.env.HTTPS_PROXY; // http://127.0.0.1:40000
setGlobalDispatcher(new ProxyAgent({ uri: proxy }));
```

**Проверка работы**:
```bash
curl -x socks5://127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace
# Результат: warp=on, ip=104.28.251.138 (Cloudflare IP)
```

---

## Поток данных (Search flow)

### 1. Пользователь вводит запрос на фронте

```
Фронт: /results?q=LM317
  ↓ (Next.js rewrites)
Backend: GET http://127.0.0.1:9201/api/search?q=LM317
```

### 2. Backend проверяет кэш

```javascript
// src/db/sql.mjs
const cached = readCachedSearch(q);
if (cached && !stale) {
  return cached; // ✅ Быстрый ответ из SQLite FTS5
}
```

### 3. Если кэш пустой → Live-поиск

```javascript
// src/search/providerOrchestrator.mjs
orchestrateProviderSearch(query) {
  // Параллельно запросить все 4 провайдера через WARP
  const [mouser, digikey, tme, farnell] = await Promise.allSettled([
    mouserSearchByKeyword(query),
    digikeySearch(query),
    tmeSearchProducts(query),
    farnellByMPN(query)
  ]);
  
  // Агрегировать результаты
  const merged = mergeResults([...mouser, ...digikey, ...tme, ...farnell]);
  
  // Записать в кэш
  cacheSearch(query, merged);
  
  return merged;
}
```

### 4. SSE для Live-поиска (опционально)

```
Backend: GET /api/live/search?q=LM317
Content-Type: text/event-stream; charset=utf-8
X-Accel-Buffering: no

event: progress
data: {"provider":"mouser","status":"fetching"}

event: result
data: {"provider":"mouser","rows":50,"elapsed":1859}

event: done
data: {"total":60,"elapsed":2531}
```

---

## Автодополнение (планируемое)

### Текущее состояние
- ❌ Не реализовано
- ✅ План готов: `docs/_artifacts/2025-10-17-autocomplete/PLAN.md`
- ✅ FTS5 prefix индекс настроен (`prefix='2 3 4'`)
- ✅ Латентность: 5-15ms (против 300-1500ms у провайдеров)

### Архитектура решения

**Backend endpoint** (создать):
```javascript
// src/api/autocomplete.mjs
router.get('/api/autocomplete', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  
  const sql = `
    SELECT DISTINCT mpn, title
    FROM search_rows_fts
    WHERE search_rows_fts MATCH ?
    LIMIT 20
  `;
  
  const rows = db.prepare(sql).all(`${q}*`);
  res.json(rows);
});
```

**Frontend компонент** (создать):
```typescript
// v0-components-aggregator-page/hooks/useDebounce.ts
export function useDebounce(value: string, delay = 200) { ... }

// v0-components-aggregator-page/components/AutocompleteSearch.tsx
export function AutocompleteSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const [suggestions, setSuggestions] = useState([]);
  
  useEffect(() => {
    if (debouncedQuery.length < 2) return;
    fetch(`/api/autocomplete?q=${debouncedQuery}`)
      .then(r => r.json())
      .then(setSuggestions);
  }, [debouncedQuery]);
  
  return (
    <div>
      <input onChange={e => setQuery(e.target.value)} />
      <Dropdown items={suggestions} />
    </div>
  );
}
```

**Оценка**: 4-6 часов работы.

---

## Переменные окружения (.env)

```bash
# Базовые
NODE_ENV=production
PORT=9201
SESSION_SECRET=<64-char hex>

# Прокси (WARP)
HTTP_PROXY=http://127.0.0.1:40000
HTTPS_PROXY=http://127.0.0.1:40000
NO_PROXY=localhost,127.0.0.1,::1

# Провайдеры
MOUSER_API_KEY=<key>
DIGIKEY_CLIENT_ID=<id>
DIGIKEY_CLIENT_SECRET=<secret>
TME_TOKEN=<token>
TME_SECRET=<secret>
FARNELL_API_KEY=<key>

# База данных
DATABASE_PATH=./var/db/deepagg.sqlite

# Email (опционально)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<password>
```

---

## PM2 процессы

```bash
pm2 list
# ┌─────┬────────────┬─────────┬─────────┬──────────┐
# │ id  │ name       │ mode    │ status  │ restarts │
# ├─────┼────────────┼─────────┼─────────┼──────────┤
# │ 2   │ deep-agg   │ fork    │ online  │ 1806     │
# │ 8   │ deep-v0    │ fork    │ online  │ 0        │
# └─────┴────────────┴─────────┴─────────┴──────────┘

pm2 logs deep-agg --lines 20  # Backend логи
pm2 logs deep-v0 --lines 20   # Frontend логи
```

---

## Текущие метрики (4 ноября 2025)

- **Backend uptime**: 10 дней
- **Frontend uptime**: 17 дней
- **Продуктов в кэше**: 3 записи (почти пустой)
- **Размер БД**: 3 MB
- **Логи**: 11 MB
- **WARP**: активен 2+ недели
- **Последний поиск**: LM317 → 60 результатов, 2.5 сек (все 4 провайдера OK)

---

## Критические правила разработки

### ❌ Запреты
1. **try/catch** в новом коде — использовать guard-clauses
2. Менять сетку/лейаут v0 компонентов фронта
3. Placeholder-данные без явного комментария
4. Прямые вызовы бэкенда с фронта (только через rewrites)

### ✅ Обязательно
1. **Conventional Commits**: `feat(search): add autocomplete`
2. **EditorConfig**: LF, 2 пробела
3. **Артефакты**: сохранять доказательства в `docs/_artifacts/<date>/`
4. **Тесты**: писать после каждого изменения
5. **Секреты**: только через ENV, не в коде

---

## Контакты документации

- **API контракт**: `/opt/deep-agg/API-CONTRACT.md`
- **Архитектура**: `/opt/deep-agg/ARCHITECTURE.md`
- **Deployment**: `/opt/deep-agg/DEPLOYMENT.md`
- **Copilot правила**: `/opt/deep-agg/.github/copilot-instructions.md`
- **Autocomplete план**: `/opt/deep-agg/docs/_artifacts/2025-10-17-autocomplete/PLAN.md`

---

**Готов к заданию на автодополнение.** 🚀
