// src/integrations/suggest/farnell.suggest.mjs
// Farnell/element14 Product Search для автодополнения
// API: https://partner.element14.com/docs/
// Auth: API Key

import { fetch } from 'undici';

const BASE = 'https://api.element14.com/catalog/products';
const TIMEOUT = 1200;

/**
 * @typedef {Object} SuggestRow
 * @property {string} mpn
 * @property {string} [title]
 * @property {string} [manufacturer]
 * @property {'farnell'} source
 */

/**
 * Farnell suggest через Product Search
 * @param {string} q - Поисковый запрос
 * @returns {Promise<SuggestRow[]>}
 */
export async function farnellSuggest(q) {
  const apiKey = process.env.FARNELL_API_KEY;
  const region = process.env.FARNELL_REGION || 'uk.farnell.com';
  
  // Guard: нет ключа
  if (!apiKey) {
    return [];
  }
  
  // Guard: короткий запрос
  if (!q || q.length < 2) {
    return [];
  }

  // Пробуем сначала MPN, если выглядит как part number
  const isMpnLike = /^[A-Za-z0-9\-_.]{2,}$/.test(q);
  const term = isMpnLike ? `manuPartNum:${q}` : `any:${q}`;

  const url = new URL(BASE);
  url.searchParams.set('callInfo.responseDataFormat', 'JSON');
  url.searchParams.set('callInfo.apiKey', apiKey);
  url.searchParams.set('term', term);
  url.searchParams.set('storeInfo.id', region);
  url.searchParams.set('resultsSettings.offset', '0');
  url.searchParams.set('resultsSettings.numberOfResults', '5');
  url.searchParams.set('resultsSettings.responseGroup', 'small'); // Минимальные поля

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'DeepAgg-Autocomplete/1.0'
    },
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
  if (!json || !json.keywordSearchReturn || !json.keywordSearchReturn.products) {
    return [];
  }

  const products = json.keywordSearchReturn.products;
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  // Маппинг в SuggestRow
  return products.slice(0, 5).map(product => ({
    mpn: product.translatedManufacturerPartNumber || product.sku || '',
    title: product.displayName || '',
    manufacturer: product.brandName || '',
    source: 'farnell'
  })).filter(r => r.mpn);
}
