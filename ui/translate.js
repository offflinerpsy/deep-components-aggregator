// Словарь переводов для спецификаций компонентов
const SPEC_TRANSLATIONS = {
  // Package/Корпус
  'Packaging': 'Упаковка',
  'Package': 'Корпус',
  'Package / Case': 'Корпус',
  'Mounting Type': 'Тип монтажа',
  'Standard Pack Qty': 'Кол-во в упаковке',
  
  // Electrical
  'Voltage': 'Напряжение',
  'Voltage - Input': 'Напряжение входа',
  'Voltage - Output': 'Напряжение выхода',
  'Voltage - Supply': 'Напряжение питания',
  'Current': 'Ток',
  'Current - Output': 'Выходной ток',
  'Current - Supply': 'Ток питания',
  'Power': 'Мощность',
  'Resistance': 'Сопротивление',
  'Capacitance': 'Ёмкость',
  'Inductance': 'Индуктивность',
  'Frequency': 'Частота',
  
  // Temperature
  'Temperature': 'Температура',
  'Operating Temperature': 'Рабочая температура',
  'Temperature Range': 'Диапазон температур',
  'Storage Temperature': 'Темп. хранения',
  
  // Common
  'Manufacturer': 'Производитель',
  'Part Number': 'Номер детали',
  'Description': 'Описание',
  'Category': 'Категория',
  'Series': 'Серия',
  'Type': 'Тип',
  'Material': 'Материал',
  'Color': 'Цвет',
  'Size': 'Размер',
  'Weight': 'Вес',
  'Length': 'Длина',
  'Width': 'Ширина',
  'Height': 'Высота',
  'Tolerance': 'Допуск',
  
  // Product Status
  'Product Status': 'Статус продукта',
  'Lifecycle Status': 'Статус жизненного цикла',
  'RoHS': 'RoHS',
  'Lead Free': 'Без свинца',
  
  // Certifications
  'Certifications': 'Сертификаты',
  'Standards': 'Стандарты',
  
  // Misc
  'Features': 'Особенности',
  'Applications': 'Применение',
  'Number of Pins': 'Кол-во выводов',
  'Termination Style': 'Тип выводов',
  'Pin Count': 'Кол-во контактов',
  'Contact Material': 'Материал контактов',
  'Housing Material': 'Материал корпуса',
  'Insulation Material': 'Материал изоляции',
  'Connector Type': 'Тип разъёма',
  'Gender': 'Пол разъёма',
  'Orientation': 'Ориентация',
  'Circuit': 'Схема',
  'Configuration': 'Конфигурация',
  'Function': 'Функция',
  'Interface': 'Интерфейс',
  'Protocol': 'Протокол',
  'Speed': 'Скорость',
  'Memory Size': 'Объём памяти',
  'Resolution': 'Разрешение',
  'Output Type': 'Тип выхода',
  'Input Type': 'Тип входа',
  'Logic Type': 'Тип логики',
  'Supply Voltage': 'Напряжение питания',
  'Quiescent Current': 'Ток покоя',
  'Dropout Voltage': 'Напряжение падения',
  'Accuracy': 'Точность',
  'Noise': 'Шум',
  'PSRR': 'PSRR',
  'Slew Rate': 'Скорость нарастания',
  'Gain Bandwidth Product': 'Произведение усиления на полосу',
  'Channel Type': 'Тип канала',
  'Number of Channels': 'Кол-во каналов',
  'Drain to Source Voltage': 'Напряжение сток-исток',
  'Gate Threshold Voltage': 'Пороговое напряжение затвора',
  'Continuous Drain Current': 'Постоянный ток стока',
  'RDS On': 'RDS вкл',
  'Input Capacitance': 'Входная ёмкость',
  'Charge': 'Заряд',
  'Rise Time': 'Время нарастания',
  'Fall Time': 'Время спада',
  'Propagation Delay': 'Задержка распространения',
  'Operating Supply Voltage': 'Рабочее напряжение питания',
  'Logic Level': 'Уровень логики'
};

// Функция перевода названия поля
export function translateSpec(englishName) {
  return SPEC_TRANSLATIONS[englishName] || englishName;
}

// Экспорт для использования в Node.js (если нужно)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { translateSpec, SPEC_TRANSLATIONS };
}
