import crypto from 'crypto';// Test TME API for full specs

import https from 'https'; import 'dotenv/config';

import { tmeSearchProducts, tmeGetProduct } from './src/integrations/tme/client.mjs';

const secret = 'd94ba92af87285b24da6';

const token = '18745f2b94e785406561ef9bd83e9a0d0b941bb7a9f4b26327'; const mpn = 'M83513/19-E01NW';

const url = 'https://api.tme.eu/Products/Search.json';

async function testTME() {

  // Test Search first (simpler - no arrays)  console.log('\n🧪 Testing TME API...\n');

  const params = {

    Token: token,  // Search by MPN

    SearchPlain: '2N3904', console.log('=== Searching TME for:', mpn, '===\n');

    Country: 'PL', const searchResult = await tmeSearchProducts({

      Language: 'EN', token: process.env.TME_TOKEN,

      SearchOrder: 'ACCURACY'    secret: process.env.TME_SECRET,

    }; query: mpn

  });

  function generateSignature(secret, method, url, params) {

    const sortedParams = {}; console.log('Search results:', searchResult.data?.ProductList?.length || 0);

    Object.keys(params)

      .filter(k => k !== 'ApiSignature')  if (searchResult.data?.ProductList?.length > 0) {

    .sort()    const product = searchResult.data.ProductList[0];

    .forEach(k => {
        console.log('\n📦 Found product:');

        sortedParams[k] = params[k]; console.log('  Symbol:', product.Symbol);

      }); console.log('  Producer:', product.Producer);

        console.log('  Description:', product.Description);

        const queryParts = []; console.log('\n📋 Parameters:', JSON.stringify(product.Parameters, null, 2));

        for (const [key, value] of Object.entries(sortedParams)) {
          console.log('\n🔍 ALL FIELDS:', Object.keys(product));

          if (Array.isArray(value)) { }

          value.forEach((v, i) => {

            queryParts.push(`${encodeURIComponent(key)}[${i}]=${encodeURIComponent(v)}`);  // Try alternative searches

          }); console.log('\n\n=== Trying alternative: M83513 ===\n');

        } else {
          const altResult = await tmeSearchProducts({

            queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`); token: process.env.TME_TOKEN,

          }    secret: process.env.TME_SECRET,

  } query: 'M83513'

        const queryString = queryParts.join('&');
      });



    const signatureBase = console.log('Found', altResult.data?.ProductList?.length || 0, 'products');

    method.toUpperCase() +   if (altResult.data?.ProductList?.length > 0) {

      '&' + encodeURIComponent(url) + altResult.data.ProductList.slice(0, 5).forEach((p, i) => {

        '&' + encodeURIComponent(queryString); console.log(`  ${i + 1}. ${p.Symbol} - ${p.Producer}`);

      });

      console.log('[SIGNATURE BASE]', signatureBase);
    }



    const hmac = crypto.createHmac('sha1', secret);  // Try D-Sub connector category

    hmac.update(signatureBase, 'utf8'); console.log('\n\n=== Trying: D-Sub connector ===\n');

    const dsubResult = await tmeSearchProducts({

      return hmac.digest('base64'); token: process.env.TME_TOKEN,

    }    secret: process.env.TME_SECRET,

      query: 'D-Sub MIL 31 pin connector Amphenol'

const signature = generateSignature(secret, 'POST', url, params);
  });

  console.log('[SIGNATURE]', signature);

  console.log('Found', dsubResult.data?.ProductList?.length || 0, 'products');

  params.ApiSignature = signature; if (dsubResult.data?.ProductList?.length > 0) {

    dsubResult.data.ProductList.slice(0, 5).forEach((p, i) => {

      const formData = new URLSearchParams(); console.log(`  ${i + 1}. ${p.Symbol} - ${p.Producer} - ${p.Description}`);

      for (const [key, value] of Object.entries(params)) { });

    formData.append(key, value);
  }

}}



console.log('[FORM DATA]', formData.toString()); testTME().catch(console.error);


// Make request
const urlObj = new URL(url);
const options = {
  hostname: urlObj.hostname,
  port: 443,
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(formData.toString())
  }
};

const req = https.request(options, (res) => {
  console.log('[STATUS]', res.statusCode);
  console.log('[HEADERS]', JSON.stringify(res.headers, null, 2));

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('[RESPONSE]', data);
    try {
      const json = JSON.parse(data);
      console.log('[PARSED]', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('[PARSE ERROR]', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('[ERROR]', e.message);
});

req.write(formData.toString());
req.end();
