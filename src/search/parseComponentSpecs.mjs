/**
 * Парсинг характеристик компонентов из поискового запроса
 * Примеры: "0603 100к 5%", "smd 10uF 16V ceramic", "TO-220 NPN 100V"
 */

/**
 * Словари для нормализации
 */

// Корпуса SMD
const SMD_PACKAGES = new Set([
  '0201', '0402', '0603', '0805', '1206', '1210', '1812', '2010', '2512',
  'SOT-23', 'SOT-223', 'SOD-123', 'SOD-323', 'SOT-89', 'TO-252', 'TO-263',
  'QFN', 'QFP', 'SOIC', 'TSSOP', 'MSOP', 'DFN', 'SON', 'SMD'
]);

// Корпуса THT
const THT_PACKAGES = new Set([
  'TO-220', 'TO-92', 'TO-247', 'TO-126', 'DIP', 'PDIP', 'SIP', 'AXIAL', 'RADIAL', 'THT'
]);

// Типы компонентов
const COMPONENT_TYPES = {
  'резистор': 'resistor',
  'resistor': 'resistor',
  'конденсатор': 'capacitor',
  'capacitor': 'capacitor',
  'транзистор': 'transistor',
  'transistor': 'transistor',
  'диод': 'diode',
  'diode': 'diode',
  'микросхема': 'ic',
  'ic': 'ic',
  'чип': 'ic'
};

// Материалы конденсаторов
const CAPACITOR_MATERIALS = new Set([
  'ceramic', 'керамика', 'керамический',
  'electrolytic', 'электролитический',
  'tantalum', 'тантал', 'танталовый',
  'film', 'пленка', 'пленочный'
]);

// Типы транзисторов
const TRANSISTOR_TYPES = new Set([
  'NPN', 'PNP', 'NMOS', 'PMOS', 'JFET', 'MOSFET', 'IGBT'
]);

/**
 * Преобразование русских обозначений номиналов в числа
 * Примеры: "100к" → 100000, "4.7М" → 4700000, "10п" → 0.00000001
 */
function parseRussianValue(str) {
  str = str.toLowerCase().replace(',', '.');
  
  const multipliers = {
    'п': 1e-12,  // пико
    'n': 1e-9,   // нано
    'н': 1e-9,
    'u': 1e-6,   // микро
    'м': 1e-6,   // (микро в русской раскладке, не милли!)
    'к': 1e3,    // кило
    'k': 1e3,
    'M': 1e6,    // мега (английская)
    'г': 1e9     // гига
  };
  
  // Парсим число с множителем
  const match = str.match(/^([\d.]+)([пнмукmkg])?/i);
  if (!match) return null;
  
  const base = parseFloat(match[1]);
  const mult = match[2] ? (multipliers[match[2].toLowerCase()] || 1) : 1;
  
  return base * mult;
}

/**
 * Извлечение номинала сопротивления
 */
function parseResistance(token) {
  // Русский формат: "100к", "4М7"
  if (/^\d+[.,]?\d*[пнмук]/i.test(token)) {
    const value = parseRussianValue(token);
    if (value !== null) {
      return { value, unit: 'Ω', type: 'resistance' };
    }
  }
  
  // Английский формат: "100k", "4.7M"
  const match = token.match(/^([\d.]+)(k|m|g)?ω?$/i);
  if (match) {
    let value = parseFloat(match[1]);
    const mult = match[2];
    
    if (mult) {
      const multipliers = { k: 1e3, m: 1e6, g: 1e9 };
      value *= multipliers[mult.toLowerCase()] || 1;
    }
    
    // Не распознаём голые числа < 1Ω как сопротивление (скорее всего это размер/высота)
    if (value < 1 && !match[2] && !token.match(/ω|ohm/i)) {
      return null;
    }
    
    // Игнорируем малые значения без явных единиц (скорее всего это height/width/другой параметр)
    // Пример: "0.22" без "Ω" или "ohm" не считаем сопротивлением
    if (value < 1 && !token.match(/ω|ohm/i)) {
      return null;
    }
    
    return { value, unit: 'Ω', type: 'resistance' };
  }
  
  // "Ohm" формат
  if (token.match(/^\d+(\.\d+)?ohm$/i)) {
    return { value: parseFloat(token), unit: 'Ω', type: 'resistance' };
  }
  
  return null;
}

/**
 * Извлечение номинала емкости
 */
function parseCapacitance(token) {
  // Русский формат: "10мкф", "100пф"
  if (/\d+[.,]?\d*[пн]ф?$/i.test(token)) {
    const valueStr = token.replace(/ф$/i, '');
    const value = parseRussianValue(valueStr);
    if (value !== null) {
      return { value, unit: 'F', type: 'capacitance' };
    }
  }
  
  // Английский формат: "10uF", "100nF"
  const match = token.match(/^([\d.]+)(p|n|u|m)?f$/i);
  if (match) {
    let value = parseFloat(match[1]);
    const mult = match[2];
    
    if (mult) {
      const multipliers = { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3 };
      value *= multipliers[mult.toLowerCase()] || 1;
    }
    
    return { value, unit: 'F', type: 'capacitance' };
  }
  
  return null;
}

/**
 * Извлечение напряжения
 */
function parseVoltage(token) {
  const match = token.match(/^([\d.]+)v([\d.]+)?$/i);
  if (match) {
    let value = parseFloat(match[1]);
    
    // Формат "3v3" → 3.3V
    if (match[2]) {
      value = parseFloat(`${match[1]}.${match[2]}`);
    }
    
    return { value, unit: 'V', type: 'voltage' };
  }
  
  return null;
}

/**
 * Извлечение допуска
 */
function parseTolerance(token) {
  const match = token.match(/^[±]?([\d.]+)%$/);
  if (match) {
    return { value: parseFloat(match[1]), unit: '%', type: 'tolerance' };
  }
  
  return null;
}

/**
 * Извлечение мощности
 */
function parsePower(token) {
  // Формат дроби: "1/4W"
  const fractionMatch = token.match(/^(\d+)\/(\d+)w$/i);
  if (fractionMatch) {
    const value = parseFloat(fractionMatch[1]) / parseFloat(fractionMatch[2]);
    return { value, unit: 'W', type: 'power' };
  }
  
  // Обычный формат: "0.25W", "250mW"
  const match = token.match(/^([\d.]+)(m)?w$/i);
  if (match) {
    let value = parseFloat(match[1]);
    if (match[2] === 'm') value *= 1e-3;
    
    return { value, unit: 'W', type: 'power' };
  }
  
  return null;
}

/**
 * Главная функция парсинга
 * @param {string} query - Поисковый запрос
 * @returns {Object} Структура с распознанными параметрами
 */
export function parseComponentSpecs(query) {
  const specs = {
    package: null,        // Корпус (0603, TO-220, etc)
    resistance: null,     // Сопротивление (Ω)
    capacitance: null,    // Емкость (F)
    voltage: null,        // Напряжение (V)
    tolerance: null,      // Допуск (%)
    power: null,          // Мощность (W)
    componentType: null,  // Тип (resistor, capacitor, etc)
    material: null,       // Материал (ceramic, electrolytic, etc)
    transistorType: null, // NPN, PNP, NMOS, etc
    tokens: [],           // Нераспознанные токены
    raw: query
  };
  
  // Разбиваем на токены
  const tokens = query.trim().split(/\s+/);
  
  tokens.forEach(token => {
    const normalized = token.toUpperCase();
    
    // Проверяем корпус
    if (SMD_PACKAGES.has(normalized) || THT_PACKAGES.has(normalized)) {
      specs.package = normalized;
      return;
    }
    
    // Проверяем тип компонента
    const componentType = COMPONENT_TYPES[token.toLowerCase()];
    if (componentType) {
      specs.componentType = componentType;
      return;
    }
    
    // Проверяем материал конденсатора
    if (CAPACITOR_MATERIALS.has(token.toLowerCase())) {
      specs.material = token.toLowerCase();
      return;
    }
    
    // Проверяем тип транзистора
    if (TRANSISTOR_TYPES.has(normalized)) {
      specs.transistorType = normalized;
      return;
    }
    
    // Пытаемся распознать числовые параметры
    const resistance = parseResistance(token);
    if (resistance) {
      specs.resistance = resistance;
      return;
    }
    
    const capacitance = parseCapacitance(token);
    if (capacitance) {
      specs.capacitance = capacitance;
      return;
    }
    
    const voltage = parseVoltage(token);
    if (voltage) {
      specs.voltage = voltage;
      return;
    }
    
    const tolerance = parseTolerance(token);
    if (tolerance) {
      specs.tolerance = tolerance;
      return;
    }
    
    const power = parsePower(token);
    if (power) {
      specs.power = power;
      return;
    }
    
    // Не распознано — сохраняем как токен
    specs.tokens.push(token);
  });
  
  return specs;
}

/**
 * Преобразование спецификаций в поисковый запрос
 * @param {Object} specs - Результат parseComponentSpecs
 * @returns {string} Поисковый запрос для провайдеров
 */
export function specsToSearchQuery(specs) {
  const parts = [];
  
  // Добавляем тип компонента
  if (specs.componentType) {
    parts.push(specs.componentType);
  }
  
  // Добавляем корпус
  if (specs.package) {
    parts.push(specs.package);
  }
  
  // Добавляем сопротивление
  if (specs.resistance) {
    const value = specs.resistance.value;
    if (value >= 1e6) {
      parts.push(`${value / 1e6}M`);
    } else if (value >= 1e3) {
      parts.push(`${value / 1e3}k`);
    } else {
      parts.push(`${value}`);
    }
  }
  
  // Добавляем емкость
  if (specs.capacitance) {
    const value = specs.capacitance.value;
    if (value >= 1e-6) {
      parts.push(`${value / 1e-6}uF`);
    } else if (value >= 1e-9) {
      parts.push(`${value / 1e-9}nF`);
    } else {
      parts.push(`${value / 1e-12}pF`);
    }
  }
  
  // Добавляем напряжение
  if (specs.voltage) {
    parts.push(`${specs.voltage.value}V`);
  }
  
  // Добавляем допуск
  if (specs.tolerance) {
    parts.push(`${specs.tolerance.value}%`);
  }
  
  // Добавляем мощность
  if (specs.power) {
    parts.push(`${specs.power.value}W`);
  }
  
  // Добавляем материал
  if (specs.material) {
    parts.push(specs.material);
  }
  
  // Добавляем тип транзистора
  if (specs.transistorType) {
    parts.push(specs.transistorType);
  }
  
  // Добавляем нераспознанные токены
  parts.push(...specs.tokens);
  
  return parts.join(' ');
}

/**
 * Проверка, является ли запрос поиском по характеристикам
 * @param {Object} specs - Результат parseComponentSpecs
 * @returns {boolean}
 */
export function isSpecsSearch(specs) {
  return !!(
    specs.package ||
    specs.resistance ||
    specs.capacitance ||
    specs.voltage ||
    specs.tolerance ||
    specs.power ||
    specs.componentType ||
    specs.material ||
    specs.transistorType
  );
}
