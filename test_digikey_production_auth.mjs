#!/usr/bin/env node
/**
 * DigiKey OAuth Authorization - PRODUCTION API (v1)
 * Try production endpoint instead of sandbox
 */

const CLIENT_ID = 'mt0wx2AcFbqaGgEcKJkXAgEWmQ769JcOTggr0TxynL2pP8cm';
const REDIRECT_URI = 'https://deep-agg.offflinerpsy.workers.dev/auth/digikey/callback';

console.log('🔐 DigiKey OAuth Authorization - PRODUCTION API');
console.log('===============================================');
console.log('');
console.log('IMPORTANT: This uses PRODUCTION API endpoint');
console.log('');

// Try different API endpoints
const endpoints = [
  {
    name: 'Sandbox v1',
    url: 'https://sandbox-api.digikey.com/v1/oauth2/authorize'
  },
  {
    name: 'Production v1',
    url: 'https://api.digikey.com/v1/oauth2/authorize'
  }
];

console.log('Try these URLs:');
console.log('');

endpoints.forEach((endpoint, idx) => {
  const authUrl = new URL(endpoint.url);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  
  console.log(`${idx + 1}. ${endpoint.name}:`);
  console.log(authUrl.toString());
  console.log('');
});

console.log('');
console.log('📋 Instructions:');
console.log('1. Try SANDBOX URL first (same as before)');
console.log('2. If 401 Invalid clientId, try PRODUCTION URL');
console.log('3. Check DigiKey dashboard - maybe app is for Production only?');
console.log('');
console.log('⚠️  Check in DigiKey dashboard:');
console.log('- Is app Status = Active?');
console.log('- Is Client ID correct?');
console.log('- Is Callback URL exact match?');
console.log('- Does app have Organization selected?');
