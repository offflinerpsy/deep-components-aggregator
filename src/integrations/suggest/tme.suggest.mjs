// src/integrations/suggest/tme.suggest.mjs
// TME Products/Search для автодополнения
// API: https://developers.tme.eu/
// Auth: Token + HMAC-SHA1 signature
// Limits: 5 rps upper bound (держим 1 rps)

import crypto from 'crypto';
import httpBuildQuery from 'http-build-query';
import sortKeysRecursive from 'sort-keys-recursive';
import { fetch } from 'undici';

const BASE = 'https://api.tme.eu';
const TIMEOUT = 1200;

/**
 * @typedef {Object} SuggestRow
 * @property {string} mpn
 * @property {string} [title]
 * @property {string} [manufacturer]
 * @property {'tme'} source
 */

// In-memory LRU cache для дедупликации (TTL 60s)
const cache = new Map();
const CACHE_TTL = 60000;

/**
 * PHP rawurlencode() compatible
 */
function rawurlencode(text) {
  text = (text + '');
  return encodeURIComponent(text)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

/**
 * Generate HMAC-SHA1 signature для TME API
 */
function generateSignature(secret, method, url, params) {
  const sortedParams = sortKeysRecursive(params);
  const queryString = httpBuildQuery(sortedParams);
  const signatureBase =
    method.toUpperCase() +
    '&' + rawurlencode(url) +
    '&' + rawurlencode(queryString);

  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(signatureBase, 'utf8');
  return hmac.digest('base64');
}

/**
 * TME suggest через Products/Search
 * @param {string} q - Поисковый запрос
 * @returns {Promise<SuggestRow[]>}
 */
export async function tmeSuggest(q) {
  const token = process.env.TME_TOKEN;
  const secret = process.env.TME_SECRET;
  
  // Guard: нет credentials
  if (!token || !secret) {
    return [];
  }
  
  // Guard: короткий запрос
  if (!q || q.length < 2) {
    return [];
  }

  // Проверяем кэш
  const cacheKey = `tme:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = `${BASE}/Products/Search.json`;
  const params = {
    Token: token,
    SearchPlain: q,
    Country: 'PL',
    Language: 'EN',
    SearchOrder: 'ACCURACY'
  };

  const signature = generateSignature(secret, 'POST', url, params);
  params.ApiSignature = signature;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'DeepAgg-Autocomplete/1.0'
    },
    body: httpBuildQuery(params),
    signal: controller.signal
  }).catch(err => {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') return null;
    return null;
  });

  clearTimeout(timeoutId);

  // Guard: нет ответа
  if (!response || !response.ok) {
    return [];
  }

  const json = await response.json().catch(() => null);
  
  // Guard: нет продуктов
  if (!json || !json.Data || !json.Data.ProductList) {
    return [];
  }

  const products = json.Data.ProductList;
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  // Маппинг в SuggestRow
  const results = products.slice(0, 5).map(product => ({
    mpn: product.Symbol || '',
    title: product.Description || '',
    manufacturer: product.Producer || '',
    source: 'tme'
  })).filter(r => r.mpn);

  // Сохраняем в кэш
  cache.set(cacheKey, { data: results, timestamp: Date.now() });

  // Очистка старых записей (простая LRU)
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  return results;
}
