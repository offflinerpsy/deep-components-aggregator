#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');

// Функция для нормализации данных в формат Orama
function normalizeToOramaFormat(data) {
  return {
    id: data.mpn || data.id || `component_${Date.now()}_${Math.random()}`,
    url: data.url || `#${data.mpn}`,
    title: data.title || data.mpn || 'Без названия',
    brand: data.manufacturer || data.brand || '',
    sku: data.sku || data.mpn || '',
    mpn: data.mpn || '',
    text: [
      data.title,
      data.description,
      data.manufacturer,
      data.package,
      data.packaging,
      Object.values(data.technical_specs || {}).join(' ')
    ].filter(Boolean).join(' ')
  };
}

// Читаем все seed файлы
const corpus = [];
const seedFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('seed-') && f.endsWith('.json'));

console.log(`🔍 Found ${seedFiles.length} seed files:`);

for (const seedFile of seedFiles) {
  const filePath = path.join(dataDir, seedFile);
  console.log(`  📄 Processing ${seedFile}...`);
  
  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);
  
  // Обрабатываем как массив или единичный объект
  const items = Array.isArray(data) ? data : [data];
  
  for (const item of items) {
    const normalized = normalizeToOramaFormat(item);
    corpus.push(normalized);
    console.log(`    ✅ Added: ${normalized.mpn} - ${normalized.title}`);
  }
}

// Добавляем дополнительные популярные компоненты для демонстрации
const additionalComponents = [
  {
    mpn: "1N4148",
    title: "Диод быстродействующий 75V 150mA",
    manufacturer: "Various",
    description: "Стандартный кремниевый диод общего назначения",
    package: "DO-35",
    technical_specs: {
      "Максимальное напряжение, В": "75",
      "Прямой ток, мА": "150",
      "Корпус": "DO-35"
    }
  },
  {
    mpn: "BC547",
    title: "Транзистор NPN 45V 100mA",
    manufacturer: "Various", 
    description: "Биполярный транзистор общего назначения",
    package: "TO-92",
    technical_specs: {
      "Тип": "NPN",
      "Максимальное напряжение, В": "45",
      "Коллекторный ток, мА": "100"
    }
  },
  {
    mpn: "2N7002",
    title: "MOSFET N-канальный 60V 300mA",
    manufacturer: "Various",
    description: "Малосигнальный MOSFET транзистор",
    package: "SOT-23",
    technical_specs: {
      "Тип": "N-Channel MOSFET",
      "Максимальное напряжение, В": "60", 
      "Ток стока, мА": "300"
    }
  },
  {
    mpn: "NE555",
    title: "Таймер универсальный",
    manufacturer: "Various",
    description: "Классическая микросхема таймера",
    package: "DIP-8",
    technical_specs: {
      "Напряжение питания, В": "4.5-16",
      "Корпус": "DIP-8"
    }
  },
  {
    mpn: "ATmega328P",
    title: "Микроконтроллер 8-бит AVR",
    manufacturer: "Microchip",
    description: "8-битный микроконтроллер семейства AVR",
    package: "DIP-28",
    technical_specs: {
      "Разрядность": "8-bit",
      "Флеш память, КБ": "32",
      "SRAM, КБ": "2"
    }
  }
];

for (const comp of additionalComponents) {
  const normalized = normalizeToOramaFormat(comp);
  corpus.push(normalized);
  console.log(`    ✅ Added popular: ${normalized.mpn} - ${normalized.title}`);
}

// Сохраняем корпус
const corpusPath = path.join(dataDir, 'corpus.json');
fs.writeFileSync(corpusPath, JSON.stringify(corpus, null, 2));

console.log(`\n🎉 Corpus built successfully!`);
console.log(`📊 Total components: ${corpus.length}`);
console.log(`💾 Saved to: ${corpusPath}`);
console.log(`📦 File size: ${(fs.statSync(corpusPath).size / 1024).toFixed(1)} KB`);
