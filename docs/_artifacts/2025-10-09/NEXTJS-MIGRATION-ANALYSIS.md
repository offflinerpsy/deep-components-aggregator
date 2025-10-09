# Deep-Agg → Next.js 15 Migration Analysis

**Date**: 2025-10-09  
**Analyst**: Tech Lead Mode  
**Question**: Можно ли перенести Deep-Agg на стек Investment (Next.js 15)?

---

## EXECUTIVE SUMMARY

**Вердикт**: 🔴 **НЕ РЕКОМЕНДУЕТСЯ** в текущей ситуации

**Краткий ответ**: Next.js 15 — отличный современный стек, НО для Deep-Agg миграция будет **нецелесообразна** из-за:
- Огромного объёма работы (3-6 месяцев full-time)
- Несовместимости архитектурных паттернов
- Критической зависимости от real-time integrations
- Риска потери функциональности

**Рекомендация**: Оставить Deep-Agg на текущем стеке (Express.js + ESM) и **постепенно модернизировать** его, либо использовать **гибридный подход**.

---

## СРАВНЕНИЕ СТЕКОВ

### Current: Deep-Agg (Express.js + ESM)

**Stack**:
```
Backend:  Express.js 4.18
Runtime:  Node.js (ESM modules)
Database: SQLite (better-sqlite3)
Auth:     Passport.js
Session:  express-session + SQLite
UI:       Vanilla JS + CSS
API:      REST + SSE (Server-Sent Events)
```

**Dependencies** (40+ packages):
- express, passport, better-sqlite3
- API clients: TME, Mouser, Farnell, DigiKey
- Utilities: cheerio, xml-parser, cyrillic-to-translit
- Monitoring: prom-client, pino
- Testing: vitest, playwright

**Architecture**:
- Monolithic backend server
- Static file serving
- Real-time SSE streams
- Multiple external API integrations
- Complex search orchestration
- Currency conversion (CBR API)

---

### Target: Investment (Next.js 15)

**Stack**:
```
Framework: Next.js 15.2.4
Runtime:   Node.js + React 19
Database:  None (или можно добавить)
UI:        React + Tailwind CSS
Rendering: SSR + SSG + ISR
API:       Next.js API Routes
```

**Dependencies** (60+ packages):
- next, react, react-dom
- UI: Radix UI, Tailwind, Framer Motion
- Charts: Chart.js, ECharts, Recharts
- 3D: Three.js, React Three Fiber
- Forms: React Hook Form, Zod
- TypeScript support

**Architecture**:
- App Router (Next.js 15)
- React Server Components
- Client Components
- API Routes
- Static generation
- Modern UI components

---

## DETAILED COMPARISON

| Aspect | Deep-Agg (Current) | Next.js 15 (Target) | Compatibility |
|--------|-------------------|---------------------|---------------|
| **Language** | JavaScript (ESM) | TypeScript/JavaScript | ✅ Compatible |
| **Rendering** | Server-side (Express) | SSR/SSG/ISR | ⚠️ Need adaptation |
| **Database** | SQLite (sync) | Any (async preferred) | ⚠️ Need rewrite |
| **Auth** | Passport.js | NextAuth or custom | ❌ Full rewrite |
| **Session** | express-session | NextAuth session | ❌ Full rewrite |
| **API** | REST endpoints | API Routes | ⚠️ Need migration |
| **Real-time** | SSE (Server-Sent Events) | SSE/WebSockets | ⚠️ Complex |
| **Static Files** | Express static | Next.js public/ | ✅ Easy |
| **CSS** | Vanilla CSS | Tailwind CSS | ⚠️ Full rewrite |
| **UI** | Vanilla JS | React Components | ❌ Full rewrite |
| **Forms** | HTML forms | React Hook Form | ❌ Full rewrite |
| **State** | Server-side | React state | ❌ Full rewrite |
| **Deployment** | PM2 + Node | Vercel/PM2 | ✅ Compatible |

---

## MIGRATION COMPLEXITY ANALYSIS

### 🔴 Critical Blockers

#### 1. **Real-time SSE Streams**
**Current**: 
```javascript
// server.js - SSE для live search
app.get('/api/search/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  // Stream results from multiple providers
});
```

**Problem**: Next.js API Routes не поддерживают long-lived connections by default.  
**Solution**: Нужен отдельный WebSocket сервер или Edge Functions (сложно).

**Impact**: 🔴 HIGH - критичная функциональность

---

#### 2. **Синхронная SQLite База**
**Current**:
```javascript
import Database from 'better-sqlite3';
const db = new Database('data.db');
const row = db.prepare('SELECT * FROM cache WHERE key = ?').get(key);
```

**Problem**: Next.js предпочитает async операции, better-sqlite3 — синхронная.  
**Solution**: Переписать на async (Prisma, Drizzle) или использовать workers.

**Impact**: 🔴 HIGH - 14,631 строк кода используют SQLite

---

#### 3. **Passport.js Authentication**
**Current**:
```javascript
passport.use(new LocalStrategy(...));
passport.use(new GoogleStrategy(...));
app.use(passport.initialize());
app.use(passport.session());
```

**Problem**: Passport.js не интегрируется с Next.js из коробки.  
**Solution**: Полная миграция на NextAuth.js или custom auth.

**Impact**: 🟡 MEDIUM - нужно переписать весь auth flow

---

#### 4. **Vanilla JS UI → React**
**Current**:
```html
<!-- 6,923 файлов - HTML + Vanilla JS -->
<script>
  document.getElementById('search').addEventListener('click', () => {
    fetch('/api/search?q=' + query).then(r => r.json());
  });
</script>
```

**Problem**: Весь UI написан на Vanilla JS, нет компонентов React.  
**Solution**: Полностью переписать на React компоненты.

**Impact**: 🔴 CRITICAL - огромный объём работы

---

### 🟡 Major Challenges

#### 5. **7 External API Integrations**
**Current**:
- TME (Poland)
- Mouser (USA)
- Farnell (UK)
- DigiKey (USA)
- ChipDip (Russia)
- Promelec (Russia)
- OEMsTrade

**Problem**: Все интеграции используют custom HTTP clients с proxy support.  
**Solution**: Нужно адаптировать под Next.js API Routes (возможно).

**Impact**: 🟡 MEDIUM - можно мигрировать, но долго

---

#### 6. **Express Middleware**
**Current**:
```javascript
app.use(express.json());
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(rateLimiter);
```

**Problem**: Next.js не использует Express middleware напрямую.  
**Solution**: Переписать на Next.js middleware.

**Impact**: 🟡 MEDIUM - нужно адаптировать все middleware

---

### 🟢 Easy to Migrate

#### 7. **Static Files & CSS**
**Current**: `/public/*.html`, `/public/styles/*.css`  
**Next.js**: `/public/` folder + CSS Modules or Tailwind

**Impact**: 🟢 LOW - легко перенести

---

#### 8. **Environment Variables**
**Current**: `.env` с dotenv  
**Next.js**: `.env.local` (нативная поддержка)

**Impact**: 🟢 LOW - легко адаптировать

---

## EFFORT ESTIMATION

### Total Migration Effort: **600-1200 hours** (3-6 месяцев full-time)

| Task | Effort | Complexity |
|------|--------|------------|
| **1. Setup Next.js project** | 8h | 🟢 Easy |
| **2. Migrate database layer** | 80h | 🔴 Hard |
| **3. Rewrite auth (Passport → NextAuth)** | 40h | 🟡 Medium |
| **4. Migrate API routes (12 routes)** | 60h | 🟡 Medium |
| **5. Migrate 7 provider integrations** | 140h | 🟡 Medium |
| **6. Rewrite UI (HTML → React)** | 200h | 🔴 Very Hard |
| **7. Migrate SSE to WebSockets** | 60h | 🔴 Hard |
| **8. Rewrite all middleware** | 40h | 🟡 Medium |
| **9. Testing & QA** | 100h | 🟡 Medium |
| **10. Documentation** | 20h | 🟢 Easy |
| **11. Deployment & DevOps** | 20h | 🟢 Easy |
| **12. Bug fixes & stabilization** | 100h | 🟡 Medium |

**TOTAL**: ~868 hours (минимум)

---

## PROS & CONS

### ✅ Pros of Next.js 15

1. **Modern Stack**: React 19, TypeScript, современные подходы
2. **Better DX**: Hot reload, fast refresh, типизация
3. **SEO**: SSR из коробки (но Deep-Agg — B2B приложение, SEO не критично)
4. **UI Components**: Radix UI, Tailwind — быстрая разработка UI
5. **Performance**: Оптимизации Next.js (code splitting, lazy loading)
6. **Ecosystem**: Огромное комьюнити, много готовых решений
7. **TypeScript**: Лучшая типизация и безопасность

### ❌ Cons of Migration

1. **ОГРОМНЫЙ объём работы**: 3-6 месяцев переписывания
2. **Риск потери функциональности**: SSE, real-time поиск
3. **Сложная миграция БД**: SQLite sync → async
4. **Breaking changes**: Полная переработка архитектуры
5. **Технический долг**: Новые проблемы в процессе миграции
6. **Обучение команды**: Нужно знать React, Next.js, TypeScript
7. **Нет ROI**: Deep-Agg работает на текущем стеке

---

## ALTERNATIVES TO FULL MIGRATION

### Option 1: 🟢 **Hybrid Approach** (RECOMMENDED)

**Идея**: Оставить Deep-Agg на Express, но добавить Next.js для frontend.

**Architecture**:
```
┌─────────────────────────────────────────┐
│  Frontend: Next.js 15 (port 3001)       │
│  - React UI components                   │
│  - Tailwind CSS                          │
│  - Modern UX                             │
└──────────────┬──────────────────────────┘
               │ API calls (REST)
               ↓
┌─────────────────────────────────────────┐
│  Backend: Express (port 9201)            │
│  - API endpoints                         │
│  - Database (SQLite)                     │
│  - Auth (Passport)                       │
│  - Integrations (TME, Mouser, etc.)      │
│  - SSE streams                           │
└─────────────────────────────────────────┘
```

**Benefits**:
- ✅ Сохраняем всю backend логику
- ✅ Получаем современный UI (React + Tailwind)
- ✅ Постепенная миграция (можно начать с одной страницы)
- ✅ Меньше рисков

**Effort**: ~200h (1-2 месяца part-time)

---

### Option 2: 🟡 **Incremental Modernization**

**Идея**: Модернизировать текущий стек, не меняя Express.

**Changes**:
1. ✅ Добавить TypeScript (постепенно)
2. ✅ Улучшить UI (Alpine.js или htmx вместо Vanilla JS)
3. ✅ Добавить Tailwind CSS к существующим HTML
4. ✅ Улучшить dev experience (Vite для bundling)
5. ✅ Оставить Express + SQLite + Passport

**Benefits**:
- ✅ Минимальные изменения
- ✅ Сохраняем всю работающую логику
- ✅ Постепенное улучшение

**Effort**: ~100h (1 месяц part-time)

---

### Option 3: 🟡 **Migrate Only Admin Panel**

**Идея**: Перенести только admin панель на Next.js, остальное — на Express.

**Architecture**:
```
Deep-Agg (Express, port 9201)
  ├── /api/*           → API endpoints
  ├── /search          → Search page (Express)
  ├── /product/*       → Product pages (Express)
  └── /admin/* → Proxy → Next.js Admin (port 3002)
```

**Benefits**:
- ✅ Небольшой scope
- ✅ Тестируем Next.js на меньшем объёме
- ✅ Админка получает современный UI

**Effort**: ~150h (1.5 месяца part-time)

---

### Option 4: 🔴 **Full Migration** (NOT RECOMMENDED)

**Идея**: Полностью переписать Deep-Agg на Next.js 15.

**Effort**: 600-1200h (3-6 месяцев full-time)  
**Risk**: 🔴 VERY HIGH  
**ROI**: ❌ LOW (текущий стек работает)

---

## DECISION MATRIX

| Option | Effort | Risk | Modern Stack | Keep Features | ROI |
|--------|--------|------|--------------|---------------|-----|
| **1. Hybrid** | 🟡 Medium (200h) | 🟢 Low | ✅ Yes | ✅ Yes | ✅ High |
| **2. Incremental** | 🟢 Low (100h) | 🟢 Low | ⚠️ Partial | ✅ Yes | ✅ High |
| **3. Admin Only** | 🟡 Medium (150h) | 🟡 Medium | ✅ Yes | ✅ Yes | 🟡 Medium |
| **4. Full Migration** | 🔴 Very High (800h) | 🔴 Very High | ✅ Yes | ❌ Risky | ❌ Low |

---

## RECOMMENDATION

### 🎯 **Best Approach: Hybrid (Option 1)**

**Plan**:

1. **Phase 1**: Setup Next.js frontend (2 weeks)
   - Create Next.js app on port 3001
   - Basic routing and layout
   - Tailwind CSS + Radix UI

2. **Phase 2**: Migrate search page (2 weeks)
   - React components for search
   - API calls to Express backend
   - SSE integration

3. **Phase 3**: Migrate product pages (2 weeks)
   - Product card components
   - Product details page
   - Shopping cart UI

4. **Phase 4**: Migrate admin panel (3 weeks)
   - Admin dashboard
   - Orders management
   - Settings UI

5. **Phase 5**: Auth integration (1 week)
   - NextAuth or proxy to Express auth
   - Session sharing

**Total**: ~10 weeks (2.5 месяца)

---

## TECH LEAD RECOMMENDATION

### 🚦 **GO / NO-GO Decision**

**Question**: Переносить ли Deep-Agg на Next.js 15?

**Answer**: 🔴 **NO-GO for full migration**

**Reasoning**:

1. **Deep-Agg работает на текущем стеке** → нет критической необходимости
2. **Огромный scope** → 600-1200 часов работы
3. **Высокий риск** → потеря функциональности (SSE, real-time)
4. **Нет ROI** → текущий стек достаточно хорош

**Instead**:

✅ **GO for Hybrid Approach** (Option 1)
- Оставить Express backend
- Добавить Next.js frontend
- Постепенная миграция UI
- Сохранение всех backend фич

---

## NEXT STEPS

### If GO for Hybrid:

1. **Week 1**: Create `/opt/deep-agg-next` project
   ```bash
   npx create-next-app@latest deep-agg-next
   cd deep-agg-next
   npm install
   ```

2. **Week 1**: Setup basic routing
   - `/` → Home
   - `/search` → Search page
   - `/product/[id]` → Product page
   - `/admin` → Admin panel

3. **Week 2**: Create API proxy
   ```javascript
   // next.config.js
   rewrites: async () => [{
     source: '/api/:path*',
     destination: 'http://localhost:9201/api/:path*'
   }]
   ```

4. **Week 2-3**: Migrate search page
   - React components
   - Tailwind styling
   - SSE integration

5. **Week 4+**: Continue migration page by page

---

## CONCLUSION

**TL;DR**:

❌ **Полная миграция на Next.js 15**: НЕ РЕКОМЕНДУЕТСЯ
- Слишком большой scope (800+ часов)
- Высокий риск потери функциональности
- Нет ROI

✅ **Гибридный подход** (Next.js frontend + Express backend): РЕКОМЕНДУЕТСЯ
- Меньше работы (~200 часов)
- Низкий риск
- Получаем современный UI
- Сохраняем всю backend логику

🟡 **Инкрементальная модернизация**: Альтернатива
- Минимальные изменения (~100 часов)
- Добавить TypeScript, Tailwind к текущему стеку

---

**Final Verdict**: 

Стек Next.js 15 — **отличный и современный**, НО для Deep-Agg **полная миграция нецелесообразна**. 

**Лучшее решение**: **Гибридный подход** — Next.js для UI, Express для backend.

---

**Questions?**
- See `/opt/deep-agg/docs/_artifacts/2025-10-09/`
- Tech Lead Mode: Available for discussion

**Created**: 2025-10-09  
**Status**: Recommendation ready for decision
