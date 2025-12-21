# TECH-STACK.md — Технологии проекта

**Обновлено**: 21 декабря 2025

---

## 🖥️ BACKEND

| Технология | Версия | Назначение |
|------------|--------|------------|
| **Node.js** | 18+ | Runtime |
| **Express** | 4.x | HTTP сервер |
| **Undici** | 6.x | HTTP клиент + ProxyAgent |
| **better-sqlite3** | 9.x | SQLite драйвер |
| **Sequelize** | 6.x | ORM (только для AdminJS) |
| **AdminJS** | 7.x | Админ-панель |
| **Passport.js** | 0.7.x | Аутентификация |
| **PM2** | 5.x | Process manager |

### Зависимости backend (ключевые):
```json
{
  "express": "^4.18.2",
  "undici": "^6.0.0",
  "better-sqlite3": "^9.0.0",
  "sequelize": "^6.35.0",
  "adminjs": "^7.0.0",
  "@adminjs/express": "^6.0.0",
  "@adminjs/sequelize": "^4.0.0",
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "passport-yandex": "^0.0.5",
  "bcrypt": "^5.1.1",
  "p-queue": "^8.0.0",
  "fast-xml-parser": "^4.0.0"
}
```

---

## 🎨 FRONTEND

| Технология | Версия | Назначение |
|------------|--------|------------|
| **Next.js** | 14.2.16 | React framework (App Router) |
| **React** | 18.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.x | Styling |
| **Radix UI** | latest | UI components |
| **Lucide React** | latest | Icons |

### Зависимости frontend (ключевые):
```json
{
  "next": "14.2.16",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "@radix-ui/react-dialog": "^1.0.0",
  "@radix-ui/react-dropdown-menu": "^2.0.0",
  "lucide-react": "^0.300.0",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0"
}
```

---

## 🗄️ DATABASE

| Компонент | Технология |
|-----------|------------|
| **СУБД** | SQLite 3 |
| **Драйвер** | better-sqlite3 (синхронный) |
| **ORM** | Sequelize (только AdminJS) |
| **FTS** | SQLite FTS5 |
| **Файл** | `var/db/deepagg.sqlite` |

---

## 🌐 EXTERNAL APIs

| Провайдер | Тип API | Auth |
|-----------|---------|------|
| **Mouser** | REST | API Key |
| **DigiKey** | REST | OAuth 2.0 (Client Credentials) |
| **TME** | REST | Token + Secret (HMAC) |
| **Farnell** | REST | API Key |
| **ЦБ РФ** | XML | Публичный |

### API URLs:
```
Mouser:   https://api.mouser.com/api/v1/
DigiKey:  https://api.digikey.com/products/v4/
TME:      https://api.tme.eu/Products/
Farnell:  https://api.element14.com/catalog/products
ЦБ РФ:    https://www.cbr.ru/scripts/XML_daily.asp
```

---

## 🔧 INFRASTRUCTURE

| Компонент | Технология | Конфигурация |
|-----------|------------|--------------|
| **Web Server** | nginx | Reverse proxy + SSL |
| **Process Manager** | PM2 | `ecosystem.config.cjs` |
| **Proxy** | Cloudflare WARP | `127.0.0.1:40000` |
| **SSL** | Let's Encrypt | Auto-renewal |

### Порты:
```
nginx:    443 (SSL) → 3000 (Next.js)
Next.js:  3000 → rewrites → 9201
Express:  9201 (backend)
WARP:     40000 (SOCKS5 proxy)
```

---

## 🔐 SECURITY

| Компонент | Реализация |
|-----------|------------|
| **Sessions** | express-session + SQLite store |
| **Password hashing** | bcrypt (10 rounds) |
| **OAuth** | Google, Yandex, VK |
| **Admin auth** | AdminJS sessions + bcrypt |
| **Rate limiting** | express-rate-limit |
| **CORS** | Настроен для rewrites |

---

## 📦 BUILD & DEPLOY

### Backend:
```bash
# Запуск
pm2 start ecosystem.config.cjs
pm2 save

# Логи
pm2 logs deep-agg
```

### Frontend:
```bash
cd v0-components-aggregator-page
npm run build
npm run start -- -p 3000

# Или через PM2
pm2 start "npm run start -- -p 3000" --name deep-v0
```

---

## 🧪 TESTING

| Инструмент | Назначение |
|------------|------------|
| **Vitest** | Unit tests |
| **Playwright** | E2E tests |

### Запуск тестов:
```bash
npm run test        # Vitest
npm run test:e2e    # Playwright
```

---

## 📁 KEY FILES

### Backend:
- `server.js` — Express сервер
- `ecosystem.config.cjs` — PM2 конфиг
- `src/search/providerOrchestrator.mjs` — Оркестратор поиска
- `src/currency/cbr.mjs` — Курсы валют
- `src/utils/markup.mjs` — Наценка

### Frontend:
- `next.config.mjs` — Next.js конфиг (rewrites!)
- `app/layout.tsx` — Root layout
- `components/ResultsClient.tsx` — Поиск
- `components/AutocompleteSearch.tsx` — Подсказки

### Config:
- `.env` — Секреты (НЕ в git!)
- `nginx/prosnab.tech.conf` — nginx конфиг
