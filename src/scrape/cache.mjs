import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { get as scraperapi } from './providers/scraperapi.mjs';
import { get as scrapingbee } from './providers/scrapingbee.mjs';
import { get as scrapingbot } from './providers/scrapingbot.mjs';
import { pick, recordError, recordSuccess, pickBestProvider } from './rotator.mjs';

// Директории для кэша
const cacheDir = path.resolve('data/cache');
const htmlCacheDir = path.join(cacheDir, 'html');
const metaCacheDir = path.join(cacheDir, 'meta');

// Создаем директории, если их нет
try {
  fs.mkdirSync(htmlCacheDir, { recursive: true });
  fs.mkdirSync(metaCacheDir, { recursive: true });
} catch (error) {
  console.error(`Error creating cache directories: ${error.message}`);
}

// Генерация ключа кэша на основе URL и провайдера
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
    console.error(`Error creating cache subdirectory: ${error.message}`);
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

    // Специальные TTL для разных доменов
    if (hostname.includes('chipdip.ru')) {
      if (url.includes('/product') || url.includes('/product0')) {
        return 3 * 60 * 60 * 1000; // 3 часа для страниц продуктов ChipDip
      }
      return 1 * 60 * 60 * 1000; // 1 час для других страниц ChipDip
    }

    // Для других доменов
    return 12 * 60 * 60 * 1000; // 12 часов по умолчанию
  } catch (error) {
    console.error(`Error determining TTL for URL ${url}: ${error.message}`);
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
      ttl: getTTL(url)
    };

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving to cache for ${url}: ${error.message}`);
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
    console.error(`Error reading from cache for ${url}: ${error.message}`);
    return { exists: false, error: error.message };
  }
};

// Получение HTML с использованием кэша и провайдеров
export const fetchHtmlCached = async (url, options = {}) => {
  const { providerHint = null, timeoutMs = 10000, retries = 2 } = options;

  // Проверяем кэш
  const cacheResult = getFromCache(url);

  // Если есть свежий кэш, возвращаем его
  if (cacheResult.exists && !cacheResult.stale) {
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

  // Пробуем получить HTML через провайдеров
  for (const providerName of providerOrder) {
    const key = pick(providerName);
    if (!key) {
      console.warn(`[CACHE] No available key for provider: ${providerName}`);
      continue;
    }

    console.log(`[SCRAPE] Using ${providerName} with key ${key.slice(0, 8)}... for ${url}`);

    // Пробуем несколько раз с экспоненциальной задержкой
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const providerFn = providers[providerName];
        const result = await providerFn(url, { key, timeoutMs });

        if (result.ok) {
          // Успешный запрос
          console.log(`[SCRAPE SUCCESS] ${providerName} for ${url}`);
          recordSuccess(providerName, key);

          // Сохраняем в кэш
          saveToCache(url, result.html, providerName, result.status);

          return {
            ...result,
            cached: false,
            fresh: true
          };
        } else {
          // Ошибка запроса
          console.error(`[SCRAPE ERROR] ${providerName} failed for ${url}: ${result.status || result.error}`);
          recordError(providerName, key, result.status?.toString() || 'network');

          // Если это последняя попытка или критическая ошибка (402, 429) - переходим к следующему провайдеру
          if (attempt === retries || ['402', '429'].includes(result.status?.toString())) {
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
      }
    }
  }

  // Если все провайдеры не смогли получить HTML, но есть устаревший кэш, используем его (stale-if-error)
  if (cacheResult.exists) {
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
  return {
    ok: false,
    status: 'all_providers_failed',
    error: 'All scraping providers failed and no cache available.',
    provider: 'none',
    usedKey: 'none',
    cached: false
  };
};

// Экспортируем основную функцию как get для совместимости
export const get = fetchHtmlCached;

export default {
  fetchHtmlCached,
  get
};
