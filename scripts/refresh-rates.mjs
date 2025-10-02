/**
 * Скрипт для обновления курсов валют ЦБ РФ
 *
 * Использование:
 * node scripts/refresh-rates.mjs
 *
 * Выход:
 * - 0: успешное обновление
 * - 1: ошибка при обновлении
 */

import { forceRefreshRates } from '../src/currency/cbr.mjs';

(async () => {
  try {
    console.log('Обновление курсов валют ЦБ РФ...');

    const rates = await forceRefreshRates();

    console.log(`Курсы валют успешно обновлены (${new Date(rates.timestamp).toISOString()})`);
    console.log('Доступные валюты:');

    for (const [currency, rate] of Object.entries(rates.rates)) {
      console.log(`${currency}: ${rate.toFixed(4)}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Ошибка при обновлении курсов валют:', error.message);
    process.exit(1);
  }
})();
