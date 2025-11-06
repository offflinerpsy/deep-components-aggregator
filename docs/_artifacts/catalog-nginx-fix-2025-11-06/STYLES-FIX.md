# Catalog Browser — CSS Loading Fix

**Date**: 6 ноября 2025, 12:48 UTC  
**Problem**: CSS файлы возвращали 404 на /catalog-test  
**Solution**: Добавлен nginx location ^~ /styles/  
**Status**: ✅ FIXED

---

## Problem Analysis

### Symptom
```bash
curl -I https://prosnab.tech/styles/v0-compiled.css
# HTTP/2 404
# x-powered-by: Next.js  ← Wrong backend!
```

### Root Cause
1. **CSS файлы существуют** на Express:9201:
   ```bash
   curl -I http://localhost:9201/styles/v0-compiled.css
   # HTTP/1.1 200 OK ✅
   ```

2. **Nginx routing issue**: два конфликтующих правила
   - Строка 28: `location ~* \.(css|js|...)$ { proxy_pass :3000; }`
   - Строка 72: `location /styles/ { proxy_pass :9201; }`

3. **Регулярка имеет приоритет** над обычным префиксом:
   - Request: `/styles/v0-compiled.css`
   - Match: `~* \.css$` (строка 28) → Next.js:3000 → 404
   - Never reached: `/styles/` (строка 72)

---

## Solution

### Nginx Location Priority
Согласно nginx docs, приоритет location блоков:
1. **Exact match**: `location = /path`
2. **Prefix with ^~**: `location ^~ /path` ← Останавливает регулярки
3. **Regex**: `location ~* pattern`
4. **Longest prefix**: `location /path`

### Applied Fix
```nginx
# Before (строка 72):
location /styles/ {
    proxy_pass http://127.0.0.1:9201;
}

# After:
location ^~ /styles/ {  # ← Добавлен ^~ модификатор
    proxy_pass http://127.0.0.1:9201;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_valid 200 1d;
    add_header Cache-Control "public, max-age=86400";
}
```

**Эффект**: `^~` останавливает поиск регулярных выражений, `/styles/*` всегда идёт в Express:9201.

---

## Verification Results

### 1. CSS Files Now Accessible
```bash
curl -I https://prosnab.tech/styles/v0-compiled.css
# HTTP/2 200 ✅
# content-type: text/css; charset=utf-8
# content-length: 80168
# x-powered-by: Express ← Correct backend!
# cache-control: public, max-age=86400

curl -I https://prosnab.tech/styles/v0-theme.css
# HTTP/2 200 ✅
# content-type: text/css; charset=utf-8
# content-length: 14628
# x-powered-by: Express
```

### 2. Catalog Page Loads
```bash
curl -s https://prosnab.tech/catalog-test | grep '<title>'
# <title>Каталог Компонентов - ДИПОНИКА</title> ✅
```

### 3. Nginx Config Valid
```bash
sudo nginx -t
# nginx: configuration file /etc/nginx/nginx.conf test is successful ✅
```

---

## Deployment Steps

```bash
# 1. Backup
sudo mkdir -p /root/nginx-backups
sudo cp /etc/nginx/sites-enabled/prosnab.tech \
   /root/nginx-backups/prosnab.tech.pre-styles-20251106-124651

# 2. Edit config
sudo sed -i 's|location /styles/ {|location ^~ /styles/ {|' \
   /etc/nginx/sites-enabled/prosnab.tech

# 3. Test syntax
sudo nginx -t

# 4. Reload nginx
sudo systemctl reload nginx

# 5. Verify
curl -I https://prosnab.tech/styles/v0-compiled.css
curl -I https://prosnab.tech/styles/v0-theme.css
```

---

## Public Access

**Catalog Browser**: https://prosnab.tech/catalog-test  
**Status**: ✅ Fully functional with styles

**Expected Appearance**:
- ДИПОНИКА header with logo
- Theme toggle (light/dark)
- Category grid with hover effects
- Breadcrumb navigation
- Search form on leaf categories

---

## Related Files

**Nginx Config**: `/etc/nginx/sites-enabled/prosnab.tech`
- Line 28: `location ~* \.(css|...)$` → Next.js (static assets)
- Line 72: `location ^~ /styles/` → Express (catalog CSS) ← FIXED
- Line 83: `location /catalog-test` → Express (catalog page)

**CSS Files** (Express public/):
- `styles/v0-compiled.css` (80,168 bytes) — v0 design system
- `styles/v0-theme.css` (14,628 bytes) — ДИПОНИКА theme tokens

**Backup Location**:
- `/root/nginx-backups/prosnab.tech.pre-styles-20251106-124651`

---

## Technical Notes

### Why ^~ Modifier?
```nginx
# Without ^~:
Request /styles/app.css
├─ Check: location ~* \.css$ → MATCH! → :3000 ❌
└─ Never reach: location /styles/

# With ^~:
Request /styles/app.css
├─ Check: location ^~ /styles/ → MATCH! → :9201 ✅
└─ Stop searching (регулярки не проверяются)
```

### Cache Strategy
- **Browser cache**: `Cache-Control: public, max-age=86400` (24 hours)
- **Nginx cache**: `proxy_cache_valid 200 1d` (1 day)
- **CSS rarely changes** → aggressive caching OK
- **Cache busting**: версионирование через `?v=3` в HTML

---

## Rollback Plan

```bash
# If issues occur:
sudo cp /root/nginx-backups/prosnab.tech.pre-styles-20251106-124651 \
   /etc/nginx/sites-enabled/prosnab.tech
sudo nginx -t
sudo systemctl reload nginx
```

---

**Commit**: Pending  
**Related**: 9bd7f32 (nginx: add /catalog-test)  
**Fix Time**: < 5 minutes  
**Impact**: Catalog browser now fully styled ✅
