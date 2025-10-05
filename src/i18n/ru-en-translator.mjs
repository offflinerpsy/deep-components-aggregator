/**
 * RU→EN Query Translator
 * Translates Russian electronics queries to English with MPN preservation
 * 
 * Pipeline:
 * 1. Language detection (Cyrillic check)
 * 2. MPN extraction (preserve manufacturer codes)
 * 3. Units normalization (мкФ→uF, кОм→kΩ)
 * 4. Term translation (Local Glossary → Azure → DeepL → Cache)
 * 5. Assembly (combine translated terms + MPNs)
 * 
 * @module i18n/ru-en-translator
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load glossary and units normalization
const GLOSSARY = loadGlossary();
const UNITS_MAP = loadUnitsNormalization();

// MPN pattern: alphanumeric sequences with at least ONE letter (e.g., ATmega328P, 2N3904, DS12C887+)
// CRITICAL: Must contain at least one letter to avoid matching pure numbers (1000, 25)
const MPN_PATTERN = /\b(?=\w*[A-Za-z])[A-Z0-9][A-Z0-9\-+]{2,}[A-Z0-9]\b/gi;

// Cyrillic detection
const CYRILLIC_PATTERN = /[а-яА-ЯёЁ]/;

/**
 * Load glossary.csv into memory
 * @returns {Map<string, string>} RU→EN term mappings
 */
function loadGlossary() {
  try {
    const csvPath = join(__dirname, '../../glossary.csv');
    const content = readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').slice(1); // Skip header
    
    const map = new Map();
    lines.forEach(line => {
      const [ru, en] = line.split(',').map(s => s.trim());
      if (ru && en) {
        // Store lowercase for case-insensitive matching
        map.set(ru.toLowerCase(), en);
        
        // If EN has aliases (semicolon-separated), use first one
        const primaryEn = en.split(';')[0].trim();
        map.set(ru.toLowerCase(), primaryEn);
      }
    });
    
    console.log(`📖 Loaded ${map.size} terms from glossary.csv`);
    return map;
  } catch (err) {
    console.warn('⚠️ Failed to load glossary.csv:', err.message);
    return new Map();
  }
}

/**
 * Load units-normalization.csv
 * @returns {Map<string, string>} RU→EN unit mappings
 */
function loadUnitsNormalization() {
  try {
    const csvPath = join(__dirname, '../../units-normalization.csv');
    const content = readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').slice(1); // Skip header
    
    const map = new Map();
    lines.forEach(line => {
      const [ru, normalized] = line.split(',').map(s => s.trim());
      if (ru && normalized) {
        map.set(ru, normalized);
      }
    });
    
    console.log(`📐 Loaded ${map.size} unit conversions from units-normalization.csv`);
    return map;
  } catch (err) {
    console.warn('⚠️ Failed to load units-normalization.csv:', err.message);
    return new Map();
  }
}

/**
 * STAGE 1: Detect if query contains Cyrillic
 * @param {string} query - User query
 * @returns {boolean} True if Russian text detected
 */
export function containsRussian(query) {
  return CYRILLIC_PATTERN.test(query);
}

/**
 * STAGE 2: Extract MPN from query
 * Removes MPN tokens from query, returns separately
 * 
 * @param {string} query - User query
 * @returns {{ mpns: string[], textWithoutMpns: string }}
 */
export function extractMPNs(query) {
  const mpns = [];
  const matches = query.match(MPN_PATTERN);
  
  if (matches) {
    mpns.push(...matches);
  }
  
  // Remove MPNs from query text
  const textWithoutMpns = query.replace(MPN_PATTERN, '').trim();
  
  return { mpns, textWithoutMpns };
}

/**
 * STAGE 3: Normalize Russian units to SI/EN
 * мкФ→uF, кОм→kΩ, В→V, мА→mA, etc.
 * Also handles numbers with units (1000мкФ→1000uF, 10к→10k)
 * 
 * @param {string} text - Query text
 * @returns {string} Text with normalized units
 */
export function normalizeUnits(text) {
  let normalized = text;
  
  // First pass: handle units with numbers (e.g., 1000мкФ, 10к, 47мкГн)
  // Using Unicode character codes for reliable matching
  // CRITICAL: Use (?=\s|$) instead of \b for Cyrillic→Latin word boundaries
  normalized = normalized
    .replace(/(\d+(?:\.\d+)?)мкФ/gu, '$1uF')
    .replace(/(\d+(?:\.\d+)?)нФ/gu, '$1nF')
    .replace(/(\d+(?:\.\d+)?)пФ/gu, '$1pF')
    .replace(/(\d+(?:\.\d+)?)мкГн/gu, '$1uH')
    .replace(/(\d+(?:\.\d+)?)мГн/gu, '$1mH')
    .replace(/(\d+(?:\.\d+)?)кОм/gu, '$1kΩ')
    .replace(/(\d+(?:\.\d+)?)МОм/gu, '$1MΩ')
    .replace(/(\d+(?:\.\d+)?)Ом/gu, '$1Ω')
    .replace(/(\d+(?:\.\d+)?)кГц/gu, '$1kHz')
    .replace(/(\d+(?:\.\d+)?)МГц/gu, '$1MHz')
    .replace(/(\d+(?:\.\d+)?)ГГц/gu, '$1GHz')
    .replace(/(\d+(?:\.\d+)?)Гц/gu, '$1Hz')
    .replace(/(\d+(?:\.\d+)?)мВт/gu, '$1mW')
    .replace(/(\d+(?:\.\d+)?)Вт/gu, '$1W')
    .replace(/(\d+(?:\.\d+)?)мкА/gu, '$1uA')
    .replace(/(\d+(?:\.\d+)?)мА/gu, '$1mA')
    .replace(/(\d+(?:\.\d+)?)кВ/gu, '$1kV')
    .replace(/(\d+(?:\.\d+)?)мВ/gu, '$1mV')
    .replace(/(\d+(?:\.\d+)?)°С/gu, '$1°C')
    .replace(/(\d+(?:\.\d+)?)мм/gu, '$1mm')
    .replace(/(\d+(?:x\d+)?)мм/gu, '$1mm')  // For 6x6мм
    // Shorthand units (к = k, М = M) - must come after specific units
    // FIX: Changed \b to (?=\s|$) for Cyrillic→Latin boundary
    .replace(/(\d+(?:\.\d+)?)к(?=\s|$)/gu, '$1k')
    .replace(/(\d+(?:\.\d+)?)М(?=\s|$)/gu, '$1M')
    .replace(/(\d+(?:\.\d+)?)В(?=\s|$)/gu, '$1V')
    .replace(/(\d+(?:\.\d+)?)А(?=\s|$)/gu, '$1A');
  
  // Second pass: standalone units from CSV (for completeness)
  UNITS_MAP.forEach((enUnit, ruUnit) => {
    const regex = new RegExp(`\\b${ruUnit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, enUnit);
  });
  
  return normalized;
}

/**
 * STAGE 4: Translate using local glossary
 * Prioritizes multi-word phrases, then word-by-word replacement
 * 
 * @param {string} text - Russian text
 * @returns {{ translated: string, coverage: number, missingWords: string[] }}
 */
export function translateWithGlossary(text) {
  let translated = text;
  const allWords = text.split(/\s+/).filter(Boolean);
  let matchedCount = 0;
  const missingWords = [];
  
  // First pass: translate multi-word phrases (2-3 words)
  // Sort by length descending to match longest phrases first
  const phrases = Array.from(GLOSSARY.keys()).filter(k => k.includes(' ')).sort((a, b) => b.length - a.length);
  
  phrases.forEach(phrase => {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    if (regex.test(translated)) {
      translated = translated.replace(regex, GLOSSARY.get(phrase));
      matchedCount += phrase.split(' ').length;
    }
  });
  
  // Second pass: word-by-word for remaining Russian words
  const words = translated.split(/\s+/);
  const translatedWords = [];
  
  words.forEach(word => {
    // Clean word (remove punctuation for matching)
    const cleanWord = word.toLowerCase().replace(/[^\wа-яёА-ЯЁ]/g, '');
    
    // Skip if already translated (no Cyrillic)
    if (!CYRILLIC_PATTERN.test(cleanWord)) {
      translatedWords.push(word);
      return;
    }
    
    if (GLOSSARY.has(cleanWord)) {
      translatedWords.push(GLOSSARY.get(cleanWord));
      matchedCount++;
    } else if (cleanWord) {
      // Keep original if not in glossary
      translatedWords.push(word);
      missingWords.push(cleanWord);
    }
  });
  
  const finalTranslated = translatedWords.join(' ');
  const coverage = allWords.length > 0 ? (matchedCount / allWords.length) * 100 : 0;
  
  return {
    translated: finalTranslated,
    coverage: Math.round(coverage),
    missingWords
  };
}

/**
 * STAGE 5: Assemble final query
 * Combines translated terms + MPNs + normalized units
 * 
 * @param {string} translatedText - Translated query text
 * @param {string[]} mpns - Extracted MPNs
 * @returns {string} Final English query
 */
export function assembleQuery(translatedText, mpns) {
  const parts = [translatedText, ...mpns].filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Main translation pipeline
 * @param {string} query - User query (Russian or mixed)
 * @returns {Object} Translation result (synchronous, local glossary only)
 */
export function translateRuToEn(query) {
  const startTime = Date.now();
  
  // Stage 1: Language detection
  if (!containsRussian(query)) {
    return {
      original: query,
      translated: query,
      skipped: true,
      reason: 'no_russian_detected',
      latency: Date.now() - startTime
    };
  }
  
  // Stage 2: MPN extraction (BEFORE units normalization)
  const { mpns, textWithoutMpns } = extractMPNs(query);
  
  // Stage 3: Units normalization (operates on text WITHOUT MPNs)
  const normalizedText = normalizeUnits(textWithoutMpns);
  
  // Stage 4: Glossary translation
  const { translated, coverage, missingWords } = translateWithGlossary(normalizedText);
  
  // Stage 5: Assembly (MPNs added back at the END)
  const finalQuery = assembleQuery(translated, mpns);
  
  const result = {
    original: query,
    translated: finalQuery,
    skipped: false,
    stages: {
      mpnsExtracted: mpns,
      textWithoutMpns,
      normalizedText,
      unitsNormalized: normalizedText !== textWithoutMpns,
      glossaryCoverage: coverage,
      missingWords
    },
    provider: 'local_glossary',
    latency: Date.now() - startTime
  };
  
  // Warning if low coverage (might need Azure/DeepL)
  if (coverage < 80 && missingWords.length > 0) {
    result.warning = `Low glossary coverage (${coverage}%). Missing: ${missingWords.join(', ')}`;
  }
  
  return result;
}

/**
 * Batch translation (for testing)
 * @param {string[]} queries - Array of queries
 * @returns {Promise<Object[]>} Array of translation results
 */
export async function translateBatch(queries) {
  const results = [];
  
  for (const query of queries) {
    const result = await translateRuToEn(query);
    results.push(result);
  }
  
  return results;
}

/**
 * Get translation statistics
 * @returns {Object} Glossary and units stats
 */
export function getStats() {
  return {
    glossaryTerms: GLOSSARY.size,
    unitConversions: UNITS_MAP.size,
    glossarySample: Array.from(GLOSSARY.entries()).slice(0, 10).map(([ru, en]) => ({ ru, en }))
  };
}

// Export for testing
export { GLOSSARY, UNITS_MAP, MPN_PATTERN };
