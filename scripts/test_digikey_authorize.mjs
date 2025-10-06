#!/usr/bin/env node
/**
 * DigiKey OAuth Authorization Flow - Step 1
 * This will generate the URL you need to visit in browser
 */

import { getAuthorizationUrl } from './src/integrations/digikey/oauth.mjs';

const CLIENT_ID = 'mt0wx2AcFbqaGgEcKJkXAgEWmQ769JcOTggr0TxynL2pP8cm';
const REDIRECT_URI = 'https://deep-agg.offflinerpsy.workers.dev/auth/digikey/callback';

console.log('🔐 DigiKey OAuth Authorization Flow');
console.log('=====================================');
console.log('');
console.log('Client ID:', CLIENT_ID);
console.log('Redirect URI:', REDIRECT_URI);
console.log('');

const authUrl = getAuthorizationUrl({
  clientId: CLIENT_ID,
  redirectUri: REDIRECT_URI
});

console.log('');
console.log('📋 INSTRUCTIONS:');
console.log('1. Copy the URL above');
console.log('2. Open it in your browser');
console.log('3. Login to DigiKey and authorize the app');
console.log('4. You will be redirected to:', REDIRECT_URI);
console.log('5. Copy the "code" parameter from the URL');
console.log('6. Run: node test_digikey_exchange.mjs <CODE>');
console.log('');
console.log('Authorization URL:');
console.log(authUrl);
