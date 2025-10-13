# Project Tree

**Generated**: 2025-10-13  
**Root**: `/opt/deep-agg/`

---

## Directory Structure

```
/opt/deep-agg/
│
├── 📄 server.js                    # Backend Express server (port 9201)
├── 📄 package.json                 # Backend dependencies
├── 📄 ecosystem.config.cjs         # PM2 configuration
├── �� .env                         # Environment secrets (NOT in git!)
├── 📄 .env.example                 # Template for .env
├── 📄 .editorconfig                # EditorConfig
├── 📄 .gitignore                   # Git ignore rules
├── 📄 eslint.config.js             # ESLint configuration
├── 📄 playwright.config.ts         # Playwright E2E tests
│
├── 📁 src/                         # Backend source code
│   ├── 📁 api/                     # API route handlers
│   │   ├── cache.mjs               # GET /api/cache?q=...
│   │   ├── live.mjs                # GET /api/live?q=... (SSE)
│   │   ├── product.mjs             # GET /api/product/:mpn
│   │   └── offers.mjs              # GET /api/offers/:mpn
│   │
│   ├── 📁 parsers/                 # External API parsers
│   │   ├── 📁 digikey/             # DigiKey parser
│   │   ├── 📁 mouser/              # Mouser parser
│   │   ├── 📁 farnell/             # Farnell scraper
│   │   └── 📁 tme/                 # TME scraper
│   │
│   └── 📁 lib/                     # Utilities
│       ├── queryNorm.mjs           # RU→EN normalization
│       ├── db.mjs                  # SQLite wrapper
│       └── cache.mjs               # In-memory cache (node-cache)
│
├── 📁 v0-components-aggregator-page/   # FRONTEND (Next.js 14)
│   ├── 📄 package.json             # Frontend dependencies
│   ├── 📄 next.config.mjs          # Next.js config (REWRITES!)
│   ├── 📄 tailwind.config.ts       # TailwindCSS
│   ├── 📄 tsconfig.json            # TypeScript config
│   │
│   ├── 📁 app/                     # Next.js App Router
│   │   ├── 📄 layout.tsx           # Root layout
│   │   ├── 📄 page.tsx             # Homepage (/)
│   │   ├── 📄 globals.css          # Global styles
│   │   │
│   │   ├── 📁 results/             # /results?q=...
│   │   │   └── page.tsx            # Results page (SSR)
│   │   │
│   │   └── 📁 product/             # /product/[mpn]
│   │       └── [mpn]/
│   │           └── page.tsx        # Product detail page
│   │
│   ├── 📁 components/              # React components
│   │   ├── ResultsClient.tsx       # Live/cache results UI
│   │   ├── ProductClient.tsx       # Product details UI
│   │   ├── PageLoader.tsx          # Loading skeleton
│   │   └── ui/                     # shadcn/ui components
│   │
│   └── 📁 public/                  # Static assets
│       └── fonts/                  # Custom fonts
│
├── 📁 docs/                        # Documentation
│   ├── 📁 backend/                 # Backend docs
│   │   ├── ENDPOINTS.md            # API endpoints spec
│   │   ├── PROXY-POLICY.md         # Undici + WARP
│   │   ├── CACHE-STRATEGY.md       # SQLite caching
│   │   └── OEMstrade-INTEGRATION.md
│   │
│   ├── 📁 frontend/                # Frontend docs
│   │   ├── PAGES.md                # Route descriptions
│   │   ├── COMPONENTS.md           # Component docs
│   │   ├── REWRITES.md             # Next.js proxy
│   │   └── V0-MIGRATION.md         # v0 redesign changelog
│   │
│   └── 📁 _artifacts/              # R→I→P artifacts
│       ├── rewrites-proof/         # Headers comparison
│       ├── sse-proof/              # SSE format proofs
│       ├── api-captures/           # curl dumps
│       └── ui-smoke-results.md     # Screenshots (3 breakpoints)
│
├── 📁 var/                         # Variable data
│   └── 📁 db/                      # SQLite databases
│       └── deepagg.sqlite          # Main cache DB
│
├── 📁 scripts/                     # Automation scripts
│   ├── run-e2e-tests.sh            # E2E test runner
│   ├── verify-fixes.sh             # QA script
│   └── smoke-test-frontend.mjs     # Frontend smoke test
│
├── 📁 e2e/                         # Playwright E2E tests
│   └── complete-flow.spec.ts       # Full user flow test
│
├── 📁 tests/                       # Unit/integration tests
│   └── e2e/
│       └── verify-task-4-filters.spec.ts
│
├── 📁 .vscode/                     # VSCode workspace settings
│   └── settings.json
│
├── 📁 .github/                     # GitHub workflows (if any)
│
└── 📁 v0-analysis-artifacts/       # V0 design analysis (separate repo)
    └── (original v0 mockups)
```

---

## Key Files by Purpose

### 🚀 Entry Points
- **Backend**: `server.js`
- **Frontend**: `v0-components-aggregator-page/app/page.tsx`
- **PM2**: `ecosystem.config.cjs`

### ⚙️ Configuration
- **Backend ENV**: `.env` (secrets), `.env.example` (template)
- **Frontend Config**: `v0-components-aggregator-page/next.config.mjs` (**rewrites**)
- **PM2**: `ecosystem.config.cjs`
- **nginx**: `/etc/nginx/sites-available/prosnab.tech` (server-side, not in repo)

### 🗄️ Database
- **Cache DB**: `var/db/deepagg.sqlite` (SQLite3)
- **Schema**: See `src/lib/db.mjs`

### 📡 API
- **Backend Routes**: `src/api/*.mjs`
- **Frontend Proxy**: `v0-components-aggregator-page/next.config.mjs` → rewrites

### 🎨 UI Components
- **Results**: `v0-components-aggregator-page/components/ResultsClient.tsx`
- **Product**: `v0-components-aggregator-page/components/ProductClient.tsx`
- **Layout**: `v0-components-aggregator-page/app/layout.tsx`

### 📚 Documentation
- **Main README**: `README.md`
- **Architecture**: `ARCHITECTURE.md`
- **API Contract**: `API-CONTRACT.md`
- **Deployment**: `DEPLOYMENT.md`
- **Onboarding**: `ONBOARDING.md`

---

## Hidden Files (Important!)

### Git Ignored (.gitignore)
- `node_modules/`
- `.next/`
- `.env` (secrets!)
- `var/db/*.sqlite-wal`, `var/db/*.sqlite-shm` (temp DB files)
- `logs/**`
- `backups/**`
- `test-results/`, `playwright-report/`

### Environment Files
- `.env` — **NOT in git** (contains API keys)
- `.env.example` — Safe template (in git)

---

## External Repositories

### v0-analysis-artifacts/
- **Path**: `/opt/deep-agg/v0-analysis-artifacts/`
- **Purpose**: Original v0 design mockups from ZIP
- **Branch**: `main`
- **Git**: Separate repo (clean state)

### v0-components-aggregator-page/
- **Path**: `/opt/deep-agg/v0-components-aggregator-page/`
- **Purpose**: Frontend Next.js app
- **Branch**: `ops/ui-ux-r3`
- **Git**: `git@github.com:offflinerpsy/v0-components-aggregator-page.git`

---

## Total Size (excluding node_modules, .next, backups)

```bash
# Backend src: ~50MB
# Frontend app: ~5MB
# Database (var/db): ~200MB
# Docs: ~2MB
```

---

**Next**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
