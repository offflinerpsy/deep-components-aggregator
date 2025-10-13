# Архитектура проекта

**Дата**: 2025-10-13  
**Версия**: v1.0 (ops/ui-ux-r3)

---

## Общая схема

```
┌────────────────────────────────────────────────────────┐
│                  ПОЛЬЗОВАТЕЛЬ                          │
│              https://prosnab.tech                      │
└────────────────┬───────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────┐
│               NGINX (Reverse Proxy)                     │
│   • SSL Termination (Let's Encrypt)                    │
│   • Location / → localhost:3001 (Next.js)              │
│   • X-Accel-Buffering: no (для SSE)                    │
│   • proxy_buffering off (live стримы)                  │
└────────────────┬───────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────┐
│          FRONTEND LAYER (Next.js 14 App Router)        │
│               Port: 3001 (PM2: deep-v0)                │
│   Path: /opt/deep-agg/v0-components-aggregator-page/   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │  Routes (App Router)                            │  │
│   ├─────────────────────────────────────────────────┤  │
│   │  • GET  /                 → app/page.tsx        │  │
│   │  • GET  /results?q=...    → app/results/page.tsx│  │
│   │  • GET  /product/[mpn]    → app/product/[mpn]/  │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │  Next.js Rewrites (next.config.mjs)             │  │
│   ├─────────────────────────────────────────────────┤  │
│   │  /api/cache     → http://localhost:9201/api/cache│ │
│   │  /api/live      → http://localhost:9201/api/live │ │
│   │  /api/product/* → http://localhost:9201/api/...  │ │
│   │  /api/offers/*  → http://localhost:9201/api/...  │ │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   Компоненты:                                          │
│   • ResultsClient.tsx (SSE + cache клиент)             │
│   • ProductClient.tsx (карточка товара)                │
│   • PageLoader.tsx (скелетон)                          │
└────────────────┬───────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────┐
│           BACKEND LAYER (Express)                      │
│               Port: 9201 (PM2: deep-agg)               │
│   Path: /opt/deep-agg/server.js                        │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │  API Endpoints                                  │  │
│   ├─────────────────────────────────────────────────┤  │
│   │  GET  /api/cache?q=резистор                     │  │
│   │       → queryNorm(RU→EN) → SQLite lookup        │  │
│   │       → Response: { rows: [...], mode: cache }  │  │
│   │                                                  │  │
│   │  GET  /api/live?q=resistor                      │  │
│   │       → SSE stream (text/event-stream)          │  │
│   │       → X-Accel-Buffering: no                   │  │
│   │       → Heartbeat `: ping\n\n` каждые 15s       │  │
│   │       → События: data: {...}\n\n                │  │
│   │                                                  │  │
│   │  GET  /api/product/:mpn                         │  │
│   │       → SQLite + парсеры (DigiKey/Mouser)       │  │
│   │       → Response: { mpn, specs, images, docs }  │  │
│   │                                                  │  │
│   │  GET  /api/offers/:mpn                          │  │
│   │       → OEMstrade API (через proxy)             │  │
│   │       → Response: [{ region, price, stock }]    │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │  HTTP Client (Undici)                           │  │
│   ├─────────────────────────────────────────────────┤  │
│   │  • setGlobalDispatcher(ProxyAgent)              │  │
│   │  • Proxy: http://127.0.0.1:40000 (WARP)         │  │
│   │  • NO_PROXY: 127.0.0.1,localhost                │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │  Cache Layer (SQLite)                           │  │
│   ├─────────────────────────────────────────────────┤  │
│   │  DB: /opt/deep-agg/var/db/deepagg.sqlite        │  │
│   │  Tables: search_results, products, offers       │  │
│   │  TTL: 7 дней для search, 30 дней для products   │  │
│   └─────────────────────────────────────────────────┘  │
└────────────────┬───────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                         │
│                                                         │
│   ┌──────────────────┐  ┌──────────────────┐           │
│   │  DigiKey API     │  │  Mouser API      │           │
│   │  (OAuth2)        │  │  (API Key)       │           │
│   │  • Specs         │  │  • Specs         │           │
│   │  • Images        │  │  • Images        │           │
│   │  • Datasheets    │  │  • Datasheets    │           │
│   └──────────────────┘  └──────────────────┘           │
│                                                         │
│   ┌──────────────────┐  ┌──────────────────┐           │
│   │  OEMstrade API   │  │  Farnell/TME     │           │
│   │  (REST)          │  │  (Scraping)      │           │
│   │  • Цены          │  │  • Specs         │           │
│   │  • Остатки       │  │  • Images        │           │
│   │  • Регионы       │  │                  │           │
│   └──────────────────┘  └──────────────────┘           │
└────────────────────────────────────────────────────────┘
```

---

## Data Flow: Поиск компонента

### 1. Пользователь вводит запрос "резистор"

```
Browser → GET /results?q=резистор → Next.js (SSR)
```

### 2. Next.js делает rewrite

```
Next.js → GET http://localhost:9201/api/cache?q=резистор
```

### 3. Backend обрабатывает

```javascript
// server.js
app.get('/api/cache', async (req, res) => {
  const q = req.query.q
  const qNorm = queryNorm(q)  // "резистор" → "resistor"
  
  // Lookup в SQLite
  const rows = await db.all(
    'SELECT * FROM search_results WHERE query_norm = ? AND created_at > ?',
    [qNorm, Date.now() - 7 * 86400 * 1000]
  )
  
  res.json({ rows, mode: 'cache' })
})
```

### 4. Если кэш пустой — Live поиск

```
Browser → EventSource('/api/live?q=resistor')
  ↓
Backend SSE Stream:
  : ping\n\n
  data: {"mpn":"ABC123","manufacturer":"Vishay",...}\n\n
  data: {"mpn":"XYZ789","manufacturer":"Yageo",...}\n\n
  : ping\n\n
  ...
  ↓
Frontend (ResultsClient.tsx) → setState(rows)
```

---

## Proxy Policy

### Проблема
- DigiKey/Mouser блокируют запросы не из US
- Farnell требует EU IP

### Решение
```javascript
// server.js
import { ProxyAgent, setGlobalDispatcher } from 'undici'

const proxyAgent = new ProxyAgent({
  uri: 'http://127.0.0.1:40000',  // Cloudflare WARP
  keepAliveTimeout: 60000,
  keepAliveMaxTimeout: 600000
})

setGlobalDispatcher(proxyAgent)

process.env.NO_PROXY = '127.0.0.1,localhost'
```

### WARP Socks5
- Порт: `127.0.0.1:40000`
- Запуск: `warp-cli connect`
- Проверка: `curl --proxy socks5://127.0.0.1:40000 https://ifconfig.me`

---

## SSE Specification

### Format (WHATWG Стандарт)

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no

: ping

data: {"mpn":"ABC123","manufacturer":"Vishay"}

: ping

data: {"mpn":"XYZ789","manufacturer":"Yageo"}

```

### Важно
- События разделяются **двойным \n** (`\n\n`)
- Heartbeat комментарии `: ping\n\n` каждые 15s
- `X-Accel-Buffering: no` на nginx (иначе буферится)

---

## Security & Privacy

### Что НЕ показываем пользователю
- Ссылки на дилеров (DigiKey/Mouser/Farnell)
- API ключи
- Внутренние ID парсеров

### Что показываем
- Регион поставки (US/EU/CN)
- Цена (RUB)
- Наличие (stock)
- MPN, производитель, описание
- Даташиты (прямые ссылки PDF)

### Админка
- Ссылки дилеров
- Наценки
- Кэш-статистика

---

## Deployment Architecture

### PM2 Processes

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'deep-agg',        // Backend
      script: 'server.js',
      instances: 1,
      cwd: '/opt/deep-agg',
      env: { NODE_ENV: 'production', PORT: 9201 }
    },
    {
      name: 'deep-v0',         // Frontend
      script: 'npm',
      args: 'start -- -p 3001',
      cwd: '/opt/deep-agg/v0-components-aggregator-page',
      instances: 1
    }
  ]
}
```

### Nginx Config

```nginx
server {
  listen 443 ssl http2;
  server_name prosnab.tech;
  
  ssl_certificate /etc/letsencrypt/live/prosnab.tech/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/prosnab.tech/privkey.pem;
  
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # SSE support
    proxy_buffering off;
    proxy_set_header X-Accel-Buffering no;
    proxy_read_timeout 600s;
  }
}
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend Framework | Next.js | 14.2.16 | App Router, SSR, rewrites |
| Frontend UI | React | 18 | Компоненты |
| Styling | TailwindCSS | 3.x | Утилитарный CSS |
| Backend Framework | Express | 4.x | REST API |
| HTTP Client | Undici | 6.x | Fetch + ProxyAgent |
| Database | SQLite3 | 5.x | Кэш-слой |
| Process Manager | PM2 | 5.x | Production runtime |
| Reverse Proxy | nginx | 1.18+ | SSL + buffering control |
| Testing | Playwright | 1.x | E2E тесты |

---

**Next**: См. [API-CONTRACT.md](./API-CONTRACT.md) для деталей эндпоинтов
