# API Donors Comparison Table

## Summary

Based on analysis of all 3 API donors (Mouser, TME, Farnell), here is the comprehensive comparison:

---

## 📊 Feature Comparison

| Feature | Mouser API | TME API | Farnell API |
|---------|------------|---------|-------------|
| **Technical Specifications** | ❌ WEAK (1-5 attrs) | ✅ STRONG (full params) | ✅ STRONG (full attributes) |
| **Images** | ✅ Good (1-2 images) | ✅ Good (multiple, ; separated) | ✅ Good (small/medium/large) |
| **Datasheets** | ✅ Good (PDF links) | ✅ Good (DocumentUrl) | ✅ Good (datasheets array) |
| **Pricing** | ✅ EXCELLENT (4+ breaks) | ✅ EXCELLENT (quantity breaks) | ✅ EXCELLENT (quantity breaks) |
| **Stock** | ✅ Good (Availability, LeadTime) | ✅ Good (InStock, DeliveryTime) | ✅ Good (stock field) |
| **Region** | 🌍 USA | 🌍 Europe (PL/EU) | 🌍 Global (UK/EU/US/APAC) |
| **Authentication** | API Key | Token + HMAC-SHA1 | API Key |
| **Response Format** | JSON | JSON | JSON/XML |

---

## 🔍 Detailed Breakdown

### 1. MOUSER API

**Endpoint:** `POST https://api.mouser.com/api/v1/search/keyword`

**Authentication:** API Key in URL param

**Request:**
```json
{
  "SearchByKeywordRequest": {
    "keyword": "MPN",
    "records": 10,
    "startingRecord": 0
  }
}
```

**Response Structure:**
```json
{
  "SearchResults": {
    "Parts": [{
      "ManufacturerPartNumber": "M83513/19-E01NW",
      "Manufacturer": "Amphenol Canada",
      "Description": "D-Sub MIL Spec Connectors 31 PLUG",
      "ImagePath": "https://...",
      "DataSheetUrl": "https://...",
      "PriceBreaks": [
        {"Quantity": 5, "Price": "$227.60", "Currency": "USD"}
      ],
      "Availability": "None",
      "AvailabilityInStock": "0",
      "LeadTime": "84 Days",
      "Category": "D-Sub MIL Spec Connectors",
      "Min": "5",
      "Mult": "5",
      "ROHSStatus": "",
      "ProductAttributes": [
        {"AttributeName": "Standard Pack Qty", "AttributeValue": "5"}
      ],
      "ProductCompliance": [
        {"ComplianceName": "USHTS", "ComplianceValue": "8536694040"}
      ]
    }]
  }
}
```

**✅ Strengths:**
- Excellent pricing data (multiple quantity breaks)
- Good stock information (Availability, LeadTime, FactoryStock)
- Category classification
- Compliance data (USHTS, TARIC, ECCN)
- USA region coverage
- Fast response time

**❌ Weaknesses:**
- **VERY LIMITED technical specifications** (only 1-5 ProductAttributes)
- Missing detailed specs like: Gender, Number of Positions, Termination Style, etc.
- These fields exist on Mouser website but NOT in API response!

**Best Use Cases:**
- Primary source for USA pricing
- Stock availability checks
- Quick product search
- Category classification

---

### 2. TME API

**Endpoint:** `GET https://api.tme.eu/Products/GetProducts.json`

**Authentication:** Token + HMAC-SHA1 signature

**Request Params:**
- `Token`: API token
- `SymbolList`: [array of SKUs]
- `Country`: "PL"
- `Language`: "EN"
- `ApiSignature`: HMAC-SHA1 hash

**Response Structure:**
```json
{
  "Data": {
    "ProductList": [{
      "Symbol": "CONN-1234",
      "Producer": "Amphenol",
      "Description": "D-Sub connector",
      "Photo": "https://img1.jpg;https://img2.jpg",
      "Parameters": [
        {"ParameterName": "Gender", "ParameterValue": "Female"},
        {"ParameterName": "Number of Positions", "ParameterValue": "31"},
        {"ParameterName": "Termination Style", "ParameterValue": "Through Hole"},
        {"ParameterName": "Mounting Angle", "ParameterValue": "Right Angle"}
      ],
      "PriceList": [
        {"Amount": 1, "PriceValue": 10.50, "PriceCurrency": "EUR"}
      ],
      "InStock": 100,
      "DeliveryTime": "3-5 days",
      "DocumentUrl": "https://..."
    }]
  }
}
```

**✅ Strengths:**
- **FULL technical specifications** (Parameters array with ALL specs!)
- Multiple images (semicolon-separated URLs)
- Europe region coverage (Poland, EU)
- Detailed stock info
- Good pricing data
- Document links

**❌ Weaknesses:**
- Complex authentication (HMAC signature required)
- Sometimes blocks requests ("E_ACTION_FORBIDDEN")
- API documentation hard to access
- Primarily European stock (less USA coverage)

**Best Use Cases:**
- **PRIMARY source for technical specifications**
- European pricing and availability
- Filling gaps when Mouser lacks detailed specs
- Multi-image galleries

---

### 3. FARNELL API

**Endpoint:** `GET https://api.element14.com/catalog/products`

**Authentication:** API Key in query param (`callInfo.apiKey`)

**Request Params:**
- `term`: `manuPartNum:M83513/19-E01NW` or `id:123456` or `any:keyword`
- `storeInfo.id`: `uk.farnell.com` (or 40+ other regions)
- `callInfo.apiKey`: API key
- `resultsSettings.responseGroup`: `small|medium|large|prices|inventory`

**Response Structure:**
```json
{
  "products": [{
    "translatedManufacturerPartNumber": "M83513/19-E01NW",
    "brandName": "Amphenol",
    "displayName": "D-Sub MIL Spec Connector",
    "longDescription": "...",
    "images": {
      "small": "https://...",
      "medium": "https://...",
      "large": "https://..."
    },
    "attributes": [
      {"attributeLabel": "Gender", "attributeValue": "Female"},
      {"attributeLabel": "Number of Contacts", "attributeValue": "31"},
      {"attributeLabel": "Mounting Type", "attributeValue": "Through Hole"}
    ],
    "datasheets": [
      {"url": "https://..."}
    ],
    "prices": [
      {"from": 1, "cost": 25.50}
    ],
    "stock": 50
  }]
}
```

**✅ Strengths:**
- **FULL technical specifications** (attributes array)
- Multiple image sizes (small, medium, large)
- **GLOBAL coverage** (40+ regions: UK, EU, USA, Canada, APAC)
- Clean, well-documented API
- Flexible search (keyword, part number, element14 ID)
- Response groups for optimizing data size

**❌ Weaknesses:**
- Requires specific `storeInfo.id` per region
- Some regions may have limited stock
- Contract pricing requires signature (like TME)

**Best Use Cases:**
- **SECONDARY source for technical specifications** (fallback when TME fails)
- Global availability checking across regions
- Multi-region pricing comparison
- High-quality product images

---

## 🎯 RECOMMENDED STRATEGY

### For Technical Specifications:
1. **Primary:** TME API (full Parameters array)
2. **Secondary:** Farnell API (full attributes array)
3. **Last Resort:** Mouser API (limited ProductAttributes)

### For Pricing:
1. **USA:** Mouser (best USD pricing)
2. **Europe:** TME (best EUR pricing)
3. **Global:** Farnell (multi-region comparison)

### For Stock:
1. **Parallel check** all 3 sources
2. Show highest availability
3. Display lead times for all sources

### For Images:
1. **Mouser** (fast, reliable)
2. **TME** (multiple angles if available)
3. **Farnell** (high-res large images)

---

## 💡 IMPLEMENTATION PLAN

```javascript
// Псевдокод логики объединения данных

async function getProductData(mpn) {
  // 1. Parallel requests to all 3 APIs
  const [mouser, tme, farnell] = await Promise.allSettled([
    mouserAPI(mpn),
    tmeAPI(mpn),
    farnellAPI(mpn)
  ]);

  // 2. Merge technical specs (приоритет: TME > Farnell > Mouser)
  const specs = {
    ...mouser.technical_specs || {},
    ...farnell.attributes || {},
    ...tme.parameters || {}  // ← Highest priority
  };

  // 3. Collect all images
  const images = [
    ...mouser.images || [],
    ...tme.images || [],
    ...farnell.images || []
  ].filter(Boolean);

  // 4. Best price in RUB
  const prices = [
    mouser.price_rub,
    tme.price_rub,
    farnell.price_rub
  ].filter(Boolean);
  const minPrice = Math.min(...prices);

  // 5. Highest stock
  const stock = Math.max(
    mouser.stock || 0,
    tme.stock || 0,
    farnell.stock || 0
  );

  return {
    mpn,
    specs,           // ← Merged from all sources
    images,          // ← Combined array
    minPrice,        // ← Best price across all
    stock,           // ← Highest availability
    sources: {       // ← Raw data from each
      mouser,
      tme,
      farnell
    }
  };
}
```

---

## 📌 KEY FINDINGS

1. **Mouser API НЕ возвращает полные спецификации!**
   - Только 1-5 ProductAttributes
   - На сайте Mouser есть 20+ характеристик
   - Их нет в API ответе

2. **TME и Farnell - ЛУЧШИЕ для характеристик**
   - TME: Parameters[] - полный список
   - Farnell: attributes[] - полный список

3. **Все 3 API хороши для pricing/stock**
   - Разные регионы
   - Нужен параллельный запрос + merge

4. **Стратегия: ВСЕГДА запрашивать ВСЕ 3 API**
   - Mouser для США + базовых данных
   - TME для полных спецификаций (EU)
   - Farnell для глобального охвата + fallback

---

## ✅ NEXT STEPS

1. Исправить TME client (HMAC signature issue)
2. Добавить Farnell client
3. Реализовать параллельные запросы в /api/product
4. Написать функцию merge данных из 3 источников
5. Приоритет спецификаций: TME > Farnell > Mouser
