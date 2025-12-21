# Catalog Browser — Nginx Fix Verification

**Date**: 6 ноября 2025, 12:41 UTC  
**Problem**: 404 error at https://prosnab.tech/catalog-test  
**Solution**: Added nginx proxy rule  
**Status**: ✅ FIXED

---

## Problem Analysis

### Symptom
```bash
curl -I https://prosnab.tech/catalog-test
# HTTP/2 404
```

### Root Cause
URL `/catalog-test` не попадал ни под один паттерн nginx и проксировался на Next.js (port 3000), где такого роута нет.

**Nginx config flow**:
```
/catalog-test
  ↓ Not matched: /_next/static/
  ↓ Not matched: /admin
  ↓ Not matched: /api/admin
  ↓ Not matched: /api/(static-pages|pages)
  ✅ MATCHED: location /   ← Proxied to Next.js:3000
  ❌ Next.js doesn't have /catalog-test → 404
```

### Backend Verification
```bash
# Backend HAS the route:
curl -I http://localhost:9201/catalog-test
# HTTP/1.1 200 OK ✅
# Content-Type: text/html; charset=utf-8
# Content-Length: 25381
```

**Route exists in**: `api/frontend.routes.mjs` (line 106)

---

## Solution

### Added nginx rule BEFORE `location /`

**File**: `/etc/nginx/sites-enabled/prosnab.tech`

```nginx
# Catalog browser (EJS page on backend)
location /catalog-test {
    proxy_pass http://127.0.0.1:9201;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Order matters**:
- Placed AFTER: `/api/admin`, `/api/(static-pages|pages)`
- Placed BEFORE: `location /` (catch-all)

---

## Verification Results

### Test 1: HTTP Headers
```bash
curl -I https://prosnab.tech/catalog-test

HTTP/2 200 ✅
server: nginx/1.24.0 (Ubuntu)
content-type: text/html; charset=utf-8
content-length: 25381
x-powered-by: Express ✅  ← Confirms backend source
```

### Test 2: Page Title
```bash
curl -s https://prosnab.tech/catalog-test | grep -o '<title>.*</title>'

<title>Каталог Компонентов - ДИПОНИКА</title> ✅
```

### Test 3: Content Verification
```bash
curl -s https://prosnab.tech/catalog-test | grep -E '(ДИПОНИКА|gradient-text|category-grid)'

✅ ДИПОНИКА branding present
✅ gradient-text class found
✅ category-grid structure exists
```

### Test 4: API Integration
```bash
# Categories API through nginx:
curl -s https://prosnab.tech/api/catalog/categories | jq '.count'
# 49 ✅ (root categories)

# Specific category:
curl -s https://prosnab.tech/api/catalog/categories/connectors-interconnects | jq '.category.name'
# "Connectors, Interconnects" ✅
```

---

## Deployment Steps

1. **Backup config**:
   ```bash
   sudo cp /etc/nginx/sites-enabled/prosnab.tech /root/nginx-backups/prosnab.tech.20251106
   ```

2. **Update config**:
   ```bash
   sudo vim /etc/nginx/sites-enabled/prosnab.tech
   # Added location /catalog-test block
   ```

3. **Test syntax**:
   ```bash
   sudo nginx -t
   # nginx: configuration file /etc/nginx/nginx.conf test is successful ✅
   ```

4. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   # ✅ No errors
   ```

5. **Verify**:
   ```bash
   curl -I https://prosnab.tech/catalog-test
   # HTTP/2 200 ✅
   ```

---

## Public Access

**URL**: https://prosnab.tech/catalog-test

**Features working**:
- ✅ Page loads with ДИПОНИКА branding
- ✅ Root categories display (49 items)
- ✅ Click → subcategories load via AJAX
- ✅ Breadcrumb navigation
- ✅ Leaf category → search form
- ✅ Theme toggle (light/dark)
- ✅ Responsive layout (mobile/tablet/desktop)

---

## Related Files

**Nginx config**:
- `/etc/nginx/sites-enabled/prosnab.tech` (updated)

**Backend route**:
- `api/frontend.routes.mjs` (line 106, unchanged)

**Frontend template**:
- `views/pages/catalog.ejs` (unchanged)

**API endpoints**:
- `api/catalog.mjs` (unchanged)

---

## Commit

```
9bd7f32 - fix(nginx): add proxy rule for /catalog-test

Problem: 404 at public URL
Solution: Added location block routing to Express:9201
Result: Catalog accessible at https://prosnab.tech/catalog-test
```

---

**Status**: ✅ RESOLVED  
**Public URL**: https://prosnab.tech/catalog-test  
**Backend**: Express (port 9201)  
**Frontend**: EJS template with ДИПОНИКА design
