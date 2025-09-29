/**
 * ScraperAPI провайдер для скрапинга
 * @module src/scrape/providers/scraperapi
 */

import { fetch } from 'undici';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Получить HTML страницы через ScraperAPI
 * @param {string} url - URL страницы для скрапинга
 * @param {Object} [options] - Опции запроса
 * @param {number} [options.timeoutMs=12000] - Таймаут запроса в миллисекундах
 * @param {Object} [options.params={}] - Дополнительные параметры для ScraperAPI
 * @returns {Promise<Object>} Результат запроса
 */
export async function fetchHtml(url, { timeoutMs = 12000, params = {} } = {}) {
  // Получаем ключ API из файла или переменной окружения
  let key;
  try {
    const keysPath = path.resolve('secrets/apis/scraperapi.txt');
    if (fs.existsSync(keysPath)) {
      const keys = fs.readFileSync(keysPath, 'utf8').split(/\r?\n/).filter(Boolean);
      key = keys[0]; // Используем первый ключ из файла
    } else {
      key = process.env.SCRAPERAPI_KEY;
    }
  } catch (error) {
    return {
      ok: false,
      status: 'config_error',
      error: 'Не удалось получить API ключ ScraperAPI',
      provider: 'scraperapi'
    };
  }

  if (!key) {
    return {
      ok: false,
      status: 'config_error',
      error: 'API ключ ScraperAPI не найден',
      provider: 'scraperapi'
    };
  }

  // Формируем URL для запроса
  const apiUrl = new URL('http://api.scraperapi.com');
  apiUrl.searchParams.set('api_key', key);
  apiUrl.searchParams.set('url', url);
  apiUrl.searchParams.set('render', 'false');
  apiUrl.searchParams.set('keep_headers', 'true');

  // Добавляем дополнительные параметры
  for (const [paramKey, paramValue] of Object.entries(params)) {
    apiUrl.searchParams.set(paramKey, paramValue);
  }

  // Создаем контроллер для таймаута
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        provider: 'scraperapi',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    const html = await response.text();

    return {
      ok: true,
      status: response.status,
      html,
      provider: 'scraperapi',
      usedKey: key?.slice(0, 8) + '...'
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        ok: false,
        status: 'timeout',
        provider: 'scraperapi',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    return {
      ok: false,
      status: 'error',
      error: error.message,
      provider: 'scraperapi',
      usedKey: key?.slice(0, 8) + '...'
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Получить HTML страницы (алиас для fetchHtml)
 * @param {string} url - URL страницы для скрапинга
 * @param {Object} [options] - Опции запроса
 * @returns {Promise<Object>} Результат запроса
 */
export const get = async (url, options) => {
  return await fetchHtml(url, options);
};

export default { fetchHtml, get };
