# 📋 КАК ИСПОЛЬЗОВАТЬ V0.DEV ДЛЯ ГЕНЕРАЦИИ ФРОНТЕНДА

## 🎯 ЧТО ДЕЛАТЬ

### Шаг 1: Откройте v0.dev
Перейдите на https://v0.dev и авторизуйтесь (нужен аккаунт Vercel)

### Шаг 2: Дайте ссылку на Backend
Используйте этот текст в начале промпта:

```
Backend API repository: https://github.com/offflinerpsy/components-aggregator

Full API documentation here: 
https://github.com/offflinerpsy/components-aggregator/blob/main/docs/V0-INTEGRATION-GUIDE.md

This is an electronics components search aggregator with Express.js backend (port 9201) 
that needs Next.js 15 frontend with dark glassmorphism theme.
```

### Шаг 3: Генерируйте страницы по очереди

#### 3.1 Главная страница
Скопируйте в v0:
```
Create a Next.js 15 dark themed landing page for "ДИПОНИКА" electronics search.

Reference: https://github.com/offflinerpsy/components-aggregator/blob/main/docs/V0-INTEGRATION-GUIDE.md#1-главная-страница-

Requirements:
- Dark background (#0a0a0f)
- Glassmorphism design (backdrop-filter blur, rgba(255,255,255,0.05))
- Header: Logo "ДИПОНИКА" with chip icon, navigation menu
- Hero section:
  * Gradient title: "Поиск для Инженеров и Разработчиков"
  * Large search box (glassmorphism card)
  * Search icon + input + gradient button "Найти"
- Popular components grid (4 cards):
  * STM32F407VGT6 (Микроконтроллеры)
  * ESP32-WROOM-32 (Wi-Fi модули)
  * LM358 (Операционные усилители)
  * AMS1117 (Стабилизаторы напряжения)
- Footer: Copyright, API status badge

Style:
- Font: Roboto
- Primary gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
- Glassmorphism cards with hover effects
- Fade-in animations
- Fully responsive
- Use shadcn/ui components
```

#### 3.2 Страница поиска
Скопируйте в v0:
```
Create Next.js 15 search results page for electronics components.

Backend API: Server-Sent Events (SSE) at GET /api/live/search?q=...
Full docs: https://github.com/offflinerpsy/components-aggregator/blob/main/docs/V0-INTEGRATION-GUIDE.md#2-search-real-time-sse

CRITICAL SSE Implementation:
```typescript
const eventSource = new EventSource(`/api/live/search?q=${query}`)

// Backend sends TYPED events (not generic 'message'):
eventSource.addEventListener('result', (e) => {
  const { rows } = JSON.parse(e.data) // rows[] is the products array
  setResults(rows)
})

eventSource.addEventListener('provider:partial', (e) => {
  const { provider, count } = JSON.parse(e.data)
  showProgress(`${provider}: ${count} компонентов`)
})

eventSource.addEventListener('done', () => {
  eventSource.close()
})
```

UI Requirements:
- Sticky search box at top
- Real-time progress: "mouser: 50 компонентов"
- Results table (glassmorphism):
  * Columns: Артикул | Название | Производитель | Поставщик | В наличии | Цена (₽)
  * Click row → navigate to /product/[mpn]?provider=[source]
- Empty state: search icon + "Ничего не найдено"
- Loading overlay with spinner

Product schema:
{
  source: string,          // 'mouser' | 'digikey' | 'tme' | 'farnell'
  mpn: string,            // Part number
  manufacturer: string,
  title: string,
  stock: number,
  min_price_rub: number,
  image_url: string | null
}

Style: Dark glassmorphism matching homepage
```

#### 3.3 Карточка товара
Скопируйте в v0:
```
Create Next.js 15 product detail page.

API: GET /api/product/[mpn]?provider=mouser
Docs: https://github.com/offflinerpsy/components-aggregator/blob/main/docs/V0-INTEGRATION-GUIDE.md#3-product-details

Response structure:
{
  product: {
    mpn: string,
    manufacturer: string,
    title: string,
    image_url: string | null,
    stock: number,
    min_price_rub: number,
    price_breaks: [{qty: number, price: number, currency: string, price_rub: number}],
    datasheet_url: string | null,
    product_url: string
  },
  alternatives: [{source: string, mpn: string, stock: number, min_price_rub: number}]
}

Layout:
- Product header (glassmorphism):
  * Left: Image (400x400, fallback to chip icon)
  * Right: MPN, manufacturer, title, provider badge
- Stock indicator: green if >100, yellow 10-100, red <10
- Price breaks table:
  * Columns: Количество | Цена (USD) | Цена (₽) | Сумма
  * Highlight best price
- Actions:
  * Quantity input
  * "Добавить в заказ" button (gradient)
  * "Скачать Datasheet" link
- Alternative offers (cards for other providers)

Style: Dark glassmorphism
```

#### 3.4 Профиль пользователя
```
Create user profile page.

APIs:
- GET /auth/me → {user: {id, email, provider, role}}
- GET /api/user/orders → {orders: [{id, created_at, status, total_rub, items}]}

Layout:
- User info card: avatar, email, provider badge, role, logout button
- Orders section:
  * Table: ID | Date | Status | Total (₽) | Items count
  * Status badges: pending (yellow), approved (green), shipped (blue)
  * Click to expand items

Empty state: "У вас пока нет заказов"

Style: Dark glassmorphism
```

#### 3.5 Страница входа
```
Create login page.

APIs:
- POST /auth/login (email, password)
- GET /auth/google (OAuth redirect)
- GET /auth/yandex (OAuth redirect)

Layout (centered card):
- Title: "Вход в систему"
- Email input
- Password input
- "Войти" button (gradient)
- Divider: "или"
- OAuth buttons:
  * "Войти через Google" (white, Google logo)
  * "Войти через Yandex" (red, Yandex logo)
- Link: "Нет аккаунта? Регистрация"

Style: Dark glassmorphism, centered
```

### Шаг 4: Соберите проект

После генерации всех компонентов:

1. **Создайте Next.js проект**:
   ```bash
   npx create-next-app@latest deep-agg-frontend --typescript --tailwind --app
   cd deep-agg-frontend
   ```

2. **Скопируйте код из v0**:
   - Страницы → `src/app/`
   - Компоненты → `src/components/`

3. **Настройте `next.config.ts`**:
   ```typescript
   const nextConfig: NextConfig = {
     async rewrites() {
       return {
         beforeFiles: [
           { source: '/api/:path*', destination: 'http://127.0.0.1:9201/api/:path*' },
           { source: '/auth/:path*', destination: 'http://127.0.0.1:9201/auth/:path*' }
         ]
       }
     }
   }
   ```

4. **Добавьте `.env.local`**:
   ```
   PORT=3001
   ```

5. **Запустите**:
   ```bash
   npm run dev
   ```

---

## 🎨 КЛЮЧЕВЫЕ СТИЛИ ДЛЯ V0

Всегда упоминайте в промптах:

```
Style Requirements:
- Dark theme: background #0a0a0f
- Glassmorphism: rgba(255,255,255,0.05) with backdrop-filter blur(10px)
- Primary gradient: from #667eea to #764ba2
- Font: Roboto
- Animations: fade-in (0.6s), hover scale (1.05)
- Border: 1px solid rgba(255,255,255,0.1)
- Shadow: 0 8px 32px rgba(0,0,0,0.3)
- Hover: background rgba(255,255,255,0.08), translateY(-2px)
```

---

## ⚠️ КРИТИЧНЫЕ МОМЕНТЫ

### SSE Integration (ОЧЕНЬ ВАЖНО!)
```typescript
// ❌ НЕ ТАК (v0 может сгенерировать неправильно):
eventSource.addEventListener('message', ...)
eventSource.addEventListener('data', ...)

// ✅ ТАК (правильно):
eventSource.addEventListener('result', (e) => {
  const { rows } = JSON.parse(e.data) // rows[], НЕ results[]!
})

eventSource.addEventListener('provider:partial', (e) => {
  const { provider, count } = JSON.parse(e.data)
})

eventSource.addEventListener('done', () => {
  eventSource.close()
})
```

### API Rewrites
Все запросы к `/api/*` и `/auth/*` автоматически проксируются в backend через Next.js rewrites.  
**НЕ нужно** указывать `http://127.0.0.1:9201` в fetch!

```typescript
// ✅ Правильно:
fetch('/api/health')
fetch('/api/product/ESP32?provider=mouser')

// ❌ Неправильно:
fetch('http://127.0.0.1:9201/api/health')
```

---

## 📝 ШПАРГАЛКА ПРОМПТОВ

### Базовый промпт для любой страницы:
```
I'm building Next.js 15 frontend for electronics search aggregator.

Backend: https://github.com/offflinerpsy/components-aggregator
API Docs: https://github.com/offflinerpsy/components-aggregator/blob/main/docs/V0-INTEGRATION-GUIDE.md

Design: Dark glassmorphism theme
- Background: #0a0a0f
- Glass cards: rgba(255,255,255,0.05) + blur(10px)
- Gradient: from #667eea to #764ba2
- Font: Roboto

Generate [PAGE NAME] with:
[SPECIFIC REQUIREMENTS]
```

---

## 🚀 ЧТО ПОЛУЧИТСЯ

После работы с v0 вы получите:
- ✅ Полностью рабочий Next.js 15 фронтенд
- ✅ Темный glassmorphism дизайн
- ✅ Интеграция с вашим backend через rewrites
- ✅ SSE real-time поиск
- ✅ Все страницы (главная, поиск, товар, профиль, вход)
- ✅ TypeScript типы
- ✅ Responsive дизайн
- ✅ shadcn/ui компоненты

Время работы: ~2-4 часа (генерация + интеграция)

---

**Полная документация**: `docs/V0-INTEGRATION-GUIDE.md`  
**Backend Repository**: https://github.com/offflinerpsy/components-aggregator