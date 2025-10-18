# ПЛАН: Автодополнение для поисковой строки

**Дата**: 17-18 октября 2025  
**Статус**: 📋 Ready for Implementation  
**Ветка для клонирования**: `feat/dynamic-specs-upload`

---

## 🎯 ЦЕЛЬ

Реализовать **умное автодополнение** для поисковой строки:
- Пользователь вводит `LM31` → система показывает подсказки `LM317T`, `LM3150`, `LM311`
- Работает с **2+ символов**
- Поддержка **RU→EN** нормализации (`транзистор` → `transistor`)
- **Мгновенный ответ** (5-15ms) через локальный FTS5 кэш

---

## 📋 АРХИТЕКТУРА

### Backend (Express)

**Новый endpoint**: `GET /api/autocomplete?q={prefix}`

**Файл**: `/opt/deep-agg/src/api/autocomplete.mjs`

**Алгоритм**:
1. Принять запрос `q` (минимум 2 символа)
2. Нормализовать через `queryNorm()` (кириллица → латиница)
3. Сформировать FTS5 запрос: `mpn:{prefix}* OR manufacturer:{prefix}* OR title:{prefix}*`
4. Выполнить SQL с FTS5 prefix search
5. Вернуть топ-10 уникальных результатов

**Формат ответа**:
```json
{
  "ok": true,
  "q": "LM31",
  "suggestions": [
    {
      "mpn": "LM317T",
      "manufacturer": "Texas Instruments",
      "title": "LDO Voltage Regulator"
    }
  ],
  "source": "cache",
  "count": 10
}
```

---

### Frontend (Next.js)

**Новый компонент**: `AutocompleteSearch.tsx`

**Hook**: `useDebounce<T>` (задержка 200ms)

**UI поведение**:
- Dropdown появляется при `q.length >= 2`
- Скрывается при клике вне или выборе
- Enter → переход на `/results?q={selected}`

---

## 📂 ФАЙЛЫ ДЛЯ СОЗДАНИЯ

### Backend
1. `/opt/deep-agg/src/api/autocomplete.mjs` — endpoint
2. `/opt/deep-agg/server.js` — подключить endpoint

### Frontend
1. `/opt/deep-agg/v0-components-aggregator-page/hooks/useDebounce.ts` — hook
2. `/opt/deep-agg/v0-components-aggregator-page/components/AutocompleteSearch.tsx` — компонент
3. `/opt/deep-agg/v0-components-aggregator-page/app/page.tsx` — интеграция

### Tests
1. `/opt/deep-agg/tests/autocomplete.spec.mjs` — smoke tests

---

## 🧪 ТЕСТИРОВАНИЕ

```bash
# Backend
curl "http://localhost:9201/api/autocomplete?q=LM31"

# Frontend
# Открыть http://localhost:3000
# Ввести "LM31" → dropdown должен появиться
```

---

## �� МЕТРИКИ

| Критерий | Целевое значение |
|----------|------------------|
| Латентность | < 20ms |
| Min длина запроса | 2 символа |
| Количество подсказок | 10 (топ) |
| Debounce | 200ms |
| RU→EN | ✅ |

---

## 🚀 DEPLOYMENT

```bash
# Dev
npm run dev  # backend (9201)
cd v0-components-aggregator-page && npm run dev  # frontend (3000)

# Prod
pm2 restart deep-agg
pm2 restart deep-v0
```

---

**Оценка времени**: 4-6 часов  
**Приоритет**: High

**Полная детализация**: см. `/opt/deep-agg/docs/_artifacts/2025-10-17-autocomplete/ANALYSIS.md`
