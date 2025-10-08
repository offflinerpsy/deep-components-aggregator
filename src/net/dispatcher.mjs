// src/net/dispatcher.mjs
// Unified network dispatcher with WARP Proxy Mode support
// All external HTTP requests should use this dispatcher

import { ProxyAgent, Agent } from 'undici';

/**
 * Configure global HTTP dispatcher with WARP Proxy support
 *
 * Supports HTTP/HTTPS proxies (including http-to-socks bridge).
 * NOTE: Undici doesn't support socks5:// directly - use http-to-socks bridge instead.
 *
 * Environment variables:
 * - HTTP_PROXY: Proxy URL (e.g., http://127.0.0.1:40000 for http-to-socks bridge)
 * - HTTPS_PROXY: Proxy URL for HTTPS requests
 * - NO_PROXY: Comma-separated list of hostnames to bypass proxy
 *
 * @returns {ProxyAgent|Agent} Configured dispatcher
 */
export function createDispatcher() {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

  if (proxyUrl && (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://'))) {
    console.log(`[Network] Using HTTP proxy: ${proxyUrl}`);

    return new ProxyAgent({
      uri: proxyUrl,
      requestTimeout: 30000,
      keepAliveTimeout: 60000,
      keepAliveMaxTimeout: 600000
    });
  }

  console.log('[Network] Using direct connection (no proxy)');

  // Fallback to direct connection
  return new Agent({
    requestTimeout: 30000,
    keepAliveTimeout: 60000,
    keepAliveMaxTimeout: 600000,
    maxRedirections: 3
  });
}

/**
 * Get request options with dispatcher
 * Use this helper to ensure all external requests use the configured dispatcher
 *
 * @param {Object} [options={}] - Additional fetch options
 * @returns {Object} Options object with dispatcher
 *
 * @example
 * import { getRequestOptions } from './src/net/dispatcher.mjs';
 *
 * const response = await fetch('https://example.com/api', {
 *   ...getRequestOptions(),
 *   method: 'GET',
 *   headers: { 'Accept': 'application/json' }
 * });
 */
export function getRequestOptions(options = {}) {
  return {
    ...options,
    dispatcher: globalDispatcher
  };
}

/**
 * Make proxied fetch request
 * Convenience wrapper around fetch with automatic dispatcher injection
 *
 * @param {string|URL} url - Request URL
 * @param {Object} [options={}] - Fetch options
 * @returns {Promise<Response>} Fetch response
 *
 * @example
 * import { proxyFetch } from './src/net/dispatcher.mjs';
 *
 * const response = await proxyFetch('https://www.oemstrade.com/search/ATMEGA328P');
 * const html = await response.text();
 */
export async function proxyFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    dispatcher: globalDispatcher
  });
}

/**
 * Check if proxy is configured and accessible
 * Useful for health checks and diagnostics
 *
 * @returns {Promise<Object>} Proxy status
 */
export async function checkProxyHealth() {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

  if (!proxyUrl) {
    return {
      enabled: false,
      healthy: null,
      message: 'Proxy not configured'
    };
  }

  try {
    // Test proxy with a simple HTTP request (httpbin echo)
    const response = await proxyFetch('https://httpbin.org/get', {
      method: 'GET',
      headers: { 'User-Agent': 'Deep-Aggregator-Health-Check/1.0' }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        enabled: true,
        healthy: true,
        message: 'Proxy accessible',
        origin: data.origin // Shows proxy's external IP
      };
    }

    return {
      enabled: true,
      healthy: false,
      message: `Proxy returned ${response.status}`
    };
  } catch (error) {
    return {
      enabled: true,
      healthy: false,
      message: `Proxy error: ${error.message}`
    };
  }
}

// Create and set global dispatcher on module load
export const globalDispatcher = createDispatcher();

// Log dispatcher configuration
console.log('[Network] Dispatcher configured:', {
  proxy: !!(process.env.HTTP_PROXY || process.env.HTTPS_PROXY),
  timeout: '30s'
});

export default {
  createDispatcher,
  getRequestOptions,
  proxyFetch,
  checkProxyHealth,
  globalDispatcher
};
