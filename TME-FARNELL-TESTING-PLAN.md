# TME & Farnell API Testing Plan

## 🎯 Objective

Test TME and Farnell APIs to understand current failures and integrate them as fallbacks to DigiKey.

**Fallback Priority System:**
```
DigiKey (primary) → TME (fallback 1) → Farnell (fallback 2) → Mouser (baseline)
```

---

## Current Status

### ✅ Working Sources
- **Mouser:** 24+ technical specs, pricing, availability
- **DigiKey:** 23 technical specs, pricing, availability (via WARP proxy)

### ❌ Blocked Sources
- **TME:** 403 "E_ACTION_FORBIDDEN"
- **Farnell:** 200 OK but empty products array

---

## Phase 1: TME API Investigation

### Current Implementation

**File:** `src/integrations/tme/client.mjs`

**Authentication:** HMAC signature-based
```javascript
function generateTMESignature(token, secret, params) {
  const query = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  
  const plaintext = `POST\n${API_BASE}\n${query}`;
  const signature = crypto.createHmac('sha1', secret)
    .update(plaintext)
    .digest('base64');
  
  return signature;
}
```

**Endpoint:** `https://api.tme.eu/products/search.json`

**Parameters:**
- `Token`: API token (from environment)
- `Country`: RU
- `Language`: RU
- `SearchPlain`: MPN to search
- `ApiSignature`: HMAC-SHA1 signature

### Known Issues

1. **403 "E_ACTION_FORBIDDEN"**
   - Possible causes:
     - Invalid credentials (token/secret)
     - Wrong signature generation
     - IP restrictions
     - Missing API permissions
     - Rate limiting

### Testing Steps

#### 1.1 Verify Credentials
```python
# scripts/test_tme_credentials.py

import os
import hmac
import hashlib
import base64
import requests
from urllib.parse import urlencode

TOKEN = os.getenv('TME_TOKEN')
SECRET = os.getenv('TME_SECRET')
API_BASE = 'https://api.tme.eu'

def generate_signature(token, secret, params):
    # Sort parameters alphabetically
    sorted_params = sorted(params.items())
    query_string = '&'.join([f"{k}={v}" for k, v in sorted_params])
    
    # Create plaintext: POST\napi.tme.eu\nquery_string
    plaintext = f"POST\n{API_BASE.replace('https://', '')}\n{query_string}"
    
    print(f"Plaintext for signature:\n{plaintext}\n")
    
    # Generate HMAC-SHA1 signature
    signature = base64.b64encode(
        hmac.new(
            secret.encode('utf-8'),
            plaintext.encode('utf-8'),
            hashlib.sha1
        ).digest()
    ).decode('utf-8')
    
    return signature

def test_search(mpn):
    params = {
        'Token': TOKEN,
        'Country': 'RU',
        'Language': 'RU',
        'SearchPlain': mpn
    }
    
    signature = generate_signature(TOKEN, SECRET, params)
    params['ApiSignature'] = signature
    
    print(f"Testing TME API with MPN: {mpn}")
    print(f"Signature: {signature}\n")
    
    url = f"{API_BASE}/products/search.json"
    response = requests.post(url, data=params)
    
    print(f"Status: {response.status_code}")
    print(f"Response:\n{response.text}\n")
    
    return response.json()

if __name__ == '__main__':
    # Test with known product
    test_search('LM317')
    test_search('ATMEGA328P-PU')
```

**Expected Results:**
- 200 OK: Credentials valid
- 403: Signature issue or API permissions
- 401: Invalid token

#### 1.2 Test Different Endpoints

```python
# Try different TME endpoints to understand API access

endpoints = [
    '/products/search.json',       # Current endpoint
    '/products/getproducts.json',  # Direct product lookup
    '/products/getprice.json',     # Price lookup
    '/products/getstockandprice.json'  # Stock + price
]

for endpoint in endpoints:
    test_endpoint(endpoint, {'SymbolList': 'LM317'})
```

#### 1.3 Check API Documentation

- Review official TME API docs: https://developers.tme.eu/
- Check required permissions for `products/search` endpoint
- Verify API key activation status
- Check if IP whitelisting required

#### 1.4 Test Signature Generation

```python
# Compare with official TME examples
# Test different plaintext formats:

# Format 1: POST\napi.tme.eu\nquery
# Format 2: POST\n/products/search.json\nquery
# Format 3: query only

# Test different encoding:
# - UTF-8
# - ASCII
# - URL encoding
```

### Expected Outcomes

**Scenario A: Invalid Credentials**
→ Get new TME API key from developer portal

**Scenario B: Wrong Signature**
→ Fix signature generation algorithm

**Scenario C: IP Restrictions**
→ Apply for IP whitelist or use WARP proxy (already available)

**Scenario D: Missing Permissions**
→ Upgrade API plan or request access to products endpoint

---

## Phase 2: Farnell API Investigation

### Current Implementation

**File:** `src/integrations/farnell/client.mjs`

**Authentication:** API Key in query parameter

**Endpoint:** `https://uk.farnell.com/webapp/wcs/stores/servlet/Search`

**Parameters:**
- `storeId`: 10164
- `catalogId`: 15001
- `langId`: 44
- `st`: Search term (MPN)
- `categoryId`: (empty)
- `termCatId`: (empty)
- `resultsPerPage`: 1
- `searchType`: 'KEYWORD_SEARCH'
- `apiKey`: API key from environment

### Known Issues

1. **Empty Results**
   ```json
   {
     "premierFarnellPartNumberReturn": {
       "numberOfResults": 0,
       "products": []
     }
   }
   ```

   - Possible causes:
     - Wrong region (uk.farnell.com vs element14.com)
     - Wrong search parameter (st vs mftrPartNumber)
     - Wrong storeId/catalogId for our region
     - API key not activated
     - MPN format mismatch

### Testing Steps

#### 2.1 Test Different Regions

```python
# scripts/test_farnell_regions.py

import os
import requests

API_KEY = os.getenv('FARNELL_API_KEY')

regions = [
    {
        'name': 'UK Farnell',
        'base': 'https://uk.farnell.com',
        'storeId': 10164,
        'catalogId': 15001,
        'langId': 44
    },
    {
        'name': 'US Newark',
        'base': 'https://www.newark.com',
        'storeId': 10194,
        'catalogId': 15001,
        'langId': -1
    },
    {
        'name': 'Element14',
        'base': 'https://www.element14.com',
        'storeId': 10159,
        'catalogId': 15001,
        'langId': -1
    },
    {
        'name': 'CPC',
        'base': 'https://cpc.farnell.com',
        'storeId': 10179,
        'catalogId': 15001,
        'langId': 44
    }
]

def test_region(region, mpn):
    url = f"{region['base']}/webapp/wcs/stores/servlet/Search"
    params = {
        'storeId': region['storeId'],
        'catalogId': region['catalogId'],
        'langId': region['langId'],
        'st': mpn,
        'resultsPerPage': 1,
        'searchType': 'KEYWORD_SEARCH',
        'apiKey': API_KEY
    }
    
    print(f"\nTesting {region['name']}: {mpn}")
    response = requests.get(url, params=params)
    
    print(f"Status: {response.status_code}")
    print(f"URL: {response.url}")
    
    if response.status_code == 200:
        data = response.json()
        num_results = data.get('premierFarnellPartNumberReturn', {}).get('numberOfResults', 0)
        print(f"Results: {num_results}")
        
        if num_results > 0:
            product = data['premierFarnellPartNumberReturn']['products'][0]
            print(f"Found: {product.get('translatedManufacturerPartNumber')}")
            print(f"SKU: {product.get('sku')}")
    else:
        print(f"Error: {response.text[:200]}")

if __name__ == '__main__':
    test_mpns = ['LM317', 'ATMEGA328P-PU', 'LM317MBSTT3G']
    
    for mpn in test_mpns:
        for region in regions:
            test_region(region, mpn)
```

#### 2.2 Test Different Search Methods

```python
# Try different search parameters

search_methods = [
    {'st': mpn, 'searchType': 'KEYWORD_SEARCH'},
    {'mftrPartNumber': mpn},
    {'manufacturerPartNumber': mpn},
    {'exactMatch': mpn},
    {'fNPSearch': mpn}  # Farnell Part Number search
]

for method in search_methods:
    test_search(method)
```

#### 2.3 Test Direct API Endpoints

```python
# Farnell REST API (v3.0)
# https://partner.element14.com/docs/Product_Search_API_REST__Description

base_url = 'https://api.element14.com/catalog/products'

# Method 1: Keyword search
url1 = f"{base_url}?term={mpn}&storeInfo.id=uk.farnell.com&callInfo.apiKey={API_KEY}"

# Method 2: MPN exact match
url2 = f"{base_url}?term=manuPartNum:{mpn}&storeInfo.id=uk.farnell.com&callInfo.apiKey={API_KEY}"

# Method 3: SKU lookup
url3 = f"{base_url}/{sku}?storeInfo.id=uk.farnell.com&callInfo.apiKey={API_KEY}"
```

#### 2.4 Check API Key Status

```python
# Test with simple endpoint to verify API key is active

def test_api_key():
    url = 'https://api.element14.com/catalog/products?term=resistor&resultsSettings.numberOfResults=1&callInfo.apiKey={API_KEY}'
    response = requests.get(url)
    
    if response.status_code == 401:
        print("❌ API Key invalid or expired")
    elif response.status_code == 200:
        data = response.json()
        if 'products' in data:
            print("✅ API Key valid")
        else:
            print("⚠️ API Key valid but unexpected response")
    else:
        print(f"❓ Unexpected status: {response.status_code}")
```

### Expected Outcomes

**Scenario A: Wrong Region**
→ Use correct region (Newark for US, Element14 for global)

**Scenario B: Wrong Search Parameter**
→ Use `mftrPartNumber` instead of `st`

**Scenario C: API Key Issue**
→ Request new API key from Farnell developer portal

**Scenario D: MPN Format Mismatch**
→ Implement fuzzy matching or try multiple MPN variations

---

## Phase 3: Fallback Logic Implementation

### 3.1 Priority System

```javascript
// server.js - Updated /api/product endpoint

async function fetchProductWithFallback(mpn, keys) {
  const sources = [];
  
  // Priority 1: DigiKey (highest quality specs)
  if (keys.digikeyClientId) {
    try {
      const result = await digikeyGetProduct({ 
        clientId: keys.digikeyClientId, 
        clientSecret: keys.digikeyClientSecret, 
        partNumber: mpn 
      });
      
      if (result?.data?.Products?.length > 0) {
        sources.push({ name: 'digikey', data: parseDigiKeyProduct(result.data.Products[0]) });
        console.log('✅ DigiKey: Found product');
      } else {
        console.log('⚠️ DigiKey: No results, trying fallback...');
      }
    } catch (err) {
      console.error('❌ DigiKey error:', err.message);
    }
  }
  
  // Priority 2: TME (European distributor, good coverage)
  if (!sources.length && keys.tmeToken) {
    try {
      const result = await tmeSearchProducts({ 
        token: keys.tmeToken, 
        secret: keys.tmeSecret, 
        query: mpn 
      });
      
      if (result?.data?.ProductList?.length > 0) {
        sources.push({ name: 'tme', data: parseTMEProduct(result.data.ProductList[0]) });
        console.log('✅ TME: Found product (fallback)');
      } else {
        console.log('⚠️ TME: No results, trying next fallback...');
      }
    } catch (err) {
      console.error('❌ TME error:', err.message);
    }
  }
  
  // Priority 3: Farnell (UK/EU alternative)
  if (!sources.length && keys.farnell) {
    try {
      const result = await farnellByMPN({ 
        apiKey: keys.farnell, 
        region: keys.farnellRegion, 
        q: mpn 
      });
      
      if (result?.data?.products?.length > 0) {
        sources.push({ name: 'farnell', data: parseFarnellProduct(result.data.products[0]) });
        console.log('✅ Farnell: Found product (fallback)');
      } else {
        console.log('⚠️ Farnell: No results, using Mouser only');
      }
    } catch (err) {
      console.error('❌ Farnell error:', err.message);
    }
  }
  
  // Priority 4: Mouser (always included as baseline)
  if (keys.mouser) {
    try {
      const result = await mouserSearchByKeyword({ apiKey: keys.mouser, q: mpn });
      if (result?.data?.SearchResults?.Parts?.length > 0) {
        sources.push({ name: 'mouser', data: parseMouserProduct(result.data.SearchResults.Parts[0]) });
        console.log('✅ Mouser: Found product');
      }
    } catch (err) {
      console.error('❌ Mouser error:', err.message);
    }
  }
  
  // Log final source selection
  console.log(`📊 Sources used: ${sources.map(s => s.name).join(', ') || 'none'}`);
  
  return sources;
}
```

### 3.2 Retry Logic

```javascript
// Retry transient errors (timeouts, 5xx)

async function fetchWithRetry(fetchFn, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fetchFn();
      return result;
    } catch (err) {
      lastError = err;
      
      // Retry only transient errors
      if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || 
          (err.response?.status >= 500 && err.response?.status < 600)) {
        console.warn(`⚠️ Retry ${i + 1}/${maxRetries}: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        continue;
      }
      
      // Don't retry client errors (4xx)
      throw err;
    }
  }
  
  throw lastError;
}
```

### 3.3 Source Preference Caching

```javascript
// Cache which source works best for each MPN

const sourceCache = new Map(); // mpn -> source name

async function getCachedSourcePreference(mpn) {
  return sourceCache.get(mpn) || null;
}

async function setCachedSourcePreference(mpn, sourceName) {
  sourceCache.set(mpn, sourceName);
  
  // Persist to SQLite
  await db.run(
    'INSERT OR REPLACE INTO source_preferences (mpn, source, updated_at) VALUES (?, ?, ?)',
    [mpn, sourceName, Date.now()]
  );
}

// Use cached preference for faster lookups
async function fetchProductSmart(mpn, keys) {
  const preferredSource = await getCachedSourcePreference(mpn);
  
  if (preferredSource) {
    console.log(`🔍 Using cached source: ${preferredSource}`);
    
    // Try preferred source first
    const result = await trySource(preferredSource, mpn, keys);
    if (result) return result;
  }
  
  // Fallback to full cascade
  return await fetchProductWithFallback(mpn, keys);
}
```

---

## Phase 4: Integration Testing

### Test Cases

#### 4.1 Single Source Products

```python
# Products only available in one distributor

test_cases = [
    {
        'mpn': 'LM317MBSTT3G',
        'expected': ['mouser', 'digikey'],
        'description': 'Common voltage regulator'
    },
    {
        'mpn': 'STM32F407VGT6',
        'expected': ['digikey', 'mouser'],
        'description': 'ST microcontroller'
    },
    {
        'mpn': 'SOME-RARE-PART',
        'expected': ['farnell'],
        'description': 'Rare component only in Farnell'
    }
]

for test in test_cases:
    result = fetch_product(test['mpn'])
    sources = result['sources']
    
    print(f"\n{test['description']}")
    print(f"MPN: {test['mpn']}")
    print(f"Expected: {test['expected']}")
    print(f"Actual: {list(sources.keys())}")
    print(f"Specs: {len(result['technical_specs'])}")
```

#### 4.2 Multi-Source Products

```python
# Products available in multiple distributors
# Verify merge priority works correctly

def test_merge_priority():
    mpn = 'LM317'
    result = fetch_product(mpn)
    
    # Check DigiKey specs override others
    assert 'Output Configuration' in result['technical_specs']  # DigiKey field
    
    # Check pricing from all sources
    assert len(result['pricing']) > 0
    sources_in_pricing = {p['source'] for p in result['pricing']}
    print(f"Pricing sources: {sources_in_pricing}")
    
    # Check best price calculation
    print(f"Best price: {result['price_rub']} RUB")
```

#### 4.3 Edge Cases

```python
# Edge cases to test

edge_cases = [
    {
        'mpn': 'NONEXISTENT-PART-123',
        'expected': None,
        'description': 'Product not found in any distributor'
    },
    {
        'mpn': 'LM317',  # Generic search term
        'expected': 'multiple',
        'description': 'Ambiguous search term returns multiple products'
    },
    {
        'mpn': 'LM317-SPECIAL-VARIANT',
        'expected': 'fuzzy_match',
        'description': 'MPN variation requires fuzzy matching'
    }
]
```

#### 4.4 Performance Testing

```python
# Measure response times with fallback

import time

def benchmark_fallback():
    test_mpns = ['LM317', 'ATMEGA328P-PU', 'STM32F407VGT6']
    
    for mpn in test_mpns:
        start = time.time()
        result = fetch_product(mpn)
        duration = time.time() - start
        
        print(f"\n{mpn}:")
        print(f"  Duration: {duration:.2f}s")
        print(f"  Sources: {list(result['sources'].keys())}")
        print(f"  Specs: {len(result['technical_specs'])}")
```

---

## Phase 5: Documentation & Commit

### 5.1 Create Final Report

**File:** `TME-FARNELL-INTEGRATION-REPORT.md`

Contents:
- Test results for TME API (403 issue resolution)
- Test results for Farnell API (empty results resolution)
- Fallback logic implementation details
- Integration test results
- Performance benchmarks
- Known limitations
- Next steps

### 5.2 Update README

Add section:
```markdown
## Data Sources & Fallback Priority

Deep Aggregator fetches component data from multiple distributors with automatic fallback:

**Priority System:**
1. **DigiKey** (Primary) - Highest quality technical specifications (16-25 params)
2. **TME** (Fallback 1) - European distributor, good coverage
3. **Farnell** (Fallback 2) - UK/EU alternative
4. **Mouser** (Baseline) - Always included, 24+ specs

**How it works:**
- Parallel API calls to all sources
- Smart merge with DigiKey priority for technical specs
- Best price calculation across all sources
- Maximum stock aggregation
- 30-day cache for fast responses

**Availability:**
- DigiKey: ✅ Working (via WARP proxy)
- TME: ⚠️ Testing (403 issue)
- Farnell: ⚠️ Testing (empty results)
- Mouser: ✅ Working
```

### 5.3 Git Commit

```bash
git add server.js src/integrations/tme/ src/integrations/farnell/
git add scripts/test_tme_*.py scripts/test_farnell_*.py
git add TME-FARNELL-TESTING-PLAN.md TME-FARNELL-INTEGRATION-REPORT.md
git commit -m "feat: TME & Farnell fallback integration

- Investigated TME 403 error: [findings]
- Fixed Farnell empty results: [solution]
- Implemented fallback priority: DigiKey → TME → Farnell → Mouser
- Added retry logic for transient errors
- Added source preference caching
- Integration tests: 15/15 passing

Test results:
- TME: [status]
- Farnell: [status]
- Fallback logic: ✅ Working
- Performance: <3s average response time"

git push origin main
```

---

## Timeline

**Phase 1 (TME):** 2-4 hours
- Credential testing: 30min
- Signature debugging: 1h
- Endpoint testing: 1h
- Documentation: 30min

**Phase 2 (Farnell):** 2-4 hours
- Region testing: 1h
- Search method testing: 1h
- API key verification: 30min
- Documentation: 30min

**Phase 3 (Fallback):** 2-3 hours
- Implementation: 1.5h
- Testing: 1h
- Optimization: 30min

**Phase 4 (Testing):** 1-2 hours
- Test cases: 1h
- Performance benchmarks: 30min
- Edge cases: 30min

**Phase 5 (Docs):** 1 hour
- Report writing: 30min
- README update: 15min
- Git commit: 15min

**Total:** 8-14 hours

---

## Success Criteria

✅ **TME API:**
- [ ] 200 OK response (no 403)
- [ ] Returns product data for test MPN
- [ ] Extracts technical specifications
- [ ] Integrated into /api/product

✅ **Farnell API:**
- [ ] Returns non-empty products array
- [ ] Finds test MPN correctly
- [ ] Extracts pricing and availability
- [ ] Integrated into /api/product

✅ **Fallback Logic:**
- [ ] DigiKey tried first (primary)
- [ ] Falls back to TME if DigiKey fails
- [ ] Falls back to Farnell if TME fails
- [ ] Always includes Mouser as baseline
- [ ] Logs which source succeeded
- [ ] Retry logic for transient errors

✅ **Integration:**
- [ ] All test cases passing
- [ ] Response time <3s average
- [ ] No regressions in existing functionality
- [ ] CSS still works with merged data
- [ ] Cache works correctly

✅ **Documentation:**
- [ ] Comprehensive test report
- [ ] Updated README with fallback info
- [ ] Git committed with detailed message
- [ ] All findings documented

---

## Next Steps After Completion

1. **Monitor Production:**
   - Track which source succeeds most often
   - Monitor API error rates
   - Measure response times
   - Collect user feedback

2. **Optimization:**
   - Cache source preference per MPN
   - Parallel requests with race condition
   - Pre-fetch popular components
   - Add more distributors (Arrow, Newark, RS)

3. **Enhanced Fallback:**
   - Try alternate MPN formats
   - Fuzzy matching for similar parts
   - Suggest alternatives if not found
   - Cross-reference manufacturer catalogs

4. **Analytics:**
   - Track source availability per component category
   - Identify coverage gaps
   - Optimize source priority based on data quality
   - A/B test different fallback strategies

---

**Date:** January 2, 2025  
**Status:** 📋 Ready to Execute  
**Owner:** GitHub Copilot + User
