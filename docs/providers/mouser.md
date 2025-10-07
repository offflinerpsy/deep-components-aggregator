# Mouser Provider

Electronic components distributor with REST API integration and global supply chain access.

## Overview

- **API Version**: v1
- **Authentication**: API Key
- **Rate Limits**: 10,000 requests/month
- **Base URL**: `https://api.mouser.com`
- **Geographic Restrictions**: None

## Configuration

### Environment Variables

```bash
# Required for API access
MOUSER_API_KEY=your_api_key_here

# Optional: Override default URLs
MOUSER_API_BASE=https://api.mouser.com
```

### Systemd Configuration

```ini
# /etc/systemd/system/deep-agg.service.d/environment.conf
[Service]
Environment=MOUSER_API_KEY=your_api_key_here
```

## API Endpoints

### Product Search

#### Keyword Search

```http
GET /api/v1/search/keyword?apiKey={api_key}&keyword={query}
```

#### Response Structure

```json
{
  "SearchResults": {
    "NumberOfResult": 156,
    "Parts": [
      {
        "MouserPartNumber": "511-STM32F407VGT6",
        "ManufacturerPartNumber": "STM32F407VGT6",
        "Manufacturer": "STMicroelectronics",
        "Description": "ARM Microcontrollers - MCU High-performance",
        "DataSheetUrl": "https://www.st.com/resource/en/datasheet/stm32f407vg.pdf",
        "AvailabilityInStock": 1500,
        "PriceBreaks": [
          {
            "Quantity": 1,
            "Price": "$12.45",
            "Currency": "USD"
          },
          {
            "Quantity": 10,
            "Price": "$11.21",
            "Currency": "USD"
          }
        ],
        "Category": "Microcontrollers",
        "PackageType": "LQFP-100"
      }
    ]
  }
}
```

## Implementation

### Search Function

```javascript
async function searchMouser(query, options = {}) {
  const url = new URL(`${MOUSER_API_BASE}/api/v1/search/keyword`);
  url.searchParams.set('apiKey', process.env.MOUSER_API_KEY);
  url.searchParams.set('keyword', query);
  
  if (options.limit) {
    url.searchParams.set('recordCount', options.limit);
  }
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Mouser API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}
```

### Product Normalization

```javascript
function normalizeMouserProduct(product) {
  return {
    mpn: product.ManufacturerPartNumber,
    manufacturer: product.Manufacturer,
    description: product.Description,
    datasheet: product.DataSheetUrl,
    pricing: product.PriceBreaks?.map(tier => ({
      quantity: tier.Quantity,
      price_original: parseFloat(tier.Price.replace(/[$,]/g, '')),
      currency_original: tier.Currency || 'USD'
    })) || [],
    stock: product.AvailabilityInStock || 0,
    provider: 'mouser',
    providerSku: product.MouserPartNumber,
    category: product.Category,
    package: product.PackageType,
    updated: new Date().toISOString()
  };
}
```

## Testing

### Authentication Test

```javascript
async function testMouserAuth() {
  try {
    const results = await searchMouser('test');
    console.log('✅ Mouser authentication successful');
    return true;
  } catch (error) {
    console.log('❌ Mouser authentication failed:', error.message);
    return false;
  }
}
```

### Search Test

```javascript
async function testMouserSearch() {
  try {
    const results = await searchMouser('STM32F407');
    const count = results.SearchResults?.NumberOfResult || 0;
    console.log(`✅ Mouser search successful: ${count} products found`);
    return true;
  } catch (error) {
    console.log('❌ Mouser search failed:', error.message);
    return false;
  }
}
```
