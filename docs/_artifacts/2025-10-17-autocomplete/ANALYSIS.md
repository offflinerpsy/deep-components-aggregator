# Анализ: Autocomplete/Typeahead для поиска компонентов

**Дата**: 17 октября 2025  
**Запрос клиента**: Реализовать "умный поиск" с автодополнением — чтобы при наборе MPN/названия показывались подсказки до завершения ввода.

---

## 🎯 Требования клиента

**Что хочет клиент**:
- Пользователь начинает вводить MPN (например: `LM31`) или название (например: `резис`)
- **До завершения ввода** система показывает подсказки/варианты
- "Умный" поиск — подхватывает окончания автоматически

**Терминология**:
- **Autocomplete** — автодополнение запроса (предложить варианты завершения)
- **Typeahead** — поиск при наборе (показать результаты в реальном времени)
- **Suggest** — подсказки (похожие запросы/товары)

---

## ✅ Что уже есть в системе

### 1. FTS5 с prefix index

**Текущая конфигурация SQLite FTS5**:
```sql
CREATE VIRTUAL TABLE search_rows_fts USING fts5(
  mpn,
  manufacturer,
  title,
  description,
  content='search_rows',
  content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2 tokenchars '-._'",
  prefix='2 3 4'  -- ✅ КЛЮЧ: поддержка префиксного поиска с 2-4 символов
)
```

**Что это даёт**:
- ✅ **Быстрый префиксный поиск**: запрос `LM31*` найдёт `LM317T`, `LM3150`, `LM311` и т.д.
- ✅ **Токены сохраняют структуру MPN**: `-._` не удаляются (`STM32F4`, `SOT-223`)
- ✅ **Работает с 2-4 символами**: `"LM"` → FTS5 index, быстро

### 2. Кэш-слой (search_rows)

**База данных**: `/opt/deep-agg/var/db/deepagg.sqlite`

**Таблица кэша**:
```sql
search_rows (q TEXT, ord INTEGER, row TEXT)
```

- Кэш на **7 дней** (TTL_SEARCH_MS)
- Хранит результаты поиска в JSON (`row`)
- FTS5 индекс синхронизируется через triggers

### 3. RU→EN нормализация

**Модуль**: `/opt/deep-agg/src/search/normalizeQuery.mjs`

Транслитерация кириллицы:
- `"резистор"` → `"resistor"` (queryNorm)
- Поддержка синонимов

---

## 🔍 Возможности API поставщиков

### DigiKey API

**Эндпоинт**: `POST /products/v4/search/keyword`

**Параметры**:
```json
{
  "Keywords": "LM31",
  "RecordCount": 10,
  "RecordStartPosition": 0
}
```

**Поддержка autocomplete**:
- ❌ **Нет отдельного suggest endpoint**
- ✅ **Можно использовать keyword search** с малым `RecordCount` (быстрые результаты)
- ⚠️ **Ограничение**: поиск по полному запросу, не префикс (DigiKey делает свой FTS внутри)

**Латентность**: ~500-1500ms (OAuth + запрос)

---

### Mouser API

**Эндпоинт**: `POST /api/v1/search/keyword`

**Параметры**:
```json
{
  "SearchByKeywordRequest": {
    "keyword": "LM31",
    "records": 10,
    "startingRecord": 0
  }
}
```

**Поддержка autocomplete**:
- ❌ **Нет отдельного suggest endpoint**
- ✅ **Можно использовать keyword search** с `records=10` для быстрых результатов
- ⚠️ **Ограничение**: поиск по всему запросу

**Латентность**: ~300-800ms

---

### Farnell API

**Эндпоинт**: `GET /products?term={query}&limit=10`

**Поддержка autocomplete**:
- ❌ **Нет suggest endpoint**
- ✅ **Keyword search** работает с частичными запросами

**Латентность**: ~500-1000ms

---

### TME API

**Эндпоинт**: Proprietary (не REST)

**Поддержка autocomplete**:
- ❌ **Нет suggest endpoint**
- ✅ **Keyword search** через SDK

**Латентность**: ~600-1200ms

---

## 💡 Рекомендуемое решение

### Вариант 1: **Autocomplete на базе локального кэша (FTS5)** ✅ ЛУЧШИЙ

**Идея**:
- Использовать **FTS5 prefix index** для мгновенных подсказок из кэша
- Показывать топ-10 совпадений из уже закэшированных результатов
- **Не делать внешние API-вызовы** при каждом нажатии клавиши

**Преимущества**:
- ⚡ **Мгновенный ответ** (<10ms) — локальная БД
- 💰 **Не расходуем API лимиты** поставщиков
- 🌐 **Работает офлайн** (на базе кэша)
- 📊 **Улучшается со временем** (кэш растёт)

**Недостатки**:
- ⚠️ Показывает только то, что уже искали раньше (холодный старт пустой)
- ⚠️ Нет новинок из API (только кэш)

---

#### Реализация варианта 1

**Новый API endpoint**: `GET /api/autocomplete?q={prefix}`

**SQL-запрос** (FTS5 prefix search):
```sql
SELECT DISTINCT mpn, manufacturer, title
FROM search_rows_fts
WHERE search_rows_fts MATCH ?  -- 'mpn:LM31* OR title:LM31*'
ORDER BY rank
LIMIT 10
```

**Алгоритм**:
1. Клиент вводит `"LM31"` → отправляет `GET /api/autocomplete?q=LM31`
2. Backend:
   - Проверяет длину запроса (минимум 2 символа)
   - Формирует FTS5-запрос: `mpn:LM31* OR manufacturer:LM31* OR title:LM31*`
   - Выполняет SELECT из FTS5 (локально, быстро)
   - Возвращает топ-10 результатов
3. Frontend отображает dropdown с подсказками

**Латентность**: ~5-15ms (локальная БД)

**Формат ответа**:
```json
{
  "ok": true,
  "q": "LM31",
  "suggestions": [
    { "mpn": "LM317T", "manufacturer": "Texas Instruments", "title": "LDO Voltage Regulator" },
    { "mpn": "LM3150", "manufacturer": "TI", "title": "Buck Converter" },
    { "mpn": "LM311", "manufacturer": "TI", "title": "Comparator" }
  ],
  "source": "cache"
}
```

---

### Вариант 2: **Hybrid — кэш + live fallback** (если кэш пустой)

**Идея**:
- Сначала проверяем FTS5 кэш (мгновенно)
- Если кэш пустой (<3 результатов) → делаем **один** быстрый запрос к провайдеру (например, Mouser)
- Кэшируем результаты для следующих запросов

**Преимущества**:
- ⚡ Быстро для популярных запросов (кэш)
- 🆕 Работает для новых/редких компонентов (live API)

**Недостатки**:
- 📉 Медленнее для холодного старта (300-800ms при первом запросе)
- 💰 Тратим API лимиты

---

### Вариант 3: **Full live search** (делать API-вызовы при каждом нажатии) ❌ НЕ РЕКОМЕНДУЮ

**Проблемы**:
- 🐌 **Медленно**: 300-1500ms латентность
- 💸 **Дорого**: быстро исчерпаем API лимиты поставщиков
- 🚫 **Rate limiting**: DigiKey/Mouser могут забанить за частые запросы
- ⚡ **Плохой UX**: задержки при вводе

---

## 🎯 Рекомендация

### ✅ **Реализовать Вариант 1: FTS5 Autocomplete**

**План реализации**:

1. **Backend**: Новый endpoint `/api/autocomplete`
2. **SQL**: FTS5 prefix search по кэшу
3. **Frontend**: Dropdown с подсказками (debounce 200ms)
4. **Fallback**: Если кэш пустой → показать hint "Попробуйте полный поиск"

**Оценка времени**: ~4-6 часов разработки + тестирование

---

## 📋 Детальный план реализации

### Backend (Express)

**Файл**: `/opt/deep-agg/src/api/autocomplete.mjs`

```javascript
import { queryNorm } from '../search/normalizeQuery.mjs';

export default function mountAutocomplete(app, { db }) {
  app.get('/api/autocomplete', (req, res) => {
    const q = String(req.query.q || '').trim();
    
    // Минимум 2 символа для autocomplete
    if (q.length < 2) {
      return res.json({ ok: true, q, suggestions: [], source: 'none' });
    }
    
    // RU→EN нормализация
    const normalized = queryNorm(q).normalized;
    
    // FTS5 prefix search
    const stmt = db.prepare(`
      SELECT DISTINCT
        json_extract(row, '$.mpn') AS mpn,
        json_extract(row, '$.manufacturer') AS manufacturer,
        json_extract(row, '$.title') AS title
      FROM search_rows
      WHERE rowid IN (
        SELECT rowid FROM search_rows_fts
        WHERE search_rows_fts MATCH ?
        LIMIT 10
      )
    `);
    
    // FTS5 query: "mpn:LM31* OR manufacturer:LM31* OR title:LM31*"
    const ftsQuery = `mpn:${normalized}* OR manufacturer:${normalized}* OR title:${normalized}*`;
    
    const rows = stmt.all(ftsQuery);
    
    res.json({
      ok: true,
      q,
      suggestions: rows,
      source: 'cache',
      count: rows.length
    });
  });
}
```

**Подключить в `server.js`**:
```javascript
import mountAutocomplete from './src/api/autocomplete.mjs';
mountAutocomplete(app, { db });
```

---

### Frontend (Next.js)

**Компонент**: `/v0-components-aggregator-page/components/AutocompleteSearch.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface Suggestion {
  mpn: string;
  manufacturer: string;
  title: string;
}

export function AutocompleteSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const debouncedQuery = useDebounce(query, 200); // Задержка 200ms
  
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    
    setIsLoading(true);
    
    fetch(`/api/autocomplete?q=${encodeURIComponent(debouncedQuery)}`)
      .then(res => res.json())
      .then(data => {
        setSuggestions(data.suggestions || []);
        setIsLoading(false);
      })
      .catch(() => {
        setSuggestions([]);
        setIsLoading(false);
      });
  }, [debouncedQuery]);
  
  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск компонентов..."
        className="search-input"
      />
      
      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-white shadow-lg rounded-b-lg border">
          {suggestions.map((s, i) => (
            <div key={i} className="p-3 hover:bg-gray-100 cursor-pointer">
              <div className="font-semibold">{s.mpn}</div>
              <div className="text-sm text-gray-600">{s.manufacturer}</div>
              <div className="text-xs text-gray-500">{s.title}</div>
            </div>
          ))}
        </div>
      )}
      
      {isLoading && (
        <div className="absolute right-3 top-3">
          <span className="animate-spin">🔄</span>
        </div>
      )}
    </div>
  );
}
```

**Hook debounce**: `/v0-components-aggregator-page/hooks/useDebounce.ts`
```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}
```

---

## 🧪 Тестирование

### Smoke tests

**Файл**: `/opt/deep-agg/tests/autocomplete.spec.mjs`

```javascript
import { test, expect } from 'vitest';
import request from 'supertest';

test('GET /api/autocomplete — короткий запрос', async () => {
  const res = await request('http://localhost:9201')
    .get('/api/autocomplete?q=L')
    .expect(200);
  
  expect(res.body.ok).toBe(true);
  expect(res.body.suggestions).toEqual([]);
  expect(res.body.source).toBe('none');
});

test('GET /api/autocomplete — префикс LM31', async () => {
  const res = await request('http://localhost:9201')
    .get('/api/autocomplete?q=LM31')
    .expect(200);
  
  expect(res.body.ok).toBe(true);
  expect(Array.isArray(res.body.suggestions)).toBe(true);
  expect(res.body.source).toBe('cache');
});

test('GET /api/autocomplete — RU→EN нормализация', async () => {
  const res = await request('http://localhost:9201')
    .get('/api/autocomplete?q=рези')
    .expect(200);
  
  expect(res.body.ok).toBe(true);
  // Должен искать "resi*" после нормализации
});
```

---

## 📊 Метрики производительности

### Ожидаемые показатели

| Сценарий | Латентность | Нагрузка на API | UX |
|----------|-------------|-----------------|-----|
| **Вариант 1 (FTS5 кэш)** | 5-15ms | ✅ Нет | ⚡ Отлично |
| **Вариант 2 (Hybrid)** | 5-800ms | ⚠️ Средняя | 🟡 Хорошо |
| **Вариант 3 (Full live)** | 300-1500ms | ❌ Высокая | 🐌 Плохо |

---

## 🚀 Развёртывание

### Этапы

1. ✅ **R (Разведка)**: Изучить FTS5 schema, проверить prefix index — **ГОТОВО**
2. ⏳ **I (Реализация)**: Написать `/api/autocomplete` endpoint
3. ⏳ **I (Реализация)**: Добавить frontend компонент с debounce
4. ⏳ **P (Доказательства)**: Smoke tests + артефакты в `docs/_artifacts/`
5. ⏳ **Деплой**: PM2 restart, проверка на production

---

## 📝 Выводы

### ✅ **Ответ клиенту: ДА, это возможно**

**Что можем сделать**:
1. ✅ **Мгновенный autocomplete** на базе FTS5 кэша (5-15ms)
2. ✅ **Поддержка префиксов** от 2 символов (`LM`, `резис`)
3. ✅ **RU→EN нормализация** работает из коробки
4. ✅ **Не расходуем API лимиты** поставщиков

**Ограничения**:
- ⚠️ Показывает только закэшированные результаты (холодный старт пустой)
- ⚠️ Для редких/новых компонентов нужен полный поиск (live API)

**Рекомендация**: Начать с **Варианта 1** (FTS5 autocomplete), затем добавить **hybrid fallback** если нужно.

---

**Создано**: 2025-10-17  
**Автор**: GitHub Copilot  
**Статус**: Готов к реализации
