/**
 * TME (Transfer Multisort Elektronik) API Client
 * https://developers.tme.eu/
 *
 * Authentication: Token + Secret (HMAC signature)
 * Based on official JavaScript client: https://github.com/piotrkochan/tme-api-client
 */

import crypto from 'crypto';
import httpBuildQuery from 'http-build-query';
import sortKeysRecursive from 'sort-keys-recursive';
import { fetchWithRetry } from '../../utils/fetchWithRetry.mjs';

const BASE = 'https://api.tme.eu';

/**
 * PHP rawurlencode() compatible function
 * @see http://locutus.io/php/url/rawurlencode/
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
 * Generate HMAC-SHA1 signature for TME API
 * EXACTLY like official JavaScript client
 */
function generateSignature(secret, method, url, params) {
  // 1. Sort params recursively (deep sort for arrays)
  const sortedParams = sortKeysRecursive(params);

  // 2. Build query string using PHP-compatible http-build-query
  // NOTE: http-build-query already encodes params, including [] in array keys
  const queryString = httpBuildQuery(sortedParams);

  // 3. Build signature base: METHOD&rawurlencode(url)&rawurlencode(queryString)
  // NOTE: queryString is already encoded by http-build-query, we just need to encode it ONCE more for signature base
  const signatureBase =
    method.toUpperCase() +
    '&' + rawurlencode(url) +
    '&' + rawurlencode(queryString);

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

  // Diagnostics: log exact serialized body and subset of params (avoid leaking full token)
  console.log('[TME][Search] Body:', formData.toString().replace(token, '***TOKEN***'));
  console.log('[TME][Search] Params keys:', Object.keys(params));
  console.log('[TME][Search] Signature (len):', signature?.length);

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
 * @param {string|string[]} params.symbol - Product symbol/SKU (single or array)
 * @param {string[]} params.symbols - Array of symbols (alternative to symbol)
 * @param {string} params.country - Country code (default: PL)
 * @param {string} params.language - Language (default: EN)
 * @returns {Promise<Object>}
 */
export async function tmeGetProduct({ token, secret, symbol, symbols, country = 'PL', language = 'EN' }) {
  const url = `${BASE}/Products/GetProducts.json`;

  // Support both symbol (single/array) and symbols (array) parameters
  let symbolList;
  if (symbols && Array.isArray(symbols)) {
    symbolList = symbols;
  } else if (Array.isArray(symbol)) {
    symbolList = symbol;
  } else if (symbol) {
    symbolList = [symbol];
  } else {
    throw new Error('TME GetProducts requires symbol or symbols parameter');
  }

  const params = {
    Token: token,
    SymbolList: symbolList,
    Country: country,
    Language: language
  };

  // Generate signature: (secret, method, url, params)
  const signature = generateSignature(secret, 'POST', url, params);

  // Add signature to params BEFORE building formData
  // (must use the SAME params order for signature and body)
  params.ApiSignature = signature;

  // TME API requires POST with form data in body, not query string
  // IMPORTANT: Sort params BEFORE building query string to match signature
  const sortedParams = sortKeysRecursive(params);
  const bodyString = httpBuildQuery(sortedParams);

  // Diagnostics: inspect final serialized form
  console.log('[TME][GetProducts] Symbol count:', symbolList.length);
  console.log('[TME][GetProducts] Body preview:', bodyString.slice(0, 180) + (bodyString.length > 180 ? '...' : ''));
  console.log('[TME][GetProducts] Signature (len):', signature?.length);
  console.log('[TME][GetProducts] First symbol:', symbolList[0]);

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyString
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
