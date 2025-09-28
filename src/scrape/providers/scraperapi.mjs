import { fetch, Headers } from 'undici';

/**
 * Base URL для ScraperAPI
 * @see https://docs.scraperapi.com/documentation-overview
 */
const BASE = 'http://api.scraperapi.com/';
const DEFAULT_TIMEOUT = 25000; // 25 секунд
const MAX_RETRIES = 2;

/**
 * Выполняет запрос через ScraperAPI с поддержкой повторных попыток и таймаутов
 * @param {object} options Параметры запроса
 * @param {string} options.key API ключ
 * @param {string} options.url URL для скрапинга
 * @param {object} options.params Дополнительные параметры для ScraperAPI
 * @param {number} options.timeout Таймаут запроса в мс (по умолчанию 25000)
 * @param {number} options.retries Количество повторных попыток (по умолчанию 2)
 * @returns {Promise<string>} HTML содержимое страницы
 */
export async function fetchViaScraperAPI({ key, url, params = {}, timeout = DEFAULT_TIMEOUT, retries = MAX_RETRIES }) {
  // Добавляем параметры по умолчанию
  const defaultParams = {
    render: 'false', // Не рендерим JavaScript по умолчанию
    keep_headers: 'true', // Сохраняем заголовки
  };

  const usp = new URLSearchParams({
    api_key: key,
    url,
    ...defaultParams,
    ...params
  });

  let lastErr;

  // Выполняем запрос с повторными попытками
  for (let i = 0; i <= retries; i++) {
    try {
      // Создаем контроллер для таймаута
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Выполняем запрос
      const response = await fetch(`${BASE}?${usp.toString()}`, {
        redirect: 'follow',
        signal: controller.signal,
        headers: new Headers({
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
        })
      });

      clearTimeout(timeoutId);

      // Проверяем статус ответа
      if (!response.ok) {
        throw new Error(`ScraperAPI error: ${response.status}`);
      }

      // Возвращаем текст ответа
      return await response.text();
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
  throw lastErr || new Error('SCRAPERAPI_FAILED_AFTER_RETRIES');
}
