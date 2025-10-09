# Deep-Agg Full Migration: Express → Next.js 15

**Date**: 2025-10-10  
**Mode**: TECH LEAD EXTREME PERFORMANCE 🔥  
**Objective**: Полная миграция на Next.js 15 без потери функционала

---

## 🎯 СТРАТЕГИЯ

### Принципы:
1. **Маленькие диффы** — каждый коммит откатываемый
2. **Git после каждого шага** — rollback в любой момент
3. **Тестирование после каждой фазы** — ничего не ломаем
4. **Современный код** — TypeScript, RSC, App Router
5. **Решения для блокеров** — гуглим, находим, тестируем

### Блокеры и решения:

| Блокер | Решение | Источник |
|--------|---------|----------|
| **SSE long-lived** | ReadableStream + Edge Runtime в Next.js 15 | [Next.js Docs](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming) |
| **SQLite sync** | better-sqlite3 работает в Node.js runtime | [GitHub examples](https://github.com/vercel/next.js/discussions/48324) |
| **Passport.js** | NextAuth.js v5 с custom providers | [NextAuth Docs](https://next-auth.js.org/) |

---

## 📊 ФАЗЫ МИГРАЦИИ

### PHASE 0: Git Setup + Точка отката ✅ (5 мин)

**Цель**: Создать безопасную среду для миграции

**Действия**:
```bash
cd /opt/deep-agg
git checkout -b migration/nextjs-full
git add -A
git commit -m "chore: snapshot before Next.js migration"

cd /opt/deep-agg-next
git init
echo "node_modules/\n.next/\n.env.local\n*.log" > .gitignore
git add -A
git commit -m "feat: initial Next.js 15 setup"
```

**Точка отката**: `git checkout main` в /opt/deep-agg

**Тест**: `git log --oneline | head -5`

---

### PHASE 1: UI Foundation (Дизайн-система) (30 мин)

**Цель**: Перенести design-system.css и layout в Next.js

**Файлы**:
- `/opt/deep-agg/public/styles/design-system.css` → `/opt/deep-agg-next/src/app/globals.css`
- Создать `/opt/deep-agg-next/src/app/layout.tsx` с sidebar
- Создать `/opt/deep-agg-next/src/components/ui/` для компонентов

**Diff**:
```typescript
// src/app/layout.tsx
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">{children}</main>
      </body>
    </html>
  )
}
```

**Git**: `git commit -m "feat(ui): add design system and layout"`

**Тест**: `npm run dev`, открыть http://localhost:3001, проверить стили

**Точка отката**: `git revert HEAD`

---

### PHASE 2: Главная страница (45 мин)

**Цель**: Конвертировать index.html → page.tsx

**Файлы**:
- `/opt/deep-agg/public/index.html` → `/opt/deep-agg-next/src/app/page.tsx`
- Создать компоненты: SearchForm, StatsCards, RecentOrders

**Diff**:
```typescript
// src/app/page.tsx
import SearchForm from '@/components/SearchForm'
import StatsCards from '@/components/StatsCards'

export default async function HomePage() {
  return (
    <div className="dashboard-content">
      <h1>ДИПОНИКА</h1>
      <SearchForm />
      <StatsCards />
    </div>
  )
}
```

**Git**: `git commit -m "feat(pages): convert index.html to Next.js page"`

**Тест**: Главная страница рендерится, стили работают

**Точка отката**: `git revert HEAD`

---

### PHASE 3: SQLite подключение (20 мин)

**Цель**: Настроить better-sqlite3 в Next.js

**Установка**:
```bash
cd /opt/deep-agg-next
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

**Файлы**:
```typescript
// src/lib/db.ts
import Database from 'better-sqlite3'

const db = new Database('/opt/deep-agg/data/db/deep-agg.db', {
  readonly: false,
  fileMustExist: true
})

db.pragma('journal_mode = WAL')

export default db
```

**Git**: `git commit -m "feat(db): add SQLite connection with better-sqlite3"`

**Тест**: 
```typescript
// test query
const row = db.prepare('SELECT COUNT(*) as count FROM products').get()
console.log('Products count:', row.count)
```

**Точка отката**: `git revert HEAD`

---

### PHASE 4: Search API + SSE (60 мин)

**Цель**: Портировать /api/search с SSE

**Решение SSE**: Next.js 15 поддерживает streaming через ReadableStream

**Файлы**:
```typescript
// src/app/api/search/route.ts
import { NextRequest } from 'next/server'
import db from '@/lib/db'

export const runtime = 'nodejs' // Для better-sqlite3

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  
  // Обычный JSON response
  const results = db.prepare(`
    SELECT * FROM products WHERE title LIKE ? LIMIT 50
  `).all(`%${query}%`)
  
  return Response.json({ results })
}
```

**SSE Support** (если нужен):
```typescript
// src/app/api/search/stream/route.ts
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send SSE events
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({type: 'start'})}\n\n`))
      
      // Search providers
      const results = await searchProviders(query)
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(results)}\n\n`))
      controller.close()
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

**Git**: `git commit -m "feat(api): add search API with SSE streaming"`

**Тест**: `curl http://localhost:3001/api/search?q=resistor`

**Точка отката**: `git revert HEAD`

---

### PHASE 5: Provider Integrations (90 мин)

**Цель**: Портировать adapters/providers (TME, Mouser, Farnell)

**Файлы**:
- `/opt/deep-agg/adapters/providers/tme.js` → `/opt/deep-agg-next/src/lib/providers/tme.ts`
- Аналогично для Mouser, Farnell, DigiKey, ChipDip

**Структура**:
```
/opt/deep-agg-next/src/lib/providers/
├── index.ts          # Экспорт всех провайдеров
├── tme.ts            # TME adapter
├── mouser.ts         # Mouser adapter
├── farnell.ts        # Farnell adapter
└── types.ts          # TypeScript types
```

**Diff**:
```typescript
// src/lib/providers/tme.ts
import { SearchResult, Provider } from './types'

export const TMEProvider: Provider = {
  name: 'TME',
  search: async (query: string): Promise<SearchResult[]> => {
    const response = await fetch(`https://api.tme.eu/search?q=${query}`, {
      headers: { 'Authorization': `Bearer ${process.env.TME_TOKEN}` }
    })
    const data = await response.json()
    return data.results.map(normalizeResult)
  }
}
```

**Git**: `git commit -m "feat(providers): port TME, Mouser, Farnell adapters to TypeScript"`

**Тест**: Запрос к каждому провайдеру, проверка результатов

**Точка отката**: `git revert HEAD`

---

### PHASE 6: Auth (NextAuth.js v5) (60 мин)

**Цель**: Заменить Passport.js на NextAuth.js

**Установка**:
```bash
npm install next-auth@beta
npm install @auth/better-sqlite3-adapter
```

**Файлы**:
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { BetterSQLite3Adapter } from '@auth/better-sqlite3-adapter'
import db from '@/lib/db'

const handler = NextAuth({
  adapter: BetterSQLite3Adapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  ],
  session: { strategy: 'database' }
})

export { handler as GET, handler as POST }
```

**Миграция сессий**: Конвертировать таблицы из Passport → NextAuth schema

**Git**: `git commit -m "feat(auth): migrate from Passport to NextAuth.js v5"`

**Тест**: Логин через Google, проверка сессии

**Точка отката**: `git revert HEAD`

---

### PHASE 7: Остальные страницы (120 мин)

**Цель**: Портировать все HTML страницы → Next.js

**Страницы**:
- `search.html` → `/search/page.tsx`
- `products.html` → `/products/page.tsx`
- `product-v3.html` → `/product/[id]/page.tsx`
- `orders.html` → `/orders/page.tsx`
- `settings.html` → `/settings/page.tsx`

**Diff** (пример):
```typescript
// src/app/search/page.tsx
'use client'
import { useState } from 'react'
import { SearchResults } from '@/components/SearchResults'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  
  const handleSearch = async () => {
    const res = await fetch(`/api/search?q=${query}`)
    const data = await res.json()
    setResults(data.results)
  }
  
  return (
    <div className="search-page">
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <button onClick={handleSearch}>Search</button>
      <SearchResults results={results} />
    </div>
  )
}
```

**Git**: `git commit -m "feat(pages): port search, products, orders, settings pages"`

**Тест**: Проверить КАЖДУЮ страницу — рендер, стили, функционал

**Точка отката**: `git revert HEAD`

---

### PHASE 8: Production Deployment на 9201 (30 мин)

**Цель**: Заменить Express на Next.js на порту 9201

**Действия**:
```bash
# 1. Build Next.js
cd /opt/deep-agg-next
npm run build

# 2. Обновить ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'deep-agg-next',
    script: 'npm',
    args: 'start',
    cwd: '/opt/deep-agg-next',
    env: {
      PORT: 9201,  // ← Меняем на 9201!
      NODE_ENV: 'production'
    }
  }]
}
EOF

# 3. Остановить Express
pm2 stop deep-agg
pm2 delete deep-agg

# 4. Запустить Next.js на 9201
pm2 start ecosystem.config.js
pm2 save

# 5. Тест
curl http://localhost:9201
```

**Git**: `git commit -m "deploy: switch Deep-Agg to Next.js on port 9201"`

**Тест**: 
- ✅ http://5.129.228.88:9201 работает
- ✅ Поиск работает
- ✅ Логин работает
- ✅ Все страницы работают

**Точка отката**: 
```bash
pm2 stop deep-agg-next
pm2 start /opt/deep-agg/server.js --name deep-agg
```

---

## 🚀 ВРЕМЕННАЯ ШКАЛА

| Фаза | Время | Итого |
|------|-------|-------|
| PHASE 0 | 5 мин | 5 мин |
| PHASE 1 | 30 мин | 35 мин |
| PHASE 2 | 45 мин | 1ч 20м |
| PHASE 3 | 20 мин | 1ч 40м |
| PHASE 4 | 60 мин | 2ч 40м |
| PHASE 5 | 90 мин | 4ч 10м |
| PHASE 6 | 60 мин | 5ч 10м |
| PHASE 7 | 120 мин | 7ч 10м |
| PHASE 8 | 30 мин | **7ч 40м** |

**Итого: ~8 часов чистого времени**

---

## 🔥 EXECUTION MODE

### Правила:
1. ✅ **Git commit после КАЖДОЙ фазы**
2. ✅ **Тест после КАЖДОЙ фазы**
3. ✅ **Откат если что-то сломалось**
4. ✅ **Документирую ВСЕ решения в артефактах**
5. ✅ **Никаких галлюцинаций — только проверенный код**

### Инструменты:
- **Git** — точки отката
- **npm run dev** — hot reload для тестирования
- **curl** — тест API endpoints
- **PM2** — production deployment

### Критерии успеха:
- ✅ Все страницы работают
- ✅ Поиск работает (с SSE или без)
- ✅ Авторизация работает
- ✅ Provider integrations работают
- ✅ SQLite запросы работают
- ✅ Deployment на 9201 успешен
- ✅ Express отключен
- ✅ Никаких ошибок в логах

---

## 📝 CHECKPOINT ФАЙЛЫ

Создаю файлы для отслеживания прогресса:

### 1. PROGRESS.md
Текущая фаза, статус, время

### 2. ROLLBACK.md
Команды отката для каждой фазы

### 3. TESTS.md
Тесты для каждой фазы

### 4. ISSUES.md
Проблемы и решения

---

**Готов начинать?** Стартую с PHASE 0 (Git setup) прямо сейчас! 🚀
