#!/usr/bin/env node
/**
 * DigiKey OAuth Token Exchange - PRODUCTION
 * This should run on Amsterdam server (no geo-blocking)
 * 
 * Usage: node digikey_exchange_server.mjs <AUTHORIZATION_CODE>
 */

import { fetch } from 'undici';

const CLIENT_ID = 'mt0wx2AcFbqaGgEcKJkXAgEWmQ769JcOTggr0TxynL2pP8cm';
const CLIENT_SECRET = 'splmTf8gdnBAAT8p3bfybhBIw8vXozuqYWmasqNBOTEsJ5nlBjGuSHdts8u7dnV1';
const REDIRECT_URI = 'https://deep-agg.offflinerpsy.workers.dev/auth/digikey/callback';

const code = process.argv[2];

if (!code) {
  console.error('❌ Error: Authorization code required');
  console.error('Usage: node digikey_exchange_server.mjs <CODE>');
  process.exit(1);
}

console.log('🔐 DigiKey OAuth - Exchange Code for Token (SERVER)');
console.log('===================================================');
console.log('');
console.log('Authorization Code:', code);
console.log('');

try {
  const tokenUrl = 'https://api.digikey.com/v1/oauth2/token';
  
  const params = new URLSearchParams({
    code: code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  });

  console.log('[DigiKey] Exchanging authorization code for token...');
  console.log('[DigiKey] Token URL:', tokenUrl);
  console.log('');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const responseText = await response.text();
  
  console.log('[DigiKey] Response status:', response.status);
  console.log('[DigiKey] Response length:', responseText.length);
  console.log('');

  if (response.status !== 200) {
    console.error('❌ Token exchange failed');
    console.error('Status:', response.status);
    console.error('Response:', responseText.substring(0, 1000));
    process.exit(1);
  }

  const data = JSON.parse(responseText);
  
  console.log('✅ SUCCESS! Tokens obtained:');
  console.log('');
  console.log('Access Token:', data.access_token?.substring(0, 30) + '...');
  console.log('Refresh Token:', data.refresh_token?.substring(0, 30) + '...');
  console.log('Expires In:', data.expires_in, 'seconds');
  console.log('Token Type:', data.token_type);
  console.log('');
  console.log('💾 SAVE THESE TOKENS:');
  console.log('');
  console.log('DIGIKEY_ACCESS_TOKEN=' + data.access_token);
  console.log('DIGIKEY_REFRESH_TOKEN=' + data.refresh_token);
  console.log('');

  // Now test search
  console.log('🔍 Testing search with M83513/19-E01NW...');
  console.log('');

  const searchUrl = 'https://api.digikey.com/products/v4/search/keyword';
  const searchBody = {
    Keywords: 'M83513/19-E01NW',
    RecordCount: 5
  };

  const searchResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${data.access_token}`,
      'X-DIGIKEY-Client-Id': CLIENT_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(searchBody)
  });

  const searchText = await searchResponse.text();
  
  console.log('[DigiKey Search] Status:', searchResponse.status);
  console.log('[DigiKey Search] Response length:', searchText.length);
  console.log('');

  if (searchResponse.status !== 200) {
    console.error('❌ Search failed');
    console.error('Status:', searchResponse.status);
    console.error('Response:', searchText.substring(0, 1000));
    process.exit(1);
  }

  const searchData = JSON.parse(searchText);
  
  console.log('✅ Search successful!');
  console.log('Products found:', searchData.ProductsCount || 0);
  
  if (searchData.Products && searchData.Products.length > 0) {
    const p = searchData.Products[0];
    console.log('');
    console.log('First product:');
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
  console.log('🎉 DigiKey API WORKING!!!');

} catch (error) {
  console.error('');
  console.error('❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
