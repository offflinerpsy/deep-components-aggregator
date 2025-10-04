/**
 * DigiKey API Client (server-side only)
 * https://developer.digikey.com/
 *
 * Auth: OAuth 2.0 Client Credentials (2-legged)
 * Endpoints: Product Information v4
 */

import { fetchWithRetry } from '../../utils/fetchWithRetry.mjs';

const RAW_BASE = process.env.DIGIKEY_API_BASE || 'https://api.digikey.com';
const API_BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

// DigiKey OAuth token endpoint (standard path)
const TOKEN_URL = `${API_BASE}/v1/oauth2/token`;
// Product Information v4 API
const V4_BASE = `${API_BASE}/products/v4`;
const SEARCH_KEYWORD_URL = `${V4_BASE}/search/keyword`;
// Details by DKPN (DigiKey Part Number): /products/v4/search/{dkpn}/productdetails
const PRODUCT_DETAILS_BY_DKPN_URL = (dkpn) => `${V4_BASE}/search/${encodeURIComponent(dkpn)}/productdetails`;

// Use a browser-like UA by default to avoid upstream WAF over-filtering. Can be overridden via env.
const USER_AGENT = process.env.DIGIKEY_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

let cachedToken = null;
let tokenExpiry = 0;

function buildError(status, body, phase) {
  const normalized = (body || '').toLowerCase();
  if (normalized.includes('blocked.digikey.com') || normalized.includes('we\'re sorry')) {
    return new Error(`DigiKey IP blocked during ${phase}. Configure DIGIKEY_API_BASE to use a proxy (see README-DIGIKEY.md). Raw status ${status}`);
  }
  return new Error(`DigiKey ${phase} error: ${status} - ${body}`);
}

/**
 * Get OAuth access token
 * @param {Object} params
 * @param {string} params.clientId - DigiKey Client ID
 * @param {string} params.clientSecret - DigiKey Client Secret
 * @returns {Promise<string>}
 */
async function getAccessToken({ clientId, clientSecret }) {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  console.log('[DigiKey] Requesting new access token...');

  const response = await fetchWithRetry(TOKEN_URL, {
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
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw buildError(response.status, error, 'OAuth');
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Set expiry to 5 minutes before actual expiry for safety
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  console.log('[DigiKey] ✅ Access token obtained');
  return cachedToken;
}

function commonHeaders(clientId, token) {
  return {
    'Authorization': `Bearer ${token}`,
    'X-DIGIKEY-Client-Id': clientId,
    // Locales improve relevancy; safe defaults
    'X-DIGIKEY-Locale-Site': 'US',
    'X-DIGIKEY-Locale-Language': 'en',
    'X-DIGIKEY-Locale-Currency': 'USD',
    'Accept': 'application/json',
    'User-Agent': USER_AGENT
  };
}

/**
 * Search products by keyword
 * @param {Object} params
 * @param {string} params.clientId - DigiKey Client ID
 * @param {string} params.clientSecret - DigiKey Client Secret
 * @param {string} params.keyword - Search keyword
 * @param {number} params.limit - Number of results (default: 10)
 * @returns {Promise<Object>}
 */
export async function digikeySearchByKeyword({ clientId, clientSecret, keyword, limit = 10, offset = 0 }) {
  const token = await getAccessToken({ clientId, clientSecret });

  const response = await fetchWithRetry(SEARCH_KEYWORD_URL, {
    method: 'POST',
    headers: {
      ...commonHeaders(clientId, token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Keywords: String(keyword || '').trim(),
      RecordCount: Number(limit) || 10,
      RecordStartPosition: Number(offset) || 0
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw buildError(response.status, error, 'keyword search');
  }

  const data = await response.json();
  return { ok: true, status: response.status, data };
}

/**
 * Get product details by part number
 * @param {Object} params
 * @param {string} params.clientId - DigiKey Client ID
 * @param {string} params.clientSecret - DigiKey Client Secret
 * @param {string} params.partNumber - Manufacturer part number or DigiKey part number
 * @returns {Promise<Object>}
 */
export async function digikeyGetProduct({ clientId, clientSecret, partNumber }) {
  const token = await getAccessToken({ clientId, clientSecret });

  // If it looks like a DigiKey Part Number (often ends with -ND), try productdetails by DKPN first
  const looksLikeDkpn = /-ND$/i.test(String(partNumber));
  if (looksLikeDkpn) {
    const response = await fetchWithRetry(PRODUCT_DETAILS_BY_DKPN_URL(partNumber), {
      method: 'GET',
      headers: commonHeaders(clientId, token)
    });
    if (response.ok) {
      const data = await response.json();
      return { ok: true, status: response.status, data };
    }
    // fallthrough to keyword search on non-200
  }

  // Fallback: keyword search and return payload as-is (caller can pick first result)
  const response = await fetchWithRetry(SEARCH_KEYWORD_URL, {
    method: 'POST',
    headers: {
      ...commonHeaders(clientId, token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Keywords: String(partNumber || '').trim(),
      RecordCount: 5,
      RecordStartPosition: 0
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw buildError(response.status, error, 'product fetch');
  }

  const data = await response.json();
  return { ok: true, status: response.status, data };
}

/**
 * Search products with filters
 * @param {Object} params
 * @param {string} params.clientId - DigiKey Client ID
 * @param {string} params.clientSecret - DigiKey Client Secret
 * @param {string} params.keyword - Search keyword
 * @param {number} params.limit - Number of results
 * @param {number} params.offset - Offset for pagination
 * @returns {Promise<Object>}
 */
export async function digikeySearch({ clientId, clientSecret, keyword, limit = 10, offset = 0 }) {
  // Single alias wrapper to v4 keyword search
  return digikeySearchByKeyword({ clientId, clientSecret, keyword, limit, offset });
}
