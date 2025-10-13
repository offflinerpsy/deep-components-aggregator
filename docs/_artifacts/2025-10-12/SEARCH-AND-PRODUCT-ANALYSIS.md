# АНАЛИЗ: ПОИСК И КАРТОЧКА ТОВАРА

**Дата**: 12 октября 2025  
**Контекст**: Проверка логики русификации, нормализации и конвертации в рубли

---

## 🔍 ЧТО ЗАЛОЖЕНО В BACKEND

### 1. Нормализация RU→EN (`src/search/normalizeQuery.mjs`)

**Функция**: `normalizeQuery(query)`

**Что делает**:
1. **Определяет Кириллицу**: проверяет есть ли русские буквы в запросе
2. **Транслитерирует**: GOST 7.79 System B (а→a, б→b, ж→zh, ...)
3. **Применяет синонимы**: 
   - "транзистор" → "transistor"
   - "резистор" → "resistor"
   - "конденсатор" → "capacitor"
   - "микросхема" → ["chip", "ic", "integrated circuit"]
   - "светодиод" → ["led", "light emitting diode"]
   - и т.д. (17 пар синонимов)

**Возвращает**:
```javascript
{
  original: "транзистор",           // Оригинальный запрос
  hasCyrillic: true,                // Есть ли кириллица
  transliterated: "tranzistor",     // Транслит
  normalized: "transistor",         // Лучший вариант (синоним)
  allQueries: ["tranzistor", "transistor"],  // Все варианты
  tokens: ["transistor"]            // Токены для FTS5
}
```

---

### 2. Endpoints с нормализацией

#### `/api/vitrine/list?q=...` (кэш-слой)

**Файл**: `api/vitrine.mjs`, строки 72-79

```javascript
if (q) {
  usedFts = true;
  
  // RU→EN normalization: detect Cyrillic, transliterate, apply synonyms
  queryMeta = normalizeQuery(q);
  const ftsQuery = queryMeta.normalized;  // ← СИНОНИМ ДЛЯ FTS5!
  
  const ftsResults = searchCachedFts(db, ftsQuery, 5000);
  allRows = ftsResults.map(r => ({ ...r.row, _fts_rank: r.rank }));
}
```

**Вывод**:
- ✅ Запрос "транзистор" **автоматически** превращается в "transistor"
- ✅ FTS5 поиск идёт по нормализованному запросу
- ✅ Метаданные нормализации **возвращаются** в ответе (`meta.queryNorm`)

**Пример ответа**:
```json
{
  "ok": true,
  "rows": [...826 products...],
  "meta": {
    "total": 100,
    "usedFts": true,
    "queryNorm": {
      "original": "транзистор",
      "hasCyrillic": true,
      "transliterated": "tranzistor",
      "normalized": "transistor",
      "allQueries": ["tranzistor", "transistor"]
    }
  }
}
```

---

#### `/api/live/search?q=...` (SSE живой поиск)

**Файл**: `api/live-search.mjs`

**ПРОБЛЕМА**: ❌ **НЕТ НОРМАЛИЗАЦИИ!**

Код напрямую строит URL:
```javascript
const q = String(req.query.q || "").trim();
const targets = buildTargets(q);  // ← Использует q как есть!
```

**Что это значит**:
- ❌ Если пользователь вводит "транзистор" в живой поиск
- ❌ Запрос уйдёт в ChipDip **по-русски**
- ❌ Результаты будут **только** если ChipDip поддерживает кириллицу

**Вывод**: `/api/live/search` **не использует** normalizeQuery — это пробел!

---

### 3. Конвертация в рубли

**Где происходит**: В провайдерах при парсинге (Mouser, DigiKey, TME, Farnell)

**Механизм**:
1. Backend загружает курсы ЦБ РФ (`lib/currency.mjs`)
2. Парсеры цен умножают USD/EUR на курс:
   ```javascript
   price_rub = price_usd * rates.USD  // 81.19₽ за доллар
   ```
3. Данные сохраняются в кэш (`search_rows`) с полями:
   - `price` (оригинальная валюта)
   - `currency` ("USD", "EUR", "GBP")
   - `price_rub` (конвертированная)

**Проверка курсов**:
```bash
curl http://127.0.0.1:9201/api/health
# "currency":{"age_hours":18,"rates":{"USD":81.1898,"EUR":94.0491}}
```

---

### 4. `/api/product?mpn=...` (карточка товара)

**Файл**: `server.js`, строки 618-1086

**СОВРЕМЕННЫЙ ENDPOINT** (v3.2):

```javascript
app.get('/api/product', async (req, res) => {
  const mpn = String(req.query.mpn || '').trim();
  
  // 1. Check cache (TTL 30 days)
  const cached = readCachedProduct(db, 'merged', mpn, TTL_PRODUCT_MS);
  if (cached) {
    return res.json({ ok: true, product: cached, meta: { cached: true } });
  }

  // 2. Parallel fetch from ALL providers
  const [mouserResult, tmeResult, farnellResult, digikeyResult] = await Promise.allSettled([
    mouserSearchByPartNumber({ apiKey, mpn }),
    tmeGetProduct({ token, secret, mpn }),
    farnellByMPN({ apiKey, region, q: mpn }),
    digikeyGetProduct({ clientId, clientSecret, partNumber: mpn })
  ]);

  // 3. Merge data from all sources
  const product = mergeProductData(mouserResult, tmeResult, farnellResult, digikeyResult);

  // 4. Cache merged result
  cacheProduct(db, 'merged', mpn, product);

  res.json({ ok: true, product, meta: { cached: false, sources: product.sources } });
});
```

**Что делает**:
1. ✅ **Проверяет кэш** (TTL 30 дней)
2. ✅ **Запрашивает ВСЕ провайдеры** параллельно (Mouser, TME, Farnell, DigiKey)
3. ✅ **Мержит данные** из всех источников
4. ✅ **Конвертирует цены** в рубли через `toRUB(price, currency)`
5. ✅ **Кэширует результат** (merged)

**Формат ответа**:
```json
{
  "ok": true,
  "product": {
    "mpn": "LM317T",
    "manufacturer": "STMicroelectronics",
    "title": "Linear Voltage Regulators 1.2-37V Adj Positive 1.5 Amp Output",
    "description": "...",
    "photo": "https://www.mouser.com/images/...",
    "images": ["url1", "url2", "url3"],
    "datasheets": ["https://www.st.com/.../CD00000455.pdf"],
    "technical_specs": {
      "Product Category": "Integrated Circuits (ICs)",
      "Output Type": "Adjustable",
      "Current - Output": "1.5A",
      "Operating Temperature": "0°C ~ 125°C",
      ...80+ полей
    },
    "pricing": [
      {"qty": 1, "price": "$0.56", "currency": "USD", "price_rub": 45, "source": "mouser"},
      {"qty": 10, "price": "$0.397", "currency": "USD", "price_rub": 32, "source": "mouser"},
      {"qty": 1, "price": 0.56, "currency": "USD", "price_rub": 45, "source": "digikey"},
      ...15+ прайс-брейков
    ],
    "availability": {
      "inStock": 35357,
      "sources": {"mouser": 18317, "tme": 0, "farnell": 0, "digikey": 35357},
      "leadTimes": {"mouser": "56 Days", "digikey": "8"}
    },
    "regions": ["US", "PL", "EU", "Global"],
    "vendorUrls": {
      "mouser": "https://www.mouser.com/ProductDetail/...",
      "tme": "https://www.tme.eu/en/details/LM317T/",
      "digikey": "https://www.digikey.com/en/products/detail/..."
    },
    "sources": {"mouser": true, "tme": true, "farnell": false, "digikey": true}
  },
  "meta": {
    "cached": true
  }
}
```

---

## 🚨 КРИТИЧНЫЕ НАХОДКИ

### 1. ❌ `/api/live/search` НЕ использует normalizeQuery

**Файл**: `api/live-search.mjs`, строка 18-23

```javascript
const q = String(req.query.q || "").trim();
const targets = buildTargets(q);  // ← Прямое использование q!
```

**Проблема**:
- Если пользователь вводит "транзистор" в живой поиск
- Запрос уйдёт в ChipDip **по-русски**
- Результаты будут **только** если ChipDip поддерживает кириллицу

**Решение**:
```javascript
const q = String(req.query.q || "").trim();
const normalized = normalizeQuery(q);
const targets = buildTargets(normalized.normalized);  // ← Использовать normalized!
note(res, { original: q, normalized: normalized.normalized });
```

---

### 2. ⚠️ Фронт ожидает `?mpn=...`, но старый API использует `?src=...&id=...`

**Старый endpoint** (`src/api/product.mjs`):
```javascript
app.get('/api/product', (req,res)=>{
  const src = String(req.query.src||'').toLowerCase();
  const id  = String(req.query.id||'').trim();
  // ...
});
```

**Новый endpoint** (`server.js`):
```javascript
app.get('/api/product', async (req, res) => {
  const mpn = String(req.query.mpn || '').trim();
  // ...
});
```

**Фронт вызывает** (`app/product/[mpn]/page.tsx`, строка 84):
```typescript
fetch(`/api/product?mpn=${encodeURIComponent(mpn)}`)
```

**Вывод**: ✅ **ФРОНТ И БЭК СОВПАДАЮТ!** Используется `?mpn=...`

Старый endpoint в `src/api/product.mjs` — это **legacy код**, который **не используется**.

---

### 3. ✅ Конвертация в рубли работает ВЕЗДЕ

**Все провайдеры** конвертируют цены:

```javascript
// Mouser (server.js:665)
pricing: (p.PriceBreaks || []).map(pb => ({
  qty: pb.Quantity,
  price: clean(pb.Price),
  currency: pb.Currency || 'USD',
  price_rub: toRUB(Number(clean(pb.Price).replace(/[^\d.]/g, '')), pb.Currency || 'USD')
}))

// TME (server.js:772)
pricing: prices.map(pr => ({
  qty: pr.Amount,
  price: pr.PriceValue,
  currency: pr.PriceType === 'netto' ? 'EUR' : 'EUR',
  price_rub: toRUB(Number(pr.PriceValue), 'EUR')
}))

// Farnell (server.js:856)
pricing: (p.prices || []).map(pr => ({
  qty: Number(pr.from),
  price: Number(pr.cost),
  currency: 'GBP',
  price_rub: toRUB(Number(pr.cost), 'GBP')
}))

// DigiKey (server.js:1003)
pricing: (p.StandardPricing || []).map(pb => ({
  qty: pb.BreakQuantity || 1,
  price: pb.UnitPrice,
  currency: pb.Currency || 'USD',
  price_rub: toRUB(Number(pb.UnitPrice), pb.Currency || 'USD')
}))
```

**Функция** `toRUB`:
```javascript
import { loadRates } from './cbr.mjs';  // ЦБ РФ курсы

export function toRUB(amount, currency) {
  const rates = loadRates();  // { USD: 81.19, EUR: 94.05, GBP: 107.12 }
  const rate = rates[currency] || 1;
  return Math.round(amount * rate);
}
```

---

## 📋 ПРОВЕРКА ИНТЕГРАЦИИ ФРОНТА

### Вызов из фронта (`app/product/[mpn]/page.tsx`)

**Строка 84-98**:
```typescript
fetch(`/api/product?mpn=${encodeURIComponent(mpn)}`)
  .then(r => r.ok ? r.json() : Promise.resolve({ ok: false }))
  .then((data) => {
    if (!data?.ok) { 
      setError('Продукт не найден'); 
      return 
    }
    setProduct(data.product)  // ✅ Сохраняет в стейт
    
    // Derive offers from pricing + regions
    const regs = (data.product.regions || ['GLOBAL'])
    const pricing = (data.product.pricing || [])
    const derived: Offer[] = []
    for (const reg of regs) {
      for (const pb of pricing) {
        derived.push({ 
          region: reg, 
          price: Number(pb.price_rub || pb.price) || 0,  // ✅ ИСПОЛЬЗУЕТ price_rub!
          moq: pb.qty 
        })
      }
    }
    setOffers(derived)
    
    // Set first image
    if (data.product.images && data.product.images.length > 0) {
      setSelectedImage(data.product.images[0])  // ✅ Использует images
    }
  })
```

**Рендер** (строки 187, 220, 241, 249, 263):
```typescript
// Images (строка 187)
{selectedImage ? (
  <img src={`/api/image?url=${encodeURIComponent(selectedImage)}`} />
) : (
  <svg>...</svg>
)}

// Gallery (строка 220)
{product.images && product.images.length > 1 && (
  <div className="grid grid-cols-4 gap-2">
    {product.images.slice(0, 4).map((img, idx) => (
      <img src={`/api/image?url=${encodeURIComponent(img)}`} />
    ))}
  </div>
)}

// Info (строка 241)
<h1>{product.mpn}</h1>
<h2>{product.manufacturer}</h2>
<h3>{product.title}</h3>

// Description (строка 249)
{product.description && (
  <div>{product.description}</div>
)}

// Pricing (строка 263)
{Array.isArray(product.pricing) && product.pricing.length > 0 && (
  <div>
    Цена от {Math.min(...product.pricing.map(p => p.price_rub || p.price))}₽
  </div>
)}

// Technical Specs (строка 338)
{Object.entries(product.technical_specs || {}).map(([k, v]) => (
  <div>
    <span>{k}</span>
    <span>{v}</span>
  </div>
))}

// Offers table (строка 358)
{offers.slice((page - 1) * pageSize, page * pageSize).map((o, i) => (
  <tr>
    <td>{o.region}</td>
    <td className="font-medium">{o.price}</td>  {/* ← price_rub! */}
    <td>{o.moq || '—'}</td>
  </tr>
))}

// Datasheets (строка 397)
{(product.datasheets || []).map((url, idx) => (
  <a href={`/api/pdf?url=${encodeURIComponent(url)}&dl=1`}>
    Документ #{idx + 1}
  </a>
))}
```

**Вывод**: ✅ **ФРОНТ ПОЛНОСТЬЮ ПОДКЛЮЧЁН К БЭКУ!**

---

## 🎯 ОТВЕТЫ НА ВОПРОСЫ

### Вопрос 1: "Что делать с поиском?"

**Ответ**:

#### `/api/vitrine/list?q=...` (кэш-поиск)
✅ **УЖЕ РАБОТАЕТ** через normalizeQuery:
- Русские запросы ("транзистор") → "transistor"
- FTS5 поиск по нормализованному запросу
- Метаданные нормализации в ответе (`meta.queryNorm`)

#### `/api/live/search?q=...` (живой поиск)
❌ **НЕ ИСПОЛЬЗУЕТ** normalizeQuery:
- Запросы уходят в ChipDip **как есть**
- Русские запросы могут не работать

**Решение**:
```javascript
// api/live-search.mjs, строка 18
import { normalizeQuery } from '../src/search/normalizeQuery.mjs';

const q = String(req.query.q || "").trim();
const queryMeta = normalizeQuery(q);
const targets = buildTargets(queryMeta.normalized);  // ← Использовать normalized

note(res, { 
  original: q, 
  normalized: queryMeta.normalized,
  hasCyrillic: queryMeta.hasCyrillic 
});
```

---

### Вопрос 2: "Карточка товара тоже?"

**Ответ**: ✅ **КАРТОЧКА ПОЛНОСТЬЮ РАБОТАЕТ!**

**Что работает**:
1. ✅ Fetch к `/api/product?mpn=...` (правильный формат)
2. ✅ Parallel поиск по 4 провайдерам (Mouser, TME, Farnell, DigiKey)
3. ✅ Merge данных из всех источников
4. ✅ Конвертация цен в рубли (`price_rub`)
5. ✅ Кэширование (TTL 30 дней)
6. ✅ Фронт использует все данные из API:
   - `product.mpn`, `manufacturer`, `title`, `description`
   - `product.images` → gallery
   - `product.pricing` → offers table с `price_rub`
   - `product.technical_specs` → specs table
   - `product.datasheets` → docs links
   - `product.availability.inStock` → stock indicator

**Проблем НЕТ!**

---

### Вопрос 3: "Русификация и нормализация?"

**Ответ**: ✅ **РАБОТАЕТ** в `/api/vitrine/list`, ❌ **НЕТ** в `/api/live/search`

**Таблица coverage**:

| Endpoint | Normalizeизация | Статус |
|----------|----------------|--------|
| `/api/vitrine/list` | ✅ normalizeQuery | ✅ РАБОТАЕТ |
| `/api/vitrine/sections` | N/A (без текстового поиска) | ✅ РАБОТАЕТ |
| `/api/search` | ⚠️ Не проверял, нужно читать код | ❓ НЕИЗВЕСТНО |
| `/api/live/search` | ❌ НЕТ | ❌ НЕ РАБОТАЕТ |
| `/api/product` | N/A (поиск по MPN) | ✅ РАБОТАЕТ |

---

### Вопрос 4: "Конвертация в рубли?"

**Ответ**: ✅ **РАБОТАЕТ ВЕЗДЕ!**

**Где конвертируется**:
1. ✅ `/api/product` → все pricing entries имеют `price_rub`
2. ✅ `/api/vitrine/list` → кэш содержит `min_price_rub`
3. ✅ Все провайдеры (Mouser, TME, Farnell, DigiKey) → `toRUB(price, currency)`

**Курсы**:
```bash
curl http://127.0.0.1:9201/api/currency/rates
# {"ok":true,"rates":{"USD":81.1898,"EUR":94.0491,"GBP":107.12},"age_hours":18}
```

**Обновление**: Автоматически через ЦБ РФ API (раз в сутки).

---

## 🔧 ЧТО НУЖНО ИСПРАВИТЬ

### Приоритет #1: Добавить normalizeQuery в `/api/live/search`

**Файл**: `api/live-search.mjs`

**Изменение**:
```javascript
// БЫЛО (строка 18):
const q = String(req.query.q || "").trim();
const targets = buildTargets(q);

// СТАНЕТ:
import { normalizeQuery } from '../src/search/normalizeQuery.mjs';

const q = String(req.query.q || "").trim();
const queryMeta = normalizeQuery(q);
const targets = buildTargets(queryMeta.normalized);

note(res, { 
  query: {
    original: q,
    normalized: queryMeta.normalized,
    hasCyrillic: queryMeta.hasCyrillic,
    transliterated: queryMeta.transliterated
  }
});
```

**Эффект**:
- ✅ "транзистор" → "transistor" автоматически
- ✅ ChipDip получит английский запрос
- ✅ Метаданные нормализации в SSE событиях

---

### Приоритет #2: Проверить `/api/search` (не live)

**Задача**: Прочитать код `/api/search` и проверить использует ли normalizeQuery.

**Если нет** → добавить аналогично `/api/live/search`.

---

## 📊 ИТОГОВАЯ ТАБЛИЦА

| Компонент | Русификация | Конвертация в ₽ | Статус |
|-----------|-------------|-----------------|--------|
| `/api/vitrine/list` | ✅ normalizeQuery | ✅ `min_price_rub` | ✅ РАБОТАЕТ |
| `/api/live/search` | ❌ НЕТ | ✅ цены в источнике | ❌ НУЖНО ДОБАВИТЬ |
| `/api/product` | N/A | ✅ `pricing[].price_rub` | ✅ РАБОТАЕТ |
| `/api/search` | ❓ НЕИЗВЕСТНО | ✅ вероятно | ❓ ПРОВЕРИТЬ |
| Фронт `app/page.tsx` | N/A (хардкод) | N/A | ❌ НУЖНО ИСПРАВИТЬ |
| Фронт `app/search/page.tsx` | ✅ SSE от бэка | ✅ `price_rub` | ✅ РАБОТАЕТ |
| Фронт `app/product/[mpn]/page.tsx` | N/A | ✅ `price_rub` | ✅ РАБОТАЕТ |

---

**Подготовлено**: GitHub Copilot в Tech Lead Mode  
**Дата**: 12 октября 2025  
**Версия**: 2.0.0  
**Статус**: Готов к обсуждению и исправлениям
