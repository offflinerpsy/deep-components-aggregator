/**
 * Russian Search Normalization (Simplified Version)
 * 
 * Provides deterministic normalization of Russian/Cyrillic queries:
 * 1. Cyrillic transliteration (fallback approach)
 * 2. Basic Russian morphological analysis  
 * 3. MPN extraction from mixed queries
 * 
 * Follows workspace instructions: no try/catch, pure guard clauses
 */

// Basic Cyrillic to Latin mapping (simplified ICU-style)
const CYRILLIC_TO_LATIN = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

// Russian stop words (electronics context)
const RUSSIAN_STOP_WORDS = new Set([
  'и', 'в', 'на', 'с', 'по', 'для', 'от', 'до', 'из', 'к', 'о', 'у', 'за', 'под', 'над',
  'при', 'через', 'без', 'про', 'между', 'среди', 'перед', 'после', 'около', 'возле',
  'что', 'как', 'где', 'когда', 'почему', 'зачем', 'куда', 'откуда', 'который', 'какой',
  'чей', 'сколько', 'это', 'тот', 'такой', 'весь', 'каждый', 'любой', 'другой', 'один',
  'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять'
]);

// Electronics-specific Russian stems
const ELECTRONICS_STEMS = {
  'транзистор': 'transistor',
  'транзисторы': 'transistor',
  'транзистора': 'transistor',
  'конденсатор': 'capacitor', 
  'конденсаторы': 'capacitor',
  'конденсатора': 'capacitor',
  'резистор': 'resistor',
  'резисторы': 'resistor',
  'резистора': 'resistor',
  'диод': 'diode',
  'диоды': 'diode',
  'диода': 'diode',
  'микросхема': 'chip',
  'микросхемы': 'chip',
  'микроконтроллер': 'microcontroller',
  'процессор': 'processor',
  'память': 'memory',
  'схема': 'circuit',
  'плата': 'board',
  'модуль': 'module',
  'датчик': 'sensor',
  'реле': 'relay',
  'переключатель': 'switch',
  'кнопка': 'button',
  'разъем': 'connector',
  'кабель': 'cable',
  'провод': 'wire'
};

// MPN detection patterns
const MPN_PATTERNS = [
  /\b[A-Z0-9]{3,}[-_]?[A-Z0-9]*\b/g,  // Standard MPNs: ABC123, STM32F4
  /\b\d+[A-Z]+\d*\b/g,                  // Numeric-alpha: 2N3904, NE555
  /\b[A-Z]+\d+[A-Z]*\b/g               // Alpha-numeric: LM358, MAX232
];

/**
 * Validates input query
 * @param {string} query - Raw search query
 * @returns {Object} Validation result
 */
function validateQuery(query) {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a non-empty string' };
  }
  
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Query cannot be empty or whitespace only' };
  }
  
  if (trimmed.length > 500) {
    return { valid: false, error: 'Query too long (max 500 characters)' };
  }
  
  return { valid: true, query: trimmed };
}

/**
 * Detects if string contains Cyrillic characters
 * @param {string} text - Text to check
 * @returns {boolean} True if contains Cyrillic
 */
function hasCyrillic(text) {
  return /[\u0400-\u04FF]/.test(text);
}

/**
 * Extracts potential MPNs from query
 * @param {string} query - Normalized query
 * @returns {Array<string>} Extracted MPNs
 */
function extractMPNs(query) {
  const mpns = new Set();
  
  // Apply all MPN patterns
  for (const pattern of MPN_PATTERNS) {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => mpns.add(match.toUpperCase()));
    }
  }
  
  return Array.from(mpns);
}

/**
 * Transliterates Cyrillic to Latin (simplified approach)
 * @param {string} text - Text with Cyrillic characters
 * @returns {string} Transliterated text
 */
function transliterateCyrillic(text) {
  if (!hasCyrillic(text)) {
    return text;
  }
  
  let result = '';
  for (const char of text.toLowerCase()) {
    const latin = CYRILLIC_TO_LATIN[char];
    if (latin !== undefined) {
      result += latin;
    } else {
      result += char;
    }
  }
  
  return result;
}

/**
 * Tokenizes Russian text with stop word removal
 * @param {string} text - Text to tokenize
 * @returns {Array<string>} Filtered tokens
 */
function tokenizeRussian(text) {
  // Simple tokenization by spaces and punctuation
  const tokens = text.toLowerCase()
    .split(/[\s\-_.,;:!?()[\]{}]+/)
    .filter(token => token.length > 0);
  
  return tokens.filter(token => {
    // Remove stop words
    if (RUSSIAN_STOP_WORDS.has(token)) {
      return false;
    }
    
    // Keep tokens with letters/numbers only
    if (!/^[а-яёa-z\d]+$/i.test(token)) {
      return false;
    }
    
    // Minimum length
    return token.length >= 2;
  });
}

/**
 * Applies Russian morphological analysis
 * @param {Array<string>} tokens - Input tokens
 * @returns {Array<string>} Normalized tokens
 */
function applyRussianMorphology(tokens) {
  return tokens.map(token => {
    // Check electronics dictionary first
    const electronics = ELECTRONICS_STEMS[token];
    if (electronics) {
      return electronics;
    }
    
    // Apply basic Russian suffixes removal
    if (/[а-яё]/i.test(token)) {
      return token
        .replace(/ов?и?ч?$/i, '')  // Remove common endings
        .replace(/ен?и?я?$/i, '')
        .replace(/ост?и?$/i, '')
        .replace(/ант?ы?$/i, '')
        .replace(/ны?е?$/i, '');
    }
    
    // Return as-is for non-Russian tokens
    return token;
  });
}

/**
 * Main normalization function
 * Processes Russian/mixed queries into searchable format
 * 
 * @param {string} rawQuery - Original user query
 * @returns {Object} Normalized search data
 */
export function normalizeRussianQuery(rawQuery) {
  // Validation
  const validation = validateQuery(rawQuery);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      original: rawQuery || '',
      normalized: '',
      mpns: [],
      tokens: [],
      hasCyrillic: false
    };
  }
  
  const query = validation.query;
  const cyrillic = hasCyrillic(query);
  
  // Extract MPNs from original query first
  const originalMPNs = extractMPNs(query);
  
  // Transliterate if needed
  const transliterated = cyrillic ? transliterateCyrillic(query) : query;
  
  // Extract MPNs from transliterated text too
  const transliteratedMPNs = extractMPNs(transliterated);
  
  // Combine and deduplicate MPNs
  const allMPNs = [...new Set([...originalMPNs, ...transliteratedMPNs])];
  
  // Tokenize for morphological analysis
  const tokens = tokenizeRussian(query);
  const normalizedTokens = applyRussianMorphology(tokens);
  
  // Create normalized query
  const normalized = transliterated.toLowerCase().trim();
  
  return {
    success: true,
    original: query,
    normalized,
    transliterated: cyrillic ? transliterated : null,
    mpns: allMPNs,
    tokens: normalizedTokens,
    hasCyrillic: cyrillic,
    metadata: {
      originalLength: query.length,
      tokenCount: tokens.length,
      mpnCount: allMPNs.length,
      processingSteps: [
        cyrillic ? 'transliteration' : null,
        'tokenization',
        'morphology',
        'mpn_extraction'
      ].filter(Boolean)
    }
  };
}

/**
 * Test cases for smoke testing
 * @returns {Array<Object>} Test case results
 */
export function getTestCases() {
  const testQueries = [
    'транзистор 2N3904',
    'конденсатор 1000мкф 25в', 
    'диод шоттки 3А',
    'NE555',
    'транзисторы',
    'resistor 10k 1%'
  ];
  
  return testQueries.map(query => {
    const result = normalizeRussianQuery(query);
    return {
      query,
      success: result.success,
      normalized: result.normalized,
      mpns: result.mpns,
      tokens: result.tokens,
      hasCyrillic: result.hasCyrillic
    };
  });
}

export default {
  normalizeRussianQuery,
  getTestCases,
  extractMPNs,
  transliterateCyrillic,
  tokenizeRussian
};