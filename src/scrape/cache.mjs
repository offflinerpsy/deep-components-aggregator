import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { get as scraperapi } from './providers/scraperapi.mjs';
import { get as scrapingbee } from './providers/scrapingbee.mjs';
import { get as scrapingbot } from './providers/scrapingbot.mjs';
import { pick, recordError, recordSuccess, pickBestProvider, shouldThrottleQuery } from './rotator.mjs';

// Директории для кэша
const cacheDir = path.resolve('data/cache');
const htmlCacheDir = path.join(cacheDir, 'html');
const metaCacheDir = path.join(cacheDir, 'meta');

// Создаем директории, если их нет
try {
  fs.mkdirSync(htmlCacheDir, { recursive: true });
  fs.mkdirSync(metaCacheDir, { recursive: true });
} catch (error) {
  console.error(`[CACHE] Error creating cache directories: ${error.message}`);
}

// Генерация ключа кэша на основе URL
const getCacheKey = (url) => {
  return crypto.createHash('sha1').update(url).digest('hex');
};

// Получение пути к файлу кэша с двухуровневой структурой директорий
const getCachePath = (key) => {
  const level1 = key.substring(0, 2);
  const level2 = key.substring(2, 4);
  const dir = path.join(htmlCacheDir, level1, level2);

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    console.error(`[CACHE] Error creating cache subdirectory: ${error.message}`);
  }

  return {
    htmlPath: path.join(dir, `${key}.html`),
    metaPath: path.join(metaCacheDir, `${key}.json`)
  };
};

// Определение TTL на основе домена URL
const getTTL = (url) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const isProductPage = url.includes('/product') || url.includes('/product0');

    // Специальные TTL для разных доменов и типов страниц
    if (hostname.includes('chipdip.ru')) {
      if (isProductPage) {
        return 24 * 60 * 60 * 1000; // 24 часа для страниц продуктов ChipDip
      }
      return 3 * 60 * 60 * 1000; // 3 часа для других страниц ChipDip
    } else if (hostname.includes('promelec.ru')) {
      if (isProductPage) {
        return 24 * 60 * 60 * 1000; // 24 часа для страниц продуктов Promelec
      }
      return 6 * 60 * 60 * 1000; // 6 часов для других страниц Promelec
    } else if (hostname.includes('electronshik.ru') || hostname.includes('platan.ru')) {
      return 12 * 60 * 60 * 1000; // 12 часов для других российских поставщиков
    }

    // Для других доменов
    return 24 * 60 * 60 * 1000; // 24 часа по умолчанию
  } catch (error) {
    console.error(`[CACHE] Error determining TTL for URL ${url}: ${error.message}`);
    return 6 * 60 * 60 * 1000; // 6 часов в случае ошибки
  }
};

// Сохранение HTML в кэш
const saveToCache = (url, html, provider, status) => {
  try {
    const key = getCacheKey(url);
    const { htmlPath, metaPath } = getCachePath(key);

    // Сохраняем HTML
    fs.writeFileSync(htmlPath, html, 'utf8');

    // Сохраняем метаданные
    const meta = {
      url,
      timestamp: Date.now(),
      provider,
      status,
      size: html.length,
      ttl: getTTL(url),
      hash: crypto.createHash('md5').update(html).digest('hex').substring(0, 8)
    };

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`[CACHE] Error saving to cache for ${url}: ${error.message}`);
    return false;
  }
};

// Проверка, устарел ли кэш
const isCacheStale = (meta) => {
  const now = Date.now();
  return now - meta.timestamp > meta.ttl;
};

// Получение HTML из кэша
const getFromCache = (url) => {
  try {
    const key = getCacheKey(url);
    const { htmlPath, metaPath } = getCachePath(key);

    // Проверяем наличие файлов кэша
    if (!fs.existsSync(metaPath) || !fs.existsSync(htmlPath)) {
      return { exists: false };
    }

    // Читаем метаданные
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    // Проверяем свежесть кэша
    const stale = isCacheStale(meta);

    // Читаем HTML
    const html = fs.readFileSync(htmlPath, 'utf8');

    return {
      exists: true,
      stale,
      html,
      meta
    };
  } catch (error) {
    console.error(`[CACHE] Error reading from cache for ${url}: ${error.message}`);
    return { exists: false, error: error.message };
  }
};

/**
 * Получение HTML с использованием кэша и провайдеров
 * @param {string} url - URL страницы для получения
 * @param {Object} options - Опции запроса
 * @param {string} [options.providerHint] - Предпочтительный провайдер
 * @param {number} [options.timeoutMs=10000] - Таймаут запроса в миллисекундах
 * @param {number} [options.retries=2] - Количество повторных попыток при ошибке
 * @param {number} [options.ttl] - TTL кэша в миллисекундах (переопределяет автоматический)
 * @param {boolean} [options.forceRefresh=false] - Принудительное обновление кэша
 * @param {boolean} [options.throttleCheck=true] - Проверка на ограничение запросов
 * @param {Object} [options.diagnostics] - Объект для сбора диагностики
 * @returns {Promise<Object>} Результат запроса
 */
export const fetchHtmlCached = async (url, options = {}) => {
  const {
    providerHint = null,
    timeoutMs = 10000,
    retries = 2,
    ttl = null,
    forceRefresh = false,
    throttleCheck = true,
    diagnostics = null
  } = options;

  // Если включена проверка на ограничение и запрос недавно выполнялся, используем кэш
  if (throttleCheck && shouldThrottleQuery(url)) {
    if (diagnostics) {
      diagnostics.addEvent('throttle', `Request throttled for URL: ${url}`);
    }
    console.log(`[CACHE] Request throttled for URL: ${url}`);
  }

  // Проверяем кэш
  const cacheResult = getFromCache(url);

  // Если есть свежий кэш и не требуется принудительное обновление, возвращаем его
  if (cacheResult.exists && !cacheResult.stale && !forceRefresh) {
    if (diagnostics) {
      diagnostics.addEvent('cache_hit', `Fresh cache hit for ${url}`);
    }
    console.log(`[CACHE HIT] Fresh cache for ${url}`);
    return {
      ok: true,
      status: cacheResult.meta.status,
      html: cacheResult.html,
      provider: cacheResult.meta.provider,
      usedKey: 'cached',
      cached: true,
      fresh: true
    };
  }

  // Определяем провайдеров для запроса
  const providers = {
    scraperapi,
    scrapingbee,
    scrapingbot
  };

  // Определяем порядок провайдеров
  let providerOrder;
  if (providerHint && providers[providerHint]) {
    // Если указан конкретный провайдер, используем его первым
    providerOrder = [providerHint, ...Object.keys(providers).filter(p => p !== providerHint)];
  } else {
    // Иначе выбираем лучшего провайдера на основе статистики
    const bestProvider = pickBestProvider();
    providerOrder = bestProvider
      ? [bestProvider, ...Object.keys(providers).filter(p => p !== bestProvider)]
      : Object.keys(providers);
  }

  if (diagnostics) {
    diagnostics.addEvent('provider_order', `Provider order: ${providerOrder.join(', ')}`);
  }

  // Пробуем получить HTML через провайдеров
  for (const providerName of providerOrder) {
    const key = pick(providerName);
    if (!key) {
      if (diagnostics) {
        diagnostics.addEvent('no_key', `No available key for provider: ${providerName}`);
      }
      console.warn(`[CACHE] No available key for provider: ${providerName}`);
      continue;
    }

    console.log(`[SCRAPE] Using ${providerName} with key ${key.slice(0, 8)}... for ${url}`);

    // Пробуем несколько раз с экспоненциальной задержкой
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        const providerFn = providers[providerName];
        const result = await providerFn(url, { key, timeoutMs });
        const fetchTime = Date.now() - startTime;

        if (diagnostics) {
          diagnostics.addProvider(providerName, url, result.ok, fetchTime, key.slice(0, 8) + '...', attempt);
        }

        if (result.ok) {
          // Успешный запрос
          console.log(`[SCRAPE SUCCESS] ${providerName} for ${url} in ${fetchTime}ms`);
          recordSuccess(providerName, key);

          // Сохраняем в кэш с указанным TTL или автоматическим
          const customTtl = ttl ? { ttl } : {};
          saveToCache(url, result.html, providerName, result.status, customTtl);

          return {
            ...result,
            cached: false,
            fresh: true,
            fetchTime
          };
        } else {
          // Ошибка запроса
          console.error(`[SCRAPE ERROR] ${providerName} failed for ${url}: ${result.status || result.error}`);
          recordError(providerName, key, result.status?.toString() || 'network');

          if (diagnostics) {
            diagnostics.addEvent('provider_error', 
              `Provider ${providerName} error: ${result.status || result.error} (attempt ${attempt + 1}/${retries + 1})`);
          }

          // Если это последняя попытка или критическая ошибка (402, 429) - переходим к следующему провайдеру
          if (attempt === retries || ['402', '429', 'captcha_detected'].includes(result.status?.toString())) {
            break;
          }

          // Экспоненциальная задержка перед следующей попыткой
          const delay = Math.pow(1.5, attempt) * 1000;
          console.log(`[SCRAPE RETRY] Waiting ${delay}ms before retry ${attempt + 1}/${retries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`[SCRAPE EXCEPTION] ${providerName} for ${url}: ${error.message}`);
        recordError(providerName, key, 'exception');
        
        if (diagnostics) {
          diagnostics.addEvent('provider_exception', 
            `Provider ${providerName} exception: ${error.message} (attempt ${attempt + 1}/${retries + 1})`);
        }
      }
    }
  }

  // Если все провайдеры не смогли получить HTML, но есть устаревший кэш, используем его (stale-if-error)
  if (cacheResult.exists) {
    if (diagnostics) {
      diagnostics.addEvent('stale_cache', `Using stale cache for ${url} (stale-if-error)`);
    }
    console.log(`[CACHE HIT] Using stale cache for ${url} (stale-if-error)`);
    return {
      ok: true,
      status: cacheResult.meta.status,
      html: cacheResult.html,
      provider: cacheResult.meta.provider,
      usedKey: 'cached',
      cached: true,
      fresh: false,
      stale: true
    };
  }

  // Если ничего не помогло, возвращаем ошибку
  if (diagnostics) {
    diagnostics.addEvent('all_failed', `All scraping providers failed for ${url}`);
  }
  
  return {
    ok: false,
    status: 'all_providers_failed',
    error: 'All scraping providers failed and no cache available.',
    provider: 'none',
    usedKey: 'none',
    cached: false
  };
};

/**
 * Получение HTML страницы
 * @param {string} url - URL страницы для получения
 * @param {Object} options - Опции запроса
 * @returns {Promise<Object>} Результат запроса
 */
export const getHTML = async (url, options = {}) => {
  return await fetchHtmlCached(url, options);
};

// Экспортируем основную функцию как get для совместимости
export const get = fetchHtmlCached;

export default {
  fetchHtmlCached,
  getHTML,
  get
};