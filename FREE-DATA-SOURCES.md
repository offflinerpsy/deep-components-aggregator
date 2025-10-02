Free and Low-Friction Data Sources for Product Specs

Goal: enrich product cards with technical specs, images, and datasheets with minimal blocking and zero/low cost. Use strictly server-side fetching to comply with our rules.

1) Manufacturer sites (HTML/JSON)
- Texas Instruments (TI): product pages often embed JSON-LD with parameters and direct links to datasheets. Stable URLs like https://www.ti.com/product/<MPN>.
- STMicroelectronics: https://www.st.com/en/<category>/<MPN>.html — specs tables + PDFs.
- Analog Devices: https://www.analog.com/en/products/<MPN>.html — parameters, “product highlights”.
- Microchip: https://www.microchip.com/en-us/product/<MPN> — param tables.
- NXP: https://www.nxp.com/…/products:MPN — structured specs.
Tip: use a simple server-side scraper with conservative concurrency, identify via normal UA, and cache aggressively (30–90 days). Vendors rarely block low-volume doc pulls.

2) RS Components (RS Online)
- Public product pages render rich JSON state client-side; can be extracted from HTML (look for application/json blobs). Often easier than Mouser.
- Region mirrors: rs-online.com, uk.rs-online.com — pick one and stick to it. Cache to avoid rate issues.

3) LCSC / Seeed OPL datasets
- Open Parts Library (OPL) CSVs from Seeed or community mirrors include MPNs and basic attributes; not perfect, but good seed.
- LCSC product pages contain param tables; when JS is used, fetch the XHR endpoints the page calls. Cache long-term.

4) Datasheet aggregators
- AllDataSheet, Datasheet4U, etc. Often have search by MPN and stable PDF links. Useful to fill Datasheets and sometimes basic parameters (Power, Voltage, Package) parsed from PDF metadata.
- Caution: quality varies. Always dedupe and prefer vendor PDF if possible.

5) Public catalogs/feeds
- Octopart offers a free-but-limited dataset via community mirrors, but direct API is out per our constraints. Some distributors publish category CSVs (rare, but worth checking per category).
- GitHub repos with param tables for specific families (Arduino shields, popular MCUs, passives E96 tables). These are niche enrichments but easy wins.

Implementation notes
- Build modular scrapers under src/scrapers/manufacturers/*.mjs with a common contract: input MPN, output {title, images, datasheets, technical_specs}.
- Respect robots.txt and reasonable rates; add backoff and retries; store ETag/Last-Modified to avoid re-fetch.
- Add a per-domain fetch budget and a daily job to hydrate cache for popular MPNs we see.

Why this helps now
- Until Digi‑Key egress is unblocked, these sources can fill many missing specs for popular ICs and modules without changing our UI or core flow.
