# Deep Components Aggregator

**Production URL**: https://prosnab.tech  
**Project Type**: Агрегатор электронных компонентов  
**Stack**: Next.js 14 (App Router) + Express + SQLite + PM2

---

## 📋 Что это

Агрегатор электронных компонентов с **живым поиском** и **кэш-слоем**.

### ✅ Реальные источники данных

| Источник | Данные | Тип |
|----------|--------|-----|
| **Mouser API** | Товары, цены (USD), спеки, изображения | API |
| **DigiKey API** | Товары, цены (USD), спеки, изображения | API |
| **TME API** | Товары, цены (EUR/PLN), спеки | API |
| **Farnell API** | Товары, цены (GBP/EUR), спеки | API |
| **ЦБ РФ** | Курсы валют для конвертации в RUB | XML API |

### Ключевые принципы

1. **API-first**: Все цены и данные берутся напрямую из API дистрибьюторов
2. **Кэш-слой**: SQLite для мгновенного повторного доступа (TTL 7 дней)
3. **Наценка**: Настраивается в админке, применяется к finalPrice
4. **Нормализация RU→EN**: "резистор" → "resistor"
5. **WARP прокси**: Обход гео-ограничений API

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     NGINX (reverse proxy)                    │
│                  prosnab.tech:443 → localhost:3000           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         FRONTEND (Next.js 14 App Router, port 3000)         │
│  /opt/deep-agg/v0-components-aggregator-page/               │
│                                                              │
│  Routes:                                                     │
│  • /              — Главная (поиск)                         │
│  • /results?q=... — Результаты поиска                       │
│  • /product/[mpn] — Карточка товара                         │
│  • /catalog/...   — Категории (1193 шт)                     │
│  • /page/[slug]   — CMS страницы                            │
│                                                              │
│  Next.js rewrites: /api/* → http://localhost:9201/api/*     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            BACKEND (Express, port 9201)                      │
│  /opt/deep-agg/server.js                                    │
│                                                              │
│  API:                                                        │
│  • GET  /api/search?q=...      — Поиск (кэш + live)         │
│  • GET  /api/autocomplete?q=... — Подсказки                 │
│  • GET  /api/product?mpn=...   — Карточка товара            │
│  • GET  /api/catalog           — Категории                  │
│  • GET  /api/vitrine           — Главная (топ товары)       │
│                                                              │
│  Proxy: Undici → WARP (127.0.0.1:40000)                     │
│  Cache: SQLite (var/db/deepagg.sqlite)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    ВНЕШНИЕ API                               │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Mouser  │ │ DigiKey │ │   TME   │ │ Farnell │           │
│  │  v1     │ │   v4    │ │         │ │         │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                              │
│  ┌─────────────────────────────────────────────┐            │
│  │             ЦБ РФ XML API                   │            │
│  │  Курсы валют: USD, EUR, GBP, PLN → RUB     │            │
│  └─────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Структура проекта

```
/opt/deep-agg/
├── server.js                 # Backend Express (порт 9201)
├── ecosystem.config.cjs      # PM2 конфигурация
├── .env                      # Секреты (НЕ в git!)
│
├── src/                      # Backend исходники
│   ├── integrations/         # API провайдеров
│   │   ├── mouser/           # ✅ АКТИВЕН
│   │   ├── digikey/          # ✅ АКТИВЕН
│   │   ├── tme/              # ✅ АКТИВЕН
│   │   └── farnell/          # ✅ АКТИВЕН
│   ├── search/               # Оркестрация поиска
│   ├── currency/             # Конвертация ЦБ РФ
│   └── pricing/              # Наценка
│
├── var/db/                   # SQLite база
│   └── deepagg.sqlite
│
├── v0-components-aggregator-page/  # ФРОНТЕНД (Next.js)
│   ├── app/                  # App Router
│   ├── components/           # React компоненты
│   └── next.config.mjs       # Rewrites /api/* → backend
│
└── docs/                     # Документация
    ├── PROJECT-MAP.md        # Карта проекта
    ├── TECH-STACK.md         # Технологии
    └── DATA-FLOW.md          # Потоки данных
```

---

## 🚀 Quick Start

### 1. Клонирование

```bash
git clone git@github.com:offflinerpsy/v0-components-aggregator-page.git /opt/deep-agg
cd /opt/deep-agg
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
cp env.development.template .env
nano .env
```

**Обязательные переменные**:
```bash
# API Keys
MOUSER_API_KEY=xxx
DIGIKEY_CLIENT_ID=xxx
DIGIKEY_CLIENT_SECRET=xxx
TME_APP_SECRET=xxx
TME_APP_KEY=xxx

# Прокси
HTTP_PROXY=http://127.0.0.1:40000
HTTPS_PROXY=http://127.0.0.1:40000
NO_PROXY=127.0.0.1,localhost
```

### 4. Локальный запуск

```bash
# Backend
npm run dev   # http://localhost:9201

# Frontend (другой терминал)
cd v0-components-aggregator-page
npm run dev   # http://localhost:3000
```

### 5. Production (PM2)

```bash
cd v0-components-aggregator-page && npm run build && cd ..
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 📚 Документация

| Файл | Описание |
|------|----------|
| [docs/PROJECT-MAP.md](./docs/PROJECT-MAP.md) | Полная карта проекта |
| [docs/TECH-STACK.md](./docs/TECH-STACK.md) | Технологии и зависимости |
| [docs/DATA-FLOW.md](./docs/DATA-FLOW.md) | Потоки данных (цены, поиск) |
| [API-CONTRACT.md](./API-CONTRACT.md) | API эндпоинты |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Деплой и nginx |
| [ENV-SECRETS.md](./ENV-SECRETS.md) | Переменные окружения |

---

## 🔧 PM2 процессы

| Process | Port | Описание |
|---------|------|----------|
| `deep-agg` | 9201 | Express backend |
| `deep-v0` | 3000 | Next.js frontend |

```bash
pm2 status          # Статус
pm2 logs deep-agg   # Логи бэка
pm2 logs deep-v0    # Логи фронта
pm2 restart all     # Перезапуск
```

---

## 🌐 Production URLs

- **Сайт**: https://prosnab.tech
- **API**: https://prosnab.tech/api/search?q=LM317

---

**Последнее обновление**: 21 декабря 2025  
**Статус**: ✅ Production
