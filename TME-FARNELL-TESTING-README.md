# TME & Farnell API Testing Guide

## 🎯 Цель

Протестировать TME и Farnell APIs, понять причины ошибок и интегрировать их как fallback к DigiKey.

---

## 📋 Статус

### ✅ Работающие источники
- **Mouser:** 24+ technical specs, pricing, availability
- **DigiKey:** 23 technical specs, pricing, availability (через WARP proxy)

### ❌ Заблокированные источники
- **TME:** 403 "E_ACTION_FORBIDDEN" - требует исследования
- **Farnell:** 200 OK но пустой массив products - требует исследования

---

## 🧪 Тестовые скрипты

### 1. TME API Test (`scripts/test_tme_credentials.py`)

**Что тестирует:**
- 4 разных метода генерации HMAC signature
- Проверку валидности credentials
- Разные форматы plaintext для подписи

**Как запустить:**
```bash
# Локально (Windows)
cd c:\Users\Makkaroshka\Documents\aggregator-v2
python scripts\test_tme_credentials.py

# На сервере
ssh root@5.129.228.88
cd /opt/deep-agg
python3 scripts/test_tme_credentials.py
```

**Что ожидать:**
- ✅ 200 OK → credentials валидные, нашли рабочий метод подписи
- ❌ 403 → проблема с credentials или permissions
- ❌ 401 → invalid token

### 2. Farnell API Test (`scripts/test_farnell_regions.py`)

**Что тестирует:**
- 4 разных региона (UK Farnell, US Newark, Element14, CPC)
- 4 разных метода поиска (keyword, mftrPartNumber, manufacturerPartNumber, exactMatch)
- REST API v3 endpoints

**Как запустить:**
```bash
# Локально (Windows)
cd c:\Users\Makkaroshka\Documents\aggregator-v2
python scripts\test_farnell_regions.py

# На сервере
ssh root@5.129.228.88
cd /opt/deep-agg
python3 scripts/test_farnell_regions.py
```

**Что ожидать:**
- ✅ Найдёт хотя бы одну рабочую комбинацию (регион + метод)
- ❌ Пустые результаты → неправильный регион или метод поиска
- ❌ 401 → invalid API key

---

## 🔧 Настройка

### Environment Variables

Добавить в `.env` на сервере:
```bash
# TME API
TME_TOKEN=your_tme_token_here
TME_SECRET=your_tme_secret_here

# Farnell API
FARNELL_API_KEY=your_farnell_api_key_here
FARNELL_REGION=uk.farnell.com
```

### Локальный тест (опционально)

Создать `.env` в корне проекта:
```bash
TME_TOKEN=your_token
TME_SECRET=your_secret
FARNELL_API_KEY=your_key
```

Установить зависимости:
```bash
pip install requests python-dotenv
```

---

## 📊 Ожидаемые результаты

### TME API

**SUCCESS (200 OK):**
```json
{
  "Status": {
    "ErrorList": [],
    "ErrorCount": 0
  },
  "Data": {
    "ProductList": [
      {
        "Symbol": "LM317",
        "Producer": "ON Semiconductor",
        "Description": "Voltage regulator...",
        "OriginalSymbol": "LM317",
        "Photo": "https://...",
        "Thumbnail": "https://...",
        "CategoryTree": [...],
        "Parameters": [...]
      }
    ],
    "Amount": 123
  }
}
```

**FAILURE (403):**
```json
{
  "Status": {
    "ErrorList": ["E_ACTION_FORBIDDEN"],
    "ErrorCount": 1
  }
}
```

### Farnell API

**SUCCESS (200 OK with results):**
```json
{
  "premierFarnellPartNumberReturn": {
    "numberOfResults": 15,
    "products": [
      {
        "sku": "1234567",
        "translatedManufacturerPartNumber": "LM317",
        "displayName": "Linear Voltage Regulator...",
        "stockLevel": 1000,
        "prices": [...]
      }
    ]
  }
}
```

**FAILURE (200 OK but empty):**
```json
{
  "premierFarnellPartNumberReturn": {
    "numberOfResults": 0,
    "products": []
  }
}
```

---

## 🐛 Troubleshooting

### TME 403 Error

**Возможные причины:**
1. **Invalid credentials**
   - Проверить TME_TOKEN и TME_SECRET
   - Убедиться что нет лишних пробелов
   - Проверить что API key активирован

2. **Wrong signature format**
   - Тест пробует 4 разных формата
   - Если все 4 не работают → проблема не в signature

3. **API permissions**
   - Проверить в TME developer portal какие endpoints доступны
   - Убедиться что есть доступ к `products/search`

4. **IP restrictions**
   - Возможно TME блокирует Holland VPS IP
   - Попробовать через WARP proxy (уже настроен для DigiKey)

**Как исправить:**
```bash
# 1. Проверить credentials
echo $TME_TOKEN
echo $TME_SECRET

# 2. Попробовать другой endpoint
curl -X POST https://api.tme.eu/products/getproducts.json \
  -d "Token=$TME_TOKEN" \
  -d "SymbolList=LM317" \
  -d "ApiSignature=..."

# 3. Попробовать через WARP proxy
export HTTPS_PROXY=http://127.0.0.1:25345
python3 scripts/test_tme_credentials.py
```

### Farnell Empty Results

**Возможные причины:**
1. **Wrong region**
   - uk.farnell.com может не иметь нужные продукты
   - Попробовать newark.com (US) или element14.com (global)

2. **Wrong search parameter**
   - `st` (keyword) может не работать для точного MPN
   - Попробовать `mftrPartNumber` или `manufacturerPartNumber`

3. **MPN format mismatch**
   - Farnell может требовать точное форматирование MPN
   - Попробовать без суффиксов (LM317 вместо LM317MBSTT3G)

4. **API key not activated**
   - Проверить в Farnell developer portal статус API key

**Как исправить:**
```bash
# 1. Попробовать разные регионы
python3 scripts/test_farnell_regions.py

# 2. Проверить API key
curl "https://api.element14.com/catalog/products?term=resistor&resultsSettings.numberOfResults=1&callInfo.apiKey=$FARNELL_API_KEY"

# 3. Поискать на сайте Farnell
# Если продукт есть на сайте но не находится через API → проблема с поиском
```

---

## 📝 Следующие шаги

После того как тесты пройдут успешно:

### 1. Обновить код интеграции

**TME (`src/integrations/tme/client.mjs`):**
- Использовать рабочий метод генерации signature
- Добавить поддержку WARP proxy если нужно
- Обработать ответы правильно

**Farnell (`src/integrations/farnell/client.mjs`):**
- Использовать рабочий регион и метод поиска
- Обновить параметры запроса
- Обработать разные форматы ответа

### 2. Реализовать fallback логику

```javascript
// Priority: DigiKey → TME → Farnell → Mouser

async function fetchProductWithFallback(mpn) {
  // Try DigiKey first (best specs)
  let result = await tryDigiKey(mpn);
  if (result) return result;
  
  // Fallback to TME
  result = await tryTME(mpn);
  if (result) return result;
  
  // Fallback to Farnell
  result = await tryFarnell(mpn);
  if (result) return result;
  
  // Always try Mouser as baseline
  return await tryMouser(mpn);
}
```

### 3. Интеграционное тестирование

```bash
# Test product card with fallback
python scripts/test_fallback_logic.py

# Test with products only in specific distributors
python scripts/test_edge_cases.py
```

### 4. Деплой и мониторинг

```bash
# Deploy updated code
python deploy_fast_digikey.py

# Monitor which sources succeed
tail -f /opt/deep-agg/logs/out.log | grep "Sources used"
```

---

## 📚 Документация API

### TME
- Developer Portal: https://developers.tme.eu/
- API Docs: https://developers.tme.eu/en/products/search
- Signature Format: https://developers.tme.eu/en/api-signature

### Farnell
- Developer Portal: https://partner.element14.com/
- REST API Docs: https://partner.element14.com/docs/Product_Search_API_REST__Description
- Webapp Search: https://partner.element14.com/docs/Product_Search_API_Webapp

---

## ✅ Success Criteria

**TME API:**
- [ ] 200 OK response (no 403)
- [ ] Returns product data for test MPN
- [ ] Extracts technical specifications
- [ ] Can be integrated into /api/product

**Farnell API:**
- [ ] Returns non-empty products array
- [ ] Finds test MPN correctly
- [ ] Extracts pricing and availability
- [ ] Can be integrated into /api/product

**Fallback Logic:**
- [ ] DigiKey tried first (primary)
- [ ] Falls back to TME if DigiKey fails
- [ ] Falls back to Farnell if TME fails
- [ ] Always includes Mouser as baseline
- [ ] Logs which source succeeded
- [ ] Response time <3s average

---

## 🔍 Debug Tips

### Check current server status
```bash
ssh root@5.129.228.88 'ps aux | grep node'
ssh root@5.129.228.88 'curl http://localhost:9201/api/health'
```

### Check WARP proxy
```bash
ssh root@5.129.228.88 'systemctl status wireproxy'
ssh root@5.129.228.88 'curl --proxy http://127.0.0.1:25345 https://api.digikey.com/'
```

### Check environment variables
```bash
ssh root@5.129.228.88 'cd /opt/deep-agg && cat .env | grep TME'
ssh root@5.129.228.88 'cd /opt/deep-agg && cat .env | grep FARNELL'
```

### Test API directly from server
```bash
ssh root@5.129.228.88
cd /opt/deep-agg
source .env
python3 scripts/test_tme_credentials.py
python3 scripts/test_farnell_regions.py
```

---

**Date:** January 2, 2025  
**Status:** 📋 Ready to Execute  
**Next:** Run test scripts and analyze results
