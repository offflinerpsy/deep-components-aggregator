// search-tokenizer.js - умный поиск с поддержкой RU/EN токенизации

// Словарь транслитерации RU -> EN
const RU_TO_EN = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

// Словарь синонимов RU <-> EN
const SYNONYMS = {
  'резистор': ['resistor', 'резистор', 'сопротивление', 'resistance'],
  'resistor': ['резистор', 'resistor', 'сопротивление', 'resistance'],
  'диод': ['diode', 'диод', 'выпрямитель', 'rectifier'],
  'diode': ['диод', 'diode', 'выпрямитель', 'rectifier'],
  'транзистор': ['transistor', 'транзистор', 'полевик', 'mosfet', 'bjt'],
  'transistor': ['транзистор', 'transistor', 'полевик', 'mosfet', 'bjt'],
  'конденсатор': ['capacitor', 'конденсатор', 'емкость', 'cap'],
  'capacitor': ['конденсатор', 'capacitor', 'емкость', 'cap'],
  'микросхема': ['ic', 'микросхема', 'чип', 'chip', 'integrated', 'circuit'],
  'ic': ['микросхема', 'ic', 'чип', 'chip', 'integrated', 'circuit'],
  'операционный': ['operational', 'операционный', 'opamp', 'op-amp'],
  'усилитель': ['amplifier', 'усилитель', 'amp', 'opamp'],
  'стабилизатор': ['regulator', 'стабилизатор', 'ldo', 'vreg'],
  'regulator': ['стабилизатор', 'regulator', 'ldo', 'vreg'],
  'светодиод': ['led', 'светодиод', 'light', 'emitting', 'diode'],
  'led': ['светодиод', 'led', 'light', 'emitting', 'diode'],
  'реле': ['relay', 'реле', 'переключатель', 'switch'],
  'relay': ['реле', 'relay', 'переключатель', 'switch'],
  'индуктивность': ['inductor', 'индуктивность', 'катушка', 'coil', 'дроссель'],
  'inductor': ['индуктивность', 'inductor', 'катушка', 'coil', 'дроссель'],
  'кварц': ['crystal', 'кварц', 'резонатор', 'oscillator', 'xtal'],
  'crystal': ['кварц', 'crystal', 'резонатор', 'oscillator', 'xtal']
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
  
  // Скоринг результата
  scoreResult(item, tokens) {
    let score = 0;
    const itemText = this.normalize(
      `${item.mpn || ''} ${item.title || ''} ${item.manufacturer || ''} ${item.description || ''}`
    );
    
    for (const token of tokens) {
      // Точное совпадение MPN
      if (item.mpn.toLowerCase() === token) {
        score += 100;
      } else if (item.mpn.toLowerCase().includes(token)) {
        score += 50;
      }
      
      // Совпадение в заголовке
      if (item.title.toLowerCase().includes(token)) {
        score += 30;
      }
      
      // Совпадение в производителе
      if (item.manufacturer && item.manufacturer.toLowerCase().includes(token)) {
        score += 20;
      }
      
      // Совпадение в описании
      if (item.description && item.description.toLowerCase().includes(token)) {
        score += 10;
      }
      
      // Общее совпадение в тексте
      if (itemText.includes(token)) {
        score += 5;
      }
    }
    
    // Бонус за наличие данных
    if (item.stock && item.stock > 0) score += 15;
    if (item.min_price_rub) score += 10;
    if (item.image_url) score += 5;
    if (item.manufacturer) score += 5;
    
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
      
      // Добавляем транслитерацию для русских слов
      if (/[а-я]/i.test(token)) {
        const transliterated = this.transliterate(token);
        if (transliterated !== token) {
          keywords.push(transliterated);
        }
      }
    }
    
    return keywords;
  }
}

// Экспорт синглтона
export const searchTokenizer = new SearchTokenizer();
