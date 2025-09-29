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
    CREATE TABLE IF NOT EXISTS products(
      src TEXT NOT NULL,
      id  TEXT NOT NULL,
      ts  INTEGER NOT NULL,
      product TEXT NOT NULL,
      PRIMARY KEY(src,id)
    );
    CREATE INDEX IF NOT EXISTS idx_search_ts ON searches(ts);
  `);
  return db;
}

export function cacheSearch(db, q, rows, meta){
  const ts = Date.now();
  const insS = db.prepare('INSERT OR REPLACE INTO searches (q, ts, total, source) VALUES (?,?,?,?)');
  const delR = db.prepare('DELETE FROM search_rows WHERE q=?');
  const insR = db.prepare('INSERT OR REPLACE INTO search_rows (q, ord, row) VALUES (?,?,?)');
  const tx = db.transaction((rows)=>{
    insS.run(q, ts, rows.length, (meta && meta.source) || '');
    delR.run(q);
    for(let i=0;i<rows.length;i++) insR.run(q, i, JSON.stringify(rows[i]));
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
  db.prepare('INSERT OR REPLACE INTO products (src,id,ts,product) VALUES (?,?,?,?)')
    .run(src, id, ts, JSON.stringify(product));
}

export function readCachedProduct(db, src, id, maxAgeMs){
  const r = db.prepare('SELECT ts,product FROM products WHERE src=? AND id=?').get(src,id);
  if(!r) return null;
  if(maxAgeMs && (Date.now()-r.ts) > maxAgeMs) return null;
  return JSON.parse(r.product);
}
