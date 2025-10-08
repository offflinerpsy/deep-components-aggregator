// TME diagnostic script: performs Search + GetProducts for first N symbols
// Usage: node scripts/diag-tme.mjs "QUERY" [limit]
// No try/catch per repository standards; rely on promise rejection.

import { tmeSearchProducts, tmeGetProduct } from '../src/integrations/tme/client.mjs';

const query = process.argv[2];
const limit = Number(process.argv[3] || 5);

if (!query) {
  console.error('Usage: node scripts/diag-tme.mjs "QUERY" [limit]');
  process.exit(1);
}

const token = process.env.TME_TOKEN;
const secret = process.env.TME_SECRET;

if (!token || !secret) {
  console.error('Missing TME_TOKEN or TME_SECRET in environment');
  process.exit(2);
}

const start = Date.now();

Promise.resolve()
  .then(() => tmeSearchProducts({ token, secret, query }))
  .then(searchResp => {
    const productList = searchResp?.data?.Data?.ProductList || searchResp?.data?.ProductList || [];
    const symbols = productList.slice(0, limit).map(p => p.Symbol).filter(Boolean);
    console.log(JSON.stringify({
      step: 'search',
      query,
      count: productList.length,
      symbols
    }, null, 2));
    if (symbols.length === 0) {
      return { data: { Data: { ProductList: [] } } };
    }
    return tmeGetProduct({ token, secret, symbols });
  })
  .then(detailsResp => {
    const list = detailsResp?.data?.Data?.ProductList || [];
    const normalized = list.map(p => ({
      Symbol: p.Symbol,
      HasPrice: Array.isArray(p.PriceList) && p.PriceList.length > 0,
      PriceBreaks: Array.isArray(p.PriceList) ? p.PriceList.length : 0,
      InStock: p.InStock,
      Unit: p.Unit,
      Producer: p.Producer
    }));
    console.log(JSON.stringify({
      step: 'details',
      products: normalized,
      elapsed_ms: Date.now() - start
    }, null, 2));
  })
  .catch(err => {
    console.error('TME diagnostic failure:', err.message);
    console.error(err.stack);
    process.exit(3);
  });
