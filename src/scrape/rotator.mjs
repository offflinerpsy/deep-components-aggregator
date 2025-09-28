import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fetchViaScraperAPI } from './providers/scraperapi.mjs';
import { fetchViaScrapingBee } from './providers/scrapingbee.mjs';
import { fetchViaScrapingBot } from './providers/scrapingbot.mjs';
import crypto from 'node:crypto';

/**
 * Пути к файлам состояния
 */
const USAGE_PATH = 'data/state/usage.json';
const RATE_PATH = 'data/state/rate.json';
const ERROR_PATH = 'data/state/errors.json';

/**
 * Конфигурация провайдеров скрапинга
 */
const PROVIDERS = [
  { 
    name: 'scraperapi', 
    file: 'secrets/apis/scraperapi.txt', 
    fetcher: fetchViaScraperAPI, 
    defaults: { render: 'false' },
    rps: 1 // 1 запрос в секунду
  },
  { 
    name: 'scrapingbee', 
    file: 'secrets/apis/scrapingbee.txt', 
    fetcher: fetchViaScrapingBee, 
    defaults: { render_js: 'false' },
    rps: 1 // 1 запрос в секунду
  },
  { 
    name: 'scrapingbot', 
    file: 'secrets/apis/scrapingbot.txt', 
    fetcher: fetchViaScrapingBot, 
    defaults: {},
    rps: 0.5 // 1 запрос в 2 секунды
  }
];

/**
 * Загружает API ключи из файла
 * @param {string} file Путь к файлу с ключами
 * @returns {string[]} Массив ключей
 */
function loadKeys(file) { 
  try { 
    return readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean); 
  } catch { 
    return []; 
  } 
}

/**
 * Создает директорию для состояния, если она не существует
 */
function ensureState() { 
  if (!existsSync('data/state')) {
    mkdirSync('data/state', { recursive: true }); 
  }
}

/**
 * Загружает данные об использовании API ключей
 * @returns {object} Данные об использовании
 */
function loadUsage() { 
  ensureState(); 
  if (!existsSync(USAGE_PATH)) return {}; 
  return JSON.parse(readFileSync(USAGE_PATH, 'utf8')); 
}

/**
 * Сохраняет данные об использовании API ключей
 * @param {object} u Данные об использовании
 */
function saveUsage(u) { 
  writeFileSync(USAGE_PATH, JSON.stringify(u, null, 2)); 
}

/**
 * Загружает данные о скорости запросов
 * @returns {object} Данные о скорости запросов
 */
function loadRate() { 
  ensureState(); 
  if (!existsSync(RATE_PATH)) return {}; 
  return JSON.parse(readFileSync(RATE_PATH, 'utf8')); 
}

/**
 * Сохраняет данные о скорости запросов
 * @param {object} r Данные о скорости запросов
 */
function saveRate(r) { 
  writeFileSync(RATE_PATH, JSON.stringify(r, null, 2)); 
}

/**
 * Загружает данные об ошибках
 * @returns {object} Данные об ошибках
 */
function loadErrors() {
  ensureState();
  if (!existsSync(ERROR_PATH)) return {};
  return JSON.parse(readFileSync(ERROR_PATH, 'utf8'));
}

/**
 * Сохраняет данные об ошибках
 * @param {object} e Данные об ошибках
 */
function saveErrors(e) {
  writeFileSync(ERROR_PATH, JSON.stringify(e, null, 2));
}

/**
 * Асинхронная функция ожидания
 * @param {number} ms Время ожидания в миллисекундах
 * @returns {Promise<void>}
 */
async function sleep(ms) { 
  await new Promise(r => setTimeout(r, ms)); 
}

/**
 * Получает HTML страницы с использованием ротации провайдеров и ключей
 * @param {string} url URL страницы для скрапинга
 * @param {object} opts Дополнительные опции
 * @param {object} opts.params Параметры для провайдера
 * @param {string} opts.hostKey Ключ хоста для выбора провайдера
 * @param {number} opts.timeout Таймаут запроса в мс
 * @returns {Promise<object>} Объект с HTML и метаданными
 */
export async function fetchHTML(url, opts = {}) {
  // Загружаем данные о состоянии
  const usage = loadUsage();
  const rate = loadRate();
  const errors = loadErrors();
  
  // Получаем ключ хоста для выбора провайдера
  const hostKey = opts.hostKey || new URL(url).hostname;
  
  // Фильтруем провайдеров с доступными ключами
  const order = PROVIDERS
    .map(p => ({ ...p, keys: loadKeys(p.file) }))
    .filter(p => p.keys.length > 0);
  
  // Проверяем, есть ли доступные провайдеры
  if (!order.length) throw new Error('NO_KEYS');
  
  let lastErr;
  
  // Перебираем провайдеров
  for (const prov of order) {
    // Проверяем ограничение скорости запросов
    const now = Date.now();
    const nextAt = rate[prov.name]?.nextAt || 0;
    if (now < nextAt) {
      await sleep(nextAt - now);
    }
    
    // Получаем ключи для текущего провайдера
    const keys = prov.keys;
    
    // Выбираем индекс ключа на основе хеша URL
    const idx = Math.abs(crypto.createHash('md5').update(url + hostKey).digest().readUInt32BE(0)) % keys.length;
    
    // Перебираем ключи
    for (let i = 0; i < keys.length; i++) {
      const key = keys[(idx + i) % keys.length];
      
      // Проверяем, не превышен ли лимит ошибок для этого ключа
      const keyErrors = errors[prov.name]?.[key] || { count: 0, ts: 0 };
      if (keyErrors.count >= 5 && now - keyErrors.ts < 3600000) {
        // Пропускаем ключ, если он имеет 5+ ошибок за последний час
        continue;
      }
      
      // Делаем до 3 попыток с экспоненциальным бэкоффом
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Выполняем запрос через провайдер
          const html = await prov.fetcher({ 
            key, 
            url, 
            params: { ...prov.defaults, ...(opts.params || {}) }, 
            timeout: opts.timeout || 25000 
          });
          
          // Обновляем счетчик использования
          usage[prov.name] = usage[prov.name] || {};
          usage[prov.name][key] = (usage[prov.name][key] || 0) + 1;
          saveUsage(usage);
          
          // Обновляем ограничение скорости запросов
          const rateLimit = Math.floor(1000 / prov.rps);
          rate[prov.name] = { nextAt: Date.now() + rateLimit };
          saveRate(rate);
          
          // Сбрасываем счетчик ошибок для этого ключа
          if (errors[prov.name]?.[key]) {
            errors[prov.name][key].count = 0;
            saveErrors(errors);
          }
          
          // Возвращаем результат
          return {
            html,
            fromCache: false,
            provider: prov.name,
            key
          };
        } catch (e) {
          lastErr = e;
          
          // Обновляем счетчик ошибок для этого ключа
          errors[prov.name] = errors[prov.name] || {};
          errors[prov.name][key] = errors[prov.name][key] || { count: 0, ts: now };
          errors[prov.name][key].count += 1;
          errors[prov.name][key].ts = now;
          saveErrors(errors);
          
          // Если это не последняя попытка, ждем перед повторной попыткой
          if (attempt < 2) {
            const backoff = Math.floor(1000 * (2 ** attempt) * (0.8 + Math.random() * 0.4));
            await sleep(backoff);
          } else {
            // Если все попытки не удались, переходим к следующему ключу
            break;
          }
        }
      }
    }
  }
  
  // Если все провайдеры и ключи не удались, выбрасываем ошибку
  throw lastErr || new Error('ALL_PROVIDERS_FAILED');
}