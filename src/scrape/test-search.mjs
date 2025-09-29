import { directFetch } from './direct-fetch.mjs';
import { parseChipDipSearch } from '../parsers/chipdip/search.mjs';
import { parsePromelecSearch } from '../parsers/promelec/search.mjs';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Тестовый скрипт для проверки поиска и парсинга
 * Запускается через: node src/scrape/test-search.mjs <запрос>
 */

// Создаем директорию для тестовых результатов
const TEST_DIR = 'test-results';
fs.mkdirSync(TEST_DIR, { recursive: true });

// Получаем запрос из аргументов командной строки
const query = process.argv[2] || 'транзистор';
const encodedQuery = encodeURIComponent(query);

console.log(`Testing search for "${query}" (${encodedQuery})`);

// Функция для сохранения HTML в файл
function saveHtml(html, filename) {
  const filePath = path.join(TEST_DIR, filename);
  fs.writeFileSync(filePath, html);
  console.log(`Saved HTML to ${filePath} (${html.length} bytes)`);
}

// Функция для сохранения результатов в JSON
function saveResults(results, filename) {
  const filePath = path.join(TEST_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} results to ${filePath}`);
}

// Тестируем поиск на ChipDip
async function testChipDip() {
  console.log('\n=== Testing ChipDip search ===');

  try {
    // Формируем URL для поиска
    const url = `https://www.chipdip.ru/search?searchtext=${encodedQuery}`;
    console.log(`Fetching ${url}`);

    // Выполняем запрос
    const result = await directFetch(url);

    if (!result.ok) {
      console.error(`Error fetching ${url}: ${result.status}`);
      return;
    }

    // Сохраняем HTML
    const htmlFilename = `chipdip-${encodedQuery}.html`;
    saveHtml(result.html, htmlFilename);

    // Парсим результаты
    const searchResults = parseChipDipSearch(result.html);

    // Сохраняем результаты
    const jsonFilename = `chipdip-${encodedQuery}.json`;
    saveResults(searchResults, jsonFilename);

    console.log(`Found ${searchResults.length} results on ChipDip`);

    // Выводим первые 5 результатов
    searchResults.slice(0, 5).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   MPN: ${item.mpn}`);
      if (item.description) {
        console.log(`   Description: ${item.description.substring(0, 100)}...`);
      }
    });
  } catch (error) {
    console.error('Error testing ChipDip search:', error);
  }
}

// Тестируем поиск на Promelec
async function testPromelec() {
  console.log('\n=== Testing Promelec search ===');

  try {
    // Формируем URL для поиска
    const url = `https://www.promelec.ru/search/?text=${encodedQuery}`;
    console.log(`Fetching ${url}`);

    // Выполняем запрос
    const result = await directFetch(url);

    if (!result.ok) {
      console.error(`Error fetching ${url}: ${result.status}`);
      return;
    }

    // Сохраняем HTML
    const htmlFilename = `promelec-${encodedQuery}.html`;
    saveHtml(result.html, htmlFilename);

    // Парсим результаты
    const searchResults = parsePromelecSearch(result.html);

    // Сохраняем результаты
    const jsonFilename = `promelec-${encodedQuery}.json`;
    saveResults(searchResults, jsonFilename);

    console.log(`Found ${searchResults.length} results on Promelec`);

    // Выводим первые 5 результатов
    searchResults.slice(0, 5).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   MPN: ${item.mpn}`);
      if (item.description) {
        console.log(`   Description: ${item.description.substring(0, 100)}...`);
      }
    });
  } catch (error) {
    console.error('Error testing Promelec search:', error);
  }
}

// Запускаем тесты
async function runTests() {
  await testChipDip();
  await testPromelec();
}

runTests().catch(console.error);
