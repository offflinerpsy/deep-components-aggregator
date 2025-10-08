# Deep Components Aggregator

**Статус**: 🟢 Production  
**Режим работы**: 🎯 **Tech Lead Mode (постоянно)**

Агрегатор электронных компонентов с поиском по нескольким провайдерам (DigiKey, Mouser, TME, Farnell).

---

## 🎯 Tech Lead Mode — Постоянный стандарт

Этот проект работает в **строгом Tech Lead режиме**:

- ✅ Все изменения документируются: **PLAN → CHANGES → RUN → VERIFY → ARTIFACTS → GIT**
- ✅ Нет try/catch в новом коде — только **guard clauses**
- ✅ Артефакты сохраняются в `docs/_artifacts/<date>/` **ВСЕГДА**
- ✅ **Conventional Commits** обязательны для всех коммитов
- ✅ Никаких догадок — только проверенные факты из репозитория

**Подробности**: [`docs/TECH-LEAD-MODE.md`](docs/TECH-LEAD-MODE.md) ← **ОБЯЗАТЕЛЬНО К ПРОЧТЕНИЮ**

---

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Заполните .env ключами провайдеров

# Запуск сервера
npm start
```

Сервер запустится на `http://localhost:9201`

## 📁 Структура проекта

```
/opt/deep-agg/
├── server.js              # Точка входа приложения
├── package.json           # Зависимости и скрипты
├── .env.example           # Шаблон конфигурации
├── README.md              # Этот файл
├── SECURITY.md            # Политика безопасности
│
├── src/                   # Исходный код
│   ├── api/               # API endpoints
│   ├── integrations/      # Клиенты провайдеров
│   ├── search/            # Логика поиска
│   ├── currency/          # Конвертация валют
│   ├── db/                # Работа с БД
│   └── utils/             # Утилиты
│
├── api/                   # Express routes
│   ├── auth.js            # Авторизация
│   ├── order.js           # Заказы
│   └── ...
│
├── config/                # Конфигурации
│   ├── passport.mjs       # Стратегии авторизации
│   ├── session.mjs        # Настройки сессий
│   └── providers.mjs      # Настройки провайдеров
│
├── frontend/              # UI (HTML/CSS/JS)
├── public/                # Статика
├── scripts/               # Утилитные скрипты
├── tests/                 # Тесты
├── e2e/                   # E2E тесты (Playwright)
│
├── data/                  # Данные приложения
│   ├── db/                # SQLite базы
│   ├── idx/               # Поисковые индексы
│   └── corpus.json        # Корпус данных
│
├── logs/                  # Логи приложения
├── docs/                  # Документация
│   ├── archive/           # Старые отчёты
│   ├── api-references/    # API референсы провайдеров
│   ├── configs/           # Примеры конфигов (nginx, systemd)
│   ├── data/              # CSV/JSON данные
│   ├── _artifacts/        # Артефакты диагностики
│   ├── QUICK-START.md     # Быстрый старт
│   ├── CHANGELOG.md       # История изменений
│   └── ...
│
└── node_modules/          # Зависимости (в .gitignore)
```

## 🔧 Основные скрипты

```bash
npm start              # Запуск сервера
npm run dev            # Запуск с автоперезагрузкой
npm run smoke          # Smoke-тесты
npm run providers:check # Проверка провайдеров
npm test:e2e           # E2E тесты
```

## 📦 Провайдеры

- **DigiKey** — основной (требует OAuth2)
- **Mouser** — требует API ключ
- **TME** — требует credentials
- **Farnell** — требует API ключ

Настройка в `.env`:
```env
DIGIKEY_CLIENT_ID=...
DIGIKEY_CLIENT_SECRET=...
MOUSER_API_KEY=...
TME_TOKEN=...
FARNELL_API_KEY=...
```

## 🌍 Прокси

Используется Cloudflare WARP для доступа к DigiKey:
```env
HTTP_PROXY=http://127.0.0.1:25345
HTTPS_PROXY=http://127.0.0.1:25345
```

Таймауты клиентов: ≤9.5s (proxy-mode limit 10s)

## 💰 Валюты

Курсы валют от ЦБ РФ (кэш 24ч):
- XML API: `https://www.cbr.ru/scripts/XML_daily.asp`
- Наценка настраивается в `.env`: `MARKUP_PERCENT=15`

## 🔒 Безопасность

- Секреты только через env-переменные
- OWASP ASVS 5.0 baseline
- См. [SECURITY.md](SECURITY.md)

## 📚 Документация

- [Быстрый старт](docs/QUICK-START.md)
- [История изменений](docs/CHANGELOG.md)
- [API провайдеров](docs/api-references/)
- [Артефакты диагностики](docs/_artifacts/)

## 🐛 Известные проблемы

См. `docs/_artifacts/2025-10-06/risks.md`

## 📄 Лицензия

Proprietary (см. LICENSE)

Агрегатор электронных компонентов с живым поиском, ротацией API-ключей и чанковым импортом данных.

## Основные возможности

- **Аутентификация и OAuth** - регистрация/вход с email+пароль, Google, Yandex; сессии в SQLite; личный кабинет заказов
- **Живой поиск (SSE)** - поиск компонентов в реальном времени с использованием Server-Sent Events
- **Ротация API-ключей** - автоматическая ротация ключей API для скрапинга с обработкой ошибок и таймаутов
- **HTML-кэш** - кэширование HTML-страниц с различными TTL для разных доменов и поддержкой stale-if-error
- **Чанковый импорт** - потоковая обработка больших файлов с URL'ами (до 1 GB) без загрузки в память
- **Очереди задач** - управление параллельностью и скоростью выполнения задач с p-queue
- **Диагностика** - подробное логирование и генерация отчетов для анализа работы системы
- **E2E тесты** - автоматизированное тестирование с использованием Playwright
- **WARP Proxy Mode** - опциональная маршрутизация через Cloudflare WARP для анонимизации исходящего трафика

## Установка и запуск

### Требования

- Node.js 18+
- npm 9+
- Nginx (для продакшена)

### Локальная разработка

```bash
# Клонирование репозитория
git clone https://github.com/your-username/deep-aggregator-v2.git
cd deep-aggregator-v2

# Установка зависимостей
npm install

# Создание необходимых директорий
mkdir -p secrets/apis data/cache/html data/cache/meta data/db/products data/idx data/state logs/_diag loads/urls var/db

# Добавление API-ключей
echo "your-scraperapi-key" > secrets/apis/scraperapi.txt
echo "your-scrapingbee-key" > secrets/apis/scrapingbee.txt
echo "your-scrapingbot-key" > secrets/apis/scrapingbot.txt

# Настройка аутентификации (для OAuth)
export SESSION_SECRET=$(openssl rand -base64 32)
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-secret"
export YANDEX_CLIENT_ID="your-yandex-client-id"
export YANDEX_CLIENT_SECRET="your-yandex-secret"

# Применить миграции базы данных
sqlite3 var/db/deepagg.sqlite < db/migrations/2025-10-02_orders.sql
sqlite3 var/db/deepagg.sqlite < db/migrations/2025-10-02_auth.sql

# Обновление курсов валют
npm run rates:refresh

# Запуск сервера разработки
npm run dev
```

### Импорт данных и построение индекса

```bash
# Импорт URL'ов ChipDip
npm run data:ingest:chipdip

# Построение поискового индекса
npm run data:index:build
```

### Тестирование

```bash
# Smoke-тесты
npm run smoke

# E2E тесты
npm run test:e2e

# Диагностика живого поиска
npm run diag:live "LM317"

# Генерация отчета по диагностике
npm run diag:report --dir _diag/2025-09-29T00-00-00-000Z
```

### Деплой на сервер

```bash
# Деплой на удаленный сервер
npm run deploy
```

## Структура проекта

- `src/` - исходный код
  - `api/` - API-эндпоинты
  - `core/` - ядро системы (поиск, хранение, канонизация)
  - `currency/` - работа с валютами
  - `db/` - работа с базой данных
  - `live/` - живой поиск
  - `parsers/` - парсеры для различных источников
  - `scrape/` - скрапинг и кэширование
- `scripts/` - скрипты для различных задач
- `tests/` - тесты
- `public/` - статические файлы
- `data/` - данные (кэш, индексы, продукты)
- `secrets/` - секретные данные (API-ключи)
- `logs/` - логи
- `_diag/` - диагностические данные
- `_reports/` - отчеты

## API

### Аутентификация

- `POST /auth/register` - регистрация нового пользователя
- `POST /auth/login` - вход в систему
- `POST /auth/logout` - выход из системы
- `GET /auth/me` - информация о текущем пользователе
- `GET /auth/google` - OAuth вход через Google
- `GET /auth/yandex` - OAuth вход через Яндекс

### Заказы пользователя (требуется авторизация)

- `GET /api/user/orders` - список заказов текущего пользователя (пагинация, фильтры)
- `GET /api/user/orders/:id` - детали конкретного заказа
- `POST /api/order` - создание нового заказа (требуется авторизация)

### Поиск

- `GET /api/search?q=<query>` - синхронный поиск
- `GET /api/live/search?q=<query>` - живой поиск с SSE

### Продукты

- `GET /api/product?mpn=<mpn>` - получение информации о продукте по MPN
- `GET /api/product?url=<url>` - получение информации о продукте по URL

### Системные

- `GET /api/health` - проверка состояния системы
- `GET /api/metrics` - Prometheus метрики

### Администрирование (защищено Nginx Basic Auth)

- `GET /api/admin/orders` - список всех заказов (пагинация, фильтры)
- `GET /api/admin/orders/:id` - детали заказа
- `PATCH /api/admin/orders/:id` - обновление статуса заказа

**Подробная документация:** См. `docs/API.md`, `docs/SECURITY.md`, `docs/OPERATIONS.md`

---

## Engineering Policies

Этот проект следует профессиональным стандартам разработки для обеспечения качества, безопасности и поддерживаемости кода.

### 📋 Стандарты коммитов и версионирования

- **[Conventional Commits](https://www.conventionalcommits.org/)**: Структурированные сообщения коммитов (`type(scope): description`)
  - Типы: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Примеры: `feat(search): add Russian normalization`, `fix(api): validate product MPN`

- **[Semantic Versioning 2.0.0](https://semver.org/)**: `MAJOR.MINOR.PATCH`
  - MAJOR: breaking changes
  - MINOR: новый функционал (обратно совместимый)
  - PATCH: багфиксы

### 🏗️ Архитектура

- **[12-Factor App](https://12factor.net/)**: Современные принципы построения SaaS-приложений
  - Конфигурация через переменные окружения
  - Stateless процессы
  - Явные зависимости (package.json, requirements.txt)
  - Dev ≈ Prod (одинаковое поведение в разных средах)

### 📚 Документация

- **[OpenAPI Specification](https://spec.openapis.org/oas/latest.html)**: Описание HTTP API (OAS 3.x)
- **Architecture Decision Records (ADR)**: Документирование архитектурных решений в `docs/adr/`

### 🧪 Тестирование

- **[Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)**: Баланс типов тестов
  - Unit тесты (70-80%): быстрые, изолированные
  - Integration тесты (15-20%): проверка связок
  - E2E/UI тесты (5-10%): критичные потоки
- **Артефакты**: Результаты проверок сохраняются в `docs/_artifacts/<date>/`

### 🔒 Безопасность

- **[OWASP ASVS 5.0](https://github.com/OWASP/ASVS)**: Baseline требований для верификации безопасности
- **[OWASP Top-10](https://owasp.org/www-project-top-ten/)**: Чек-лист при code review
- **Секреты**: Только через env-переменные или секрет-хранилища (не в коде!)

### 🎨 Форматирование

- **[EditorConfig](https://editorconfig.org/)**: Единый стиль для всех редакторов (`.editorconfig`)
- **VS Code Settings**: Автоформатирование, LF окончания строк, 2 пробела отступ

### 📖 Workspace Instructions

Все правила и паттерны для агентов/Copilot задокументированы в `.github/copilot-instructions.md`.

---

## Лицензия

MIT
