// E2E Admin smoke: register user, promote to admin, create orders, verify admin endpoints
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HOST = process.env.HOST || 'http://localhost:9201';
const email = process.env.TEST_EMAIL || 'admin_smoke@test.local';
const password = process.env.TEST_PASS || 'admin12345';

let cookieJar = {};

function setCookieFromResponse(res) {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return;
  // Grab first cookie (deep_agg_sid)
  const parts = setCookie.split(';')[0];
  const [name, value] = parts.split('=');
  cookieJar[name] = value;
}

function cookieHeader() {
  const pairs = Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`);
  return pairs.join('; ');
}

async function request(method, path, body, useCookies = false) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(useCookies && Object.keys(cookieJar).length ? { 'Cookie': cookieHeader() } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  setCookieFromResponse(res);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { res, data };
}

const post = (path, body, useCookies = false) => request('POST', path, body, useCookies);
const patch = (path, body, useCookies = false) => request('PATCH', path, body, useCookies);

async function get(path, useCookies = false) {
  const res = await fetch(`${HOST}${path}`, {
    headers: {
      ...(useCookies && Object.keys(cookieJar).length ? { 'Cookie': cookieHeader() } : {})
    }
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { res, data };
}

function promoteToAdmin(emailLower) {
  const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'var');
  const dbPath = join(DATA_DIR, 'db', 'deepagg.sqlite');
  const db = new Database(dbPath);
  // Ensure 'role' column exists
  const cols = db.prepare("PRAGMA table_info(users)").all();
  const hasRole = cols.some(c => c.name === 'role');
  if (!hasRole) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';");
    db.exec("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);");
  }
  const before = db.prepare('SELECT id, email, role FROM users WHERE email=?').get(emailLower);
  db.prepare("UPDATE users SET role='admin' WHERE email=?").run(emailLower);
  const after = db.prepare('SELECT id, email, role FROM users WHERE email=?').get(emailLower);
  db.close();
  return { before, after };
}

function pp(obj) { return JSON.stringify(obj, null, 2); }

async function main() {
  const summary = { steps: [] };

  // Health
  const health = await get('/api/health');
  summary.steps.push({ step: 'health', status: health.res.status, data: health.data });
  if (health.res.status !== 200) throw new Error('Health check failed');

  // Register
  const reg = await post('/auth/register', { email, password, confirmPassword: password, name: 'Admin Smoke' });
  summary.steps.push({ step: 'register', status: reg.res.status, data: reg.data });
  if (![200,201,409].includes(reg.res.status)) throw new Error('Registration failed');

  // If already exists, login
  if (reg.res.status === 409) {
    const login = await post('/auth/login', { email, password }, true);
    summary.steps.push({ step: 'login', status: login.res.status, data: login.data });
    if (login.res.status !== 200) throw new Error('Login failed');
  }

  // Promote to admin
  const prom = promoteToAdmin(email.toLowerCase());
  summary.steps.push({ step: 'promote', before: prom.before, after: prom.after });
  if (!prom.after || prom.after.role !== 'admin') throw new Error('Promote to admin failed');

  // Create two orders
  const orderBody = (mpn, mfr, qty) => ({
    customer: { name: 'Admin Smoke', contact: { email } },
    item: { mpn, manufacturer: mfr, qty }
  });
  const o1 = await post('/api/order', orderBody('LM317T', 'Texas Instruments', 3), true);
  const o2 = await post('/api/order', orderBody('1N4148W-TP', 'Micro Commercial Components (MCC)', 10), true);
  summary.steps.push({ step: 'orders', created: [o1.data, o2.data], statuses: [o1.res.status, o2.res.status] });
  if (o1.res.status !== 201 || o2.res.status !== 201) throw new Error('Order creation failed');

  // Admin list
  const list = await get('/api/admin/orders?limit=5', true);
  summary.steps.push({ step: 'admin_list', status: list.res.status, count: list.data?.orders?.length, ids: (list.data?.orders||[]).map(x=>x.id) });
  if (list.res.status !== 200) throw new Error('Admin orders list failed');

  // Admin settings get/patch
  const sget = await get('/api/admin/settings/pricing', true);
  summary.steps.push({ step: 'settings_get', status: sget.res.status, policy: sget.data?.policy });
  if (sget.res.status !== 200) throw new Error('Settings GET failed');

  const newPolicy = { markup_percent: 0.33, markup_fixed_rub: 777 };
  const spatch = await patch('/api/admin/settings/pricing', newPolicy, true);
  summary.steps.push({ step: 'settings_patch', status: spatch.res.status, policy: spatch.data?.policy });
  if (spatch.res.status !== 200) throw new Error('Settings PATCH failed');

  const sget2 = await get('/api/admin/settings/pricing', true);
  summary.steps.push({ step: 'settings_verify', status: sget2.res.status, policy: sget2.data?.policy });
  if (sget2.data?.policy?.markup_fixed_rub !== 777) throw new Error('Settings verify failed');

  console.log('E2E ADMIN SMOKE: OK');
  console.log(pp(summary));
}

main().catch(err => {
  console.error('E2E ADMIN SMOKE: FAIL');
  console.error(err);
  process.exit(1);
});
