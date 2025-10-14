/**
 * Vitrine API — Cache-Only Product Browsing
 *
 * GET /api/vitrine/sections — Returns available sections from cached searches
 * GET /api/vitrine/list?section&q&in_stock&price_min&price_max&region&sort — Filtered cache-only results
 *
 * **No external API calls** — all data from local cache (searches, search_rows tables)
 * **Filters**: section (by source), q (text search using FTS5), in_stock, price range, region, sort
 * **Sort options**: relevance (default, uses bm25 when q present), price_asc, price_desc, stock_desc
 * **RU→EN**: Cyrillic queries automatically transliterated + synonym-mapped (транзистор → transistor)
 */

import { openDb, searchCachedFts } from '../src/db/sql.mjs';
import { normalizeQuery } from '../src/search/normalizeQuery.mjs';
import { cacheHitsTotal, cacheMissesTotal, ftsQueriesTotal, ftsQueryDurationMs } from '../metrics/registry.js';

/**
 * Get available sections (unique sources from cached searches)
 * Returns: { ok: true, sections: [{id, label, count}] }
 */
function getSections(req, res) {
  const db = openDb();

  // Aggregate by source
  const rows = db.prepare(`
    SELECT
      source as id,
      source as label,
      COUNT(*) as count,
      SUM(total) as items
    FROM searches
    GROUP BY source
    ORDER BY items DESC
  `).all();

  res.json({ ok: true, sections: rows });
}

/**
 * Get filtered product list from cache
 * Query params:
 *  - section: filter by source (optional)
 *  - q: text search query (optional, applied to cached row JSON)
 *  - in_stock: 1 to filter only items with stock>0 (optional)
 *  - price_min/price_max: RUB price range (optional)
 *  - region: filter by region code (optional, e.g., "ru", "en", "de")
 *  - sort: relevance (default) | price_asc | price_desc | stock_desc
 *  - limit: max results (default 100, max 500)
 */
function getList(req, res) {
  const db = openDb();

  const section = String(req.query.section || '').trim();
  const q = String(req.query.q || '').trim();
  const inStock = req.query.in_stock === '1';
  const priceMin = parseFloat(req.query.price_min || '0') || 0;
  const priceMax = parseFloat(req.query.price_max || '0') || Infinity;
  const region = String(req.query.region || '').trim().toLowerCase();
  const sort = String(req.query.sort || 'relevance').trim();
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);

  let allRows = [];
  let usedFts = false;
  let queryMeta = null;

  // Step 1: If text search query present, use FTS5 for relevance ranking
  if (q) {
    usedFts = true;

    // RU→EN normalization: detect Cyrillic, transliterate, apply synonyms
    queryMeta = normalizeQuery(q);
    const ftsQuery = queryMeta.normalized; // Use synonym-mapped query for FTS5

    // Measure FTS5 query duration
    const ftsStart = Date.now();
    const ftsResults = searchCachedFts(db, ftsQuery, 5000); // Get up to 5000 FTS matches
    const ftsDuration = Date.now() - ftsStart;

    // Record metrics
    ftsQueriesTotal.inc();
    ftsQueryDurationMs.observe(ftsDuration);

    if (ftsResults.length > 0) {
      cacheHitsTotal.inc({ source: 'vitrine' });
    } else {
      cacheMissesTotal.inc({ source: 'vitrine' });
    }

    allRows = ftsResults.map(r => ({ ...r.row, _fts_rank: r.rank }));
  } else {
    // Step 1b: No text search — get all cached search queries
    let searchQueries;
    if (section) {
      searchQueries = db.prepare(`
        SELECT q FROM searches WHERE source = ? ORDER BY ts DESC
      `).all(section);
    } else {
      searchQueries = db.prepare(`
        SELECT q FROM searches ORDER BY ts DESC
      `).all();
    }

    if (!searchQueries.length) {
      res.json({ ok: true, rows: [], meta: { total: 0, cached: true, usedFts, filters: { section, q, inStock, priceMin, priceMax, region, sort } } });
      return;
    }

    // Step 2: Fetch all rows for these queries
    for (const { q: cachedQ } of searchQueries) {
      const items = db.prepare(`
        SELECT row FROM search_rows WHERE q = ? ORDER BY ord
      `).all(cachedQ);

      for (const item of items) {
        allRows.push(JSON.parse(item.row));
      }
    }
  }

  // Step 3: Apply filters
  let filtered = allRows;

  // Section filter (only if not using FTS, since FTS already searches all)
  if (section && !usedFts) {
    filtered = filtered.filter(row => row.source === section);
  }

  // ✅ ALWAYS exclude items without prices (min_price_rub must exist and > 0)
  filtered = filtered.filter(row => {
    const price = parseFloat(row.min_price_rub || row.price_rub || row.price || '0') || 0;
    return price > 0;
  });

  // In-stock filter
  if (inStock) {
    filtered = filtered.filter(row => {
      const stock = parseInt(row.stock || '0', 10);
      return stock > 0;
    });
  }

  // Price range filter (RUB)
  if (priceMin > 0 || priceMax < Infinity) {
    filtered = filtered.filter(row => {
      const price = parseFloat(row.min_price_rub || row.price_rub || row.price || '0') || 0;
      return price >= priceMin && price <= priceMax;
    });
  }

  // Region filter
  if (region) {
    filtered = filtered.filter(row => {
      const rowRegion = (row.region || '').toLowerCase();
      return rowRegion === region;
    });
  }

  // Step 4: Sort results
  switch (sort) {
    case 'price_asc':
      filtered.sort((a, b) => {
        const priceA = parseFloat(a.min_price_rub || a.price_rub || a.price || '0') || 0;
        const priceB = parseFloat(b.min_price_rub || b.price_rub || b.price || '0') || 0;
        return priceA - priceB;
      });
      break;
    case 'price_desc':
      filtered.sort((a, b) => {
        const priceA = parseFloat(a.min_price_rub || a.price_rub || a.price || '0') || 0;
        const priceB = parseFloat(b.min_price_rub || b.price_rub || b.price || '0') || 0;
        return priceB - priceA;
      });
      break;
    case 'stock_desc':
      filtered.sort((a, b) => {
        const stockA = parseInt(a.stock || '0', 10);
        const stockB = parseInt(b.stock || '0', 10);
        return stockB - stockA;
      });
      break;
    case 'relevance':
    default:
      // If FTS was used, already sorted by bm25 rank
      // Otherwise keep original order (by ord in search_rows)
      if (!usedFts) {
        // No-op: keep insertion order
      }
      break;
  }

  // Step 4.5: Fetch pinned products and prepend to results
  const pinnedRows = db.prepare(`
    SELECT sr.row, vp.pinned_at
    FROM vitrine_pins vp
    JOIN search_rows sr ON sr.rowid = vp.rowid
    ORDER BY vp.pinned_at DESC
  `).all();

  const pinnedProducts = pinnedRows.map(p => ({
    ...JSON.parse(p.row),
    _pinned: true,
    _pinned_at: p.pinned_at
  }));

  // Prepend pinned products (they appear at top)
  filtered = [...pinnedProducts, ...filtered];

  // Step 5: Limit results
  const rows = filtered.slice(0, limit);

  res.json({
    ok: true,
    rows,
    meta: {
      total: rows.length,
      totalBeforeLimit: filtered.length,
      cached: true,
      usedFts,
      queryNorm: queryMeta,  // Include RU→EN normalization metadata
      filters: { section, q, inStock, priceMin, priceMax, region, sort, limit }
    }
  });
}

export default function mountVitrine(app) {
  app.get('/api/vitrine/sections', getSections);
  app.get('/api/vitrine/list', getList);
}
