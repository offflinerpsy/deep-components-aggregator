import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './var';
const DB_PATH = path.join(DATA_DIR, 'db', 'deepagg.sqlite');

function ensureDirs(p){ const d = path.dirname(p); if(!fs.existsSync(d)) fs.mkdirSync(d, {recursive:true}); }

export function openDb(){
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
    
    -- FTS5 virtual table for full-text search with bm25 ranking
    -- Indexed columns: mpn, manufacturer, title, description (from search_rows.row JSON)
    -- Note: FTS5 contentless mode not ideal for JSON extraction, using content= approach
    CREATE VIRTUAL TABLE IF NOT EXISTS search_rows_fts USING fts5(
      q UNINDEXED,
      ord UNINDEXED,
      mpn,
      manufacturer,
      title,
      description,
      content='',
      tokenize='porter unicode61'
    );
  `);
  return db;
}

export function cacheSearch(db, q, rows, meta){
  const ts = Date.now();
  const insS = db.prepare('INSERT OR REPLACE INTO searches (q, ts, total, source) VALUES (?,?,?,?)');
  const delR = db.prepare('DELETE FROM search_rows WHERE q=?');
  const insR = db.prepare('INSERT OR REPLACE INTO search_rows (q, ord, row) VALUES (?,?,?)');
  
  // FTS5 sync
  const delFts = db.prepare('DELETE FROM search_rows_fts WHERE q=?');
  const insFts = db.prepare('INSERT INTO search_rows_fts (q, ord, mpn, manufacturer, title, description) VALUES (?,?,?,?,?,?)');
  
  const tx = db.transaction((rows)=>{
    insS.run(q, ts, rows.length, (meta && meta.source) || '');
    delR.run(q);
    delFts.run(q);
    for(let i=0;i<rows.length;i++){
      const rowStr = JSON.stringify(rows[i]);
      insR.run(q, i, rowStr);
      
      // Extract fields for FTS5
      const row = rows[i];
      const mpn = String(row.mpn || '');
      const manufacturer = String(row.manufacturer || '');
      const title = String(row.title || '');
      const description = String(row.description || row.description_short || '');
      
      insFts.run(q, i, mpn, manufacturer, title, description);
    }
  });
  tx(rows);
}

export function readCachedSearch(db, q, maxAgeMs){
  const s = db.prepare('SELECT ts, total, source FROM searches WHERE q=?').get(q);
  if(!s) return null;
  if(maxAgeMs && (Date.now()-s.ts) > maxAgeMs) return null;
  const items = db.prepare('SELECT row FROM search_rows WHERE q=? ORDER BY ord').all(q);
  const rows = items.map(x => JSON.parse(x.row));
  return { rows, meta: { source: s.source, total: rows.length, cached: true } };
}

export function cacheProduct(db, src, id, product){
  const ts = Date.now();
  db.prepare('INSERT OR REPLACE INTO product_cache (src,id,ts,product) VALUES (?,?,?,?)')
    .run(src, id, ts, JSON.stringify(product));
}

export function readCachedProduct(db, src, id, maxAgeMs){
  const r = db.prepare('SELECT ts,product FROM product_cache WHERE src=? AND id=?').get(src,id);
  if(!r) return null;
  if(maxAgeMs && (Date.now()-r.ts) > maxAgeMs) return null;
  return JSON.parse(r.product);
}

/**
 * Full-text search in cached products using FTS5 + bm25 ranking
 * @param {Database} db - SQLite database instance
 * @param {string} query - Search query (e.g., "transistor", "LM358")
 * @param {number} limit - Max results (default 100)
 * @returns {Array<{row: object, rank: number}>} - Sorted by bm25 relevance (lower rank = better match)
 */
export function searchCachedFts(db, query, limit = 100){
  if (!query || !query.trim()) return [];
  
  // FTS5 query with bm25 ranking
  // bm25() returns negative scores — sort ASC for best matches first (closer to 0 = better)
  const sql = `
    SELECT 
      q, ord, 
      bm25(search_rows_fts) as rank
    FROM search_rows_fts
    WHERE search_rows_fts MATCH ?
    ORDER BY rank ASC
    LIMIT ?
  `;
  
  const matches = db.prepare(sql).all(query, limit);
  
  // Join with search_rows to get full JSON data
  const results = [];
  for (const match of matches) {
    const rowData = db.prepare('SELECT row FROM search_rows WHERE q=? AND ord=?').get(match.q, match.ord);
    if (rowData) {
      results.push({
        row: JSON.parse(rowData.row),
        rank: match.rank,
        _meta: { q: match.q, ord: match.ord }
      });
    }
  }
  
  return results;
}

