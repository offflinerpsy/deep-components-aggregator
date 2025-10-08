#!/usr/bin/env node
/**
 * Backfill search_rows_fts table from existing search_rows data
 * Run once after FTS5 table creation to index existing cached searches
 */

import { openDb } from '../src/db/sql.mjs';

const db = openDb();

console.log('🔍 Backfilling FTS5 table from search_rows...');

// Get all existing search rows
const rows = db.prepare('SELECT q, ord, row FROM search_rows ORDER BY q, ord').all();

console.log(`Found ${rows.length} rows to index`);

// Prepare FTS5 insert statement
const insFts = db.prepare('INSERT INTO search_rows_fts (q, ord, mpn, manufacturer, title, description) VALUES (?,?,?,?,?,?)');

let indexed = 0;
let errors = 0;

const tx = db.transaction(() => {
  // Clear existing FTS5 data (if any)
  db.prepare('DELETE FROM search_rows_fts').run();
  
  for (const r of rows) {
    try {
      const data = JSON.parse(r.row);
      const mpn = String(data.mpn || '');
      const manufacturer = String(data.manufacturer || '');
      const title = String(data.title || '');
      const description = String(data.description || data.description_short || '');
      
      insFts.run(r.q, r.ord, mpn, manufacturer, title, description);
      indexed++;
    } catch (err) {
      console.error(`Error indexing q="${r.q}" ord=${r.ord}:`, err.message);
      errors++;
    }
  }
});

tx();

console.log(`✅ Backfill complete: ${indexed} rows indexed, ${errors} errors`);

// Verify count
const ftsCount = db.prepare('SELECT COUNT(*) as count FROM search_rows_fts').get();
console.log(`FTS5 table now has ${ftsCount.count} rows`);

db.close();
