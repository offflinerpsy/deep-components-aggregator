// Global HTTP dispatcher with proxy support (Node 20+, undici)
// No blanket try/catch by project rule.

import { setGlobalDispatcher, ProxyAgent, Agent } from 'undici';

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

if (proxy && /^https?:\/\//.test(proxy)) {
  setGlobalDispatcher(new ProxyAgent(proxy));
} else {
  setGlobalDispatcher(new Agent({
    connectTimeout: 2500,
    headersTimeout: 10_000
  }));
}
