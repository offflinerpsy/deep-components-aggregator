#!/usr/bin/env node
/**
 * Test TME GetProducts signature generation with SymbolList[0] format
 */

import crypto from 'crypto';
import 'dotenv/config';

const TOKEN = process.env.TME_TOKEN;
const SECRET = process.env.TME_SECRET;

function generateSignature(secret, method, url, params) {
  // 1. Sort params (exclude ApiSignature only)
  const sortedParams = {};
  Object.keys(params)
    .filter(k => k !== 'ApiSignature') // Token IS included!
    .sort()
    .forEach(k => {
      sortedParams[k] = params[k];
    });

  // 2. Build query string (DON'T encode array brackets in keys!)
  const queryParts = [];
  for (const [key, value] of Object.entries(sortedParams)) {
    // For array keys like "SymbolList[0]", don't encode the brackets
    const encodedKey = key.replace(/\[(\d+)\]$/, '[$1]'); // keep brackets raw
    queryParts.push(`${encodedKey}=${encodeURIComponent(value)}`);
  }
  const queryString = queryParts.join('&');

  // 3. Build signature base
  const signatureBase =
    method.toUpperCase() +
    '&' + encodeURIComponent(url) +
    '&' + encodeURIComponent(queryString);

  console.log('Signature base:', signatureBase);
  console.log('Query string:', queryString);

  // 4. HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(signatureBase, 'utf8');

  return hmac.digest('base64');
}

async function testGetProducts() {
  const url = 'https://api.tme.eu/Products/GetProducts.json';

  // Prepare params как в коде
  const params = {
    Token: TOKEN,
    Country: 'PL',
    Language: 'EN'
  };

  // Add SymbolList[0]
  params['SymbolList[0]'] = '2N3904-DIO';

  console.log('\n=== GetProducts Test ===');
  console.log('Params:', JSON.stringify(params, null, 2));

  const signature = generateSignature(SECRET, 'POST', url, params);
  params.ApiSignature = signature;

  console.log('Signature:', signature);

  // Build form data
  const formData = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    formData.append(key, value);
  }

  console.log('Form data:', formData.toString());

  // Call API
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  console.log('Status:', response.status, response.statusText);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));

  if (data.Status === 'OK') {
    console.log('✅ SUCCESS! Products:', data.Data?.ProductList?.length || 0);
  } else {
    console.log('❌ FAILED:', data.ErrorMessage);
  }
}

testGetProducts().catch(console.error);
