# Deep Aggregator v2 (L03)

Агрегатор электронных компонентов с живым поиском, ротацией API-ключей и чанковым импортом данных.

## Основные возможности

- **Живой поиск (SSE)** - поиск компонентов в реальном времени с использованием Server-Sent Events
- **Ротация API-ключей** - автоматическая ротация ключей API для скрапинга с обработкой ошибок и таймаутов
- **HTML-кэш** - кэширование HTML-страниц с различными TTL для разных доменов и поддержкой stale-if-error
- **Чанковый импорт** - потоковая обработка больших файлов с URL'ами (до 1 GB) без загрузки в память
- **Очереди задач** - управление параллельностью и скоростью выполнения задач с p-queue
- **Диагностика** - подробное логирование и генерация отчетов для анализа работы системы
- **E2E тесты** - автоматизированное тестирование с использованием Playwright

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
mkdir -p secrets/apis data/cache/html data/cache/meta data/db/products data/idx data/state logs/_diag loads/urls

# Добавление API-ключей
echo "your-scraperapi-key" > secrets/apis/scraperapi.txt
echo "your-scrapingbee-key" > secrets/apis/scrapingbee.txt
echo "your-scrapingbot-key" > secrets/apis/scrapingbot.txt

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

### Поиск

- `GET /api/search?q=<query>` - синхронный поиск
- `GET /api/live/search?q=<query>` - живой поиск с SSE

### Продукты

- `GET /api/product?mpn=<mpn>` - получение информации о продукте по MPN
- `GET /api/product?url=<url>` - получение информации о продукте по URL

### Системные

- `GET /api/health` - проверка состояния системы

## Лицензия

MIT
