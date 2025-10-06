// Quick DB structure check
import Database from 'better-sqlite3';

const db = new Database('var/db/deepagg.sqlite');

console.log('\n=== DATABASE TABLES ===');
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`).all();

tables.forEach(t => console.log(`  - ${t.name}`));

console.log('\n=== ORDERS TABLE STRUCTURE ===');
try {
  const ordersInfo = db.prepare('PRAGMA table_info(orders)').all();
  ordersInfo.forEach(col => {
    console.log(`  ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
  });
  
  console.log('\n=== SAMPLE ORDER (if any) ===');
  const sampleOrder = db.prepare('SELECT * FROM orders LIMIT 1').get();
  if (sampleOrder) {
    console.log('  Status:', sampleOrder.status);
    console.log('  Has user_id column:', 'user_id' in sampleOrder);
  } else {
    console.log('  No orders in database');
  }
} catch (err) {
  console.log('  Orders table does not exist:', err.message);
}

console.log('\n=== USERS TABLE (AUTH) ===');
try {
  const usersInfo = db.prepare('PRAGMA table_info(users)').all();
  if (usersInfo.length > 0) {
    console.log('  ✅ Users table EXISTS');
    usersInfo.forEach(col => {
      console.log(`    ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}`);
    });
  } else {
    console.log('  ❌ Users table DOES NOT exist');
  }
} catch (err) {
  console.log('  ❌ Users table DOES NOT exist:', err.message);
}

console.log('\n=== SESSIONS TABLE (AUTH) ===');
try {
  const sessionsInfo = db.prepare('PRAGMA table_info(sessions)').all();
  if (sessionsInfo.length > 0) {
    console.log('  ✅ Sessions table EXISTS');
  } else {
    console.log('  ❌ Sessions table DOES NOT exist');
  }
} catch (err) {
  console.log('  ❌ Sessions table DOES NOT exist:', err.message);
}

db.close();
console.log('\n');
