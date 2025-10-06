#!/usr/bin/env node
/**
 * DigiKey OAuth via ScrapingBee Proxy
 * Bypass DigiKey Cloudflare 403 geo-blocking using residential proxy
 */

import { fetch } from 'undici';

const CLIENT_ID = 'mt0wx2AcFbqaGgEcKJkXAgEWmQ769JcOTggr0TxynL2pP8cm';
const CLIENT_SECRET = 'splmTf8gdnBAAT8p3bfybhBIw8vXozuqYWmasqNBOTEsJ5nlBjGuSHdts8u7dnV1';
const REDIRECT_URI = 'https://deep-agg.offflinerpsy.workers.dev/auth/digikey/callback';
const AUTH_CODE = 'ueiC69YA';

// ScrapingBee keys
const SCRAPINGBEE_KEYS = [
  'ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ',
  '1KYSOEVR8THW8U46DCJRVN23D1BUXT7YO7AGH4GCFDLOFJV7U9UCI8S6W2DXIZ1L50IT9QN0VBZBJK0A'
];

console.log('🔐 DigiKey OAuth via ScrapingBee Proxy');
console.log('======================================');
console.log('');
console.log('Using authorization code:', AUTH_CODE);
console.log('');

try {
  // Prepare token exchange request
  const tokenUrl = 'https://api.digikey.com/v1/oauth2/token';
  const params = new URLSearchParams({
    code: AUTH_CODE,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  });

  // Use ScrapingBee as proxy to bypass geo-blocking
  const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1/');
  scrapingBeeUrl.searchParams.set('api_key', SCRAPINGBEE_KEYS[0]);
  scrapingBeeUrl.searchParams.set('url', tokenUrl);
  scrapingBeeUrl.searchParams.set('premium_proxy', 'true');
  scrapingBeeUrl.searchParams.set('country_code', 'us'); // US proxy
  scrapingBeeUrl.searchParams.set('render_js', 'false'); // No JS needed for API
  
  console.log('[DigiKey via Proxy] Making token exchange request...');
  console.log('[DigiKey via Proxy] Using US residential proxy');
  console.log('');

  const response = await fetch(scrapingBeeUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  console.log('[DigiKey via Proxy] Response status:', response.status);
  
  const responseText = await response.text();
  console.log('[DigiKey via Proxy] Response length:', responseText.length);
  console.log('');

  if (response.status !== 200) {
    console.error('❌ Token exchange failed');
    console.error('Status:', response.status);
    console.error('Response preview:', responseText.substring(0, 500));
    process.exit(1);
  }

  const data = JSON.parse(responseText);
  
  console.log('✅ SUCCESS! Token obtained:');
  console.log('');
  console.log('Access Token:', data.access_token?.substring(0, 30) + '...');
  console.log('Refresh Token:', data.refresh_token?.substring(0, 30) + '...');
  console.log('Expires In:', data.expires_in, 'seconds');
  console.log('Token Type:', data.token_type);
  console.log('');
  console.log('💾 Full tokens:');
  console.log('Access Token:', data.access_token);
  console.log('Refresh Token:', data.refresh_token);

} catch (error) {
  console.error('');
  console.error('❌ ERROR:', error.message);
  console.error(error);
  process.exit(1);
}
