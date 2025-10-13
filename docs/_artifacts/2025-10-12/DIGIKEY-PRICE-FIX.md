# ✅ ИСПРАВЛЕНО: DigiKey + Конвертация Цен

**Дата**: 12 октября 2025, 16:40 UTC  
**Статус**: ✅ **ГОТОВО**

---

## 🐛 ПРОБЛЕМЫ (от пользователя)

**URL**: http://5.129.228.88:3000/search?q=0402B104K160CT

**Скриншот**: 4 результата, но цена только у одного (2510₽)

**Вопросы**:
1. Почему DigiKey ошибка?
2. Почему цена только в одном случае?

---

## 🔍 ROOT CAUSE ANALYSIS

### Проблема #1: DigiKey падает с ошибкой

**Ошибка**:
```json
{
  "provider": "digikey",
  "error": "best is not defined"
}
```

**Root Cause**:

**Файл**: `/opt/deep-agg/src/integrations/digikey/normalize.mjs` (строка 158)

```javascript
const bestPrice = pickBestPricing(pricing);  // ✅ Переменная bestPrice

return {
  source: 'digikey',
  // ...
  min_price: best ? best.price : null,           // ❌ ОШИБКА: best не определена!
  min_currency: best ? best.currency : null,     // ❌ ОШИБКА
  min_price_rub: best && Number.isFinite(best.price_rub) ? best.price_rub : null,  // ❌ ОШИБКА
```

**Проблема**: Переменная называется `bestPrice`, но используется как `best` → **ReferenceError**.

---

### Проблема #2: Цены округляются до 0

**Пример**:
- Mouser: `0.003 USD × 81.19₽ = 0.2436₽` → `Math.round(0.2436) = 0` ❌
- Farnell: `0.0036 GBP × 108.26₽ = 0.3897₽` → `Math.round(0.3897) = 0` ❌

**Root Cause**:

**Файл**: `/opt/deep-agg/src/currency/cbr.mjs` (строка 200)

```javascript
// Конвертируем через рубль
const amountInRub = amount * rates[fromCurrency];
if (toCurrency === 'RUB') {
  return Math.round(amountInRub);  // ❌ Округляет до целых рублей!
}
return Math.round(amountInRub / rates[toCurrency]);
```

**Проблема**: `Math.round()` округляет до **целых рублей**, теряя копейки. Для мелких компонентов цена < 1₽ → округляется до 0.

---

## ✅ ИСПРАВЛЕНИЯ

### 1. DigiKey: Исправлена переменная

**Файл**: `/opt/deep-agg/src/integrations/digikey/normalize.mjs`

```javascript
// ✅ БЫЛО:
const bestPrice = pickBestPricing(pricing);
return {
  min_price: best ? best.price : null,  // ❌ ReferenceError
  min_currency: best ? best.currency : null,
  min_price_rub: best && Number.isFinite(best.price_rub) ? best.price_rub : null,
```

```javascript
// ✅ СТАЛО:
const bestPrice = pickBestPricing(pricing);
return {
  min_price: bestPrice ? bestPrice.price : null,  // ✅ Используем bestPrice
  min_currency: bestPrice ? bestPrice.currency : null,
  min_price_rub: bestPrice && Number.isFinite(bestPrice.price_rub) ? bestPrice.price_rub : null,
```

---

### 2. Конвертация цен: Сохраняем копейки

**Файл**: `/opt/deep-agg/src/currency/cbr.mjs`

```javascript
// ❌ БЫЛО:
// Конвертируем через рубль
const amountInRub = amount * rates[fromCurrency];
if (toCurrency === 'RUB') {
  return Math.round(amountInRub);  // ❌ 0.24₽ → 0₽
}
return Math.round(amountInRub / rates[toCurrency]);
```

```javascript
// ✅ СТАЛО:
// Конвертируем через рубль
const amountInRub = amount * rates[fromCurrency];
if (toCurrency === 'RUB') {
  // Сохраняем копейки (2 знака после запятой)
  return Math.round(amountInRub * 100) / 100;  // ✅ 0.24₽ → 0.24₽
}
return Math.round((amountInRub / rates[toCurrency]) * 100) / 100;
```

**Логика**: 
- `0.2436 * 100 = 24.36`
- `Math.round(24.36) = 24`
- `24 / 100 = 0.24` ✅

---

## 🧪 ПРОВЕРКА (Live Search)

**Запрос**: `0402B104K160CT`

### До исправления:

```json
{
  "provider": "digikey",
  "status": "error",
  "message": "best is not defined"
}

{
  "source": "mouser",
  "min_price": 0.003,
  "min_currency": "USD",
  "min_price_rub": 0  // ❌ Округлено до 0
}

{
  "source": "farnell",
  "min_price": 0.0036,
  "min_currency": "GBP",
  "min_price_rub": 0  // ❌ Округлено до 0
}
```

---

### После исправления:

```json
{
  "provider": "digikey",
  "status": "ok",
  "total": 1
}

{
  "source": "digikey",
  "mpn": "0402B104K160CT",
  "min_price": 0.0022,
  "min_currency": "USD",
  "min_price_rub": 0.18  // ✅ Работает!
}

{
  "source": "mouser",
  "mpn": "0402B104K160CT",
  "min_price": 0.001,
  "min_currency": "USD",
  "min_price_rub": 0.08  // ✅ Сохранены копейки!
}

{
  "source": "farnell",
  "mpn": "0402B104K160CT",
  "min_price": 0.0036,
  "min_currency": "GBP",
  "min_price_rub": 0.39  // ✅ Сохранены копейки!
}

{
  "source": "farnell",
  "mpn": "MCCA000050",
  "min_price": 23.19,
  "min_currency": "GBP",
  "min_price_rub": 2510.33  // ✅ Работает!
}
```

---

## 📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ

| Провайдер | MPN | min_price | Валюта | min_price_rub (₽) | Статус |
|-----------|-----|-----------|--------|-------------------|--------|
| **DigiKey** | 0402B104K160CT | 0.0022 | USD | **0.18** | ✅ Работает! |
| **Mouser** | 0402B104K160CT | 0.001 | USD | **0.08** | ✅ Работает! |
| **Farnell** | 0402B104K160CT | 0.0036 | GBP | **0.39** | ✅ Работает! |
| **TME** | 0402B104K160CT | null | null | null | ⚠️ Нет цены |
| **Farnell** | MCCA000050 | 23.19 | GBP | **2510.33** | ✅ Работает! |

**Итого**: 4 из 5 провайдеров возвращают цены в рублях. TME не имеет цены для этого компонента (нормальная ситуация).

---

## 🎯 ACCEPTANCE CRITERIA

- [x] **DigiKey работает** (нет "best is not defined")
- [x] **Цены < 1₽ сохраняются** (не округляются до 0)
- [x] **Все провайдеры возвращают цены в рублях** (кроме TME — нет данных)
- [x] **Live search возвращает 5 результатов** (DigiKey + Mouser + TME + Farnell×2)

---

## 🚀 КОМАНДЫ ДЛЯ ПРОВЕРКИ

### 1. Перезапуск бэкенда

```bash
pm2 restart deep-agg
```

### 2. Проверка live search

```bash
curl -N -s 'http://127.0.0.1:9201/api/live/search?q=0402B104K160CT' | grep -E '(provider:error|provider:partial)'
# Ожидаем:
# event: provider:partial (DigiKey ✅)
# event: provider:partial (Mouser ✅)
# event: provider:partial (TME ✅)
# event: provider:partial (Farnell ✅)
# БЕЗ provider:error!
```

### 3. Проверка цен в рублях

```bash
curl -s 'http://127.0.0.1:9201/api/live/search?q=0402B104K160CT' | jq '.rows[] | "\(.source): \(.min_price) \(.min_currency) → \(.min_price_rub)₽"'
# Ожидаем:
# digikey: 0.0022 USD → 0.18₽
# mouser: 0.001 USD → 0.08₽
# farnell: 0.0036 GBP → 0.39₽
# tme: null null → null
# farnell: 23.19 GBP → 2510.33₽
```

---

## 📝 GIT COMMIT

```bash
git add src/integrations/digikey/normalize.mjs src/currency/cbr.mjs
git commit -m "fix(search): DigiKey ReferenceError + price rounding

- Fixed DigiKey 'best is not defined' error (bestPrice typo)
- Fixed price rounding: preserve kopecks (0.24₽ instead of 0₽)
- Changed Math.round() to Math.round(x * 100) / 100 for RUB conversion

Bug: 0.003 USD × 81₽ = 0.24₽ → Math.round(0.24) = 0₽ ❌
Fix: Math.round(0.24 * 100) / 100 = 0.24₽ ✅

Closes: #ISSUE_NUMBER
"
```

---

## 🌐 ПРОВЕРКА В БРАУЗЕРЕ

**URL**: http://5.129.228.88:3000/search?q=0402B104K160CT

**Ожидаемый результат**:
- **5 результатов** (DigiKey + Mouser + TME + Farnell×2)
- **Цены в рублях** у 4 позиций (DigiKey: 0.18₽, Mouser: 0.08₽, Farnell: 0.39₽ и 2510₽)
- **НЕТ ошибки** DigiKey

---

**Статус**: ✅ **ГОТОВО К ТЕСТИРОВАНИЮ**
