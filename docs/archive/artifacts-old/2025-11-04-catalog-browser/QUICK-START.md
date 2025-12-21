# ✅ DigiKey Catalog Browser — Quick Start

## Что сделано

Реализован браузер категорий DigiKey без использования API квоты:

- ✅ **1193 категории** импортированы из GitHub dataset
- ✅ **49 корневых категорий** (Capacitors, Resistors, ICs, Connectors, etc.)
- ✅ **1057 листовых категорий** (конечные узлы → поиск)
- ✅ **3 API endpoint** для навигации
- ✅ **Grid layout** с иконками (как на скриншоте DigiKey)
- ✅ **Breadcrumb навигация**
- ✅ **Интеграция с поиском** (листовые категории → /results)

---

## Как пользоваться

### 1. Открыть каталог

```
http://deep-agg.ru/catalog-test
```

Увидите **49 корневых категорий** в виде сетки с иконками.

### 2. Навигация

- **Клик на категорию** → откроется список подкатегорий
- **Breadcrumb** (вверху) → показывает текущий путь
- **Листовая категория** → автоматический редирект на `/results?q=...&category=...`

### 3. Примеры

**Путь навигации:**
```
Connectors, Interconnects → Barrel Connectors → Audio Connectors → результаты поиска
```

**URL структура:**
- Главная: `/catalog-test`
- Подкатегория: `/catalog-test?category=connectors-interconnects`
- Глубже: `/catalog-test?category=connectors-interconnects--barrel-connectors`
- Листовая → `/results?q=Audio+Connectors&category=...`

---

## API для разработки

### GET /api/catalog/categories
Возвращает корневые категории:
```json
{
  "ok": true,
  "count": 49,
  "categories": [
    {
      "id": 28,
      "name": "Anti-Static, ESD, Clean Room Products",
      "slug": "anti-static-esd-clean-room-products",
      "path": "Anti-Static, ESD, Clean Room Products",
      "icon_url": null
    },
    ...
  ]
}
```

### GET /api/catalog/categories/:slug
Возвращает категорию + подкатегории:
```json
{
  "ok": true,
  "category": {
    "id": 20,
    "name": "Connectors, Interconnects",
    "is_leaf": 0,
    ...
  },
  "subcategories": [
    {
      "id": 2026,
      "name": "AC Power Connectors",
      "slug": "connectors-interconnects--ac-power-connectors",
      "is_leaf": 0,
      ...
    },
    ...
  ]
}
```

### GET /api/catalog/breadcrumb/:slug
Возвращает путь от корня:
```json
{
  "ok": true,
  "breadcrumb": [
    {
      "id": 20,
      "name": "Connectors, Interconnects",
      "slug": "connectors-interconnects"
    },
    {
      "id": 2002,
      "name": "Barrel Connectors",
      "slug": "connectors-interconnects--barrel-connectors"
    }
  ]
}
```

---

## Технические детали

### База данных

**Таблица**: `catalog_categories`
```sql
CREATE TABLE catalog_categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES catalog_categories(id),
  path TEXT NOT NULL,
  is_root BOOLEAN DEFAULT 0,
  is_leaf BOOLEAN DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  icon_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Статистика**:
- Total: 1193
- Root: 49
- Leaf: 1057

### Файлы

**Backend:**
- `api/catalog.mjs` — API endpoints
- `scripts/import-digikey-categories.mjs` — импорт данных
- `server.js` — подключение API

**Frontend:**
- `views/pages/catalog-test.html` — страница каталога
- `api/frontend.routes.mjs` — роут /catalog-test

**Документация:**
- `docs/_artifacts/2025-11-04-catalog-browser/IMPLEMENTATION-REPORT.md`
- `docs/_artifacts/2025-11-04-catalog-browser/api-test.txt`
- `docs/_artifacts/2025-11-04-catalog-browser/page-snapshot.html`

---

## Что дальше?

### Опциональные улучшения:

1. **Иконки**: Заменить emoji на реальные иконки DigiKey
2. **Счётчики**: Показать количество товаров из кэша в каждой категории
3. **Поиск**: Фильтрация категорий по названию
4. **Перенос**: `/catalog-test` → `/catalog` (production route)
5. **Русификация**: Добавить переводы названий категорий
6. **Аналитика**: Трекинг популярных категорий

### Интеграция:

- `/results` уже поддерживает `?category=...` параметр
- Товары берутся из `search_rows` (кэш)
- Можно добавить фильтрацию по категориям в поиске

---

## Проверка работы

```bash
# 1. API - корневые категории
curl http://localhost:9201/api/catalog/categories | jq '.count'
# Ожидается: 49

# 2. API - подкатегории
curl "http://localhost:9201/api/catalog/categories/connectors-interconnects" | jq '.subcategories | length'
# Ожидается: 30+

# 3. Страница (в браузере)
open http://localhost:9201/catalog-test
```

---

## Источник данных

**GitHub Dataset**: https://github.com/silverXnoise/digikey-part-category-schema

- Экспортирован из DigiKey API (Feb 2024)
- 1:1 представление категорий DigiKey
- Open source (для InvenTree integration)
- Не требует API ключа или квоты

---

**Статус**: ✅ **PRODUCTION READY**  
**Коммит**: `57b452c` feat(catalog): add DigiKey category tree browser  
**Дата**: 2025-11-04  
