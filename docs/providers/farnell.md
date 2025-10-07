# Farnell Provider

Global electronic components distributor with comprehensive API access and technical resources.

## Overview

- **API Version**: Premier Farnell API
- **Authentication**: API Key
- **Rate Limits**: 5,000 requests/month
- **Base URL**: `https://api.element14.com`
- **Geographic Restrictions**: None

## Configuration

### Environment Variables

```bash
# Required for API access
FARNELL_API_KEY=your_api_key_here

# Optional: Override default URLs
FARNELL_API_BASE=https://api.element14.com
```

### Systemd Configuration

```ini
# /etc/systemd/system/deep-agg.service.d/environment.conf
[Service]
Environment=FARNELL_API_KEY=your_api_key_here
```

## API Endpoints

### Product Search

#### Keyword Search

```http
GET /webservice/products?term={query}&storeInfo.id=ru.farnell.com&resultsSettings.offset=0&resultsSettings.numberOfResults=50&resultsSettings.refinements.filters=&resultsSettings.responseGroup=large&callInfo.omitXmlSchema=false&callInfo.callback=&callInfo.responseDataFormat=json&callinfo.apikey={api_key}
```

#### Response Structure

```json
{
  "premierFarnellPartSearchReturn": {
    "numberOfResults": 156,
    "products": [
      {
        "sku": "2064363",
        "translatedManufacturerPartNumber": "STM32F407VGT6",
        "translatedDescription": "ARM Cortex-M4 32b MCU+FPU",
        "brandName": "STMICROELECTRONICS",
        "datasheets": [
          {
            "url": "https://www.st.com/resource/en/datasheet/stm32f407vg.pdf"
          }
        ],
        "stock": {
          "level": 1500
        },
        "prices": [
          {
            "from": 1,
            "to": 9,
            "cost": 12.45,
            "currency": "EUR"
          },
          {
            "from": 10,
            "to": 49,
            "cost": 11.21,
            "currency": "EUR"
          }
        ]
      }
    ]
  }
}
```

## Implementation

### Search Function

```javascript
async function searchFarnell(query, options = {}) {
  const url = new URL(`${FARNELL_API_BASE}/webservice/products`);
  
  url.searchParams.set('term', query);
  url.searchParams.set('storeInfo.id', 'ru.farnell.com');
  url.searchParams.set('resultsSettings.offset', options.offset || 0);
  url.searchParams.set('resultsSettings.numberOfResults', options.limit || 50);
  url.searchParams.set('resultsSettings.responseGroup', 'large');
  url.searchParams.set('callInfo.responseDataFormat', 'json');
  url.searchParams.set('callinfo.apikey', process.env.FARNELL_API_KEY);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Farnell API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}
```

### Product Normalization

```javascript
function normalizeFarnellProduct(product) {
  return {
    mpn: product.translatedManufacturerPartNumber,
    manufacturer: product.brandName,
    description: product.translatedDescription,
    datasheet: product.datasheets?.[0]?.url,
    pricing: product.prices?.map(tier => ({
      quantity: tier.from,
      price_original: tier.cost,
      currency_original: tier.currency || 'EUR'
    })) || [],
    stock: product.stock?.level || 0,
    provider: 'farnell',
    providerSku: product.sku,
    category: product.categoryName,
    package: product.packageName,
    updated: new Date().toISOString()
  };
}
```

## Testing

### Authentication Test

```javascript
async function testFarnellAuth() {
  try {
    const results = await searchFarnell('test');
    console.log('✅ Farnell authentication successful');
    return true;
  } catch (error) {
    console.log('❌ Farnell authentication failed:', error.message);
    return false;
  }
}
```

### Search Test

```javascript
async function testFarnellSearch() {
  try {
    const results = await searchFarnell('STM32F407');
    const count = results.premierFarnellPartSearchReturn?.numberOfResults || 0;
    console.log(`✅ Farnell search successful: ${count} products found`);
    return true;
  } catch (error) {
    console.log('❌ Farnell search failed:', error.message);
    return false;
  }
}
```
