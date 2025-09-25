# MEMO-RU: DEEP Aggregator Project Overview

**Дата:** 25 сентября 2025  
**Ветка:** feature/ru-orchestrator-plug  
**Цель:** Интеграция RU-парсеров в оркестратор

## 📁 СТРУКТУРА ПРОЕКТА

### Основные файлы:
- `server.js` - Express сервер (порт 9201)
- `package.json` - зависимости и скрипты
- `public/ui/` - фронтенд (index.html, product.html, CSS, JS)

### API эндпоинты:
- `/api/search?q=MPN` - поиск компонентов
- `/api/product?mpn=MPN` - карточка товара
- `/_version` - версия API

### Существующие адаптеры:
- `adapters/oemstrade.js` - коммерческие данные (работает)
- `src/adapters/ru/` - RU-источники (созданы, НЕ интегрированы)

### Тесты:
- `tests/e2e/` - Playwright E2E тесты
- `tests/e2e/smoke-50.spec.ts` - smoke тесты (100% pass)
- `.github/workflows/ci.yml` - CI pipeline

## 🚨 ТЕКУЩИЕ ПРОБЛЕМЫ

1. **RU-адаптеры не интегрированы** - созданы файлы, но не вызываются
2. **Только fallback данные** - пустые карточки товаров
3. **Нет реального контента** - изображения, PDF, технические параметры
4. **Нет RU-описаний** - только английский контент

## 🎯 ПЛАН ИСПРАВЛЕНИЯ

### 1. Registry + Config
- `src/adapters/ru/registry.ts` - реестр источников
- `src/config/parsers.config.ts` - селекторы

### 2. Content Orchestrator
- `src/services/content-orchestrator.ts` - RU-оркестратор
- `src/utils/net-html.ts` - Cheerio утилиты

### 3. Integration
- Интеграция в `/api/product`
- UI маппинг полей
- E2E тесты для 12 MPN

### 4. CI/Testing
- Smoke-ru тесты ≥ 8/12
- CI-гейты
- Артефакты

## 📊 RU-ИСТОЧНИКИ

1. **ChipDip** - itemprop разметка, PDF в docs
2. **Electronshik** - технические характеристики, документация
3. **Platan** - характеристики, PDF ссылки
4. **Compel** - PDF endpoint'ы /item-pdf/

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

- **Приоритет:** RU-контент + OEMsTrade коммерция
- **Без try/catch** - только guard-ветки
- **Троттлинг:** 600-1200мс между запросами
- **Timeout:** 9000мс на запрос
- **Concurrency:** 2 параллельных запроса

---
**Статус:** В работе  
**Следующий шаг:** Создание registry.ts
