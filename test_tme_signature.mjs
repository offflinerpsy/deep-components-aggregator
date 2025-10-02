#!/usr/bin/env node
/**
 * Test TME API signature generation with OFFICIAL method from TME examples:
 * https://github.com/tme-dev/TME-API
 * https://github.com/tme-dev/api-client-guzzle
 * 
 * CORRECT FORMAT: POST&encoded_url&encoded_query_string
 */

import crypto from 'crypto';
import { request } from 'undici';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.TME_TOKEN;
const SECRET = process.env.TME_SECRET;
const BASE = 'https://api.tme.eu';

/**
 * Official TME signature generation method
 * Based on: https://github.com/tme-dev/api-client-guzzle
 */
function generateSignature(secret, method, url, params) {
  // 1. Sort params (exclude ApiSignature)
  const sortedParams = {};
  Object.keys(params)
    .filter(k => k !== 'ApiSignature')
    .sort()
    .forEach(k => {
      sortedParams[k] = params[k];
    });
  
  // 2. Build query string (arrays as key[0]=val1&key[1]=val2)
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
  
  // 3. Build signature base: METHOD&encoded_url&encoded_params
  const signatureBase = 
    method.toUpperCase() + 
    '&' + encodeURIComponent(url) + 
    '&' + encodeURIComponent(queryString);
  
  console.log('   Signature base:', signatureBase.substring(0, 150) + '...');
  
  // 4. Generate HMAC-SHA1 and encode as Base64
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(signatureBase, 'utf8');
  
  return hmac.digest('base64');
}

async function testOfficialMethod() {
  console.log('\n� Testing OFFICIAL TME signature method (POST&URL&PARAMS)');
  console.log('   Based on: https://github.com/tme-dev/api-client-guzzle\n');
  
  const url = `${BASE}/Products/Search.json`;
  const params = {
    Token: TOKEN,
    SearchPlain: 'STM32F407',
    Country: 'PL',
    Language: 'EN',
    SearchOrder: 'ACCURACY'
  };
  
  const signature = generateSignature(SECRET, 'POST', url, params);
  params.ApiSignature = signature;
  
  console.log(`   Signature: ${signature}\n`);
  
  // Build form data for POST request
  const formData = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    formData.append(key, value);
  }
  
  console.log('   📡 Sending POST request...');
  
  try {
    const response = await request(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    const body = await response.body.text();
    console.log(`   Status: ${response.statusCode}\n`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(body);
      if (data.Status === 'OK') {
        console.log('   ✅ SUCCESS! TME API working!');
        console.log(`   Found products: ${data.Data?.ProductList?.length || 0}`);
        if (data.Data?.ProductList?.length > 0) {
          console.log(`   First product: ${data.Data.ProductList[0].Symbol}`);
        }
        return true;
      } else {
        console.log(`   ⚠️ API returned status: ${data.Status}`);
        console.log(`   Error: ${data.Message || data.Error || 'Unknown'}`);
        return false;
      }
    } else {
      console.log(`   ❌ HTTP Error ${response.statusCode}`);
      console.log(`   Response: ${body.substring(0, 200)}`);
      return false;
    }
  } catch (err) {
    console.log(`   ❌ Request failed: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🔐 Testing TME API Signature\n');
  console.log(`Token: ${TOKEN?.substring(0, 20)}...`);
  console.log(`Secret: ${SECRET?.substring(0, 10)}...${SECRET?.substring(SECRET.length - 4)}`);
  console.log('='.repeat(80));
  
  const success = await testOfficialMethod();
  
  console.log('\n' + '='.repeat(80));
  if (success) {
    console.log('🎉 TME API Signature is CORRECT!');
  } else {
    console.log('❌ TME API Signature failed - check credentials or method');
  }
}

main().catch(console.error);

