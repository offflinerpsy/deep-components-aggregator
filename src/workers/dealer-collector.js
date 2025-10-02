// src/workers/dealer-collector.js - воркер для сбора всех дилеров из OEMsTrade
import fs from 'fs';
import path from 'path';

const DEALERS_FILE = 'data/dealers.json';
const BATCH_SIZE = 50;
const DELAY_MS = 2000; // 2 секунды между батчами

function debugLog(msg, extra = {}) {
  console.log(`[DEALER-COLLECTOR] ${msg}`, extra);
}

// Загрузка существующих дилеров
function loadExistingDealers() {
  if (!fs.existsSync(DEALERS_FILE)) {
    return { dealers: [], lastUpdate: null };
  }
  
  try {
    const data = fs.readFileSync(DEALERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    debugLog(`Error loading dealers: ${error.message}`);
    return { dealers: [], lastUpdate: null };
  }
}

// Сохранение дилеров
function saveDealers(dealers) {
  const dir = path.dirname(DEALERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const data = {
    dealers: dealers,
    lastUpdate: new Date().toISOString(),
    count: dealers.length
  };
  
  fs.writeFileSync(DEALERS_FILE, JSON.stringify(data, null, 2));
  debugLog(`Saved ${dealers.length} dealers to ${DEALERS_FILE}`);
}

// Сбор дилеров с одной страницы поиска
async function collectDealersFromSearch(query) {
  try {
    const { searchOEMsTrade } = await import('../../adapters/oemstrade.js');
    const results = await searchOEMsTrade(query, 100);
    
    const dealers = new Set();
    
    for (const item of results) {
      if (item.offers && Array.isArray(item.offers)) {
        for (const offer of item.offers) {
          if (offer.dealerName && offer.dealerName.trim()) {
            dealers.add(offer.dealerName.trim());
          }
        }
      }
    }
    
    debugLog(`Collected ${dealers.size} unique dealers from query: ${query}`);
    return Array.from(dealers);
    
  } catch (error) {
    debugLog(`Error collecting dealers for query ${query}: ${error.message}`);
    return [];
  }
}

// Список поисковых запросов для сбора дилеров
const SEARCH_QUERIES = [
  'LM317', 'TL431', '1N4148', '2N2222', 'BC547', 'NE555', 'LM358', 'TL071',
  'MAX232', 'LM7805', 'LM7812', '78L05', 'AMS1117', 'LM2596', 'XL4015',
  'STM32F103', 'ATMEGA328P', 'ESP32', 'ESP8266', 'ARDUINO', 'RASPBERRY',
  'DS18B20', 'DHT22', 'HC-SR04', 'OLED', 'LCD1602', 'SSD1306',
  'CAPACITOR', 'RESISTOR', 'TRANSISTOR', 'DIODE', 'LED', 'SWITCH',
  'CONNECTOR', 'CRYSTAL', 'INDUCTOR', 'RELAY', 'SENSOR', 'MODULE'
];

// Основная функция сбора дилеров
export async function collectAllDealers() {
  debugLog('Starting dealer collection...');
  
  const existing = loadExistingDealers();
  const allDealers = new Set(existing.dealers);
  
  debugLog(`Loaded ${allDealers.size} existing dealers`);
  
  let processedQueries = 0;
  
  for (let i = 0; i < SEARCH_QUERIES.length; i += BATCH_SIZE) {
    const batch = SEARCH_QUERIES.slice(i, i + BATCH_SIZE);
    
    debugLog(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(SEARCH_QUERIES.length/BATCH_SIZE)}`);
    
    const batchPromises = batch.map(query => collectDealersFromSearch(query));
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        for (const dealer of result.value) {
          allDealers.add(dealer);
        }
        processedQueries++;
      }
    }
    
    // Сохраняем прогресс после каждого батча
    saveDealers(Array.from(allDealers));
    
    debugLog(`Batch completed. Total dealers: ${allDealers.size}, Processed queries: ${processedQueries}`);
    
    // Пауза между батчами
    if (i + BATCH_SIZE < SEARCH_QUERIES.length) {
      debugLog(`Waiting ${DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  const finalDealers = Array.from(allDealers);
  saveDealers(finalDealers);
  
  debugLog(`Collection completed! Total dealers: ${finalDealers.length}`);
  
  return {
    dealers: finalDealers,
    count: finalDealers.length,
    processedQueries: processedQueries
  };
}

// Запуск при вызове напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  collectAllDealers()
    .then(result => {
      console.log('Dealer collection completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Dealer collection failed:', error);
      process.exit(1);
    });
}
