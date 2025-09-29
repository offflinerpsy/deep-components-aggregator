/**
 * Модуль для работы с курсами валют ЦБ РФ
 * @module src/currency/cbr
 */

import fs from 'node:fs';
import path from 'node:path';
import { fetch } from 'undici';
import { XMLParser } from 'fast-xml-parser';

// URL API ЦБ РФ для получения курсов валют
const CBR_API_URL = 'https://www.cbr.ru/scripts/XML_daily.asp';

// Путь к файлу с курсами валют
const RATES_FILE_PATH = path.resolve('data/rates.json');

// Время жизни курсов валют (12 часов)
const RATES_TTL = 12 * 60 * 60 * 1000;

// Максимальный возраст курсов валют для предупреждения (48 часов)
const RATES_MAX_AGE = 48 * 60 * 60 * 1000;

/**
 * Загрузить курсы валют из файла
 * @returns {Object} Объект с курсами валют и временем их получения
 */
export const loadRates = () => {
  try {
    if (fs.existsSync(RATES_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(RATES_FILE_PATH, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Ошибка при загрузке курсов валют:', error.message);
  }

  return {
    timestamp: 0,
    rates: {
      USD: 90.0,
      EUR: 100.0
    }
  };
};

/**
 * Сохранить курсы валют в файл
 * @param {Object} rates - Объект с курсами валют
 */
export const saveRates = (rates) => {
  try {
    const dir = path.dirname(RATES_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(RATES_FILE_PATH, JSON.stringify(rates, null, 2), 'utf8');
  } catch (error) {
    console.error('Ошибка при сохранении курсов валют:', error.message);
  }
};

/**
 * Получить курсы валют с сайта ЦБ РФ
 * @returns {Promise<Object>} Объект с курсами валют
 */
export const fetchRates = async () => {
  try {
    const response = await fetch(CBR_API_URL);

    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser();
    const data = parser.parse(xml);

    if (!data.ValCurs || !Array.isArray(data.ValCurs.Valute)) {
      throw new Error('Неверный формат XML от ЦБ РФ');
    }

    const rates = {};

    for (const valute of data.ValCurs.Valute) {
      // Заменяем запятую на точку и преобразуем в число
      const value = parseFloat(valute.Value.replace(',', '.'));
      const nominal = parseInt(valute.Nominal, 10);

      // Рассчитываем курс за единицу валюты
      rates[valute.CharCode] = value / nominal;
    }

    return {
      timestamp: Date.now(),
      rates
    };
  } catch (error) {
    console.error('Ошибка при получении курсов валют:', error.message);

    // Возвращаем загруженные курсы или значения по умолчанию
    return loadRates();
  }
};

/**
 * Обновить курсы валют, если они устарели
 * @returns {Promise<Object>} Объект с курсами валют
 */
export const refreshRates = async () => {
  const currentRates = loadRates();
  const now = Date.now();

  // Если курсы устарели, обновляем их
  if (now - currentRates.timestamp > RATES_TTL) {
    const newRates = await fetchRates();
    saveRates(newRates);
    return newRates;
  }

  return currentRates;
};

/**
 * Принудительно обновить курсы валют
 * @returns {Promise<Object>} Объект с курсами валют
 */
export const forceRefreshRates = async () => {
  const newRates = await fetchRates();
  saveRates(newRates);
  return newRates;
};

/**
 * Получить возраст курсов валют
 * @returns {number} Возраст курсов валют в миллисекундах
 */
export const getRatesAge = () => {
  const currentRates = loadRates();
  return Date.now() - currentRates.timestamp;
};

/**
 * Конвертировать сумму из одной валюты в другую
 * @param {number} amount - Сумма для конвертации
 * @param {string} fromCurrency - Исходная валюта
 * @param {string} toCurrency - Целевая валюта
 * @returns {number} Сконвертированная сумма
 */
export const convert = (amount, fromCurrency, toCurrency) => {
  if (!amount) return 0;

  // Если валюты совпадают, возвращаем исходную сумму
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const { rates } = loadRates();

  // Проверяем наличие курсов для валют
  if (!rates[fromCurrency] || (toCurrency !== 'RUB' && !rates[toCurrency])) {
    console.warn(`Курс для ${fromCurrency} или ${toCurrency} не найден`);

    // Фолбэк на приблизительные курсы
    const fallbackRates = {
      USD: 90.0,
      EUR: 100.0,
      RUB: 1.0
    };

    if (!fallbackRates[fromCurrency] || !fallbackRates[toCurrency]) {
      return amount; // Не можем конвертировать, возвращаем исходную сумму
    }

    // Конвертируем через рубль
    const amountInRub = amount * fallbackRates[fromCurrency];
    return Math.round(amountInRub / fallbackRates[toCurrency]);
  }

  // Конвертируем через рубль
  const amountInRub = amount * rates[fromCurrency];
  if (toCurrency === 'RUB') {
    return Math.round(amountInRub);
  }
  return Math.round(amountInRub / rates[toCurrency]);
};

/**
 * Конвертировать сумму в рубли
 * @param {number} amount - Сумма для конвертации
 * @param {string} currency - Исходная валюта
 * @returns {number} Сумма в рублях
 */
export const toRub = (amount, currency) => {
  if (!amount) return 0;

  // Если уже рубли, возвращаем исходную сумму
  if (currency === 'RUB') {
    return amount;
  }

  return convert(amount, currency, 'RUB');
};

export default { loadRates, refreshRates, forceRefreshRates, getRatesAge, convert, toRub };
