import { fetchWithRetry } from '../../utils/fetchWithRetry.mjs';

const BASE = 'https://api.element14.com/catalog/products';

async function get(params) {
  const u = new URL(BASE);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));

  const response = await fetchWithRetry(u.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  }).catch(() => ({ ok: false, status: 0 }));

  if (!response.ok) return { ok: false, status: response.status || 0, data: {} };

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  return { ok: response.ok, status: response.status, data };
}

export const farnellByMPN = ({ apiKey, region, q, limit = 25, offset = 0 }) =>
  get({ 'callInfo.responseDataFormat': 'JSON', 'term': `manuPartNum:${q}`, 'storeInfo.id': region, 'resultsSettings.offset': offset, 'resultsSettings.numberOfResults': limit, 'resultsSettings.responseGroup': 'large,Prices,Inventory', 'callInfo.apiKey': apiKey });

export const farnellByKeyword = ({ apiKey, region, q, limit = 25, offset = 0 }) =>
  get({ 'callInfo.responseDataFormat': 'JSON', 'term': `any:${q}`, 'storeInfo.id': region, 'resultsSettings.offset': offset, 'resultsSettings.numberOfResults': limit, 'resultsSettings.responseGroup': 'large,Prices,Inventory', 'callInfo.apiKey': apiKey });