# Runtime Stability — 2025-10-14

This folder contains proofs that the server is stable after fixes:

- pm2-status.txt — PM2 process table (online)
- deep-agg-logs.txt — last 120 lines summary (no fatal exits)
- health.json — /api/health snapshot (status ok)

Fixes applied:
- AdminJS now uses SQLite session store (shared with app)
- Removed process.exit on uncaught exceptions and unhandled rejections
- Hardened PM2 config: no watch, memory cap, backoff, production env
