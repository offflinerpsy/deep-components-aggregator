/**
 * Scraping-Bot провайдер для скрапинга
 * @module src/scrape/providers/scrapingbot
 */

import { fetch } from 'undici';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Получить HTML страницы через Scraping-Bot
 * @param {string} url - URL страницы для скрапинга
 * @param {Object} [options] - Опции запроса
 * @param {number} [options.timeoutMs=12000] - Таймаут запроса в миллисекундах
 * @param {Object} [options.params={}] - Дополнительные параметры для Scraping-Bot
 * @returns {Promise<Object>} Результат запроса
 */
export async function fetchHtml(url, { timeoutMs = 12000, params = {} } = {}) {
  // Получаем ключ API из файла или переменной окружения
  let key;
  try {
    const keysPath = path.resolve('secrets/apis/scrapingbot.txt');
    if (fs.existsSync(keysPath)) {
      const keys = fs.readFileSync(keysPath, 'utf8').split(/\r?\n/).filter(Boolean);
      key = keys[0]; // Используем первый ключ из файла
    } else {
      key = process.env.SCRAPINGBOT_KEY;
    }
  } catch (error) {
    return {
      ok: false,
      status: 'config_error',
      error: 'Не удалось получить API ключ Scraping-Bot',
      provider: 'scrapingbot'
    };
  }

  if (!key) {
    return {
      ok: false,
      status: 'config_error',
      error: 'API ключ Scraping-Bot не найден',
      provider: 'scrapingbot'
    };
  }

  // Формируем запрос для Scraping-Bot
  const apiUrl = 'https://api.scraping-bot.io/scrape/raw-html';

  // Создаем контроллер для таймаута
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Базовая авторизация для Scraping-Bot (API ключ как пароль)
  const auth = Buffer.from(`scraping-bot:${key}`).toString('base64');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        url: url,
        useChrome: false,
        ...params
      })
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        provider: 'scrapingbot',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        ok: false,
        status: 'api_error',
        error: data.error || 'Неизвестная ошибка API',
        provider: 'scrapingbot',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    return {
      ok: true,
      status: response.status,
      html: data.body,
      provider: 'scrapingbot',
      usedKey: key?.slice(0, 8) + '...'
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        ok: false,
        status: 'timeout',
        provider: 'scrapingbot',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    return {
      ok: false,
      status: 'error',
      error: error.message,
      provider: 'scrapingbot',
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
