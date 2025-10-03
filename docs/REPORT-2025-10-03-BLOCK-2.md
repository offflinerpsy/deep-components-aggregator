# Block 2 Report: Sessions Behind Proxy/HTTPS

**Date:** October 3, 2025  
**Branch:** `stabilize/video-warp-auth-admin-card`  
**Status:** ✅ Implementation Complete

---

## Objective

Ensure secure session cookies work correctly behind reverse proxy (NGINX/CDN) with HTTPS:
- Cookies marked `Secure` (HTTPS-only)
- `SameSite=None` for cross-origin scenarios
- Express trusts `X-Forwarded-*` headers
- Login sessions persist correctly

---

## Implementation

### 1. Trust Proxy Configuration

**File:** `server.js`

```javascript
const app = express();

// Trust proxy to ensure correct secure cookies and IP handling behind CDN/NGINX
app.set('trust proxy', 1);
```

**Effect:**
- Express reads `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-For` headers
- `req.protocol` correctly reflects HTTPS when behind proxy
- `req.secure` is `true` when `X-Forwarded-Proto: https`
- `req.ip` shows real client IP (not proxy IP)

**Reference:** [Express Behind Proxies](https://expressjs.com/en/guide/behind-proxies.html)

---

### 2. Session Cookie Configuration

**File:** `config/session.mjs`

```javascript
const isProd = process.env.NODE_ENV === 'production';
const behindProxy = String(process.env.BEHIND_PROXY || '1') === '1';

const SESSION_CONFIG = {
  // ... store config ...
  
  cookie: {
    // HttpOnly - prevents XSS attacks
    httpOnly: true,
    
    // Secure - HTTPS only in production
    secure: isProd ? true : false,
    
    // SameSite - allow cross-site when behind proxy/CDN with HTTPS
    sameSite: isProd && behindProxy ? 'none' : 'lax',
    
    // Max age - 7 days
    maxAge: 7 * 24 * 60 * 60 * 1000
  },
  
  // Trust proxy setups
  proxy: behindProxy
};
```

**Logic:**

| Environment | `secure` | `sameSite` | `proxy` |
|-------------|----------|------------|---------|
| Dev (local) | `false` | `'lax'` | `true` (default) |
| Prod (behind proxy) | `true` | `'none'` | `true` |
| Prod (direct) | `true` | `'lax'` | `false` |

**Default:** `BEHIND_PROXY=1` (assumes production deployment behind reverse proxy)

---

### 3. Environment Variables

**Required in production `.env`:**

```bash
# Session
NODE_ENV=production
SESSION_SECRET=<random-64-char-hex>
SESSION_TTL_MS=604800000  # 7 days (optional)

# Proxy settings
BEHIND_PROXY=1  # Default is 1 (behind NGINX/CDN)
# Set BEHIND_PROXY=0 only if running directly exposed to internet
```

**Generate secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Security Features

### HttpOnly Cookie
- **Enabled:** `httpOnly: true`
- **Effect:** Cookie inaccessible to JavaScript (`document.cookie`)
- **Protection:** Mitigates XSS attacks

### Secure Cookie
- **Enabled:** `secure: true` (production only)
- **Effect:** Cookie only sent over HTTPS
- **Protection:** Prevents session hijacking over insecure connections

### SameSite=None
- **When:** Production + behind proxy
- **Why:** Allows cookie to be sent in cross-origin requests (e.g., API calls from frontend on different domain)
- **Requirement:** Must be paired with `Secure` flag

**Note:** `SameSite=None` requires HTTPS. In development (HTTP), uses `SameSite=Lax` instead.

### Rolling Sessions
- **Enabled:** `rolling: true`
- **Effect:** Session TTL refreshes on each request
- **Benefit:** Active users stay logged in; inactive sessions expire

---

## Testing

### Development Environment

**Setup:**
```bash
# Local development (no HTTPS)
NODE_ENV=development
# Cookies: secure=false, sameSite=lax
```

**Test:**
1. Register/login at `http://localhost:9201/auth/register`
2. Check cookie in DevTools → Application → Cookies
3. Verify:
   - `deep_agg_sid` cookie present
   - `HttpOnly` ✅
   - `Secure` ❌ (HTTP only in dev)
   - `SameSite` = `Lax`

4. Navigate to protected route (e.g., `/ui/admin-orders.html`)
5. Session should persist across page reloads

---

### Production Environment (Behind NGINX/CDN)

**NGINX config** (ensure these headers are forwarded):
```nginx
location / {
    proxy_pass http://localhost:9201;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header Host $host;
}
```

**Environment:**
```bash
NODE_ENV=production
SESSION_SECRET=<64-char-hex>
BEHIND_PROXY=1
```

**Test:**
1. Access via HTTPS: `https://your-domain.com/auth/login`
2. Login with valid credentials
3. Check cookie in DevTools:
   - `deep_agg_sid` cookie present
   - `HttpOnly` ✅
   - `Secure` ✅
   - `SameSite` = `None`

4. Navigate to different page
5. Session should persist

6. Close browser and reopen within 7 days
7. Session should still be valid (rolling expiration)

**Common issues:**

❌ **Session drops on navigation:**
- Check NGINX forwards `X-Forwarded-Proto: https`
- Verify `NODE_ENV=production`
- Confirm `BEHIND_PROXY=1`

❌ **Cookie not set:**
- Check browser console for `SameSite=None` without `Secure` error
- Must use HTTPS in production

❌ **Session expires immediately:**
- Verify `SESSION_SECRET` is set and consistent across restarts
- Check session store (`var/db/sessions.sqlite`) is writable

---

## Debugging

### Check Session Store

```bash
# List active sessions
sqlite3 var/db/sessions.sqlite "SELECT sess FROM sessions LIMIT 10;"

# Count sessions
sqlite3 var/db/sessions.sqlite "SELECT COUNT(*) FROM sessions;"

# Check expiry
sqlite3 var/db/sessions.sqlite "SELECT sess, expired FROM sessions WHERE expired > strftime('%s', 'now');"
```

### API Health Check

**Endpoint:** `GET /api/health` (add session info)

```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    session: {
      configured: !!req.session,
      id: req.sessionID,
      authenticated: !!req.user,
      trustProxy: app.get('trust proxy'),
      secure: req.secure,
      protocol: req.protocol
    }
  });
});
```

**Test:**
```bash
curl https://your-domain.com/api/health
```

**Expected (before login):**
```json
{
  "status": "ok",
  "session": {
    "configured": true,
    "id": "abc123...",
    "authenticated": false,
    "trustProxy": 1,
    "secure": true,
    "protocol": "https"
  }
}
```

---

## Acceptance Criteria

- [x] **Trust proxy:** `app.set('trust proxy', 1)` enabled
- [x] **Secure cookies:** `cookie.secure: true` in production
- [x] **SameSite=None:** When behind proxy in production
- [x] **HttpOnly:** Always enabled
- [x] **Rolling sessions:** Enabled
- [x] **Proxy flag:** `session.proxy` set when `BEHIND_PROXY=1`
- [ ] **Manual test:** Login persists across pages (pending HTTPS deployment)
- [ ] **Manual test:** Cookie marked Secure in production (pending HTTPS deployment)

---

## Files Changed

### Modified
- `server.js` — Added `app.set('trust proxy', 1)` (already done in previous commits)
- `config/session.mjs` — Configured `secure`, `sameSite`, and `proxy` based on environment

### Documentation
- `docs/REPORT-2025-10-03-BLOCK-2.md` — This report

---

## Next Steps

1. **Deploy to production** with HTTPS enabled
2. **Verify cookie settings** in browser DevTools
3. **Test login flow** and session persistence
4. **Monitor session store** for any issues
5. **Update health check** (optional) to expose session info

---

## References

- [Express trust proxy](https://expressjs.com/en/guide/behind-proxies.html)
- [express-session options](https://github.com/expressjs/session#options)
- [MDN: SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

**Status:** Code complete and ready for production deployment.  
**Next Block:** Block 3 — OAuth providers (Google/Yandex/VK)
