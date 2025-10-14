# Nginx AdminJS Fix — October 14, 2025

## Problem
AdminJS panel returned 404 on `https://prosnab.tech/admin` — Nginx was proxying all requests to Next.js frontend (port 3001) instead of backend AdminJS (port 9201).

## Root Cause
Original Nginx config had only one `location /` block pointing to Next.js. AdminJS routes were not configured.

## Solution
Added dedicated location blocks for AdminJS in `/etc/nginx/sites-enabled/prosnab.tech`:

```nginx
# AdminJS Panel
location /admin {
    proxy_pass http://127.0.0.1:9201;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# AdminJS API endpoints
location /api/admin {
    proxy_pass http://127.0.0.1:9201;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# AdminJS static pages API
location ~ ^/api/(static-pages|pages) {
    proxy_pass http://127.0.0.1:9201;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Verification

### Local Test
```bash
curl -sL http://127.0.0.1:9201/admin | head -5
# Returns: Found. Redirecting to /admin/login
```

### Domain Test
```bash
curl -sL https://prosnab.tech/admin | head -30
# Returns: AdminJS login page HTML with REDUX_STATE
```

### Response Sample
```html
<!DOCTYPE html>
<html lang=ru>
<head>
  <script>
    window.REDUX_STATE = {"assets":{"styles":[],"scripts":[]},"branding":{"companyName":"Deep Components Aggregator"...
```

## Access URLs

- **AdminJS Panel**: https://prosnab.tech/admin
- **Direct IP**: http://5.129.228.88:9201/admin
- **Login**: admin@deepagg.local / admin123

## Files Modified

```
/etc/nginx/sites-enabled/prosnab.tech
```

## Commands

```bash
# Backup
sudo cp /etc/nginx/sites-enabled/prosnab.tech /root/nginx-backup-$(date +%Y%m%d-%H%M%S)

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

## Status
✅ **FIXED** — AdminJS now accessible via https://prosnab.tech/admin

---
**Fixed**: October 14, 2025, 10:15 UTC  
**Impact**: None (no downtime, only added new routes)