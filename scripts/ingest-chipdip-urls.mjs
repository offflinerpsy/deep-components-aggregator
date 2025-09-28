import fs from 'node:fs';
import path from 'node:path';
import { fetchHtmlCached } from '../src/scrape/cache.mjs';
import { toCanon } from '../src/parsers/chipdip/product.mjs';
import { saveProduct } from '../src/core/store.mjs';
import pLimit from 'p-limit';

const urlsFile = process.argv[2];
if (!urlsFile) {
  console.error('Использование: node scripts/ingest-chipdip-urls.mjs <путь_к_файлу_с_урлами>');
  process.exit(1);
}

const limit = parseInt(process.argv[3], 10) || Infinity;

if (!fs.existsSync(urlsFile)) {
  console.error(`Файл ${urlsFile} не существует`);
  process.exit(1);
}

const urls = fs.readFileSync(urlsFile, 'utf8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && line.includes('chipdip.ru/product'))
  .slice(0, limit);

if (urls.length === 0) {
  console.error('Нет URL-ов для обработки');
  process.exit(1);
}

console.log(`Найдено ${urls.length} URL-ов для обработки`);

const concurrencyLimit = pLimit(4); // Ограничение параллельных запросов
const results = { ok: 0, fail: 0, skipped: 0, cacheHits: 0 };
const reportFile = path.resolve('data/state/ingest-report.json');

async function ingestUrl(url) {
  try {
    const { ok, html, fromCache, provider, status } = await fetchHtmlCached(url);
    
    if (!ok) {
      console.error(`Ошибка при получении ${url}: ${status}`);
      results.fail++;
      return false;
    }
    
    if (fromCache) {
      results.cacheHits++;
    }
    
    const canon = toCanon(html, url);
    if (!canon.mpn) {
      console.warn(`Не удалось извлечь MPN из ${url}`);
      results.fail++;
      return false;
    }
    
    saveProduct(canon);
    results.ok++;
    return true;
  } catch (error) {
    console.error(`Ошибка при обработке ${url}: ${error.message}`);
    results.fail++;
    return false;
  }
}

async function main() {
  console.log('Начало обработки URL-ов...');
  
  const promises = urls.map(url => 
    concurrencyLimit(() => ingestUrl(url))
  );
  
  await Promise.all(promises);
  
  results.total = urls.length;
  results.timestamp = new Date().toISOString();
  
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  
  console.log(`
Обработка завершена:
- Всего URL-ов: ${results.total}
- Успешно: ${results.ok}
- Ошибок: ${results.fail}
- Пропущено: ${results.skipped}
- Из кэша: ${results.cacheHits}
  `);
}

main().catch(error => {
  console.error(`Необработанная ошибка: ${error.message}`);
  process.exit(1);
});