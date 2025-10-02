// Deep Components Aggregator - CLEAN REWRITE
// v3.0 - With TME, Mouser, Farnell support

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Database
import { openDb, readCachedSearch, cacheSearch, readCachedProduct, cacheProduct } from './src/db/sql.mjs';

// Mouser
import { mouserSearchByKeyword, mouserSearchByPartNumber } from './src/integrations/mouser/client.mjs';
import { normMouser } from './src/integrations/mouser/normalize.mjs';

// Farnell
import { farnellByMPN, farnellByKeyword } from './src/integrations/farnell/client.mjs';
import { normFarnell } from './src/integrations/farnell/normalize.mjs';

// TME
import { tmeSearchProducts } from './src/integrations/tme/client.mjs';
import { normTME } from './src/integrations/tme/normalize.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🚀 Deep Components Aggregator v3.0');
console.log('='.repeat(50));

const app = express();
const db = openDb();

const keys = {
  mouser: process.env.MOUSER_API_KEY || '',
  farnell: process.env.FARNELL_API_KEY || '',
  farnellRegion: process.env.FARNELL_REGION || 'uk.farnell.com',
  tmeToken: process.env.TME_TOKEN || '',
  tmeSecret: process.env.TME_SECRET || ''
};

console.log('\n📋 API Configuration:');
console.log(`   Mouser: ${keys.mouser ? '✅ Configured' : '❌ Missing'}`);
console.log(`   TME: ${keys.tmeToken && keys.tmeSecret ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Farnell: ${keys.farnell ? '✅ Configured' : '❌ Missing'}`);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0',
    ts: Date.now(),
    sources: {
      mouser: keys.mouser ? 'ready' : 'disabled',
      tme: (keys.tmeToken && keys.tmeSecret) ? 'ready' : 'disabled',
      farnell: keys.farnell ? 'ready' : 'disabled'
    }
  });
});

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const startTime = Date.now();
    
    console.log(`\n🔍 Search: "${q}"`);
    
    if (!q) {
      return res.json({ ok: true, q, rows: [], meta: { source: 'none', total: 0 } });
    }

    // Check cache
    const TTL = 7 * 24 * 60 * 60 * 1000;
    const cached = readCachedSearch(db, q.toLowerCase(), TTL);
    if (cached && req.query.fresh !== '1') {
      console.log(`📦 Cache HIT: ${cached.rows.length} rows from ${cached.meta.source}`);
      return res.json({ ok: true, q, rows: cached.rows, meta: { ...cached.meta, cached: true } });
    }

    let rows = [];
    let source = 'none';

    // STEP 1: Try Mouser (ALWAYS keyword search first)
    if (keys.mouser) {
      try {
        console.log('   → Mouser: keyword search...');
        const result = await mouserSearchByKeyword({ apiKey: keys.mouser, q });
        const parts = result?.data?.SearchResults?.Parts || [];
        
        if (parts.length > 0) {
          rows = parts.map(normMouser);
          source = 'mouser';
          console.log(`   ✅ Mouser: ${parts.length} results`);
        } else {
          console.log(`   ⚠️  Mouser: 0 results`);
        }
      } catch (error) {
        console.log(`   ❌ Mouser error: ${error.message}`);
      }
    }

    // STEP 2: Try TME if Mouser failed
    if (rows.length === 0 && keys.tmeToken && keys.tmeSecret) {
      try {
        console.log('   → TME: searching...');
        const result = await tmeSearchProducts({
          token: keys.tmeToken,
          secret: keys.tmeSecret,
          q
        });
        
        const products = result?.data?.ProductList || [];
        if (products.length > 0) {
          rows = products.map(normTME);
          source = 'tme';
          console.log(`   ✅ TME: ${products.length} results`);
        } else {
          console.log(`   ⚠️  TME: 0 results`);
        }
      } catch (error) {
        console.log(`   ❌ TME error: ${error.message}`);
      }
    }

    // STEP 3: Try Farnell as last resort
    if (rows.length === 0 && keys.farnell) {
      try {
        console.log('   → Farnell: keyword search...');
        const result = await farnellByKeyword({
          apiKey: keys.farnell,
          region: keys.farnellRegion,
          q,
          limit: 25
        });
        
        const products = result?.data?.products || [];
        if (products.length > 0) {
          rows = products.map(p => normFarnell(p, keys.farnellRegion));
          source = 'farnell';
          console.log(`   ✅ Farnell: ${products.length} results`);
        } else {
          console.log(`   ⚠️  Farnell: 0 results`);
        }
      } catch (error) {
        console.log(`   ❌ Farnell error: ${error.message}`);
      }
    }

    // Cache results
    if (rows.length > 0) {
      cacheSearch(db, q.toLowerCase(), rows, { source });
    }

    const elapsed = Date.now() - startTime;
    console.log(`⏱️  Completed in ${elapsed}ms: ${rows.length} results from ${source}\n`);

    res.json({ ok: true, q, rows, meta: { source, total: rows.length, cached: false, elapsed } });
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

    console.log(`📦 Product: ${src}/${id}`);

    if (!src || !id) {
      return res.status(400).json({ ok: false, code: 'bad_params' });
    }

    // Check cache
    const TTL = 30 * 24 * 60 * 60 * 1000;
    const cached = readCachedProduct(db, src, id, TTL);
    if (cached) {
      console.log('   📦 Cache HIT');
      return res.json({ ok: true, product: cached, meta: { cached: true } });
    }

    let product = null;

    if (src === 'mouser' && keys.mouser) {
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
    } else if (src === 'tme' && keys.tmeToken && keys.tmeSecret) {
      const result = await tmeGetProduct({
        token: keys.tmeToken,
        secret: keys.tmeSecret,
        symbol: id
      });
      const products = result?.data?.ProductList || [];
      if (products[0]) {
        product = normTME(products[0]);
      }
    } else if (src === 'farnell' && keys.farnell) {
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
      console.log('   ✅ Product found');
      return res.json({ ok: true, product, meta: { cached: false } });
    }

    console.log('   ❌ Product not found');
    res.status(404).json({ ok: false, code: 'not_found' });
  } catch (error) {
    console.error('❌ Product error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = Number(process.env.PORT || 9201);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ Server Started');
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(50) + '\n');
});

server.on('error', (error) => {
  console.error('\n❌ Server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ Unhandled rejection:', reason);
  process.exit(1);
});
