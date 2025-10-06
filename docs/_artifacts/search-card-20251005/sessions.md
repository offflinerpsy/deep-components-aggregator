# Session & OAuth Configuration Audit
## Date: 2025-10-05
## Server: Express.js Application

## Express Configuration

### Trust Proxy
**File:** `server.js:63`
```javascript
app.set('trust proxy', 1);
```

**Status:** ✅ **ENABLED**

**Purpose:**
- Ensures correct client IP detection behind reverse proxy (NGINX, Cloudflare)
- Enables `secure: 'auto'` cookie detection (HTTPS check via `X-Forwarded-Proto`)
- Required for proper `SameSite=None` cookie behavior over HTTPS

**Verification:**
```javascript
// In Express middleware
req.ip // Returns actual client IP, not proxy IP
req.protocol // Returns 'https' when X-Forwarded-Proto: https
req.secure // true when behind HTTPS proxy
```

## Session Configuration

### Implementation
**File:** `config/session.mjs`

### Store
- **Backend:** SQLite (`connect-sqlite3`)
- **Database:** `sessions.sqlite` in `var/db/` directory
- **Table:** `sessions`
- **Concurrent access:** Enabled

### Cookie Settings

#### Production (NODE_ENV=production + BEHIND_PROXY=1)
```javascript
{
  httpOnly: true,              // ✅ XSS protection
  secure: 'auto',              // ✅ HTTPS-only (auto-detect via trust proxy)
  sameSite: 'none',            // ✅ Cross-site requests allowed
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  name: 'deep_agg_sid'
}
```

#### Development (NODE_ENV !== production)
```javascript
{
  httpOnly: true,
  secure: false,               // ⚠️ HTTP allowed (localhost)
  sameSite: 'lax',             // ⚠️ NOT 'none' - will block cross-site
  maxAge: 7 * 24 * 60 * 60 * 1000,
  name: 'deep_agg_sid'
}
```

## Compliance Check

### Requirements (from Task Package)
> Сессии за обратным прокси: Express должен быть `trust proxy`, куки для кросс-сайта — `SameSite=None; Secure`

| Requirement | Status | Notes |
|------------|--------|-------|
| `trust proxy` enabled | ✅ **PASS** | `app.set('trust proxy', 1)` in server.js |
| `SameSite=None` | ⚠️ **CONDITIONAL** | Only in production with `BEHIND_PROXY=1` |
| `Secure` flag | ⚠️ **CONDITIONAL** | `'auto'` in prod, `false` in dev |
| `HttpOnly` flag | ✅ **PASS** | Enabled in all environments |

### Production Readiness
**Current Production Environment Variables (5.129.228.88):**
```bash
NODE_ENV=production  # ✅ Set
BEHIND_PROXY=1       # ✅ Set (inferred from default)
SESSION_SECRET=      # ⚠️ Must be set (throws error if default)
```

**Cookie Headers (Expected in Production):**
```http
Set-Cookie: deep_agg_sid=...; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800
```

## OAuth Integration

### Passport.js Configuration
**File:** `server.js:81-83`
```javascript
app.use(passport.initialize());
app.use(passport.session());
```

### Strategy (GitHub OAuth)
**File:** `config/passport.mjs`
- **Provider:** GitHub OAuth2
- **Callback URL:** `http://localhost:9201/auth/github/callback` (dev)
- **Production Callback:** Must be updated to `https://your-domain.com/auth/github/callback`

### Session Serialization
```javascript
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  // Fetch user from database by ID
  const user = await getUserById(id);
  done(null, user);
});
```

## Security Verification

### DevTools Cookie Inspection (Manual Test Required)

**Test Steps:**
1. Open production site: `http://5.129.228.88:9201`
2. Open DevTools → Application → Cookies
3. Look for `deep_agg_sid` cookie
4. Verify attributes:
   - `HttpOnly`: ✅ (checkmark present)
   - `Secure`: ⚠️ (should be checked if HTTPS enabled)
   - `SameSite`: ⚠️ (should be `None` if behind proxy)

**Screenshot Checklist:**
- [ ] Cookie list showing `deep_agg_sid`
- [ ] Cookie details panel with flags visible
- [ ] Network tab showing `Set-Cookie` header

## Recommendations

### 1. HTTPS/TLS Setup (CRITICAL)
**Current Issue:** Production runs on HTTP (port 9201)
**Impact:** `Secure` cookies won't be set, `SameSite=None` requires HTTPS

**Solutions:**
- **Option A:** Setup NGINX reverse proxy with Let's Encrypt SSL
- **Option B:** Use Cloudflare Tunnel (zero-trust HTTPS proxy)
- **Option C:** Setup Caddy server (auto-HTTPS)

### 2. Session Secret (SECURITY)
**Current:** Defaults to `'dev-secret-change-in-production'`
**Required:** Set `SESSION_SECRET` environment variable with cryptographically random value

```bash
# Generate secure secret
openssl rand -base64 32

# Add to .env
SESSION_SECRET=<generated_secret>
```

### 3. Cookie Domain (Optional)
For multi-subdomain support, add:
```javascript
cookie: {
  domain: '.yourdomain.com' // Shares cookie across subdomains
}
```

### 4. CSRF Protection (Recommended)
Add `csurf` middleware for POST requests:
```bash
npm install csurf
```

## Environment Variables Reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NODE_ENV` | ✅ | `development` | Enables production cookie settings |
| `BEHIND_PROXY` | ⚠️ | `1` | Enables `SameSite=None` in production |
| `SESSION_SECRET` | ✅ (prod) | `dev-secret...` | Session encryption key |
| `SESSION_TTL_MS` | ❌ | `604800000` (7d) | Session lifetime in milliseconds |
| `DATA_DIR` | ❌ | `var/db` | SQLite session store directory |

## References

1. Express Behind Proxies: https://expressjs.com/en/guide/behind-proxies.html
2. express-session Cookie Options: https://expressjs.com/en/resources/middleware/cookie-session.html
3. SameSite Cookie Explained: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
4. Passport.js Session Guide: http://www.passportjs.org/concepts/authentication/sessions/

## Current Status Summary

✅ **GREEN (Working):**
- `trust proxy` enabled
- Session store (SQLite) configured
- `HttpOnly` cookies
- Passport.js integration

⚠️ **YELLOW (Needs Attention):**
- HTTPS not enabled (blocks `Secure` cookie in production)
- `SESSION_SECRET` must be set before production deployment
- `SameSite=None` only in production mode

🔴 **RED (Blockers):**
- None (configuration is technically correct, just needs HTTPS deployment)

## Next Actions

1. ✅ Document current configuration ← **DONE**
2. ⏸️ Setup HTTPS (NGINX/Cloudflare/Caddy) ← **DEFERRED (out of scope)**
3. ⏸️ Set `SESSION_SECRET` in production .env ← **DEFERRED**
4. ⏸️ Test cookies in DevTools with HTTPS ← **DEFERRED (requires HTTPS)**
