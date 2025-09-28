import express from 'express';
import { loadAllProducts } from '../core/store.mjs';
import { buildIndex, searchIndex } from '../core/search.mjs';
import { readFileSync, existsSync } from 'node:fs';

const router = express.Router();

// bootstrap index в памяти процесса
let idxReady = false;
async function ensureIndex(){
  if (idxReady) return;
  const items = loadAllProducts();
  await buildIndex(items);
  idxReady = true;
}

// health
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), ts: Date.now() });
});

// /api/search?q=...
router.get('/search', async (req, res) => {
  const q = String(req.query.q||'').trim();
  if (!q) { res.json({ count: 0, items: [] }); return; }
  await ensureIndex();
  const r = await searchIndex(q, { limit: 50 });
  const items = r.hits.map(h=>h.document).map(d=>({
    mpn: d.mpn, brand: d.brand, title: d.title, desc: d.desc,
    regions: d.regions, price_rub: Number.isFinite(d.price)? d.price : null, image: d.image
  }));
  res.json({ count: items.length, items });
});

// /api/product?mpn=...
router.get('/product', (req, res) => {
  const mpn = String(req.query.mpn||'').trim();
  if (!mpn) { res.status(400).json({ error: 'MPN_REQUIRED' }); return; }
  const ppath = `data/db/products/${mpn}.json`;
  if (!existsSync(ppath)) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
  const p = JSON.parse(readFileSync(ppath, 'utf8'));
  res.json(p);
});

// SSE mock: /api/live/search
router.get('/live/search', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const q = String(req.query.q||'').trim();
  let n = 0;
  const timer = setInterval(() => {
    n += 1;
    const data = { type: 'progress', step: n, q };
    res.write(`event: progress\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (n >= 3) {
      res.write(`event: done\n`);
      res.write(`data: {\"ok\":true}\n\n`);
      clearInterval(timer);
      res.end();
    }
  }, 500);

  req.on('close', () => { clearInterval(timer); });
});

// /api/order (MVP)
router.use(express.json());
router.post('/order', (req,res)=>{
  const { mpn, qty, fio, email, messenger } = req.body||{};
  if (!mpn || !qty || !email) { res.status(400).json({ error: 'BAD_FORM' }); return; }
  const id = Date.now().toString(36);
  const path = `data/orders/${id}.json`;
  import('node:fs').then(fs=>{
    fs.mkdirSync('data/orders', { recursive: true });
    fs.writeFileSync(path, JSON.stringify({ id, ts: Date.now(), mpn, qty, fio, email, messenger }, null, 2));
    res.json({ ok: true, id });
  });
});

export default router;
