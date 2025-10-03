# Video Requirements — October 3, 2025

**Source:** Project requirements video  
**Status:** Structured requirements extracted from video transcript  
**Branch:** `stabilize/video-warp-auth-admin-card`

---

## Extraction Metadata

- **Transcript:** `docs/_artifacts/video/transcript.txt`
- **Raw requirements:** `docs/_artifacts/video/requirements.txt`
- **Processing script:** `scripts/video_ingest.sh`

---

## Core Requirements (Master Jobchain v2)

### 0. Video Ingestion ✅
- [x] Extract audio from video (ffmpeg)
- [x] Transcribe to text (Whisper/STT)
- [x] Extract TODO items via keyword grep
- [x] Structured document (this file)
- [x] Commit artifacts

**Acceptance:** Transcript exists, requirements parsed, documented.

---

### 1. WARP/Proxy — Default & Permanent

**Objective:** Route all backend HTTP(S) through Cloudflare WARP proxy (port 40000).

#### 1.1 Installation & Configuration
- [ ] Install `cloudflare-warp` on server
- [ ] Configure proxy mode: `warp-cli set-mode proxy`
- [ ] Set port: `warp-cli set-proxy-port 40000`
- [ ] Enable service: `systemctl enable --now warp-svc`
- [ ] Connect: `warp-cli connect`
- [ ] Verify: `warp-cli status` → Connected
- [ ] Test trace: `curl --socks5 127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace/` → `warp=on`

**Docs:** [Cloudflare WARP Modes](https://developers.cloudflare.com/warp-client/)

#### 1.2 Global Proxy Integration
- [x] Create `src/bootstrap/proxy.mjs` (already done in previous commit)
- [x] Set Undici `ProxyAgent` globally (default: `http://127.0.0.1:40000`)
- [x] Allow disable via `NO_PROXY=1` env var
- [ ] Verify all outbound requests use proxy

**Docs:** [Undici ProxyAgent](https://undici.nodejs.org/#/docs/api/ProxyAgent)

#### 1.3 Timeouts & Retries
- [ ] All provider calls: `AbortSignal.timeout(8000)` (< 10s WARP limit)
- [ ] Exponential backoff retries: 2–3 attempts
- [ ] Update `src/utils/fetchWithRetry.mjs` if needed

**Constraint:** WARP proxy terminates requests > 10s in proxy mode.

#### 1.4 Provider Smoke Check
- [x] Script: `scripts/check-providers.mjs` (already created)
- [x] NPM script: `providers:check`
- [ ] Run on server with WARP active
- [ ] Verify DigiKey: **not** 403 (with proxy) vs 403 (without)
- [ ] Save artifact: `docs/_artifacts/providers-<timestamp>.json`

**Acceptance:**
- ✅ `warp-cli status` → Connected
- ✅ `cdn-cgi/trace` → `warp=on`
- ✅ All Node HTTP via ProxyAgent
- ✅ `providers:check` green (DigiKey responds, not 403)

**Commit:** `[WARP] proxy-mode + undici ProxyAgent + providers smoke`

---

### 2. Sessions/Cookies Behind Proxy/HTTPS

**Objective:** Secure session cookies work correctly behind CDN/reverse proxy.

#### Tasks
- [x] Enable trust proxy: `app.set('trust proxy', 1)` (done)
- [x] Session config: `cookie.secure: true` in production (done)
- [x] Session config: `cookie.sameSite: 'none'` when behind proxy (done)
- [x] Session config: `proxy: true` (done)
- [ ] Test: Login persists after page reload behind HTTPS/CDN
- [ ] Verify: Cookies marked `Secure` and `SameSite=None`

**Docs:** [Express trust proxy](https://expressjs.com/en/guide/behind-proxies.html)

**Acceptance:**
- ✅ Login doesn't "drop" behind HTTPS/CDN
- ✅ Cookies marked `Secure`
- ✅ `SameSite=None` works correctly

**Commit:** `[AUTH] sessions behind proxy`

---

### 3. Authentication: Email + Google + Yandex + VK

**Objective:** 4 authentication methods, stable sessions, no missing dependencies.

#### 3.1 Email/Password
- [ ] Argon2 password hashing (no custom crypto)
- [ ] Routes: `/auth/register`, `/auth/login`, `/auth/logout`
- [ ] Sessions configured (see Block 2)

#### 3.2 Google (OIDC)
- [ ] Install: `passport-google-oidc`
- [ ] Configure: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, callback URL
- [ ] Routes: `/auth/google`, `/auth/google/callback`

**Docs:** [Passport Google OIDC](http://www.passportjs.org/packages/passport-google-oidc/)

#### 3.3 Yandex
- [ ] Install: `passport-yandex`
- [ ] Configure: `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`
- [ ] Routes: `/auth/yandex`, `/auth/yandex/callback`

**Docs:** [Passport Yandex](http://www.passportjs.org/packages/passport-yandex/)

#### 3.4 VK
- [x] Install: `passport-vkontakte` (already in dependencies)
- [ ] Configure: `VK_APP_ID`, `VK_APP_SECRET`
- [ ] Routes: `/auth/vk`, `/auth/vk/callback`

**Docs:** [Passport VKontakte](http://www.passportjs.org/packages/passport-vkontakte/)

**Acceptance:**
- ✅ All 4 auth methods work (email, Google, Yandex, VK)
- ✅ Sessions persist behind proxy/HTTPS
- ✅ No `ERR_MODULE_NOT_FOUND` errors

**Commit:** `[AUTH] google+yandex+vk wired`

---

### 4. Admin & User Orders UI/API

**Objective:** Admin dashboard + user "My Orders" panel with role protection.

#### 4.1 Roles & Protection
- [ ] Database: `users.role TEXT DEFAULT 'user'`
- [ ] Middleware: `requireAdmin` guards all `/api/admin/*` routes
- [ ] Migration: ensure `role` column exists

#### 4.2 Admin Orders Dashboard
- [ ] List view with filters (status, date range, user)
- [ ] Order detail card with:
  - Status change: `new | processing | done | canceled`
  - Admin notes field
  - OEMstrade links: `https://oemstrade.com/search?q=<MPN>`
  - Google site search link: `site:oemstrade.com <MPN>`
- [ ] UI: `ui/admin-orders.html` (already exists, verify completeness)

#### 4.3 User "My Orders" Panel
- [ ] Route: `/api/user/orders` (authenticated users only)
- [ ] UI: `ui/my-orders.html` or integrate into user dashboard
- [ ] Table: order ID, date, status, items, total
- [ ] Detail view: same data as admin sees (minus admin-only fields)

#### 4.4 Status Consistency
- [ ] Single source of truth: `orders` table
- [ ] Admin status change → user sees updated status immediately
- [ ] No caching issues

#### 4.5 Markup/Pricing Settings
- [x] Global settings: `markup_percent`, `markup_fixed_rub` (already implemented)
- [x] Admin UI: `/ui/admin-settings.html` (done)
- [ ] Verify: pricing calculation uses current settings
- [ ] Display markup in order card

**Acceptance:**
- ✅ Only `role=admin` can access admin routes
- ✅ Status changes sync between admin and user views
- ✅ OEMstrade links clickable and functional
- ✅ Markup settings affect displayed prices

**Commits:**
- `[ADMIN] orders ui+api + markups + role-guard`
- `[USER] my-orders panel`

---

### 5. Product Card — Enhance, Don't Redesign

**Constraints:**
- ❌ Do NOT touch: header, search, base theme, colors, fonts, branding
- ✅ Enhance layout, sticky sidebar, specs grid, price modal

#### 5.1 Layout & Sticky Sidebar
- [ ] 12-column grid (if not already): gallery (3–4 cols) + specs/docs (5–6 cols) + sidebar (2–3 cols)
- [ ] Sticky element: **right sidebar** (price, stock, CTA, docs) — NOT gallery
- [ ] Gallery: compact, thumbnails 48–64px, main image ≤ 420px width

#### 5.2 Specifications Display
- [ ] Use semantic `<dl>` (description list) for specs
- [ ] Two-column grid layout (term | definition)
- [ ] Long values: text wrapping + optional expand/collapse

#### 5.3 Pricing Display
- [x] Sidebar: "Top 6" price breaks (done — limit increased to 6)
- [x] "Show All Prices" button → modal (done)
- [x] Modal filters: min qty, max price (₽), supplier dropdown (done)
- [ ] Verify: filters work correctly, results update

#### 5.4 Visual Regression Tests (MANDATORY)
- [ ] Install Playwright (already in devDependencies)
- [ ] Create test: `tests/visual/product-card.spec.js`
- [ ] Snapshots:
  - Desktop: 1440px width
  - Tablet: 1024px width
  - Mobile: 390px width
- [ ] States to capture:
  - Normal page load
  - Modal opened (all prices)
- [ ] First run: `npx playwright test --update-snapshots` (baseline)
- [ ] CI: Compare future changes against baseline

**Docs:** [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)

**Acceptance:**
- ✅ Header/search pixel-perfect vs baseline
- ✅ Sticky sidebar on right side
- ✅ Specs readable with 5 fields and with 25 fields
- ✅ Modal and filters functional
- ✅ Visual snapshots pass (no unintended changes)

**Commit:** `[CARD] sticky-right + dl-grid + prices modal + snapshots`

---

### 6. Non-Interactive Deploy + Artifacts

**Objective:** Fully automated deployment with no manual prompts.

#### 6.1 SSH Configuration
- [ ] Use: `-o StrictHostKeyChecking=accept-new` (accept new keys, reject changed keys)
- [ ] Document: SSH_USER, SSH_HOST, SSH_PORT, APP_DIR, SERVICE_NAME in `.env.example`

**Docs:** [SSH StrictHostKeyChecking](https://man.openbsd.org/ssh_config#StrictHostKeyChecking)

#### 6.2 Deploy Script
- [ ] Create: `scripts/deploy.sh`
- [ ] Steps:
  1. SSH to server (non-interactive)
  2. `cd $APP_DIR`
  3. `git fetch --all`
  4. `git checkout $BRANCH` (this branch)
  5. `git pull --ff-only`
  6. `npm ci --no-audit --no-fund`
  7. `npm run build || true` (if build step exists)
  8. `sudo systemctl enable --now warp-svc` (ensure WARP running)
  9. `sudo systemctl restart $SERVICE_NAME`
  10. `node scripts/check-providers.mjs > docs/_artifacts/providers-$(date +%s).json`

#### 6.3 Artifacts Collection
- [ ] Providers check results
- [ ] Playwright test results (HTML report)
- [ ] WARP status: `warp-cli status > docs/_artifacts/warp-status.txt`
- [ ] All saved in `docs/_artifacts/`

**Acceptance:**
- ✅ Deploy runs without terminal prompts
- ✅ Service restarts successfully
- ✅ Artifacts generated and committed

**Commit:** `[OPS] non-interactive deploy + artifacts`

---

### 7. Git Discipline & Reporting

**Objective:** Clean commit history, atomic changes, comprehensive documentation.

#### 7.1 Commit Structure
- [ ] Atomic commits per block (prefix: `[VIDEO]`, `[WARP]`, `[AUTH]`, etc.)
- [ ] Descriptive messages (what + why)
- [ ] One feature/fix per commit (no mixing)

#### 7.2 Block Reports
- [ ] After each block: `docs/REPORT-<date>-BLOCK-<N>.md`
- [ ] Contents:
  - What was implemented
  - How it was tested
  - Links to artifacts
  - Acceptance criteria status

#### 7.3 Pull Request
- [ ] Title: `[MASTER-v2] Video → WARP → Auth → Admin → Card → Deploy`
- [ ] Description includes:
  - Link to VIDEO-REQUIREMENTS.md
  - All block reports
  - Artifacts links
  - Screenshots/recordings
  - Checklist completion status

**Acceptance:**
- ✅ All commits atomic and prefixed
- ✅ Block reports present and complete
- ✅ PR well-documented with all artifacts

**Commit:** (ongoing — meta-task)

---

## Final Acceptance Checklist

Before PR submission, verify:

- [ ] ✅ Video: transcript.txt and VIDEO-REQUIREMENTS.md complete
- [ ] ✅ WARP: `warp=on`, all HTTP via ProxyAgent, `providers:check` green (DigiKey not 403)
- [ ] ✅ Sessions: HTTPS/proxy cookies work, `Secure` + `SameSite=None`, trust proxy enabled
- [ ] ✅ Auth: email+password, Google, Yandex, VK — all login methods stable
- [ ] ✅ Admin/User: role protection, status sync, markup works, OEMstrade links clickable
- [ ] ✅ Product Card: header untouched, sticky right sidebar, specs readable, top-6 + modal filters, visual snapshots pass
- [ ] ✅ Deploy: fully non-interactive, artifacts attached, PR documented

---

## Reference Documentation

- [Cloudflare WARP Modes](https://developers.cloudflare.com/warp-client/)
- [Undici ProxyAgent](https://undici.nodejs.org/#/docs/api/ProxyAgent)
- [Express trust proxy](https://expressjs.com/en/guide/behind-proxies.html)
- [Playwright Visual Testing](https://playwright.dev/docs/test-snapshots)
- [SSH StrictHostKeyChecking](https://stackoverflow.com/questions/21383806/how-can-i-force-ssh-to-accept-a-new-host-fingerprint-from-the-command-line)
- [Passport Google OIDC](http://www.passportjs.org/packages/passport-google-oidc/)
- [Passport Yandex](http://www.passportjs.org/packages/passport-yandex/)
- [Passport VKontakte](http://www.passportjs.org/packages/passport-vkontakte/)

---

**Last Updated:** October 3, 2025  
**Status:** Block 0 complete, blocks 1–7 in progress
