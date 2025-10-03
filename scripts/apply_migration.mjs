// Apply database migrations (orders + auth)
import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'var');
const dbPath = join(DATA_DIR, 'db', 'deepagg.sqlite');
const ordersMigrationPath = join(__dirname, '..', 'db', 'migrations', '2025-10-02_orders.sql');
const authMigrationPath = join(__dirname, '..', 'db', 'migrations', '2025-10-02_auth.sql');
const providerLocalVkMigrationPath = join(__dirname, '..', 'db', 'migrations', '2025-10-03_provider_local_vk.sql');

console.log('\n📦 Applying Database Migrations');
console.log('='.repeat(50));
console.log(`📄 Database: ${dbPath}`);
console.log(`📜 Orders Migration: ${ordersMigrationPath}`);
console.log(`📜 Auth   Migration: ${authMigrationPath}`);
console.log(`📜 Provider/VK/Role Migration: ${providerLocalVkMigrationPath}`);

// Ensure database directory exists
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log(`\n📁 Created directory: ${dbDir}`);
}

const db = Database(dbPath);
try {
  const ordersSql = readFileSync(ordersMigrationPath, 'utf-8');
  const authSql = readFileSync(authMigrationPath, 'utf-8');
  const providerSql = readFileSync(providerLocalVkMigrationPath, 'utf-8');

  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('BEGIN;');
  db.exec(ordersSql);
  db.exec(authSql);
  db.exec(providerSql);
  db.exec('COMMIT;');
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('\n✅ Migrations applied successfully');

  // Verify tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('orders', 'settings', 'users', 'sessions') ORDER BY name").all();
  console.log(`\n📋 Tables:`);
  tables.forEach(t => console.log(`   - ${t.name}`));

  // Verify indexes (subset)
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND (name LIKE 'idx_orders%' OR name LIKE 'idx_users%') ORDER BY name").all();
  console.log(`\n🔍 Indexes:`);
  indexes.forEach(i => console.log(`   - ${i.name}`));

  // Counts
  const counts = db.prepare("SELECT 'orders' AS t, COUNT(*) AS c FROM orders UNION ALL SELECT 'users', COUNT(*) FROM users").all();
  console.log('\n# Rows:');
  counts.forEach(r => console.log(`   ${r.t}: ${r.c}`));

  console.log('\n' + '='.repeat(50));
  console.log('✅ Database ready (orders + auth)\n');
} catch (error) {
  try { db.exec('ROLLBACK;'); } catch {}
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
