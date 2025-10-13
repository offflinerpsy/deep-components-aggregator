# Deep Components Aggregator

**Production URL**: https://prosnab.tech  
**Project Type**: Электронные компоненты — агрегатор + живой поиск  
**Stack**: Next.js 14 (фронт) + Express (бэк) + SQLite (кэш) + PM2

---

## 📋 Что это

Агрегатор электронных компонентов с **живым поиском** (SSE) и **кэш-слоем**.

### Источники данных
- **Контент** (описания/спеки/доки/изображения): DigiKey, Mouser, Farnell, TME
- **Цены/склады**: OEMstrade API (региональные данные)
- **Кэш**: Найденные позиции сохраняются в SQLite для мгновенного повторного доступа

### Ключевые принципы
1. **Живой поиск**: SSE-стрим (Server-Sent Events) для реалтайм-результатов
2. **Кэш-первый**: Кэшированные данные показываем мгновенно, параллельно запрашиваем свежие
3. **Нормализация**: `RU→EN` (например "резистор" → "resistor") для корректного поиска
4. **Прокси-политика**: Undici ProxyAgent + WARP для обхода гео-ограничений
5. **Пользователь видит только регион/цену/наличие**; ссылки на дилеров — **только в админке**

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     NGINX (reverse proxy)                    │
│                  prosnab.tech → localhost:3001               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         FRONTEND (Next.js 14 App Router, port 3001)         │
│  /opt/deep-agg/v0-components-aggregator-page/               │
│                                                              │
│  Routes:                                                     │
│  • / (главная, search box)                                  │
│  • /results?q=...  (результаты поиска)                      │
│  • /product/[mpn]  (карточка товара)                        │
│                                                              │
│  Next.js rewrites: /api/* → http://localhost:9201/api/*     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            BACKEND (Express, port 9201)                      │
│  /opt/deep-agg/server.js                                    │
│                                                              │
│  Endpoints:                                                  │
│  • GET  /api/cache?q=...       (кэш SQLite)                 │
│  • GET  /api/live?q=...        (SSE стрим)                  │
│  • GET  /api/product/:mpn      (детали товара)              │
│  • GET  /api/offers/:mpn       (предложения OEMstrade)      │
│                                                              │
│  Proxy: Undici ProxyAgent → WARP (127.0.0.1:40000)          │
│  Cache: SQLite (/opt/deep-agg/var/db/deepagg.sqlite)        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                           │
│  • DigiKey API (specs/images)                               │
│  • Mouser API (specs/images)                                │
│  • OEMstrade API (prices/stock)                             │
│  • Farnell, TME (via scraping через proxy)                  │
└─────────────────────────────────────────────────────────────┘
```

**Детали**: см. [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📁 Структура проекта

```
/opt/deep-agg/
├── server.js                 # Backend Express (порт 9201)
├── package.json              # Backend dependencies
├── ecosystem.config.cjs      # PM2 конфигурация
├── .env                      # Секреты (НЕ в git!)
├── .env.example              # Шаблон для .env
│
├── src/                      # Backend исходники
│   ├── api/                  # Express routes
│   ├── parsers/              # DigiKey/Mouser/TME парсеры
│   └── lib/                  # Утилиты
│
├── var/db/                   # SQLite базы (кэш)
│   └── deepagg.sqlite
│
├── v0-components-aggregator-page/  # ФРОНТЕНД (Next.js)
│   ├── app/                  # App Router
│   │   ├── page.tsx          # Главная (/)
│   │   ├── results/          # /results
│   │   └── product/[mpn]/    # /product/ABC123
│   ├── components/           # React компоненты
│   ├── public/               # Статика
│   ├── next.config.mjs       # Next.js конфиг (rewrites!)
│   └── package.json          # Frontend dependencies
│
├── docs/                     # Документация
│   ├── backend/              # Бэкенд доки
│   ├── frontend/             # Фронт доки
│   └── _artifacts/           # Доказательства (R→I→P)
│
├── scripts/                  # Automation scripts
└── logs/                     # PM2 логи
```

**Полное дерево**: см. [PROJECT-TREE.md](./PROJECT-TREE.md)

---

## 🚀 Quick Start

### 1. Клонирование

```bash
git clone git@github.com:offflinerpsy/v0-components-aggregator-page.git /opt/deep-agg
cd /opt/deep-agg
git checkout ops/ui-ux-r3
```

### 2. Установка зависимостей

```bash
# Backend
npm install

# Frontend
cd v0-components-aggregator-page
npm install
cd ..
```

### 3. Настройка .env

```bash
cp .env.example .env
nano .env
```

**Обязательные переменные**:
```bash
DIGIKEY_CLIENT_ID=your_client_id
DIGIKEY_CLIENT_SECRET=your_secret
MOUSER_API_KEY=your_key
OEMSTRADE_API_KEY=your_key

# Прокси (WARP)
HTTP_PROXY=http://127.0.0.1:40000
HTTPS_PROXY=http://127.0.0.1:40000
NO_PROXY=127.0.0.1,localhost
```

**Полное описание**: см. [ENV-SECRETS.md](./ENV-SECRETS.md)

### 4. Запуск (локально)

```bash
# Backend
npm run dev   # http://localhost:9201

# Frontend (другой терминал)
cd v0-components-aggregator-page
npm run dev   # http://localhost:3000
```

### 5. Production (PM2)

```bash
# Билд фронта
cd v0-components-aggregator-page
npm run build

# Запуск через PM2
cd /opt/deep-agg
pm2 start ecosystem.config.cjs
pm2 save
```

**Детали деплоя**: см. [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## �� Тестирование

```bash
# E2E тесты (Playwright)
npm run test:e2e

# Smoke-тесты фронта
npm run test:smoke
```

---

## 📚 Документация

| Файл | Описание |
|------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Полная архитектура (фронт/бэк/прокси) |
| [API-CONTRACT.md](./API-CONTRACT.md) | Все эндпоинты + форматы |
| [PROJECT-TREE.md](./PROJECT-TREE.md) | Дерево файлов |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | PM2 + nginx конфигурация |
| [ENV-SECRETS.md](./ENV-SECRETS.md) | Секреты и переменные окружения |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Правила разработки (R→I→P) |
| [ONBOARDING.md](./ONBOARDING.md) | Гайд для новых разработчиков |
| [docs/backend/](./docs/backend/) | Backend-специфичная документация |
| [docs/frontend/](./docs/frontend/) | Frontend-специфичная документация |

---

## 🔑 Ключевые файлы

### Backend
- `server.js` — Express сервер
- `src/api/` — Route handlers
- `src/parsers/` — DigiKey/Mouser/TME парсеры
- `ecosystem.config.cjs` — PM2 конфигурация

### Frontend
- `app/page.tsx` — Главная страница
- `app/results/page.tsx` — Страница поиска
- `app/product/[mpn]/page.tsx` — Карточка товара
- `components/ResultsClient.tsx` — Live/cache results
- `next.config.mjs` — **REWRITES** (прокси /api/*)

---

## 🌐 Production URLs

- **Сайт**: https://prosnab.tech
- **API**: https://prosnab.tech/api/cache?q=resistor (через nginx)

---

## 🛠️ Технологии

- **Frontend**: Next.js 14.2.16 (App Router), React 18, TailwindCSS
- **Backend**: Express 4.x, Undici (HTTP client + proxy), node-cache
- **Database**: SQLite3 (кэш-слой)
- **Process Manager**: PM2
- **Reverse Proxy**: nginx
- **Testing**: Playwright (E2E)
- **VCS**: Git (branch: ops/ui-ux-r3)

---

## 📞 Контакты и поддержка

- **GitHub**: https://github.com/offflinerpsy/v0-components-aggregator-page
- **Server**: SSH tunnel to production server
- **Logs**: `/opt/deep-agg/logs/` + `pm2 logs`

---

## 📝 Changelog

См. git commits в ветке `ops/ui-ux-r3`:
- `feat(product)`: v0 3-column layout
- `feat(results)`: v0 table design + search bar
- `docs`: полная документация проекта

---

**Последнее обновление**: 2025-10-13  
**Ветка**: ops/ui-ux-r3  
**Статус**: ✅ Production-ready
