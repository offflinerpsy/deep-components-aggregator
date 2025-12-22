#!/usr/bin/env node
/**
 * Translate catalog categories to Russian
 * Adds name_ru column and populates it with translations
 */

import Database from 'better-sqlite3';

const DB_PATH = './var/db/deepagg.sqlite';

// Root category translations (49 categories)
const rootTranslations = {
  'Anti-Static, ESD, Clean Room Products': 'Антистатика и чистые комнаты',
  'Audio Products': 'Аудио компоненты',
  'Battery Products': 'Аккумуляторы и батареи',
  'Boxes, Enclosures, Racks': 'Корпуса и стойки',
  'Cable Assemblies': 'Кабельные сборки',
  'Cables, Wires': 'Кабели и провода',
  'Cables, Wires - Management': 'Кабельные органайзеры',
  'Capacitors': 'Конденсаторы',
  'Circuit Protection': 'Защита цепей',
  'Computer Equipment': 'Компьютерное оборудование',
  'Connectors, Interconnects': 'Разъёмы и коннекторы',
  'Crystals, Oscillators, Resonators': 'Кварцы и резонаторы',
  'Development Boards, Kits, Programmers': 'Отладочные платы и программаторы',
  'Discrete Semiconductor Products': 'Дискретные полупроводники',
  'Embedded Computers': 'Встраиваемые компьютеры',
  'Fans, Thermal Management': 'Вентиляторы и охлаждение',
  'Filters': 'Фильтры',
  'Hardware, Fasteners, Accessories': 'Крепёж и аксессуары',
  'Inductors, Coils, Chokes': 'Индуктивности и дроссели',
  'Industrial Automation and Controls': 'Промышленная автоматизация',
  'Industrial Supplies': 'Промышленные товары',
  'Integrated Circuits (ICs)': 'Интегральные микросхемы',
  'Isolators': 'Изоляторы',
  'Kits': 'Наборы и комплекты',
  'Labels, Signs, Barriers, Identification': 'Маркировка и идентификация',
  'Line Protection, Distribution, Backups': 'Защита и распределение питания',
  'Magnetics - Transformer, Inductor Components': 'Магнитные компоненты',
  'Maker/DIY, Educational': 'DIY и обучение',
  'Memory Cards, Modules': 'Карты памяти и модули',
  'Motors, Actuators, Solenoids and Drivers': 'Двигатели и приводы',
  'Networking Solutions': 'Сетевое оборудование',
  'Optical Inspection Equipment': 'Оптический контроль',
  'Optics': 'Оптика',
  'Optoelectronics': 'Оптоэлектроника',
  'Potentiometers, Variable Resistors': 'Потенциометры',
  'Power Supplies - Board Mount': 'Источники питания (на плату)',
  'Power Supplies - External/Internal (Off-Board)': 'Источники питания (внешние)',
  'Prototyping, Fabrication Products': 'Прототипирование',
  'RF and Wireless': 'РЧ и беспроводные',
  'Relays': 'Реле',
  'Resistors': 'Резисторы',
  'Sensors, Transducers': 'Датчики',
  'Soldering, Desoldering, Rework Products': 'Паяльное оборудование',
  'Switches': 'Переключатели',
  'Tapes, Adhesives, Materials': 'Ленты и материалы',
  'Test and Measurement': 'Измерительное оборудование',
  'Tools': 'Инструменты',
  'Transformers': 'Трансформаторы',
  'Uncategorized': 'Прочее',
};

// Common term translations for subcategories
const termTranslations = {
  // Component types
  'Capacitor': 'Конденсатор',
  'Capacitors': 'Конденсаторы',
  'Resistor': 'Резистор',
  'Resistors': 'Резисторы',
  'Inductor': 'Индуктивность',
  'Inductors': 'Индуктивности',
  'Transistor': 'Транзистор',
  'Transistors': 'Транзисторы',
  'Diode': 'Диод',
  'Diodes': 'Диоды',
  'Connector': 'Разъём',
  'Connectors': 'Разъёмы',
  'Relay': 'Реле',
  'Relays': 'Реле',
  'Switch': 'Переключатель',
  'Switches': 'Переключатели',
  'Sensor': 'Датчик',
  'Sensors': 'Датчики',
  'LED': 'Светодиод',
  'LEDs': 'Светодиоды',
  'Fuse': 'Предохранитель',
  'Fuses': 'Предохранители',
  'Crystal': 'Кварц',
  'Crystals': 'Кварцы',
  'Oscillator': 'Генератор',
  'Oscillators': 'Генераторы',
  'Transformer': 'Трансформатор',
  'Transformers': 'Трансформаторы',
  'Filter': 'Фильтр',
  'Filters': 'Фильтры',
  'Amplifier': 'Усилитель',
  'Amplifiers': 'Усилители',
  'Regulator': 'Стабилизатор',
  'Regulators': 'Стабилизаторы',
  'Controller': 'Контроллер',
  'Controllers': 'Контроллеры',
  'Driver': 'Драйвер',
  'Drivers': 'Драйверы',
  'Module': 'Модуль',
  'Modules': 'Модули',
  'Board': 'Плата',
  'Boards': 'Платы',
  'Cable': 'Кабель',
  'Cables': 'Кабели',
  'Wire': 'Провод',
  'Wires': 'Провода',
  'Battery': 'Аккумулятор',
  'Batteries': 'Аккумуляторы',
  'Motor': 'Двигатель',
  'Motors': 'Двигатели',
  'Fan': 'Вентилятор',
  'Fans': 'Вентиляторы',
  'Heatsink': 'Радиатор',
  'Heatsinks': 'Радиаторы',
  'Socket': 'Сокет',
  'Sockets': 'Сокеты',
  'Header': 'Штыревой разъём',
  'Headers': 'Штыревые разъёмы',
  'Terminal': 'Клемма',
  'Terminals': 'Клеммы',
  'Adapter': 'Адаптер',
  'Adapters': 'Адаптеры',
  'Converter': 'Преобразователь',
  'Converters': 'Преобразователи',
  'Encoder': 'Энкодер',
  'Encoders': 'Энкодеры',
  'Decoder': 'Декодер',
  'Decoders': 'Декодеры',
  'Multiplexer': 'Мультиплексор',
  'Multiplexers': 'Мультиплексоры',
  'Interface': 'Интерфейс',
  'Interfaces': 'Интерфейсы',
  'Transceiver': 'Трансивер',
  'Transceivers': 'Трансиверы',
  'Receiver': 'Приёмник',
  'Receivers': 'Приёмники',
  'Transmitter': 'Передатчик',
  'Transmitters': 'Передатчики',
  'Antenna': 'Антенна',
  'Antennas': 'Антенны',
  'Display': 'Дисплей',
  'Displays': 'Дисплеи',
  'Memory': 'Память',
  'Microcontroller': 'Микроконтроллер',
  'Microcontrollers': 'Микроконтроллеры',
  'Microprocessor': 'Микропроцессор',
  'Microprocessors': 'Микропроцессоры',
  'Programmer': 'Программатор',
  'Programmers': 'Программаторы',
  'Debugger': 'Отладчик',
  'Debuggers': 'Отладчики',
  'Emulator': 'Эмулятор',
  'Emulators': 'Эмуляторы',
  'Potentiometer': 'Потенциометр',
  'Potentiometers': 'Потенциометры',
  'Thermistor': 'Термистор',
  'Thermistors': 'Термисторы',
  'Varistor': 'Варистор',
  'Varistors': 'Варисторы',
  'Rectifier': 'Выпрямитель',
  'Rectifiers': 'Выпрямители',
  'Thyristor': 'Тиристор',
  'Thyristors': 'Тиристоры',
  'MOSFET': 'MOSFET',
  'MOSFETs': 'MOSFET-ы',
  'IGBT': 'IGBT',
  'BJT': 'Биполярный транзистор',
  'JFET': 'JFET',
  'Optocoupler': 'Оптопара',
  'Optocouplers': 'Оптопары',
  'Photodiode': 'Фотодиод',
  'Photodiodes': 'Фотодиоды',
  'Phototransistor': 'Фототранзистор',
  'Phototransistors': 'Фототранзисторы',
  'Laser': 'Лазер',
  'Lasers': 'Лазеры',
  
  // Materials and types
  'Aluminum': 'Алюминиевый',
  'Ceramic': 'Керамический',
  'Electrolytic': 'Электролитический',
  'Tantalum': 'Танталовый',
  'Film': 'Плёночный',
  'Polymer': 'Полимерный',
  'Mica': 'Слюдяной',
  'Chip': 'Чип',
  'SMD': 'SMD',
  'SMT': 'SMT',
  'Through Hole': 'Выводной',
  'Surface Mount': 'Для поверхностного монтажа',
  'Axial': 'Аксиальный',
  'Radial': 'Радиальный',
  
  // Descriptors
  'Power': 'Силовой',
  'High Power': 'Высокой мощности',
  'Low Power': 'Маломощный',
  'High Speed': 'Высокоскоростной',
  'Low Noise': 'Малошумящий',
  'Precision': 'Прецизионный',
  'General Purpose': 'Общего назначения',
  'Automotive': 'Автомобильный',
  'Industrial': 'Промышленный',
  'Military': 'Военный',
  'Medical': 'Медицинский',
  'Miniature': 'Миниатюрный',
  'Standard': 'Стандартный',
  'Custom': 'Заказной',
  'Fixed': 'Постоянный',
  'Variable': 'Переменный',
  'Adjustable': 'Регулируемый',
  'Programmable': 'Программируемый',
  'Digital': 'Цифровой',
  'Analog': 'Аналоговый',
  'Mixed Signal': 'Смешанного сигнала',
  'Linear': 'Линейный',
  'Switching': 'Импульсный',
  'Isolated': 'Изолированный',
  'Non-Isolated': 'Неизолированный',
  
  // Categories
  'Accessories': 'Аксессуары',
  'Arrays': 'Массивы',
  'Networks': 'Сети',
  'Kits': 'Наборы',
  'Assemblies': 'Сборки',
  'Components': 'Компоненты',
  'Products': 'Продукция',
  'Equipment': 'Оборудование',
  'Supplies': 'Материалы',
  'Solutions': 'Решения',
  'Systems': 'Системы',
  'Devices': 'Устройства',
  'Units': 'Блоки',
  'Parts': 'Детали',
  'Items': 'Изделия',
  'Tools': 'Инструменты',
  'Hardware': 'Крепёж',
  'Software': 'ПО',
  'Firmware': 'Прошивка',
  
  // Specific terms
  'DC-DC': 'DC-DC',
  'AC-DC': 'AC-DC',
  'AC-AC': 'AC-AC',
  'DC-AC': 'DC-AC',
  'LDO': 'LDO',
  'Buck': 'Понижающий',
  'Boost': 'Повышающий',
  'Buck-Boost': 'Понижающе-повышающий',
  'PWM': 'ШИМ',
  'PFC': 'ККМ',
  'EMI': 'ЭМП',
  'EMC': 'ЭМС',
  'ESD': 'ЭСР',
  'TVS': 'TVS',
  'Schottky': 'Шоттки',
  'Zener': 'Стабилитрон',
  'Supercapacitor': 'Суперконденсатор',
  'Supercapacitors': 'Суперконденсаторы',
  'EDLC': 'EDLC',
  'RF': 'РЧ',
  'Wireless': 'Беспроводной',
  'Bluetooth': 'Bluetooth',
  'WiFi': 'WiFi',
  'Wi-Fi': 'Wi-Fi',
  'Zigbee': 'Zigbee',
  'LoRa': 'LoRa',
  'NFC': 'NFC',
  'RFID': 'RFID',
  'GPS': 'GPS',
  'GNSS': 'ГНСС',
  'GSM': 'GSM',
  'LTE': 'LTE',
  '5G': '5G',
  'USB': 'USB',
  'HDMI': 'HDMI',
  'Ethernet': 'Ethernet',
  'CAN': 'CAN',
  'I2C': 'I2C',
  'SPI': 'SPI',
  'UART': 'UART',
  'RS-232': 'RS-232',
  'RS-485': 'RS-485',
};

function translateName(englishName) {
  // First check if we have exact translation
  if (rootTranslations[englishName]) {
    return rootTranslations[englishName];
  }
  
  // Try to translate using term dictionary
  let translated = englishName;
  
  // Sort terms by length (longest first) to avoid partial replacements
  const sortedTerms = Object.keys(termTranslations).sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    translated = translated.replace(regex, termTranslations[term]);
  }
  
  return translated;
}

async function main() {
  console.log('🔄 Opening database...');
  const db = new Database(DB_PATH);
  
  // Check if name_ru column exists
  const columns = db.prepare("PRAGMA table_info(catalog_categories)").all();
  const hasNameRu = columns.some(c => c.name === 'name_ru');
  
  if (!hasNameRu) {
    console.log('📝 Adding name_ru column...');
    db.exec('ALTER TABLE catalog_categories ADD COLUMN name_ru TEXT');
  } else {
    console.log('✅ name_ru column already exists');
  }
  
  // Get all categories
  const categories = db.prepare('SELECT id, name FROM catalog_categories').all();
  console.log(`📚 Found ${categories.length} categories to translate`);
  
  // Prepare update statement
  const updateStmt = db.prepare('UPDATE catalog_categories SET name_ru = ? WHERE id = ?');
  
  // Translate and update
  let translated = 0;
  let unchanged = 0;
  
  const transaction = db.transaction(() => {
    for (const cat of categories) {
      const russianName = translateName(cat.name);
      updateStmt.run(russianName, cat.id);
      
      if (russianName !== cat.name) {
        translated++;
      } else {
        unchanged++;
      }
    }
  });
  
  transaction();
  
  console.log(`\n✅ Translation complete!`);
  console.log(`   Translated: ${translated}`);
  console.log(`   Unchanged: ${unchanged}`);
  
  // Show some examples
  console.log('\n📋 Examples:');
  const examples = db.prepare(`
    SELECT name, name_ru 
    FROM catalog_categories 
    WHERE name_ru != name 
    ORDER BY RANDOM() 
    LIMIT 15
  `).all();
  
  for (const ex of examples) {
    console.log(`   ${ex.name}`);
    console.log(`   → ${ex.name_ru}\n`);
  }
  
  db.close();
}

main().catch(console.error);
