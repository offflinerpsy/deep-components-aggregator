import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './var';
const DB_PATH = path.join(DATA_DIR, 'db', 'deepagg.sqlite');

function ensureDirs(p) { const d = path.dirname(p); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

export function openDb() {
  ensureDirs(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS searches(
      q TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      total INTEGER NOT NULL,
      source TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS search_rows(
      q TEXT NOT NULL,
      ord INTEGER NOT NULL,
      row TEXT NOT NULL,
      PRIMARY KEY(q,ord)
    );
    CREATE TABLE IF NOT EXISTS product_cache(
      src TEXT NOT NULL,
      id  TEXT NOT NULL,
      ts  INTEGER NOT NULL,
      product TEXT NOT NULL,
      PRIMARY KEY(src,id)
    );
    CREATE INDEX IF NOT EXISTS idx_search_ts ON searches(ts);

    -- FTS5 table created by migration db/migrations/0002_fts5_content_table.sql
    -- Triggers handle automatic sync with search_rows table
  `);
  return db;
}

export function cacheSearch(db, q, rows, meta) {
  const ts = Date.now();
  const insS = db.prepare('INSERT OR REPLACE INTO searches (q, ts, total, source) VALUES (?,?,?,?)');
  const delR = db.prepare('DELETE FROM search_rows WHERE q=?');
  const insR = db.prepare('INSERT OR REPLACE INTO search_rows (q, ord, row) VALUES (?,?,?)');

  // FTS5 sync handled by triggers (see db/migrations/0002_fts5_content_table.sql)

  const tx = db.transaction((rows) => {
    insS.run(q, ts, rows.length, (meta && meta.source) || '');
    delR.run(q);
    for (let i = 0; i < rows.length; i++) {
      const rowStr = JSON.stringify(rows[i]);
      insR.run(q, i, rowStr);
      // Triggers automatically sync to search_rows_fts
    }
  });
  tx(rows);
}

export function readCachedSearch(db, q, maxAgeMs) {
  const s = db.prepare('SELECT ts, total, source FROM searches WHERE q=?').get(q);
  if (!s) return null;
  if (maxAgeMs && (Date.now() - s.ts) > maxAgeMs) return null;
  const items = db.prepare('SELECT row FROM search_rows WHERE q=? ORDER BY ord').all(q);
  const rows = items.map(x => JSON.parse(x.row));
  return { rows, meta: { source: s.source, total: rows.length, cached: true } };
}

export function cacheProduct(db, src, id, product) {
  const ts = Date.now();
  db.prepare('INSERT OR REPLACE INTO product_cache (src,id,ts,product) VALUES (?,?,?,?)')
    .run(src, id, ts, JSON.stringify(product));
}

export function readCachedProduct(db, src, id, maxAgeMs) {
  const r = db.prepare('SELECT ts,product FROM product_cache WHERE src=? AND id=?').get(src, id);
  if (!r) return null;
  if (maxAgeMs && (Date.now() - r.ts) > maxAgeMs) return null;
  return JSON.parse(r.product);
}

/**
 * Full-text search in cached products using FTS5 + bm25 ranking
 * @param {Database} db - SQLite database instance
 * @param {string} query - Search query (e.g., "transistor", "LM358")
 * @param {Object} options - Search options
 * @param {number} options.limit - Max results (default 100)
 * @param {Array<number>} options.weights - bm25 column weights [mpn, manufacturer, title, description] (default [10, 6, 2, 1])
 * @returns {Array<{row: object, rank: number}>} - Sorted by bm25 relevance (lower rank = better match)
 */
export function searchCachedFts(db, query, options = {}) {
  if (!query || !query.trim()) return [];

  const limit = options.limit || 100;
  const weights = options.weights || [10, 6, 2, 1]; // mpn > manufacturer > title > description

  // FTS5 query with bm25 ranking using content-table JOIN
  // bm25() returns negative scores — sort ASC for best matches first (closer to 0 = better)
  const sql = `
    SELECT
      sr.rowid,
      sr.q,
      sr.ord,
      sr.row,
      bm25(search_rows_fts, ?, ?, ?, ?) as rank
    FROM search_rows_fts
    JOIN search_rows sr ON sr.rowid = search_rows_fts.rowid
    WHERE search_rows_fts MATCH ?
    ORDER BY rank ASC
    LIMIT ?
  `;

  const matches = db.prepare(sql).all(...weights, query, limit);

  // Parse JSON and return results
  const results = matches.map(match => ({
    row: JSON.parse(match.row),
    rank: match.rank,
    _meta: { q: match.q, ord: match.ord, rowid: match.rowid }
  }));

  return results;
}
