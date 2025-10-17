# Project Structure — Snapshot (2025-10-16)

Root: /opt/deep-agg

## Top-level
- server.js (Express backend)
- package.json (backend)
- ecosystem.config.cjs (PM2)
- API-CONTRACT.md, ARCHITECTURE.md, README.md, DEPLOYMENT.md, ENV-SECRETS.md
- docs/ (artifacts, backend/frontend docs)
- api/ (Express route modules)
- src/ (backend source: integrations, search, db, etc.)
- scripts/ (diagnostics, tests, deploy helpers)
- metrics/, middleware/ (Prometheus, rate limiters, auth guards)
- schemas/ (AJV schemas: product/search/orders/auth/notifications)
- v0-components-aggregator-page/ (Next.js App Router frontend)
- var/, data/, db/ (sqlite, migrations)

## Backend src/
- adapters/, integrations/ (mouser, tme, farnell, digikey)
- search/ (orchestrator, normalization)
- currency/ (CBR rates)
- db/ (sql.mjs, models.js)
- api/ (adminRoutes, etc)
- config/ (passport, session)
- lib/ (sse.mjs)
- middleware -> ../middleware

## Backend api/
- admin.* (orders, settings, notifications, products, pages)
- order.js, order.stream.mjs
- auth.js, auth-check.js
- vitrine.mjs, static-pages.mjs
- diag.net.mjs, search-reasons.mjs

## Frontend (v0-components-aggregator-page)
- next.config.mjs (rewrites /api/* -> 127.0.0.1:9201)
- package.json (Next 14.2.16, React 18)
- app/
  - page.tsx (home)
  - results/ (search page)
  - product/[mpn]/ (product page)
- components/, styles/, public/

Notes: Full tree in PROJECT-TREE.md; this snapshot focuses on wiring-relevant areas.
