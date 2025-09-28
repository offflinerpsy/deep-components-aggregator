# DeepAgg - Агрегатор электронных компонентов

Проект для агрегации данных об электронных компонентах из различных источников с живым поиском.

## Особенности

- Быстрый поиск по локальному индексу
- Живой поиск с использованием SSE (Server-Sent Events)
- Поддержка нескольких провайдеров скрапинга с ротацией ключей
- Кэширование HTML с TTL
- Конвертация валют через ЦБ РФ
- Интерфейс в стиле OEMs с раскладной карточкой товара

## Структура проекта

```
├── data/                      # Данные
│   ├── cache/                 # Кэш HTML
│   ├── db/                    # База данных
│   ├── idx/                   # Поисковый индекс
│   ├── state/                 # Состояние приложения
│   └── rates.json             # Курсы валют
├── loads/                     # Загрузки
│   └── urls/                  # URL-ы для загрузки
├── public/                    # Статические файлы
│   ├── css/                   # Стили
│   ├── js/                    # JavaScript
│   └── ui/                    # UI компоненты
├── scripts/                   # Скрипты
├── secrets/                   # Секреты (не в git)
│   └── apis/                  # API ключи
├── src/                       # Исходный код
│   ├── api/                   # API
│   ├── core/                  # Ядро
│   ├── currency/              # Валюты
│   ├── db/                    # База данных
│   ├── files/                 # Файлы
│   ├── live/                  # Живой поиск
│   ├── parsers/               # Парсеры
│   └── scrape/                # Скрапинг
└── tests/                     # Тесты
    └── e2e/                   # E2E тесты
```

## Установка

### Зависимости

```bash
npm install express undici cheerio fast-xml-parser nanoid
```

На Windows может потребоваться установка дополнительных инструментов для native-модулей:
- Visual Studio Build Tools с "Desktop development with C++" workload
- Python 3.x

### Настройка

1. Создайте необходимые директории:
```bash
mkdir -p secrets/apis data/cache/html data/cache/meta data/db/products data/idx data/state loads/urls
```

2. Добавьте API ключи в соответствующие файлы:
```bash
echo "YOUR_API_KEY" > secrets/apis/scraperapi.txt
echo "YOUR_API_KEY" > secrets/apis/scrapingbee.txt
echo "YOUR_API_KEY" > secrets/apis/scrapingbot.txt
```

## Запуск

1. Обновите курсы валют:
```bash
npm run rates:refresh
```

2. Запустите сервер:
```bash
npm start
```

3. Откройте браузер по адресу http://localhost:9201/

## Скрипты

- `npm start` - Запуск сервера
- `npm run migrate` - Миграция SQLite
- `npm run rates:refresh` - Обновление курсов валют
- `npm run data:ingest:chipdip` - Загрузка данных с ChipDip
- `npm run data:index:build` - Построение поискового индекса
- `npm run smoke` - Запуск smoke-тестов
- `npm run test:e2e` - Запуск E2E тестов
- `npm run diag:live` - Запуск диагностики живого поиска
- `npm run deploy` - Деплой на продакшн (Linux)
- `npm run deploy:win` - Деплой на продакшн (Windows)

## Деплой

### Linux

```bash
bash prod-deploy.sh
```

### Windows

```batch
deploy-one-shot.bat
```

## Диагностика

Для диагностики живого поиска:

```bash
npm run diag:live "LM317"
```

Результаты будут сохранены в `data/_diag/<timestamp>/trace.txt`.

## Nginx конфигурация

Для корректной работы SSE необходимо настроить Nginx:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:9201;
  proxy_http_version 1.1;
  proxy_set_header Connection "";
  proxy_set_header Host $host;
  proxy_read_timeout 1h;

  # SSE: отключить буферизацию (иначе события «липнут»)
  proxy_buffering off;
  add_header X-Accel-Buffering no;
}
```
