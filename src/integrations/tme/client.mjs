/**
 * TME (Transfer Multisort Elektronik) API Client
 * https://developers.tme.eu/
 * 
 * Authentication: Token + Secret (HMAC signature)
 */

import crypto from 'crypto';
import { fetchWithRetry } from '../../utils/fetchWithRetry.mjs';

const BASE = 'https://api.tme.eu';

/**
 * Generate HMAC-SHA1 signature for TME API
 * Based on official TME API examples:
 * https://github.com/tme-dev/TME-API
 * https://github.com/tme-dev/api-client-guzzle
 * 
 * Format: POST&encoded_url&encoded_params
 */
function generateSignature(secret, method, url, params) {
  // 1. Sort params (exclude Token from signature calculation)
  const sortedParams = {};
  Object.keys(params)
    .filter(k => k !== 'ApiSignature') // Don't include signature itself
    .sort()
    .forEach(k => {
      sortedParams[k] = params[k];
    });
  
  // 2. Build query string (arrays handled as key[0]=val1&key[1]=val2)
  const queryParts = [];
  for (const [key, value] of Object.entries(sortedParams)) {
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        queryParts.push(`${encodeURIComponent(key)}[${i}]=${encodeURIComponent(v)}`);
      });
    } else {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  const queryString = queryParts.join('&');
  
  // 3. Build signature base: METHOD&encoded_url&encoded_params
  const signatureBase = 
    method.toUpperCase() + 
    '&' + encodeURIComponent(url) + 
    '&' + encodeURIComponent(queryString);
  
  console.log('[TME] Signature base:', signatureBase);
  
  // 4. Generate HMAC-SHA1 with secret key and encode as Base64
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(signatureBase, 'utf8');
  
  return hmac.digest('base64');
}

/**
 * Search products by keyword
 * @param {Object} params
 * @param {string} params.token - TME API token
 * @param {string} params.secret - TME API secret
 * @param {string} params.query - Search query
 * @param {string} params.country - Country code (default: PL)
 * @param {string} params.language - Language (default: EN)
 * @returns {Promise<Object>}
 */
export async function tmeSearchProducts({ token, secret, query, country = 'PL', language = 'EN' }) {
  const url = `${BASE}/Products/Search.json`;
  const params = {
    Token: token,
    SearchPlain: query,
    Country: country,
    Language: language,
    SearchOrder: 'ACCURACY'
  };
  
  // Generate signature: (secret, method, url, params)
  const signature = generateSignature(secret, 'POST', url, params);
  params.ApiSignature = signature;
  
  // TME API requires POST with form data in body, not query string
  const formData = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    formData.append(key, value);
  }
  
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TME API error: ${response.status} - ${text}`, {
      cause: { status: response.status, data: text }
    });
  }
  
  const data = await response.json();
  return { data, status: response.status };
}

/**
 * Get product details
 * @param {Object} params
 * @param {string} params.token - TME API token
 * @param {string} params.secret - TME API secret
 * @param {string} params.symbol - Product symbol/SKU
 * @param {string} params.country - Country code (default: PL)
 * @param {string} params.language - Language (default: EN)
 * @returns {Promise<Object>}
 */
export async function tmeGetProduct({ token, secret, symbol, country = 'PL', language = 'EN' }) {
  const url = `${BASE}/Products/GetProducts.json`;
  const params = {
    Token: token,
    SymbolList: [symbol],
    Country: country,
    Language: language
  };
  
  // Generate signature: (secret, method, url, params)
  const signature = generateSignature(secret, 'POST', url, params);
  params.ApiSignature = signature;
  
  // TME API requires POST with form data in body, not query string
  const formData = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((v, i) => formData.append(`${key}[${i}]`, v));
    } else {
      formData.append(key, value);
    }
  }
  
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TME API error: ${response.status} - ${text}`, {
      cause: { status: response.status, data: text }
    });
  }
  
  const data = await response.json();
  return { data, status: response.status };
}
