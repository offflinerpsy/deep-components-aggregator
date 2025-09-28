import express from 'express';
import { loadAllProducts } from '../core/store.mjs';
import { buildIndex, searchIndex } from '../core/search.mjs';
import { readFileSync } from 'node:fs';

const router = express.Router();

// bootstrap index в памяти процесса
let idxReady = false;
async function ensureIndex(){
  if (idxReady) return;
  const items = loadAllProducts();
  await buildIndex(items);
  idxReady = true;
}

// /api/search?q=...
router.get('/search', async (req, res) => {
  const q = String(req.query.q||'').trim();
  if (!q) return res.json({ count: 0, items: [] });
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
  if (!mpn) return res.status(400).json({ error: 'MPN_REQUIRED' });
  try {
    const p = JSON.parse(readFileSync(`data/db/products/${mpn}.json`, 'utf8'));
    return res.json(p);
  } catch {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
});

// /api/order (модалка оформляет заявку)
router.use(express.json());
router.post('/order', (req,res)=>{
  const { mpn, qty, fio, email, messenger } = req.body||{};
  if (!mpn || !qty || !email) return res.status(400).json({ error: 'BAD_FORM' });
  // простая запись в файл (как MVP)
  const id = Date.now().toString(36);
  const path = `data/orders/${id}.json`;
  import('node:fs').then(fs=>{
    fs.mkdirSync('data/orders', { recursive: true });
    fs.writeFileSync(path, JSON.stringify({ id, ts: Date.now(), mpn, qty, fio, email, messenger }, null, 2));
    res.json({ ok: true, id });
  });
});

export default router;
