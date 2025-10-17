// Deep Components Aggregator - CLEAN REWRITE
// v3.0 - With TME, Mouser, Farnell support

// Explicit dotenv load (side-effect import was unreliable in current runtime)
import dotenv from 'dotenv';
// Force override so stale exported HTTP_PROXY=18080 is replaced by .env value 40000
dotenv.config({ path: '.env', override: true });
// Early diagnostic for SESSION_SECRET availability (prevents silent crash loops)
if (!process.env.SESSION_SECRET) {
  console.error('[boot] SESSION_SECRET missing after dotenv load');
} else {
  const s = process.env.SESSION_SECRET;
  const masked = s.length > 12 ? s.slice(0,4) + '***' + s.slice(-4) : '***';
  console.log('[boot] SESSION_SECRET loaded len=%d value=%s', s.length, masked);
}
// Enable proxy-by-default before any network clients load
import './src/bootstrap/proxy.mjs';

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'node:perf_hooks';

// Database
import { openDb, readCachedSearch, cacheSearch, readCachedProduct, cacheProduct } from './src/db/sql.mjs';

// Manual Products
import { getManualProduct } from './src/search/manualProducts.mjs';

// Mouser
import { mouserSearchByKeyword, mouserSearchByPartNumber } from './src/integrations/mouser/client.mjs';

// Farnell
import { farnellByMPN } from './src/integrations/farnell/client.mjs';

// TME
import { tmeSearchProducts, tmeGetProduct } from './src/integrations/tme/client.mjs';

// DigiKey
import { digikeyGetProduct, digikeySearch } from './src/integrations/digikey/client.mjs';

// Search orchestration
import { orchestrateProviderSearch } from './src/search/providerOrchestrator.mjs';

// Currency
import { toRUB } from './src/currency/toRUB.mjs';
import { refreshRates, getRatesAge, loadRates } from './src/currency/cbr.mjs';

// Product data merging
import { mergeProductData } from './src/utils/mergeProductData.mjs';

// SSE utilities
import * as sse from './lib/sse.mjs';

// Auth & Session
import passport from 'passport';
import { configurePassport } from './config/passport.mjs';
import { createSessionMiddleware } from './config/session.mjs';
import { mountAuthRoutes } from './api/auth.js';
import { mountUserOrderRoutes } from './api/user.orders.js';

// Metrics & Rate Limiting
import { createOrderRateLimiter, createAuthRateLimiter, createGeneralRateLimiter } from './middleware/rateLimiter.js';
import {
  searchRequestsTotal,
  searchErrorsTotal,
  searchLatencySeconds,
  searchResultsBySource,
  cacheOperations
} from './metrics/registry.js';

// Orders API
import { createOrderHandler } from './api/order.js';
import { mountAdminRoutes } from './api/admin.orders.js';
import { mountAdminSettingsRoutes } from './api/admin.settings.js';
import { mountAdminNotificationsRoutes } from './api/admin.notifications.js';
import { mountAdminPagesRoutes } from './api/admin.pages.mjs';
import { mountAdminProductRoutes } from './api/admin.products.js';
import { checkEmailHandler } from './api/auth-check.js';
// Import static pages routes
import staticPagesModule from './api/static-pages.mjs';
const { mountStaticPagesRoutes } = staticPagesModule;
import { mountSettingsRoutes } from './api/settings.js';

import { adminRouter } from './src/admin/index.mjs'
console.log('✅ AdminJS loaded')

// AdminJS API Routes
import {
  getStaticPages,
  getStaticPageBySlug,
  createOrder as createAdminOrder,
  updateApiHealth,
  incrementSearchStats
} from './src/api/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🚀 Deep Components Aggregator v3.2');
console.log('='.repeat(50));

const app = express();
// Trust proxy to ensure correct secure cookies and IP handling behind CDN/NGINX
app.set('trust proxy', 1);

// JSON body parser
app.use(express.json({ limit: '1mb' }));

const db = openDb();

// Logger (simple console logger)
const logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || '')
};

// Configure session store (SQLite)
const sessionMiddleware = createSessionMiddleware();
app.use(sessionMiddleware);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies (local, Google, Yandex)
configurePassport(db, logger);

const keys = {
  mouser: process.env.MOUSER_API_KEY || '',
  farnell: process.env.FARNELL_API_KEY || '',
  farnellRegion: process.env.FARNELL_REGION || 'uk.farnell.com',
  tmeToken: process.env.TME_TOKEN || '',
  tmeSecret: process.env.TME_SECRET || '',
  digikeyClientId: process.env.DIGIKEY_CLIENT_ID || '',
  digikeyClientSecret: process.env.DIGIKEY_CLIENT_SECRET || ''
};

console.log('\n📋 API Configuration:');
console.log(`   Mouser: ${keys.mouser ? '✅ Configured' : '❌ Missing'}`);
console.log(`   TME: ${keys.tmeToken && keys.tmeSecret ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Farnell: ${keys.farnell ? '✅ Configured' : '❌ Missing'}`);
console.log(`   DigiKey: ${keys.digikeyClientId && keys.digikeyClientSecret ? '✅ Configured' : '❌ Missing'}`);

// Static files with proper MIME types
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    console.log('[STATIC] Serving file:', filePath);
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));
app.use('/ui', express.static(path.join(__dirname, 'ui'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// =========================================
// FRONTEND HTML ROUTES (EJS templates replacing Next.js)
// =========================================
import { mountFrontendRoutes } from './api/frontend.routes.mjs';
mountFrontendRoutes(app, db);

// Network diagnostics (admin only)
import { diagnosticsHandler } from './api/diag.net.mjs';
app.get('/api/diag/net', diagnosticsHandler);

// Lightweight runtime diagnostics (CPU, memory, event loop)
app.get('/api/diag/runtime', async (req, res) => {
  const mem = process.memoryUsage();
  const resource = process.resourceUsage ? process.resourceUsage() : null;
  const cpu = process.cpuUsage();
  const uptime = process.uptime();
  const versions = process.versions;
  const envProxy = {
    HTTP_PROXY: process.env.HTTP_PROXY || null,
    HTTPS_PROXY: process.env.HTTPS_PROXY || null,
    NO_PROXY: process.env.NO_PROXY || null
  };
  const eventLoopDelayNs = (await import('node:perf_hooks')).performance?.eventLoopUtilization?.() || null;

  res.json({
    ts: Date.now(),
    uptime_s: uptime,
    pid: process.pid,
    node: versions.node,
    v8: versions.v8,
    envProxy,
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers
    },
    cpu: {
      user_us: cpu.user,
      system_us: cpu.system
    },
    resource,
    eventLoop: {
      utilization: eventLoopDelayNs || null
    }
  });
});

// Vitrine (cache-only browsing)
import mountVitrine from './api/vitrine.mjs';
mountVitrine(app);

// Search diagnostics (why no results?)
import mountSearchReasons from './api/search-reasons.mjs';
// Search normalization helpers
import { processSearchQuery, selectSearchStrategy } from './src/search/searchIntegration.mjs';
mountSearchReasons(app, { keys });

// Health check
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  const sources = {};
  const trustProxy = app.get('trust proxy');
  const behindProxy = Boolean(trustProxy);
  const probe = req.query.probe === 'true'; // ?probe=true for deep health check

  // DigiKey health check
  if (keys.digikeyClientId && keys.digikeyClientSecret) {
    if (probe) {
      try {
        const probeStart = Date.now();
        // Quick probe - just check OAuth token endpoint
        const tokenCheck = await Promise.race([
          fetch(`${process.env.DIGIKEY_API_BASE || 'https://api.digikey.com'}/v1/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `client_id=${keys.digikeyClientId}&client_secret=${keys.digikeyClientSecret}&grant_type=client_credentials`
          }).then(r => ({ ok: r.ok, status: r.status })),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);
        const probeLatency = Date.now() - probeStart;
        sources.digikey = {
          status: tokenCheck.ok ? 'ready' : 'degraded',
          note: tokenCheck.ok ? 'OAuth working' : `HTTP ${tokenCheck.status}`,
          latency_ms: probeLatency
        };
      } catch (err) {
        sources.digikey = {
          status: 'down',
          note: err.message === 'timeout' ? 'Timeout >5s' : err.message,
          latency_ms: 5000
        };
      }
    } else {
      sources.digikey = {
        status: 'configured',
        note: 'OAuth credentials present'
      };
    }
  } else {
    sources.digikey = { status: 'disabled', note: 'No credentials' };
  }

  // Mouser health check
  if (keys.mouser) {
    if (probe) {
      try {
        const probeStart = Date.now();
        const testUrl = `https://api.mouser.com/api/v1/search/partnumber?apiKey=${keys.mouser}`;
        const probeCheck = await Promise.race([
          fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ SearchByPartnumberRequest: { MouserPartNumber: 'TEST' } })
          }).then(r => ({ ok: r.status < 500, status: r.status })),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);
        const probeLatency = Date.now() - probeStart;
        sources.mouser = {
          status: probeCheck.ok ? 'ready' : 'degraded',
          note: probeCheck.ok ? 'API working' : `HTTP ${probeCheck.status}`,
          latency_ms: probeLatency
        };
      } catch (err) {
        sources.mouser = {
          status: 'down',
          note: err.message === 'timeout' ? 'Timeout >5s' : err.message,
          latency_ms: 5000
        };
      }
    } else {
      sources.mouser = {
        status: 'configured',
        note: 'API key present'
      };
    }
  } else {
    sources.mouser = { status: 'disabled', note: 'No API key' };
  }

  // TME health check
  if (keys.tmeToken && keys.tmeSecret) {
    sources.tme = {
      status: probe ? 'configured' : 'configured',
      note: probe ? 'Token present (probe not impl)' : 'Token/secret present'
    };
  } else {
    sources.tme = { status: 'disabled', note: 'No credentials' };
  }

  // Farnell health check
  if (keys.farnell) {
    sources.farnell = {
      status: probe ? 'configured' : 'configured',
      note: probe ? 'API key present (probe not impl)' : 'API key present'
    };
  } else {
    sources.farnell = { status: 'disabled', note: 'No API key' };
  }

  // Currency health
  const currencyAge = getRatesAge();
  const currencyAgeHours = Math.floor(currencyAge / (1000 * 60 * 60));
  const currencyStatus = currencyAgeHours < 24 ? 'ok' : 'stale';

  const totalLatency = Date.now() - startTime;

  res.json({
    status: 'ok',
    version: '3.2',
    ts: Date.now(),
    latency_ms: totalLatency,
    probe: probe,
    proxy: {
      trust: behindProxy,
      value: trustProxy
    },
    sources,
    currency: {
      status: currencyStatus,
      age_hours: currencyAgeHours,
      rates: {
        USD: loadRates().rates.USD,
        EUR: loadRates().rates.EUR
      }
    },
    cache: {
      db_path: './data/db/deep-agg.db',
      status: 'ok'
    }
  });
});

// Lightweight runtime diagnostics (no secrets, guard-style, no try/catch)
app.get('/api/diag/runtime', (req, res) => {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  const elu = performance && typeof performance.eventLoopUtilization === 'function'
    ? performance.eventLoopUtilization()
    : { idle: 0, active: 0, utilization: 0 };

  const envProxy = {
    HTTP_PROXY: process.env.HTTP_PROXY || null,
    HTTPS_PROXY: process.env.HTTPS_PROXY || null,
    NO_PROXY: process.env.NO_PROXY || null
  };

  const resource = typeof process.resourceUsage === 'function' ? process.resourceUsage() : null;

  res.json({
    ts: Date.now(),
    pid: process.pid,
    uptime_s: Math.round(process.uptime()),
    versions: process.versions,
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers
    },
    cpu: {
      user_us: cpu.user,
      system_us: cpu.system
    },
    event_loop: {
      idle: elu.idle,
      active: elu.active,
      utilization: elu.utilization
    },
    resource,
    envProxy
  });
});

// Currency rates endpoint
app.get('/api/currency/rates', (req, res) => {
  try {
    const rates = loadRates();
    const age = getRatesAge();
    const ageHours = Math.floor(age / (1000 * 60 * 60));
    const date = new Date(rates.timestamp);

    res.json({
      ok: true,
      timestamp: rates.timestamp,
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      age_hours: ageHours,
      rates: {
        USD: rates.rates.USD,
        EUR: rates.rates.EUR,
        GBP: rates.rates.GBP || null
      },
      source: 'ЦБ РФ'
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Metrics endpoint
app.get('/api/metrics', async (req, res) => {
  const { getMetrics } = await import('./metrics/registry.js');
  const metrics = await getMetrics();

  // RFC: Prometheus text exposition format 0.0.4
  // https://prometheus.io/docs/instrumenting/exposition_formats/
  // Must use writeHead to preserve exact header order (Express normalizes setHeader)
  res.writeHead(200, {
    'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    'Content-Length': Buffer.byteLength(metrics)
  });
  res.end(metrics);
});

// Authentication routes (with rate limiting on register/login)
const authRateLimiter = createAuthRateLimiter();
mountAuthRoutes(app, db, logger, authRateLimiter);

// Aux auth routes
app.post('/api/auth/check-email', checkEmailHandler(db, logger));

// Static pages CMS routes
mountStaticPagesRoutes(app, db);

// Settings routes
mountSettingsRoutes(app);

// User order routes (requires authentication)
mountUserOrderRoutes(app, db, logger);

// Orders API (with rate limiting + requires authentication)
const orderRateLimiter = createOrderRateLimiter();
app.post('/api/order', orderRateLimiter, createOrderHandler(db, logger));

// Order Status SSE Stream (public, no auth required)
import { streamOrderStatus } from './api/order.stream.mjs';
app.get('/api/order/:id/stream', streamOrderStatus);

// Admin API (protected by Nginx Basic Auth at proxy level)
mountAdminRoutes(app, db, logger);
mountAdminSettingsRoutes(app, db, logger);
mountAdminNotificationsRoutes(app, db, logger);
mountAdminPagesRoutes(app, db, logger);
mountAdminProductRoutes(app, db, logger);
// ============================================
// AdminJS Panel Routes
// ============================================
app.get('/admin/health', (req, res) => {
  res.json({ ok: Boolean(adminRouter) })
})
app.use('/admin', (req, res, next) => {
  return adminRouter ? adminRouter(req, res, next) : res.status(503).send('Admin panel is loading...')
})

// AdminJS API for frontend
app.get('/api/static-pages', getStaticPages);
app.get('/api/pages/:slug', getStaticPageBySlug);
app.post('/api/admin/orders', express.json(), createAdminOrder);

// Admin vitrine controls (pin/unpin products)
import mountAdminVitrine from './api/admin-vitrine.mjs';
mountAdminVitrine(app);

// Digi-Key server-only endpoints (to ensure calls go through server IP)
app.get('/api/digikey/keyword', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ ok: false, error: 'q required' });
    if (!keys.digikeyClientId || !keys.digikeyClientSecret) {
      return res.status(503).json({ ok: false, error: 'DigiKey creds missing' });
    }
    const result = await digikeySearch({
      clientId: keys.digikeyClientId,
      clientSecret: keys.digikeyClientSecret,
      keyword: q,
      limit: Number(req.query.limit || 10)
    });
    const products = result?.data?.Products || result?.data?.Products?.Items || result?.data?.Items || [];
    res.json({ ok: true, status: result.status, count: products.length, raw: result.data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/digikey/details', async (req, res) => {
  try {
    const dkpn = String(req.query.dkpn || req.query.part || '').trim();
    if (!dkpn) return res.status(400).json({ ok: false, error: 'dkpn required' });
    if (!keys.digikeyClientId || !keys.digikeyClientSecret) {
      return res.status(503).json({ ok: false, error: 'DigiKey creds missing' });
    }
    const result = await digikeyGetProduct({
      clientId: keys.digikeyClientId,
      clientSecret: keys.digikeyClientSecret,
      partNumber: dkpn
    });
    res.json({ ok: true, status: result.status, raw: result.data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Digi-Key self-test (server-only). Optional simple token gate via env DIGIKEY_SELFTEST_TOKEN
app.get('/api/digikey/selftest', async (req, res) => {
  try {
    const expected = process.env.DIGIKEY_SELFTEST_TOKEN;
    if (expected && String(req.query.token || '') !== String(expected)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    if (!keys.digikeyClientId || !keys.digikeyClientSecret) {
      return res.status(503).json({ ok: false, error: 'DigiKey creds missing' });
    }
    const q = String(req.query.q || 'M83513/19-E01NW');
    const result = await digikeySearch({
      clientId: keys.digikeyClientId,
      clientSecret: keys.digikeyClientSecret,
      keyword: q,
      limit: 1
    });
    const products = result?.data?.Products || result?.data?.Items || [];
    res.json({
      ok: true, status: result.status, count: products.length, sample: products[0] ? {
        ManufacturerPartNumber: products[0].ManufacturerPartNumber,
        Description: products[0].Description,
        ParametersCount: Array.isArray(products[0].Parameters) ? products[0].Parameters.length : undefined
      } : null
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// SSE Live Search endpoint (with heartbeat, AbortController, no-buffering)
app.get('/api/live/search', async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.status(400).json({ ok: false, error: 'Missing query parameter: q' });
  }

  sse.open(res);

  const controller = new AbortController();
  let heartbeatTimer = null;

  req.on('close', () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    controller.abort();
  });

  // Heartbeat every 15s to prevent connection timeout
  heartbeatTimer = setInterval(() => {
    if (!res.writableEnded) {
      sse.heartbeat(res);
    }
  }, 15_000);

  // Send start event
  sse.send(res, 'search:start', { query: q, timestamp: Date.now() });

  const aggregated = await orchestrateProviderSearch(q, keys);

  // Stream provider summaries
  for (const provider of aggregated.providers || []) {
    if (provider.status === 'error') {
      sse.send(res, 'provider:error', {
        provider: provider.provider,
        error: provider.message,
        elapsed: provider.elapsed_ms || 0
      });
    } else {
      sse.send(res, 'provider:partial', {
        provider: provider.provider,
        count: provider.total,
        elapsed: provider.elapsed_ms
      });
    }
  }

  // Send final results with currency
  const ratesData = loadRates();
  const ratesDate = new Date(ratesData.timestamp).toISOString().split('T')[0];

  sse.send(res, 'result', {
    rows: aggregated.rows,
    meta: {
      total: aggregated.rows.length,
      providers: aggregated.providers,
      currency: {
        rates: { USD: ratesData.rates.USD, EUR: ratesData.rates.EUR },
        date: ratesDate,
        source: 'ЦБ РФ'
      }
    }
  });

  clearInterval(heartbeatTimer);
  sse.done(res);
  res.end();
});

// Search endpoint with Russian normalization
app.get('/api/search', async (req, res) => {
  const searchTimer = searchLatencySeconds.startTimer();

  try {
    const q = String(req.query.q || '').trim();
    const startTime = Date.now();

    console.log(`\n🔍 Search: "${q}"`);

    if (!q) {
      searchRequestsTotal.inc({ status: 'success' });
      searchTimer();
      return res.json({ ok: true, q, rows: [], meta: { source: 'none', total: 0 } });
    }

    // Normalization: build normalized variants and primary for cache key
    const processed = processSearchQuery(q);
    const strategy = selectSearchStrategy(processed);
    const primaryNorm = (strategy && strategy.primaryQuery) ? String(strategy.primaryQuery).toLowerCase() : q.toLowerCase();

    // Check cache (normalized primary key). Do not return cache as final — use for enrichment/fallback only.
    const TTL = 7 * 24 * 60 * 60 * 1000;
    const cached = readCachedSearch(db, primaryNorm, TTL);
    if (cached) {
      console.log(`📦 Cache AVAILABLE: ${cached.rows.length} rows for key="${primaryNorm}" (source=${cached.meta.source})`);
      cacheOperations.inc({ operation: 'hit', type: 'search' });
    } else {
      cacheOperations.inc({ operation: 'miss', type: 'search' });
    }

    // Live search always primary
    const aggregated = await orchestrateProviderSearch(q, keys);
    const rows = aggregated.rows;
    const providerSummary = aggregated.providers;

    // If we have live rows, cache them under normalized key; else, fallback to cached rows (tech-only)
    if (rows.length > 0) {
      cacheSearch(db, primaryNorm, rows, { source: 'providers' });
    }

    const elapsed = Date.now() - startTime;

    const ratesData = loadRates();
    const ratesDate = new Date(ratesData.timestamp).toISOString().split('T')[0];

    const responseMeta = {
      source: 'providers',
      total: rows.length,
      cached: false,
      elapsed,
      providers: providerSummary,
      currency: {
        rates: {
          USD: ratesData.rates.USD,
          EUR: ratesData.rates.EUR
        },
        date: ratesDate,
        source: 'ЦБ РФ'
      }
    };

    const usedQueries = new Set();
    providerSummary.forEach((item) => {
      if (item.status === 'ok' && item.usedQuery) {
        usedQueries.add(item.usedQuery);
      }
    });

    if (usedQueries.size > 0) {
      responseMeta.usedQueries = Array.from(usedQueries);
    }

    // Helper to strip pricing/stock from cached rows (tech-only)
    const toTechOnly = (r) => {
      if (!r || typeof r !== 'object') return r;
      const {
        min_price, min_currency, min_price_rub, price_breaks,
        pricing, availability, stock,
        ...rest
      } = r;
      return rest;
    };

    // Fallback: no live rows — return cached rows (if present) but annotate as cache-fallback
    if (rows.length === 0 && cached) {
      console.log(`↩️  Fallback to cache for "${primaryNorm}" (${cached.rows.length} rows, tech-only)`);
      responseMeta.source = 'cache-fallback';
      responseMeta.total = cached.rows.length;
      responseMeta.cached = true;
      responseMeta.tech_only = true;
      const techRows = cached.rows.map(toTechOnly);
      res.json({ ok: true, q, rows: techRows, meta: responseMeta });
      searchRequestsTotal.inc({ status: 'success' });
      searchResultsBySource.inc({ source: 'cache' }, techRows.length);
      searchTimer();
      return;
    }

    console.log(`⏱️  Completed in ${elapsed}ms: ${rows.length} results aggregated from ${providerSummary.length} providers`);
    providerSummary.forEach((item) => {
      if (item.status === 'ok') {
        console.log(`   ✅ ${item.provider}: ${item.total} rows (used: "${item.usedQuery}", strategy: ${item.strategy}, attempts: ${item.attempts})`);
      } else {
        console.log(`   ❌ ${item.provider}: ${item.message}`);
      }
    });
    console.log('');

    // Metrics for successful search
    searchRequestsTotal.inc({ status: 'success' });
    if (rows.length > 0) {
      searchResultsBySource.inc({ source: 'providers' }, rows.length);
    }
    searchTimer();

    res.json({ ok: true, q, rows, meta: responseMeta });
  } catch (error) {
    console.error('❌ Search error:', error);

    // Metrics for failed search
    searchRequestsTotal.inc({ status: 'error' });
    searchErrorsTotal.inc({ error_type: error.code || error.name || 'unknown' });
    searchTimer();

    res.status(500).json({ ok: false, error: error.message });
  }
});

// Product endpoint - Queries ALL 3 APIs in parallel and merges results
app.get('/api/product', async (req, res) => {
  try {
    const mpn = String(req.query.mpn || req.query.id || '').trim();

    console.log(`\n📦 Product Request: ${mpn}`);

    if (!mpn) {
      return res.status(400).json({ ok: false, code: 'bad_params', message: 'Missing mpn parameter' });
    }

    // Check manual products first
    const manualProduct = getManualProduct(mpn);
    if (manualProduct) {
      console.log('   📦 Manual Product: Found');
      return res.json({ ok: true, product: manualProduct, meta: { cached: false, source: 'manual' } });
    }

    // Check cache (use mpn as key regardless of source)
    const TTL = 30 * 24 * 60 * 60 * 1000;
    const cached = readCachedProduct(db, 'merged', mpn, TTL);
    if (cached) {
      console.log('   📦 Cache HIT');
      return res.json({ ok: true, product: cached, meta: { cached: true } });
    }

    const clean = s => (s || '').toString().trim();

    console.log('   🔄 Fetching from ALL sources in parallel...');

    // Parallel requests to all 3 APIs
    const results = await Promise.allSettled([
      // Mouser
      keys.mouser ? (async () => {
        const startTime = Date.now();
        try {
          const result = await mouserSearchByKeyword({ apiKey: keys.mouser, q: mpn, records: 1 });
          const responseTime = Date.now() - startTime;
          await updateApiHealth('mouser', true, responseTime);

          const p = result?.data?.SearchResults?.Parts?.[0];
          if (!p) return null;

          console.log('   ✅ Mouser: Found');

          // Parse Mouser data - GET ALL FIELDS!
          const technical_specs = {};

          // 1. ProductAttributes (primary specs)
          (p.ProductAttributes || []).forEach(a => {
            const k = clean(a.AttributeName);
            const v = clean(a.AttributeValue);
            if (k && v) technical_specs[k] = v;
          });

          // 2. ALL main product fields as specs
          const allFields = {
            'Manufacturer': p.Manufacturer,
            'Product Category': p.Category,
            'Description': p.Description,
            'Mouser Part Number': p.MouserPartNumber,
            'Manufacturer Part Number': p.ManufacturerPartNumber,
            'RoHS Status': p.ROHSStatus,
            'Lifecycle Status': p.LifecycleStatus,
            'Availability': p.Availability,
            'In Stock': p.AvailabilityInStock,
            'Factory Stock': p.FactoryStock,
            'Lead Time': p.LeadTime,
            'Minimum Order Quantity': p.Min,
            'Order Multiple': p.Mult,
            'Standard Pack Qty': p.StandardCost,
            'Package': p.Package,
            'Packaging': p.Packaging,
            'Reeling': p.Reeling ? 'Yes' : null,
            'Product URL': p.ProductDetailUrl,
            'Datasheet URL': p.DataSheetUrl,
            'Series': p.Series,
            'Weight': p.Weight,
            'Package Dimensions': p.PackageDimensions
          };

          for (const [key, value] of Object.entries(allFields)) {
            const val = clean(value);
            if (val && val !== '0' && val !== 'null' && val !== 'undefined' && val !== 'No' && val !== 'false' && !technical_specs[key]) {
              technical_specs[key] = val;
            }
          }

          // 3. Product Compliance (RoHS, REACH, etc)
          (p.ProductCompliance || []).forEach(c => {
            const k = clean(c.ComplianceName);
            const v = clean(c.ComplianceValue);
            if (k && v) technical_specs[k] = v;
          });

          // 4. AlternatePackaging info
          if (p.AlternatePackagings && p.AlternatePackagings.length > 0) {
            technical_specs['Alternate Packaging Available'] = 'Yes';
          }

          // 5. SuggestedReplacement if exists
          if (p.SuggestedReplacement) {
            technical_specs['Suggested Replacement'] = clean(p.SuggestedReplacement);
          }

          // 6. UnitWeightKg if exists
          if (p.UnitWeightKg) {
            technical_specs['Unit Weight'] = `${p.UnitWeightKg} kg`;
          }

          console.log(`   📊 Mouser specs extracted: ${Object.keys(technical_specs).length}`);

          // Mouser API returns 24+ specs - no scraping needed!
          const images = [];
          if (clean(p.ImagePath)) images.push(clean(p.ImagePath));
          if (clean(p.ImageURL) && clean(p.ImageURL) !== clean(p.ImagePath)) images.push(clean(p.ImageURL));

          const datasheets = [];
          if (clean(p.DataSheetUrl)) datasheets.push(clean(p.DataSheetUrl));
          (p.ProductDocuments || []).forEach(doc => {
            if (clean(doc.DocumentUrl)) datasheets.push(clean(doc.DocumentUrl));
          });

          const pricing = (p.PriceBreaks || []).map(pb => ({
            qty: Number(pb.Quantity) || 1,
            price: clean(pb.Price),
            currency: pb.Currency || 'USD',
            price_rub: toRUB(Number((pb.Price || '').match(/[\d.,]+/)?.[0]?.replace(',', '.') || 0), pb.Currency || 'USD')
          }));

          return {
            mpn: clean(p.ManufacturerPartNumber),
            manufacturer: clean(p.Manufacturer),
            title: clean(p.Description),
            description: clean(p.Description),
            photo: clean(p.ImagePath || p.ImageURL),
            images,
            datasheets: [...new Set(datasheets)],
            technical_specs,
            pricing,
            availability: {
              inStock: Number(clean(p.AvailabilityInStock)) || Number((clean(p.Availability) || '').match(/\d+/)?.[0]) || 0,
              leadTime: clean(p.LeadTime)
            },
            regions: ['US'],
            package: clean(p.Package),
            packaging: clean(p.Packaging),
            vendorUrl: clean(p.ProductDetailUrl),
            source: 'mouser'
          };
        } catch (error) {
          console.log('   ❌ Mouser: Error -', error.message);
          await updateApiHealth('mouser', false, null, error.message);
          return null;
        }
      })() : Promise.resolve(null),

      // TME
      (keys.tmeToken && keys.tmeSecret) ? (async () => {
        const startTime = Date.now();
        try {
          console.log('   → TME: Searching for', mpn);
          const result = await tmeSearchProducts({
            token: keys.tmeToken,
            secret: keys.tmeSecret,
            query: mpn,
            country: 'PL',
            language: 'EN'
          });

          const responseTime = Date.now() - startTime;
          await updateApiHealth('tme', true, responseTime);

          // TME returns { Status: 'OK', Data: { ProductList: [...] } }
          const tmeData = result?.data?.Data || result?.data;  // Handle both cases
          const products = tmeData?.ProductList || [];

          console.log('   🔍 TME response:', JSON.stringify({
            status: result?.status,
            hasData: !!result?.data,
            productCount: products.length,
            firstProduct: products[0]?.Symbol || 'none'
          }));

          if (products.length === 0) {
            console.log('   ⚠️  TME: No products in ProductList');
            return null;
          }

          // Find exact match by OriginalSymbol (manufacturer part number)
          let p = products.find(prod =>
            prod.OriginalSymbol && prod.OriginalSymbol.toUpperCase() === mpn.toUpperCase()
          );

          // Fallback: try Symbol field
          if (!p) {
            p = products.find(prod =>
              prod.Symbol && prod.Symbol.toUpperCase() === mpn.toUpperCase()
            );
          }

          // If no exact match found, skip TME result
          if (!p) {
            console.log('   ⚠️  TME: No exact match for', mpn, '(found', products.length, 'related products)');
            return null;
          }

          console.log('   ✅ TME: Found exact match', p.Symbol, '(OriginalSymbol:', p.OriginalSymbol, ')');

          const technical_specs = {};
          (p.Parameters || []).forEach(param => {
            const k = clean(param.ParameterName);
            const v = clean(param.ParameterValue);
            if (k && v) technical_specs[k] = v;
          });

          const images = (p.Photo || '').split(';').map(clean).filter(Boolean);
          const datasheets = [];
          if (clean(p.DocumentUrl)) datasheets.push(clean(p.DocumentUrl));

          const pricing = (p.PriceList || []).map(pb => ({
            qty: pb.Amount || 1,
            price: pb.PriceValue,
            currency: pb.PriceCurrency || 'EUR',
            price_rub: toRUB(pb.PriceValue, pb.PriceCurrency || 'EUR')
          }));

          return {
            mpn: clean(p.Symbol),
            manufacturer: clean(p.Producer),
            title: clean(p.Description),
            description: clean(p.Description),
            photo: images[0] || '',
            images,
            datasheets,
            technical_specs,
            pricing,
            availability: { inStock: Number(p.InStock) || 0, leadTime: clean(p.DeliveryTime) },
            regions: ['PL', 'EU'],
            package: '',
            packaging: '',
            vendorUrl: `https://www.tme.eu/en/details/${mpn}/`,
            source: 'tme'
          };
        } catch (error) {
          console.log('   ❌ TME: Error -', error.message);
          await updateApiHealth('tme', false, null, error.message);
          return null;
        }
      })() : Promise.resolve(null),

      // Farnell
      keys.farnell ? (async () => {
        const startTime = Date.now();
        try {
          console.log('   → Farnell: Searching for', mpn);
          const result = await farnellByMPN({ apiKey: keys.farnell, region: keys.farnellRegion, q: mpn, limit: 1 });

          const responseTime = Date.now() - startTime;
          await updateApiHealth('farnell', true, responseTime);

          console.log('   🔍 Farnell raw response status:', result?.status);

          // Farnell API returns: { premierFarnellPartNumberReturn: { numberOfResults, products: [...] } }
          const returnData = result?.data?.premierFarnellPartNumberReturn || result?.data;
          const products = returnData?.products || [];

          console.log('   🔍 Farnell result:', JSON.stringify({
            hasData: !!result?.data,
            hasReturn: !!returnData,
            numberOfResults: returnData?.numberOfResults || 0,
            productCount: products.length
          }));

          const p = products[0];
          if (!p) {
            console.log('   ⚠️  Farnell: No product found');
            return null;
          }

          console.log('   ✅ Farnell: Found');

          const technical_specs = {};
          (p.attributes || []).forEach(a => {
            const k = clean(a.attributeLabel || a.name);
            const v = clean(a.attributeValue || a.value);
            if (k && v) technical_specs[k] = v;
          });

          const images = [];
          const mainImg = p.image ? `https://uk.farnell.com${p.image.baseName}` : '';
          if (mainImg) images.push(mainImg);
          if (p.images?.small && p.images.small !== mainImg) images.push(p.images.small);
          if (p.images?.medium && p.images.medium !== mainImg) images.push(p.images.medium);

          const datasheets = (p.datasheets || []).map(d => clean(d.url || d)).filter(Boolean);

          const pricing = (p.prices || []).map(pb => ({
            qty: pb.from || 1,
            price: pb.cost || pb.price,
            currency: 'GBP',
            price_rub: toRUB(Number(pb.cost || pb.price), 'GBP')
          }));

          return {
            mpn: clean(p.translatedManufacturerPartNumber || p.manufacturerPartNumber),
            manufacturer: clean(p.brandName || p.vendorName),
            title: clean(p.displayName),
            description: clean(p.displayName || p.longDescription),
            photo: mainImg,
            images,
            datasheets,
            technical_specs,
            pricing,
            availability: { inStock: Number(p.stock) || 0, leadTime: clean(p.leadTime) },
            regions: ['UK', 'EU'],
            package: '',
            packaging: '',
            vendorUrl: clean(p.productUrl),
            source: 'farnell'
          };
        } catch (error) {
          console.log('   ❌ Farnell: Error -', error.message);
          await updateApiHealth('farnell', false, null, error.message);
          return null;
        }
      })() : Promise.resolve(null),

      // DigiKey
      (keys.digikeyClientId && keys.digikeyClientSecret) ? (async () => {
        const startTime = Date.now();
        console.log('   🔍 DigiKey: Starting search...');
        try {
          const result = await digikeyGetProduct({
            clientId: keys.digikeyClientId,
            clientSecret: keys.digikeyClientSecret,
            partNumber: mpn
          });

          const responseTime = Date.now() - startTime;
          await updateApiHealth('digikey', true, responseTime);

          console.log(`   🔍 DigiKey: Got response, status=${result?.status}`);
          const p = result?.data?.Product || result?.data?.Products?.[0];
          if (!p) {
            console.log('   ⚠️  DigiKey: No product found in response');
            return null;
          }

          console.log('   ✅ DigiKey: Found', p.ManufacturerProductNumber || p.ManufacturerPartNumber);

          // Extract ALL technical specs from Parameters
          const technical_specs = {};
          (p.Parameters || []).forEach(param => {
            const k = clean(param.ParameterText || param.Parameter);
            const v = clean(param.ValueText || param.Value);
            if (k && v) technical_specs[k] = v;
          });

          // Add main product fields as specs
          const mainFields = {
            'Manufacturer': p.Manufacturer?.Name,
            'Product Category': p.Category?.Name,
            'Series': p.Series,
            'Product Status': p.ProductStatus,
            'Base Product Number': p.BaseProductNumber,
            'Manufacturer Lead Weeks': p.ManufacturerLeadWeeks,
            'Normally Stocking': p.NormallyStocking ? 'Yes' : 'No',
            'End Of Life': p.EndOfLife ? 'Yes' : 'No',
            'Discontinued': p.Discontinued ? 'Yes' : 'No',
            'NCNR': p.Ncnr ? 'Yes' : 'No'
          };

          for (const [key, value] of Object.entries(mainFields)) {
            const val = clean(value);
            if (val && val !== '0' && val !== 'null' && val !== 'undefined' && val !== 'No' && val !== 'false' && !technical_specs[key]) {
              technical_specs[key] = val;
            }
          }

          // Extract images
          const images = [];
          if (clean(p.PhotoUrl)) images.push(clean(p.PhotoUrl));
          if (clean(p.PrimaryPhoto)) images.push(clean(p.PrimaryPhoto));
          if (p.MediaLinks && Array.isArray(p.MediaLinks)) {
            p.MediaLinks.forEach(media => {
              if (media.MediaType === 'Image' && clean(media.Url)) {
                images.push(clean(media.Url));
              }
            });
          }

          // Extract datasheets
          const datasheets = [];
          if (clean(p.DatasheetUrl)) datasheets.push(clean(p.DatasheetUrl));
          if (clean(p.PrimaryDatasheet)) datasheets.push(clean(p.PrimaryDatasheet));
          if (p.MediaLinks && Array.isArray(p.MediaLinks)) {
            p.MediaLinks.forEach(media => {
              if (media.MediaType === 'Datasheet' && clean(media.Url)) {
                datasheets.push(clean(media.Url));
              }
            });
          }

          // Get pricing from first ProductVariation (if exists) or StandardPricing
          let pricing = [];
          if (p.ProductVariations && p.ProductVariations.length > 0) {
            const firstVariation = p.ProductVariations[0];
            pricing = (firstVariation.StandardPricing || []).map(pb => ({
              qty: pb.BreakQuantity || 1,
              price: pb.UnitPrice,
              currency: 'USD',
              price_rub: toRUB(Number(pb.UnitPrice), 'USD')
            }));
          } else if (p.StandardPricing) {
            pricing = (p.StandardPricing || []).map(pb => ({
              qty: pb.BreakQuantity || 1,
              price: pb.UnitPrice,
              currency: pb.Currency || 'USD',
              price_rub: toRUB(Number(pb.UnitPrice), pb.Currency || 'USD')
            }));
          }

          // Get availability from first variation or main product
          let inStock = 0;
          let minQty = 1;
          if (p.ProductVariations && p.ProductVariations.length > 0) {
            const firstVariation = p.ProductVariations[0];
            inStock = Number(firstVariation.QuantityAvailableforPackageType) || 0;
            minQty = Number(firstVariation.MinimumOrderQuantity) || 1;
          } else {
            inStock = Number(p.QuantityAvailable) || 0;
          }

          console.log(`   📊 DigiKey specs extracted: ${Object.keys(technical_specs).length}`);

          return {
            mpn: clean(p.ManufacturerProductNumber || p.ManufacturerPartNumber),
            manufacturer: clean(p.Manufacturer?.Name),
            title: clean(p.Description?.ProductDescription || p.ProductDescription),
            description: clean(p.Description?.DetailedDescription || p.DetailedDescription || p.Description?.ProductDescription),
            photo: images[0] || '',
            images,
            datasheets: [...new Set(datasheets)],
            technical_specs,
            pricing,
            availability: {
              inStock,
              leadTime: clean(p.ManufacturerLeadWeeks),
              minQty
            },
            regions: ['US', 'Global'],
            package: clean(p.Packaging?.Name),
            packaging: clean(p.StandardPackage),
            vendorUrl: clean(p.ProductUrl),
            source: 'digikey'
          };
        } catch (error) {
          console.log('   ❌ DigiKey: Error -', error.message);
          await updateApiHealth('digikey', false, null, error.message);
          return null;
        }
      })() : Promise.resolve(null)
    ]);

    // Extract successful results
    const [mouserResult, tmeResult, farnellResult, digikeyResult] = results.map(r =>
      r.status === 'fulfilled' ? r.value : null
    );

    console.log(`   📊 Results: Mouser=${!!mouserResult}, TME=${!!tmeResult}, Farnell=${!!farnellResult}, DigiKey=${!!digikeyResult}`);

    // Merge data from all sources
    const product = mergeProductData(mouserResult, tmeResult, farnellResult, digikeyResult);

    if (!product) {
      return res.status(404).json({
        ok: false,
        code: 'not_found',
        message: 'Product not found in any source'
      });
    }

    console.log(`   ✅ Merged product with ${Object.keys(product.technical_specs || {}).length} specs`);

    // Cache merged result
    cacheProduct(db, 'merged', mpn, product);

    res.json({
      ok: true,
      product,
      meta: {
        cached: false,
        sources: product.sources
      }
    });
  } catch (error) {
    console.error('❌ Product endpoint error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Image Proxy endpoint - proxies images to bypass hotlinking protection
app.get('/api/image', async (req, res) => {
  try {
    const url = String(req.query.url || '').trim();

    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ ok: false, code: 'bad_url' });
    }

    console.log(`🖼️  Image Proxy: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.mouser.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      console.log(`   ❌ Image fetch failed: ${response.status}`);
      // Return placeholder instead of error
      res.status(404).send('Image not found');
      return;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    console.log(`   ✅ Image served: ${buffer.byteLength} bytes`);

    // Set headers for image
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('❌ Image proxy error:', error);
    res.status(500).send('Image proxy error');
  }
});

// PDF Proxy endpoint - downloads PDF and serves it (caches on server)
app.get('/api/pdf', async (req, res) => {
  try {
    const url = String(req.query.url || '').trim();

    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ ok: false, code: 'bad_url' });
    }

    console.log(`📄 PDF Proxy: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const buffer = await response.arrayBuffer();

    // Set headers for PDF display/download
    res.setHeader('Content-Type', contentType);
    const dl = String(req.query.dl || '').trim();
    const disp = dl === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', disp);
    res.send(Buffer.from(buffer));

    console.log(`   ✅ PDF served: ${buffer.byteLength} bytes`);

  } catch (error) {
    console.error('❌ PDF proxy error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = Number(process.env.PORT || 9201);

// Initialize currency rates from CBR on startup
(async () => {
  try {
    console.log('💱 Initializing currency rates from CBR...');
    await refreshRates();
    const rates = loadRates();
    const age = getRatesAge();
    const ageHours = Math.floor(age / (1000 * 60 * 60));
    console.log(`✅ Currency rates loaded (age: ${ageHours}h)`);
    console.log(`   USD: ${rates.rates.USD?.toFixed(4)}₽`);
    console.log(`   EUR: ${rates.rates.EUR?.toFixed(4)}₽`);
  } catch (error) {
    console.error('⚠️  Failed to load currency rates:', error.message);
  }
})();

// ============================================
// AdminJS Database Connection
// ============================================
(async () => {
  try {
    const { sequelize } = await import('./src/db/models.js');
    await sequelize.authenticate();
    console.log('✅ AdminJS database connected');
  } catch (error) {
    console.error('❌ AdminJS database connection failed:', error);
  }
})();
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ Server Started');
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/health`);
  console.log(`📊 Metrics: http://localhost:${PORT}/api/metrics`);
  console.log(`🔐 Auth: POST http://localhost:${PORT}/auth/register|login`);
  console.log(`👤 User Orders: GET http://localhost:${PORT}/api/user/orders`);
  console.log(`📦 Create Order: POST http://localhost:${PORT}/api/order (auth required)`);
  console.log(`🔧 Admin Panel: http://localhost:${PORT}/admin (AdminJS)`);
  console.log(`🔧 Admin API: http://localhost:${PORT}/api/admin/orders (Nginx Basic Auth)`);
  console.log('='.repeat(50) + '\n');
});

server.on('error', (error) => {
  console.error('\n❌ Server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ UNCAUGHT EXCEPTION');
  console.error('Error:', error);
  console.error('Stack:', error?.stack || 'No stack trace');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ UNHANDLED REJECTION');
  console.error('Reason:', reason);
  console.error('Stack:', reason?.stack || 'No stack trace');
  console.error('Promise:', promise);
  process.exit(1);
});
