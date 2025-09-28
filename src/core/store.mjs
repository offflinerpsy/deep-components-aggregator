import { readFileSync, readdirSync } from 'node:fs';
export function loadAllProducts(){
  const dir = 'data/db/products';
  const list = readdirSync(dir).filter(f=>f.endsWith('.json'));
  return list.map(f => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));
}
