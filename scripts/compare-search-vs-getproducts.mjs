#!/usr/bin/env node
/**
 * Compare Search (working) vs GetProducts (failing)
 */

import crypto from 'crypto';
import 'dotenv/config';

const TOKEN = process.env.TME_TOKEN;
const SECRET = process.env.TME_SECRET;

function generateSignature(secret, method, url, params, tokenIncluded = true) {
  // Sort params
  const sortedParams = {};
  Object.keys(params)
    .filter(k => k !== 'ApiSignature' && (tokenIncluded || k !== 'Token'))
    .sort()
    .forEach(k => {
      sortedParams[k] = params[k];
    });

  // Build query string (don't encode [] in keys)
  const queryParts = [];
  for (const [key, value] of Object.entries(sortedParams)) {
    const encodedKey = key.replace(/\[(\d+)\]$/, '[$1]');
    queryParts.push(`${encodedKey}=${encodeURIComponent(value)}`);
  }
  const queryString = queryParts.join('&');

  // Signature base
  const signatureBase =
    method.toUpperCase() +
    '&' + encodeURIComponent(url) +
    '&' + encodeURIComponent(queryString);

  // HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(signatureBase, 'utf8');

  return { signature: hmac.digest('base64'), signatureBase, queryString };
}

async function testAPI(name, url, params) {
  console.log(`\n=== ${name} ===`);
  console.log('URL:', url);
  console.log('Params:', JSON.stringify(params, null, 2));

  const { signature, signatureBase, queryString } = generateSignature(SECRET, 'POST', url, params);
  params.ApiSignature = signature;

  console.log('Query string:', queryString);
  console.log('Signature:', signature);
  console.log('Signature base length:', signatureBase.length);

  // Build form
  const formData = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    formData.append(key, value);
  }

  console.log('Form body:', formData.toString());

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

  if (data.Status === 'OK') {
    console.log('✅ SUCCESS!');
    if (data.Data?.ProductList) {
      console.log('Products:', data.Data.ProductList.length);
    } else if (data.Data?.ProductInformationList) {
      console.log('Results:', data.Data.ProductInformationList.length);
    }
  } else {
    console.log('❌ FAILED:', data.ErrorMessage);
  }
}

async function main() {
  // Test 1: Search (should work)
  await testAPI(
    'Search API',
    'https://api.tme.eu/Products/Search.json',
    {
      Token: TOKEN,
      SearchPlain: '2N3904',
      Country: 'PL',
      Language: 'EN',
      SearchOrder: 'ACCURACY'
    }
  );

  // Test 2: GetProducts with one symbol
  await testAPI(
    'GetProducts API (1 symbol)',
    'https://api.tme.eu/Products/GetProducts.json',
    {
      Token: TOKEN,
      'SymbolList[0]': '2N3904-DIO',
      Country: 'PL',
      Language: 'EN'
    }
  );
}

main().catch(console.error);
