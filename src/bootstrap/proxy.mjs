// src/bootstrap/proxy.mjs
// Set Undici global dispatcher to Cloudflare WARP (or any HTTP proxy) by default
// Can be disabled via NO_PROXY=1 | DIRECT_CONNECTIONS=1 | WARP_DISABLE=1

import { setGlobalDispatcher, ProxyAgent } from 'undici';

const disabled = ['NO_PROXY', 'DIRECT_CONNECTIONS', 'WARP_DISABLE'].some(
  (k) => String(process.env[k] || '') === '1'
);

const proxyUrl = process.env.WARP_PROXY_URL || 'http://127.0.0.1:25345';

try {
  if (disabled) {
    console.log('📡 Direct connections enforced (NO_PROXY/DIRECT_CONNECTIONS/WARP_DISABLE)');
  } else {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    console.log(`🔒 Global HTTP proxy enabled via Undici: ${proxyUrl}`);
  }
} catch (e) {
  console.warn(`⚠️  Proxy bootstrap failed, falling back to direct connections: ${e.message}`);
}
