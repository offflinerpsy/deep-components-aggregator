#!/usr/bin/env node
/**
 * DigiKey OAuth Authorization Flow - Step 2
 * Exchange authorization code for access token
 * PRODUCTION API (not Sandbox)
 * 
 * Usage: node test_digikey_exchange.mjs <AUTHORIZATION_CODE>
 */

import { exchangeCodeForToken, digikeySearch } from './src/integrations/digikey/oauth.mjs';

// PRODUCTION credentials (from DigiKey dashboard screenshot)
const CLIENT_ID = 'mt0wx2AcFbqaGgEcKJkXAgEWmQ769JcOTggr0TxynL2pP8cm';
const CLIENT_SECRET = 'splmTf8gdnBAAT8p3bfybhBIw8vXozuqYWmasqNBOTEsJ5nlBjGuSHdts8u7dnV1';
const REDIRECT_URI = 'https://deep-agg.offflinerpsy.workers.dev/auth/digikey/callback';

const code = process.argv[2];

if (!code) {
  console.error('❌ Error: Authorization code required');
  console.error('Usage: node test_digikey_exchange.mjs <CODE>');
  process.exit(1);
}

console.log('🔐 DigiKey OAuth - Exchange Code for Token');
console.log('==========================================');
console.log('');
console.log('Authorization Code:', code.substring(0, 20) + '...');
console.log('');

try {
  // Step 1: Exchange code for token
  const tokens = await exchangeCodeForToken({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    code: code,
    redirectUri: REDIRECT_URI
  });

  console.log('');
  console.log('✅ SUCCESS! Tokens obtained:');
  console.log('');
  console.log('Access Token:', tokens.accessToken.substring(0, 30) + '...');
  console.log('Refresh Token:', tokens.refreshToken ? tokens.refreshToken.substring(0, 30) + '...' : 'N/A');
  console.log('Expires In:', tokens.expiresIn, 'seconds');
  console.log('');

  // Step 2: Test search
  console.log('🔍 Testing search with M83513/19-E01NW...');
  console.log('');

  const result = await digikeySearch({
    keyword: 'M83513/19-E01NW',
    limit: 5
  });

  console.log('✅ Search successful!');
  console.log('Status:', result.status);
  console.log('Products found:', result.data.ProductsCount || result.data.length || 0);
  
  if (result.data.Products && result.data.Products.length > 0) {
    console.log('');
    console.log('First product:');
    const p = result.data.Products[0];
    console.log('- MPN:', p.ManufacturerPartNumber);
    console.log('- Manufacturer:', p.Manufacturer?.Name);
    console.log('- Description:', p.ProductDescription?.substring(0, 100));
    
    if (p.Parameters && p.Parameters.length > 0) {
      console.log('- Parameters:', p.Parameters.length);
      console.log('');
      console.log('Sample parameters:');
      p.Parameters.slice(0, 10).forEach(param => {
        console.log(`  ${param.ParameterText}: ${param.ValueText}`);
      });
    }
  }

  console.log('');
  console.log('💾 IMPORTANT: Save these tokens!');
  console.log('Access Token:', tokens.accessToken);
  console.log('Refresh Token:', tokens.refreshToken);
  
} catch (error) {
  console.error('');
  console.error('❌ ERROR:', error.message);
  process.exit(1);
}
