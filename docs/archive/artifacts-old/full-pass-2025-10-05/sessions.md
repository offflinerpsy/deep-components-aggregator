# Session Configuration Analysis

**Date**: 2025-10-05  
**Component**: Express Session Middleware

## Trust Proxy Configuration ✅

- **Express setting**: `app.set('trust proxy', 1)`
- **Purpose**: Ensure correct IP detection behind CDN/NGINX
- **Session proxy**: `proxy: behindProxy` (true by default)

## Cookie Security ✅

### Secure Cookies
- **Development**: `secure: false` (HTTP allowed)
- **Production**: `secure: 'auto'` (HTTPS enforced when behind proxy)
- **Behind proxy**: Automatic HTTPS detection

### SameSite Configuration
- **Development**: `sameSite: 'lax'` (standard protection)
- **Production + Proxy**: `sameSite: 'none'` (cross-site OAuth redirects)
- **Purpose**: Enable Google/Yandex/VK OAuth behind CDN

### Additional Security
- **HttpOnly**: `true` (prevents XSS)
- **Rolling**: `true` (refresh on each request)
- **Name**: `deep_agg_sid` (custom session name)

## Environment Variables

- `NODE_ENV=production` → strict security
- `BEHIND_PROXY=1` → proxy-aware cookies
- `SESSION_SECRET` → must be set in production
- `SESSION_TTL_MS` → configurable expiry (default 7 days)

## OAuth Compatibility

The configuration supports cross-site redirects required for:
- Google OAuth (`passport-google-oidc`)
- Yandex OAuth (`passport-yandex`)
- VK OAuth (`passport-vkontakte`)

All redirect flows will work correctly behind HTTPS proxy/CDN.

## Store Configuration

- **Type**: SQLite (`connect-sqlite3`)
- **Location**: `var/db/sessions.sqlite`
- **Cleanup**: Automatic expired session removal
- **Concurrent**: `true` (multi-process safe)