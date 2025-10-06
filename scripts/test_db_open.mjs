import { openDb } from './src/db/sql.mjs';

console.log('Testing openDb()...');
const db = openDb();
console.log('DB opened successfully');

const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=?').all('table');
console.log('Tables:', tables.map(t => t.name));

console.log('Test OK');
