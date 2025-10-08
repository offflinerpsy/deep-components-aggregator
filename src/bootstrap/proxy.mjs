// src/bootstrap/proxy.mjs
// Global HTTP dispatcher with proxy support (Node 20+, undici)
// Follows standard HTTP_PROXY/HTTPS_PROXY environment variables
// No blanket try/catch by project rule

import { setGlobalDispatcher, ProxyAgent, Agent } from 'undici';

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

if (proxy && /^https?:\/\//.test(proxy)) {
  setGlobalDispatcher(new ProxyAgent({
    uri: proxy,
    connectTimeout: 2500,
    headersTimeout: 10_000
  }));
  console.log(`🔒 Global HTTP proxy enabled: ${proxy}`);
} else {
  setGlobalDispatcher(new Agent({
    connectTimeout: 2500,
    headersTimeout: 10_000
  }));
  console.log('📡 Direct connections (no HTTP_PROXY set)');
}
