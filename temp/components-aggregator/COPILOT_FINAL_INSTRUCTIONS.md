# 🎯 ФИНАЛЬНАЯ ИНСТРУКЦИЯ ДЛЯ COPILOT

## ЧТО НУЖНО СДЕЛАТЬ

Интегрировать готовый Next.js фронтенд с дизайном в существующий Express.js проект.

**Репозиторий с фронтендом:** https://github.com/offflinerpsy/v0-components-aggregator-page

**Бэкенд:** Express.js на порту 9201 (уже работает)

---

## ШАГ 1: Клонировать фронтенд

\`\`\`bash
# В папке вашего проекта
git clone https://github.com/offflinerpsy/v0-components-aggregator-page.git frontend
cd frontend
\`\`\`

---

## ШАГ 2: Установить зависимости

\`\`\`bash
npm install
\`\`\`

---

## ШАГ 3: Создать .env.local

\`\`\`bash
# Создай файл .env.local в корне frontend/
echo "NEXT_PUBLIC_API_URL=http://localhost:9201" > .env.local
\`\`\`

---

## ШАГ 4: Запустить бэкенд (если еще не запущен)

\`\`\`bash
# В папке с бэкендом
cd ../backend  # или где у вас бэкенд
node server.js
# Должен запуститься на порту 9201
\`\`\`

---

## ШАГ 5: Запустить фронтенд

\`\`\`bash
# В папке frontend/
npm run dev
\`\`\`

Откроется на http://localhost:3000

---

## ШАГ 6: Проверить что работает

1. **Главная страница** (http://localhost:3000)
   - Должен быть анимированный фон
   - Поисковая строка
   - Карточки компонентов

2. **Поиск** (введи "ESP32" и нажми Enter)
   - Должна открыться страница /search?q=ESP32
   - Должны появиться результаты в реальном времени
   - Проверь что данные приходят с бэкенда

3. **Карточка товара** (кликни на любой результат)
   - Должна открыться страница /product/[mpn]
   - Должны быть фото, цены, характеристики

---

## ЧТО ДЕЛАТЬ ЕСЛИ НЕ РАБОТАЕТ

### Проблема: "Failed to fetch"

**Решение:**
\`\`\`bash
# Проверь что бэкенд работает
curl http://localhost:9201/api/health

# Должен вернуть JSON с status: "ok"
\`\`\`

### Проблема: "CORS error"

**Решение:** Добавь в бэкенд (server.js):
\`\`\`javascript
const cors = require('cors')
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))
\`\`\`

### Проблема: "SSE не работает"

**Решение:** Проверь что эндпоинт /api/live/search работает:
\`\`\`bash
curl -N http://localhost:9201/api/live/search?q=ESP32
\`\`\`

---

## СТРУКТУРА ПРОЕКТА

\`\`\`
frontend/
├── app/
│   ├── page.tsx              # Главная страница
│   ├── search/page.tsx       # Страница поиска (SSE)
│   ├── product/[id]/page.tsx # Карточка товара
│   ├── globals.css           # Все стили (фон, glassmorphism)
│   └── layout.tsx            # Layout с шрифтами
├── lib/
│   ├── api.ts                # API клиент для бэкенда
│   └── types.ts              # TypeScript типы
├── hooks/
│   └── useSSESearch.ts       # Хук для SSE поиска
├── components/
│   └── Footer.tsx            # Футер
└── next.config.ts            # Rewrites для API
\`\`\`

---

## КАК ЭТО РАБОТАЕТ

### 1. Главная страница (app/page.tsx)

- Показывает поисковую строку
- При вводе текста и Enter → переход на /search?q=...
- Карточки компонентов кликабельны → переход на /product/[mpn]

### 2. Страница поиска (app/search/page.tsx)

- Использует хук `useSSESearch` для real-time поиска
- Подключается к `/api/live/search?q=...` через EventSource
- Слушает события:
  - `result` - получает массив продуктов
  - `provider:partial` - показывает прогресс
  - `done` - закрывает соединение

### 3. Карточка товара (app/product/[id]/page.tsx)

- Загружает данные через `getProduct(mpn)` из lib/api.ts
- Показывает фото, цены, характеристики
- Кнопка "Заказать" открывает модалку

### 4. API клиент (lib/api.ts)

- `getProduct(mpn)` → GET /api/product?mpn=...
- `getVitrine()` → GET /api/vitrine
- `createOrder(data)` → POST /api/user/orders

### 5. SSE хук (hooks/useSSESearch.ts)

- Создает EventSource для /api/live/search
- Парсит события и обновляет состояние
- Автоматически закрывает соединение

---

## ДЕПЛОЙ НА PRODUCTION

### Вариант 1: Vercel (РЕКОМЕНДУЮ)

\`\`\`bash
# В папке frontend/
npm install -g vercel
vercel login
vercel

# Добавь переменную окружения в Vercel:
# NEXT_PUBLIC_API_URL=https://ваш-бэкенд.com
\`\`\`

### Вариант 2: PM2 на сервере

\`\`\`bash
# Собери проект
npm run build

# Запусти через PM2
pm2 start npm --name "frontend" -- start
pm2 save
\`\`\`

### Вариант 3: Docker

\`\`\`bash
# Создай Dockerfile (уже есть в проекте)
docker build -t frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:9201 frontend
\`\`\`

---

## ВАЖНО

1. **Бэкенд должен работать на порту 9201**
2. **Фронтенд запускается на порту 3000**
3. **Все API запросы идут через next.config.ts rewrites**
4. **SSE работает только если бэкенд отправляет typed events**

---

## ЕСЛИ ВСЕ ЕЩЕ НЕ РАБОТАЕТ

Скопируй и вставь в Copilot:

\`\`\`
У меня не работает интеграция фронтенда с бэкендом.

Фронтенд: https://github.com/offflinerpsy/v0-components-aggregator-page
Бэкенд: Express.js на порту 9201

Ошибка: [ВСТАВЬ ОШИБКУ ИЗ КОНСОЛИ]

Помоги исправить.
\`\`\`

---

**Все готово! Просто следуй инструкциям шаг за шагом.**
