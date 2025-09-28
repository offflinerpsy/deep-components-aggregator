#!/usr/bin/env node

import { refreshRates } from '../src/currency/cbr.mjs';

/**
 * Обновляет курсы валют и выводит результат
 */
async function main() {
  try {
    console.log('Обновление курсов валют...');
    const rates = await refreshRates();

    console.log('Курсы валют успешно обновлены:');
    console.log(`Источник: ${rates.source}`);
    console.log(`Timestamp: ${new Date(rates.timestamp).toISOString()}`);
    console.log('Курсы:');

    for (const [currency, rate] of Object.entries(rates)) {
      if (currency !== 'timestamp' && currency !== 'source') {
        console.log(`  ${currency}: ${rate}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error(`Ошибка при обновлении курсов валют: ${error.message}`);
    process.exit(1);
  }
}

main();
