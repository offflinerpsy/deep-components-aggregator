# System Metrics

The platform provides comprehensive observability through Prometheus metrics and structured health checks.

## Metrics Endpoint

**URL**: `/api/metrics`
**Format**: Prometheus exposition format
**Authentication**: None (for monitoring systems)

### Core System Metrics

#### Request Metrics
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET", status="200"} 1540
http_requests_total{method="POST", status="201"} 85
http_requests_total{method="GET", status="404"} 23

# HELP http_request_duration_seconds Request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 1456
http_request_duration_seconds_bucket{le="0.5"} 1598
http_request_duration_seconds_bucket{le="1.0"} 1634
```

#### Database Metrics
```
# HELP database_queries_total Total database queries executed
# TYPE database_queries_total counter
database_queries_total{operation="SELECT"} 12456
database_queries_total{operation="INSERT"} 289

# HELP database_query_duration_seconds Database query duration
# TYPE database_query_duration_seconds histogram
database_query_duration_seconds_bucket{operation="SELECT", le="0.01"} 8234
database_query_duration_seconds_bucket{operation="SELECT", le="0.1"} 12456
```

#### Provider API Metrics
```
# HELP provider_requests_total Provider API requests made
# TYPE provider_requests_total counter
provider_requests_total{provider="digikey", status="success"} 156
provider_requests_total{provider="mouser", status="error"} 3

# HELP provider_response_time_seconds Provider API response time
# TYPE provider_response_time_seconds histogram
provider_response_time_seconds_bucket{provider="digikey", le="1.0"} 134
provider_response_time_seconds_bucket{provider="digikey", le="5.0"} 156
```

#### Search Metrics
```
# HELP search_requests_total Total search requests by language
# TYPE search_requests_total counter
search_requests_total{language="ru"} 1230
search_requests_total{language="en"} 567

# HELP search_results_total Search results returned
# TYPE search_results_total histogram
search_results_total_bucket{language="ru", le="10"} 890
search_results_total_bucket{language="ru", le="100"} 1156
```

## Health Check Endpoint

**URL**: `/api/health`
**Format**: JSON
**Updates**: Real-time system status

### Response Structure

```json
{
  "ok": true,
  "timestamp": 1759793728406,
  "version": "3.2.0",
  "env": "production",
  "uptime": 73289,
  "providers": {
    "digikey": {
      "enabled": true,
      "configured": true,
      "last_check": 1759793728000,
      "status": "healthy",
      "oauth_token": "valid"
    },
    "mouser": {
      "enabled": false,
      "configured": false,
      "error": "Missing API key"
    }
  },
  "database": {
    "status": "healthy",
    "last_query": 1759793727456,
    "total_products": 45623
  },
  "currency": {
    "status": "fresh",
    "age_hours": 2,
    "last_update": "2025-10-07 12:00:00",
    "rates_count": 3
  },
  "proxy": {
    "warp": {
      "enabled": true,
      "working": true,
      "last_check": 1759793720000
    }
  }
}
```

### Health Status Definitions

#### Overall Health (`ok`)
- `true`: All critical systems operational
- `false`: One or more critical systems failing

#### Provider Status
- `"healthy"`: Provider responding normally
- `"degraded"`: Provider responding with errors/delays
- `"disabled"`: Provider not configured or intentionally disabled
- `"error"`: Provider configured but failing

#### Database Status
- `"healthy"`: Database responding normally (<100ms queries)
- `"slow"`: Database responding slowly (100ms-1s queries)  
- `"error"`: Database connection failing

#### Currency Status
- `"fresh"`: Rates updated within 12 hours
- `"stale"`: Rates 12-48 hours old
- `"very_stale"`: Rates over 48 hours old

## Grafana Dashboard

### Key Panels

1. **Request Volume**: HTTP requests/second by endpoint
2. **Response Times**: P50, P95, P99 latency percentiles
3. **Error Rates**: 4xx and 5xx error percentages
4. **Provider Health**: API availability and response times
5. **Database Performance**: Query execution times
6. **Search Patterns**: Russian vs English query volume

### Alert Rules

#### Critical Alerts
- HTTP error rate > 5% for 5 minutes
- Database query time > 1s average for 2 minutes
- Any provider down for > 10 minutes

#### Warning Alerts
- HTTP response time P95 > 2s for 5 minutes
- Currency rates stale > 24 hours
- Database connection pool > 80% utilized

## Monitoring Setup

### Local Development
```bash
# Install monitoring stack
docker-compose up prometheus grafana

# Access dashboards
open http://localhost:3000  # Grafana
open http://localhost:9090  # Prometheus
```

### Production Integration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'deep-agg'
    static_configs:
      - targets: ['deep-agg.local:3000']
    scrape_interval: 15s
    metrics_path: '/api/metrics'
```
