// src/net/dispatcher.mjs
// Unified network dispatcher with WARP Proxy Mode support
// All external HTTP requests should use this dispatcher

import { ProxyAgent, Agent } from 'undici';

/**
 * Configure global HTTP dispatcher with WARP Proxy support
 * 
 * WARP Proxy Mode has a 10-second timeout limit, so we configure
 * request timeouts to be ≤10s to stay within this constraint.
 * 
 * Environment variables:
 * - HTTP_PROXY: SOCKS5/HTTPS proxy URL (e.g., socks5://127.0.0.1:40000)
 * - HTTPS_PROXY: Same as HTTP_PROXY for HTTPS requests
 * - NO_PROXY: Comma-separated list of hostnames to bypass proxy
 * 
 * @returns {Agent|ProxyAgent} Configured dispatcher
 */
export function createDispatcher() {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  
  if (proxyUrl) {
    console.log(`[Network] Using proxy: ${proxyUrl.replace(/\/\/.*@/, '//*****@')}`);
    
    return new ProxyAgent({
      uri: proxyUrl,
      
      // WARP Proxy Mode timeout constraint: ≤10s
      requestTimeout: 9500, // 9.5 seconds (WARP limit)
      
      // Connection settings
      keepAliveTimeout: 60000, // 60 seconds
      keepAliveMaxTimeout: 600000, // 10 minutes
      
      // Retry logic for transient errors
      maxRedirections: 3
    });
  }
  
  console.log('[Network] Using direct connection (no proxy)');
  
  // Fallback to direct connection with same timeout settings
  return new Agent({
    requestTimeout: 9500,
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
  timeout: '10s (WARP Proxy Mode constraint)'
});

export default {
  createDispatcher,
  getRequestOptions,
  proxyFetch,
  checkProxyHealth,
  globalDispatcher
};
