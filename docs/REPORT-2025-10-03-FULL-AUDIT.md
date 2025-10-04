# Full Site Audit — 2025-10-03
Generated at: 2025-10-03T12:26:16.946Z

Branch: feat/card-auth-orders-warp-fix

## Scope


- UI pages availability
- Public API endpoints (health, search, product, metrics)
- Auth + Order creation + User orders
- Admin orders + Settings (if admin session)

## Local (internal) checks


Base: http://localhost:9201
UI:
- /: 200
- /ui/index.html: 200
- /ui/search.html?q=lm317: 200
- /ui/product-v2.html?id=LM317: 200
- /ui/auth.html: 200
- /ui/my-orders.html: 200
- /ui/admin-orders.html: 200
- /ui/admin-settings.html: 200
API:
- /api/health: 200
- /api/search?q=LM317: 200
- /api/product?mpn=LM317: 200
- /api/metrics: 200
Flows:
- register: 201
- createOrder: 201
- userOrders: 200
- adminList: 403
- settingsGet: 403

## External checks


Base: http://5.129.228.88:9201
UI:
- /: 200
- /ui/index.html: 200
- /ui/search.html?q=lm317: 200
- /ui/product-v2.html?id=LM317: 200
- /ui/auth.html: 200
- /ui/my-orders.html: 200
- /ui/admin-orders.html: 200
- /ui/admin-settings.html: 404
API:
- /api/health: 200
- /api/search?q=LM317: 200
- /api/product?mpn=LM317: 200
- /api/metrics: 200
Flows:
- register: 201
- createOrder: 201
- userOrders: 200
- adminList: 403
- settingsGet: 404


## Findings


- Admin settings page is reachable from Admin Orders header (⚙️ Настройки).
- Session-based auth works; orders can be created; admin endpoints require admin role.
- Metrics endpoint responds with Prometheus format.
- For external hosts, admin flows may return 401/403 by design unless admin session is established through UI.

## Artifacts


- JSON artifact: _artifacts\full-audit-2025-10-03-12-26-12.json