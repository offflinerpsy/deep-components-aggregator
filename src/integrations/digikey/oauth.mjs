/**
 * DigiKey API Client with Authorization Code Flow
 * https://developer.digikey.com/
 * 
 * Authentication: OAuth 2.0 Authorization Code (3-legged)
 * Requires user browser interaction for initial authorization
 */

import { fetch } from 'undici';

const AUTH_URL = 'https://api.digikey.com/v1/oauth2/authorize';
const TOKEN_URL = 'https://api.digikey.com/v1/oauth2/token';
const SEARCH_URL = 'https://api.digikey.com/Search/v3/Products/Keyword';

let accessToken = null;
let refreshToken = null;
let tokenExpiry = 0;

/**
 * Step 1: Generate authorization URL for user to visit
 * @param {Object} params
 * @param {string} params.clientId - DigiKey Client ID
 * @param {string} params.redirectUri - Callback URL
 * @returns {string} Authorization URL
 */
export function getAuthorizationUrl({ clientId, redirectUri }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri
  });
  
  const authUrl = `${AUTH_URL}?${params.toString()}`;
  console.log('[DigiKey] Authorization URL:', authUrl);
  console.log('[DigiKey] Please visit this URL to authorize the app');
  
  return authUrl;
}

/**
 * Step 2: Exchange authorization code for access token
 * @param {Object} params
 * @param {string} params.clientId - DigiKey Client ID
 * @param {string} params.clientSecret - DigiKey Client Secret
 * @param {string} params.code - Authorization code from callback
 * @param {string} params.redirectUri - Callback URL (must match)
 * @returns {Promise<Object>}
 */
export async function exchangeCodeForToken({ clientId, clientSecret, code, redirectUri }) {
  console.log('[DigiKey] Exchanging authorization code for token...');
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DigiKey token exchange error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  console.log('[DigiKey] ✅ Access token obtained');
  console.log('[DigiKey] Refresh token:', refreshToken ? '✅ Available' : '❌ Not provided');
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

/**
 * Refresh access token using refresh token
 * @param {Object} params
 * @param {string} params.clientId - DigiKey Client ID
 * @param {string} params.clientSecret - DigiKey Client Secret
 * @param {string} params.refreshToken - Refresh token
 * @returns {Promise<Object>}
 */
export async function refreshAccessToken({ clientId, clientSecret, refreshToken: token }) {
  console.log('[DigiKey] Refreshing access token...');
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DigiKey token refresh error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  accessToken = data.access_token;
  if (data.refresh_token) {
    refreshToken = data.refresh_token;
  }
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  console.log('[DigiKey] ✅ Access token refreshed');
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

/**
 * Search products using stored access token
 * @param {Object} params
 * @param {string} params.keyword - Search keyword
 * @param {number} params.limit - Number of results
 * @returns {Promise<Object>}
 */
export async function digikeySearch({ keyword, limit = 10 }) {
  if (!accessToken || Date.now() >= tokenExpiry) {
    throw new Error('No valid access token. Please authorize first.');
  }

  const body = JSON.stringify({
    Keywords: keyword,
    Limit: limit,
    SearchOptions: [],
    ExcludeMarketPlaceProducts: false
  });

  const response = await fetch(`${SEARCH_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DigiKey API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { ok: true, status: response.status, data };
}

/**
 * Set access token manually (for testing or if you have a valid token)
 * @param {string} token - Access token
 * @param {number} expiresIn - Expiry in seconds
 */
export function setAccessToken(token, expiresIn = 3600) {
  accessToken = token;
  tokenExpiry = Date.now() + (expiresIn - 300) * 1000;
  console.log('[DigiKey] ✅ Access token set manually');
}
