/**
 * Search Diagnostics API — "Why no results?"
 *
 * GET /api/search/reasons?q=... — Diagnose empty search results
 *
 * Returns:
 *  - warp_on: boolean (WARP egress active)
 *  - providers_reachable: {mouser, tme, farnell, digikey} (HEAD ping results)
 *  - cache_count: number (FTS5 matches in local cache)
 *  - query_norm: object (RU→EN normalization details)
 *  - advice: Array<string> (user-facing suggestions)
 *
 * **Timeouts**: All checks < 10s (WARP proxy-mode limit)
 */

import { openDb, searchCachedFts } from '../src/db/sql.mjs';
import { normalizeQuery } from '../src/search/normalizeQuery.mjs';

/**
 * Check if WARP egress is active
 * Fetches https://1.1.1.1/cdn-cgi/trace and checks for "warp=on"
 *
 * @returns {Promise<boolean>} - True if WARP is active
 */
async function checkWarp() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch('https://1.1.1.1/cdn-cgi/trace', {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const text = await response.text();
    return text.includes('warp=on') || text.includes('warp=plus');
  } catch (err) {
    return false;
  }
}

/**
 * Check provider reachability with HEAD requests
 *
 * @param {Object} keys - API keys from config
 * @returns {Promise<Object>} - {mouser, tme, farnell, digikey} with boolean values
 */
async function checkProviders(keys) {
  const providers = {
    mouser: 'https://api.mouser.com',
    tme: 'https://api.tme.eu',
    farnell: 'https://api.element14.com',
    digikey: 'https://api.digikey.com'
  };

  const results = {};

  // Check each provider in parallel with 8s timeout
  const checks = Object.entries(providers).map(async ([name, url]) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Any response (even 404) means reachable
      results[name] = true;
    } catch (err) {
      results[name] = false;
    }
  });

  await Promise.all(checks);

  return results;
}

/**
 * Generate user-facing advice based on diagnostics
 *
 * @param {Object} diagnostics - Full diagnostic results
 * @returns {Array<string>} - User-facing suggestions
 */
function generateAdvice(diagnostics) {
  const advice = [];

  // No cache results
  if (diagnostics.cache_count === 0) {
    if (diagnostics.query_norm.hasCyrillic) {
      advice.push(`Попробуйте английский вариант: "${diagnostics.query_norm.normalized}"`);
    }
    advice.push('Попробуйте более общий запрос (например, "транзистор" вместо конкретного MPN)');
  }

  // WARP not active
  if (!diagnostics.warp_on) {
    advice.push('⚠️ WARP egress отключён — провайдеры могут быть недоступны');
  }

  // Providers unreachable
  const unreachable = Object.entries(diagnostics.providers_reachable)
    .filter(([_, reachable]) => !reachable)
    .map(([name]) => name);

  if (unreachable.length > 0) {
    advice.push(`⚠️ Недоступны провайдеры: ${unreachable.join(', ')}`);
  }

  // All checks passed but still no results
  if (diagnostics.cache_count === 0 && diagnostics.warp_on && unreachable.length === 0) {
    advice.push('Попробуйте другие ключевые слова или проверьте написание');
    advice.push('Используйте диагностику сети: /ui/diag.html');
  }

  return advice;
}

/**
 * Main diagnostics endpoint
 */
export default function mountSearchReasons(app, { keys }) {
  app.get('/api/search/reasons', async (req, res) => {
    const q = String(req.query.q || '').trim();

    if (!q) {
      res.json({
        ok: true,
        warp_on: false,
        providers_reachable: {},
        cache_count: 0,
        query_norm: null,
        advice: ['Введите поисковый запрос']
      });
      return;
    }

    // Run diagnostics in parallel
    const [warp_on, providers_reachable, queryMeta] = await Promise.all([
      checkWarp(),
      checkProviders(keys),
      Promise.resolve(normalizeQuery(q))
    ]);

    // Check cache with normalized query
    const db = openDb();
    const ftsQuery = queryMeta.normalized;
    const cacheResults = searchCachedFts(db, ftsQuery, { limit: 100 });
    const cache_count = cacheResults.length;

    const diagnostics = {
      ok: true,
      warp_on,
      providers_reachable,
      cache_count,
      query_norm: queryMeta,
      advice: []
    };

    // Generate advice
    diagnostics.advice = generateAdvice(diagnostics);

    res.json(diagnostics);
  });
}
