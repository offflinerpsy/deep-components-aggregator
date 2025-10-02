// search-tokenizer.js - умный поиск с поддержкой RU/EN токенизации

// Словарь транслитерации RU -> EN
const RU_TO_EN = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

// Словарь синонимов RU <-> EN (расширенный)
const SYNONYMS = {
  // Резисторы
  'резистор': ['resistor', 'резистор', 'сопротивление', 'resistance', 'сопр', 'сопротивление'],
  'resistor': ['резистор', 'resistor', 'сопротивление', 'resistance', 'сопр'],
  'сопротивление': ['resistance', 'сопротивление', 'резистор', 'resistor'],
  'resistance': ['сопротивление', 'resistance', 'резистор', 'resistor'],
  
  // Диоды
  'диод': ['diode', 'диод', 'выпрямитель', 'rectifier', 'выпрямительный'],
  'diode': ['диод', 'diode', 'выпрямитель', 'rectifier'],
  'выпрямитель': ['rectifier', 'выпрямитель', 'диод', 'diode'],
  'rectifier': ['выпрямитель', 'rectifier', 'диод', 'diode'],
  
  // Транзисторы
  'транзистор': ['transistor', 'транзистор', 'полевик', 'mosfet', 'bjt', 'биполярный', 'полевой'],
  'transistor': ['транзистор', 'transistor', 'полевик', 'mosfet', 'bjt'],
  'полевик': ['mosfet', 'полевик', 'транзистор', 'transistor', 'полевой'],
  'mosfet': ['полевик', 'mosfet', 'транзистор', 'transistor', 'полевой'],
  'bjt': ['биполярный', 'bjt', 'транзистор', 'transistor'],
  
  // Конденсаторы
  'конденсатор': ['capacitor', 'конденсатор', 'емкость', 'cap', 'кондер'],
  'capacitor': ['конденсатор', 'capacitor', 'емкость', 'cap'],
  'емкость': ['capacitance', 'емкость', 'конденсатор', 'capacitor'],
  
  // Микросхемы
  'микросхема': ['ic', 'микросхема', 'чип', 'chip', 'integrated', 'circuit', 'схема'],
  'ic': ['микросхема', 'ic', 'чип', 'chip', 'integrated', 'circuit'],
  'чип': ['chip', 'чип', 'микросхема', 'ic'],
  'chip': ['чип', 'chip', 'микросхема', 'ic'],
  
  // Операционные усилители
  'операционный': ['operational', 'операционный', 'opamp', 'op-amp', 'оп'],
  'усилитель': ['amplifier', 'усилитель', 'amp', 'opamp', 'усил'],
  'opamp': ['операционный', 'opamp', 'усилитель', 'amplifier'],
  'amplifier': ['усилитель', 'amplifier', 'операционный', 'opamp'],
  
  // Стабилизаторы
  'стабилизатор': ['regulator', 'стабилизатор', 'ldo', 'vreg', 'стаб'],
  'regulator': ['стабилизатор', 'regulator', 'ldo', 'vreg'],
  'ldo': ['стабилизатор', 'ldo', 'regulator'],
  'vreg': ['стабилизатор', 'vreg', 'regulator'],
  
  // Светодиоды
  'светодиод': ['led', 'светодиод', 'light', 'emitting', 'diode', 'свет'],
  'led': ['светодиод', 'led', 'light', 'emitting', 'diode'],
  'свет': ['light', 'свет', 'светодиод', 'led'],
  
  // Реле
  'реле': ['relay', 'реле', 'переключатель', 'switch', 'коммутатор'],
  'relay': ['реле', 'relay', 'переключатель', 'switch'],
  'переключатель': ['switch', 'переключатель', 'реле', 'relay'],
  'switch': ['переключатель', 'switch', 'реле', 'relay'],
  
  // Индуктивности
  'индуктивность': ['inductor', 'индуктивность', 'катушка', 'coil', 'дроссель', 'индуктор'],
  'inductor': ['индуктивность', 'inductor', 'катушка', 'coil', 'дроссель'],
  'катушка': ['coil', 'катушка', 'индуктивность', 'inductor'],
  'дроссель': ['choke', 'дроссель', 'индуктивность', 'inductor'],
  
  // Кварцы
  'кварц': ['crystal', 'кварц', 'резонатор', 'oscillator', 'xtal', 'генератор'],
  'crystal': ['кварц', 'crystal', 'резонатор', 'oscillator', 'xtal'],
  'резонатор': ['oscillator', 'резонатор', 'кварц', 'crystal'],
  'oscillator': ['резонатор', 'oscillator', 'кварц', 'crystal'],
  
  // Дополнительные термины
  'микроконтроллер': ['microcontroller', 'микроконтроллер', 'mcu', 'контроллер'],
  'microcontroller': ['микроконтроллер', 'microcontroller', 'mcu'],
  'mcu': ['микроконтроллер', 'mcu', 'microcontroller'],
  
  'датчик': ['sensor', 'датчик', 'сенсор'],
  'sensor': ['датчик', 'sensor', 'сенсор'],
  
  'разъем': ['connector', 'разъем', 'коннектор', 'соединитель'],
  'connector': ['разъем', 'connector', 'коннектор'],
  
  'кнопка': ['button', 'кнопка', 'переключатель', 'switch'],
  'button': ['кнопка', 'button', 'переключатель'],
  
  'индикатор': ['indicator', 'индикатор', 'дисплей', 'display'],
  'indicator': ['индикатор', 'indicator', 'дисплей'],
  
  'фильтр': ['filter', 'фильтр', 'фильтрация'],
  'filter': ['фильтр', 'filter', 'фильтрация']
};

// Стоп-слова
const STOP_WORDS = new Set([
  'и', 'в', 'на', 'с', 'для', 'от', 'по', 'из', 'к', 'до', 'за',
  'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with'
]);

export class SearchTokenizer {
  // Нормализация текста
  normalize(text) {
    return text
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^\w\s\-\/а-яa-z0-9]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Транслитерация RU -> EN
  transliterate(text) {
    let result = '';
    for (const char of text.toLowerCase()) {
      result += RU_TO_EN[char] || char;
    }
    return result;
  }
  
  // Получение синонимов для токена
  getSynonyms(token) {
    return SYNONYMS[token.toLowerCase()] || [];
  }
  
  // Токенизация с расширением синонимами
  tokenize(query) {
    const normalized = this.normalize(query);
    const tokens = normalized.split(/\s+/);
    const expandedTokens = new Set();
    
    for (const token of tokens) {
      // Пропускаем стоп-слова
      if (STOP_WORDS.has(token)) continue;
      
      // Добавляем оригинальный токен
      expandedTokens.add(token);
      
      // Добавляем транслитерацию
      const transliterated = this.transliterate(token);
      if (transliterated !== token) {
        expandedTokens.add(transliterated);
      }
      
      // Добавляем синонимы
      const synonyms = SYNONYMS[token];
      if (synonyms) {
        for (const synonym of synonyms) {
          expandedTokens.add(synonym);
        }
      }
    }
    
    return Array.from(expandedTokens);
  }
  
  // Скоринг результата - УНИВЕРСАЛЬНЫЙ ПОИСК ПО СОДЕРЖИМОМУ
  scoreResult(item, tokens) {
    let score = 0;
    const itemText = this.normalize(
      `${item.mpn || ''} ${item.title || ''} ${item.manufacturer || ''} ${item.description || ''}`
    );
    
    // Проверяем каждый токен запроса
    for (const token of tokens) {
      // 1. ТОЧНОЕ СОВПАДЕНИЕ MPN (высший приоритет)
      if (item.mpn && item.mpn.toLowerCase() === token) {
        score += 1000;
      } else if (item.mpn && item.mpn.toLowerCase().includes(token)) {
        score += 500;
      }
      
      // 2. СОВПАДЕНИЕ В ЗАГОЛОВКЕ (высокий приоритет)
      if (item.title && item.title.toLowerCase().includes(token)) {
        score += 100;
      }
      
      // 3. СОВПАДЕНИЕ В ПРОИЗВОДИТЕЛЕ
      if (item.manufacturer && item.manufacturer.toLowerCase().includes(token)) {
        score += 80;
      }
      
      // 4. СОВПАДЕНИЕ В ОПИСАНИИ
      if (item.description && item.description.toLowerCase().includes(token)) {
        score += 50;
      }
      
      // 5. ОБЩЕЕ СОВПАДЕНИЕ В ТЕКСТЕ (низкий приоритет, но все равно учитываем)
      if (itemText.includes(token)) {
        score += 10;
      }
      
      // 6. СИНОНИМЫ И ТРАНСЛИТЕРАЦИЯ
      const synonyms = this.getSynonyms(token);
      for (const synonym of synonyms) {
        if (itemText.includes(synonym)) {
          score += 30; // Бонус за синонимы
        }
      }
    }
    
    // БОНУСЫ ЗА КАЧЕСТВО ДАННЫХ
    if (item.stock_total && item.stock_total > 0) score += 20;
    if (item.price_min_rub && item.price_min_rub > 0) score += 15;
    if (item.image && item.image !== '/ui/placeholder.svg') score += 10;
    if (item.manufacturer) score += 5;
    if (item.description && item.description.length > 50) score += 5;
    
    return score;
  }
  
  // Фильтрация и ранжирование результатов
  filterAndRank(results, query) {
    const tokens = this.tokenize(query);
    
    // Скоринг всех результатов
    const scored = results.map(item => ({
      item,
      score: this.scoreResult(item, tokens)
    }));
    
    // Фильтруем результаты с нулевым скором
    const filtered = scored.filter(s => s.score > 0);
    
    // Сортируем по скору
    filtered.sort((a, b) => b.score - a.score);
    
    // Возвращаем отсортированные элементы
    return filtered.map(s => s.item);
  }
  
  // Проверка, является ли запрос MPN
  isMpnQuery(query) {
    // MPN обычно содержит буквы и цифры, может содержать дефисы
    const mpnPattern = /^[A-Z0-9][A-Z0-9\-\/]{2,}$/i;
    return mpnPattern.test(query.replace(/\s+/g, ''));
  }
  
  // Получение синонимов для токена
  getSynonyms(token) {
    const normalized = token.toLowerCase();
    const synonyms = [];
    
    // Прямые синонимы из словаря
    if (SYNONYMS[normalized]) {
      synonyms.push(...SYNONYMS[normalized]);
    }
    
    // Транслитерация для русских слов
    if (/[а-я]/i.test(token)) {
      const transliterated = this.transliterate(token);
      if (transliterated !== token) {
        synonyms.push(transliterated);
        // Добавляем синонимы для транслитерированного слова
        if (SYNONYMS[transliterated]) {
          synonyms.push(...SYNONYMS[transliterated]);
        }
      }
    }
    
    // Транслитерация для английских слов
    if (/[a-z]/i.test(token) && !/[а-я]/i.test(token)) {
      const reverseTransliterated = this.reverseTransliterate(token);
      if (reverseTransliterated !== token) {
        synonyms.push(reverseTransliterated);
        // Добавляем синонимы для обратно транслитерированного слова
        if (SYNONYMS[reverseTransliterated]) {
          synonyms.push(...SYNONYMS[reverseTransliterated]);
        }
      }
    }
    
    return [...new Set(synonyms)]; // Убираем дубликаты
  }
  
  // Обратная транслитерация EN -> RU
  reverseTransliterate(text) {
    let result = text.toLowerCase();
    for (const [ru, en] of Object.entries(RU_TO_EN)) {
      result = result.replace(new RegExp(en, 'g'), ru);
    }
    return result;
  }

  // Извлечение ключевых слов для поиска
  extractKeywords(query) {
    const normalized = this.normalize(query);
    const tokens = normalized.split(/\s+/);
    const keywords = [];
    
    for (const token of tokens) {
      // Пропускаем стоп-слова
      if (STOP_WORDS.has(token)) continue;
      
      // Пропускаем слишком короткие токены
      if (token.length < 2) continue;
      
      keywords.push(token);
      
      // Добавляем синонимы (включая транслитерацию)
      const synonyms = this.getSynonyms(token);
      keywords.push(...synonyms);
    }
    
    return [...new Set(keywords)]; // Убираем дубликаты
  }
}

// Экспорт синглтона
export const searchTokenizer = new SearchTokenizer();
