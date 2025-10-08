#!/usr/bin/env node
/**
 * Test TME API signature manually
 */

import crypto from 'crypto';
import https from 'https';

const TOKEN = '18745f2b94e785406561ef9bd83e9a0d0b941bb7a9f4b26327';
const SECRET = 'd94ba92af87285b24da6';

function generateSignature(secret, method, url, params) {
  // Sort params alphabetically (exclude ApiSignature)
  const sortedParams = {};
  Object.keys(params)
    .filter(k => k !== 'ApiSignature')
    .sort()
    .forEach(k => {
      sortedParams[k] = params[k];
    });

  // Build query string with array handling
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

  // Build signature base: METHOD&encoded_url&encoded_params
  const signatureBase =
    method.toUpperCase() +
    '&' + encodeURIComponent(url) +
    '&' + encodeURIComponent(queryString);

  console.log('\n[DEBUG] Signature base:', signatureBase);

  // Generate HMAC-SHA1 with secret key and encode as Base64
  const hmac = crypto.createHmac('sha1', SECRET);
  hmac.update(signatureBase, 'utf8');

  const signature = hmac.digest('base64');
  console.log('[DEBUG] Generated signature:', signature);

  return signature;
}

// Test 1: Simple Search (works on all systems)
console.log('\n=== TEST 1: TME Search API ===\n');

const searchUrl = 'https://api.tme.eu/Products/Search.json';
const searchParams = {
  Token: TOKEN,
  SearchPlain: '2N3904',
  Country: 'PL',
  Language: 'EN',
  SearchOrder: 'ACCURACY'
};

const searchSignature = generateSignature(SECRET, 'POST', searchUrl, searchParams);
searchParams.ApiSignature = searchSignature;

const searchFormData = new URLSearchParams();
for (const [key, value] of Object.entries(searchParams)) {
  searchFormData.append(key, value);
}

console.log('[REQUEST] POST', searchUrl);
console.log('[BODY]', searchFormData.toString());

const searchUrlObj = new URL(searchUrl);
const searchOptions = {
  hostname: searchUrlObj.hostname,
  port: 443,
  path: searchUrlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(searchFormData.toString())
  }
};

const searchReq = https.request(searchOptions, (res) => {
  console.log('\n[RESPONSE] Status:', res.statusCode);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('[RESPONSE] Status:', json.Status);
      console.log('[RESPONSE] Products found:', json.Data?.ProductList?.length || 0);

      if (json.Status === 'OK' && json.Data?.ProductList?.length > 0) {
        console.log('\n✅ Search API works!');
        console.log('Sample product:', json.Data.ProductList[0].Symbol);

        // Test 2: GetProducts with first symbol
        console.log('\n\n=== TEST 2: TME GetProducts API ===\n');

        const symbol = json.Data.ProductList[0].Symbol;
        const getUrl = 'https://api.tme.eu/Products/GetProducts.json';
        const getParams = {
          Token: TOKEN,
          SymbolList: [symbol],
          Country: 'PL',
          Language: 'EN'
        };

        const getSignature = generateSignature(SECRET, 'POST', getUrl, getParams);
        getParams.ApiSignature = getSignature;

        const getFormData = new URLSearchParams();
        for (const [key, value] of Object.entries(getParams)) {
          if (Array.isArray(value)) {
            value.forEach((v, i) => getFormData.append(`${key}[${i}]`, v));
          } else {
            getFormData.append(key, value);
          }
        }

        console.log('[REQUEST] POST', getUrl);
        console.log('[BODY]', getFormData.toString());

        const getUrlObj = new URL(getUrl);
        const getOptions = {
          hostname: getUrlObj.hostname,
          port: 443,
          path: getUrlObj.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(getFormData.toString())
          }
        };

        const getReq = https.request(getOptions, (res2) => {
          console.log('\n[RESPONSE] Status:', res2.statusCode);

          let data2 = '';
          res2.on('data', (chunk) => {
            data2 += chunk;
          });

          res2.on('end', () => {
            try {
              const json2 = JSON.parse(data2);
              console.log('[RESPONSE] Status:', json2.Status);

              if (json2.Status === 'OK') {
                const product = json2.Data?.ProductList?.[0];
                console.log('[RESPONSE] Product:', product?.Symbol);
                console.log('[RESPONSE] PriceList:', product?.PriceList);
                console.log('[RESPONSE] InStock:', product?.InStock);

                if (product?.PriceList && product.PriceList.length > 0) {
                  console.log('\n✅ GetProducts API works with pricing!');
                } else {
                  console.log('\n⚠️  GetProducts works BUT no PriceList returned');
                }
              } else {
                console.log('\n❌ GetProducts failed:', json2.ErrorMessage || json2.Status);
                console.log('Full response:', JSON.stringify(json2, null, 2));
              }
            } catch (e) {
              console.log('\n❌ Failed to parse GetProducts response:', e.message);
              console.log('Raw:', data2);
            }
          });
        });

        getReq.on('error', (e) => {
          console.error('\n❌ GetProducts request error:', e.message);
        });

        getReq.write(getFormData.toString());
        getReq.end();

      } else {
        console.log('\n❌ Search failed:', json.ErrorMessage || json.Status);
        console.log('Full response:', JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.log('\n❌ Failed to parse Search response:', e.message);
      console.log('Raw:', data);
    }
  });
});

searchReq.on('error', (e) => {
  console.error('\n❌ Search request error:', e.message);
});

searchReq.write(searchFormData.toString());
searchReq.end();
