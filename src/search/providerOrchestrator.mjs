import { executeEnhancedSearch } from './searchIntegration.mjs';
import { mouserSearchByKeyword } from '../integrations/mouser/client.mjs';
import { normMouser } from '../integrations/mouser/normalize.mjs';
import { digikeySearch } from '../integrations/digikey/client.mjs';
import { normDigiKey } from '../integrations/digikey/normalize.mjs';
import { tmeSearchProducts, tmeGetProduct } from '../integrations/tme/client.mjs';
import { normTME } from '../integrations/tme/normalize.mjs';
import { farnellByKeyword } from '../integrations/farnell/client.mjs';
import { normFarnell } from '../integrations/farnell/normalize.mjs';
import { searchManualProducts } from './manualProducts.mjs';
import { applyMarkupToProducts } from '../utils/markup.mjs';
import PQueue from 'p-queue';
import { apiCallsTotal, apiCallDuration } from '../../metrics/registry.js';

// Timeouts from package.json config or defaults
const PROVIDER_TIMEOUT = Number(process.env.npm_package_config_PROVIDER_TIMEOUT || 9500);
const CONCURRENCY = 4; // Max 4 providers in parallel

const dedupeRows = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    if (!row || !row.mpn) {
      return;
    }
    const provider = row.source || 'unknown';
    const key = `${provider.toLowerCase()}::${row.mpn.toLowerCase()}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      return;
    }
    if (isBetterRow(row, existing)) {
      map.set(key, row);
    }
  });
  return Array.from(map.values());
};

const isBetterRow = (candidate, current) => {
  const currentPrice = Number.isFinite(current?.min_price_rub) ? current.min_price_rub : Number.POSITIVE_INFINITY;
  const candidatePrice = Number.isFinite(candidate?.min_price_rub) ? candidate.min_price_rub : Number.POSITIVE_INFINITY;
  if (candidatePrice < currentPrice) {
    return true;
  }
  if (candidatePrice === currentPrice) {
    const currentStock = Number.isFinite(current?.stock) ? current.stock : 0;
    const candidateStock = Number.isFinite(candidate?.stock) ? candidate.stock : 0;
    if (candidateStock > currentStock) {
      return true;
    }
  }
  const currentInfo = infoScore(current);
  const candidateInfo = infoScore(candidate);
  return candidateInfo > currentInfo;
};

const infoScore = (row) => {
  let score = 0;
  if (row?.manufacturer) score += 1;
  if (row?.description_short) score += 1;
  if (row?.image_url) score += 1;
  if (Array.isArray(row?.price_breaks) && row.price_breaks.length > 0) score += 1;
  return score;
};

const rankRows = (rows, query) => {
  const lookup = String(query || '').trim().toLowerCase();
  const ranked = rows.map((row) => {
    const mpn = String(row?.mpn || '').toLowerCase();
    const title = String(row?.title || '').toLowerCase();
    const manufacturer = String(row?.manufacturer || '').toLowerCase();
    const description = String(row?.description_short || '').toLowerCase();
    const exactMatch = mpn === lookup ? 1 : 0;
    const partialMatch = mpn.includes(lookup) || title.includes(lookup) || manufacturer.includes(lookup) ? 1 : 0;
    const textMatch = description.includes(lookup) ? 1 : 0;
    const stockScore = Number.isFinite(row?.stock) && row.stock > 0 ? 1 : 0;
    const priceScore = Number.isFinite(row?.min_price_rub) ? row.min_price_rub : Number.POSITIVE_INFINITY;
    return {
      row,
      metrics: { exactMatch, partialMatch, textMatch, stockScore, priceScore }
    };
  });

  ranked.sort((a, b) => {
    if (a.metrics.exactMatch !== b.metrics.exactMatch) {
      return b.metrics.exactMatch - a.metrics.exactMatch;
    }
    if (a.metrics.partialMatch !== b.metrics.partialMatch) {
      return b.metrics.partialMatch - a.metrics.partialMatch;
    }
    if (a.metrics.textMatch !== b.metrics.textMatch) {
      return b.metrics.textMatch - a.metrics.textMatch;
    }
    if (a.metrics.stockScore !== b.metrics.stockScore) {
      return b.metrics.stockScore - a.metrics.stockScore;
    }
    if (a.metrics.priceScore !== b.metrics.priceScore) {
      return a.metrics.priceScore - b.metrics.priceScore;
    }
    const sourceA = String(a.row?.source || '').toLowerCase();
    const sourceB = String(b.row?.source || '').toLowerCase();
    return sourceA.localeCompare(sourceB);
  });

  return ranked.map((entry) => entry.row);
};

const summarizeResult = (provider, meta) => ({
  provider,
  status: 'ok',
  total: meta.total,
  usedQuery: meta.usedQuery,
  strategy: meta.strategy,
  attempts: meta.attempts,
  elapsed_ms: meta.elapsed,
  variantsTried: meta.variants
});

const summarizeError = (provider, reason) => ({
  provider,
  status: 'error',
  message: reason?.message || String(reason || 'Unknown error')
});

// Wrapper with AbortSignal.timeout for each provider call + metrics
const withTimeout = async (providerName, fn, timeoutMs = PROVIDER_TIMEOUT) => {
  const startTime = Date.now();
  const timer = apiCallDuration.startTimer({ source: providerName });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fn(controller.signal);
    clearTimeout(timeoutId);

    const elapsed = Date.now() - startTime;
    timer();
    apiCallsTotal.inc({ source: providerName, status: 'success' });

    console.log(`[${providerName}] ✅ Success (${elapsed}ms)`);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    timer();
    apiCallsTotal.inc({ source: providerName, status: 'error' });

    const elapsed = Date.now() - startTime;
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.log(`[${providerName}] ⏱️  Timeout after ${elapsed}ms`);
      throw new Error(`Provider timeout after ${timeoutMs}ms`);
    }

    console.log(`[${providerName}] ❌ Error: ${error.message} (${elapsed}ms)`);
    throw error;
  }
};

const runMouser = async (query, key) => {
  const enhanced = await executeEnhancedSearch(query, (searchQuery) => {
    return mouserSearchByKeyword({ apiKey: key, q: searchQuery, records: 50 });
  });
  const parts = enhanced?.result?.data?.SearchResults?.Parts;
  const rows = Array.isArray(parts) ? parts.map(normMouser).filter(Boolean) : [];
  return {
    rows,
    meta: {
      total: rows.length,
      usedQuery: enhanced?.metadata?.usedQuery || query,
      strategy: enhanced?.metadata?.strategy || 'direct',
      attempts: enhanced?.metadata?.attempts || 0,
      elapsed: enhanced?.metadata?.elapsed || 0,
      variants: enhanced?.metadata?.processed?.queries?.length || 1
    }
  };
};

const runDigiKey = async (query, clientId, clientSecret) => {
  const enhanced = await executeEnhancedSearch(query, (searchQuery) => {
    return digikeySearch({
      clientId,
      clientSecret,
      keyword: searchQuery,
      limit: 25
    });
  });
  const products = enhanced?.result?.data?.Products || enhanced?.result?.data?.Items;
  const rows = Array.isArray(products) ? products.map(normDigiKey).filter(Boolean) : [];
  return {
    rows,
    meta: {
      total: rows.length,
      usedQuery: enhanced?.metadata?.usedQuery || query,
      strategy: enhanced?.metadata?.strategy || 'direct',
      attempts: enhanced?.metadata?.attempts || 0,
      elapsed: enhanced?.metadata?.elapsed || 0,
      variants: enhanced?.metadata?.processed?.queries?.length || 1
    }
  };
};

const runTME = async (query, token, secret) => {
  const enhanced = await executeEnhancedSearch(query, (searchQuery) => {
    return tmeSearchProducts({ token, secret, query: searchQuery });
  });
  // TME returns { data: { Data: { ProductList } } } - capital D!
  const searchList = enhanced?.result?.data?.Data?.ProductList || enhanced?.result?.data?.ProductList;

  if (!Array.isArray(searchList) || searchList.length === 0) {
    return {
      rows: [],
      meta: {
        total: 0,
        usedQuery: enhanced?.metadata?.usedQuery || query,
        strategy: enhanced?.metadata?.strategy || 'direct',
        attempts: enhanced?.metadata?.attempts || 0,
        elapsed: enhanced?.metadata?.elapsed || 0,
        variants: enhanced?.metadata?.processed?.queries?.length || 1
      }
    };
  }

  // TME Search API returns basic info only (no PriceList/InStock)
  // Need to call GetProducts for full details with ALL symbols
  console.log('[TME] Search returned', searchList.length, 'products');
  const symbols = searchList.slice(0, 10).map(p => p.Symbol).filter(Boolean);
  console.log('[TME] Extracted symbols:', symbols);

  if (symbols.length === 0) {
    console.log('[TME] No symbols found - returning empty');
    return {
      rows: [],
      meta: { total: 0, usedQuery: enhanced?.metadata?.usedQuery || query, strategy: 'no_symbols', attempts: 0, elapsed: 0, variants: 0 }
    };
  }

  // Call GetProducts with ALL symbols to get pricing
  try {
    console.log('[TME] Calling GetProducts for', symbols.length, 'symbols');
    const detailsResponse = await tmeGetProduct({
      token,
      secret,
      symbols: symbols, // Pass ALL symbols as array
      country: 'PL',
      language: 'EN'
    });

    console.log('[TME] GetProducts response status:', detailsResponse?.status);
    const detailsList = detailsResponse?.data?.Data?.ProductList || [];
    console.log('[TME] GetProducts returned', detailsList.length, 'products with pricing');

    // Log first product structure for debugging
    if (detailsList.length > 0) {
      console.log('[TME] Sample product keys:', Object.keys(detailsList[0]));
      console.log('[TME] Sample PriceList:', detailsList[0]?.PriceList);
    }

    const rows = Array.isArray(detailsList) ? detailsList.map(normTME).filter(Boolean) : [];
    console.log('[TME] Normalized', rows.length, 'rows');

    // Log first normalized row for debugging
    if (rows.length > 0) {
      console.log('[TME] Sample normalized:', JSON.stringify(rows[0], null, 2));
    }

    return {
      rows,
      meta: {
        total: rows.length,
        usedQuery: enhanced?.metadata?.usedQuery || query,
        strategy: enhanced?.metadata?.strategy || 'getproducts',
        attempts: enhanced?.metadata?.attempts || 0,
        elapsed: enhanced?.metadata?.elapsed || 0,
        variants: enhanced?.metadata?.processed?.queries?.length || 1,
        tme_symbols: symbols.length,
        tme_details: rows.length
      }
    };
  } catch (err) {
    console.error('[TME] GetProducts failed:', err.message);
    console.error('[TME] Full error:', err);
    // Fallback to search results (basic info only - NO PRICING)
    const rows = searchList.map(normTME).filter(Boolean);
    console.log('[TME] Fallback to Search results (no pricing):', rows.length, 'rows');
    return {
      rows,
      meta: {
        total: rows.length,
        usedQuery: enhanced?.metadata?.usedQuery || query,
        strategy: 'search_fallback',
        attempts: enhanced?.metadata?.attempts || 0,
        elapsed: enhanced?.metadata?.elapsed || 0,
        variants: enhanced?.metadata?.processed?.queries?.length || 1,
        error: 'getproducts_failed'
      }
    };
  }
};

const runFarnell = async (query, apiKey, region) => {
  const enhanced = await executeEnhancedSearch(query, (searchQuery) => {
    return farnellByKeyword({ apiKey, region, q: searchQuery, limit: 25 });
  });
  // Farnell uses keywordSearchReturn wrapper
  const products = enhanced?.result?.data?.keywordSearchReturn?.products
    || enhanced?.result?.data?.premierFarnellProductSearchReturn?.products
    || enhanced?.result?.data?.products;

  const rows = Array.isArray(products) ? products.map((item) => normFarnell(item, region)).filter(Boolean) : [];
  return {
    rows,
    meta: {
      total: rows.length,
      usedQuery: enhanced?.metadata?.usedQuery || query,
      strategy: enhanced?.metadata?.strategy || 'direct',
      attempts: enhanced?.metadata?.attempts || 0,
      elapsed: enhanced?.metadata?.elapsed || 0,
      variants: enhanced?.metadata?.processed?.queries?.length || 1
    }
  };
};

export async function orchestrateProviderSearch(query, keys) {
  const trimmed = String(query || '').trim();
  if (!trimmed) {
    return { rows: [], providers: [] };
  }

  // Create queue with concurrency limit
  const queue = new PQueue({ concurrency: CONCURRENCY });

  // Build provider tasks with timeout wrappers
  const providerConfigs = [];

  if (keys?.mouser) {
    providerConfigs.push({
      name: 'mouser',
      fn: () => withTimeout('mouser', () => runMouser(trimmed, keys.mouser))
    });
  }

  if (keys?.digikeyClientId && keys?.digikeyClientSecret) {
    providerConfigs.push({
      name: 'digikey',
      fn: () => withTimeout('digikey', () => runDigiKey(trimmed, keys.digikeyClientId, keys.digikeyClientSecret))
    });
  }

  if (keys?.tmeToken && keys?.tmeSecret) {
    providerConfigs.push({
      name: 'tme',
      fn: () => withTimeout('tme', () => runTME(trimmed, keys.tmeToken, keys.tmeSecret))
    });
  }

  if (keys?.farnell) {
    providerConfigs.push({
      name: 'farnell',
      fn: () => withTimeout('farnell', () => runFarnell(trimmed, keys.farnell, keys.farnellRegion || 'uk.farnell.com'))
    });
  }

  if (providerConfigs.length === 0) {
    return { rows: [], providers: [] };
  }

  console.log(`[Orchestrator] Running ${providerConfigs.length} providers (concurrency=${CONCURRENCY}, timeout=${PROVIDER_TIMEOUT}ms)`);

  // Queue all provider tasks
  const tasks = providerConfigs.map(config =>
    queue.add(() => config.fn()).then(
      result => ({ status: 'fulfilled', value: result, provider: config.name }),
      error => ({ status: 'rejected', reason: error, provider: config.name })
    )
  );

  // Wait for all tasks to complete
  const settled = await Promise.all(tasks);
  const providerSummaries = [];
  let aggregatedRows = [];

  settled.forEach((result) => {
    const provider = result.provider;
    if (result.status === 'fulfilled') {
      aggregatedRows = aggregatedRows.concat(result.value.rows);
      providerSummaries.push(summarizeResult(provider, result.value.meta));
    } else {
      providerSummaries.push(summarizeError(provider, result.reason));
    }
  });

  // Add manual products to search results (at the beginning for priority)
  const manualProducts = searchManualProducts(trimmed);
  aggregatedRows = manualProducts.concat(aggregatedRows);

  // Add manual products provider summary
  if (manualProducts.length > 0) {
    providerSummaries.push({
      provider: 'manual',
      status: 'ok',
      total: manualProducts.length,
      elapsed_ms: 0,
      variants: 1
    });
  }

        const deduped = dedupeRows(aggregatedRows).slice(0, 60);
        const ranked = rankRows(deduped, trimmed);

        // Применяем наценку ко всем товарам
        const productsWithMarkup = applyMarkupToProducts(ranked);

        return {
          rows: productsWithMarkup,
          providers: providerSummaries
        };
}
