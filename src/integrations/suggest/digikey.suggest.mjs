// src/integrations/suggest/digikey.suggest.mjs
// DigiKey KeywordSearch для автодополнения
// API: https://developer.digikey.com/
// Auth: OAuth 2.0 (3-legged требует токен)
// Limits: 1000 calls/day

import { fetch } from 'undici';

const API_BASE = (process.env.DIGIKEY_API_BASE || 'https://api.digikey.com').replace(/\/$/, '');
const TOKEN_URL = `${API_BASE}/v1/oauth2/token`;
const SEARCH_URL = `${API_BASE}/products/v4/search/keyword`;
const TIMEOUT = 1200;
const USER_AGENT = process.env.DIGIKEY_USER_AGENT || 'DeepAgg-Autocomplete/1.0';

let cachedToken = null;
let tokenExpiry = 0;

/**
 * @typedef {Object} SuggestRow
 * @property {string} mpn
 * @property {string} [title]
 * @property {string} [manufacturer]
 * @property {'digikey'} source
 */

/**
 * Получить OAuth токен (2-legged)
 */
async function getToken() {
  const clientId = process.env.DIGIKEY_CLIENT_ID;
  const clientSecret = process.env.DIGIKEY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  // Кэшированный токен
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': USER_AGENT,
      'X-DIGIKEY-Client-Id': clientId
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    }),
    signal: controller.signal
  }).catch(() => {
    clearTimeout(timeoutId);
    return null;
  });

  clearTimeout(timeoutId);

  if (!response || !response.ok) {
    return null;
  }

  const json = await response.json().catch(() => null);
  if (!json || !json.access_token) {
    return null;
  }

  cachedToken = json.access_token;
  tokenExpiry = Date.now() + ((json.expires_in || 3600) - 60) * 1000;

  return cachedToken;
}

/**
 * DigiKey suggest через KeywordSearch
 * @param {string} q - Поисковый запрос
 * @returns {Promise<SuggestRow[]>}
 */
export async function digikeySuggest(q) {
  // Guard: короткий запрос
  if (!q || q.length < 2) {
    return [];
  }

  const token = await getToken();
  
  // Guard: нет токена
  if (!token) {
    return [];
  }

  const body = {
    Keywords: q,
    RecordCount: 5,
    RecordStartPosition: 0,
    Sort: {
      Option: 'SortByManufacturerPartNumber',
      Direction: 'Ascending',
      SortParameterId: 0
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  const response = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': USER_AGENT,
      'X-DIGIKEY-Client-Id': process.env.DIGIKEY_CLIENT_ID || ''
    },
    body: JSON.stringify(body),
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
  if (!json || !json.Products || !Array.isArray(json.Products)) {
    return [];
  }

  // Маппинг в SuggestRow
  return json.Products.slice(0, 5).map(product => ({
    mpn: product.ManufacturerPartNumber || product.DigiKeyPartNumber || '',
    title: product.ProductDescription || '',
    manufacturer: product.Manufacturer?.Name || '',
    source: 'digikey'
  })).filter(r => r.mpn);
}
