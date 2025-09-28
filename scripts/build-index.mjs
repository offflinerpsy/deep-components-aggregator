import { loadAllProducts } from '../src/core/store.mjs';
import { buildIndex } from '../src/core/search.mjs';
import { writeFileSync } from 'node:fs';

const items = loadAllProducts();
await buildIndex(items);
writeFileSync('data/idx/search-index.json', JSON.stringify({ ts: Date.now(), count: items.length }, null, 2));
console.log(`INDEX_OK ${items.length}`);
