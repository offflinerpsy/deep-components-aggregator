import Database from 'better-sqlite3';
import path from 'node:path';

const db = new Database(path.resolve('data/db/agg.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

export const insertProduct = (p) => {
  if (!p.mpn && !p.title) return 0;
  const sel = db.prepare('SELECT id FROM products WHERE mpn = ?').get(p.mpn||null);
  if (sel?.id) return sel.id;
  const ins = db.prepare(`INSERT INTO products (mpn,brand,title,description,package,image_url,datasheet_urls)
    VALUES (@mpn,@brand,@title,@description,@package,@image_url,@datasheet_urls)`);
  const {lastInsertRowid} = ins.run({
    mpn: p.mpn||null, brand: p.brand||null, title: p.title||null,
    description: p.description||null, package: p.package||null,
    image_url: p.image_url||null, datasheet_urls: JSON.stringify(p.datasheet_urls||[])
  });
  return Number(lastInsertRowid);
};

export const upsertOffer = (product_id, o) => {
  if (!product_id) return 0;
  const ins = db.prepare(`INSERT INTO offers (product_id,region,stock,price_min_rub,source,url,provider)
  VALUES (?,?,?,?,?,?,?)`);
  ins.run(product_id, o.region||null, o.stock||0, o.price_min_rub||null, o.source||null, o.url||null, o.provider||null);
  return 1;
};

export const recordSearch = (id, q, kind, total_found) => {
  const ins = db.prepare(`INSERT OR REPLACE INTO searches (id,q,kind,started_at,finished_at,total_found)
    VALUES (?,?,?,?,?,?)`);
  const now = new Date().toISOString().replace('T',' ').slice(0,19);
  ins.run(id, q, kind, now, now, total_found||0);
};

export const searchQuick = (q) => {
  const like = `%${q}%`;
  const st = db.prepare(`SELECT p.*, 
     COALESCE((SELECT MIN(price_min_rub) FROM offers o WHERE o.product_id=p.id), NULL) as min_price_rub,
     COALESCE((SELECT SUM(stock) FROM offers o2 WHERE o2.product_id=p.id), 0) as total_stock
     FROM products p
     WHERE p.mpn LIKE ? OR p.title LIKE ? OR p.brand LIKE ?
     ORDER BY (p.mpn LIKE ?) DESC, min_price_rub ASC NULLS LAST LIMIT 50`);
  return st.all(like, like, like, like);
};

export default db;
