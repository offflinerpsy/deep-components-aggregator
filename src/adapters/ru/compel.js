import { getHtml } from '../../net/http.js';
import { extractProductHtmlFirst } from '../../parsing/extractProduct.js';

export async function parseCompel(mpn) {
  // MOCK DATA для демонстрации - в production заменить на реальный парсинг
  const mockData = {
    'LM317T': {
      mpn: 'LM317T',
      title: 'LM317T Стабилизатор напряжения регулируемый',
      manufacturer: 'STMicroelectronics',
      description: 'Линейный стабилизатор напряжения с регулируемым выходом от 1.2В до 37В, ток до 1.5А. Корпус TO-220.',
      package: 'TO-220',
      packaging: 'Tube',
      images: ['https://compel.ru/pix/LM317T_1.jpg', 'https://compel.ru/pix/LM317T_2.jpg'],
      datasheets: ['https://compel.ru/pdf/LM317T_datasheet.pdf'],
      technical_specs: {
        'Выходное напряжение': '1.2 - 37 В',
        'Выходной ток': '1.5 А',
        'Корпус': 'TO-220',
        'Температурный диапазон': '-55...+150°C',
        'Производитель': 'STMicroelectronics'
      }
    },
    'BC547': {
      mpn: 'BC547',
      title: 'BC547 Транзистор биполярный NPN',
      manufacturer: 'ON Semiconductor',
      description: 'NPN биполярный транзистор общего назначения. Корпус TO-92.',
      package: 'TO-92',
      packaging: 'Bulk',
      images: ['https://compel.ru/pix/BC547_1.jpg'],
      datasheets: ['https://compel.ru/pdf/BC547_datasheet.pdf'],
      technical_specs: {
        'Тип': 'NPN',
        'Напряжение коллектор-эмиттер': '45 В',
        'Ток коллектора': '100 мА',
        'Корпус': 'TO-92',
        'Производитель': 'ON Semiconductor'
      }
    },
    'NE555': {
      mpn: 'NE555',
      title: 'NE555 Таймер универсальный',
      manufacturer: 'Texas Instruments',
      description: 'Универсальный таймер для генерации импульсов и задержек. Корпус DIP-8.',
      package: 'DIP-8',
      packaging: 'Tube',
      images: ['https://compel.ru/pix/NE555_1.jpg'],
      datasheets: ['https://compel.ru/pdf/NE555_datasheet.pdf'],
      technical_specs: {
        'Напряжение питания': '4.5 - 16 В',
        'Выходной ток': '200 мА',
        'Корпус': 'DIP-8',
        'Температурный диапазон': '0...+70°C',
        'Производитель': 'Texas Instruments'
      }
    }
  };
  
  if (mockData[mpn]) {
    return {
      ok: true,
      source: 'compel',
      priority: 3,
      data: mockData[mpn]
    };
  }
  
  // Для неизвестных MPN возвращаем ошибку
  return { ok: false, code: 'PRODUCT_NOT_FOUND', source: 'compel' };
}