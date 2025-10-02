# Operations Guide: Deep Aggregator Orders & Authentication

## Table of Contents
- [Database Migrations](#database-migrations)
- [Authentication Setup](#authentication-setup)
  - [OAuth Provider Configuration](#oauth-provider-configuration)
  - [Session Secret](#session-secret)
- [WARP Proxy Configuration](#warp-proxy-configuration)
- [Nginx Basic Auth Setup](#nginx-basic-auth-setup)
- [Prometheus Metrics](#prometheus-metrics)
- [Rate Limiting Configuration](#rate-limiting-configuration)
- [Backup and Recovery](#backup-and-recovery)

---

## Database Migrations

### Location
- **Orders module:** `db/migrations/2025-10-02_orders.sql`
- **Authentication module:** `db/migrations/2025-10-02_auth.sql`

### Running Migrations

**On Development:**
```bash
cd /path/to/aggregator-v2

# Apply orders migration (if not already done)
sqlite3 var/db/deepagg.sqlite < db/migrations/2025-10-02_orders.sql

# Apply auth migration
sqlite3 var/db/deepagg.sqlite < db/migrations/2025-10-02_auth.sql
```

**On Production Server (5.129.228.88):**
```bash
ssh root@5.129.228.88
cd /opt/deep-agg

# Apply orders migration
sqlite3 var/db/deepagg.sqlite < db/migrations/2025-10-02_orders.sql

# Apply auth migration
sqlite3 var/db/deepagg.sqlite < db/migrations/2025-10-02_auth.sql
```

### Verify Migrations
```bash
# Check orders table
sqlite3 var/db/deepagg.sqlite "PRAGMA table_info(orders);"
# Should show 'user_id' column

# Check auth tables
sqlite3 var/db/deepagg.sqlite "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'sessions');"
# Expected output:
# users
# sessions

# Check foreign key
sqlite3 var/db/deepagg.sqlite "PRAGMA foreign_key_list(orders);"
# Should show FK: user_id -> users(id)
```

### Rollback (if needed)
```sql
-- CAUTION: This will delete all users and sessions!
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- Recreate orders table without user_id FK
-- (See migration file for original schema)
PRAGMA foreign_keys = ON;
```

---

## Authentication Setup

### OAuth Provider Configuration

#### Google OAuth (OIDC)

1. **Go to Google Cloud Console:** https://console.cloud.google.com/

2. **Create a new project** (or use existing)

3. **Enable Google+ API:**
   - Navigate to **APIs & Services > Library**
   - Search for "Google+ API"
   - Click **Enable**

4. **Create OAuth 2.0 Credentials:**
   - Navigate to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Application type: **Web application**
   - Name: `Deep Aggregator`
   - **Authorized redirect URIs:**
     - Development: `http://localhost:9201/auth/google/callback`
     - Production: `http://5.129.228.88:9201/auth/google/callback`
   - Click **Create**

5. **Copy Client ID and Secret**

6. **Set environment variables:**
   ```bash
   export GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
   export GOOGLE_CLIENT_SECRET="GOCSPX-abcd1234efgh5678"
   ```

#### Yandex OAuth

1. **Go to Yandex OAuth Console:** https://oauth.yandex.com/

2. **Click "Зарегистрировать приложение"** (Register Application)

3. **Fill in application details:**
   - Platform: **Web Services**
   - Callback URL:
     - Development: `http://localhost:9201/auth/yandex/callback`
     - Production: `http://5.129.228.88:9201/auth/yandex/callback`
   - Permissions: **Доступ к email, имени** (Access to email, name)

4. **Copy Client ID and Secret** (from application page after creation)

5. **Set environment variables:**
   ```bash
   export YANDEX_CLIENT_ID="abcd1234efgh5678ijkl"
   export YANDEX_CLIENT_SECRET="0123456789abcdef0123456789abcdef"
   ```

### Session Secret

**Critical for production!** Session cookies are signed with `SESSION_SECRET`.

**Generate a strong secret:**
```bash
openssl rand -base64 32
# Example output: J8K7mN4pQ1rS2tU3vW4xY5zA6bC7dE8fG9hH0iI1jK2=
```

**Set environment variable:**
```bash
export SESSION_SECRET="J8K7mN4pQ1rS2tU3vW4xY5zA6bC7dE8fG9hH0iI1jK2="
```

**In production systemd service file (`/etc/systemd/system/deep-agg.service`):**
```ini
[Service]
Environment="SESSION_SECRET=J8K7mN4pQ1rS2tU3vW4xY5zA6bC7dE8fG9hH0iI1jK2="
Environment="GOOGLE_CLIENT_ID=..."
Environment="GOOGLE_CLIENT_SECRET=..."
Environment="YANDEX_CLIENT_ID=..."
Environment="YANDEX_CLIENT_SECRET=..."
Environment="NODE_ENV=production"
```

**Restart service after updating:**
```bash
sudo systemctl daemon-reload
sudo systemctl restart deep-agg
```

---

## WARP Proxy Configuration

### What is WARP Proxy Mode?

Cloudflare WARP can act as a SOCKS5 proxy, routing all outbound HTTP requests through Cloudflare's network. This:
- Masks your server's IP address
- Bypasses regional blocks
- Adds extra privacy layer

### Installation (Linux)

1. **Download Cloudflare WARP client:**
   ```bash
   curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
   
   echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
   
   sudo apt-get update
   sudo apt-get install cloudflare-warp
   ```

2. **Register and connect:**
   ```bash
   warp-cli register
   warp-cli set-mode proxy
   warp-cli connect
   ```

3. **Verify WARP is running:**
   ```bash
   warp-cli status
   # Expected: Status update: Connected
   ```

4. **Set environment variable for Node.js:**
   ```bash
   export HTTP_PROXY=socks5://127.0.0.1:40000
   ```

5. **Add to systemd service file:**
   ```ini
   [Service]
   Environment="HTTP_PROXY=socks5://127.0.0.1:40000"
   ```

### Health Check

**Test proxy from command line:**
```bash
curl --proxy socks5://127.0.0.1:40000 https://www.cloudflare.com/cdn-cgi/trace
# Should show cf=1 and your WARP IP
```

**Test proxy from Node.js app:**
```javascript
import { checkProxyHealth } from './src/net/dispatcher.mjs';

await checkProxyHealth(); // Logs proxy IP and CF status
```

### Troubleshooting

**WARP not connecting:**
```bash
warp-cli disconnect
warp-cli connect
warp-cli status
```

**High latency or timeouts:**
- Default timeout is **10 seconds** per request
- Adjust in `src/net/dispatcher.mjs` if needed (not recommended < 5s)

**Disable WARP temporarily:**
```bash
unset HTTP_PROXY
# Or in systemd, comment out Environment="HTTP_PROXY=..."
sudo systemctl daemon-reload
sudo systemctl restart deep-agg
```

---

## Nginx Basic Auth Setup

### Overview
Admin endpoints (`/api/admin/*`) are protected by HTTP Basic Authentication at the Nginx level. This prevents unauthorized access without implementing complex auth logic in the application.

### Create Password File

**1. Install htpasswd utility (if not installed):**
```bash
# Ubuntu/Debian
sudo apt-get install apache2-utils

# CentOS/RHEL
sudo yum install httpd-tools
```

**2. Create password file:**
```bash
sudo mkdir -p /etc/nginx
sudo htpasswd -c /etc/nginx/.htpasswd admin
# Enter password when prompted (minimum 8 characters recommended)
```

**3. Add more users (optional):**
```bash
sudo htpasswd /etc/nginx/.htpasswd manager
```

**4. Verify file permissions:**
```bash
sudo chmod 644 /etc/nginx/.htpasswd
ls -l /etc/nginx/.htpasswd
# Expected: -rw-r--r-- root root
```

### Nginx Configuration

**Location:** `/etc/nginx/sites-available/deep-agg` (or your config file)

**Add Basic Auth block for admin endpoints:**
```nginx
server {
    listen 9201;
    server_name 5.129.228.88;
    
    # ... existing configuration ...
    
    # Public endpoints (no auth required)
    location /api/search {
        proxy_pass http://127.0.0.1:9201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /api/product {
        proxy_pass http://127.0.0.1:9201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /api/order {
        proxy_pass http://127.0.0.1:9201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # PROTECTED: Admin endpoints require authentication
    location /api/admin/ {
        auth_basic "Admin Area";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://127.0.0.1:9201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Metrics endpoint (optional: can also be protected)
    location /api/metrics {
        # Uncomment to protect metrics:
        # auth_basic "Metrics Access";
        # auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://127.0.0.1:9201;
        proxy_set_header Host $host;
    }
}
```

**Reload Nginx:**
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### Test Authentication

**Without credentials (should return 401):**
```bash
curl -i http://5.129.228.88:9201/api/admin/orders
# Expected: HTTP/1.1 401 Unauthorized
```

**With credentials (should return 200):**
```bash
curl -u admin:your_password http://5.129.228.88:9201/api/admin/orders
# Expected: HTTP/1.1 200 OK
```

---

## Prometheus Metrics

### Endpoint
`GET /api/metrics`

Returns metrics in Prometheus text-based format.

### Available Metrics

#### Orders Module Metrics
```
# Counter: Total orders created
orders_total{status="accepted"}
orders_total{status="rejected"}

# Gauge: Current orders by status
orders_by_status{status="new"}
orders_by_status{status="in_progress"}
orders_by_status{status="done"}
orders_by_status{status="cancelled"}

# Histogram: Order creation duration
order_create_duration_seconds_bucket{le="0.01"}
order_create_duration_seconds_bucket{le="0.05"}
order_create_duration_seconds_bucket{le="0.1"}
order_create_duration_seconds_sum
order_create_duration_seconds_count
```

#### HTTP Metrics
```
# Counter: Total HTTP requests
http_requests_total{method="GET",path="/api/search",status_code="200"}

# Histogram: HTTP request duration
http_request_duration_seconds{method="POST",path="/api/order"}
```

#### Rate Limiting Metrics
```
# Counter: Rate limit hits
rate_limit_hits_total{endpoint="/api/order"}
```

### Prometheus Configuration

**Add scrape target to `prometheus.yml`:**
```yaml
scrape_configs:
  - job_name: 'deep-aggregator'
    scrape_interval: 15s
    static_configs:
      - targets: ['5.129.228.88:9201']
    metrics_path: '/api/metrics'
    
    # If metrics endpoint is protected:
    basic_auth:
      username: 'admin'
      password: 'your_password'
```

**Reload Prometheus:**
```bash
curl -X POST http://localhost:9090/-/reload
# Or restart Prometheus service
```

### Test Metrics Endpoint
```bash
curl http://5.129.228.88:9201/api/metrics

# Expected output (sample):
# HELP orders_total Total number of order requests
# TYPE orders_total counter
# orders_total{status="accepted",app="deep-aggregator",version="3.0.0"} 42
# orders_total{status="rejected",app="deep-aggregator",version="3.0.0"} 3
# 
# HELP orders_by_status Current number of orders in each status
# TYPE orders_by_status gauge
# orders_by_status{status="new",app="deep-aggregator",version="3.0.0"} 15
# orders_by_status{status="in_progress",app="deep-aggregator",version="3.0.0"} 8
# orders_by_status{status="done",app="deep-aggregator",version="3.0.0"} 17
# orders_by_status{status="cancelled",app="deep-aggregator",version="3.0.0"} 2
```

---

## Rate Limiting Configuration

### Environment Variables

Add to `.env` file:

```bash
# Order endpoint rate limiting
ORDER_RATE_LIMIT_WINDOW_MS=60000  # 1 minute
ORDER_RATE_LIMIT_MAX=10           # 10 requests per minute per IP

# General API rate limiting
API_RATE_LIMIT_WINDOW_MS=60000    # 1 minute
API_RATE_LIMIT_MAX=100            # 100 requests per minute per IP

# Whitelist IPs (comma-separated, no spaces)
RATE_LIMIT_WHITELIST=127.0.0.1,::1
```

### Adjust Limits

**For production (stricter):**
```bash
ORDER_RATE_LIMIT_MAX=5     # 5 orders per minute
API_RATE_LIMIT_MAX=50      # 50 API calls per minute
```

**For development (permissive):**
```bash
ORDER_RATE_LIMIT_MAX=100
API_RATE_LIMIT_MAX=1000
```

**Restart server after changing `.env`:**
```bash
cd /opt/deep-agg
pkill -f 'node.*server.js'
nohup node server.js > logs/out.log 2> logs/err.log &
```

### Test Rate Limiting

**Bash script to test:**
```bash
#!/bin/bash
# Test rate limit by sending 15 requests rapidly

ENDPOINT="http://5.129.228.88:9201/api/order"

for i in {1..15}; do
  echo "Request $i:"
  curl -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{
      "customer": {
        "name": "Test User",
        "contact": {"email": "test@example.com"}
      },
      "item": {
        "mpn": "TEST-001",
        "manufacturer": "Test Corp",
        "qty": 1
      }
    }' \
    | jq -r '.error // "ok"'
  echo ""
  sleep 0.5
done
```

**Expected behavior:**
- First 10 requests: `ok` (201 Created)
- Requests 11-15: `rate_limit` (429 Too Many Requests)

---

## Backup and Recovery

### Database Backup

**Create backup script (`/opt/deep-agg/backup_db.sh`):**
```bash
#!/bin/bash
BACKUP_DIR="/opt/deep-agg/backups"
DB_FILE="/opt/deep-agg/cache.json"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
cp "$DB_FILE" "$BACKUP_DIR/cache_${TIMESTAMP}.json"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "cache_*.json" -mtime +7 -delete

echo "Backup created: cache_${TIMESTAMP}.json"
```

**Add to crontab (daily at 2 AM):**
```bash
crontab -e
# Add line:
0 2 * * * /opt/deep-agg/backup_db.sh >> /opt/deep-agg/logs/backup.log 2>&1
```

### Restore from Backup
```bash
cd /opt/deep-agg
# Stop server
pkill -f 'node.*server.js'

# Restore backup
cp backups/cache_20251002_020000.json cache.json

# Restart server
nohup node server.js > logs/out.log 2> logs/err.log &
```

### Export Orders to JSON

**For reporting or migration:**
```bash
sqlite3 cache.json <<EOF
.mode json
.output orders_export.json
SELECT * FROM orders;
.quit
EOF
```

---

## Troubleshooting

### Check if orders table exists
```bash
sqlite3 cache.json "SELECT COUNT(*) FROM orders;"
```

### View recent orders
```bash
sqlite3 cache.json "SELECT id, mpn, status, datetime(created_at/1000, 'unixepoch') as created FROM orders ORDER BY created_at DESC LIMIT 10;"
```

### Check pricing policy
```bash
sqlite3 cache.json "SELECT value FROM settings WHERE key='pricing_policy';"
```

### Reset orders_by_status gauge
```bash
# Restart server to recalculate from database
pkill -f 'node.*server.js'
cd /opt/deep-agg
nohup node server.js > logs/out.log 2> logs/err.log &
```

---

## Security Checklist

- [ ] Nginx Basic Auth configured for `/api/admin/*`
- [ ] `.htpasswd` file has correct permissions (644)
- [ ] Strong passwords (minimum 12 characters)
- [ ] Rate limiting enabled on `/api/order`
- [ ] Database backups scheduled (cron job)
- [ ] Logs rotated (logrotate configured)
- [ ] Firewall rules allow only port 9201
- [ ] HTTPS enabled (if using domain name)
- [ ] Environment variables in `.env` (not committed to git)

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-02  
**Maintainer:** DevOps Team
