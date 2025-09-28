import fs from 'node:fs';
import path from 'node:path';

const stPath = path.resolve('data/state/usage.json');
const rd = () => fs.existsSync(stPath) ? JSON.parse(fs.readFileSync(stPath,'utf8')) : {bee:[],api:[],bot:[]};
const wr = (obj) => (fs.mkdirSync(path.dirname(stPath),{recursive:true}), fs.writeFileSync(stPath, JSON.stringify(obj,null,2)));

/**
 * Загружает ключи для указанного провайдера
 * @param {string} name Имя провайдера (scraperapi, scrapingbee, scrapingbot)
 * @returns {string[]} Массив ключей
 */
export const load = (name) => {
  const p = path.resolve(`secrets/apis/${name}.txt`);
  if (fs.existsSync(p)) {
    return fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean);
  }
  
  // Заглушки для локальной разработки
  if (name === 'scraperapi') {
    return ['a91efbc32580c3e8ab8b06ce9b6dc509'];
  } else if (name === 'scrapingbee') {
    return ['ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ'];
  } else if (name === 'scrapingbot') {
    return ['YObdDv4IEG9tWWW5Fd614JLNZ'];
  }
  
  return [];
};

/**
 * Выбирает ключ для указанного провайдера
 * @param {string} kind Имя провайдера (scraperapi, scrapingbee, scrapingbot)
 * @returns {string|null} Выбранный ключ или null, если ключи отсутствуют
 */
export const pick = (kind) => {
  const keys = load(kind);
  if (!keys.length) return null;
  
  const usage = rd();
  if (!usage[kind]?.length) usage[kind] = keys.map(k => ({k, used:0}));
  
  // Синхронизация с актуальными ключами
  const set = new Map(usage[kind].map(x=>[x.k,x]));
  keys.forEach(k=> set.has(k) || usage[kind].push({k,used:0}));
  usage[kind] = usage[kind].filter(x=> keys.includes(x.k));

  usage[kind].sort((a,b)=> a.used - b.used);
  const chosen = usage[kind][0];
  chosen.used += 1;
  wr(usage);
  
  // Устанавливаем переменные окружения для совместимости
  if (kind === 'scraperapi') {
    process.env.SCRAPERAPI_KEY = chosen.k;
  } else if (kind === 'scrapingbee') {
    process.env.SCRAPINGBEE_KEY = chosen.k;
  } else if (kind === 'scrapingbot') {
    process.env.SCRAPINGBOT_KEY = chosen.k;
  }
  
  return chosen.k;
};