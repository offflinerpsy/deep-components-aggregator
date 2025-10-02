# 🚀 QUICK START - Deep Components Aggregator

## ЧТО ЭТО?

**Единый поисковик электронных компонентов** по Mouser + Farnell API с ценами в рублях.

## КАК ЗАПУСТИТЬ? (3 КОМАНДЫ)

```bash
npm install       # Установить зависимости
npm start         # Запустить сервер
# Открыть: http://localhost:9201
```

## КАК ПОЛЬЗОВАТЬСЯ?

1. Открой http://localhost:9201
2. Введи "LM317" или "transistor"
3. Видишь таблицу с результатами и ценами в рублях
4. Жми "Open" → детальная страница с фото и характеристиками

## API ЭНДПОИНТЫ

```bash
# Health check
GET /api/health

# Поиск компонентов
GET /api/search?q=LM317

# Детали продукта
GET /api/product?src=mouser&id=LM317T
```

## ЧТО ВНУТРИ?

- **Backend**: Node.js + Express (порт 9201)
- **APIs**: Mouser + Farnell (официальные REST API)
- **Cache**: SQLite (7 дней search, 30 дней product)
- **Currency**: USD/EUR/GBP → RUB (курсы ЦБ РФ)
- **Frontend**: Vanilla JS (без фреймворков)

## API КЛЮЧИ

Файл `.env` (уже создан и настроен!):
```bash
MOUSER_API_KEY=b1ade04e-2dd0-4bd9-b5b4-e51f252a0687
FARNELL_API_KEY=9bbb8z5zuutmrscx72fukhvr
FARNELL_REGION=uk.farnell.com
PORT=9201
```

## PRODUCTION

**URL**: http://89.104.69.77  
**Деплой**: `npm run deploy`

## ПРОБЛЕМЫ?

1. Проверь `.env` файл существует
2. Проверь Node.js версию: `node --version` (нужна 18+)
3. Проверь порт 9201 свободен
4. Посмотри логи в консоли

## ДОКУМЕНТАЦИЯ

- **ИТОГОВЫЙ-ОТЧЁТ.md** - полная информация о проекте
- **LOCAL-AUDIT-REPORT.md** - технический аудит
- **ПРОЕКТ-СУТЬ.md** - простое объяснение
- **README.md** - установка и команды

## СТАТУС

✅ **РАБОТАЕТ И ЗАПУЩЕН**  
✅ API ключи настроены  
✅ Сервер запущен на localhost:9201  
✅ Production работает на 89.104.69.77

**ПОЛЬЗУЙСЯ!** 🎯
