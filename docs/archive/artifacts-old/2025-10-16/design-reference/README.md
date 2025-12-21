# 🎨 Diponika - Агрегатор электронных компонентов

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/alexs-projects-40d13ea9/v0-components-aggregator-page)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/AhDC4CIDo8I)

## 📋 Описание

Современный фронтенд для агрегатора электронных компонентов с glassmorphism дизайном, real-time поиском через SSE и интеграцией с Express.js бэкендом.

**Особенности:**
- 🎨 Glassmorphism UI с анимированным градиентным фоном
- ⚡ Real-time поиск через Server-Sent Events (SSE)
- 🔐 OAuth авторизация (Google, Yandex)
- 📱 Полностью responsive дизайн
- 🎯 TypeScript типизация
- 🚀 Next.js 14+ App Router

## 🚀 Быстрый старт

### Локальная разработка

\`\`\`bash
# Клонируй репозиторий
git clone https://github.com/[your-username]/v0-components-aggregator-page.git
cd v0-components-aggregator-page

# Установи зависимости
npm install

# Создай .env.local
cp .env.example .env.local
# Отредактируй NEXT_PUBLIC_API_URL

# Запусти dev сервер
npm run dev

# Открой http://localhost:3000
\`\`\`

### Требования

- Node.js 18+
- npm 9+
- Express.js бэкенд на порту 9201

## 📁 Структура проекта

\`\`\`
├── app/                    # Next.js App Router
│   ├── page.tsx           # Главная страница
│   ├── search/            # Страница результатов (SSE)
│   ├── product/[id]/      # Карточка товара
│   ├── profile/           # Профиль пользователя
│   └── login/             # Страница входа
├── components/            # React компоненты
├── lib/                   # Утилиты и API клиент
├── hooks/                 # React хуки (useSSESearch)
└── public/                # Статические файлы
\`\`\`

## 📚 Документация

- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Полный гайд по интеграции с бэкендом
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Инструкция по деплою на сервер

## 🔧 Конфигурация

### Переменные окружения

\`\`\`env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:9201
NODE_ENV=development
\`\`\`

### API Endpoints

Фронтенд работает с следующими эндпоинтами бэкенда:

- `GET /api/live/search?query=...` - SSE поиск
- `GET /api/product/:id` - Детали товара
- `GET /api/vitrine` - Популярные компоненты
- `GET /auth/google` - OAuth Google
- `GET /auth/yandex` - OAuth Yandex
- `GET /api/user/orders` - Заказы пользователя

## 🎨 Дизайн система

- **Шрифт:** Roboto (все веса)
- **Цвета:** Градиенты #667eea → #764ba2 → #f093fb
- **Эффекты:** Glassmorphism, плавные анимации
- **Иконки:** Line-art SVG стиль

## 🚀 Деплой

### Vercel (рекомендуется)

\`\`\`bash
# Через v0.app
1. Нажми "Publish" в интерфейсе v0
2. Проект автоматически задеплоится на Vercel

# Или через Vercel CLI
vercel --prod
\`\`\`

### Собственный сервер

Смотри подробную инструкцию в [DEPLOYMENT.md](./DEPLOYMENT.md)

\`\`\`bash
# Краткая версия
npm run build
pm2 start npm --name "diponika" -- start
# Настрой Nginx + SSL
\`\`\`

## 🔗 Ссылки

- **Live Demo:** [https://vercel.com/alexs-projects-40d13ea9/v0-components-aggregator-page](https://vercel.com/alexs-projects-40d13ea9/v0-components-aggregator-page)
- **v0 Project:** [https://v0.app/chat/projects/AhDC4CIDo8I](https://v0.app/chat/projects/AhDC4CIDo8I)
- **GitHub:** [https://github.com/[your-username]/v0-components-aggregator-page](https://github.com/[your-username]/v0-components-aggregator-page)

## 🤝 Интеграция с бэкендом

Проект интегрирован с Express.js бэкендом через:
- Next.js rewrites для проксирования API
- EventSource для SSE соединений
- Fetch API для REST запросов

Подробности в [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

## 📝 Лицензия

MIT

## 🆘 Поддержка

Если возникли проблемы:
1. Проверь [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) → Troubleshooting
2. Проверь логи: `pm2 logs diponika`
3. Открой issue в GitHub
