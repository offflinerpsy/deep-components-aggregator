// src/integrations/suggest/mouser.suggest.mjs
// Mouser Keyword/PartNumber Search для автодополнения
// API: https://www.mouser.com/api-hub/
// Limits: 30 calls/min, 1000 calls/day

import { fetch } from 'undici';

const BASE = 'https://api.mouser.com/api/v1';
const TIMEOUT = 1200;

/**
 * @typedef {Object} SuggestRow
 * @property {string} mpn
 * @property {string} [title]
 * @property {string} [manufacturer]
 * @property {'mouser'} source
 */

/**
 * Mouser suggest через Keyword Search
 * @param {string} q - Поисковый запрос
 * @returns {Promise<SuggestRow[]>}
 */
export async function mouserSuggest(q) {
  const apiKey = process.env.MOUSER_API_KEY;
  
  // Guard: нет ключа → пусто
  if (!apiKey) {
    return [];
  }
  
  // Guard: короткий запрос
  if (!q || q.length < 2) {
    return [];
  }

  const url = `${BASE}/search/keyword?apiKey=${encodeURIComponent(apiKey)}`;
  const body = {
    SearchByKeywordRequest: {
      keyword: q,
      records: 5, // Только 5 результатов для автодополнения
      startingRecord: 0
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'DeepAgg-Autocomplete/1.0'
    },
    body: JSON.stringify(body),
    signal: controller.signal
  }).catch(err => {
    // Guard: timeout/network error
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
  
  // Guard: ошибки API
  if (!json || !json.SearchResults || !json.SearchResults.Parts) {
    return [];
  }

  const errors = json.Errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return [];
  }

  const parts = json.SearchResults.Parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    return [];
  }

  // Маппинг в SuggestRow
  return parts.slice(0, 5).map(part => ({
    mpn: part.MouserPartNumber || part.ManufacturerPartNumber || '',
    title: part.Description || '',
    manufacturer: part.Manufacturer || '',
    source: 'mouser'
  })).filter(r => r.mpn); // Только с MPN
}
