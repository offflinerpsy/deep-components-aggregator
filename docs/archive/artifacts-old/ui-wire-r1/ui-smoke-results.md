UI smoke results — R1

- / renders and redirects/submits to /results?q=...
- /results shows real data via /api/* (rewrites proxy)
- /product/<mpn> renders with safe defaults when some fields are missing
- Live search (if enabled) streams events progressively (not a single chunk)

Screenshots (3 breakpoints):
- desktop: TODO attach
- tablet: TODO attach
- mobile: TODO attach

Notes:
- All frontend requests go through /api/* and are proxied to Express.
