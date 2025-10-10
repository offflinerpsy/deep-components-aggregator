# V0 Integration Guide — API Endpoint Fix

**Date**: 2025-10-11  
**Task**: Fix incorrect API documentation in V0-INTEGRATION-GUIDE.md  
**Issue**: Documentation showed `/api/product/:mpn` (path param) but backend actually uses `/api/product?mpn=VALUE` (query param)

---

## 🔍 PROBLEM DISCOVERED

### Incorrect Documentation (before fix):
```markdown
#### GET /api/product/:mpn
GET /api/product/ESP32-WROOM-32?provider=mouser
```

### Actual Backend Implementation:
```javascript
// server.js:618
app.get('/api/product', async (req, res) => {
  const mpn = String(req.query.mpn || req.query.id || '').trim();
  //                  ^^^^^^^^^^^^ Uses query params, NOT path params!
```

### Frontend Implementation (already fixed):
```typescript
// app/product/[mpn]/page.tsx
const params = new URLSearchParams({ mpn })
if (provider) params.append('provider', provider)
const url = `/api/product?${params.toString()}`
// Correct: /api/product?mpn=STM32F407VGT6&provider=farnell
```

---

## ✅ FIX APPLIED

### File: `/opt/deep-agg/docs/V0-INTEGRATION-GUIDE.md`

**Changed**:
```diff
- #### GET /api/product/:mpn
+ #### GET /api/product?mpn=VALUE

- GET /api/product/ESP32-WROOM-32?provider=mouser
+ GET /api/product?mpn=ESP32-WROOM-32&provider=mouser

+ **КРИТИЧНО**: Backend использует **query params**, НЕ path params!

**Query Parameters**:
+ - `mpn` (required): Part number компонента
  - `provider` (optional): `mouser`, `digikey`, `tme`, `farnell`
```

---

## 🧪 VERIFICATION

### Test 1: Backend API Response
```bash
curl "http://localhost:9201/api/product?mpn=STM32F407VGT6" | jq '.ok'
```
**Expected**: `true`

**Actual**:
```json
{
  "ok": true,
  "product": {
    "mpn": "STM32F407VGT6",
    "manufacturer": "STMicroelectronics",
    "title": "ARM Microcontrollers - MCU ARM M4 1024 FLASH 168 Mhz 192kB SRAM",
    "photo": "https://mm.digikey.com/Volume0/opasdata/d220001/medias/images/6295/497%7E100LQFP-1.6-14X14%7E%7E100.jpg",
    "pricing": [
      {"qty": 1, "price": "$11.87", "currency": "USD", "price_rub": 966, "source": "mouser"},
      {"qty": 10, "price": "$8.70", "currency": "USD", "price_rub": 708, "source": "mouser"}
    ]
  }
}
```
✅ **PASS**

### Test 2: Next.js Rewrite Proxying
```bash
curl "http://localhost:3001/api/product?mpn=STM32F407VGT6" | jq '.ok'
```
**Expected**: `true`

**Actual**:
```json
{"ok": true, "product": {...}}
```
✅ **PASS**

### Test 3: Frontend Page Rendering
```
URL: http://5.129.228.88:3001/product/STM32F407VGT6
```

**Expected**: Product card with:
- Product image
- Title
- Manufacturer
- Price table
- Stock indicator
- Provider badges

**Actual**: ✅ Page renders correctly (verified after fix in commit `0c159db`)

---

## 📝 COMMITS

### Commit 1: `0c159db`
```
fix(product): use query params instead of path params for API call

Backend endpoint is GET /api/product?mpn=VALUE not /api/product/:mpn
Fixed product page to match actual backend API pattern.
```

### Commit 2: (this session)
```
docs(v0): fix API endpoint documentation to match backend implementation

- Changed /api/product/:mpn to /api/product?mpn=VALUE
- Added explicit warning about query params vs path params
- Updated example request to show correct pattern
- Created verification artifact in docs/_artifacts/2025-10-11/
```

---

## 🎯 LESSONS LEARNED

1. **[rule]** Always verify API endpoints in backend code BEFORE writing documentation
2. **[gotcha]** Express.js routes `app.get('/api/product', ...)` vs `app.get('/api/product/:mpn', ...)` are different patterns
3. **[rule]** Backend using `req.query.mpn` means endpoint expects `?mpn=VALUE` (query string)
4. **[rule]** Backend using `req.params.mpn` would mean endpoint expects `/:mpn` (path param)
5. **[arch]** Deep-Agg backend uses query params for product endpoint to support optional `provider` filter

---

## 📂 FILES MODIFIED

1. `/opt/deep-agg/docs/V0-INTEGRATION-GUIDE.md` - Fixed API endpoint documentation
2. `/opt/deep-agg/docs/_artifacts/2025-10-11/v0-integration-api-fix.md` - This verification report

---

**Status**: ✅ VERIFIED & COMMITTED  
**Next Action**: Update V0-QUICK-START.md if it also contains incorrect endpoint pattern
