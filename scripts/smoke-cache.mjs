import { setTimeout as wait } from 'node:timers/promises';
import { request } from 'undici';

const base = process.env.BASE || 'http://127.0.0.1:9201';

function j(url){ return request(url).then(r=>r.body.json()); }

const q = '2N2222';

console.log('1) health'); await j(`${base}/api/health`).then(x=>console.log(x));
console.log('2) search live'); const s1 = await j(`${base}/api/search?q=${encodeURIComponent(q)}`);
console.log({total:s1.meta.total, cached:s1.meta.cached||false});
console.log('3) product'); if(s1.rows[0]){
  const r = s1.rows[0]; const p = await j(`${base}/api/product?src=${r._src}&id=${encodeURIComponent(r._id||r.mpn)}`);
  console.log({mpn:p.product.mpn, minRub:p.product.minRub, vendor:p.product.vendorUrl});
}
console.log('4) search cached'); await wait(200); const s2 = await j(`${base}/api/search?q=${encodeURIComponent(q)}`);
console.log({total:s2.meta.total, cached:s2.meta.cached||false});


