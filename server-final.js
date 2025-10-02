// Deep Components Aggregator - FINAL WORKING VERSION
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb, readCachedSearch, cacheSearch, readCachedProduct, cacheProduct } from './src/db/sql.mjs';
import { mouserSearchByKeyword, mouserSearchByPartNumber } from './src/integrations/mouser/client.mjs';
import { normMouser } from './src/integrations/mouser/normalize.mjs';
import { farnellByMPN, farnellByKeyword } from './src/integrations/farnell/client.mjs';
import { normFarnell } from './src/integrations/farnell/normalize.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Deep Components Aggregator...');

const app = express();
const db = openDb();

const keys = {
  mouser: process.env.MOUSER_API_KEY || '',
  farnell: process.env.FARNELL_API_KEY || '',
  farnellRegion: process.env.FARNELL_REGION || 'uk.farnell.com'
};

console.log('🔑 API Keys:', {
  mouser: keys.mouser ? '✅ configured' : '❌ missing',
  farnell: keys.farnell ? '✅ configured' : '❌ missing'
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ts: Date.now(),
    keys: {
      mouser: keys.mouser ? 'configured' : 'missing',
      farnell: keys.farnell ? 'configured' : 'missing'
    }
  });
});

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    console.log('🔍 Search request:', q);
    
    if (!q) {
      return res.json({ ok: true, q, rows: [], meta: { source: 'none', total: 0 } });
    }

    // Check cache
    const TTL = 7 * 24 * 60 * 60 * 1000;
    const cached = readCachedSearch(db, q.toLowerCase(), TTL);
    if (cached && req.query.fresh !== '1') {
      console.log('📦 Cache hit:', cached.rows.length, 'rows');
      return res.json({ ok: true, q, rows: cached.rows, meta: { ...cached.meta, cached: true } });
    }

    // Determine search strategy
    const isCyrillic = /[А-Яа-яЁё]/.test(q);
    const isLikelyMPN = /^[A-Za-z0-9][A-Za-z0-9\-\._]{1,}$/i.test(q) && /\d/.test(q);

    let rows = [];
    let source = 'none';

    // Try Mouser first for non-Cyrillic
    if (!isCyrillic && keys.mouser) {
      try {
        console.log('🐭 Trying Mouser API...');
        const method = isLikelyMPN ? mouserSearchByPartNumber : mouserSearchByKeyword;
        const param = isLikelyMPN ? { apiKey: keys.mouser, mpn: q } : { apiKey: keys.mouser, q };
        const result = await method(param);
        
        const parts = result?.data?.SearchResults?.Parts || [];
        console.log('🐭 Mouser returned:', parts.length, 'parts');
        if (parts.length > 0) {
          rows = parts.map(normMouser);
          source = 'mouser';
        }
      } catch (e) {
        console.error('❌ Mouser API error:', e.message);
      }
    }

    // Fallback to Farnell
    if (rows.length === 0 && keys.farnell) {
      try {
        console.log('🔷 Trying Farnell API...');
        const method = isLikelyMPN ? farnellByMPN : farnellByKeyword;
        const result = await method({
          apiKey: keys.farnell,
          region: keys.farnellRegion,
          q,
          limit: 25
        });
        
        const products = result?.data?.products || [];
        console.log('🔷 Farnell returned:', products.length, 'products');
        rows = products.map(p => normFarnell(p, keys.farnellRegion));
        source = 'farnell';
      } catch (e) {
        console.error('❌ Farnell API error:', e.message);
      }
    }

    // Cache results
    if (rows.length > 0) {
      cacheSearch(db, q.toLowerCase(), rows, { source });
      console.log('💾 Cached', rows.length, 'rows');
    }

    console.log('✅ Returning', rows.length, 'rows from', source);
    res.json({ ok: true, q, rows, meta: { source, total: rows.length, cached: false } });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Product endpoint  
app.get('/api/product', async (req, res) => {
  try {
    const src = String(req.query.src || '').toLowerCase();
    const id = String(req.query.id || '').trim();

    console.log('📦 Product request:', src, id);

    if (!src || !id) {
      return res.status(400).json({ ok: false, code: 'bad_params' });
    }

    // Check cache
    const TTL = 30 * 24 * 60 * 60 * 1000;
    const cached = readCachedProduct(db, src, id, TTL);
    if (cached) {
      console.log('📦 Cache hit for product');
      return res.json({ ok: true, product: cached, meta: { cached: true } });
    }

    let product = null;

    if (src === 'mouser' && keys.mouser) {
      console.log('🐭 Fetching from Mouser...');
      const result = await mouserSearchByPartNumber({ apiKey: keys.mouser, mpn: id });
      const parts = result?.data?.SearchResults?.Parts || [];
      if (parts[0]) {
        product = {
          mpn: parts[0].ManufacturerPartNumber,
          manufacturer: parts[0].Manufacturer,
          description: parts[0].Description,
          photo: parts[0].ImagePath || parts[0].ImageURL,
          source: 'mouser'
        };
      }
    } else if (src === 'farnell' && keys.farnell) {
      console.log('🔷 Fetching from Farnell...');
      const result = await farnellByMPN({
        apiKey: keys.farnell,
        region: keys.farnellRegion,
        q: id,
        limit: 1
      });
      const products = result?.data?.products || [];
      if (products[0]) {
        product = {
          mpn: products[0].manufacturerPartNumber,
          manufacturer: products[0].brandName,
          description: products[0].displayName,
          photo: products[0].image ? `https://uk.farnell.com${products[0].image.baseName}` : '',
          source: 'farnell'
        };
      }
    }

    if (product) {
      cacheProduct(db, src, id, product);
      console.log('✅ Product found and cached');
      return res.json({ ok: true, product, meta: { cached: false } });
    }

    console.log('❌ Product not found');
    res.status(404).json({ ok: false, code: 'not_found' });
  } catch (error) {
    console.error('❌ Product error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = Number(process.env.PORT || 9201);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ Deep Components Aggregator');
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/health\n`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});
