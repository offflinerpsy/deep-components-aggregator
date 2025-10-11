# UI Smokes — R2

Checks:
- / redirects or submits to /results?q=...
- /results renders cache mode; live mode streams progressively; provider errors as yellow badges
- /product/[mpn] stable with sparse and rich data; tabs populated; offers paginated

R2 Screens/Checks

- Home /: submit navigates to /results?q=…; hint visible under input — PASS (desktop+mobile screenshots attached)
- Results /results (cache): SSR list renders from /api/vitrine/list — PASS
- Results /results (live): SSE progressively streams rows; provider error badges appear as yellow; no burst — PASS
- RU→EN badge: shows “Показано по: …” when queryNorm present — PASS
- Product /product/[mpn]: Specs/Offers/Docs tabs render; Offers paginated 25/pg; sparse sections show “Данные временно недоступны” — PASS
- Diagnostics chip: green/amber/red reflects /api/health and metrics sample — PASS

Artifacts:
- 3 breakpoint screenshots for /, /results, /product
- rewrites stay enforced (all calls via /api/*)
