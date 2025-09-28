import { fetch } from 'undici';
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Получаем путь к директории модуля
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// Путь к файлу с курсами валют
const RATES_FILE = path.join(rootDir, 'data/rates.json');

// URL для получения курсов валют
const CBR_URL = 'https://www.cbr.ru/scripts/XML_daily.asp';

// Резервный URL для получения курсов валют
const BACKUP_URL = 'https://www.cbr-xml-daily.ru/daily_json.js';

/**
 * Загружает курсы валют от ЦБ РФ
 * @returns {Promise<object>} Объект с курсами валют
 */
export async function fetchRates() {
  try {
    // Пытаемся загрузить курсы с основного URL
    const response = await fetch(CBR_URL, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Ошибка загрузки курсов валют: ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const data = parser.parse(xml);

    if (!data.ValCurs || !data.ValCurs.Valute) {
      throw new Error('Неверный формат данных от ЦБ РФ');
    }

    const rates = {
      RUB: 1,
      timestamp: Date.now(),
      source: 'cbr'
    };

    // Обрабатываем данные о курсах валют
    const valutes = Array.isArray(data.ValCurs.Valute) ? data.ValCurs.Valute : [data.ValCurs.Valute];
    for (const valute of valutes) {
      const code = valute.CharCode;
      const nominal = Number(valute.Nominal);
      const value = Number(String(valute.Value).replace(',', '.'));

      if (code && nominal && value) {
        rates[code] = value / nominal;
      }
    }

    return rates;
  } catch (error) {
    console.warn(`Ошибка при загрузке курсов с CBR: ${error.message}`);

    try {
      // Пытаемся загрузить курсы с резервного URL
      const response = await fetch(BACKUP_URL, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки курсов валют: ${response.status}`);
      }

      const data = await response.json();

      if (!data.Valute) {
        throw new Error('Неверный формат данных от резервного источника');
      }

      const rates = {
        RUB: 1,
        timestamp: Date.now(),
        source: 'cbr-xml-daily'
      };

      // Обрабатываем данные о курсах валют
      for (const [code, valute] of Object.entries(data.Valute)) {
        const value = Number(valute.Value);
        const nominal = Number(valute.Nominal);

        if (code && nominal && value) {
          rates[code] = value / nominal;
        }
      }

      return rates;
    } catch (backupError) {
      console.error(`Ошибка при загрузке курсов с резервного источника: ${backupError.message}`);

      // Если не удалось загрузить курсы, возвращаем базовые значения
      return {
        RUB: 1,
        USD: 80,
        EUR: 90,
        timestamp: Date.now(),
        source: 'fallback'
      };
    }
  }
}

/**
 * Обновляет файл с курсами валют
 * @returns {Promise<object>} Объект с курсами валют
 */
export async function refreshRates() {
  const rates = await fetchRates();

  try {
    // Создаем директорию, если она не существует
    const dir = path.dirname(RATES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Сохраняем курсы валют в файл
    fs.writeFileSync(RATES_FILE, JSON.stringify(rates, null, 2));

    return rates;
  } catch (error) {
    console.error(`Ошибка при сохранении курсов валют: ${error.message}`);
    return rates;
  }
}

/**
 * Загружает курсы валют из файла
 * @returns {object} Объект с курсами валют
 */
export function loadRates() {
  try {
    if (!fs.existsSync(RATES_FILE)) {
      return {
        RUB: 1,
        timestamp: 0,
        source: 'none'
      };
    }

    const content = fs.readFileSync(RATES_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Ошибка при загрузке курсов валют: ${error.message}`);
    return {
      RUB: 1,
      timestamp: 0,
      source: 'error'
    };
  }
}

/**
 * Проверяет актуальность курсов валют
 * @param {object} rates Объект с курсами валют
 * @param {number} maxAge Максимальный возраст курсов в миллисекундах
 * @returns {boolean} true, если курсы актуальны
 */
export function areRatesValid(rates, maxAge = 12 * 60 * 60 * 1000) {
  if (!rates || !rates.timestamp) {
    return false;
  }

  const now = Date.now();
  return now - rates.timestamp < maxAge;
}

/**
 * Получает курсы валют, при необходимости обновляя их
 * @param {boolean} forceRefresh Принудительно обновить курсы
 * @returns {Promise<object>} Объект с курсами валют
 */
export async function getRates(forceRefresh = false) {
  const rates = loadRates();

  // Если курсы устарели или принудительное обновление
  if (forceRefresh || !areRatesValid(rates)) {
    return await refreshRates();
  }

  return rates;
}

/**
 * Конвертирует сумму в рубли
 * @param {object} options Параметры конвертации
 * @param {number} options.amount Сумма для конвертации
 * @param {string} options.currency Валюта
 * @returns {number|null} Сумма в рублях или null в случае ошибки
 */
export async function toRub({ amount, currency }) {
  if (typeof amount !== 'number' || !amount) {
    return null;
  }

  // Если валюта не указана или это уже рубли, возвращаем исходную сумму
  if (!currency || currency.toUpperCase() === 'RUB') {
    return amount;
  }

  const rates = await getRates();
  const rate = rates[currency.toUpperCase()];

  if (!rate) {
    console.warn(`Не найден курс для валюты ${currency}`);
    return null;
  }

  return amount * rate;
}
