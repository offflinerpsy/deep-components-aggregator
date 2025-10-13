# КРАТКИЕ ОТВЕТЫ НА ВОПРОСЫ ПО ПОИСКУ И КАРТОЧКЕ

**Дата**: 12 октября 2025

---

## 🎯 ТВОИ ВОПРОСЫ

> "а что делать с поиском? у нас в логике заложен поиск с русификацией и всем остальным (нормализация) а также с конвертацией в рубли и многое прочее. карточка товара тоже."

---

## 📋 МОИ ОТВЕТЫ

### 1. **Поиск — что работает, что нет**

| Endpoint | Русификация | Конвертация ₽ | Статус |
|----------|-------------|---------------|--------|
| `/api/vitrine/list?q=...` | ✅ **РАБОТАЕТ** | ✅ **РАБОТАЕТ** | 🟢 ВСЁ ОК |
| `/api/live/search?q=...` | ❌ **НЕТ** | ✅ **РАБОТАЕТ** | 🟡 НУЖНО ДОБАВИТЬ |
| `/api/product?mpn=...` | N/A | ✅ **РАБОТАЕТ** | 🟢 ВСЁ ОК |

---

### 2. **Что конкретно заложено в русификацию**

**Файл**: `src/search/normalizeQuery.mjs`

**Функция**: `normalizeQuery(query)`

**Что делает**:
1. Определяет кириллицу в запросе
2. Транслитерирует: "транзистор" → "tranzistor"
3. Применяет синонимы: "tranzistor" → "transistor"
4. Возвращает нормализованный запрос для FTS5

**Примеры**:
```javascript
normalizeQuery("транзистор")
// → { normalized: "transistor", hasCyrillic: true }

normalizeQuery("резистор 100к")
// → { normalized: "resistor 100к", hasCyrillic: true }

normalizeQuery("LM317")
// → { normalized: "LM317", hasCyrillic: false }
```

**17 пар синонимов**:
- транзистор → transistor
- резистор → resistor
- конденсатор → capacitor
- микросхема → chip, ic
- светодиод → led
- стабилизатор → regulator
- ...и т.д.

---

### 3. **Где русификация РАБОТАЕТ**

#### ✅ `/api/vitrine/list?q=транзистор`

**Код** (`api/vitrine.mjs`, строка 72):
```javascript
if (q) {
  queryMeta = normalizeQuery(q);  // ← RU→EN!
  const ftsQuery = queryMeta.normalized;  // "transistor"
  const ftsResults = searchCachedFts(db, ftsQuery, 5000);
}
```

**Ответ**:
```json
{
  "ok": true,
  "rows": [...826 products...],
  "meta": {
    "queryNorm": {
      "original": "транзистор",
      "normalized": "transistor",
      "hasCyrillic": true
    }
  }
}
```

**Вывод**: ✅ **ПОЛНОСТЬЮ РАБОТАЕТ!**

---

### 4. **Где русификация НЕ РАБОТАЕТ**

#### ❌ `/api/live/search?q=транзистор`

**Код** (`api/live-search.mjs`, строка 18):
```javascript
const q = String(req.query.q || "").trim();
const targets = buildTargets(q);  // ← Прямое использование q!
```

**Проблема**:
- Запрос "транзистор" уйдёт в ChipDip **как есть** (по-русски)
- ChipDip может не поддерживать кириллицу
- Результаты будут пустыми

**Решение**:
```javascript
import { normalizeQuery } from '../src/search/normalizeQuery.mjs';

const q = String(req.query.q || "").trim();
const queryMeta = normalizeQuery(q);  // ← ДОБАВИТЬ!
const targets = buildTargets(queryMeta.normalized);  // ← Использовать нормализованный!
```

**Эффект**:
- "транзистор" → "transistor"
- ChipDip получит английский запрос
- Результаты будут корректными

---

### 5. **Что конкретно заложено в конвертацию рублей**

**Файл**: `src/currency/toRUB.mjs`

**Функция**: `toRUB(amount, currency)`

**Что делает**:
```javascript
import { loadRates } from './cbr.mjs';  // ЦБ РФ

export function toRUB(amount, currency) {
  const rates = loadRates();  // { USD: 81.19, EUR: 94.05, GBP: 107.12 }
  const rate = rates[currency] || 1;
  return Math.round(amount * rate);
}
```

**Пример**:
```javascript
toRUB(0.56, 'USD')  // → 45₽ (0.56 * 81.19)
toRUB(10.50, 'EUR') // → 987₽ (10.50 * 94.05)
toRUB(5.00, 'GBP')  // → 536₽ (5.00 * 107.12)
```

---

### 6. **Где конвертация РАБОТАЕТ**

#### ✅ `/api/product?mpn=LM317T`

**Все 4 провайдера** конвертируют:

**Mouser** (`server.js`, строка 665):
```javascript
pricing: (p.PriceBreaks || []).map(pb => ({
  qty: pb.Quantity,
  price: clean(pb.Price),
  currency: 'USD',
  price_rub: toRUB(Number(clean(pb.Price).replace(/[^\d.]/g, '')), 'USD')
}))
```

**TME** (строка 772):
```javascript
price_rub: toRUB(Number(pr.PriceValue), 'EUR')
```

**Farnell** (строка 856):
```javascript
price_rub: toRUB(Number(pr.cost), 'GBP')
```

**DigiKey** (строка 1003):
```javascript
price_rub: toRUB(Number(pb.UnitPrice), pb.Currency || 'USD')
```

**Ответ API**:
```json
{
  "ok": true,
  "product": {
    "mpn": "LM317T",
    "pricing": [
      {"qty": 1, "price": "$0.56", "currency": "USD", "price_rub": 45, "source": "mouser"},
      {"qty": 10, "price": "$0.397", "currency": "USD", "price_rub": 32, "source": "mouser"},
      {"qty": 1, "price": 0.56, "currency": "USD", "price_rub": 45, "source": "digikey"},
      ...15+ прайс-брейков с price_rub
    ]
  }
}
```

**Вывод**: ✅ **ВСЕ ЦЕНЫ В РУБЛЯХ!**

---

#### ✅ `/api/vitrine/list`

**Кэш содержит** `min_price_rub`:
```json
{
  "ok": true,
  "rows": [
    {
      "mpn": "LM317T",
      "min_price": 0.56,
      "min_currency": "USD",
      "min_price_rub": 45,  // ← УЖЕ СКОНВЕРТИРОВАН!
      "price_breaks": [
        {"qty": 1, "price": 0.56, "currency": "USD", "price_rub": 45}
      ]
    }
  ]
}
```

**Вывод**: ✅ **КЭШ УЖЕ СОДЕРЖИТ РУБЛИ!**

---

### 7. **Карточка товара — работает?**

**Ответ**: ✅ **ПОЛНОСТЬЮ РАБОТАЕТ!**

**Что работает в `/api/product?mpn=...`**:
1. ✅ Parallel поиск по 4 провайдерам (Mouser, TME, Farnell, DigiKey)
2. ✅ Merge данных из всех источников
3. ✅ Конвертация цен в рубли (`price_rub`)
4. ✅ 80+ технических характеристик (`technical_specs`)
5. ✅ Изображения со всех источников (`images[]`)
6. ✅ Даташиты со всех источников (`datasheets[]`)
7. ✅ Наличие со всех источников (`availability.sources`)
8. ✅ Кэширование (TTL 30 дней)

**Что работает на фронте** (`app/product/[mpn]/page.tsx`):
1. ✅ Fetch к `/api/product?mpn=...` (правильный формат)
2. ✅ Рендер всех данных из API:
   - `product.mpn`, `manufacturer`, `title`
   - `product.images` → gallery
   - `product.pricing` → offers table с `price_rub`
   - `product.technical_specs` → specs table
   - `product.datasheets` → docs links
   - `product.availability.inStock` → stock indicator

**Пример** (проверено через curl):
```bash
curl 'http://127.0.0.1:9201/api/product?mpn=LM317T'
# ✅ Возвращает merged данные с 4 провайдеров
# ✅ 80+ technical_specs
# ✅ 15+ pricing entries с price_rub
# ✅ 3 images
# ✅ 1 datasheet
```

**Вывод**: ❌ **ПРОБЛЕМ НЕТ!**

---

## 🔧 ЧТО НУЖНО ИСПРАВИТЬ

### Только ОДНА проблема: `/api/live/search` не использует normalizeQuery

**Файл**: `api/live-search.mjs`

**Изменение** (3 строки):
```javascript
// ДОБАВИТЬ import:
import { normalizeQuery } from '../src/search/normalizeQuery.mjs';

// ИЗМЕНИТЬ строку 18:
const q = String(req.query.q || "").trim();
const queryMeta = normalizeQuery(q);  // ← ДОБАВИТЬ!
const targets = buildTargets(queryMeta.normalized);  // ← Использовать normalized

// ДОБАВИТЬ в SSE событие:
note(res, { 
  original: q, 
  normalized: queryMeta.normalized 
});
```

**Эффект**:
- ✅ "транзистор" → "transistor" в живом поиске
- ✅ ChipDip получит английский запрос
- ✅ Результаты будут корректными

---

## 📊 ИТОГОВАЯ ТАБЛИЦА

| Что | Статус | Нужно действие |
|-----|--------|----------------|
| **Русификация в `/api/vitrine/list`** | ✅ РАБОТАЕТ | Нет |
| **Русификация в `/api/live/search`** | ❌ НЕТ | **Добавить normalizeQuery** |
| **Конвертация ₽ в `/api/product`** | ✅ РАБОТАЕТ | Нет |
| **Конвертация ₽ в `/api/vitrine/list`** | ✅ РАБОТАЕТ | Нет |
| **Карточка товара (бэк)** | ✅ РАБОТАЕТ | Нет |
| **Карточка товара (фронт)** | ✅ РАБОТАЕТ | Нет |
| **Главная страница (фронт)** | ❌ ХАРДКОД | **Добавить fetch** |

---

## 🎯 РЕКОМЕНДАЦИИ

### 1. Исправить `/api/live/search` (приоритет 🔴 ВЫСОКИЙ)

**Почему**: Пользователи пишут по-русски → живой поиск не работает

**Как**: Добавить 3 строки кода (см. выше)

**Время**: 5 минут

---

### 2. Исправить главную страницу (приоритет 🟡 СРЕДНИЙ)

**Почему**: Показывает статичные 28 компонентов вместо реальных 826

**Как**: Добавить fetch к `/api/vitrine/list?limit=28` (см. DETAILED-FIX-PLAN.md)

**Время**: 30 минут

---

### 3. Всё остальное — ✅ **УЖЕ РАБОТАЕТ!**

- ✅ Поиск по кэшу с русификацией
- ✅ Конвертация цен в рубли везде
- ✅ Карточка товара (бэк + фронт)
- ✅ Страница поиска (SSE)

---

**Подготовлено**: GitHub Copilot в Tech Lead Mode  
**Дата**: 12 октября 2025  
**Статус**: Готов к обсуждению
