# Digi-Key Provider

Electronic components supplier with OAuth 2.0 API integration and global inventory access.

## Overview

- **API Version**: v3
- **Authentication**: OAuth 2.0 with client credentials
- **Rate Limits**: 1000 requests/day (sandbox), 10000/day (production)
- **Base URL**: `https://api.digikey.com`
- **Geographic Restrictions**: Requires proxy for Russian IP addresses

## Configuration

### Environment Variables

```bash
# Required for OAuth authentication
DIGIKEY_CLIENT_ID=your_client_id_here
DIGIKEY_CLIENT_SECRET=your_client_secret_here

# Optional: Override default URLs
DIGIKEY_API_BASE=https://api.digikey.com
DIGIKEY_OAUTH_URL=https://api.digikey.com/v1/oauth2/token
```

### Systemd Configuration

```ini
# /etc/systemd/system/deep-agg.service.d/environment.conf
[Service]
Environment=DIGIKEY_CLIENT_ID=your_client_id_here
Environment=DIGIKEY_CLIENT_SECRET=your_client_secret_here
```

## Authentication Flow

### OAuth 2.0 Client Credentials

```javascript
async function getDigi keyAccessToken() {
  const response = await fetch('https://api.digikey.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.DIGIKEY_CLIENT_ID,
      client_secret: process.env.DIGIKEY_CLIENT_SECRET
    })
  });
  
  const data = await response.json();
  return data.access_token;
}
```

### Token Management

```javascript
class DigiKeyAuth {
  constructor() {
    this.token = null;
    this.expires = 0;
  }
  
  async getValidToken() {
    if (!this.token || Date.now() >= this.expires) {
      await this.refreshToken();
    }
    return this.token;
  }
  
  async refreshToken() {
    const response = await this.requestNewToken();
    this.token = response.access_token;
    this.expires = Date.now() + (response.expires_in * 1000) - 60000; // 1min buffer
  }
}
```

## API Endpoints

### Product Search

#### Keyword Search

```http
POST /Search/v3/Products/Keyword
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "Keywords": "STM32F407",
  "RecordCount": 50,
  "RecordStartPosition": 0,
  "Sort": {
    "SortOption": "SortByUnitPrice",
    "Direction": "Ascending"
  },
  "RequestedQuantity": 1
}
```

#### Response Structure

```json
{
  "ProductsCount": 156,
  "Products": [
    {
      "DigiKeyPartNumber": "497-11767-ND",
      "ManufacturerPartNumber": "STM32F407VGT6",
      "Manufacturer": {
        "Name": "STMicroelectronics",
        "Id": 122
      },
      "ProductDescription": "IC MCU 32BIT 1MB FLASH 100LQFP",
      "PrimaryDatasheet": "https://www.st.com/resource/en/datasheet/stm32f407vg.pdf",
      "QuantityAvailable": 1500,
      "StandardPricing": [
        {
          "BreakQuantity": 1,
          "UnitPrice": 12.45,
          "Currency": "USD"
        },
        {
          "BreakQuantity": 10,
          "UnitPrice": 11.21,
          "Currency": "USD"
        }
      ],
      "PackageType": {
        "Name": "100-LQFP"
      },
      "Category": {
        "Name": "Integrated Circuits (ICs)"
      }
    }
  ]
}
```

### Part Details

```http
GET /Search/v3/Products/{digikey_part_number}
Authorization: Bearer {access_token}
```

## Implementation

### Search Function

```javascript
async function searchDigiKey(query, options = {}) {
  const token = await auth.getValidToken();
  
  const searchPayload = {
    Keywords: query,
    RecordCount: options.limit || 50,
    RecordStartPosition: options.offset || 0,
    Sort: {
      SortOption: "SortByUnitPrice",
      Direction: "Ascending"
    },
    RequestedQuantity: options.quantity || 1
  };
  
  const response = await fetch(`${DIGIKEY_API_BASE}/Search/v3/Products/Keyword`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-DIGIKEY-Client-Id': process.env.DIGIKEY_CLIENT_ID
    },
    body: JSON.stringify(searchPayload),
    agent: proxyAgent // WARP proxy for Russian IPs
  });
  
  if (!response.ok) {
    throw new Error(`Digi-Key API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}
```

### Product Normalization

```javascript
function normalizeDigiKeyProduct(product) {
  return {
    mpn: product.ManufacturerPartNumber,
    manufacturer: product.Manufacturer?.Name,
    description: product.ProductDescription,
    datasheet: product.PrimaryDatasheet,
    pricing: product.StandardPricing?.map(tier => ({
      quantity: tier.BreakQuantity,
      price_original: tier.UnitPrice,
      currency_original: tier.Currency || 'USD'
    })) || [],
    stock: product.QuantityAvailable || 0,
    provider: 'digikey',
    providerSku: product.DigiKeyPartNumber,
    category: product.Category?.Name,
    package: product.PackageType?.Name,
    rohs: product.RohsStatus === 'RoHS Compliant',
    updated: new Date().toISOString()
  };
}
```

## Proxy Configuration

### WARP Proxy Setup

Digi-Key blocks Russian IP addresses, requiring WARP proxy:

```javascript
const { SocksProxyAgent } = require('socks-proxy-agent');

const proxyAgent = new SocksProxyAgent({
  hostname: '127.0.0.1',
  port: 40000,
  protocol: 'socks5'
});

// Use proxy for all Digi-Key requests
const response = await fetch(url, {
  agent: proxyAgent,
  headers: { ... }
});
```

### Proxy Health Check

```javascript
async function checkDigiKeyProxy() {
  try {
    const response = await fetch('https://api.digikey.com/v1/oauth2/token', {
      method: 'POST',
      agent: proxyAgent,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&client_id=test'
    });
    
    return response.status !== 403; // 403 = IP blocked
  } catch (error) {
    return false;
  }
}
```

## Error Handling

### Common Error Responses

#### Authentication Errors

```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

#### Rate Limit Exceeded

```json
{
  "ErrorResponseVersion": "1.0",
  "StatusCode": 429,
  "ErrorMessage": "Too Many Requests",
  "ErrorDetails": "Rate limit exceeded"
}
```

#### Geographic Restriction

```json
{
  "ErrorResponseVersion": "1.0",
  "StatusCode": 403,
  "ErrorMessage": "Forbidden",
  "ErrorDetails": "Access denied from this geographic location"
}
```

### Error Recovery

```javascript
async function searchWithRetry(query, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await searchDigiKey(query);
    } catch (error) {
      if (error.status === 401) {
        // Token expired, refresh and retry
        await auth.refreshToken();
        continue;
      }
      
      if (error.status === 429) {
        // Rate limited, exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}
```

## Testing

### Authentication Test

```javascript
async function testDigiKeyAuth() {
  try {
    const token = await getDigi keyAccessToken();
    console.log('✅ Digi-Key authentication successful');
    console.log(`Token: ${token.substring(0, 10)}...`);
    return true;
  } catch (error) {
    console.log('❌ Digi-Key authentication failed:', error.message);
    return false;
  }
}
```

### Search Test

```javascript
async function testDigiKeySearch() {
  try {
    const results = await searchDigiKey('STM32F407');
    console.log(`✅ Digi-Key search successful: ${results.ProductsCount} products found`);
    
    if (results.Products && results.Products.length > 0) {
      const firstProduct = results.Products[0];
      console.log(`Sample product: ${firstProduct.ManufacturerPartNumber}`);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Digi-Key search failed:', error.message);
    return false;
  }
}
```

### Proxy Test

```javascript
async function testDigiKeyProxy() {
  try {
    // Test without proxy (should fail from Russian IP)
    const directResponse = await fetch('https://api.digikey.com/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&client_id=test'
    });
    
    if (directResponse.status === 403) {
      console.log('🔒 Direct access blocked (expected)');
      
      // Test with proxy
      const proxyResponse = await fetch('https://api.digikey.com/v1/oauth2/token', {
        method: 'POST',
        agent: proxyAgent,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials&client_id=test'
      });
      
      if (proxyResponse.status !== 403) {
        console.log('✅ Proxy access working');
        return true;
      }
    }
    
    console.log('❌ Proxy test failed');
    return false;
  } catch (error) {
    console.log('❌ Proxy test error:', error.message);
    return false;
  }
}
```

## Production Considerations

### Rate Limit Management

```javascript
class DigiKeyRateLimiter {
  constructor() {
    this.requests = [];
    this.dailyLimit = 10000;
  }
  
  canMakeRequest() {
    const now = Date.now();
    const dayStart = now - (24 * 60 * 60 * 1000);
    
    this.requests = this.requests.filter(time => time > dayStart);
    return this.requests.length < this.dailyLimit;
  }
  
  recordRequest() {
    this.requests.push(Date.now());
  }
}
```

### Monitoring

```javascript
const digiKeyMetrics = {
  requests: new Counter({
    name: 'digikey_requests_total',
    help: 'Total Digi-Key API requests',
    labelNames: ['status', 'endpoint']
  }),
  
  responseTime: new Histogram({
    name: 'digikey_response_time_seconds',
    help: 'Digi-Key API response time'
  }),
  
  authFailures: new Counter({
    name: 'digikey_auth_failures_total',
    help: 'Digi-Key authentication failures'
  })
};
```
