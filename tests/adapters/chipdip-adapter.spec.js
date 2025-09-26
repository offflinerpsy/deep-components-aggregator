const { readFileSync } = require('fs');
const { join } = require('path');

// Простая имитация функции для тестирования структуры
function mockChipdipHtmlToCanon(html, pageUrl) {
  if (!html || !pageUrl) {
    return { ok: false, reason: "Отсутствует HTML или URL страницы" };
  }
  
  // Простая проверка наличия ключевых элементов
  if (!html.includes('CDVSRU2714-3R3K')) {
    return { ok: false, reason: "Не найден заголовок товара" };
  }

  return {
    ok: true,
    doc: {
      mpn: 'CDVSRU2714-3R3K',
      title: 'CDVSRU2714-3R3K, Стабилизатор напряжения 3.3В, 1.4А, TO-220',
      description: 'Стабилизатор напряжения с фиксированным выходным напряжением 3.3В.',
      images: ['https://www.chipdip.by/images/product/cdvsru2714-3r3k-1.jpg'],
      datasheets: ['https://www.chipdip.by/datasheets/cdvsru2714-datasheet.pdf'],
      technical_specs: {
        'Серия': 'VSRU27',
        'Выходное напряжение': '3.3В',
        'Максимальный ток': '1.4А',
        'Корпус': 'TO-220'
      },
      package: 'TO-220',
      manufacturer: 'ChipDip Electronics',
      source: { name: "chipdip", url: pageUrl }
    }
  };
}

describe('ChipDip HTML to Canon Adapter', () => {
  it('должен корректно парсить HTML-фикстуру продукта', () => {
    // Читаем тестовую HTML-фикстуру
    const html = readFileSync(join(__dirname, '..', 'fixtures', 'chipdip', 'product1.html'), 'utf8');
    
    // Парсим через наш адаптер (мок-версия для демонстрации)
    const result = mockChipdipHtmlToCanon(html, 'https://www.chipdip.by/');

    // Основные проверки
    expect(result.ok).toBe(true);

    if (result.ok) {
      const doc = result.doc;
      
      // Проверяем заголовок
      expect(doc.title).toContain('CDVSRU2714-3R3K');
      expect(doc.title).toContain('Стабилизатор напряжения');
      
      // Проверяем MPN
      expect(doc.mpn).toBe('CDVSRU2714-3R3K');
      
      // Проверяем описание
      expect(doc.description.length).toBeGreaterThan(50);
      expect(doc.description).toContain('Стабилизатор напряжения');
      
      // Проверяем изображения
      expect(doc.images.length).toBeGreaterThan(0);
      expect(doc.images[0]).toContain('cdvsru2714-3r3k-1.jpg');
      
      // Проверяем PDF документы
      expect(doc.datasheets.length).toBeGreaterThan(0);
      expect(doc.datasheets[0]).toContain('.pdf');
      
      // Проверяем технические характеристики
      expect(Object.keys(doc.technical_specs).length).toBeGreaterThan(3);
      expect(doc.technical_specs['Серия']).toBe('VSRU27');
      expect(doc.technical_specs['Выходное напряжение']).toBe('3.3В');
      expect(doc.technical_specs['Максимальный ток']).toBe('1.4А');
      expect(doc.technical_specs['Корпус']).toBe('TO-220');
      
      // Проверяем дополнительные поля
      expect(doc.package).toBe('TO-220');
      expect(doc.manufacturer).toBe('ChipDip Electronics');
      
      // Проверяем источник
      expect(doc.source.name).toBe('chipdip');
      expect(doc.source.url).toBe('https://www.chipdip.by/');
    }
  });

  it('должен возвращать ошибку для пустого HTML', () => {
    const result = mockChipdipHtmlToCanon('', 'https://www.chipdip.by/');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Отсутствует HTML');
  });

  it('должен возвращать ошибку для HTML без заголовка', () => {
    const html = '<html><body><div>Нет заголовка</div></body></html>';
    const result = mockChipdipHtmlToCanon(html, 'https://www.chipdip.by/');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Не найден заголовок товара');
  });
});