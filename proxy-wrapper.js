// Proxy wrapper for API requests via SOCKS
import { SocksProxyAgent } from 'socks-proxy-agent';
import https from 'https';
import http from 'http';

// Cloudflare WARP SOCKS proxy (on server)
const SOCKS_PROXY = process.env.SOCKS_PROXY || 'socks5://127.0.0.1:40001';

export const agent = new SocksProxyAgent(SOCKS_PROXY);

// Wrapper for fetch with proxy
export function fetchViaProxy(url, options = {}) {
  return fetch(url, {
    ...options,
    agent: url.startsWith('https') ? agent : undefined
  });
}

// Axios-compatible agent
export const httpsAgent = agent;
export const httpAgent = agent;
