#!/usr/bin/env node
/**
 * Import DigiKey categories from GitHub dataset
 * Source: https://github.com/silverXnoise/digikey-part-category-schema
 * 
 * Парсит HTML-таблицу и создаёт иерархию категорий в SQLite
 */

import { readFileSync } from 'fs';
import Database from 'better-sqlite3';
import { parse } from 'node-html-parser';

const HTML_FILE = process.argv[2] || '/tmp/digikey-categories.html';
const DB_PATH = './var/db/deepagg.sqlite';

console.log('📦 DigiKey Categories Import\n');

// 1. Parse HTML
console.log(`📖 Parsing ${HTML_FILE}...`);
const html = readFileSync(HTML_FILE, 'utf-8');
const root = parse(html);
const rows = root.querySelectorAll('tbody tr');

console.log(`Found ${rows.length} category rows\n`);

// 2. Extract data
const categories = [];
for (const row of rows) {
  const cells = row.querySelectorAll('td');
  if (cells.length < 10) continue;

  const id = parseInt(cells[0].text.trim());
  const name = cells[1].text.trim();
  const parentId = cells[3].text.trim() || null;
  const path = cells[7].text.trim();
  
  // Проверка на корневую категорию (нет parent_id)
  const isRoot = !parentId;
  
  // Проверка на leaf (конечная категория без детей)
  // Это определим после парсинга всех категорий
  
  categories.push({
    id,
    name,
    parent_id: parentId ? parseInt(parentId) : null,
    path,
    slug: path.toLowerCase()
      .replace(/[\s,()]/g, '-')
      .replace(/\//g, '--')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, ''),
    is_root: isRoot,
    is_leaf: false, // будет обновлено
  });
}

// 3. Determine leaf categories (no children)
const parentIds = new Set(categories.map(c => c.parent_id).filter(Boolean));
for (const cat of categories) {
  cat.is_leaf = !parentIds.has(cat.id);
}

console.log(`✅ Parsed ${categories.length} categories`);
console.log(`   Root categories: ${categories.filter(c => c.is_root).length}`);
console.log(`   Leaf categories: ${categories.filter(c => c.is_leaf).length}\n`);

// 4. Create table
console.log('🗄️  Creating database table...');
const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS catalog_categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id INTEGER REFERENCES catalog_categories(id),
    path TEXT NOT NULL,
    is_root BOOLEAN DEFAULT 0,
    is_leaf BOOLEAN DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_catalog_parent ON catalog_categories(parent_id);
  CREATE INDEX IF NOT EXISTS idx_catalog_slug ON catalog_categories(slug);
  CREATE INDEX IF NOT EXISTS idx_catalog_root ON catalog_categories(is_root) WHERE is_root = 1;
  CREATE INDEX IF NOT EXISTS idx_catalog_leaf ON catalog_categories(is_leaf) WHERE is_leaf = 1;
`);

// 5. Clear existing data
const existing = db.prepare('SELECT COUNT(*) as cnt FROM catalog_categories').get();
if (existing.cnt > 0) {
  console.log(`⚠️  Found ${existing.cnt} existing categories, deleting...`);
  db.exec('DELETE FROM catalog_categories');
}

// 6. Insert categories
console.log('📥 Inserting categories...');
const insert = db.prepare(`
  INSERT INTO catalog_categories (id, name, slug, parent_id, path, is_root, is_leaf, display_order)
  VALUES (@id, @name, @slug, @parent_id, @path, @is_root, @is_leaf, @id)
`);

const insertMany = db.transaction((cats) => {
  for (const cat of cats) {
    insert.run({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parent_id: cat.parent_id,
      path: cat.path,
      is_root: cat.is_root ? 1 : 0,
      is_leaf: cat.is_leaf ? 1 : 0,
    });
  }
});

insertMany(categories);

// 7. Verify
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(is_root) as roots,
    SUM(is_leaf) as leafs
  FROM catalog_categories
`).get();

console.log('\n✅ Import complete!');
console.log(`   Total: ${stats.total}`);
console.log(`   Root categories: ${stats.roots}`);
console.log(`   Leaf categories: ${stats.leafs}`);

// 8. Show sample root categories
console.log('\n📋 Sample root categories:');
const samples = db.prepare(`
  SELECT id, name, slug
  FROM catalog_categories
  WHERE is_root = 1
  ORDER BY name
  LIMIT 10
`).all();

for (const s of samples) {
  console.log(`   ${s.id.toString().padStart(4)} | ${s.name}`);
}

db.close();
console.log('\n🎉 Done!');
