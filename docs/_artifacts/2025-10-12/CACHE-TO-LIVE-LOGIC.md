# ЛОГИКА ПОИСКА: КЭШ → LIVE

**Дата**: 12 октября 2025

---

## 🎯 ТВОЙ ВОПРОС

> "у нас логика такая - если в кэше товар не находит, то включается лайв серч автоматом так?"

---

## ✅ ОТВЕТ: **НЕТ, НЕ АВТОМАТИЧЕСКИ**

### Реальная логика в коде:

---

## 📋 ЭНДПОИНТЫ И ИХ ЛОГИКА

### 1. **`/api/search`** (обычный поиск с кэшем)

**Файл**: `server.js`, строки 495-590

**Логика**:
```javascript
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  
  // 1. ПРОВЕРКА КЭША (TTL 7 дней)
  const cached = readCachedSearch(db, q.toLowerCase(), TTL);
  if (cached && req.query.fresh !== '1') {
    console.log('📦 Cache HIT');
    return res.json({
      ok: true,
      rows: cached.rows,
      meta: { cached: true }
    });
  }
  
  // 2. LIVE SEARCH (если кэша нет ИЛИ ?fresh=1)
  const aggregated = await orchestrateProviderSearch(q, keys);
  
  // 3. СОХРАНЕНИЕ В КЭШ
  if (aggregated.rows.length > 0) {
    cacheSearch(db, q.toLowerCase(), aggregated.rows, { source: 'providers' });
  }
  
  return res.json({
    ok: true,
    rows: aggregated.rows,
    meta: { cached: false }
  });
});
```

**Вывод**:
- ✅ **АВТОМАТИЧЕСКИЙ FALLBACK**: Если кэша нет → запускается live search
- ✅ Результаты live search **сохраняются в кэш**
- ✅ Можно принудительно обновить: `?fresh=1`

---

### 2. **`/api/vitrine/list`** (только кэш)

**Файл**: `api/vitrine.mjs`

**Логика**:
```javascript
app.get('/api/vitrine/list', (req, res) => {
  const q = req.query.q;
  
  // ТОЛЬКО КЭШ - НЕТ LIVE SEARCH!
  const allRows = fetchFromCache(db);
  const filtered = applyFilters(allRows, q, inStock, priceMin, priceMax);
  
  return res.json({
    ok: true,
    rows: filtered,
    meta: { cached: true }
  });
});
```

**Вывод**:
- ❌ **НЕТ FALLBACK**: Только данные из кэша
- ❌ Если в кэше нет → вернёт пустой массив
- ❌ Live search **не запускается**

---

### 3. **`/api/live/search`** (только live, SSE)

**Файл**: `api/live-search.mjs`

**Логика**:
```javascript
app.get('/api/live/search', (req, res) => {
  const q = req.query.q;
  
  // ТОЛЬКО LIVE SEARCH - БЕЗ КЭША!
  open(res);  // SSE stream
  
  const targets = buildTargets(q);
  // ... скрапинг ChipDip
  
  done(res);
});
```

**Вывод**:
- ❌ **НЕ ПРОВЕРЯЕТ КЭШ**: Всегда идёт в live search
- ❌ **НЕ СОХРАНЯЕТ В КЭШ**: Результаты не кэшируются
- ✅ Используется для real-time поиска

---

## 📊 ИТОГОВАЯ ТАБЛИЦА

| Endpoint | Проверяет кэш | Live search | Сохраняет в кэш | Fallback кэш→live |
|----------|---------------|-------------|-----------------|-------------------|
| `/api/search` | ✅ ДА (TTL 7д) | ✅ ДА (если кэша нет) | ✅ ДА | ✅ **АВТОМАТИЧЕСКИЙ** |
| `/api/vitrine/list` | ✅ ДА (только кэш) | ❌ НЕТ | N/A | ❌ НЕТ |
| `/api/live/search` | ❌ НЕТ | ✅ ДА (всегда) | ❌ НЕТ | N/A |
| `/api/product` | ✅ ДА (TTL 30д) | ✅ ДА (если кэша нет) | ✅ ДА | ✅ **АВТОМАТИЧЕСКИЙ** |

---

## 🔍 ДЕТАЛЬНЫЙ РАЗБОР `/api/search`

### Шаг 1: Проверка кэша

**Код** (server.js:512):
```javascript
const TTL = 7 * 24 * 60 * 60 * 1000;  // 7 дней
const cached = readCachedSearch(db, q.toLowerCase(), TTL);

if (cached && req.query.fresh !== '1') {
  console.log(`📦 Cache HIT: ${cached.rows.length} rows`);
  return res.json({ ok: true, rows: cached.rows, meta: { cached: true } });
}
```

**Что проверяется**:
- ✅ Есть ли в таблице `searches` запись с `q = "lm317"`
- ✅ Не истёк ли TTL (7 дней с момента кэширования)
- ✅ Не передан ли параметр `?fresh=1`

**Если попадание**:
- Возвращает данные из кэша
- **НЕ** запускает live search
- Метрики: `cacheOperations.inc({ operation: 'hit' })`

---

### Шаг 2: Live Search (если кэша нет)

**Код** (server.js:546):
```javascript
const aggregated = await orchestrateProviderSearch(q, keys);
const rows = aggregated.rows;
```

**Что делает** `orchestrateProviderSearch`:
1. **Parallel поиск** по 4 провайдерам (Mouser, DigiKey, TME, Farnell)
2. **Timeout** 9.5 секунд на каждого
3. **Concurrency** 4 (все одновременно)
4. **Dedup** результатов (убирает дубли по `provider::mpn`)
5. **Ranking** (exact match > partial > text > stock > price)

**Провайдеры**:
- ✅ Mouser: `mouserSearchByKeyword({ q, records: 50 })`
- ✅ DigiKey: `digikeySearch({ keyword, limit: 25 })`
- ✅ TME: `tmeSearchProducts({ query })` → `tmeGetProduct({ symbols })` (цены)
- ✅ Farnell: `farnellByKeyword({ q, limit: 25 })`

---

### Шаг 3: Сохранение в кэш

**Код** (server.js:549):
```javascript
if (rows.length > 0) {
  cacheSearch(db, q.toLowerCase(), rows, { source: 'providers' });
}
```

**Что сохраняется**:
- Таблица `searches`: `(q, source, total, ts)`
- Таблица `search_rows`: `(q, ord, row)` — каждый товар отдельной строкой в JSON

**TTL**: При следующем запросе будет использоваться 7 дней.

---

## 🚨 ВАЖНЫЕ НАХОДКИ

### 1. `/api/vitrine/list` НЕ ИМЕЕТ FALLBACK

**Проблема**:
- Пользователь вводит "LM555" на главной странице
- Фронт вызывает `/api/vitrine/list?q=LM555`
- Если в кэше **нет** LM555 → **пустой результат**
- Live search **НЕ ЗАПУСКАЕТСЯ**

**Решение**:
Фронт должен вызывать `/api/search?q=LM555` вместо `/api/vitrine/list`.

---

### 2. Фронт (`app/search/page.tsx`) использует `/api/live/search`

**Код** (строка 93):
```typescript
const eventSource = new EventSource(`/api/live/search?q=${encodeURIComponent(searchQuery)}`)
```

**Проблема**:
- `/api/live/search` — это **ChipDip скрапинг** через SSE
- **НЕ** проверяет кэш
- **НЕ** использует Mouser/DigiKey/TME/Farnell
- **НЕ** сохраняет результаты

**Должен быть**:
```typescript
// Сначала проверить /api/search (с кэшем)
fetch(`/api/search?q=${searchQuery}`)
  .then(r => r.json())
  .then(data => {
    if (data.rows.length > 0) {
      setResults(data.rows);  // Из кэша или live
    } else {
      // Fallback на SSE ChipDip (если ничего не нашлось)
      startSSESearch(searchQuery);
    }
  });
```

---

### 3. `/api/product` ИМЕЕТ ПРАВИЛЬНЫЙ FALLBACK

**Код** (server.js:618-1086):
```javascript
app.get('/api/product', async (req, res) => {
  const mpn = req.query.mpn;
  
  // 1. Проверка кэша (TTL 30 дней)
  const cached = readCachedProduct(db, 'merged', mpn, TTL_PRODUCT_MS);
  if (cached) {
    return res.json({ ok: true, product: cached, meta: { cached: true } });
  }
  
  // 2. Parallel fetch из 4 провайдеров
  const [mouser, tme, farnell, digikey] = await Promise.allSettled([...]);
  
  // 3. Merge данных
  const product = mergeProductData(mouser, tme, farnell, digikey);
  
  // 4. Сохранение в кэш
  cacheProduct(db, 'merged', mpn, product);
  
  return res.json({ ok: true, product, meta: { cached: false } });
});
```

**Вывод**: ✅ **ИДЕАЛЬНАЯ ЛОГИКА** — кэш → live → сохранить.

---

## 🎯 РЕКОМЕНДАЦИИ

### 1. Фронт `/results` должен использовать `/api/search` (не `/api/live/search`)

**Было** (`app/search/page.tsx:93`):
```typescript
const eventSource = new EventSource(`/api/live/search?q=${searchQuery}`)
```

**Должно быть**:
```typescript
// Шаг 1: Попытка через кэш + live (обычный поиск)
setIsLoading(true);
fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
  .then(r => r.json())
  .then(data => {
    if (data.rows && data.rows.length > 0) {
      setResults(data.rows);
      setIsLoading(false);
    } else {
      // Шаг 2: Fallback на SSE ChipDip (если совсем ничего)
      startLiveSearch(searchQuery);
    }
  })
  .catch(() => {
    // Шаг 3: Если обычный поиск упал - попробовать SSE
    startLiveSearch(searchQuery);
  });
```

**Эффект**:
- ✅ Сначала проверит кэш (быстро)
- ✅ Если нет → запустит live search по 4 провайдерам
- ✅ Если и это не помогло → fallback на ChipDip SSE
- ✅ Результаты сохранятся в кэш

---

### 2. Добавить normalizeQuery в `/api/live/search`

**Уже обсуждалось** в BRIEF-ANSWERS.md.

---

### 3. НЕ использовать `/api/vitrine/list` для нового поиска

**Использовать**:
- ✅ `/api/vitrine/list` — только для **витрины** (browse по кэшу)
- ✅ `/api/search` — для **поиска** (кэш + live)

---

## 📊 FLOW ДИАГРАММА

```
Пользователь вводит "LM317"
       |
       v
   /api/search?q=LM317
       |
       v
  [Проверка кэша]
       |
     ┌─┴─┐
     │   │
    ДА  НЕТ
     │   │
     │   v
     │ [Live Search]
     │   ├─ Mouser (50 results)
     │   ├─ DigiKey (25 results)
     │   ├─ TME (pricing!)
     │   └─ Farnell (25 results)
     │   │
     │   v
     │ [Dedupe + Rank]
     │   │
     │   v
     │ [Сохранить в кэш]
     │   │
     └───┴─> Вернуть результаты
```

---

## ✅ ИТОГОВЫЙ ОТВЕТ НА ТВОЙ ВОПРОС

### **"у нас логика такая - если в кэше товар не находит, то включается лайв серч автоматом так?"**

**ДА, но только для `/api/search` и `/api/product`:**

| Endpoint | Автоматический fallback кэш→live |
|----------|----------------------------------|
| `/api/search` | ✅ **ДА** |
| `/api/product` | ✅ **ДА** |
| `/api/vitrine/list` | ❌ **НЕТ** (только кэш) |
| `/api/live/search` | N/A (нет кэша вообще) |

**Проблема**: Фронт использует `/api/live/search` (ChipDip SSE) вместо `/api/search` (кэш + Mouser/DigiKey/TME/Farnell).

**Решение**: Изменить `app/search/page.tsx` чтобы сначала вызывать `/api/search`, а `/api/live/search` использовать как fallback.

---

**Подготовлено**: GitHub Copilot в Tech Lead Mode  
**Дата**: 12 октября 2025  
**Статус**: Готов к обсуждению
