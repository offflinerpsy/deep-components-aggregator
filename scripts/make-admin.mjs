// Promote a user to admin in the local SQLite DB
// Usage: node scripts/make-admin.mjs --email=<email>
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = Object.fromEntries(process.argv.slice(2).map(a=>{
  const [k,v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

if(!args.email){
  console.error('Missing --email');
  process.exit(1);
}

const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'var');
const dbPath = join(DATA_DIR, 'db', 'deepagg.sqlite');
const db = new Database(dbPath);

const u = db.prepare('SELECT id, email, role, provider FROM users WHERE email=?').get(args.email.toLowerCase());
if(!u){
  console.error('User not found');
  process.exit(2);
}

db.prepare("UPDATE users SET role='admin' WHERE email=?").run(args.email.toLowerCase());
const after = db.prepare('SELECT id, email, role, provider FROM users WHERE email=?').get(args.email.toLowerCase());
console.log(JSON.stringify({ before: u, after }, null, 2));

db.close();
