import { fetch, Headers } from 'undici';

/**
 * Base URL для Scraping-Bot
 * @see https://www.scraping-bot.io/web-scraping-documentation
 */
const BASE = 'http://api.scraping-bot.io/scrape/raw-html';
const DEFAULT_TIMEOUT = 25000; // 25 секунд
const MAX_RETRIES = 2;

/**
 * Выполняет запрос через Scraping-Bot с поддержкой повторных попыток и таймаутов
 * @param {object} options Параметры запроса
 * @param {string} options.key API ключ
 * @param {string} options.url URL для скрапинга
 * @param {object} options.params Дополнительные параметры для Scraping-Bot
 * @param {number} options.timeout Таймаут запроса в мс (по умолчанию 25000)
 * @param {number} options.retries Количество повторных попыток (по умолчанию 2)
 * @returns {Promise<string>} HTML содержимое страницы
 */
export async function fetchViaScrapingBot({ key, url, params = {}, timeout = DEFAULT_TIMEOUT, retries = MAX_RETRIES }) {
  // Формируем параметры запроса
  const requestBody = {
    url,
    ...params
  };
  
  let lastErr;
  
  // Выполняем запрос с повторными попытками
  for (let i = 0; i <= retries; i++) {
    try {
      // Создаем контроллер для таймаута
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Выполняем запрос
      const response = await fetch(BASE, {
        method: 'POST',
        redirect: 'follow',
        signal: controller.signal,
        headers: new Headers({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${key}:`).toString('base64')}`
        }),
        body: JSON.stringify(requestBody)
      });
      
      clearTimeout(timeoutId);
      
      // Проверяем статус ответа
      if (!response.ok) {
        throw new Error(`Scraping-Bot error: ${response.status}`);
      }
      
      // Возвращаем текст ответа
      const responseData = await response.json();
      return responseData.body || '';
    } catch (err) {
      lastErr = err;
      
      // Если это не последняя попытка, ждем перед повторной попыткой
      if (i < retries) {
        // Экспоненциальный backoff с джиттером
        const delay = Math.floor(1000 * (2 ** i) * (0.8 + Math.random() * 0.4));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Если все попытки не удались, выбрасываем последнюю ошибку
  throw lastErr || new Error('SCRAPINGBOT_FAILED_AFTER_RETRIES');
}