# Security Documentation

## Overview
This document describes the security measures, policies, and best practices implemented in the Deep Aggregator authentication system.

---

## Password Security

### Hashing Algorithm
Passwords are hashed using **Argon2id** (the memory-hard, hybrid variant of Argon2), which is the winner of the Password Hashing Competition and the recommended algorithm for password storage.

**Parameters:**
```javascript
{
  type: argon2.argon2id,
  timeCost: 3,          // Number of iterations
  memoryCost: 65536,    // 64 MB memory usage
  parallelism: 4        // Number of threads
}
```

**Rationale:**
- `timeCost: 3` provides ~100ms hashing time on modern CPUs, balancing security and UX
- `memoryCost: 65536 KiB` (64 MB) makes GPU/ASIC attacks prohibitively expensive
- `parallelism: 4` leverages multi-core CPUs while preventing trivial parallelization
- `argon2id` combines resistance to both side-channel and GPU attacks

### Password Requirements
- **Minimum length:** 8 characters
- **No maximum length** (enforced by validation schema)
- **No composition requirements** (research shows length > complexity for UX and security)
- **Password confirmation** required during registration to prevent typos

### Validation
- Client-side: HTML5 `minlength` attribute + JavaScript validation
- Server-side: AJV schema validation with `minLength: 8`
- Passwords are never logged (see PII Policy below)

---

## Session Management

### Storage
Sessions are stored in **SQLite** using `connect-sqlite3`, with the database located at:
```
var/db/sessions.sqlite
```

**Advantages:**
- Persistent across server restarts (unlike MemoryStore)
- Low latency for single-node deployments
- Simple backup/restore (just copy the SQLite file)
- No external dependencies (Redis, Memcached, etc.)

**Schema:**
```sql
CREATE TABLE sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired INTEGER NOT NULL
);
CREATE INDEX idx_sessions_expired ON sessions(expired);
```

### Cookie Security

**Cookie Configuration:**
```javascript
{
  name: 'deepagg.sid',
  secret: process.env.SESSION_SECRET, // 32+ byte random string
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,        // Prevents XSS access to cookie
    secure: NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax',       // CSRF protection while allowing OAuth redirects
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}
```

**Security Properties:**
- `httpOnly: true` — Cookie inaccessible to JavaScript (XSS mitigation)
- `secure: true` (in prod) — Transmitted only over HTTPS (eavesdropping prevention)
- `sameSite: 'lax'` — Blocks most CSRF attacks while allowing OAuth callbacks
- `maxAge: 7 days` — Automatic expiration reduces window for session hijacking

**Session Secret Requirements:**
- **Production:** `SESSION_SECRET` environment variable MUST be set (server refuses to start otherwise)
- **Development:** Defaults to `dev-secret-change-in-production` (with console warning)
- **Recommended:** 32+ byte random string, e.g., `openssl rand -base64 32`

---

## OAuth Security

### Supported Providers
- **Google:** OpenID Connect (OIDC)
- **Yandex:** OAuth 2.0

### Configuration
Both providers require:
1. **Client ID** and **Client Secret** (stored in environment variables)
2. **Callback URLs** registered in provider consoles:
   - Google: `http://5.129.228.88:9201/auth/google/callback`
   - Yandex: `http://5.129.228.88:9201/auth/yandex/callback`
3. **Scopes:**
   - Google: `profile`, `email`
   - Yandex: (default profile scope)

### User Upsert Logic
When a user logs in via OAuth:
1. Check if user exists by `(provider, provider_id)` pair
2. If exists: Update `name` field (in case user changed their display name)
3. If not exists: Create new user with `email`, `name`, `provider`, `provider_id`

**Important:** Local (email+password) users and OAuth users can **coexist** with the same email address, as they are distinguished by the `provider` field. However, OAuth users cannot register a local account with the same email (enforced by unique constraint on `email` for `provider='local'`).

---

## Rate Limiting

### Auth Endpoints
**Scope:** `/auth/register`, `/auth/login`

**Configuration:**
```javascript
{
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // Max 5 attempts per window
  standardHeaders: true,     // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false
}
```

**Behavior:**
- On violation: `429 Too Many Requests` with JSON body `{ error: "Rate limit exceeded. Try again later." }`
- Metric incremented: `rate_limit_hits{route="/auth/*"}`

**Rationale:** Prevents brute-force attacks on login/registration while allowing legitimate users to retry after typos.

### Order Endpoints
**Scope:** `/api/order`, `/api/user/orders`

**Configuration:**
```javascript
{
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // Max 10 requests per window
  standardHeaders: true
}
```

**Rationale:** Prevents order spam and API abuse while supporting normal usage patterns.

---

## PII (Personally Identifiable Information) Policy

### Logging Rules
**NEVER log:**
- Passwords (plaintext or hashed)
- Email addresses
- Phone numbers
- Telegram handles
- Session cookies

**Safe to log:**
- User IDs (UUIDs)
- Part numbers (MPNs)
- Order IDs
- Request metadata (IP, user-agent, timestamp)

### Examples

**❌ BAD:**
```javascript
logger.info({ email: user.email }, 'User logged in');
```

**✅ GOOD:**
```javascript
logger.info({ userId: user.id }, 'User logged in');
```

**❌ BAD:**
```javascript
logger.error({ req: req }, 'Auth failed'); // req contains headers with cookies
```

**✅ GOOD:**
```javascript
logger.error({ userId: req.user?.id, method: req.method, path: req.path }, 'Auth failed');
```

---

## Input Validation

### Strategy
All user input is validated using **AJV** (Another JSON Validator) with strict schemas:
- `additionalProperties: false` — Reject unknown fields (prevents parameter pollution)
- `formats` plugin — Validates email (RFC 5322), phone (E.164), etc.
- Guard clauses — Early returns on validation errors (no `try/catch` per project style)

### Schemas
Located in `schemas/`:
- `auth.register.schema.json` — Registration payload
- `auth.login.schema.json` — Login payload
- `order.schema.json` — Order creation payload (existing)

### Error Handling
Validation errors return `400 Bad Request` with descriptive JSON:
```json
{
  "error": "Validation error",
  "details": [
    {
      "instancePath": "/email",
      "message": "must match format \"email\""
    }
  ]
}
```

---

## Authorization Model

### Ownership-Based Access Control
- **Users can only access their own orders** via `/api/user/orders` and `/api/user/orders/:id`
- Attempting to access another user's order returns `404 Not Found` (not `403 Forbidden`) to avoid info disclosure

### Admin Access
- Admin endpoints (`/api/admin/orders`) are protected by **Nginx Basic Auth** at the proxy level (not implemented in application code)
- Admin access grants full CRUD on all orders

### Authentication Middleware
```javascript
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}
```

Applied to:
- `/api/order` (order creation)
- `/api/user/orders` (list user orders)
- `/api/user/orders/:id` (get single order)

---

## Database Security

### Schema Constraints
- **Foreign keys enabled:** `PRAGMA foreign_keys = ON`
- **Unique constraints:**
  - `users(provider, provider_id)` — Prevents OAuth user duplication
  - `users(email)` WHERE `provider='local'` — Prevents local email reuse
- **Check constraints:**
  - Local users MUST have `password_hash` and `email`
  - OAuth users MUST have `provider_id`

### Password Storage
- Passwords stored in `users.password_hash` (never plaintext)
- Hash format: Argon2id encoded string (e.g., `$argon2id$v=19$m=65536,t=3,p=4$...`)
- Salt included in hash (Argon2 auto-generates per-password salts)

---

## HTTPS & Transport Security

### Current State (Development)
- **HTTP only** (port 9201)
- Cookies sent with `secure: false` in development

### Production Recommendations
1. **Terminate TLS at Nginx reverse proxy:**
   ```nginx
   server {
     listen 443 ssl http2;
     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;
     ssl_protocols TLSv1.2 TLSv1.3;
     
     location / {
       proxy_pass http://127.0.0.1:9201;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```
2. **Set `NODE_ENV=production`** to enable `secure: true` cookies
3. **Enable HSTS header:** `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## WARP Proxy Integration

### Purpose
All outbound HTTP requests (to suppliers, OAuth providers, etc.) can be routed through Cloudflare WARP Proxy to:
- Mask server IP
- Bypass regional blocks
- Add extra layer of privacy

### Configuration
Set `HTTP_PROXY` environment variable:
```bash
HTTP_PROXY=socks5://127.0.0.1:40000
```

### Timeout
All proxied requests have a **10-second timeout** to prevent hanging on slow/dead proxies:
```javascript
const dispatcher = new ProxyAgent({
  uri: process.env.HTTP_PROXY,
  requestTls: { timeout: 10000 }
});
```

### Health Check
`src/net/dispatcher.mjs` exports `checkProxyHealth()` function to diagnose proxy issues.

---

## Incident Response

### Session Revocation
**Scenario:** User account compromised

**Action:**
1. Delete user's sessions from SQLite:
   ```sql
   DELETE FROM sessions WHERE sess LIKE '%"passport":{"user":"<user_id>"}%';
   ```
2. User will be logged out on next request

### Password Reset (Not Yet Implemented)
**TODO:** Add password reset flow:
1. User requests reset via email
2. Generate time-limited token (e.g., JWT with 1-hour expiry)
3. Send reset link via email
4. User sets new password, token invalidated

### Suspicious Activity Detection
**TODO:** Log and alert on:
- Multiple failed login attempts from single IP
- Login from unusual location/device
- High volume of order creation

---

## Compliance Notes

### GDPR (EU)
- Users can request data export (manual via admin interface)
- Users can request account deletion (manual via SQL: `DELETE FROM users WHERE id = ?`)
- Sessions expire automatically after 7 days

### CCPA (California)
- Similar to GDPR: data export and deletion available

**Note:** Automated compliance tools not implemented. Manual processes required.

---

## Security Checklist for Deployment

- [ ] Set strong `SESSION_SECRET` (32+ bytes, random)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (via Nginx reverse proxy)
- [ ] Enable HSTS header
- [ ] Configure OAuth callback URLs in provider consoles
- [ ] Restrict database file permissions: `chmod 600 var/db/*.sqlite`
- [ ] Review logs for PII leakage
- [ ] Set up log rotation (to prevent disk fill)
- [ ] Monitor rate limit violations: `rate_limit_hits` metric
- [ ] Regularly backup session + user databases

---

## Contact

For security issues, contact: **[YOUR EMAIL/SECURITY CONTACT]**

**Do not publicly disclose vulnerabilities.** Use responsible disclosure.

---

Last Updated: 2025-10-02
