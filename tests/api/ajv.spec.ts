import { test, expect } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const searchRowSchema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/schemas/search-row.schema.json'), 'utf8'));
const productCanonSchema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/schemas/product-canon.schema.json'), 'utf8'));

// Инициализация AJV
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validateSearchRow = ajv.compile(searchRowSchema);
const validateProductCanon = ajv.compile(productCanonSchema);

test('AJV: валидация схемы SearchRow', () => {
  // Валидный объект
  const validSearchRow = {
    mpn: 'LM317T',
    title: 'LM317T Voltage Regulator',
    manufacturer: 'STMicroelectronics',
    description_short: 'Adjustable voltage regulator',
    package: 'TO-220',
    packaging: 'Tube',
    regions: ['RU', 'EU'],
    stock: 100,
    min_price_rub: 150.50,
    min_currency: 'RUB',
    image_url: 'https://example.com/image.jpg',
    product_url: 'https://example.com/product',
    source: 'chipdip'
  };
  
  expect(validateSearchRow(validSearchRow)).toBe(true);
  
  // Невалидный объект - отсутствует обязательное поле
  const invalidSearchRow = {
    mpn: 'LM317T',
    // title отсутствует
    manufacturer: 'STMicroelectronics'
  };
  
  expect(validateSearchRow(invalidSearchRow)).toBe(false);
  expect(validateSearchRow.errors).toBeDefined();
});

test('AJV: валидация схемы ProductCanon', () => {
  // Валидный объект
  const validProductCanon = {
    mpn: 'LM317T',
    title: 'LM317T Voltage Regulator',
    manufacturer: 'STMicroelectronics',
    gallery: [{ image_url: 'https://example.com/image.jpg' }],
    meta: {
      package: 'TO-220',
      packaging: 'Tube'
    },
    order: {
      regions: ['RU'],
      stock: 100,
      min_price_rub: 150.50,
      min_currency: 'RUB'
    },
    description_html: '<p>Adjustable voltage regulator</p>',
    docs: [{ label: 'Datasheet', url: 'https://example.com/datasheet.pdf' }],
    specs: [
      { name: 'Voltage', value: '1.2V to 37V' },
      { name: 'Current', value: '1.5A' }
    ],
    sources: [{ source: 'chipdip', product_url: 'https://example.com/product' }]
  };
  
  expect(validateProductCanon(validProductCanon)).toBe(true);
  
  // Невалидный объект - неправильный тип
  const invalidProductCanon = {
    mpn: 'LM317T',
    title: 'LM317T Voltage Regulator',
    manufacturer: 'STMicroelectronics',
    gallery: 'invalid', // должно быть массивом
    meta: {
      package: 'TO-220',
      packaging: 'Tube'
    },
    order: {
      regions: ['RU'],
      stock: 100,
      min_price_rub: 150.50,
      min_currency: 'RUB'
    },
    description_html: '<p>Adjustable voltage regulator</p>',
    docs: [],
    specs: [],
    sources: []
  };
  
  expect(validateProductCanon(invalidProductCanon)).toBe(false);
  expect(validateProductCanon.errors).toBeDefined();
});

test('API: валидация /api/search ответа', async ({ request }) => {
  const response = await request.get('/api/search?q=LM317T');
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  expect(data.ok).toBe(true);
  expect(data.items).toBeDefined();
  expect(Array.isArray(data.items)).toBe(true);
  
  // Валидируем каждый элемент
  for (const item of data.items) {
    expect(validateSearchRow(item)).toBe(true);
  }
});

test('API: валидация /api/product ответа', async ({ request }) => {
  const response = await request.get('/api/product?mpn=LM317T');
  
  if (response.status() === 200) {
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.product).toBeDefined();
    
    // Валидируем продукт
    expect(validateProductCanon(data.product)).toBe(true);
  } else {
    // Если продукт не найден, это тоже валидный ответ
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBeDefined();
  }
});

test('API: проверка обязательных полей в SearchRow', async ({ request }) => {
  const response = await request.get('/api/search?q=test');
  const data = await response.json();
  
  if (data.items && data.items.length > 0) {
    const item = data.items[0];
    
    // Проверяем обязательные поля
    expect(item.mpn).toBeDefined();
    expect(item.title).toBeDefined();
    expect(item.manufacturer).toBeDefined();
    expect(item.description_short).toBeDefined();
    expect(item.package).toBeDefined();
    expect(item.packaging).toBeDefined();
    expect(item.regions).toBeDefined();
    expect(Array.isArray(item.regions)).toBe(true);
    expect(item.product_url).toBeDefined();
    expect(item.source).toBeDefined();
    
    // Проверяем валидные значения enum
    const validSources = ['chipdip', 'promelec', 'compel', 'electronshik', 'elitan', 'oemstrade'];
    expect(validSources).toContain(item.source);
    
    const validRegions = ['RU', 'EU', 'US', 'ASIA'];
    for (const region of item.regions) {
      expect(validRegions).toContain(region);
    }
  }
});

test('API: проверка обязательных полей в ProductCanon', async ({ request }) => {
  const response = await request.get('/api/product?mpn=LM317T');
  
  if (response.status() === 200) {
    const data = await response.json();
    const product = data.product;
    
    // Проверяем обязательные поля
    expect(product.mpn).toBeDefined();
    expect(product.title).toBeDefined();
    expect(product.manufacturer).toBeDefined();
    expect(product.gallery).toBeDefined();
    expect(Array.isArray(product.gallery)).toBe(true);
    expect(product.gallery.length).toBeGreaterThan(0);
    expect(product.meta).toBeDefined();
    expect(product.order).toBeDefined();
    expect(product.description_html).toBeDefined();
    expect(product.docs).toBeDefined();
    expect(Array.isArray(product.docs)).toBe(true);
    expect(product.specs).toBeDefined();
    expect(Array.isArray(product.specs)).toBe(true);
    expect(product.sources).toBeDefined();
    expect(Array.isArray(product.sources)).toBe(true);
    expect(product.sources.length).toBeGreaterThan(0);
  }
});
