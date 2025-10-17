# Интеграция v0 API в Copilot для автоматической интеграции дизайна

## Шаг 1: Настройка v0 API в Copilot

### Для VS Code:

1. Открой настройки: `Ctrl+,` (Windows/Linux) или `Cmd+,` (Mac)
2. Найди "settings.json" (кликни иконку файла справа вверху)
3. Добавь конфигурацию v0:

\`\`\`json
{
  "github.copilot.advanced": {
    "debug.overrideEngine": "gpt-4",
    "agents": {
      "v0": {
        "enabled": true,
        "apiKey": "v1:K9pGKBuEBv92LouvTaPFUtD1:Yi3vArR73im0UPTot76FLvEs",
        "endpoint": "https://api.v0.dev/v1",
        "model": "v0-agent"
      }
    }
  }
}
\`\`\`

### Для Cursor:

1. Открой Settings: `Ctrl+,` или через меню
2. Перейди в "Cursor Settings" → "Advanced"
3. Добавь в "Custom AI Providers":

\`\`\`json
{
  "providers": [
    {
      "name": "v0",
      "apiKey": "v1:K9pGKBuEBv92LouvTaPFUtD1:Yi3vArR73im0UPTot76FLvEs",
      "endpoint": "https://api.v0.dev/v1",
      "model": "v0-agent"
    }
  ]
}
\`\`\`

## Шаг 2: Проверка подключения

Открой Copilot Chat и напиши:

\`\`\`
@v0 ping
\`\`\`

Если v0 отвечает - подключение работает!

## Шаг 3: Клонирование референсного проекта

\`\`\`bash
# Склонируй проект с дизайном
git clone https://github.com/offflinerpsy/v0-components-aggregator-page.git v0-design-reference

# Это референс для v0, не трогай его
\`\`\`

## Шаг 4: Полный промпт для Copilot

Скопируй и вставь в Copilot Chat:

\`\`\`
@v0 Привет! Мне нужна твоя помощь с интеграцией дизайна.

КОНТЕКСТ:
- У меня есть Express.js бэкенд на порту 9201
- Есть Next.js фронтенд который нужно обновить
- Твой дизайн находится в репозитории: https://github.com/offflinerpsy/v0-components-aggregator-page
- Локальная копия дизайна: ./v0-design-reference/

СТРУКТУРА БЭКЕНДА:
- SSE эндпоинт: GET /api/live/search?query=...
  События: result, provider:partial, done
- Продукт: GET /api/product?mpn=...&provider=...
- Витрина: GET /api/vitrine
- OAuth: /auth/google, /auth/yandex
- Профиль: GET /api/user/profile (требует auth)
- Заказы: GET /api/user/orders (требует auth)

ЗАДАЧА:
Интегрируй твой glassmorphism дизайн из v0-design-reference в мой Next.js проект.

ПЛАН РАБОТЫ:

1. АНАЛИЗ ПРОЕКТА
   - Изучи структуру моего Next.js проекта
   - Найди где находятся страницы (app/ или pages/)
   - Проверь существующие компоненты
   - Изучи текущий API клиент (если есть)

2. КОПИРОВАНИЕ СТИЛЕЙ
   Из v0-design-reference скопируй:
   - app/globals.css (анимированный фон + glassmorphism)
   - Настройки шрифта Roboto из app/layout.tsx
   
3. СОЗДАНИЕ ИНФРАСТРУКТУРЫ
   Создай файлы:
   
   lib/types.ts:
   - Типы для всех API ответов
   - SearchResult, Product, Provider, Order, User
   - SSE Event типы
   
   lib/api.ts:
   - API клиент для всех эндпоинтов
   - Функции: searchProducts, getProduct, getVitrine, getUserProfile, getUserOrders
   
   hooks/useSSESearch.ts:
   - React хук для SSE поиска
   - Обработка событий: result, provider:partial, done
   - Состояния: loading, results, error, progress

4. ИНТЕГРАЦИЯ ГЛАВНОЙ СТРАНИЦЫ
   Обнови app/page.tsx (или pages/index.tsx):
   - Добавь glassmorphism стили
   - Используй поисковую строку из v0-design-reference/app/page.tsx
   - Добавь анимированный логотип "ДИПОНИКА"
   - Добавь сетку популярных компонентов (из getVitrine)
   - При поиске → редирект на /search?q=...

5. ИНТЕГРАЦИЯ СТРАНИЦЫ ПОИСКА
   Создай/обнови app/search/page.tsx:
   - Используй useSSESearch хук
   - Покажи real-time результаты
   - Таблица с колонками: Фото, Производитель, MPN, Описание, Регион, Цена, Действие
   - Цены: минимальная зеленым + tooltip с деталями
   - Регионы: флаги стран
   - Прогресс бар для провайдеров
   - Glassmorphism дизайн

6. ИНТЕГРАЦИЯ КАРТОЧКИ ТОВАРА
   Создай/обнови app/product/[id]/page.tsx:
   - Получай данные через getProduct(mpn, provider)
   - Layout: 2 колонки (фото+инфо слева, заказ справа)
   - Блок фото со слайдером
   - Характеристики в резиновой таблице
   - Блок заказа с ценами по количеству
   - Модалка заказа (ФИО, телефон, email)
   - Glassmorphism дизайн

7. ДОБАВЛЕНИЕ OAUTH
   Создай app/login/page.tsx:
   - Кнопки "Войти через Google" и "Войти через Yandex"
   - Редирект на /auth/google и /auth/yandex
   - Glassmorphism дизайн

8. СТРАНИЦА ПРОФИЛЯ
   Создай app/profile/page.tsx:
   - Получай данные через getUserProfile и getUserOrders
   - Покажи информацию о пользователе
   - Таблица заказов
   - Glassmorphism дизайн

9. НАСТРОЙКА NEXT.JS
   Обнови next.config.ts:
   \`\`\`typescript
   const nextConfig = {
     async rewrites() {
       return [
         {
           source: '/api/:path*',
           destination: 'http://localhost:9201/api/:path*'
         },
         {
           source: '/auth/:path*',
           destination: 'http://localhost:9201/auth/:path*'
         }
       ]
     }
   }
   \`\`\`

10. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
    Создай .env.local:
    \`\`\`
    NEXT_PUBLIC_API_URL=http://localhost:9201
    \`\`\`

11. ТЕСТИРОВАНИЕ
    - Запусти бэкенд: должен работать на порту 9201
    - Запусти фронтенд: npm run dev
    - Проверь все страницы:
      - / - главная с поиском
      - /search?q=test - результаты поиска
      - /product/123 - карточка товара
      - /login - страница входа
      - /profile - профиль (после входа)

12. ИСПРАВЛЕНИЕ ОШИБОК
    Если что-то не работает:
    - Проверь консоль браузера
    - Проверь логи Next.js
    - Проверь что бэкенд отвечает
    - Проверь CORS настройки

ВАЖНО:
- Сохрани всю существующую бизнес-логику
- Замени только UI компоненты
- Используй TypeScript для всех файлов
- Следуй структуре из v0-design-reference
- Все блоки должны иметь glassmorphism эффект
- Используй только шрифт Roboto
- Все переходы: 0.3s cubic-bezier(0.4, 0, 0.2, 1)

РЕФЕРЕНСНЫЕ ФАЙЛЫ:
Смотри примеры в v0-design-reference/:
- app/globals.css - стили
- app/page.tsx - главная
- app/search/page.tsx - поиск
- app/product/[id]/page.tsx - карточка
- hooks/useSSESearch.ts - SSE хук
- lib/types.ts - типы
- lib/api.ts - API клиент

Начни с пункта 1 (анализ проекта) и двигайся по порядку.
После каждого шага спрашивай меня: "Шаг X завершен. Продолжить?"

Готов начать?
\`\`\`

## Шаг 5: Работа с v0

После отправки промпта, v0 начнет работу. На каждом шаге:

1. v0 проанализирует твой код
2. Создаст/обновит нужные файлы
3. Спросит подтверждение
4. Ты отвечаешь: "Да, продолжай"

## Шаг 6: Если v0 не отвечает

Попробуй альтернативный способ:

\`\`\`
В Copilot Chat напиши:
"Используй v0 API для интеграции дизайна"

Или используй прямой вызов:
curl -X POST https://api.v0.dev/v1/chat \
  -H "Authorization: Bearer v1:K9pGKBuEBv92LouvTaPFUtD1:Yi3vArR73im0UPTot76FLvEs" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Интегрируй дизайн из v0-components-aggregator-page"
      }
    ]
  }'
\`\`\`

## Шаг 7: Мониторинг прогресса

v0 будет создавать файлы и показывать прогресс:

\`\`\`
✓ Анализ проекта завершен
✓ Стили скопированы
✓ Инфраструктура создана
⏳ Интеграция главной страницы...
\`\`\`

## Шаг 8: Финальная проверка

После завершения:

\`\`\`bash
# Установи зависимости (если добавились новые)
npm install

# Запусти проект
npm run dev

# Открой http://localhost:3000
\`\`\`

## Troubleshooting

### Ошибка: "v0 agent not found"

Проверь что токен правильно добавлен в settings.json

### Ошибка: "API key invalid"

Токен мог истечь. Запроси новый на https://v0.dev/settings

### v0 не видит файлы проекта

Убедись что открыл папку проекта в VS Code/Cursor (File → Open Folder)

### SSE не работает

Проверь что бэкенд на порту 9201 отвечает:
\`\`\`bash
curl http://localhost:9201/api/health
\`\`\`

## Контакты для поддержки

Если что-то не работает:
1. Проверь логи в консоли браузера
2. Проверь логи Next.js в терминале
3. Проверь что бэкенд работает
4. Напиши в чат v0: "@v0 помоги с ошибкой: [текст ошибки]"

---

**Готово!** Теперь Copilot может использовать v0 API для автоматической интеграции дизайна в твой проект.
