#!/usr/bin/env node
/**
 * Manual TME API test with new credentials
 */

import crypto from 'crypto';
import httpBuildQuery from 'http-build-query';
import sortKeysRecursive from 'sort-keys-recursive';

function rawurlencode(text) {
  const value = `${text ?? ''}`;

  return encodeURIComponent(value)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

function generateSignature(secret, method, url, params) {
  const sortedParams = sortKeysRecursive(params);
  const queryString = httpBuildQuery(sortedParams);

  const signatureBase = [
    method.toUpperCase(),
    rawurlencode(url),
    rawurlencode(queryString)
  ].join('&');

  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(signatureBase, 'utf8');

  return {
    signature: hmac.digest('base64'),
    signatureBase,
    queryString
  };
}

async function main() {
  const token = process.env.TME_TOKEN;
  const secret = process.env.TME_SECRET;

  if (!token || !secret) {
    console.error('[TME][Manual] Missing TME_TOKEN or TME_SECRET in environment');
    process.exit(1);
  }

  const url = 'https://api.tme.eu/Products/Search.json';
  const params = {
    Token: token,
    Country: 'PL',
    Language: 'EN',
    SearchOrder: 'ACCURACY',
    SearchPlain: process.argv[2] || 'LF353N'
  };

  const { signature, signatureBase, queryString } = generateSignature(secret, 'POST', url, params);
  const formBody = new URLSearchParams({ ...params, ApiSignature: signature }).toString();

  console.log('[TME][Manual] Signature base:', signatureBase);
  console.log('[TME][Manual] Query string:', queryString.replace(token, '***TOKEN***'));
  console.log('[TME][Manual] ApiSignature:', signature);
  console.log('[TME][Manual] Body:', formBody.replace(token, '***TOKEN***'));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formBody
  });

  const text = await response.text();
  console.log('[TME][Manual] Status:', response.status);
  console.log('[TME][Manual] Response:', text);
}

await main();
