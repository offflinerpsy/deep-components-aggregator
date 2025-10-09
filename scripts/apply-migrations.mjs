#!/usr/bin/env node
// scripts/apply-migrations.mjs
// Apply all SQL migrations from db/migrations/ to the actual database

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Use same DB path as openDb() in src/db/sql.mjs
const DATA_DIR = process.env.DATA_DIR || path.join(rootDir, 'var');
const DB_PATH = path.join(DATA_DIR, 'db', 'deepagg.sqlite');
const MIGRATIONS_DIR = path.join(rootDir, 'db', 'migrations');

// Ensure directories exist
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

console.log(`Database: ${DB_PATH}`);
console.log(`Migrations: ${MIGRATIONS_DIR}\n`);

// Open database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Get all migration files
const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort(); // Alphabetical = chronological (YYYY-MM-DD_name.sql)

console.log(`Found ${migrationFiles.length} migration files:\n`);

for (const file of migrationFiles) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`Applying: ${file}`);

  try {
    db.exec(sql);
    console.log(`✅ ${file} applied successfully\n`);
  } catch (error) {
    // Ignore "already exists" errors (migrations are idempotent with IF NOT EXISTS)
    if (error.message.includes('already exists')) {
      console.log(`⏭️  ${file} already applied (skipped)\n`);
    } else {
      console.error(`❌ ${file} failed:`, error.message);
      process.exit(1);
    }
  }
}

console.log('✅ All migrations applied successfully!');
db.close();
