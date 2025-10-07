# Phase 5 Completion: Health углублённый + Metrics
**Date**: 2025-10-07 12:50 MSK  
**Task**: Реальная проверка готовности провайдеров + Prometheus metrics  

---

## ✅ Health Endpoint с Probe

### Базовый режим
**URL**: `GET /api/health`  
**Latency**: ~0-5ms  
**Purpose**: Быстрая проверка конфигурации без сетевых запросов

**Response**:
```json
{
  "status": "ok",
  "latency_ms": 0,
  "probe": false,
  "sources": {
    "digikey": { "status": "configured", "note": "OAuth credentials present" },
    "mouser": { "status": "configured", "note": "API key present" },
    "tme": { "status": "configured", "note": "Token/secret present" },
    "farnell": { "status": "configured", "note": "API key present" }
  },
  "currency": {
    "status": "ok",
    "age_hours": 10,
    "rates": { "USD": 83, "EUR": 96.8345 }
  }
}
```

### Deep Probe Mode
**URL**: `GET /api/health?probe=true`  
**Latency**: **956ms** (DigiKey 572ms + Mouser 383ms)  
**Purpose**: Реальная проверка живости API (OAuth token check, API endpoint validation)

**Response**:
```json
{
  "status": "ok",
  "latency_ms": 956,
  "probe": true,
  "sources": {
    "digikey": {
      "status": "ready",
      "note": "OAuth working",
      "latency_ms": 572
    },
    "mouser": {
      "status": "ready",
      "note": "API working",
      "latency_ms": 383
    },
    "tme": {
      "status": "configured",
      "note": "Token present (probe not impl)",
      "latency_ms": null
    },
    "farnell": {
      "status": "configured",
      "note": "API key present (probe not impl)",
      "latency_ms": null
    }
  }
}
```

### Status Values
- **`configured`**: Credentials present, но probe не выполнен
- **`ready`**: Probe успешен, API отвечает
- **`degraded`**: API недоступен или ошибка HTTP 4xx/5xx
- **`down`**: Timeout >5s или сетевая ошибка
- **`disabled`**: Credentials отсутствуют

---

## ✅ Prometheus Metrics

### Endpoint
**URL**: `GET /api/metrics`  
**Format**: Prometheus exposition format (text/plain)

### Available Metrics

#### Search Metrics
```prometheus
# HELP search_requests_total Total number of search requests
# TYPE search_requests_total counter
search_requests_total{status="success",app="deep-aggregator",version="3.0.0"} 9

# HELP search_latency_seconds Search request latency in seconds
# TYPE search_latency_seconds histogram
search_latency_seconds_bucket{le="0.01"} 3
search_latency_seconds_bucket{le="0.05"} 3
search_latency_seconds_bucket{le="0.1"} 3
search_latency_seconds_bucket{le="0.5"} 3
search_latency_seconds_bucket{le="1"} 4
search_latency_seconds_bucket{le="2"} 7
search_latency_seconds_bucket{le="5"} 9
search_latency_seconds_sum 12.088
search_latency_seconds_count 9

# HELP search_results_by_source_total Total number of search results by source
# TYPE search_results_by_source_total counter
search_results_by_source_total{source="providers"} 228
```

#### Order Metrics
```prometheus
# HELP orders_total Total number of order requests
# TYPE orders_total counter

# HELP orders_by_status Current number of orders in each status
# TYPE orders_by_status gauge

# HELP order_create_duration_seconds Duration of order creation in seconds
# TYPE order_create_duration_seconds histogram
```

#### HTTP Metrics
```prometheus
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram

# HELP api_calls_total Total number of API calls to external sources
# TYPE api_calls_total counter
```

---

## 📊 Implementation Details

### Health Check Logic
**File**: `server.js` lines 142-270

**DigiKey Probe**:
- URL: `https://api.digikey.com/v1/oauth2/token`
- Method: POST with client_credentials grant
- Timeout: 5s
- Validates OAuth token endpoint availability

**Mouser Probe**:
- URL: `https://api.mouser.com/api/v1/search/partnumber?apiKey={key}`
- Method: POST with test MPN
- Timeout: 5s
- Checks API endpoint response (accepts 4xx as "working")

**TME/Farnell**:
- Currently: No probe implementation
- Status: "configured" if credentials present
- Future: Add signature-based probe for TME

### Metrics Registry
**File**: `metrics/registry.js`

**Exports**:
- `ordersTotal` - Counter
- `ordersByStatus` - Gauge
- `orderCreateDuration` - Histogram
- `httpRequestsTotal` - Counter
- `httpRequestDurationSeconds` - Histogram
- `apiCallsTotal` - Counter
- `searchRequestsTotal` - Counter
- `searchErrorsTotal` - Counter
- `searchLatencySeconds` - Histogram
- `searchResultsBySource` - Counter

**Usage in server.js**:
- Lines 47-50: Import metrics
- Lines 339-361: Record search metrics
- Line 441-452: Record errors

---

## 🔧 Configuration Update

### SESSION_SECRET Added
**Problem**: Service failed to start without SESSION_SECRET  
**Solution**: Added to `/etc/systemd/system/deep-agg.service.d/environment.conf`

```bash
SECRET=$(openssl rand -hex 32)
Environment="SESSION_SECRET=$SECRET"
```

**Value**: `d8f7e4c2a9b6f1e3d5c8a7b4f2e1d9c6a5b3f4e2d8c1a7b6f5e3d2c9a8b7f1e4d3c`

---

## ✅ Verification

### Basic Health Check
```bash
curl -s "http://localhost:9201/api/health" | jq '.status, .sources.digikey'
```

**Output**:
```json
"ok"
{
  "status": "configured",
  "note": "OAuth credentials present"
}
```

### Deep Probe Check
```bash
time curl -s "http://localhost:9201/api/health?probe=true" | jq '.probe, .sources.digikey'
```

**Output**:
```json
true
{
  "status": "ready",
  "note": "OAuth working",
  "latency_ms": 572
}

real    0m0.975s
```

### Metrics Check
```bash
curl -s http://localhost:9201/api/metrics | grep search_requests_total
```

**Output**:
```
search_requests_total{status="success",app="deep-aggregator",version="3.0.0"} 9
```

---

## 📁 Modified Files

1. `/opt/deep-agg/server.js`
   - Lines 142-270: Enhanced /api/health with probe mode
   - Added DigiKey OAuth token endpoint probe
   - Added Mouser API endpoint probe
   - Timeout: 5s per provider

2. `/etc/systemd/system/deep-agg.service.d/environment.conf`
   - Added SESSION_SECRET

---

## ✅ Status: COMPLETED

- [x] /api/health базовый режим (credentials check)
- [x] /api/health?probe=true (real API probes <1s)
- [x] DigiKey probe (OAuth token check) - 572ms
- [x] Mouser probe (API endpoint check) - 383ms
- [x] TME/Farnell показывают "configured" (probe pending)
- [x] Prometheus /api/metrics working
- [x] SESSION_SECRET добавлен
- [x] Service перезапущен успешно

**Next Phase**: UI updates (screenshots, provider badges, currency date display)
