# UI Smokes — R2

Checks:
- / redirects or submits to /results?q=...
- /results renders cache mode; live mode streams progressively; provider errors as yellow badges
- /product/[mpn] stable with sparse and rich data; tabs populated; offers paginated

Artifacts:
- 3 breakpoint screenshots for /, /results, /product
- rewrites stay enforced (all calls via /api/*)
