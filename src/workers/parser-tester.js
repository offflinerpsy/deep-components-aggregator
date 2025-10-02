// src/workers/parser-tester.js - воркер для тестирования парсеров на 50 товарах
import fs from 'fs';
import path from 'path';

const TEST_RESULTS_FILE = 'data/parser-test-results.json';
const REPORTS_DIR = 'reports/parser-tests';

// Тестовые MPN для проверки парсеров
const TEST_MPNS = [
  'LM317T', 'LM358N', 'NE555P', 'TL431', '1N4148', '2N2222A', 'BC547B',
  'MAX232CPE', 'LM7805CT', 'LM7812CT', '78L05ACZ', 'AMS1117-3.3',
  'LM2596S-ADJ', 'XL4015E1', 'STM32F103C8T6', 'ATMEGA328P-PU',
  'ESP32-WROOM-32', 'ESP8266-12F', 'DS18B20', 'DHT22', 'HC-SR04',
  'SSD1306', 'LCD1602A', 'TL071CP', 'LM324N', 'CD4017BE',
  'CD4011BE', '74HC595N', '74HC74N', 'ULN2003AN', 'L293D',
  'IRF520N', 'IRF540N', '2N7000', 'BS170', 'TIP120', 'TIP122',
  'BD139', 'BD140', '1N5819', '1N5408', 'LED-5MM-RED', 'LED-5MM-BLUE',
  'CRYSTAL-16MHZ', 'CRYSTAL-32.768KHZ', 'CAP-100NF', 'CAP-1000UF',
  'RES-10K', 'RES-1K', 'SWITCH-TACTILE', 'CONNECTOR-USB'
];

function debugLog(msg, extra = {}) {
  console.log(`[PARSER-TESTER] ${msg}`, extra);
}

// Создание директории для отчетов
function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

// Тестирование одного парсера
async function testParser(parserName, searchFunction, mpns) {
  debugLog(`Testing ${parserName} parser...`);
  
  const results = {
    parser: parserName,
    totalTests: mpns.length,
    successful: 0,
    failed: 0,
    errors: [],
    items: [],
    startTime: new Date().toISOString(),
    endTime: null,
    duration: null
  };
  
  const startTime = Date.now();
  
  for (let i = 0; i < mpns.length; i++) {
    const mpn = mpns[i];
    debugLog(`Testing ${parserName} with MPN: ${mpn} (${i+1}/${mpns.length})`);
    
    try {
      const searchResults = await searchFunction(mpn);
      
      if (searchResults && searchResults.length > 0) {
        results.successful++;
        results.items.push({
          mpn: mpn,
          success: true,
          count: searchResults.length,
          firstItem: searchResults[0]
        });
        debugLog(`✅ ${parserName} found ${searchResults.length} results for ${mpn}`);
      } else {
        results.failed++;
        results.items.push({
          mpn: mpn,
          success: false,
          count: 0,
          error: 'No results'
        });
        debugLog(`❌ ${parserName} found no results for ${mpn}`);
      }
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        mpn: mpn,
        error: error.message
      });
      results.items.push({
        mpn: mpn,
        success: false,
        count: 0,
        error: error.message
      });
      debugLog(`💥 ${parserName} error for ${mpn}: ${error.message}`);
    }
    
    // Пауза между запросами
    if (i < mpns.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const endTime = Date.now();
  results.endTime = new Date().toISOString();
  results.duration = endTime - startTime;
  results.successRate = (results.successful / results.totalTests * 100).toFixed(1);
  
  debugLog(`${parserName} testing completed: ${results.successful}/${results.totalTests} (${results.successRate}%)`);
  
  return results;
}

// Основная функция тестирования всех парсеров
export async function testAllParsers(testMpns = TEST_MPNS.slice(0, 50)) {
  debugLog(`Starting parser testing with ${testMpns.length} MPNs...`);
  
  ensureReportsDir();
  
  const allResults = {
    testDate: new Date().toISOString(),
    totalMpns: testMpns.length,
    parsers: [],
    summary: {}
  };
  
  // Тест OEMsTrade
  try {
    const { searchOEMsTrade } = await import('../../adapters/oemstrade.js');
    const oemsResults = await testParser('oemstrade', searchOEMsTrade, testMpns);
    allResults.parsers.push(oemsResults);
  } catch (error) {
    debugLog(`Failed to load OEMsTrade parser: ${error.message}`);
  }
  
  // Тест ChipDip
  try {
    const { searchChipDip } = await import('../adapters/chipdip.js');
    const chipdipResults = await testParser('chipdip', searchChipDip, testMpns);
    allResults.parsers.push(chipdipResults);
  } catch (error) {
    debugLog(`Failed to load ChipDip parser: ${error.message}`);
  }
  
  // Тест Elitan
  try {
    const { searchElitan } = await import('../adapters/elitan.js');
    const elitanResults = await testParser('elitan', searchElitan, testMpns);
    allResults.parsers.push(elitanResults);
  } catch (error) {
    debugLog(`Failed to load Elitan parser: ${error.message}`);
  }
  
  // Подсчет общей статистики
  allResults.summary = {
    totalParsers: allResults.parsers.length,
    averageSuccessRate: allResults.parsers.reduce((sum, p) => sum + parseFloat(p.successRate), 0) / allResults.parsers.length,
    bestParser: allResults.parsers.reduce((best, current) => 
      parseFloat(current.successRate) > parseFloat(best.successRate) ? current : best, 
      allResults.parsers[0] || { successRate: '0' }
    )?.parser,
    totalTests: allResults.parsers.reduce((sum, p) => sum + p.totalTests, 0),
    totalSuccessful: allResults.parsers.reduce((sum, p) => sum + p.successful, 0)
  };
  
  // Сохранение результатов
  const resultsFile = path.join(REPORTS_DIR, `test-results-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
  fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(allResults, null, 2));
  
  debugLog(`Test results saved to ${resultsFile}`);
  debugLog(`Summary: ${allResults.summary.totalSuccessful}/${allResults.summary.totalTests} successful, average rate: ${allResults.summary.averageSuccessRate.toFixed(1)}%`);
  
  return allResults;
}

// Запуск при вызове напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  const testCount = parseInt(process.argv[2]) || 50;
  const testMpns = TEST_MPNS.slice(0, testCount);
  
  testAllParsers(testMpns)
    .then(results => {
      console.log('Parser testing completed:', results.summary);
      process.exit(0);
    })
    .catch(error => {
      console.error('Parser testing failed:', error);
      process.exit(1);
    });
}
