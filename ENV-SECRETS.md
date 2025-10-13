# Environment Variables & Secrets

**Last Updated**: 2025-10-13  
**Security Level**: 🔴 CRITICAL

---

## ⚠️ SECURITY RULES

1. **.env** файл **НИКОГДА НЕ КОММИТИТЬ** в git!
2. Секреты передавать через безопасные каналы (encrypted vault, 1Password, etc.)
3. Production `.env` хранится **только на сервере** `/opt/deep-agg/.env`
4. Локальная разработка — копировать из `.env.example`

---

## Location

### Production Server
```bash
/opt/deep-agg/.env
```

### Local Development
```bash
cp .env.example .env
nano .env  # Заполнить свои ключи
```

---

## Required Variables

### DigiKey API (OAuth2)
```bash
DIGIKEY_CLIENT_ID=your_client_id_here
DIGIKEY_CLIENT_SECRET=your_secret_here
DIGIKEY_REDIRECT_URI=https://localhost:9201/callback
```

**Get Keys**: https://developer.digikey.com/  
**Docs**: https://developer.digikey.com/documentation

### Mouser API
```bash
MOUSER_API_KEY=your_mouser_key_here
```

**Get Key**: https://www.mouser.com/api-hub/  
**Rate Limit**: 1000 req/day (free tier)

### OEMstrade API
```bash
OEMSTRADE_API_KEY=your_oemstrade_key
```

**Purpose**: Цены и наличие по регионам  
**Endpoint**: https://api.oemstrade.com/v1/

### Proxy (WARP)
```bash
HTTP_PROXY=http://127.0.0.1:40000
HTTPS_PROXY=http://127.0.0.1:40000
NO_PROXY=127.0.0.1,localhost
```

**Service**: Cloudflare WARP socks5 proxy  
**Port**: 40000  
**Check**: `curl --proxy socks5://127.0.0.1:40000 https://ifconfig.me`

### Database
```bash
DB_PATH=./var/db/deepagg.sqlite
```

### Server Ports
```bash
BACKEND_PORT=9201
FRONTEND_PORT=3001
```

---

## Optional Variables

### Logging
```bash
LOG_LEVEL=info          # debug | info | warn | error
LOG_FILE=./logs/app.log
```

### Caching
```bash
CACHE_TTL_SEARCH=604800    # 7 дней (секунды)
CACHE_TTL_PRODUCT=2592000  # 30 дней
```

### Rate Limiting
```bash
RATE_LIMIT_WINDOW=60000    # 1 минута (ms)
RATE_LIMIT_MAX_REQUESTS=100
```

---

## .env.example Template

```bash
# DigiKey API
DIGIKEY_CLIENT_ID=
DIGIKEY_CLIENT_SECRET=
DIGIKEY_REDIRECT_URI=https://localhost:9201/callback

# Mouser API
MOUSER_API_KEY=

# OEMstrade API
OEMSTRADE_API_KEY=

# Proxy (WARP)
HTTP_PROXY=http://127.0.0.1:40000
HTTPS_PROXY=http://127.0.0.1:40000
NO_PROXY=127.0.0.1,localhost

# Database
DB_PATH=./var/db/deepagg.sqlite

# Server
BACKEND_PORT=9201
FRONTEND_PORT=3001
NODE_ENV=production

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Cache TTL (seconds)
CACHE_TTL_SEARCH=604800
CACHE_TTL_PRODUCT=2592000
```

---

## Verification

### Check env is loaded
```bash
cd /opt/deep-agg
node -e "require('dotenv').config(); console.log(process.env.DIGIKEY_CLIENT_ID ? '✅ DigiKey OK' : '❌ DigiKey missing')"
```

### Test proxy
```bash
curl --proxy socks5://127.0.0.1:40000 https://api.digikey.com/ping
```

---

## Secrets Rotation

### When to rotate
- API key compromised
- Developer offboarding
- Quarterly security audit

### How to rotate
1. Generate new key in provider dashboard
2. Update `.env` on production server
3. `pm2 restart all`
4. Verify new key works
5. Revoke old key in provider dashboard

---

**IMPORTANT**: Never share `.env` file publicly or commit to git!
