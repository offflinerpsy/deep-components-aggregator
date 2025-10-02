// Apply database migration
import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'var');
const dbPath = join(DATA_DIR, 'db', 'deepagg.sqlite');
const migrationPath = join(__dirname, '..', 'db', 'migrations', '2025-10-02_orders.sql');

console.log('\n📦 Applying Database Migration');
console.log('='.repeat(50));
console.log(`📄 Database: ${dbPath}`);
console.log(`📜 Migration: ${migrationPath}`);

// Ensure database directory exists
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log(`\n📁 Created directory: ${dbDir}`);
}

const db = Database(dbPath);
const migration = readFileSync(migrationPath, 'utf-8');

try {
  db.exec(migration);
  console.log('\n✅ Migration applied successfully');
  
  // Verify tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('orders', 'settings')").all();
  console.log(`\n📋 Created tables:`);
  tables.forEach(t => console.log(`   - ${t.name}`));
  
  // Verify indexes
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_orders%'").all();
  console.log(`\n🔍 Created indexes:`);
  indexes.forEach(i => console.log(`   - ${i.name}`));
  
  // Verify pricing policy
  const policy = db.prepare("SELECT value FROM settings WHERE key='pricing_policy'").get();
  console.log(`\n💰 Default pricing policy:`);
  console.log(`   ${JSON.stringify(JSON.parse(policy.value), null, 2)}`);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Database ready for Orders Backend\n');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
