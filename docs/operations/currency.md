# Currency Conversion

The platform converts all pricing to Russian Rubles (RUB) using official Central Bank of Russia exchange rates.

## Data Source

**Primary**: Central Bank of Russia (CBR) daily XML feed
**URL**: `https://www.cbr.ru/scripts/XML_daily.asp`
**Update Schedule**: Daily at 12:00 MSK
**Cache TTL**: 12 hours

## Exchange Rate API

### Get Current Rates

```http
GET /api/currency/rates
```

Response:
```json
{
  "ok": true,
  "timestamp": 1759793728406,
  "date": "2025-10-07",
  "age_hours": 2,
  "rates": {
    "USD": 83.0,
    "EUR": 96.8345,
    "GBP": 111.8176
  },
  "source": "ЦБ РФ"
}
```

## Conversion Logic

### Price Break Conversion

Each price tier is converted individually:

```javascript
const priceRub = amount * rates[currency];
```

### Minimum Price Calculation

The system calculates `minRub` as the lowest price across all quantity breaks:

```javascript
const minRub = pricing.reduce((best, tier) => {
  const rub = tier.price_rub;
  return rub < best ? rub : best;
}, Number.POSITIVE_INFINITY);
```

## Cache Management

### Automatic Refresh

The system automatically refreshes rates when:
- Cache age exceeds 12 hours
- Manual refresh requested via `/scripts/refresh-rates.mjs`

### Fallback Rates

If CBR API is unavailable, the system uses cached rates with warnings:

```json
{
  "currency": {
    "status": "stale",
    "age_hours": 25,
    "rates": { "USD": 90.0, "EUR": 100.0 }
  }
}
```

## Manual Operations

### Force Rate Refresh

```bash
node scripts/refresh-rates.mjs
```

### Check Rate Age

```bash
curl /api/currency/rates | jq '.age_hours'
```

## UI Display

Currency information is displayed in search results:

- **Price Column**: Shows RUB amount with currency source date
- **Tooltip**: Displays original currency and conversion rate
- **Freshness**: Green for fresh rates (<12h), yellow for stale (12-48h), red for very stale (>48h)

Example UI display:
```
₽817.00 (from $9.84 @ 83.00, 2025-10-07)
```
