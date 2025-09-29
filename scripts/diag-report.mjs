#!/usr/bin/env node

/**
 * Скрипт для генерации отчета на основе диагностических данных
 *
 * Использование:
 * node scripts/diag-report.mjs --dir _diag/2025-09-29T00-00-00-000Z
 *
 * Опции:
 * --dir - директория с диагностическими данными
 * --output - директория для сохранения отчета (по умолчанию _reports)
 */

import fs from 'node:fs';
import path from 'node:path';

// Парсинг аргументов командной строки
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return defaultValue;
  return args[index + 1] || defaultValue;
};

// Получаем директорию с диагностическими данными
const diagDir = getArg('dir', null);
if (!diagDir) {
  console.error('Необходимо указать директорию с диагностическими данными');
  console.error('Пример: node scripts/diag-report.mjs --dir _diag/2025-09-29T00-00-00-000Z');
  process.exit(1);
}

// Проверяем существование директории
if (!fs.existsSync(diagDir)) {
  console.error(`Директория ${diagDir} не существует`);
  process.exit(1);
}

// Получаем директорию для сохранения отчета
const outputDir = getArg('output', '_reports');

// Создаем директорию для отчета
try {
  fs.mkdirSync(outputDir, { recursive: true });
} catch (error) {
  console.error(`Ошибка при создании директории ${outputDir}: ${error.message}`);
}

// Функция для чтения JSON-файла
const readJson = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Ошибка при чтении файла ${filePath}: ${error.message}`);
    return null;
  }
};

// Функция для чтения текстового файла
const readText = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Ошибка при чтении файла ${filePath}: ${error.message}`);
    return null;
  }
};

// Генерация отчета
console.log(`Генерация отчета для ${diagDir}...`);

// Читаем файл результата
const resultPath = path.join(diagDir, 'result.json');
const result = readJson(resultPath);

if (!result) {
  console.error(`Не удалось прочитать файл результата ${resultPath}`);
  process.exit(1);
}

// Читаем файл диагностики
const diagLogPath = path.join(diagDir, 'diag.log');
const diagLog = readText(diagLogPath);

// Читаем файл трассировки
const tracePath = path.join(diagDir, 'trace.txt');
const trace = fs.existsSync(tracePath) ? readText(tracePath) : null;

// Читаем статистику использования ключей
const initialUsageStatsPath = path.join(diagDir, 'initial-usage-stats.json');
const finalUsageStatsPath = path.join(diagDir, 'final-usage-stats.json');

const initialUsageStats = readJson(initialUsageStatsPath);
const finalUsageStats = readJson(finalUsageStatsPath);

// Читаем статистику очередей
const initialQueueStatsPath = path.join(diagDir, 'initial-queue-stats.json');
const finalQueueStatsPath = path.join(diagDir, 'final-queue-stats.json');

const initialQueueStats = readJson(initialQueueStatsPath);
const finalQueueStats = readJson(finalQueueStatsPath);

// Читаем найденные товары
const allItemsPath = path.join(diagDir, 'all-items.json');
const allItems = readJson(allItemsPath);

// Генерируем HTML-отчет
const generateHtmlReport = () => {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Отчет по диагностике поиска "${result.query}"</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #0066cc;
    }
    .section {
      margin-bottom: 30px;
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    pre {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-size: 14px;
    }
    .product-card {
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 15px;
      background-color: white;
    }
    .product-image {
      max-width: 100px;
      max-height: 100px;
      object-fit: contain;
    }
    .stats-comparison {
      display: flex;
      justify-content: space-between;
    }
    .stats-column {
      width: 48%;
    }
  </style>
</head>
<body>
  <h1>Отчет по диагностике поиска "${result.query}"</h1>

  <div class="section">
    <h2>Общая информация</h2>
    <table>
      <tr>
        <th>Запрос</th>
        <td>${result.query}</td>
      </tr>
      <tr>
        <th>Время запуска</th>
        <td>${result.timestamp}</td>
      </tr>
      <tr>
        <th>Длительность</th>
        <td>${result.duration}ms (${(result.duration / 1000).toFixed(2)}s)</td>
      </tr>
      <tr>
        <th>Найдено товаров</th>
        <td>${result.itemsCount}</td>
      </tr>
      <tr>
        <th>Источник завершения</th>
        <td>${result.result.source}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Статистика использования ключей</h2>
    <div class="stats-comparison">
      <div class="stats-column">
        <h3>Начальная статистика</h3>
        <pre>${JSON.stringify(initialUsageStats, null, 2)}</pre>
      </div>
      <div class="stats-column">
        <h3>Конечная статистика</h3>
        <pre>${JSON.stringify(finalUsageStats, null, 2)}</pre>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Статистика очередей</h2>
    <div class="stats-comparison">
      <div class="stats-column">
        <h3>Начальная статистика</h3>
        <pre>${JSON.stringify(initialQueueStats, null, 2)}</pre>
      </div>
      <div class="stats-column">
        <h3>Конечная статистика</h3>
        <pre>${JSON.stringify(finalQueueStats, null, 2)}</pre>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Найденные товары (${allItems ? allItems.length : 0})</h2>
    ${allItems ? allItems.map((item, index) => `
      <div class="product-card">
        <h3>${index + 1}. ${item.title || item.mpn || 'Без названия'}</h3>
        <table>
          <tr>
            <th>Изображение</th>
            <td>
              ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" class="product-image">` : 'Нет изображения'}
            </td>
          </tr>
          <tr>
            <th>MPN</th>
            <td>${item.mpn || 'Не указан'}</td>
          </tr>
          <tr>
            <th>Производитель</th>
            <td>${item.brand || 'Не указан'}</td>
          </tr>
          <tr>
            <th>Описание</th>
            <td>${item.description || item.desc || 'Нет описания'}</td>
          </tr>
          <tr>
            <th>Цена (₽)</th>
            <td>${item.price_min_rub !== undefined ? item.price_min_rub : 'Не указана'}</td>
          </tr>
        </table>
      </div>
    `).join('') : 'Товары не найдены'}
  </div>

  <div class="section">
    <h2>Лог диагностики</h2>
    <pre>${diagLog || 'Лог не найден'}</pre>
  </div>

  ${trace ? `
  <div class="section">
    <h2>Трассировка</h2>
    <pre>${trace}</pre>
  </div>
  ` : ''}

  <footer>
    <p>Отчет сгенерирован: ${new Date().toISOString()}</p>
  </footer>
</body>
</html>
  `;
};

// Сохраняем HTML-отчет
const reportName = path.basename(diagDir);
const reportPath = path.join(outputDir, `${reportName}.html`);

try {
  fs.writeFileSync(reportPath, generateHtmlReport(), 'utf8');
  console.log(`Отчет сохранен: ${reportPath}`);
} catch (error) {
  console.error(`Ошибка при сохранении отчета: ${error.message}`);
}

// Генерируем JSON-отчет
const jsonReport = {
  query: result.query,
  timestamp: result.timestamp,
  duration: result.duration,
  itemsCount: result.itemsCount,
  source: result.result.source,
  usageStats: {
    initial: initialUsageStats,
    final: finalUsageStats
  },
  queueStats: {
    initial: initialQueueStats,
    final: finalQueueStats
  },
  items: allItems
};

// Сохраняем JSON-отчет
const jsonReportPath = path.join(outputDir, `${reportName}.json`);

try {
  fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2), 'utf8');
  console.log(`JSON-отчет сохранен: ${jsonReportPath}`);
} catch (error) {
  console.error(`Ошибка при сохранении JSON-отчета: ${error.message}`);
}

console.log('Генерация отчета завершена.');
