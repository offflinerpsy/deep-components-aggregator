import { fetch } from 'undici';
import { XMLParser } from 'fast-xml-parser';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Путь к файлу с кешированными курсами валют
 */
const RATES_PATH = 'data/rates.json';

/**
 * URL для получения курсов валют от ЦБ РФ
 */
const CBR_URL = 'https://www.cbr.ru/scripts/XML_daily.asp';

/**
 * Запасной URL для получения курсов валют
 */
const FALLBACK_URL = 'https://www.cbr-xml-daily.ru/daily_json.js';

/**
 * Время жизни кеша курсов валют (12 часов)
 */
const CACHE_TTL = 12 * 60 * 60 * 1000;

/**
 * Обновляет курсы валют из ЦБ РФ
 * @returns {Promise<object>} Объект с курсами валют
 */
export async function refreshRates() {
  try {
    // Пробуем получить курсы от ЦБ РФ
    const response = await fetch(CBR_URL);
    if (!response.ok) {
      throw new Error(`CBR API error: ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const data = parser.parse(xml);

    // Преобразуем данные в удобный формат
    const rates = { RUB: 1 };

    if (data.ValCurs && data.ValCurs.Valute) {
      const valutes = Array.isArray(data.ValCurs.Valute) ? data.ValCurs.Valute : [data.ValCurs.Valute];

      for (const valute of valutes) {
        const code = valute.CharCode;
        const nominal = parseFloat(valute.Nominal.replace(',', '.'));
        const value = parseFloat(valute.Value.replace(',', '.'));

        if (code && nominal && value) {
          rates[code] = value / nominal;
        }
      }
    }

    // Сохраняем курсы в кеш
    const ratesWithMeta = {
      ts: Date.now(),
      source: 'cbr',
      ...rates
    };

    // Создаем директорию, если она не существует
    const dir = path.dirname(RATES_PATH);
    if (!existsSync(dir)) {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(RATES_PATH, JSON.stringify(ratesWithMeta, null, 2));
    return rates;
  } catch (error) {
    console.error(`Error fetching rates from CBR: ${error.message}`);

    try {
      // Пробуем получить курсы из запасного источника
      console.log('Trying fallback source...');
      const response = await fetch(FALLBACK_URL);
      if (!response.ok) {
        throw new Error(`Fallback API error: ${response.status}`);
      }

      const data = await response.json();

      // Преобразуем данные в удобный формат
      const rates = { RUB: 1 };

      if (data.Valute) {
        for (const [code, info] of Object.entries(data.Valute)) {
          if (info.Value && info.Nominal) {
            rates[code] = info.Value / info.Nominal;
          }
        }
      }

      // Сохраняем курсы в кеш
      const ratesWithMeta = {
        ts: Date.now(),
        source: 'cbr-xml-daily',
        ...rates
      };

      // Создаем директорию, если она не существует
      const dir = path.dirname(RATES_PATH);
      if (!existsSync(dir)) {
        const { mkdirSync } = await import('node:fs');
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(RATES_PATH, JSON.stringify(ratesWithMeta, null, 2));
      return rates;
    } catch (fallbackError) {
      console.error(`Error fetching rates from fallback: ${fallbackError.message}`);

      // Если есть кешированные курсы, используем их
      if (existsSync(RATES_PATH)) {
        console.log('Using cached rates');
        return getRates();
      }

      // Если нет кешированных курсов, возвращаем только рубль
      return { RUB: 1 };
    }
  }
}

/**
 * Получает курсы валют из кеша или обновляет их, если кеш устарел
 * @returns {object} Объект с курсами валют
 */
export function getRates() {
  try {
    // Проверяем наличие кеша
    if (!existsSync(RATES_PATH)) {
      return { RUB: 1 };
    }

    // Читаем кеш
    const data = JSON.parse(readFileSync(RATES_PATH, 'utf8'));

    // Проверяем актуальность кеша
    if (data.ts && Date.now() - data.ts < CACHE_TTL) {
      // Удаляем метаданные
      const { ts, source, ...rates } = data;
      return rates;
    }

    // Если кеш устарел, возвращаем его, но запускаем обновление в фоне
    const { ts, source, ...rates } = data;
    refreshRates().catch(console.error);
    return rates;
  } catch (error) {
    console.error(`Error reading rates cache: ${error.message}`);
    return { RUB: 1 };
  }
}

/**
 * Конвертирует сумму в рубли
 * @param {object} options Параметры конвертации
 * @param {number} options.amount Сумма
 * @param {string} options.currency Валюта
 * @returns {number|null} Сумма в рублях или null в случае ошибки
 */
export function toRUB({ amount, currency }) {
  if (!amount || !currency) {
    return null;
  }

  // Если валюта уже рубли, возвращаем сумму
  if (currency.toUpperCase() === 'RUB') {
    return amount;
  }

  // Получаем курсы валют
  const rates = getRates();

  // Получаем курс для указанной валюты
  const rate = rates[currency.toUpperCase()];
  if (!rate) {
    console.warn(`Unknown currency: ${currency}`);
    return null;
  }

  // Конвертируем сумму
  return amount * rate;
}
