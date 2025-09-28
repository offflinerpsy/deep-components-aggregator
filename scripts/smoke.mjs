import { execSync } from 'node:child_process';
function curl(p){ return execSync(`curl -sS ${p}`, { stdio:'pipe' }).toString('utf8'); }
try {
  const a = curl('http://127.0.0.1:9201/api/search?q=LM317');
  const b = curl('http://127.0.0.1:9201/api/product?mpn=LM317');
  console.log('SMOKE_OK', JSON.stringify({ search: a.length, product: b.length }));
} catch(e){
  console.error('SMOKE_FAIL', e.message);
  process.exit(4);
}
