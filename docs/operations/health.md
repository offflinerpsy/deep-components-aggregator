# Health Monitoring

Comprehensive platform health monitoring through `/api/health` endpoint providing real-time system status.

## Health Check Endpoint

### Request
```http
GET /api/health
Accept: application/json
```

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
      "oauth_token": "valid",
      "proxy_enabled": true
    },
    "mouser": {
      "enabled": false,
      "configured": false,
      "error": "Missing MOUSER_API_KEY environment variable"
    },
    "farnell": {
      "enabled": false,
      "configured": false,
      "error": "Missing FARNELL_API_KEY environment variable"
    },
    "tme": {
      "enabled": false,
      "configured": false,
      "error": "Missing TME_TOKEN and TME_SECRET environment variables"
    }
  },
  "database": {
    "status": "healthy",
    "last_query": 1759793727456,
    "total_products": 45623,
    "response_time_ms": 12
  },
  "currency": {
    "status": "fresh",
    "age_hours": 2,
    "last_update": "2025-10-07 12:00:00",
    "rates_count": 3,
    "source": "ЦБ РФ"
  },
  "proxy": {
    "warp": {
      "enabled": true,
      "working": true,
      "last_check": 1759793720000,
      "ip": "138.199.48.1",
      "location": "NL"
    }
  }
}
```

## Health Status Definitions

### Overall System Health

#### `ok: true`
- All critical systems operational
- Providers may be disabled but not failing
- Database responsive
- Core functionality available

#### `ok: false`
- One or more critical systems failing
- Database connection issues
- Core platform functionality compromised

### Provider Health States

#### `"healthy"`
- Provider API responding normally
- Authentication valid
- Recent successful requests
- Response times within acceptable range

#### `"degraded"`
- Provider responding with intermittent errors
- Higher than normal response times
- Some requests succeeding, others failing
- May indicate rate limiting or partial outage

#### `"disabled"`
- Provider intentionally disabled in configuration
- Missing required credentials
- Not configured for this environment

#### `"error"`
- Provider configured but failing all requests
- Authentication failures
- Network connectivity issues
- API endpoint unreachable

### Database Health

#### `"healthy"`
- Response time < 100ms average
- All queries executing successfully
- Connection pool healthy
- Recent query activity

#### `"slow"`
- Response time 100ms - 1s average
- Queries succeeding but degraded performance
- May indicate high load or optimization needed

#### `"error"`
- Connection failures
- Query timeouts
- Database unreachable
- Critical operational issue

### Currency Health

#### `"fresh"`
- Exchange rates updated within 12 hours
- CBR API responding normally
- Accurate pricing conversions

#### `"stale"`
- Rates 12-48 hours old
- CBR API may be temporarily unavailable
- Using cached rates with warnings

#### `"very_stale"`
- Rates over 48 hours old
- Extended CBR API outage
- Pricing accuracy significantly degraded

## Monitoring Integration

### Automated Health Checks

```bash
# Simple health check
curl -f http://localhost:3000/api/health > /dev/null

# Detailed status with jq
curl -s http://localhost:3000/api/health | jq '.ok'
```

### Health Check Script

```bash
#!/bin/bash
# scripts/health-check.sh

HEALTH_URL="http://localhost:3000/api/health"
RESPONSE=$(curl -s "$HEALTH_URL")
OK=$(echo "$RESPONSE" | jq -r '.ok')

if [ "$OK" = "true" ]; then
  echo "✅ System healthy"
  exit 0
else
  echo "❌ System unhealthy:"
  echo "$RESPONSE" | jq '.providers, .database, .currency'
  exit 1
fi
```

### Nagios/Icinga Integration

```ini
# nagios health check
define command {
    command_name    check_deep_agg_health
    command_line    /usr/lib/nagios/plugins/check_http -H $HOSTADDRESS$ -p 3000 -u /api/health -s '"ok":true'
}

define service {
    use                     generic-service
    host_name               deep-agg-server
    service_description     Deep Agg Health
    check_command           check_deep_agg_health
    check_interval          1
    retry_interval          1
}
```

### Systemd Integration

```bash
# Check service health before restart
ExecStartPre=/opt/deep-agg/scripts/health-check.sh
```

## Troubleshooting Guide

### Provider Issues

#### All Providers Disabled
```bash
# Check environment configuration
sudo systemctl show deep-agg.service --property=Environment

# Verify credentials loaded
curl -s http://localhost:3000/api/health | jq '.providers'
```

#### Authentication Failures
```bash
# Check Digi-Key OAuth
curl -s http://localhost:3000/api/health | jq '.providers.digikey.oauth_token'

# Test provider connectivity
node scripts/test-provider-auth.mjs digikey
```

### Database Issues

#### Slow Queries
```bash
# Check database performance
curl -s http://localhost:3000/api/health | jq '.database.response_time_ms'

# Analyze slow queries
sqlite3 data/db/products.db ".timer on" "SELECT COUNT(*) FROM products;"
```

#### Connection Failures
```bash
# Check database file permissions
ls -la data/db/products.db

# Test direct database access
sqlite3 data/db/products.db "SELECT 1;"
```

### Currency Issues

#### Stale Rates
```bash
# Force rate refresh
node scripts/refresh-rates.mjs

# Check CBR API directly
curl "https://www.cbr.ru/scripts/XML_daily.asp"
```

## Health Dashboard

The health endpoint provides data for operational dashboards:

### Key Metrics Display
- **System Uptime**: `uptime` seconds converted to human readable
- **Provider Status**: Visual indicators for each provider state
- **Database Performance**: Response time trends
- **Currency Freshness**: Time since last rate update
- **Proxy Status**: WARP connectivity and geolocation

### Status Page Integration

```javascript
// Example status page integration
fetch('/api/health')
  .then(r => r.json())
  .then(health => {
    document.getElementById('overall-status').className = 
      health.ok ? 'status-healthy' : 'status-degraded';
    
    Object.entries(health.providers).forEach(([name, status]) => {
      document.getElementById(`provider-${name}`).className = 
        `status-${status.status || 'disabled'}`;
    });
  });
```
