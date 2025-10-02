# Changelog

All notable changes to Deep Aggregator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.2.0] - 2025-10-02

### Added - Authentication & User Features

#### Authentication System
- **User Registration & Login** — Email+password authentication with Argon2id hashing
  - POST `/auth/register` — Create new user account (min 8-char password, email validation)
  - POST `/auth/login` — Authenticate with email/password
  - POST `/auth/logout` — Destroy session
  - GET `/auth/me` — Get current user info
  - Password hashing: Argon2id (timeCost: 3, memoryCost: 64MB, parallelism: 4) for ~100ms hashing time

- **OAuth Integration** — Social login support with automatic account creation
  - **Google OAuth** — Via OpenID Connect (OIDC)
  - **Yandex OAuth** — Via OAuth 2.0
  - Redirect flows: `/auth/google`, `/auth/yandex` → callbacks → redirect to `/ui/my-orders.html`
  - User upsert logic: Create if new, update name if existing
  - Environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`

- **Session Management** — Persistent sessions with SQLite store
  - `express-session` + `connect-sqlite3` store at `var/db/sessions.sqlite`
  - Cookie settings: `HttpOnly`, `Secure` (in production), `SameSite=Lax`, 7-day expiry
  - Session secret: `SESSION_SECRET` env var (required in production)
  - Serialize/deserialize via Passport.js

- **Security Features**
  - Rate limiting: 5 attempts per 15 minutes for `/auth/register` and `/auth/login`
  - PII-safe logging: Only user IDs logged, never emails/passwords/phone numbers
  - AJV validation: Strict schemas (`additionalProperties: false`) for register/login
  - Guard-clause error handling (no try/catch per project style)

#### User Order Management
- **Personal Order Cabinet** — Authenticated users can view their orders
  - GET `/api/user/orders` — Paginated list with filters (status, pagination)
  - GET `/api/user/orders/:id` — Detailed order view (ownership check, returns 404 if not owned)
  - Order creation now requires authentication: `/api/order` returns 401 if not logged in
  - `orders` table updated with `user_id` foreign key referencing `users(id)`

#### Database Changes
- **New Tables**
  - `users` table: id, email, password_hash, provider (local/google/yandex), provider_id, name, created_at
  - `sessions` table: sid, sess (JSON), expired (INDEX)
  - Unique constraints: `(provider, provider_id)` for OAuth users, `email` for local users
  - CHECK constraint: Local users must have email+password_hash, OAuth users must have provider_id

- **Schema Updates**
  - `orders` table: Added `user_id` column with foreign key constraint
  - Migration: `db/migrations/2025-10-02_auth.sql`

#### UI/UX Features
- **Authentication Pages**
  - `/ui/auth.html` — Combined login/register form with tab switcher
  - OAuth buttons for Google and Yandex with SVG icons
  - Dark theme UI matching project palette (CSS in `/ui/auth.css`)
  - Client-side validation + server feedback with error messages
  - Auto-redirect to `/ui/my-orders.html` on successful login/register

- **My Orders Dashboard**
  - `/ui/my-orders.html` — User order history with table view
  - Filters: Status dropdown, pagination controls (10/25/50/100 per page)
  - Order details modal (click order ID to view full details)
  - Empty state with friendly message
  - Logout button in header

- **Updated Index Page**
  - Dynamic auth navigation: Shows "Login/Register" if not logged in, "My Orders/Logout" if logged in
  - `/auth/me` check on page load to update nav links

#### Network Layer
- **WARP Proxy Mode** — Optional routing through Cloudflare WARP
  - `src/net/dispatcher.mjs` — undici ProxyAgent with `HTTP_PROXY` env var support
  - 10-second timeout per request to prevent hanging
  - `proxyFetch()` wrapper for proxy-aware fetch calls
  - `checkProxyHealth()` diagnostic function
  - Usage: Set `HTTP_PROXY=socks5://127.0.0.1:40000` in environment

#### Integrations
- **OEMsTrade Added** — New dealer link for orders
  - Format: `https://www.oemstrade.com/search/${mpn}`
  - Added to `generateDealerLinks()` in `api/order.js`

#### Documentation
- **New Docs**
  - `docs/SECURITY.md` — Comprehensive security guide (Argon2id params, cookie security, rate limits, PII policy, WARP setup, incident response)
  - `docs/API.md` — Updated with auth endpoints, user endpoints, OAuth flows
  - `docs/OPERATIONS.md` — Added OAuth setup instructions (Google/Yandex), WARP Proxy installation, session secret generation

- **Updated Docs**
  - `README.md` — Added auth features to overview, setup instructions for migrations and env vars
  - `CHANGELOG.md` — This entry

#### Dependencies
- **New Packages**
  - `passport` (v0.7.0) — Authentication middleware
  - `passport-local` (v1.0.0) — Email/password strategy
  - `passport-google-oidc` (v0.1.0) — Google OAuth strategy
  - `passport-yandex` (v0.0.5) — Yandex OAuth strategy
  - `argon2` (v0.31.2) — Password hashing (Argon2id)
  - `express-session` (v1.18.1) — Session middleware
  - `connect-sqlite3` (v0.9.13) — SQLite session store
  - `ajv` (v8.12.0) + `ajv-formats` (v2.1.1) — JSON schema validation (already in project)
  - `undici` (v6.x) — ProxyAgent for WARP Proxy Mode

#### Configuration
- **Environment Variables (New)**
  - `SESSION_SECRET` — Required in production for cookie signing
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
  - `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` — Yandex OAuth credentials
  - `HTTP_PROXY` — Optional SOCKS5 proxy URL for WARP Mode (e.g., `socks5://127.0.0.1:40000`)
  - `NODE_ENV` — Set to `production` to enable `secure` cookies

### Changed
- **Order Creation** — Now requires authentication (401 if not logged in)
- **Rate Limiting** — Auth endpoints have separate 15-min/5-attempt limit (vs. 1-min/10-attempt for orders)

### Security
- **Argon2id** — Industry-standard password hashing with tuned parameters
- **HttpOnly Cookies** — Session cookies inaccessible to JavaScript (XSS mitigation)
- **SameSite=Lax** — CSRF protection while allowing OAuth redirects
- **Rate Limiting** — Protects auth endpoints from brute-force attacks
- **PII Logging Policy** — No passwords, emails, or phone numbers in logs (only user IDs)
- **Foreign Key Constraints** — Enforced referential integrity between orders and users

---

## [3.1.0] - 2025-10-02

### Added - Orders Backend MVP

#### Core Features
- **Orders API** — New endpoint `POST /api/order` for creating customer orders
  - AJV JSON Schema validation with strict `additionalProperties: false`
  - Automatic dealer links generation (Mouser, DigiKey, TME, Farnell)
  - Dynamic pricing calculation from `settings.pricing_policy` if not provided
  - Transaction-safe SQLite insert with UUID order IDs
  - No try/catch blocks — guard-clause pattern throughout

- **Admin API** — Three protected endpoints for order management:
  - `GET /api/admin/orders` — Paginated list with filters (status, search, date range)
  - `GET /api/admin/orders/:id` — Full order details with customer contact and dealer links
  - `PATCH /api/admin/orders/:id` — Update order status with validation

- **Database Schema** — New SQLite tables:
  - `orders` table with fields: id, customer_name, customer_contact (JSON), mpn, manufacturer, qty, pricing_snapshot (JSON), dealer_links (JSON), status, meta (JSON)
  - `settings` table for global configuration (pricing_policy)
  - Indexes on `created_at`, `status`, and `mpn` for efficient queries
  - Migration script: `db/migrations/2025-10-02_orders.sql`

#### Validation & Security
- **JSON Schema** — Two schemas with comprehensive validation:
  - `schemas/order.request.schema.json` — Validates customer, item, pricing_snapshot, meta
  - `schemas/order.update.schema.json` — Validates status enum
  - Email format (RFC 5322), phone format (E.164), Telegram username (@handle)
  - At least one contact method required (email, phone, or telegram)
  - String length limits, integer ranges, no additional properties allowed

- **Rate Limiting** — Express middleware with configurable limits:
  - POST /api/order: 10 requests/minute per IP (default)
  - General API: 100 requests/minute per IP
  - Whitelist support for trusted IPs
  - Returns 429 with retry_after seconds on limit exceeded
  - File: `middleware/rateLimiter.js`

- **Nginx Basic Auth** — Admin endpoints protected at proxy level:
  - No application-level auth complexity
  - `.htpasswd` file with bcrypt-hashed passwords
  - Configuration snippet in `docs/OPERATIONS.md`
  - Unauthorized requests return 401 before reaching Node.js

#### Metrics & Observability
- **Prometheus Metrics** — New metrics registry (`metrics/registry.js`):
  - `orders_total{status="accepted|rejected"}` — Counter of order requests
  - `orders_by_status{status="new|in_progress|done|cancelled"}` — Gauge of current orders
  - `order_create_duration_seconds` — Histogram of order creation time
  - `rate_limit_hits_total{endpoint}` — Counter of rate limit violations
  - Additional metrics: http_requests_total, http_request_duration_seconds, api_calls_total, cache_operations_total

- **Endpoint** — `GET /api/metrics` returns Prometheus text format:
  - Content-Type: `text/plain; charset=utf-8`
  - Default labels: app=deep-aggregator, version=3.0.0
  - Scrape-ready for Prometheus server

#### Documentation
- **API Documentation** (`docs/API.md`) — Complete reference:
  - Request/response examples for all endpoints
  - Validation error formats and common codes
  - cURL and JavaScript Fetch examples
  - Error code table (validation_error, rate_limit, not_found, etc.)

- **Operations Guide** (`docs/OPERATIONS.md`) — Step-by-step procedures:
  - Database migration instructions
  - Nginx Basic Auth setup (htpasswd creation)
  - Prometheus scrape configuration
  - Rate limiting tuning
  - Backup and recovery procedures
  - Troubleshooting commands

- **Roadmap** (`ROADMAP-2025Q4.md`) — Q4 2025 planning:
  - Orders Backend MVP (✅ DONE)
  - Orders Frontend (🔄 IN PROGRESS)
  - Admin Dashboard, Notifications, Payment Integration (📅 PLANNED)

- **Test Specification** (`tests/orders.spec.md`) — Acceptance test scenarios:
  - 20+ manual test cases
  - Valid/invalid order creation
  - Rate limiting behavior
  - Admin authentication and operations
  - Metrics validation

### Changed
- **package.json** — New dependencies:
  - `ajv@^8.12.0` — JSON Schema validator
  - `ajv-formats@^2.1.1` — Email, URI, date-time formats
  - `express-rate-limit@^7.1.0` — IP-based rate limiting
  - `prom-client@^15.0.0` — Prometheus metrics client
  - `pino@^8.16.0` — Fast JSON logger (recommended, not yet integrated)

- **Environment Variables** — New optional configuration:
  ```bash
  ORDER_RATE_LIMIT_WINDOW_MS=60000  # Default: 1 minute
  ORDER_RATE_LIMIT_MAX=10           # Default: 10 requests
  API_RATE_LIMIT_WINDOW_MS=60000
  API_RATE_LIMIT_MAX=100
  RATE_LIMIT_WHITELIST=127.0.0.1,::1  # Comma-separated IPs
  ```

### Technical Details
- **No Try/Catch Policy** — All error handling via guard clauses:
  ```javascript
  // ❌ Avoid:
  try {
    const result = await someOperation();
  } catch (error) {
    return res.status(500).json({ error });
  }
  
  // ✅ Prefer:
  const result = await someOperation();
  if (!result) {
    return res.status(404).json({ error: 'not_found' });
  }
  ```

- **Transaction Safety** — SQLite operations wrapped in transactions:
  ```javascript
  const insertTransaction = db.transaction(() => {
    insertStmt.run(...params);
  });
  insertTransaction(); // Atomic commit
  ```

- **PII Logging** — Customer data excluded from logs:
  - ✅ Logged: orderId, requestId, mpn, manufacturer, qty, durationMs
  - ❌ Never logged: customer_name, email, phone, telegram, comment

### Migration Guide
1. **Install new dependencies:**
   ```bash
   npm install
   ```

2. **Run database migration:**
   ```bash
   sqlite3 cache.json < db/migrations/2025-10-02_orders.sql
   ```

3. **Update Nginx configuration** (if using reverse proxy):
   - Add Basic Auth for `/api/admin/*`
   - See `docs/OPERATIONS.md` for full snippet

4. **Configure Prometheus scraping** (optional):
   - Add job to `prometheus.yml`
   - Target: `your-server:9201/api/metrics`

5. **Restart server:**
   ```bash
   pkill -f 'node.*server.js'
   nohup node server.js > logs/out.log 2> logs/err.log &
   ```

### Breaking Changes
None. All new endpoints are additive.

---

## [3.0.0] - 2025-01-29

### Fixed
- **TME API Integration** — Critical bug fixes:
  - Response structure: API returns `{ Data: { ProductList } }` not `{ data: { ProductList } }` (capital D)
  - Exact match logic: Search by `OriginalSymbol` field to avoid dev boards in results
  - HMAC signature: OAuth-style format `POST&encoded_url&encoded_params` (not newline-separated)
  - Proxy support: Added `DIGIKEY_OUTBOUND_PROXY` check for WARP proxy

- **Farnell API Integration** — Response parsing fix:
  - API returns `{ premierFarnellPartNumberReturn: { products: [...] } }`
  - Added correct wrapper extraction
  - Proxy support: Uses same `DIGIKEY_OUTBOUND_PROXY` as DigiKey

### Added
- **Technical Audit** — Comprehensive project documentation:
  - 1500+ line technical audit (`TECHNICAL-AUDIT-2025.md`)
  - Complete API architecture breakdown
  - All 4 data sources documented (Mouser, DigiKey, TME, Farnell)
  - Deployment procedures and troubleshooting guide

### Removed
- **Web Scraping** — Per strict user requirement:
  - Removed `scrapeMouserProduct()` fallback
  - Mouser API returns 24+ specs — scraping not needed
  - All data now from official APIs only

---

## [2.0.0] - 2024-12-15

### Added
- **DigiKey Integration** — OAuth2 + Product Information API v4
- **Product Merging** — Combines data from multiple sources
- **SQLite Caching** — 30-day TTL for product data, 7-day for search

### Changed
- **Frontend Redesign** — New dark/light theme toggle
- **Search Algorithm** — Fallback: Mouser → DigiKey → TME → Farnell

---

## [1.0.0] - 2024-11-01

### Added
- Initial release with Mouser and TME integration
- Basic product search and display
- Express.js backend + vanilla JS frontend

---

**Repository:** https://github.com/offflinerpsy/deep-components-aggregator  
**Maintained by:** Backend Team
