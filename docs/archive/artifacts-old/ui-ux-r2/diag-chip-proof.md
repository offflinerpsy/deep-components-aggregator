# Diagnostics chip — proof
UI chip reads /api/health and maps statuses:

- green: all configured providers not down/degraded; currency ok
- amber: at least one provider degraded
- red: any provider down or health not ok

Headers and samples:

- health.txt — JSON headers and body excerpt (status: ok, sources{...})
- metrics.txt — first lines of Prometheus exposition (0.0.4)
- /api/health — headers excerpt and status fields (see: health.txt)
- /api/metrics — Prometheus sample lines parsed: egress/proxy/providers partial (see: metrics.txt)
- Indicator logic: green (all ok), amber (partial), red (unavailable)
