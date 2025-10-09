/**
 * RU→EN Search Normalization Pipeline
 *
 * Detects Cyrillic input and transliterates to English for FTS5 search.
 * No external dependencies — lightweight GOST-like transliteration.
 *
 * Flow:
 * 1. Detect Cyrillic characters
 * 2. Transliterate using GOST-7.79 System B mapping
 * 3. Apply electronics-specific synonyms (optional)
 * 4. Return normalized English query for FTS5
 */

/**
 * Detect if string contains Cyrillic characters
 * @param {string} str - Input string
 * @returns {boolean} - True if contains Cyrillic
 */
export function hasCyrillic(str) {
  return /[А-Яа-яЁё]/.test(str);
}

/**
 * Transliterate Cyrillic to Latin using GOST 7.79 System B
 * Optimized for electronics terms and component names
 *
 * @param {string} text - Cyrillic text
 * @returns {string} - Transliterated Latin text
 */
export function transliterateRuToEn(text) {
  if (!text) return '';

  // GOST 7.79 System B mapping + electronics-specific adjustments
  const map = {
    // Lowercase
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
    'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch',
    'ш': 'sh', 'щ': 'shh', 'ъ': '', 'ы': 'y', 'ь': '',
    'э': 'e', 'ю': 'yu', 'я': 'ya',

    // Uppercase
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
    'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
    'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
    'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
    'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Ch',
    'Ш': 'Sh', 'Щ': 'Shh', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
    'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };

  return text.split('').map(char => map[char] || char).join('');
}

/**
 * Electronics-specific synonym mapping
 * Maps common Russian electronics terms to English equivalents
 *
 * @param {string} query - Search query (may be mixed RU/EN)
 * @returns {Array<string>} - Array of normalized queries (original + synonyms)
 */
export function applySynonyms(query) {
  const lowercaseQuery = query.toLowerCase();

  // Electronics synonyms: Russian → English + transliterated → English
  const synonyms = {
    // Russian Cyrillic → English
    'транзистор': ['transistor'],
    'резистор': ['resistor'],
    'конденсатор': ['capacitor'],
    'диод': ['diode'],
    'микросхема': ['chip', 'ic', 'integrated circuit'],
    'светодиод': ['led', 'light emitting diode'],
    'стабилизатор': ['regulator', 'stabilizer'],
    'трансформатор': ['transformer'],
    'реле': ['relay'],
    'переключатель': ['switch'],
    'разъем': ['connector'],
    'датчик': ['sensor'],
    'процессор': ['processor', 'cpu'],
    'микроконтроллер': ['microcontroller', 'mcu'],
    'модуль': ['module'],
    'плата': ['board', 'pcb'],

    // Transliterated (GOST 7.79) → English
    'tranzistor': ['transistor'],
    'rezistor': ['resistor'],
    'kondensator': ['capacitor'],
    'diod': ['diode'],
    'mikrosxema': ['chip', 'ic'],
    'svetodiod': ['led'],
    'stabilizator': ['regulator', 'stabilizer'],
    'transformator': ['transformer'],
    'rele': ['relay'],
    'pereklyuchatel': ['switch'],
    'razem': ['connector'],
    'datchik': ['sensor'],
    'processor': ['processor', 'cpu'],
    'mikrokontroller': ['microcontroller', 'mcu'],
    'modul': ['module'],
    'plata': ['board', 'pcb']
  };

  // Check if query matches a known synonym
  for (const [ruOrTranslit, enVariants] of Object.entries(synonyms)) {
    if (lowercaseQuery.includes(ruOrTranslit)) {
      // Return original + all English variants
      return [query, ...enVariants];
    }
  }

  // No synonym match — return original query
  return [query];
}

/**
 * Normalize search query for FTS5
 * Main entry point for RU→EN pipeline
 *
 * @param {string} query - User's search query
 * @returns {Object} - Normalized query object
 *   {
 *     original: string,          // Original input
 *     hasCyrillic: boolean,      // True if contains Cyrillic
 *     transliterated: string,    // Transliterated version (if Cyrillic)
 *     normalized: string,        // Best query for FTS5 (uses synonym if available)
 *     allQueries: Array<string>, // All query variants to try (normalized + synonyms)
 *     tokens: Array<string>      // Individual search tokens
 *   }
 */
export function normalizeQuery(query) {
  if (!query || !query.trim()) {
    return {
      original: query,
      hasCyrillic: false,
      transliterated: '',
      normalized: '',
      allQueries: [],
      tokens: []
    };
  }

  const trimmed = query.trim();
  const isCyrillic = hasCyrillic(trimmed);

  // Step 1: Transliterate if Cyrillic
  const transliterated = isCyrillic ? transliterateRuToEn(trimmed) : trimmed;

  // Step 2: Apply synonyms to transliterated query
  const synonymQueries = applySynonyms(transliterated);

  // Step 3: Choose best normalized query
  // Priority: synonym > transliterated > original
  const normalized = synonymQueries.length > 1
    ? synonymQueries[1]  // First synonym is best match
    : transliterated;

  // Step 4: Tokenize (simple space-based splitting)
  const tokens = normalized.toLowerCase().split(/\s+/).filter(Boolean);

  return {
    original: trimmed,
    hasCyrillic: isCyrillic,
    transliterated: isCyrillic ? transliterated : '',
    normalized,
    allQueries: synonymQueries,
    tokens
  };
}
