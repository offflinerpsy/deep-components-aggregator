# TME Provider

European electronic components distributor with comprehensive API access and technical specifications.

## Overview

- **API Version**: TME API v1
- **Authentication**: Token + Secret signature
- **Rate Limits**: Variable by account type
- **Base URL**: `https://api.tme.eu`
- **Geographic Restrictions**: None

## Configuration

### Environment Variables

```bash
# Required for API access (both needed)
TME_TOKEN=your_token_here
TME_SECRET=your_secret_here

# Optional: Override default URLs
TME_API_BASE=https://api.tme.eu
```

### Systemd Configuration

```ini
# /etc/systemd/system/deep-agg.service.d/environment.conf
[Service]
Environment=TME_TOKEN=your_token_here
Environment=TME_SECRET=your_secret_here
```

## Authentication

### Token + Secret Signature

TME uses a token-based authentication with secret signature:

```javascript
function generateTmeSignature(method, endpoint, params, secret) {
  const queryString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
    
  const signatureBase = `${method}&${endpoint}&${queryString}`;
  
  return crypto
    .createHmac('sha1', secret)
    .update(signatureBase)
    .digest('base64');
}
```

## API Endpoints

### Product Search

#### Search Request

```http
POST /Products/Search
Authorization: Bearer {token}
X-TME-Signature: {signature}
Content-Type: application/json

{
  "SearchPlain": "STM32F407",
  "Country": "RU",
  "Language": "RU"
}
```

#### Response Structure

```json
{
  "Status": "OK",
  "Data": {
    "ProductList": [
      {
        "Symbol": "STM32F407VGT6",
        "OriginalSymbol": "STM32F407VGT6",
        "Producer": "STMICROELECTRONICS",
        "Description": "ARM Cortex-M4 32bit MCU+FPU",
        "CategoryTree": [
          {
            "Name": "Integrated circuits"
          }
        ],
        "Photos": [
          {
            "HighResolution": "https://www.tme.eu/img/products/stm32f407vgt6.jpg"
          }
        ],
        "DocumentUrl": "https://www.st.com/resource/en/datasheet/stm32f407vg.pdf",
        "ProductInformationPage": "https://www.tme.eu/en/details/stm32f407vgt6/",
        "PriceList": [
          {
            "Amount": 1,
            "PriceValue": 45.60,
            "Currency": "PLN"
          },
          {
            "Amount": 10,
            "PriceValue": 41.04,
            "Currency": "PLN"
          }
        ],
        "InStock": 1500,
        "Unit": "pcs"
      }
    ]
  }
}
```

## Implementation

### Search Function

```javascript
async function searchTme(query, options = {}) {
  const endpoint = '/Products/Search';
  const params = {
    SearchPlain: query,
    Country: 'RU',
    Language: 'RU'
  };
  
  const signature = generateTmeSignature('POST', endpoint, params, process.env.TME_SECRET);
  
  const response = await fetch(`${TME_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.TME_TOKEN}`,
      'X-TME-Signature': signature,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    throw new Error(`TME API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}
```

### Product Normalization

```javascript
function normalizeTmeProduct(product) {
  return {
    mpn: product.OriginalSymbol || product.Symbol,
    manufacturer: product.Producer,
    description: product.Description,
    datasheet: product.DocumentUrl,
    pricing: product.PriceList?.map(tier => ({
      quantity: tier.Amount,
      price_original: tier.PriceValue,
      currency_original: tier.Currency || 'PLN'
    })) || [],
    stock: product.InStock || 0,
    provider: 'tme',
    providerSku: product.Symbol,
    category: product.CategoryTree?.[0]?.Name,
    package: product.PackageType,
    image: product.Photos?.[0]?.HighResolution,
    productUrl: product.ProductInformationPage,
    updated: new Date().toISOString()
  };
}
```

## Authentication Helper

```javascript
class TmeAuth {
  constructor(token, secret) {
    this.token = token;
    this.secret = secret;
  }
  
  generateSignature(method, endpoint, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
      
    const signatureBase = `${method.toUpperCase()}&${endpoint}&${sortedParams}`;
    
    return crypto
      .createHmac('sha1', this.secret)
      .update(signatureBase)
      .digest('base64');
  }
  
  async makeRequest(endpoint, params, method = 'POST') {
    const signature = this.generateSignature(method, endpoint, params);
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-TME-Signature': signature,
        'Content-Type': 'application/json'
      }
    };
    
    if (method === 'POST') {
      options.body = JSON.stringify(params);
    }
    
    return await fetch(`${TME_API_BASE}${endpoint}`, options);
  }
}
```

## Testing

### Authentication Test

```javascript
async function testTmeAuth() {
  try {
    const auth = new TmeAuth(process.env.TME_TOKEN, process.env.TME_SECRET);
    const response = await auth.makeRequest('/Products/Search', {
      SearchPlain: 'test',
      Country: 'RU',
      Language: 'EN'
    });
    
    if (response.ok) {
      console.log('✅ TME authentication successful');
      return true;
    } else {
      console.log('❌ TME authentication failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ TME authentication error:', error.message);
    return false;
  }
}
```

### Search Test

```javascript
async function testTmeSearch() {
  try {
    const results = await searchTme('STM32F407');
    const count = results.Data?.ProductList?.length || 0;
    console.log(`✅ TME search successful: ${count} products found`);
    return true;
  } catch (error) {
    console.log('❌ TME search failed:', error.message);
    return false;
  }
}
```

## Error Handling

### Common Errors

#### Invalid Signature

```json
{
  "Status": "ERROR",
  "Message": "Invalid signature"
}
```

#### Rate Limit Exceeded

```json
{
  "Status": "ERROR", 
  "Message": "Rate limit exceeded"
}
```

#### Invalid Token

```json
{
  "Status": "ERROR",
  "Message": "Invalid token"
}
```

### Error Recovery

```javascript
async function searchTmeWithRetry(query, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await searchTme(query);
    } catch (error) {
      if (error.message.includes('signature') && attempt < maxRetries) {
        // Regenerate signature and retry
        continue;
      }
      
      if (error.message.includes('rate limit') && attempt < maxRetries) {
        // Wait and retry
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
}
```
