import { ProxyAgent } from 'undici';
import * as cheerio from 'cheerio';

const DEFAULT_TIMEOUT = 9500; // WARP proxy has ~10s limit, use 9.5s
const DEFAULT_RETRIES = 3;
const DEFAULT_DELAY = 600;

export async function fetchWithRetry(url, options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const retries = options.retries || DEFAULT_RETRIES;
  const delay = options.delay || DEFAULT_DELAY;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const fetchOptions = {
    ...options,
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      ...options.headers
    }
  };
  
  // Proxy support
  if (process.env.HTTPS_PROXY) {
    fetchOptions.dispatcher = new ProxyAgent(process.env.HTTPS_PROXY);
  }
  
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error;
      
      if (attempt < retries - 1) {
        const waitTime = delay * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  clearTimeout(timeoutId);
  throw lastError;
}

export function parseHtml(html) {
  return cheerio.load(html);
}

// Alias для обратной совместимости
export const httpGet = fetchWithRetry;