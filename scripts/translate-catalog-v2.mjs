#!/usr/bin/env node
/**
 * Catalog Translation Script v2
 * Uses JSON dictionary + fallback term translation
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../var/db/deepagg.sqlite');
const TRANSLATIONS_PATH = join(__dirname, 'catalog-translations.json');

// Load exact translations from JSON
const translations = JSON.parse(readFileSync(TRANSLATIONS_PATH, 'utf8'));
const exactTranslations = translations.exact;

// Fallback term dictionary for partial translations
const termDict = {
  // Common patterns
  'Accessories': 'Аксессуары',
  'Adapters': 'Адаптеры',
  'Amplifiers': 'Усилители',
  'Analyzers': 'Анализаторы',
  'Antennas': 'Антенны',
  'Arrays': 'Сборки',
  'Assembly': 'Сборка',
  
  'Battery': 'Батарея',
  'Batteries': 'Батареи',
  'Board': 'Плата',
  'Boards': 'Платы',
  'Boxes': 'Корпуса',
  'Brackets': 'Кронштейны',
  'Bridges': 'Мосты',
  'Buffers': 'Буферы',
  'Bus': 'Шина',
  
  'Cable': 'Кабель',
  'Cables': 'Кабели',
  'Capacitor': 'Конденсатор',
  'Capacitors': 'Конденсаторы',
  'Cards': 'Карты',
  'Ceramic': 'Керамический',
  'Charger': 'Зарядное',
  'Chargers': 'Зарядные',
  'Chip': 'Чип',
  'Circuit': 'Схема',
  'Circuits': 'Схемы',
  'Clamps': 'Зажимы',
  'Clock': 'Тактовый',
  'Coaxial': 'Коаксиальный',
  'Coils': 'Катушки',
  'Components': 'Компоненты',
  'Computer': 'Компьютер',
  'Computers': 'Компьютеры',
  'Conditioners': 'Кондиционеры',
  'Conductors': 'Проводники',
  'Connectors': 'Разъёмы',
  'Contact': 'Контакт',
  'Contacts': 'Контакты',
  'Controller': 'Контроллер',
  'Controllers': 'Контроллеры',
  'Converter': 'Преобразователь',
  'Converters': 'Преобразователи',
  'Cooling': 'Охлаждение',
  'Counters': 'Счётчики',
  'Covers': 'Крышки',
  'Current': 'Ток',
  'Cutters': 'Резаки',
  
  'Data': 'Данные',
  'Delay': 'Задержка',
  'Detectors': 'Детекторы',
  'Development': 'Разработка',
  'Devices': 'Устройства',
  'Dials': 'Шкалы',
  'Digital': 'Цифровой',
  'Diode': 'Диод',
  'Diodes': 'Диоды',
  'Display': 'Дисплей',
  'Displays': 'Дисплеи',
  'Distribution': 'Распределение',
  'Dividers': 'Делители',
  'Driver': 'Драйвер',
  'Drivers': 'Драйверы',
  
  'Educational': 'Образовательные',
  'Electric': 'Электрический',
  'Electrical': 'Электрический',
  'Electronic': 'Электронный',
  'Electronics': 'Электроника',
  'Embedded': 'Встраиваемые',
  'Emitters': 'Излучатели',
  'Enclosures': 'Корпуса',
  'Encoders': 'Энкодеры',
  'Equipment': 'Оборудование',
  'Evaluation': 'Отладочная',
  
  'Fans': 'Вентиляторы',
  'Fasteners': 'Крепёж',
  'Fiber': 'Оптоволокно',
  'Film': 'Плёночный',
  'Filter': 'Фильтр',
  'Filters': 'Фильтры',
  'Fixed': 'Фиксированные',
  'Flat': 'Плоский',
  'Flex': 'Гибкий',
  'Frequency': 'Частота',
  'Fuse': 'Предохранитель',
  'Fuses': 'Предохранители',
  
  'Gate': 'Затвор',
  'Gates': 'Вентили',
  'Gauges': 'Датчики',
  'General': 'Общего назначения',
  'Generator': 'Генератор',
  'Generators': 'Генераторы',
  'Grommets': 'Уплотнители',
  
  'Hardware': 'Комплектующие',
  'Headers': 'Штырьковые',
  'Heat': 'Тепло',
  'Heaters': 'Нагреватели',
  'Heatsinks': 'Радиаторы',
  'High': 'Высокий',
  'Holders': 'Держатели',
  'Housings': 'Корпуса',
  'Humidity': 'Влажность',
  
  'IC': 'ИС',
  'ICs': 'ИС',
  'Identification': 'Идентификация',
  'Indicators': 'Индикаторы',
  'Indoor': 'Внутренние',
  'Industrial': 'Промышленный',
  'Inductors': 'Индуктивности',
  'Infrared': 'Инфракрасный',
  'Input': 'Вход',
  'Inspection': 'Контроль',
  'Instruments': 'Приборы',
  'Insulators': 'Изоляторы',
  'Integrated': 'Интегральный',
  'Interface': 'Интерфейс',
  'Internal': 'Внутренний',
  'Inverters': 'Инверторы',
  'Isolation': 'Изоляция',
  'Isolators': 'Изоляторы',
  
  'Jacks': 'Гнёзда',
  'Joysticks': 'Джойстики',
  'Jumpers': 'Джамперы',
  
  'Keyboard': 'Клавиатура',
  'Keyboards': 'Клавиатуры',
  'Kits': 'Наборы',
  
  'Labels': 'Этикетки',
  'Lamps': 'Лампы',
  'Laser': 'Лазер',
  'Latches': 'Защёлки',
  'LED': 'Светодиод',
  'LEDs': 'Светодиоды',
  'Level': 'Уровень',
  'Light': 'Свет',
  'Lighting': 'Освещение',
  'Limiters': 'Ограничители',
  'Line': 'Линия',
  'Linear': 'Линейный',
  'Lines': 'Линии',
  'Loads': 'Нагрузки',
  'Logic': 'Логика',
  'Low': 'Низкий',
  
  'Machine': 'Машина',
  'Machines': 'Машины',
  'Magnetic': 'Магнитный',
  'Magnetics': 'Магнитные',
  'Management': 'Управление',
  'Markers': 'Маркеры',
  'Materials': 'Материалы',
  'Measurement': 'Измерение',
  'Mechanical': 'Механический',
  'Memory': 'Память',
  'Meters': 'Измерители',
  'Micro': 'Микро',
  'Microcontroller': 'Микроконтроллер',
  'Microcontrollers': 'Микроконтроллеры',
  'Microphones': 'Микрофоны',
  'Microprocessor': 'Микропроцессор',
  'Microprocessors': 'Микропроцессоры',
  'Mixer': 'Смеситель',
  'Mixers': 'Смесители',
  'Mobile': 'Мобильный',
  'Modems': 'Модемы',
  'Modular': 'Модульный',
  'Module': 'Модуль',
  'Modules': 'Модули',
  'Monitor': 'Монитор',
  'Monitors': 'Мониторы',
  'Motion': 'Движение',
  'Motor': 'Двигатель',
  'Motors': 'Двигатели',
  'Mount': 'Монтаж',
  'Mounting': 'Монтаж',
  'Multimeters': 'Мультиметры',
  'Multiplexers': 'Мультиплексоры',
  
  'Network': 'Сеть',
  'Networking': 'Сетевое',
  'Networks': 'Сети',
  'Noise': 'Шум',
  'Nuts': 'Гайки',
  
  'Optical': 'Оптический',
  'Optics': 'Оптика',
  'Optoelectronics': 'Оптоэлектроника',
  'Oscillator': 'Генератор',
  'Oscillators': 'Генераторы',
  'Oscilloscopes': 'Осциллографы',
  'Outdoor': 'Наружные',
  'Output': 'Выход',
  
  'Panels': 'Панели',
  'Parts': 'Детали',
  'Passive': 'Пассивные',
  'PCB': 'Печатная плата',
  'Photo': 'Фото',
  'Piezo': 'Пьезо',
  'Pins': 'Пины',
  'Plates': 'Платы',
  'Plugs': 'Штекеры',
  'Portable': 'Портативный',
  'Position': 'Позиция',
  'Potentiometer': 'Потенциометр',
  'Potentiometers': 'Потенциометры',
  'Power': 'Питание',
  'Precision': 'Прецизионный',
  'Pressure': 'Давление',
  'Probe': 'Щуп',
  'Probes': 'Щупы',
  'Processor': 'Процессор',
  'Processors': 'Процессоры',
  'Products': 'Продукция',
  'Programmable': 'Программируемый',
  'Programmer': 'Программатор',
  'Programmers': 'Программаторы',
  'Programming': 'Программирование',
  'Protect': 'Защита',
  'Protection': 'Защита',
  'Protectors': 'Защитные',
  'Prototyping': 'Прототипирование',
  'Proximity': 'Приближение',
  
  'Racks': 'Стойки',
  'Radio': 'Радио',
  'Receiver': 'Приёмник',
  'Receivers': 'Приёмники',
  'Rectifier': 'Выпрямитель',
  'Rectifiers': 'Выпрямители',
  'Reference': 'Опорный',
  'Reflective': 'Отражательный',
  'Regulator': 'Стабилизатор',
  'Regulators': 'Стабилизаторы',
  'Relay': 'Реле',
  'Relays': 'Реле',
  'Remote': 'Дистанционный',
  'Repair': 'Ремонт',
  'Resistor': 'Резистор',
  'Resistors': 'Резисторы',
  'Resonator': 'Резонатор',
  'Resonators': 'Резонаторы',
  'RF': 'РЧ',
  'Ring': 'Кольцо',
  'Rings': 'Кольца',
  'Robot': 'Робот',
  'Robots': 'Роботы',
  'Robotics': 'Робототехника',
  'Rotary': 'Поворотный',
  
  'Safety': 'Безопасность',
  'Scale': 'Шкала',
  'Screws': 'Винты',
  'Semiconductor': 'Полупроводник',
  'Semiconductors': 'Полупроводники',
  'Sensor': 'Датчик',
  'Sensors': 'Датчики',
  'Serial': 'Последовательный',
  'Server': 'Сервер',
  'Servers': 'Серверы',
  'Shield': 'Экран',
  'Shields': 'Экраны',
  'Shunt': 'Шунт',
  'Shunts': 'Шунты',
  'Signal': 'Сигнал',
  'Signals': 'Сигналы',
  'Signs': 'Знаки',
  'Silicon': 'Кремниевый',
  'Single': 'Одиночный',
  'Sinks': 'Радиаторы',
  'Slide': 'Ползунковый',
  'SMD': 'SMD',
  'Sockets': 'Панельки',
  'Software': 'ПО',
  'Solar': 'Солнечный',
  'Solder': 'Припой',
  'Soldering': 'Пайка',
  'Solid': 'Твёрдотельный',
  'Solutions': 'Решения',
  'Sound': 'Звук',
  'Spacers': 'Стойки',
  'Speakers': 'Динамики',
  'Special': 'Специальный',
  'Specialized': 'Специализированный',
  'Specialty': 'Специальные',
  'Standard': 'Стандартный',
  'Standoffs': 'Стойки',
  'Static': 'Статический',
  'Station': 'Станция',
  'Stations': 'Станции',
  'Storage': 'Хранение',
  'Strippers': 'Стрипперы',
  'Strips': 'Ленты',
  'Structures': 'Конструкции',
  'Supplies': 'Материалы',
  'Supply': 'Питание',
  'Suppressors': 'Подавители',
  'Surface': 'Поверхностный',
  'Surge': 'Импульсный',
  'Switch': 'Переключатель',
  'Switches': 'Переключатели',
  'Switching': 'Импульсный',
  'System': 'Система',
  'Systems': 'Системы',
  
  'Tapes': 'Ленты',
  'Temperature': 'Температура',
  'Terminal': 'Клемма',
  'Terminals': 'Клеммы',
  'Test': 'Тест',
  'Testing': 'Тестирование',
  'Thermal': 'Термо',
  'Thermistors': 'Термисторы',
  'Thermocouples': 'Термопары',
  'Thick': 'Толстоплёночный',
  'Thin': 'Тонкоплёночный',
  'Through': 'Выводной',
  'Timer': 'Таймер',
  'Timers': 'Таймеры',
  'Timing': 'Синхронизация',
  'Tools': 'Инструменты',
  'Touch': 'Сенсорный',
  'Transceiver': 'Трансивер',
  'Transceivers': 'Трансиверы',
  'Transducers': 'Преобразователи',
  'Transformer': 'Трансформатор',
  'Transformers': 'Трансформаторы',
  'Transistor': 'Транзистор',
  'Transistors': 'Транзисторы',
  'Transmitter': 'Передатчик',
  'Transmitters': 'Передатчики',
  'Trigger': 'Триггер',
  'Triggers': 'Триггеры',
  'Trimmers': 'Подстроечные',
  'Tubes': 'Трубки',
  'Tuners': 'Тюнеры',
  'Tuning': 'Настройка',
  
  'Ultrasonic': 'Ультразвуковой',
  'Universal': 'Универсальный',
  'USB': 'USB',
  
  'Variable': 'Переменный',
  'Video': 'Видео',
  'Voltage': 'Напряжение',
  
  'Washers': 'Шайбы',
  'Wire': 'Провод',
  'Wires': 'Провода',
  'Wireless': 'Беспроводной',
  'Wiring': 'Монтаж',
  
  // Extra terms for completeness
  'Purpose': 'Назначение',
  'Type': 'Тип',
  'Output': 'Выход',
  'Input': 'Вход',
  'High': 'Высокий',
  'Low': 'Низкий',
  'Medium': 'Средний',
  'Small': 'Малый',
  'Large': 'Большой',
  'Mini': 'Мини',
  'Micro': 'Микро',
  'Standard': 'Стандартный',
  'Premium': 'Премиум',
  'Professional': 'Профессиональный',
  'Basic': 'Базовый',
  'Advanced': 'Расширенный',
  
  // DigiKey-specific patterns
  'Single': 'Одиночный',
  'Dual': 'Двойной',
  'Triple': 'Тройной',
  'Quad': 'Четверной',
  'Hex': 'Шестерной',
  'Octal': 'Восьмерной'
};

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

// Translation function
function translate(name) {
  // 1. Check exact match in JSON dictionary
  if (exactTranslations[name]) {
    return exactTranslations[name];
  }
  
  // 2. Try term-by-term translation
  let translated = name;
  let changed = false;
  
  // Sort terms by length (longest first) to avoid partial replacements
  const sortedTerms = Object.keys(termDict).sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    if (regex.test(translated)) {
      translated = translated.replace(regex, termDict[term]);
      changed = true;
    }
  }
  
  // 3. If still contains English letters, mark as needing manual translation
  const hasEnglish = /[a-zA-Z]{3,}/.test(translated);
  
  return changed && !hasEnglish ? translated : name;
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

// Show samples of unchanged for review
if (unchanged > 0) {
  console.log('\n=== Sample unchanged categories (need manual translation): ===');
  const db2 = new Database(DB_PATH);
  const samples = db2.prepare(`
    SELECT name, name_ru FROM catalog_categories 
    WHERE name = name_ru 
    ORDER BY name 
    LIMIT 30
  `).all();
  
  samples.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name}`);
  });
  db2.close();
}
