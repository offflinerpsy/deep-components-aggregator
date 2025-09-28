import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const query = process.argv[2];
if (!query) {
  console.error('Использование: node scripts/diag-live.mjs "ПОИСКОВЫЙ_ЗАПРОС"');
  process.exit(1);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const diagDir = path.resolve(`data/_diag/${ts}`);
fs.mkdirSync(diagDir, { recursive: true });
const traceFile = path.join(diagDir, 'trace.txt');

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} ${msg}\n`;
  fs.appendFileSync(traceFile, line);
  console.log(msg);
}

async function runDiagnostics() {
  log(`Запуск диагностики для запроса: "${query}"`);
  
  try {
    // Проверка наличия секретов
    const secretsDir = path.resolve('secrets/apis');
    if (!fs.existsSync(secretsDir)) {
      log('ОШИБКА: Директория secrets/apis не существует');
      return;
    }
    
    const providers = ['scraperapi', 'scrapingbee', 'scrapingbot'];
    const missingProviders = [];
    
    for (const provider of providers) {
      const keyFile = path.join(secretsDir, `${provider}.txt`);
      if (!fs.existsSync(keyFile) || !fs.readFileSync(keyFile, 'utf8').trim()) {
        missingProviders.push(provider);
      }
    }
    
    if (missingProviders.length > 0) {
      log(`ПРЕДУПРЕЖДЕНИЕ: Отсутствуют ключи для провайдеров: ${missingProviders.join(', ')}`);
    }
    
    // Проверка структуры каталогов
    const requiredDirs = [
      'data/cache/html',
      'data/cache/meta',
      'data/db/products',
      'data/idx',
      'data/state'
    ];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(path.resolve(dir))) {
        log(`ОШИБКА: Директория ${dir} не существует`);
        fs.mkdirSync(path.resolve(dir), { recursive: true });
        log(`Создана директория ${dir}`);
      }
    }
    
    // Проверка SQLite базы данных
    const dbPath = path.resolve('data/db/agg.sqlite');
    if (!fs.existsSync(dbPath)) {
      log('ПРЕДУПРЕЖДЕНИЕ: База данных SQLite не существует');
      log('Запуск миграции SQLite...');
      try {
        await import('../scripts/migrate-sqlite.mjs');
        log('Миграция SQLite выполнена успешно');
      } catch (error) {
        log(`ОШИБКА при миграции SQLite: ${error.message}`);
      }
    }
    
    // Проверка курсов валют
    const ratesPath = path.resolve('data/rates.json');
    if (!fs.existsSync(ratesPath)) {
      log('ПРЕДУПРЕЖДЕНИЕ: Файл курсов валют не существует');
      log('Запуск обновления курсов валют...');
      try {
        const { refreshRates } = await import('../src/currency/cbr.mjs');
        const rates = await refreshRates();
        if (rates) {
          log('Курсы валют обновлены успешно');
        } else {
          log('ОШИБКА: Не удалось обновить курсы валют');
        }
      } catch (error) {
        log(`ОШИБКА при обновлении курсов валют: ${error.message}`);
      }
    } else {
      try {
        const ratesData = JSON.parse(fs.readFileSync(ratesPath, 'utf8'));
        const ratesAge = Date.now() - ratesData.ts;
        log(`Возраст курсов валют: ${Math.round(ratesAge / 1000 / 60 / 60)} часов`);
        if (ratesAge > 48 * 60 * 60 * 1000) {
          log('ПРЕДУПРЕЖДЕНИЕ: Курсы валют устарели (>48 часов)');
        }
      } catch (error) {
        log(`ОШИБКА при чтении курсов валют: ${error.message}`);
      }
    }
    
    // Проверка индекса поиска
    const indexPath = path.resolve('data/idx/search-index.json');
    if (!fs.existsSync(indexPath)) {
      log('ПРЕДУПРЕЖДЕНИЕ: Индекс поиска не существует');
    }
    
    // Проверка доступности API
    log('Проверка доступности API...');
    try {
      const response = await fetch('http://localhost:9201/api/health');
      if (response.ok) {
        const health = await response.json();
        log(`API доступен: ${JSON.stringify(health)}`);
      } else {
        log(`ОШИБКА: API недоступен, статус ${response.status}`);
      }
    } catch (error) {
      log(`ОШИБКА при проверке API: ${error.message}`);
    }
    
    // Проверка SSE
    log('Проверка SSE API...');
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      
      const sseUrl = `http://localhost:9201/api/live/search?q=${encodeURIComponent(query)}`;
      log(`Запрос к SSE: ${sseUrl}`);
      
      const response = await fetch(sseUrl, { signal });
      const headers = Object.fromEntries(response.headers.entries());
      log(`SSE заголовки: ${JSON.stringify(headers)}`);
      
      if (headers['content-type']?.includes('text/event-stream')) {
        log('SSE заголовки корректны');
        
        // Установка таймаута для SSE
        setTimeout(() => {
          controller.abort();
          log('SSE запрос прерван по таймауту');
        }, 10000);
        
        let eventCount = 0;
        let itemCount = 0;
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          try {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            log(`SSE получен чанк: ${chunk.length} байт`);
            
            // Подсчет событий
            const events = chunk.match(/event:/g);
            if (events) {
              eventCount += events.length;
              
              // Подсчет item событий
              const items = chunk.match(/event: item/g);
              if (items) {
                itemCount += items.length;
              }
            }
          } catch (error) {
            if (error.name === 'AbortError') {
              log('SSE запрос прерван');
            } else {
              log(`ОШИБКА при чтении SSE: ${error.message}`);
            }
            break;
          }
        }
        
        log(`Всего получено SSE событий: ${eventCount}, из них item: ${itemCount}`);
      } else {
        log(`ОШИБКА: SSE неверный Content-Type: ${headers['content-type']}`);
      }
    } catch (error) {
      log(`ОШИБКА при проверке SSE: ${error.message}`);
    }
    
    log('Диагностика завершена');
    log(`Полный лог сохранен в: ${traceFile}`);
  } catch (error) {
    log(`КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`);
    log(error.stack);
  }
}

runDiagnostics().catch(error => {
  log(`НЕОБРАБОТАННАЯ ОШИБКА: ${error.message}`);
  log(error.stack);
  process.exit(1);
});
