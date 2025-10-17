# Architecture — Digest (2025-10-16)

- Nginx → Frontend (Next.js 14, port 3001) → Rewrites → Backend (Express, port 9201)
- Proxy policy: Undici ProxyAgent via WARP (127.0.0.1:40000), NO_PROXY=127.0.0.1,localhost
- Cache layer: SQLite (search/products/offers), TTL: search~7d, product~30d
- Live search: SSE, no cache blending, cache used only as tech fallback
- Admin: AdminJS (dynamic import), protected behind Nginx basic auth, DB via Sequelize
- Security: rate limits, sessions (SQLite), passport strategies, metrics at /api/metrics
