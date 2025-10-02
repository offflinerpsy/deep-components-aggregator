/**
 * TME (Transfer Multisort Elektronik) API Client
 * https://developers.tme.eu/
 * 
 * Authentication: Token + Secret (HMAC signature)
 */

import crypto from 'crypto';
import { request, ProxyAgent } from 'undici';

const BASE = 'https://api.tme.eu';

// Proxy setup (same as DigiKey)
let proxyDispatcherCached = undefined;
async function getProxyDispatcher() {
  if (proxyDispatcherCached !== undefined) return proxyDispatcherCached;
  const proxyUrl = process.env.DIGIKEY_OUTBOUND_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  if (!proxyUrl) {
    proxyDispatcherCached = null;
    return null;
  }
  try {
    proxyDispatcherCached = new ProxyAgent(proxyUrl);
    console.log(`[TME] ✅ Using outbound proxy: ${proxyUrl}`);
    return proxyDispatcherCached;
  } catch (e) {
    console.error(`[TME] ⚠️ Proxy setup failed:`, e.message);
    proxyDispatcherCached = null;
    return null;
  }
}

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
  
  // Use proxy if configured
  const dispatcher = await getProxyDispatcher();
  const requestOptions = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  };
  if (dispatcher) {
    requestOptions.dispatcher = dispatcher;
  }
  
  const response = await request(url, requestOptions);
  
  if (response.statusCode !== 200) {
    const text = await response.body.text();
    throw new Error(`TME API error: ${response.statusCode} - ${text}`, {
      cause: { status: response.statusCode, data: text }
    });
  }
  
  const data = await response.body.json();
  return { data, status: response.statusCode };
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
  
  // Use proxy if configured
  const dispatcher = await getProxyDispatcher();
  const requestOptions = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  };
  if (dispatcher) {
    requestOptions.dispatcher = dispatcher;
  }
  
  const response = await request(url, requestOptions);
  
  if (response.statusCode !== 200) {
    const text = await response.body.text();
    throw new Error(`TME API error: ${response.statusCode} - ${text}`, {
      cause: { status: response.statusCode, data: text }
    });
  }
  
  const data = await response.body.json();
  return { data, status: response.statusCode };
}
