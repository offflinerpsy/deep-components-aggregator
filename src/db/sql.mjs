import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || './var';
const DB_PATH = path.join(DATA_DIR, 'db', 'deepagg.sqlite');

function tableExists(db, name) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name);
  return Boolean(row && row.name);
}

function columnExists(db, table, column) {
  if (!tableExists(db, table)) {
    return false;
  }
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((row) => row.name === column);
}

function ensureOrderColumns(db) {
  if (!tableExists(db, 'orders')) {
    return;
  }

  if (!columnExists(db, 'orders', 'customer_email')) {
    db.exec('ALTER TABLE orders ADD COLUMN customer_email TEXT;');
    db.exec('CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);');
    db.exec("UPDATE orders SET customer_email = json_extract(customer_contact, '$.email') WHERE customer_contact IS NOT NULL;");
  }

  if (!columnExists(db, 'orders', 'order_code')) {
    db.exec('ALTER TABLE orders ADD COLUMN order_code TEXT;');
    db.exec('CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);');
  }

  if (!columnExists(db, 'orders', 'status_comment')) {
    db.exec('ALTER TABLE orders ADD COLUMN status_comment TEXT;');
  }

  if (!columnExists(db, 'orders', 'status_history')) {
    db.exec('ALTER TABLE orders ADD COLUMN status_history TEXT;');
  }

  const rows = db.prepare("SELECT id FROM orders WHERE order_code IS NULL OR order_code = ''").all();
  if (rows.length === 0) {
    return;
  }
  const update = db.prepare('UPDATE orders SET order_code = ? WHERE id = ?');
  const tx = db.transaction((items) => {
    for (const row of items) {
      const compact = row.id ? String(row.id).replace(/-/g, '').toUpperCase() : '';
      const suffix = compact.length >= 6 ? compact.slice(-6) : compact.padStart(6, '0');
      const code = `ORD-${suffix}`;
      update.run(code, row.id);
    }
  });
  tx(rows);
}

function ensureAdminNotifications(db) {
  if (tableExists(db, 'admin_notifications')) {
    return;
  }
  db.exec(`
    CREATE TABLE admin_notifications (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      read_at INTEGER
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read_at);');
}

function ensureDirs(p) { const d = path.dirname(p); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

export function openDb() {
  ensureDirs(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  ensureOrderColumns(db);
  ensureAdminNotifications(db);
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

  // Escape FTS5 special characters in query
  // FTS5 operators: - (NOT), * (prefix), "" (phrase), OR, AND, NEAR, ()
  // Wrap query in double quotes to treat as literal phrase
  const escapedQuery = `"${query.replace(/"/g, '""')}"`;

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

  const matches = db.prepare(sql).all(...weights, escapedQuery, limit);

  // Parse JSON and return results
  const results = matches.map(match => ({
    row: JSON.parse(match.row),
    rank: match.rank,
    _meta: { q: match.q, ord: match.ord, rowid: match.rowid }
  }));

  return results;
}
