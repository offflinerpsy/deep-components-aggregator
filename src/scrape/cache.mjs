import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fetchWithTimeout } from './fetch.mjs';
import * as scraperapi from './providers/scraperapi.mjs';
import * as scrapingbee from './providers/scrapingbee.mjs';
import * as scrapingbot from './providers/scrapingbot.mjs';
import { pick, recordSuccess, recordError, pickBestProvider } from './rotator.mjs';

// Провайдеры скрапинга
const providers = {
  scraperapi: scraperapi.fetchViaScraperAPI,
  scrapingbee: scrapingbee.fetchViaScrapingBee,
  scrapingbot: scrapingbot.fetchViaScrapingBot
};

// Базовые директории для кэша
const CACHE_DIR = 'data/cache/html';
const META_DIR = 'data/cache/meta';

// Создаем директории, если они не существуют
fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(META_DIR, { recursive: true });

// TTL для разных доменов (в миллисекундах)
const TTL = {
  'chipdip.ru': 3 * 60 * 60 * 1000, // 3 часа
  'default': 12 * 60 * 60 * 1000    // 12 часов
};

/**
 * Генерирует ключ кэша для URL
 * @param {string} url URL для кэширования
 * @returns {string} Ключ кэша
 */
function getCacheKey(url) {
  return crypto.createHash('sha1').update(url).digest('hex');
}

/**
 * Генерирует путь к файлу кэша
 * @param {string} key Ключ кэша
 * @returns {string} Путь к файлу кэша
 */
function getCachePath(key) {
  const prefix1 = key.substring(0, 2);
  const prefix2 = key.substring(2, 4);
  const dir = path.join(CACHE_DIR, prefix1, prefix2);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${key}.html`);
}

/**
 * Генерирует путь к файлу метаданных
 * @param {string} key Ключ кэша
 * @returns {string} Путь к файлу метаданных
 */
function getMetaPath(key) {
  fs.mkdirSync(META_DIR, { recursive: true });
  return path.join(META_DIR, `${key}.json`);
}

/**
 * Определяет TTL для URL
 * @param {string} url URL
 * @returns {number} TTL в миллисекундах
 */
function getTTL(url) {
  try {
    const hostname = new URL(url).hostname;
    for (const domain in TTL) {
      if (hostname.includes(domain)) {
        return TTL[domain];
      }
    }
  } catch (error) {
    console.error(`Error parsing URL ${url}:`, error);
  }
  return TTL.default;
}

/**
 * Получает данные из кэша
 * @param {string} url URL для получения из кэша
 * @returns {object} Результат получения из кэша
 */
function getFromCache(url) {
  const key = getCacheKey(url);
  const cachePath = getCachePath(key);
  const metaPath = getMetaPath(key);

  try {
    // Проверяем, существует ли файл кэша
    if (fs.existsSync(cachePath) && fs.existsSync(metaPath)) {
      // Читаем метаданные
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const now = Date.now();
      const ttl = getTTL(url);
      const isStale = now - meta.timestamp > ttl;

      // Читаем HTML из кэша
      const html = fs.readFileSync(cachePath, 'utf8');

      return {
        exists: true,
        stale: isStale,
        html,
        meta
      };
    }
  } catch (error) {
    console.error(`Error reading from cache for ${url}:`, error);
  }

  return { exists: false };
}

/**
 * Сохраняет данные в кэш
 * @param {string} url URL для сохранения в кэш
 * @param {string} html HTML-содержимое
 * @param {string} provider Имя провайдера
 * @param {number} status HTTP-статус
 */
function saveToCache(url, html, provider, status) {
  if (!html) {
    console.error(`Empty HTML for ${url}, not caching`);
    return;
  }

  const key = getCacheKey(url);
  const cachePath = getCachePath(key);
  const metaPath = getMetaPath(key);

  try {
    // Сохраняем HTML
    fs.writeFileSync(cachePath, html);

    // Сохраняем метаданные
    const meta = {
      url,
      timestamp: Date.now(),
      provider,
      status
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    console.log(`Cached ${url} (${html.length} bytes) from ${provider}`);
  } catch (error) {
    console.error(`Error saving to cache for ${url}:`, error);
  }
}

/**
 * Получает HTML-содержимое с кэшированием
 * @param {string} url URL для получения
 * @param {object} options Опции запроса
 * @returns {Promise<object>} Результат запроса
 */
export const fetchHtmlCached = async (url, options = {}) => {
  const { providerHint = null, timeoutMs = 10000, retries = 2, diagnostics } = options;

  console.log(`[CACHE] Fetching ${url} with cache`);

  // Логируем начало запроса
  if (diagnostics) {
    diagnostics.addEvent('cache_request_start', `Starting cached fetch for ${url}`, {
      providerHint,
      timeoutMs,
      retries
    });
  }

  // Проверяем кэш
  const cacheResult = getFromCache(url);

  // Если есть свежий кэш, возвращаем его
  if (cacheResult.exists && !cacheResult.stale) {
    console.log(`[CACHE] Cache hit for ${url} (fresh)`);

    if (diagnostics) {
      diagnostics.addEvent('cache_hit', `Returning fresh cache for ${url}`, {
        cacheAge: Date.now() - cacheResult.meta.timestamp
      });
    }

    return {
      ok: true,
      html: cacheResult.html,
      status: cacheResult.meta.status,
      cached: true,
      fresh: true,
      provider: cacheResult.meta.provider,
      usedKey: 'cache'
    };
  }

  // Определяем порядок провайдеров
  let providerOrder;
  if (providerHint && providers[providerHint]) {
    providerOrder = [providerHint, ...Object.keys(providers).filter(p => p !== providerHint)];
  } else {
    const bestProvider = pickBestProvider();
    providerOrder = bestProvider
      ? [bestProvider, ...Object.keys(providers).filter(p => p !== bestProvider)]
      : Object.keys(providers);
  }

  console.log(`[CACHE] Provider order: ${providerOrder.join(', ')}`);

  if (diagnostics) {
    diagnostics.addEvent('provider_order', `Provider order: ${providerOrder.join(', ')}`);
  }

  // Пробуем каждый провайдер по очереди
  for (const providerName of providerOrder) {
    const key = pick(providerName);
    if (!key) {
      console.warn(`[CACHE] No available key for ${providerName}, skipping`);
      if (diagnostics) {
        diagnostics.addEvent('provider_skip', `No available key for provider ${providerName}`);
      }
      continue;
    }

    console.log(`[CACHE] Trying ${providerName} for ${url}`);

    if (diagnostics) {
      diagnostics.addEvent('provider_try', `Trying ${providerName} with key ${key.substring(0, 4)}...`);
    }

    // Пробуем несколько раз с экспоненциальным backoff
    for (let attempt = 0; attempt <= retries; attempt++) {
      const attemptStart = Date.now();

      if (diagnostics) {
        diagnostics.addEvent('provider_fetch', `Attempt ${attempt + 1} for ${url} using ${providerName} (key: ${key.substring(0, 4)}...)`);
      }

      try {
        const providerFn = providers[providerName];
        const result = await providerFn({ key, url, timeout: timeoutMs });
        const attemptTime = Date.now() - attemptStart;

        if (result.ok) {
          console.log(`[CACHE] Success with ${providerName} for ${url}`);
          recordSuccess(providerName, key);
          saveToCache(url, result.html, providerName, result.status);

          if (diagnostics) {
            diagnostics.addEvent('provider_success', `Successfully fetched ${url} with ${providerName}`, {
              status: result.status,
              time: attemptTime,
              htmlLength: result.html?.length || 0,
              key: key.substring(0, 4) + '...'
            });
          }

          return {
            ...result,
            cached: false,
            fresh: true,
            provider: providerName,
            usedKey: key,
            attemptTime
          };
        } else {
          console.error(`[CACHE] Error with ${providerName} for ${url}: ${result.status}`);
          recordError(providerName, key, result.status?.toString() || 'network');

          if (diagnostics) {
            diagnostics.addEvent('provider_fail', `Failed to fetch ${url} with ${providerName}`, {
              status: result.status,
              attempt: attempt + 1,
              key: key.substring(0, 4) + '...',
              time: attemptTime
            });
          }

          // Если это последняя попытка или критическая ошибка, прекращаем попытки с этим провайдером
          if (attempt === retries || ['402', '429'].includes(result.status?.toString())) {
            break;
          }

          // Экспоненциальный backoff
          const delay = Math.pow(1.5, attempt) * 1000;
          console.log(`[CACHE] Retrying ${providerName} after ${delay}ms (attempt ${attempt + 1}/${retries})`);

          if (diagnostics) {
            diagnostics.addEvent('provider_retry_delay', `Waiting ${delay}ms before retry`);
          }

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`[CACHE] Exception with ${providerName} for ${url}:`, error);
        recordError(providerName, key, 'exception');

        if (diagnostics) {
          diagnostics.addEvent('provider_exception', `Exception fetching ${url} with ${providerName}: ${error.message}`, {
            error: true,
            key: key.substring(0, 4) + '...',
            time: Date.now() - attemptStart
          });
        }
      }
    }
  }

  // Если все провайдеры не сработали, но есть устаревший кэш, используем его (stale-if-error)
  if (cacheResult.exists) {
    console.log(`[CACHE] All providers failed, using stale cache for ${url}`);

    if (diagnostics) {
      diagnostics.addEvent('cache_stale_if_error', `Returning stale cache for ${url} due to provider errors`, {
        cacheAge: Date.now() - cacheResult.meta.timestamp
      });
    }

    return {
      ok: true,
      html: cacheResult.html,
      status: cacheResult.meta.status,
      cached: true,
      fresh: false,
      stale: true,
      provider: cacheResult.meta.provider,
      usedKey: 'stale_cache'
    };
  }

  // Если ничего не сработало, возвращаем ошибку
  console.error(`[CACHE] All providers failed for ${url} and no cache available`);

  if (diagnostics) {
    diagnostics.addEvent('all_providers_failed', `All providers failed for ${url}`, {
      providersTried: providerOrder.length
    });
  }

  return {
    ok: false,
    status: 'all_providers_failed',
    error: 'All providers failed and no cache available',
    cached: false,
    usedKey: null
  };
};
