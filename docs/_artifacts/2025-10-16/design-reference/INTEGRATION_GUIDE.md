# 🚀 Гайд по интеграции фронтенда Diponika с Express.js бэкендом

## 📋 Содержание

1. [Что было сделано](#что-было-сделано)
2. [Структура проекта](#структура-проекта)
3. [Установка и настройка](#установка-и-настройка)
4. [Интеграция с бэкендом](#интеграция-с-бэкендом)
5. [Локальная разработка](#локальная-разработка)
6. [Деплой на сервер](#деплой-на-сервер)
7. [Troubleshooting](#troubleshooting)

---

## 🎨 Что было сделано

### Дизайн система
- ✅ Glassmorphism UI с полупрозрачными блоками
- ✅ Анимированный градиентный фон (плавающие пятна)
- ✅ Line-art SVG иконки компонентов
- ✅ Единый шрифт Roboto (все веса)
- ✅ Плавные анимации и hover эффекты
- ✅ Responsive дизайн (mobile/tablet/desktop)

### Интеграция с бэкендом
- ✅ SSE (Server-Sent Events) для real-time поиска
- ✅ API клиент для всех эндпоинтов
- ✅ TypeScript типы для всех данных
- ✅ OAuth кнопки (Google/Yandex)
- ✅ Страница профиля с заказами
- ✅ Next.js rewrites для проксирования API

### Страницы
- ✅ Главная (`/`) - поиск + популярные компоненты
- ✅ Результаты поиска (`/search`) - SSE real-time результаты
- ✅ Карточка товара (`/product/[id]`) - детальная информация
- ✅ Профиль (`/profile`) - заказы пользователя
- ✅ Вход (`/login`) - OAuth авторизация

---

## 📁 Структура проекта

\`\`\`
diponika-frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Корневой layout
│   ├── page.tsx                 # Главная страница
│   ├── globals.css              # Глобальные стили (фон, glassmorphism)
│   ├── search/
│   │   ├── page.tsx            # Страница результатов (SSE)
│   │   └── loading.tsx         # Skeleton loader
│   ├── product/
│   │   └── [id]/
│   │       └── page.tsx        # Карточка товара
│   ├── profile/
│   │   └── page.tsx            # Профиль с заказами
│   └── login/
│       └── page.tsx            # Страница входа
│
├── components/
│   ├── Footer.tsx              # Футер (на всех страницах)
│   └── OAuthButtons.tsx        # Кнопки Google/Yandex
│
├── lib/
│   ├── types.ts                # TypeScript типы для API
│   └── api.ts                  # API клиент (fetch обертки)
│
├── hooks/
│   └── useSSESearch.ts         # React хук для SSE поиска
│
├── next.config.ts              # Next.js конфиг (rewrites)
├── .env.example                # Шаблон переменных окружения
├── INTEGRATION_GUIDE.md        # Этот файл
└── DEPLOYMENT.md               # Гайд по деплою
\`\`\`

---

## 🛠 Установка и настройка

### Шаг 1: Клонирование проекта

\`\`\`bash
# Клонируй репозиторий
git clone https://github.com/[your-username]/v0-components-aggregator-page.git diponika-frontend

# Перейди в папку
cd diponika-frontend

# Переключись на ветку с интеграцией (если создана)
git checkout backend-integration
\`\`\`

### Шаг 2: Установка зависимостей

\`\`\`bash
# Установи Node.js пакеты
npm install

# Или с yarn
yarn install

# Или с pnpm
pnpm install
\`\`\`

**Основные зависимости:**
- `next` - Next.js 14+
- `react` - React 18+
- `typescript` - TypeScript
- `tailwindcss` - Tailwind CSS v4

### Шаг 3: Настройка переменных окружения

\`\`\`bash
# Создай файл .env.local
cp .env.example .env.local

# Открой и отредактируй
nano .env.local
\`\`\`

**Содержимое `.env.local`:**

\`\`\`env
# URL твоего Express.js бэкенда
NEXT_PUBLIC_API_URL=http://localhost:9201

# Для продакшена (на сервере)
# NEXT_PUBLIC_API_URL=https://api.diponika.ru
\`\`\`

**Важно:**
- `NEXT_PUBLIC_API_URL` - должен указывать на твой Express.js сервер
- Локально: `http://localhost:9201`
- На сервере: `https://api.diponika.ru` (или твой домен)

---

## 🔌 Интеграция с бэкендом

### Архитектура

\`\`\`
┌─────────────────────────────────┐
│   Next.js Frontend (порт 3000)  │
│   - Glassmorphism UI            │
│   - SSE для поиска              │
│   - OAuth кнопки                │
└────────────┬────────────────────┘
             │
             │ HTTP/SSE запросы
             │
             ↓
┌─────────────────────────────────┐
│  Express.js Backend (порт 9201) │
│  - /api/live/search (SSE)       │
│  - /api/product/:id             │
│  - /api/vitrine                 │
│  - /auth/google, /auth/yandex   │
│  - /api/user/orders             │
└─────────────────────────────────┘
\`\`\`

### Как работает SSE поиск

**1. Пользователь вводит запрос на странице `/search`**

**2. Фронтенд создает EventSource соединение:**
\`\`\`typescript
// hooks/useSSESearch.ts
const eventSource = new EventSource(
  `${API_URL}/api/live/search?query=${query}`
)
\`\`\`

**3. Бэкенд отправляет события:**
\`\`\`
event: result
data: {"mpn": "LM317T", "manufacturer": "Texas Instruments", ...}

event: provider:partial
data: {"provider": "mouser", "count": 15}

event: done
data: {"totalResults": 42}
\`\`\`

**4. Фронтенд обрабатывает события в реальном времени:**
\`\`\`typescript
eventSource.addEventListener('result', (e) => {
  const product = JSON.parse(e.data)
  setResults(prev => [...prev, product])
})
\`\`\`

**5. Результаты появляются на странице по мере поступления**

### API эндпоинты

**Все эндпоинты проксируются через Next.js:**

\`\`\`typescript
// next.config.ts
rewrites: async () => [
  {
    source: '/api/:path*',
    destination: 'http://localhost:9201/api/:path*'
  },
  {
    source: '/auth/:path*',
    destination: 'http://localhost:9201/auth/:path*'
  }
]
\`\`\`

**Используемые эндпоинты:**

| Эндпоинт | Метод | Описание |
|----------|-------|----------|
| `/api/live/search?query=...` | GET (SSE) | Real-time поиск |
| `/api/product/:id` | GET | Детали товара |
| `/api/vitrine` | GET | Популярные компоненты |
| `/auth/google` | GET | OAuth Google |
| `/auth/yandex` | GET | OAuth Yandex |
| `/api/user/orders` | GET | Заказы пользователя |
| `/api/health` | GET | Проверка здоровья |

---

## 💻 Локальная разработка

### Запуск бэкенда

\`\`\`bash
# В папке с Express.js бэкендом
cd /path/to/backend
npm start

# Бэкенд должен запуститься на порту 9201
# Проверь: http://localhost:9201/api/health
\`\`\`

### Запуск фронтенда

\`\`\`bash
# В папке с Next.js фронтендом
cd /path/to/diponika-frontend

# Режим разработки (hot reload)
npm run dev

# Открой в браузере
# http://localhost:3000
\`\`\`

### Проверка интеграции

**1. Главная страница (`/`)**
- ✅ Анимированный фон виден
- ✅ Поисковая строка работает
- ✅ Карточки компонентов отображаются

**2. Поиск (`/search?q=lm317`)**
- ✅ Результаты появляются в реальном времени
- ✅ Видны провайдеры (Mouser, DigiKey, TME, Farnell)
- ✅ Цены отображаются с tooltip
- ✅ Клик на товар открывает карточку

**3. Карточка товара (`/product/1`)**
- ✅ Фото товара загружается
- ✅ Характеристики отображаются
- ✅ Цены по количеству видны
- ✅ Кнопка "Заказать" открывает модалку

**4. Профиль (`/profile`)**
- ✅ Список заказов загружается
- ✅ Статусы заказов отображаются

### Отладка

**Включи логи в браузере:**
\`\`\`typescript
// В любом компоненте добавь
console.log('[v0] Current state:', state)
\`\`\`

**Проверь Network в DevTools:**
- SSE соединение должно быть активным
- Статус 200 для всех API запросов
- События приходят в реальном времени

**Проверь консоль бэкенда:**
\`\`\`bash
# Должны быть логи запросов
GET /api/live/search?query=lm317
SSE connection opened
Sending result: LM317T
\`\`\`

---

## 🚀 Деплой на сервер

### Требования

- **Сервер:** Ubuntu 20.04+ / Debian 11+
- **Node.js:** 18.x или выше
- **PM2:** Для управления процессами
- **Nginx:** Для reverse proxy
- **SSL:** Certbot для HTTPS

### Шаг 1: Подготовка сервера

\`\`\`bash
# Подключись к серверу
ssh user@your-server.com

# Обнови систему
sudo apt update && sudo apt upgrade -y

# Установи Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Установи PM2
sudo npm install -g pm2

# Установи Nginx
sudo apt install -y nginx

# Установи Certbot для SSL
sudo apt install -y certbot python3-certbot-nginx
\`\`\`

### Шаг 2: Клонирование проекта

\`\`\`bash
# Создай папку для проектов
sudo mkdir -p /var/www
cd /var/www

# Клонируй репозиторий
sudo git clone https://github.com/[your-username]/v0-components-aggregator-page.git diponika-frontend

# Дай права текущему пользователю
sudo chown -R $USER:$USER diponika-frontend

# Перейди в папку
cd diponika-frontend
\`\`\`

### Шаг 3: Настройка переменных окружения

\`\`\`bash
# Создай .env.local для продакшена
nano .env.local
\`\`\`

**Содержимое `.env.local` для продакшена:**

\`\`\`env
# URL бэкенда (локальный, т.к. на том же сервере)
NEXT_PUBLIC_API_URL=http://localhost:9201

# Или если бэкенд на другом сервере
# NEXT_PUBLIC_API_URL=https://api.diponika.ru
\`\`\`

### Шаг 4: Сборка проекта

\`\`\`bash
# Установи зависимости
npm install --production

# Собери проект для продакшена
npm run build

# Проверь что сборка прошла успешно
ls -la .next/
\`\`\`

### Шаг 5: Запуск через PM2

\`\`\`bash
# Запусти фронтенд через PM2
pm2 start npm --name "diponika-frontend" -- start

# Проверь статус
pm2 status

# Должно быть:
# ┌─────┬──────────────────────┬─────────┬─────────┐
# │ id  │ name                 │ status  │ cpu     │
# ├─────┼──────────────────────┼─────────┼─────────┤
# │ 0   │ diponika-frontend    │ online  │ 0%      │
# └─────┴──────────────────────┴─────────┴─────────┘

# Сохрани конфигурацию PM2
pm2 save

# Настрой автозапуск при перезагрузке
pm2 startup
# Выполни команду которую выдаст PM2
\`\`\`

### Шаг 6: Настройка Nginx

\`\`\`bash
# Создай конфиг для фронтенда
sudo nano /etc/nginx/sites-available/diponika-frontend
\`\`\`

**Содержимое конфига:**

\`\`\`nginx
server {
    listen 80;
    server_name diponika.ru www.diponika.ru;

    # Логи
    access_log /var/log/nginx/diponika-frontend-access.log;
    error_log /var/log/nginx/diponika-frontend-error.log;

    # Проксирование на Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE для real-time поиска
    location /api/live/ {
        proxy_pass http://localhost:9201;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
    }

    # Остальные API запросы
    location /api/ {
        proxy_pass http://localhost:9201;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # OAuth
    location /auth/ {
        proxy_pass http://localhost:9201;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
\`\`\`

**Активируй конфиг:**

\`\`\`bash
# Создай симлинк
sudo ln -s /etc/nginx/sites-available/diponika-frontend /etc/nginx/sites-enabled/

# Проверь конфигурацию
sudo nginx -t

# Перезапусти Nginx
sudo systemctl restart nginx
\`\`\`

### Шаг 7: Настройка SSL (HTTPS)

\`\`\`bash
# Получи SSL сертификат от Let's Encrypt
sudo certbot --nginx -d diponika.ru -d www.diponika.ru

# Следуй инструкциям:
# 1. Введи email
# 2. Согласись с условиями
# 3. Выбери "2: Redirect" для автоматического редиректа HTTP → HTTPS

# Проверь автообновление сертификата
sudo certbot renew --dry-run
\`\`\`

### Шаг 8: Проверка работы

\`\`\`bash
# Открой в браузере
https://diponika.ru

# Проверь:
# ✅ Сайт открывается по HTTPS
# ✅ Анимированный фон работает
# ✅ Поиск работает (SSE)
# ✅ Карточки товаров открываются
# ✅ OAuth кнопки работают
\`\`\`

---

## 🔧 Troubleshooting

### Проблема: Белый экран / 500 ошибка

**Причина:** Ошибка при сборке или запуске

**Решение:**
\`\`\`bash
# Проверь логи PM2
pm2 logs diponika-frontend

# Пересобери проект
npm run build

# Перезапусти PM2
pm2 restart diponika-frontend
\`\`\`

### Проблема: SSE поиск не работает

**Причина:** Неправильная настройка Nginx для SSE

**Решение:**
\`\`\`bash
# Проверь что в Nginx конфиге есть:
location /api/live/ {
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
}

# Перезапусти Nginx
sudo systemctl restart nginx
\`\`\`

### Проблема: API запросы возвращают 404

**Причина:** Бэкенд не запущен или неправильный URL

**Решение:**
\`\`\`bash
# Проверь что бэкенд работает
curl http://localhost:9201/api/health

# Проверь переменную окружения
cat .env.local
# Должно быть: NEXT_PUBLIC_API_URL=http://localhost:9201

# Пересобери фронтенд
npm run build
pm2 restart diponika-frontend
\`\`\`

### Проблема: OAuth не работает

**Причина:** Неправильные redirect URLs в Google/Yandex консоли

**Решение:**
1. Открой Google Cloud Console
2. Перейди в OAuth 2.0 Client IDs
3. Добавь redirect URL: `https://diponika.ru/auth/google/callback`
4. То же самое для Yandex

### Проблема: Медленная загрузка страниц

**Причина:** Не настроен кэш или CDN

**Решение:**
\`\`\`bash
# Добавь кэширование статики в Nginx
location /_next/static/ {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 60m;
    add_header Cache-Control "public, immutable";
}

# Перезапусти Nginx
sudo systemctl restart nginx
\`\`\`

### Проблема: Фон не анимируется

**Причина:** CSS анимации отключены или не загрузились

**Решение:**
\`\`\`bash
# Проверь что globals.css загружается
curl https://diponika.ru/_next/static/css/app/layout.css

# Проверь в браузере DevTools → Network → CSS файлы
# Должен быть файл с @keyframes gradient-shift
\`\`\`

---

## 📝 Обновление проекта

### Получение новых изменений

\`\`\`bash
# На сервере
cd /var/www/diponika-frontend

# Получи изменения из Git
git pull origin main

# Установи новые зависимости (если есть)
npm install

# Пересобери проект
npm run build

# Перезапусти PM2
pm2 restart diponika-frontend

# Проверь что все работает
pm2 logs diponika-frontend --lines 50
\`\`\`

### Откат к предыдущей версии

\`\`\`bash
# Посмотри список коммитов
git log --oneline

# Откатись к нужному коммиту
git checkout <commit-hash>

# Пересобери
npm run build
pm2 restart diponika-frontend
\`\`\`

---

## 🎯 Чек-лист деплоя

Перед запуском в продакшен проверь:

- [ ] Node.js 18+ установлен
- [ ] PM2 установлен и настроен автозапуск
- [ ] Nginx установлен и настроен
- [ ] SSL сертификат получен и работает
- [ ] `.env.local` создан с правильным API URL
- [ ] Проект собран (`npm run build`)
- [ ] PM2 процесс запущен и в статусе "online"
- [ ] Nginx конфиг активирован
- [ ] SSE поиск работает
- [ ] OAuth редиректы настроены
- [ ] Логи не показывают ошибок
- [ ] Сайт открывается по HTTPS
- [ ] Все страницы загружаются
- [ ] Мобильная версия работает

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверь логи PM2: `pm2 logs diponika-frontend`
2. Проверь логи Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Проверь логи бэкенда
4. Открой issue в GitHub репозитории
5. Напиши в поддержку

---

**Готово!** Теперь у тебя полностью интегрированный фронтенд с бэкендом 🎉
