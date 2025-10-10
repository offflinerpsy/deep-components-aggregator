# 🎯 V0.DEV INTEGRATION GUIDE
## Полное руководство для генерации фронтенда под Deep-Agg Backend

**Дата**: 10 октября 2025  
**Backend Repository**: https://github.com/offflinerpsy/components-aggregator  
**Цель**: Создать Next.js фронтенд с v0.dev для существующего Express.js API

---

## 📋 ЧТО ТАКОЕ V0.DEV

**v0.dev** - это AI-powered инструмент от Vercel для генерации UI компонентов:
- Принимает текстовое описание интерфейса
- Генерирует React/Next.js компоненты с Tailwind CSS
- Поддерживает shadcn/ui компоненты
- Создает responsive дизайн

### Как работать с v0.dev
1. Заходим на https://v0.dev
2. Описываем нужный интерфейс текстом
3. v0 генерирует React компонент
4. Копируем код в проект
5. Адаптируем под наш API

---

## 🏗️ АРХИТЕКТУРА BACKEND

### Сервер
- **Framework**: Express.js
- **Port**: 9201
- **Host**: http://127.0.0.1:9201
- **Version**: 3.2

### Основные технологии
```javascript
{
  "express": "4.x",
  "passport": "Аутентификация (Local, Google, Yandex)",
  "sqlite3": "База данных (better-sqlite3)",
  "sse": "Server-Sent Events для real-time"
}
```

---

## 📡 ПОЛНАЯ КАРТА API ENDPOINTS

### 1. HEALTH & DIAGNOSTICS

#### GET /api/health
**Назначение**: Проверка состояния всех провайдеров и системы

**Request**:
```bash
GET /api/health?probe=true
```

**Response**:
```json
{
  "status": "ok",
  "version": "3.2",
  "ts": 1760111000000,
  "latency_ms": 1,
  "probe": true,
  "proxy": {
    "trust": true,
    "value": 1
  },
  "sources": {
    "digikey": {
      "status": "configured",
      "note": "OAuth credentials present"
    },
    "mouser": {
      "status": "configured",
      "note": "API key present"
    },
    "tme": {
      "status": "configured",
      "note": "Token/secret present"
    },
    "farnell": {
      "status": "configured",
      "note": "API key present"
    }
  },
  "currency": {
    "status": "ok",
    "age_hours": 8,
    "rates": {
      "USD": 81.4103,
      "EUR": 94.703
    }
  },
  "cache": {
    "db_path": "./data/db/deep-agg.db",
    "status": "ok"
  }
}
```

**Для v0**: Создать status badge компонент показывающий health каждого провайдера

---

### 2. SEARCH (Real-time SSE)

#### GET /api/live/search
**Назначение**: Real-time поиск компонентов через Server-Sent Events

**Request**:
```bash
GET /api/live/search?q=ESP32-WROOM-32
```

**Response Format** (SSE Stream):
```
event: search:start
data: {"query":"ESP32-WROOM-32","timestamp":1760111000000}

event: provider:partial
data: {"provider":"mouser","count":50,"elapsed":848}

event: provider:partial
data: {"provider":"tme","count":20,"elapsed":233}

event: provider:error
data: {"provider":"digikey","error":"best is not defined","elapsed":0}

event: provider:partial
data: {"provider":"farnell","count":25,"elapsed":941}

event: result
data: {
  "rows": [
    {
      "source": "mouser",
      "mpn": "ESP32-WROOM-32",
      "manufacturer": "Espressif Systems",
      "title": "WiFi Modules - 802.11 SMD module, ESP32-D0WDQ6 chip...",
      "description_short": "WiFi Modules - 802.11 SMD module...",
      "package": "",
      "packaging": "",
      "regions": ["US"],
      "stock": 24329,
      "min_price": 3.55,
      "min_currency": "USD",
      "min_price_rub": 289,
      "image_url": "https://www.mouser.com/images/...",
      "datasheet_url": "https://www.mouser.com/datasheet/...",
      "product_url": "https://www.mouser.com/ProductDetail/...",
      "price_breaks": [
        {"qty": 1, "price": 6.35, "currency": "USD", "price_rub": 517},
        {"qty": 10, "price": 5.67, "currency": "USD", "price_rub": 462},
        {"qty": 1000, "price": 3.55, "currency": "USD", "price_rub": 289}
      ]
    }
  ],
  "meta": {
    "total": 60,
    "providers": [
      {
        "provider": "mouser",
        "status": "ok",
        "total": 50,
        "usedQuery": "ESP32-WROOM",
        "strategy": "mpn-first",
        "attempts": 1,
        "elapsed_ms": 969
      }
    ],
    "currency": {
      "rates": {"USD": 81.4103, "EUR": 94.703},
      "date": "2025-10-10",
      "source": "ЦБ РФ"
    }
  }
}

event: done
data: 
```

**КРИТИЧНО для v0**:
```typescript
// Правильная обработка SSE events
const eventSource = new EventSource('/api/live/search?q=' + query)

// НЕ используй addEventListener('message') или addEventListener('data')!
// Backend отправляет TYPED events:

eventSource.addEventListener('search:start', (e) => {
  const data = JSON.parse(e.data)
  // data.query, data.timestamp
})

eventSource.addEventListener('provider:partial', (e) => {
  const data = JSON.parse(e.data)
  // data.provider, data.count, data.elapsed
  // Показать progress: "mouser: 50 компонентов"
})

eventSource.addEventListener('provider:error', (e) => {
  const data = JSON.parse(e.data)
  // data.provider, data.error
  // Показать warning для этого провайдера
})

eventSource.addEventListener('result', (e) => {
  const data = JSON.parse(e.data)
  // data.rows[] - массив продуктов
  // data.meta - метаданные
  setResults(data.rows)
})

eventSource.addEventListener('done', () => {
  eventSource.close()
  setLoading(false)
})
```

**Product Object Schema**:
```typescript
interface Product {
  source: 'mouser' | 'digikey' | 'tme' | 'farnell'
  mpn: string                    // Part number
  manufacturer: string           
  title: string                  // Название
  description_short: string      
  package: string                // Корпус (TO-220, SOIC-8, etc)
  packaging: string              // Упаковка (Tube, Reel, etc)
  regions: string[]              // ['US', 'EU']
  stock: number                  // В наличии
  min_price: number              // Минимальная цена
  min_currency: 'USD' | 'EUR' | 'GBP'
  min_price_rub: number          // Цена в рублях
  image_url: string | null
  datasheet_url: string | null
  product_url: string
  price_breaks: PriceBreak[]
}

interface PriceBreak {
  qty: number
  price: number
  currency: string
  price_rub: number
}
```

---

### 3. PRODUCT DETAILS

#### GET /api/product/:mpn
**Назначение**: Получить детальную информацию о компоненте

**Request**:
```bash
GET /api/product/ESP32-WROOM-32?provider=mouser
```

**Query Parameters**:
- `provider` (optional): `mouser`, `digikey`, `tme`, `farnell`

**Response**:
```json
{
  "ok": true,
  "product": {
    "source": "mouser",
    "mpn": "ESP32-WROOM-32",
    "manufacturer": "Espressif Systems",
    "title": "WiFi Modules - 802.11 SMD module, ESP32-D0WDQ6 chip, 4MB SPI flash",
    "description_short": "WiFi Modules - 802.11 SMD module, ESP32-D0WDQ6 chip, 4MB SPI flash",
    "package": "",
    "packaging": "",
    "regions": ["US"],
    "stock": 24329,
    "min_price": 3.55,
    "min_currency": "USD",
    "min_price_rub": 289,
    "image_url": "https://www.mouser.com/images/espressifsystems/images/ESP32-WROOM-32_SPL.jpg",
    "datasheet_url": "https://www.mouser.com/datasheet/...",
    "product_url": "https://www.mouser.com/ProductDetail/...",
    "price_breaks": [
      {"qty": 1, "price": 6.35, "currency": "USD", "price_rub": 517},
      {"qty": 10, "price": 5.67, "currency": "USD", "price_rub": 462},
      {"qty": 25, "price": 4.45, "currency": "USD", "price_rub": 362},
      {"qty": 100, "price": 4.32, "currency": "USD", "price_rub": 352},
      {"qty": 250, "price": 4.19, "currency": "USD", "price_rub": 341},
      {"qty": 500, "price": 3.76, "currency": "USD", "price_rub": 306},
      {"qty": 1000, "price": 3.55, "currency": "USD", "price_rub": 289}
    ]
  },
  "alternatives": [
    {
      "source": "tme",
      "mpn": "ESP32-WROOM-32E",
      "stock": 150,
      "min_price_rub": 320
    }
  ]
}
```

---

### 4. VITRINE (Cached Browsing)

#### GET /api/vitrine
**Назначение**: Быстрый просмотр популярных компонентов из кеша (без запросов к провайдерам)

**Request**:
```bash
GET /api/vitrine?category=microcontrollers&limit=20
```

**Query Parameters**:
- `category` (optional): фильтр по категории
- `limit` (optional, default: 50): количество результатов

**Response**:
```json
{
  "ok": true,
  "products": [
    {
      "mpn": "STM32F407VGT6",
      "manufacturer": "STMicroelectronics",
      "title": "ARM Microcontrollers - MCU High-perf...",
      "min_price_rub": 450,
      "stock": 1500,
      "sources": ["mouser", "digikey", "farnell"]
    }
  ],
  "meta": {
    "total": 20,
    "source": "cache",
    "cached_at": "2025-10-10T10:00:00Z"
  }
}
```

---

### 5. CURRENCY RATES

#### GET /api/currency/rates
**Назначение**: Курсы валют от ЦБ РФ

**Request**:
```bash
GET /api/currency/rates
```

**Response**:
```json
{
  "rates": {
    "USD": 81.4103,
    "EUR": 94.703
  },
  "date": "2025-10-10",
  "source": "ЦБ РФ",
  "age_hours": 8,
  "next_update": "2025-10-11T10:00:00Z"
}
```

---

### 6. AUTHENTICATION

#### POST /auth/login
**Назначение**: Локальная аутентификация

**Request**:
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "ok": true,
  "user": {
    "id": 123,
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### GET /auth/google
**Назначение**: OAuth через Google

**Flow**:
```
1. Redirect to: GET /auth/google
2. User authorizes on Google
3. Callback: GET /auth/google/callback
4. Redirect to: /profile or /
```

#### GET /auth/yandex
**Назначение**: OAuth через Yandex

**Flow**: аналогично Google

#### POST /auth/logout
**Назначение**: Выход

**Request**:
```bash
POST /auth/logout
```

**Response**:
```json
{
  "ok": true,
  "message": "Logged out"
}
```

#### GET /auth/me
**Назначение**: Получить текущего пользователя

**Request**:
```bash
GET /auth/me
```

**Response**:
```json
{
  "ok": true,
  "user": {
    "id": 123,
    "email": "user@example.com",
    "role": "user",
    "provider": "google"
  }
}
```

---

### 7. ORDERS (User)

#### GET /api/user/orders
**Назначение**: Список заказов текущего пользователя

**Request**:
```bash
GET /api/user/orders?limit=10&offset=0
```

**Response**:
```json
{
  "ok": true,
  "orders": [
    {
      "id": 1,
      "created_at": "2025-10-10T10:00:00Z",
      "status": "pending",
      "total_rub": 15000,
      "items": [
        {
          "mpn": "ESP32-WROOM-32",
          "qty": 10,
          "price_rub": 289
        }
      ]
    }
  ],
  "meta": {
    "total": 5,
    "limit": 10,
    "offset": 0
  }
}
```

#### POST /api/user/orders
**Назначение**: Создать новый заказ

**Request**:
```bash
POST /api/user/orders
Content-Type: application/json

{
  "items": [
    {
      "mpn": "ESP32-WROOM-32",
      "provider": "mouser",
      "qty": 10,
      "price_rub": 289
    }
  ],
  "notes": "Срочный заказ"
}
```

**Response**:
```json
{
  "ok": true,
  "order": {
    "id": 2,
    "created_at": "2025-10-10T11:00:00Z",
    "status": "pending",
    "total_rub": 2890
  }
}
```

---

### 8. ADMIN ENDPOINTS

#### GET /api/admin/orders
**Требует**: `role: admin`

**Response**: Список всех заказов

#### PATCH /api/admin/orders/:id
**Требует**: `role: admin`

**Request**:
```json
{
  "status": "approved"
}
```

#### GET /api/admin/products
**Требует**: `role: admin`

**Response**: Cached products с возможностью управления

#### GET /api/admin/settings
**Требует**: `role: admin`

**Response**: Системные настройки

---

## 🎨 ДИЗАЙН ТРЕБОВАНИЯ ДЛЯ V0

### Цветовая палитра
```css
:root {
  /* Dark Theme Base */
  --background: #0a0a0f;
  --foreground: #ffffff;
  
  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: rgba(0, 0, 0, 0.3);
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  
  /* Accent Colors */
  --accent-blue: #3498DB;
  --accent-green: #27AE60;
  --accent-red: #E74C3C;
  --accent-orange: #F39C12;
  
  /* Text */
  --muted-foreground: rgba(255, 255, 255, 0.6);
}
```

### Glassmorphism Components
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  transition: all 0.3s ease;
}
```

### Typography
```css
font-family: 'Roboto', sans-serif;

/* Weights */
--font-light: 100;
--font-regular: 400;
--font-medium: 500;
--font-bold: 700;

/* Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### Animations
```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.6s ease-out forwards;
}

/* Scale on Hover */
.hover\:scale-105:hover {
  transform: scale(1.05);
  transition: transform 0.3s ease;
}

/* Loading Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.loader {
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 0.8s linear infinite;
}
```

---

## 📱 СТРУКТУРА СТРАНИЦ

### 1. ГЛАВНАЯ СТРАНИЦА (/)

**Компоненты**:
- Hero section с большим search bar
- Популярные категории (ЧТО ИЩУТ ЛЮДИ)
- Недавние поиски (если авторизован)
- Footer со статусом API

**v0 Prompt**:
```
Create a dark themed landing page for electronics component search with:

1. Header:
   - Logo "ДИПОНИКА" with chip icon
   - Navigation: "Источники", "О нас"
   - Theme toggle button
   - User profile (if logged in)

2. Hero Section:
   - Gradient text: "Поиск для Инженеров и Разработчиков"
   - Subtitle: "Найдите нужные компоненты быстро и эффективно..."
   - Large glassmorphism search box:
     * Search icon on left
     * Placeholder: "Введите номер детали, название или производителя..."
     * Gradient button "Найти" on right
   - Helper text: "Поддерживаем номер детали, часть названия, производителя"

3. Popular Components Section "ЧТО ИЩУТ ЛЮДИ":
   - Grid of 4 cards (glassmorphism):
     * STM32F407VGT6 (Микроконтроллеры) - blue chip icon
     * ESP32-WROOM-32 (Wi-Fi модули) - blue chip icon
     * LM358 (Операционные усилители) - LED icon
     * AMS1117 (Стабилизаторы напряжения) - resistor icon
   - Each card: hover effect, scale on hover

4. Footer:
   - Copyright "© 2025 Components Aggregator"
   - Description: "Агрегатор поиска электронных компонентов"
   - API Status badge (green "онлайн")
   - "Политика" link

Style:
- Dark background (#0a0a0f)
- Glassmorphism cards with backdrop-filter blur
- Gradient buttons (from #667eea to #764ba2)
- Smooth animations (fade-in, scale)
- Roboto font family
- Responsive design
```

**API Integration**:
```typescript
// GET /api/vitrine?limit=4
// Display popular components in grid
```

---

### 2. СТРАНИЦА ПОИСКА (/search?q=...)

**Компоненты**:
- Search box (sticky at top)
- Real-time progress indicators
- Results table with glassmorphism
- Provider badges
- Sorting/filtering controls

**v0 Prompt**:
```
Create a search results page with dark glassmorphism theme:

1. Search Box (sticky top):
   - Same as homepage but compact
   - Show query value
   - Clear button (X)
   - "Найти" button

2. Progress Indicators:
   - Show "Подключение к серверу..." initially
   - Update with "mouser: 50 компонентов" per provider
   - Final: "Найдено 60 результатов"

3. Results Table (glassmorphism card):
   - Columns:
     * Артикул (MPN) - monospace font, blue color
     * Название - truncate with tooltip
     * Производитель
     * Поставщик - badge with provider name
     * В наличии - green if >0, red if 0
     * Цена (₽) - bold, right-aligned
   - Rows:
     * Hover effect: slight background highlight
     * Click: navigate to /product/[mpn]?provider=[source]
     * Alternating subtle background

4. Empty State:
   - Large search icon
   - "Ничего не найдено"
   - "Попробуйте изменить запрос..."

5. Loading State:
   - Fullscreen overlay with spinner
   - Blur background

Style:
- Glassmorphism table with backdrop-filter
- Smooth transitions
- Responsive: mobile shows cards instead of table
```

**API Integration**:
```typescript
// Server-Sent Events: /api/live/search?q=${query}
const eventSource = new EventSource(`/api/live/search?q=${query}`)

// Listen to typed events:
eventSource.addEventListener('result', (e) => {
  const { rows } = JSON.parse(e.data)
  setResults(rows) // Display in table
})

eventSource.addEventListener('provider:partial', (e) => {
  const { provider, count } = JSON.parse(e.data)
  updateProgress(provider, count) // Show progress
})
```

---

### 3. КАРТОЧКА ТОВАРА (/product/[mpn]?provider=...)

**Компоненты**:
- Product header with image
- Price breaks table
- Stock availability
- Provider information
- Datasheet link
- "Add to Order" button
- Alternative offers from other providers

**v0 Prompt**:
```
Create a product detail page with dark glassmorphism theme:

1. Product Header (glassmorphism card):
   - Left: Product image (400x400)
     * Fallback: large chip icon if no image
   - Right:
     * MPN (large, monospace, blue)
     * Manufacturer
     * Title (24px)
     * Description
     * Provider badge (mouser/digikey/tme/farnell)

2. Stock & Availability:
   - Large stock number with icon
   - Green if >100, yellow if 10-100, red if <10
   - "В наличии: 24329 шт"

3. Price Breaks Table (glassmorphism):
   - Columns: Количество | Цена за шт (USD) | Цена за шт (₽) | Сумма (₽)
   - Rows: sorted by qty (1, 10, 25, 100, 250, 500, 1000+)
   - Highlight best price (min qty with lowest price)
   - Click row to select quantity

4. Actions:
   - Quantity input (default: 1)
   - "Добавить в заказ" button (gradient)
   - "Скачать Datasheet" button (secondary)
   - "Открыть у поставщика" link

5. Alternative Offers Section:
   - Title: "Другие предложения"
   - Cards for other providers:
     * Provider name
     * Stock
     * Price
     * "Смотреть" link

6. Specifications (if available):
   - Package type
   - Regions
   - Packaging type

Style:
- Glassmorphism cards with shadows
- Responsive: mobile stacks vertically
- Smooth animations
- Green/yellow/red stock indicators
```

**API Integration**:
```typescript
// GET /api/product/ESP32-WROOM-32?provider=mouser
const { product, alternatives } = await fetch(`/api/product/${mpn}?provider=${provider}`)
  .then(r => r.json())

// Display:
// - product.image_url
// - product.title
// - product.price_breaks[] table
// - product.stock
// - alternatives[] cards
```

---

### 4. ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (/profile)

**Компоненты**:
- User info card
- Order history
- Settings

**v0 Prompt**:
```
Create user profile page with dark glassmorphism:

1. User Info Card:
   - Avatar (gravatar from email)
   - Email
   - Provider (Google/Yandex/Local)
   - Role badge
   - "Выйти" button

2. Orders Section:
   - Title: "Мои заказы"
   - Table/List:
     * Order ID
     * Date
     * Status badge (pending/approved/shipped)
     * Total (₽)
     * Items count
     * Click: expand to show items

3. Empty State:
   - "У вас пока нет заказов"
   - "Начните с поиска компонентов"

Style:
- Glassmorphism cards
- Status badges with colors
- Expandable order rows
```

**API Integration**:
```typescript
// GET /auth/me
const { user } = await fetch('/auth/me').then(r => r.json())

// GET /api/user/orders
const { orders } = await fetch('/api/user/orders').then(r => r.json())
```

---

### 5. СТРАНИЦА ВХОДА (/login)

**Компоненты**:
- Local login form
- OAuth buttons (Google, Yandex)
- Registration link

**v0 Prompt**:
```
Create login page with dark glassmorphism:

1. Login Card (centered):
   - Title: "Вход в систему"
   - Email input
   - Password input
   - "Войти" button (gradient)
   - Divider: "или"
   - OAuth buttons:
     * "Войти через Google" (white button, Google logo)
     * "Войти через Yandex" (red button, Yandex logo)
   - Bottom link: "Нет аккаунта? Регистрация"

2. Background:
   - Dark gradient
   - Animated particles (optional)

Style:
- Centered glassmorphism card
- Large input fields
- OAuth buttons with logos
- Smooth transitions
```

**API Integration**:
```typescript
// POST /auth/login
const login = async (email, password) => {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const { ok, user } = await res.json()
  if (ok) redirect('/profile')
}

// GET /auth/google
const loginGoogle = () => {
  window.location.href = '/auth/google'
}
```

---

## 🔧 NEXT.JS INTEGRATION

### next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    };
  },
  images: {
    remotePatterns: [
      { hostname: 'www.mouser.com' },
      { hostname: 'www.digikey.com' },
      { hostname: 'www.tme.eu' },
      { hostname: 'uk.farnell.com' },
    ],
  },
};

export default nextConfig;
```

### .env.local
```bash
# Backend API (через rewrites, не используется напрямую)
NEXT_PUBLIC_API_URL=http://127.0.0.1:9201

# Next.js port
PORT=3001
```

---

## 📦 PACKAGE.JSON

```json
{
  "name": "deep-agg-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001"
  },
  "dependencies": {
    "next": "^15.5.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 🎯 ИНСТРУКЦИИ ДЛЯ V0.DEV

### Шаг 1: Создать главную страницу

**Prompt для v0**:
```
Create a Next.js 15 dark themed landing page for "ДИПОНИКА" - electronics component search aggregator.

Requirements:
- Dark background (#0a0a0f)
- Glassmorphism design with backdrop-filter blur
- Header: Logo with chip icon, navigation, theme toggle
- Hero: Large gradient title "Поиск для Инженеров и Разработчиков"
- Search box: Glass card with search icon, input, gradient button
- Popular components grid: 4 cards (STM32F407VGT6, ESP32-WROOM-32, LM358, AMS1117)
- Footer: Copyright, API status badge

Style details:
- Font: Roboto
- Primary gradient: from #667eea to #764ba2
- Glass cards: rgba(255,255,255,0.05) with blur(10px)
- Animations: fade-in, hover scale
- Fully responsive
- Use shadcn/ui components
- TypeScript
```

### Шаг 2: Создать страницу поиска

**Prompt для v0**:
```
Create a Next.js 15 search results page for electronics components.

Features:
- Dark glassmorphism theme matching the landing page
- Sticky search box at top
- Real-time Server-Sent Events (SSE) integration
- Progress indicators showing provider status
- Results table with columns: MPN, Title, Manufacturer, Provider, Stock, Price (₽)
- Click row to navigate to product detail
- Empty state: "Ничего не найдено"
- Loading overlay with spinner

Technical:
- Use EventSource for SSE
- Listen to typed events: 'result', 'provider:partial', 'done'
- Parse data.rows[] from 'result' event
- Display provider progress from 'provider:partial'
- Responsive: mobile shows cards instead of table

Example API:
GET /api/live/search?q=ESP32 returns SSE stream with events
```

### Шаг 3: Создать карточку товара

**Prompt для v0**:
```
Create a Next.js 15 product detail page for electronics component.

Layout:
- Product header with image (left) and info (right)
- Stock availability indicator (green/yellow/red)
- Price breaks table with quantity tiers
- Actions: quantity selector, "Add to Order", "Download Datasheet"
- Alternative offers section (other providers)

Data from API:
GET /api/product/ESP32-WROOM-32?provider=mouser

Response contains:
- product.image_url
- product.title, mpn, manufacturer
- product.stock
- product.price_breaks[] array
- alternatives[] array

Style: Dark glassmorphism matching previous pages
```

### Шаг 4: Создать профиль пользователя

**Prompt для v0**:
```
Create user profile page with:
- User info card (avatar, email, provider, role)
- Orders history table
- Logout button

API:
- GET /auth/me for user info
- GET /api/user/orders for orders list

Style: Dark glassmorphism
```

### Шаг 5: Создать страницу входа

**Prompt для v0**:
```
Create login page with:
- Centered glassmorphism card
- Email/password inputs
- Local login button
- OAuth buttons for Google and Yandex
- Registration link

API:
- POST /auth/login for local auth
- GET /auth/google for Google OAuth
- GET /auth/yandex for Yandex OAuth

Style: Dark glassmorphism, centered layout
```

---

## 🔗 NAVIGATION FLOW

```
/ (Home)
├── /search?q=... (Search Results)
│   └── /product/[mpn]?provider=... (Product Detail)
│       └── /profile (after adding to order)
│           └── /profile (Order History)
├── /login (Login)
│   └── /profile (after login)
└── /register (Register)
    └── /login (after register)
```

---

## 📝 ПОЛНЫЙ CHECKLIST ДЛЯ V0

### Frontend Components to Generate

- [ ] **Layout Components**
  - [ ] Header with logo and navigation
  - [ ] Footer with API status
  - [ ] Dark theme provider
  - [ ] Glassmorphism card wrapper

- [ ] **Pages**
  - [ ] Homepage (/) with search and popular components
  - [ ] Search results (/search) with SSE
  - [ ] Product detail (/product/[mpn])
  - [ ] User profile (/profile)
  - [ ] Login (/login)
  - [ ] Register (/register)

- [ ] **UI Components**
  - [ ] Search box (reusable)
  - [ ] Product card
  - [ ] Price breaks table
  - [ ] Provider badge
  - [ ] Stock indicator
  - [ ] Loading spinner
  - [ ] Empty state
  - [ ] OAuth buttons

- [ ] **API Integration**
  - [ ] SSE EventSource setup
  - [ ] Typed event listeners
  - [ ] Error handling
  - [ ] Loading states

---

## 🚀 DEPLOYMENT AFTER V0

### 1. Copy generated code from v0.dev

### 2. Setup Next.js project
```bash
npx create-next-app@latest deep-agg-frontend --typescript --tailwind --app
cd deep-agg-frontend
```

### 3. Install dependencies
```bash
npm install
```

### 4. Add v0 generated components
- Copy components to `src/components/`
- Copy pages to `src/app/`

### 5. Configure rewrites in `next.config.ts`

### 6. Add environment variables `.env.local`

### 7. Build and test
```bash
npm run dev
# Open http://localhost:3001
```

### 8. Production build
```bash
npm run build
npm start
```

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

### Backend Repository
https://github.com/offflinerpsy/components-aggregator

### Key Files to Reference
- `server.js` - Main Express server with all routes
- `api/live-search.mjs` - SSE implementation
- `src/search/providerOrchestrator.mjs` - Multi-provider search
- `src/integrations/` - Provider API clients

### Testing Endpoints
```bash
# Health check
curl http://127.0.0.1:9201/api/health

# Search
curl -N http://127.0.0.1:9201/api/live/search?q=ESP32

# Product
curl http://127.0.0.1:9201/api/product/ESP32-WROOM-32?provider=mouser

# Vitrine
curl http://127.0.0.1:9201/api/vitrine?limit=10
```

---

## ✅ FINAL V0 PROMPT TEMPLATE

```
I'm building a Next.js 15 frontend for an electronics components search aggregator. The backend is Express.js API running on http://127.0.0.1:9201.

Design Requirements:
- Dark theme (#0a0a0f background)
- Glassmorphism cards with backdrop-filter blur
- Primary gradient: from #667eea to #764ba2
- Font: Roboto
- Smooth animations (fade-in, scale on hover)
- Fully responsive

Backend API uses:
- Server-Sent Events for real-time search
- Typed SSE events: 'result', 'provider:partial', 'search:start', 'done'
- JSON responses with {ok, data} structure

Please generate [SPECIFIC PAGE/COMPONENT] with:
[DETAILED REQUIREMENTS FROM SECTIONS ABOVE]

Include:
- TypeScript types
- Error handling
- Loading states
- Empty states
- shadcn/ui components where applicable
```

---

**Дата создания**: 2025-10-10  
**Версия**: 1.0  
**Автор**: GitHub Copilot  
**Backend Repository**: https://github.com/offflinerpsy/components-aggregator