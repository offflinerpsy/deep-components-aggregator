// api/diag.net.mjs
// GET /api/diag/net - Network diagnostics for admin dashboard
// Shows egress IP, WARP status, provider connectivity

import { fetch, ProxyAgent } from 'undici';

const WARP_PROXY = process.env.WARP_PROXY || 'http://127.0.0.1:40000';
const REQUEST_TIMEOUT_MS = 9500; // <10s per WARP proxy-mode limit

const PROVIDER_ENDPOINTS = [
  { name: 'DigiKey', url: 'https://www.digikey.com' },
  { name: 'Mouser', url: 'https://www.mouser.com' },
  { name: 'TME', url: 'https://api.tme.eu' },
  { name: 'Farnell', url: 'https://api.element14.com' }
];

/**
 * Get egress IP (with and without WARP)
 */
async function getEgressIP(useProxy = false) {
  try {
    const options = useProxy ? { dispatcher: new ProxyAgent(WARP_PROXY) } : {};
    const response = await fetch('https://1.1.1.1/cdn-cgi/trace', {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    
    const text = await response.text();
    const ip = text.match(/ip=([^\n]+)/)?.[1];
    const warp = text.match(/warp=([^\n]+)/)?.[1];
    
    return {
      ok: true,
      ip,
      warp: warp === 'on'
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message
    };
  }
}

/**
 * Test provider connectivity
 */
async function testProvider(endpoint, useProxy = false) {
  const start = Date.now();
  try {
    const options = useProxy ? { dispatcher: new ProxyAgent(WARP_PROXY) } : {};
    const response = await fetch(endpoint.url, {
      method: 'HEAD',
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    
    return {
      name: endpoint.name,
      url: endpoint.url,
      status: response.status,
      ok: response.ok,
      latency_ms: Date.now() - start
    };
  } catch (err) {
    return {
      name: endpoint.name,
      url: endpoint.url,
      status: 0,
      ok: false,
      latency_ms: Date.now() - start,
      error: err.message
    };
  }
}

/**
 * Run full network diagnostics
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function diagnosticsHandler(req, res) {
  const startTime = Date.now();

  try {
    // Parallel fetch: egress IP + provider checks
    const [directEgress, proxyEgress, ...providerResults] = await Promise.all([
      getEgressIP(false),
      getEgressIP(true),
      ...PROVIDER_ENDPOINTS.map(ep => testProvider(ep, true))
    ]);

    const report = {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      egress: {
        direct: directEgress,
        warp: proxyEgress
      },
      providers: providerResults,
      proxy_config: {
        warp_proxy: WARP_PROXY,
        timeout_ms: REQUEST_TIMEOUT_MS,
        note: 'WARP proxy-mode has 10s timeout limit per Cloudflare docs'
      }
    };

    res.json(report);
  } catch (err) {
    console.error('[diag.net] Error:', err);
    res.status(500).json({
      error: 'Diagnostics failed',
      message: err.message
    });
  }
}
