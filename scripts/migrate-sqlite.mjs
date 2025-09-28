import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = path.resolve('data/db/agg.sqlite');
fs.mkdirSync(path.dirname(dbPath), {recursive:true});
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  mpn TEXT, brand TEXT, title TEXT, description TEXT,
  package TEXT, image_url TEXT,
  datasheet_urls TEXT,                 -- JSON массив
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_mpn ON products(mpn);
CREATE INDEX IF NOT EXISTS idx_products_title ON products(title);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL,
  region TEXT, stock INTEGER, price_min_rub REAL,
  source TEXT,                         -- chipdip|oemstrade|...
  url TEXT,
  provider TEXT,                       -- scrapingbee|scraperapi|scrapingbot
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_offers_prod ON offers(product_id);

CREATE TABLE IF NOT EXISTS searches (
  id TEXT PRIMARY KEY,                 -- uuid запроса
  q TEXT, kind TEXT,                   -- mpn|text
  started_at TEXT, finished_at TEXT,
  total_found INTEGER DEFAULT 0
);
`);
console.log('MIGRATE_OK');
