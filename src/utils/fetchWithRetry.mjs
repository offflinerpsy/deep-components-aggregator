/**
 * Fetch wrapper with timeout (7s) and exponential backoff retries
 * Cloudflare WARP proxy has 10s timeout - we use 7s to leave headroom
 */
import { fetch } from 'undici';

const DEFAULT_TIMEOUT = 7000; // 7 seconds (WARP limit is 10s)
const MAX_RETRIES = 2;
const RETRY_DELAYS = [500, 1500]; // Exponential: 0.5s, 1.5s

export async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  const controller = new AbortController();
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const fetchOptions = {
    ...options,
    signal: controller.signal
  };
  
  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // If timeout or network error and retries left
    if (retries > 0 && (error.name === 'AbortError' || error.code === 'ECONNREFUSED')) {
      const delay = RETRY_DELAYS[MAX_RETRIES - retries] || 1000;
      console.warn(`⚠️ Fetch failed, retrying in ${delay}ms... (${retries} retries left)`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    throw error;
  }
}

/**
 * Wrapper for JSON POST requests with retry logic
 */
export async function postJSON(url, body, options = {}) {
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(body),
    ...options
  });
  
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  
  return {
    ok: response.ok,
    status: response.status,
    data
  };
}
