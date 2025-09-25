// src/services/net.js - Унифицированный сетевой слой без try/catch
import { ProxyAgent } from 'undici';
import { setTimeout as delay } from 'node:timers/promises';

// Глобальные настройки сети
const NET_CONFIG = {
  timeout: 15000, // 15 секунд
  retries: 2,
  throttleMinMs: 600,  // минимальная задержка
  throttleMaxMs: 1200, // максимальная задержка
  jitter: true, // добавлять случайность к задержкам
};

// Кеш для троттлинга по доменам
const domainThrottle = new Map();

// Создание ProxyAgent если настроен прокси
const createProxyAgent = () => {
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  if (!proxyUrl) return null;
  
  return new ProxyAgent(proxyUrl);
};

// Извлечение домена из URL
const getDomain = (url) => {
  const urlObj = new URL(url);
  return urlObj.hostname;
};

// Троттлинг запросов по доменам
const throttleRequest = async (url) => {
  const domain = getDomain(url);
  const now = Date.now();
  const lastRequest = domainThrottle.get(domain) || 0;
  
  const minDelay = NET_CONFIG.throttleMinMs;
  const maxDelay = NET_CONFIG.throttleMaxMs;
  const baseDelay = minDelay + (maxDelay - minDelay) * Math.random();
  const jitter = NET_CONFIG.jitter ? (Math.random() * 200 - 100) : 0; // ±100ms
  const totalDelay = Math.max(0, baseDelay + jitter);
  
  const elapsed = now - lastRequest;
  const waitTime = Math.max(0, totalDelay - elapsed);
  
  if (waitTime > 0) {
    await delay(waitTime);
  }
  
  domainThrottle.set(domain, Date.now());
};

// Выполнение HTTP запроса с таймаутом
const performRequest = async (url, options = {}) => {
  const startTime = Date.now();
  const timeout = options.timeout || NET_CONFIG.timeout;
  
  // Создаем AbortController для таймаута
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Настраиваем опции fetch
  const fetchOptions = {
    method: options.method || 'GET',
    headers: options.headers || {},
    signal: controller.signal,
    ...options.fetchOptions
  };
  
  // Добавляем ProxyAgent если настроен
  const proxyAgent = createProxyAgent();
  if (proxyAgent) {
    fetchOptions.dispatcher = proxyAgent;
  }
  
  const response = await fetch(url, fetchOptions);
  clearTimeout(timeoutId);
  
  const elapsed = Date.now() - startTime;
  
  return {
    response,
    elapsed,
    url
  };
};

// Основная функция сетевого запроса
export const httpRequest = async (url, options = {}) => {
  if (!url || typeof url !== 'string') {
    return { ok: false, code: 'INVALID_URL', url, ms: 0 };
  }
  
  // Проверяем валидность URL
  let urlObj;
  const parseResult = (() => {
    urlObj = new URL(url);
    return { ok: true };
  })();
  
  if (!parseResult.ok) {
    return { ok: false, code: 'INVALID_URL', url, ms: 0 };
  }
  
  const maxRetries = options.retries !== undefined ? options.retries : NET_CONFIG.retries;
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    
    // Троттлинг (кроме первого запроса к домену)
    if (attempt === 0) {
      await throttleRequest(url);
    }
    
    const controller = new AbortController();
    const timeout = options.timeout || NET_CONFIG.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const fetchOptions = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        ...options.headers
      },
      signal: controller.signal
    };
    
    // Добавляем ProxyAgent если настроен
    const proxyAgent = createProxyAgent();
    if (proxyAgent) {
      fetchOptions.dispatcher = proxyAgent;
    }
    
    let response;
    let isAborted = false;
    
    // Выполняем запрос
    const fetchPromise = fetch(url, fetchOptions);
    
    const result = await Promise.race([
      fetchPromise,
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          isAborted = true;
          reject(new Error('TIMEOUT'));
        });
      })
    ]).then(
      (res) => ({ ok: true, response: res }),
      (err) => ({ ok: false, error: err })
    );
    
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    
    // Обработка результата
    if (!result.ok) {
      lastError = result.error;
      
      if (isAborted || result.error.message === 'TIMEOUT') {
        if (attempt === maxRetries) {
          return { ok: false, code: 'TIMEOUT', url, ms: elapsed };
        }
        continue; // Повторяем при таймауте
      }
      
      // Другие ошибки сети
      if (attempt === maxRetries) {
        return { ok: false, code: 'NETWORK_ERROR', url, ms: elapsed, error: result.error.message };
      }
      continue;
    }
    
    response = result.response;
    
    // Проверяем статус ответа
    if (!response.ok) {
      if (attempt === maxRetries) {
        return { ok: false, code: `HTTP_${response.status}`, url, ms: elapsed, status: response.status };
      }
      
      // Повторяем только для 5xx ошибок
      if (response.status >= 500) {
        await delay(1000 * (attempt + 1)); // Экспоненциальная задержка
        continue;
      }
      
      // 4xx ошибки не повторяем
      return { ok: false, code: `HTTP_${response.status}`, url, ms: elapsed, status: response.status };
    }
    
    // Успешный ответ
    return { ok: true, response, url, ms: elapsed };
  }
  
  // Все попытки исчерпаны
  return { 
    ok: false, 
    code: 'MAX_RETRIES_EXCEEDED', 
    url, 
    ms: Date.now() - startTime, 
    error: lastError?.message 
  };
};

// Удобная функция для GET запросов с текстом
export const httpGet = async (url, headers = {}, timeout = NET_CONFIG.timeout) => {
  const result = await httpRequest(url, { headers, timeout });
  
  if (!result.ok) {
    return result; // Возвращаем ошибку как есть
  }
  
  const contentType = result.response.headers.get('content-type') || '';
  const text = await result.response.text();
  
  if (!text || text.length < 10) {
    return { ok: false, code: 'EMPTY_RESPONSE', url, ms: result.ms };
  }
  
  return {
    ok: true,
    text,
    url: result.url,
    ms: result.ms,
    status: result.response.status,
    contentType,
    headers: result.response.headers
  };
};

// Удобная функция для JSON запросов
export const httpGetJson = async (url, headers = {}, timeout = NET_CONFIG.timeout) => {
  const result = await httpGet(url, headers, timeout);
  
  if (!result.ok) {
    return result;
  }
  
  if (!result.contentType.includes('application/json')) {
    return { ok: false, code: 'NOT_JSON', url, ms: result.ms, contentType: result.contentType };
  }
  
  const parseResult = (() => {
    const data = JSON.parse(result.text);
    return { ok: true, data };
  })();
  
  if (!parseResult.ok) {
    return { ok: false, code: 'JSON_PARSE_ERROR', url, ms: result.ms };
  }
  
  return {
    ok: true,
    data: parseResult.data,
    url: result.url,
    ms: result.ms,
    status: result.status
  };
};

// Функция для пакетных запросов с ограничением concurrency
export const httpBatch = async (urls, options = {}) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    return [];
  }
  
  const concurrency = options.concurrency || 3;
  const results = [];
  
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(url => 
      typeof url === 'string' 
        ? httpGet(url, options.headers, options.timeout)
        : httpGet(url.url, url.headers || options.headers, url.timeout || options.timeout)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Задержка между батчами
    if (i + concurrency < urls.length) {
      await delay(500);
    }
  }
  
  return results;
};

// Получение статистики сетевого слоя
export const getNetworkStats = () => {
  return {
    domainsThrottled: domainThrottle.size,
    config: NET_CONFIG,
    proxyConfigured: !!(process.env.HTTP_PROXY || process.env.HTTPS_PROXY)
  };
};
