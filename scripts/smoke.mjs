import { execSync } from 'node:child_process';
function curl(p){ return execSync(`curl -sS ${p}`, { stdio:'pipe' }).toString('utf8'); }
function code(p){ return Number(execSync(`curl -s -o /dev/null -w "%{http_code}" ${p}`, { stdio:'pipe' }).toString('utf8')); }
try {
  const root = code('http://127.0.0.1:9201/');
  const health = curl('http://127.0.0.1:9201/api/health');
  const s1 = curl('http://127.0.0.1:9201/api/search?q=LM317');
  const s2 = curl('http://127.0.0.1:9201/api/search?q=1N4148');
  const s3 = curl('http://127.0.0.1:9201/api/search?q=%D1%82%D1%80%D0%B0%D0%BD%D0%B7%D0%B8%D1%81%D1%82%D0%BE%D1%80');
  const p = curl('http://127.0.0.1:9201/api/product?mpn=LM317');
  console.log('SMOKE_OK', JSON.stringify({ root, health: JSON.parse(health).status, s1: s1.length, s2: s2.length, s3: s3.length, product: p.length }));
} catch(e){
  console.error('SMOKE_FAIL', e.message);
  process.exit(4);
}
