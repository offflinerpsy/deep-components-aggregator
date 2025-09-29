/**
 * ScrapingBot провайдер для скрапинга
 * @module src/scrape/providers/scrapingbot
 */

import { fetch } from 'undici';

/**
 * Получить HTML страницы через ScrapingBot
 * @param {string} url - URL страницы для скрапинга
 * @param {Object} [options] - Опции запроса
 * @param {number} [options.timeoutMs=12000] - Таймаут запроса в миллисекундах
 * @param {string} [options.key] - API ключ для ScrapingBot
 * @param {Object} [options.params={}] - Дополнительные параметры для ScrapingBot
 * @returns {Promise<Object>} Результат запроса
 */
export async function fetchHtml(url, { timeoutMs = 12000, key, params = {} } = {}) {
  if (!key) {
    return {
      ok: false,
      status: 'config_error',
      error: 'API ключ ScrapingBot не указан',
      provider: 'scrapingbot'
    };
  }

  // Формируем URL для запроса
  const apiUrl = new URL('https://api.scraping-bot.io/scrape/raw-html');
  
  // Создаем параметры запроса
  const requestOptions = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(key + ':').toString('base64')}`
    },
    body: JSON.stringify({
      url: url,
      // Параметры по умолчанию для экономии кредитов и надежности
      useChrome: false, // Без Chrome для экономии кредитов
      premiumProxy: true, // Используем премиум прокси
      proxyCountry: 'ru', // Российские прокси
      ...params // Добавляем пользовательские параметры
    })
  };

  // Создаем контроллер для таймаута
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  requestOptions.signal = controller.signal;

  try {
    const response = await fetch(apiUrl.toString(), requestOptions);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        provider: 'scrapingbot',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    const data = await response.json();
    const html = data.body || '';
    
    // Проверка на наличие признаков блокировки или капчи
    if (
      html.includes('captcha') || 
      html.includes('CAPTCHA') || 
      html.includes('blocked') || 
      html.includes('Доступ ограничен')
    ) {
      return {
        ok: false,
        status: 'captcha_detected',
        provider: 'scrapingbot',
        usedKey: key?.slice(0, 8) + '...'
      };
    }

    return {
      ok: true,
      status: response.status,
      html,
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