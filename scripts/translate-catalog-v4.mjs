#!/usr/bin/env node
/**
 * Catalog Translation Script v4
 * Loads all translations from JSON, includes exact matches + term dictionary
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../var/db/deepagg.sqlite');
const TRANSLATIONS_PATH = join(__dirname, 'catalog-translations.json');

// Load translations from JSON
const jsonData = JSON.parse(readFileSync(TRANSLATIONS_PATH, 'utf8'));
const exactTranslations = jsonData.exact;

// Comprehensive term dictionary (combines JSON exact + inline terms)
const termDict = { ...exactTranslations };

// Add additional term mappings
Object.assign(termDict, {
  // Phrases (longer first)
  'Heavy Duty': 'Усиленный',
  'Clean Room': 'Чистая комната',
  'Special Purpose': 'Специального назначения',
  'Board to Board': 'Плата-плата',
  'Wire to Board': 'Провод-плата',
  'Power over Ethernet': 'Питание через Ethernet',
  'Surface Mount': 'Поверхностный монтаж',
  'Through Hole': 'Выводной монтаж',
  'Op Amps': 'Операционные усилители',
  'Fiber Optic': 'Оптоволоконный',
  'Non-Rechargeable': 'Неперезаряжаемые',
  'Floor Markings': 'Напольная разметка',
  
  // Missing words
  'Perforated': 'Перфорированные',
  'Prototype': 'Макетные',
  'Structural': 'Конструкционные',
  'Chairs': 'Стулья',
  'Chair': 'Стул',
  'Stools': 'Табуреты',
  'Stool': 'Табурет',
  'Theta': 'Тета',
  'Foil': 'Фольговый',
  'Photoelectric': 'Фотоэлектрический',
  'Pull': 'Тяговый',
  'Ferrites': 'Ферриты',
  'Complex': 'Сложные',
  'Coil': 'Катушка',
  
  // Common conjunctions
  'and': 'и',
  'or': 'или',
  'with': 'с',
  'for': 'для'
});

// Open database
const db = new Database(DB_PATH);

// Ensure name_ru column exists
try {
  db.exec('ALTER TABLE catalog_categories ADD COLUMN name_ru TEXT');
  console.log('✓ Added name_ru column');
} catch (e) {
  // Column already exists
}

// Get all categories
const categories = db.prepare('SELECT id, name FROM catalog_categories').all();
console.log(`Found ${categories.length} categories to translate\n`);

// Build sorted term list (longest first for proper replacement)
const sortedTerms = Object.keys(termDict)
  .filter(k => k.length > 1)
  .sort((a, b) => b.length - a.length);

// Translation function
function translate(name) {
  // 1. Check exact match first
  if (exactTranslations[name]) {
    return exactTranslations[name];
  }
  
  // 2. Apply term-by-term translation
  let translated = name;
  
  for (const term of sortedTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const replacement = termDict[term];
    if (replacement) {
      translated = translated.replace(regex, replacement);
    }
  }
  
  // 3. Clean up artifacts
  translated = translated
    .replace(/\s+/g, ' ')         // Multiple spaces
    .replace(/\(\s*\)/g, '')      // Empty parentheses
    .replace(/\s*-\s*-\s*/g, ' — ')  // Double dashes
    .replace(/\s*,\s*,\s*/g, ', ') // Double commas
    .replace(/^\s*[,-]\s*/g, '')   // Leading punctuation
    .replace(/\s*[,-]\s*$/g, '')   // Trailing punctuation
    .trim();
  
  return translated;
}

// Update translations
const updateStmt = db.prepare('UPDATE catalog_categories SET name_ru = ? WHERE id = ?');
let exactMatches = 0;
let termTranslated = 0;
let unchanged = 0;

for (const cat of categories) {
  const translated = translate(cat.name);
  
  if (exactTranslations[cat.name]) {
    exactMatches++;
  } else if (translated !== cat.name) {
    termTranslated++;
  } else {
    unchanged++;
  }
  
  updateStmt.run(translated, cat.id);
}

db.close();

console.log('=== Translation Results ===');
console.log(`Exact matches (JSON): ${exactMatches}`);
console.log(`Term translations:    ${termTranslated}`);
console.log(`Unchanged:            ${unchanged}`);
console.log(`Total:                ${categories.length}`);

// Analysis
const db2 = new Database(DB_PATH);

// Count categories with remaining English
const withEnglish = db2.prepare(`
  SELECT COUNT(*) as cnt FROM catalog_categories 
  WHERE name_ru GLOB '*[a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z]*'
`).get();

console.log(`\nCategories still with English (4+ letters): ${withEnglish.cnt}`);

// Show samples
console.log('\n=== Random translated samples: ===');
const samples = db2.prepare(`
  SELECT name, name_ru FROM catalog_categories 
  WHERE name != name_ru AND name_ru NOT GLOB '*[a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z]*'
  ORDER BY RANDOM() 
  LIMIT 15
`).all();

samples.forEach((s, i) => {
  console.log(`${i + 1}. "${s.name}" → "${s.name_ru}"`);
});

// Show remaining English words
console.log('\n=== Top remaining English words: ===');
const remaining = db2.prepare(`
  SELECT name_ru FROM catalog_categories 
  WHERE name_ru GLOB '*[a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z]*'
`).all();

const wordCounts = {};
for (const r of remaining) {
  const words = r.name_ru.match(/\b[A-Za-z]{4,}\b/g) || [];
  for (const w of words) {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  }
}

const topWords = Object.entries(wordCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);

topWords.forEach(([word, count]) => {
  console.log(`  ${word}: ${count}`);
});

db2.close();
